import { Component, OnInit, OnDestroy, ViewChild, Input } from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Observable, Subscription, firstValueFrom } from 'rxjs';
import { Kit, KitRemote } from '../kit.interface';
import { KitService } from '../kit.service';
import { UiService } from 'app/shared/ui.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { SortingService } from 'app/shared/sorting.service';
import { UsbService } from 'app/usb.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { InactiveRemotesDialogComponent } from '../inactive-remotes-dialog/inactive-remotes-dialog.component';

interface ReplacementHistoryEntry {
  kind: 'teacher' | 'student';
  title: string;
  subtitle?: string;
  slotNumber?: number;
  chain: string[];
  replacementCount: number;
}

interface DispatchHistoryEntry {
  type: 'created' | 'dispatched' | 'received_back' | 'deleted_to_trash' | 'restored' | 'permanent_deleted';
  userName: string;
  kitId?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
  createdAt?: any;
}

@Component({
  selector: 'app-kit-list',
  templateUrl: './kit-list.component.html',
  styleUrls: ['./kit-list.component.scss']
})
export class KitListComponent implements OnInit, OnDestroy {

  @ViewChild(MatSort) sort: MatSort;

  kits: Kit[] = [];
  filteredKits: Kit[] = [];
  isLoading = true;
  selectedKit: Kit | null = null;
  selectedTab = 0;

  replacementHistoryLoading = false;
  replacementHistoryError: string | null = null;
  replacementHistoryEntries: ReplacementHistoryEntry[] = [];
  replacementHistoryContext: { institutionName: string; classroomName: string } | null = null;

  dispatchHistoryLoading = false;
  dispatchHistoryError: string | null = null;
  dispatchHistoryEntries: DispatchHistoryEntry[] = [];

  // For editing status
  editingStatus: { [key: string]: boolean } = {};
  statusOptions: ('active' | 'inactive' | 'dispatched')[] = ['active', 'inactive', 'dispatched'];

  // For editing remotes
  editingRemotes: { [kitId: string]: { [type: string]: boolean } } = {};
  editedRemotes: { [kitId: string]: { [type: string]: KitRemote[] } } = {};
  listeningForRemote: { kitId: string; type: 'teacher' | 'student' | 'spare' } | null = null;

  // USB connection state
  usbConnecting = false;

  // Institution selection for dispatch
  institutions$: Observable<any>;
  selectedInstitution: any = null;
  dispatchingKit: Kit | null = null;

  // Institution search fields
  dispatchPincode: string = '';
  dispatchBoard: string = '';
  boardList: any[] = [];
  searchClicked: boolean = false;

  // Report generation loading state
  generatingReportId: string | null = null;

  private kitsSub: Subscription;
  private savedSortEvent: Sort;
  private remoteSignalSub: Subscription;

  /** Check if USB is connected (uses shared UsbService state) */
  get usbConnected(): boolean {
    return this.usbService.isConnected;
  }

  openInactiveRemotesDialog(): void {
    const kitDocId = this.selectedKit?.docId;
    if (!kitDocId) return;

    this.dialog.open(InactiveRemotesDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'inactive-remotes-dialog',
      disableClose: true,
      data: { kitDocId }
    });
  }

  @Input()
  set filterValue(val: string) {
    this._filterValue = val;
    this.applySearchFilter();
  }
  private _filterValue = '';

  constructor(
    private kitService: KitService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private sortingService: SortingService,
    private usbService: UsbService,
    private institutionsService: InstitutionsService,
    private configurationService: ConfigurationService,
    private afs: AngularFirestore,
    private dialog: MatDialog
  ) {
    // Load board list
    this.configurationService.boardListSub.subscribe((boards: any) => {
      if (boards) {
        this.boardList = boards.filter((e: any) => e.code !== 'ICSE');
      } else {
        this.configurationService.getBoardList('BoardListAll');
      }
    });
  }

  ngOnInit(): void {
    this.kitsSub = this.kitService.kits$.subscribe(kits => {
      this.kits = kits;
      this.applySearchFilter();
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    if (this.kitsSub) {
      this.kitsSub.unsubscribe();
    }
    if (this.remoteSignalSub) {
      this.remoteSignalSub.unsubscribe();
    }
  }

  applySearchFilter(): void {
    const searchTerm = this._filterValue?.toLowerCase()?.trim() || '';

    if (searchTerm) {
      this.filteredKits = this.kits.filter(kit =>
        kit.kitId?.toLowerCase()?.includes(searchTerm) ||
        kit.status?.toLowerCase()?.includes(searchTerm) ||
        kit.institutionName?.toLowerCase()?.includes(searchTerm)
      );
    } else {
      this.filteredKits = [...this.kits];
    }

    if (this.savedSortEvent) {
      this.sortData(this.savedSortEvent);
    }
  }

  sortData(sort: Sort): void {
    this.savedSortEvent = sort;
    const labels = ['kitId', 'status', 'createdAt'];
    const defaultLabel = 'createdAt';
    this.filteredKits = this.sortingService.sortFunction(sort, labels, this.filteredKits, defaultLabel);
  }

  toggleDetails(kit: Kit): void {
    if (this.selectedKit?.docId === kit.docId) {
      this.selectedKit = null;
    } else {
      this.selectedKit = kit;
      this.selectedTab = 0;
      this.loadReplacementHistory();
      this.loadDispatchHistory();
    }
  }

  private formatDateTime(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private toDate(timestamp: any): Date | null {
    if (!timestamp) return null;
    try {
      return timestamp?.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    } catch {
      return null;
    }
  }

  dispatchHistoryDay(e: DispatchHistoryEntry): string {
    const d = this.toDate(e?.createdAt);
    if (!d) return '--';
    return d.toLocaleDateString('en-GB', { day: '2-digit' });
  }

  dispatchHistoryMonth(e: DispatchHistoryEntry): string {
    const d = this.toDate(e?.createdAt);
    if (!d) return '---';
    return d.toLocaleDateString('en-GB', { month: 'short' });
  }

  dispatchHistoryBadgeLabel(e: DispatchHistoryEntry): string {
    switch (e?.type) {
      case 'created':
        return 'Created';
      case 'dispatched':
        return 'Dispatched';
      case 'received_back':
        return 'Received';
      case 'deleted_to_trash':
        return 'Deleted';
      case 'restored':
        return 'Restored';
      case 'permanent_deleted':
        return 'Deleted';
      default:
        return 'Updated';
    }
  }

  dispatchHistoryBadgeClass(e: DispatchHistoryEntry): string {
    switch (e?.type) {
      case 'created':
        return 'bg-slate-50 text-slate-700 border border-slate-200';
      case 'dispatched':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'received_back':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'deleted_to_trash':
      case 'permanent_deleted':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'restored':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      default:
        return 'bg-slate-50 text-slate-700 border border-slate-200';
    }
  }

  dispatchHistoryDotClass(e: DispatchHistoryEntry): string {
    switch (e?.type) {
      case 'created':
        return 'bg-slate-50 border-slate-300';
      case 'dispatched':
        return 'bg-blue-50 border-blue-400';
      case 'received_back':
        return 'bg-green-50 border-green-400';
      case 'deleted_to_trash':
      case 'permanent_deleted':
        return 'bg-red-50 border-red-400';
      case 'restored':
        return 'bg-amber-50 border-amber-400';
      default:
        return 'bg-slate-50 border-slate-300';
    }
  }

  dispatchHistoryIcon(e: DispatchHistoryEntry): string {
    switch (e?.type) {
      case 'created':
        return 'add_circle';
      case 'dispatched':
        return 'local_shipping';
      case 'received_back':
        return 'assignment_turned_in';
      case 'deleted_to_trash':
        return 'delete';
      case 'restored':
        return 'restore_from_trash';
      case 'permanent_deleted':
        return 'delete_forever';
      default:
        return 'history';
    }
  }

  dispatchHistoryMessage(e: DispatchHistoryEntry): string {
    const name = e?.userName || 'Unknown';
    const kitId = e?.kitId || this.selectedKit?.kitId || 'kit';
    const inst = e?.institutionName || 'institution';
    const at = this.formatDateTime(e?.createdAt);

    switch (e?.type) {
      case 'created':
        return `${name} created ${kitId} on ${at}`;
      case 'dispatched':
        return `${name} dispatched ${kitId} to ${inst} on ${at}`;
      case 'received_back':
        return `${name} received back ${kitId} from ${inst} on ${at}`;
      case 'deleted_to_trash':
        return `${name} moved ${kitId} to trash on ${at}`;
      case 'restored':
        return `${name} restored ${kitId} on ${at}`;
      case 'permanent_deleted':
        return `${name} permanently deleted ${kitId} on ${at}`;
      default:
        return `${name} updated ${kitId} on ${at}`;
    }
  }

  async loadDispatchHistory(): Promise<void> {
    const kitDocId = this.selectedKit?.docId;
    if (!kitDocId) {
      this.dispatchHistoryEntries = [];
      return;
    }

    this.dispatchHistoryLoading = true;
    this.dispatchHistoryError = null;
    this.dispatchHistoryEntries = [];

    try {
      const snap = await firstValueFrom(
        this.afs.collection(`Kit/${kitDocId}/DispatchHistory`, (ref) => ref.orderBy('createdAt', 'desc').limit(200)).get()
      );
      this.dispatchHistoryEntries = (snap.docs || []).map((d) => ({
        ...(d.data() as any),
      })) as DispatchHistoryEntry[];
    } catch (e: any) {
      console.error('Failed to load dispatch history', e);
      this.dispatchHistoryError = 'Failed to load dispatch history';
    } finally {
      this.dispatchHistoryLoading = false;
    }
  }

  private normalizeMac(mac?: string): string {
    return (mac || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  private formatMac(mac?: string): string {
    const hex = this.normalizeMac(mac);
    if (hex.length !== 12) return (mac || '').toLowerCase();
    const pairs = hex.match(/.{1,2}/g) || [];
    return pairs.join(':');
  }

  private extractRemoteChain(remoteUsedRaw: any): string[] {
    if (!remoteUsedRaw) return [];

    // Legacy: string[] OR object[]
    if (Array.isArray(remoteUsedRaw)) {
      return remoteUsedRaw
        .map((m: any) => this.formatMac(m?.macid ?? m))
        .filter((x: string) => !!x);
    }

    // Current: map keyed by mac -> { index, reAssignedTime }
    if (typeof remoteUsedRaw === 'object') {
      const arr = Object.keys(remoteUsedRaw)
        .map((k) => {
          const v = remoteUsedRaw[k];
          const idx = typeof v?.index === 'number' ? v.index : 0;
          return { mac: this.formatMac(k), idx };
        })
        .filter(x => !!x.mac);

      arr.sort((a, b) => (a.idx || 0) - (b.idx || 0));
      return arr.map(x => x.mac);
    }

    return [];
  }

  async loadReplacementHistory(): Promise<void> {
    const kitDocId = this.selectedKit?.docId;
    if (!kitDocId) {
      this.replacementHistoryEntries = [];
      return;
    }

    this.replacementHistoryLoading = true;
    this.replacementHistoryError = null;
    this.replacementHistoryEntries = [];
    this.replacementHistoryContext = null;

    try {
      const qSnap = await firstValueFrom(
        this.afs.collection('Mapping', (ref) =>
          ref.where('kitDocId', '==', kitDocId).orderBy('updatedAt', 'desc').limit(1)
        ).get()
      );

      if (qSnap.empty) {
        this.replacementHistoryEntries = [];
        return;
      }

      const doc = qSnap.docs[0];
      const data = doc.data() as any;

      // Resolve classroom + institution name via Mapping docId
      try {
        const classroomSnap = await this.afs.collection('Classrooms').doc(doc.id).ref.get();
        if (classroomSnap.exists) {
          const cData = classroomSnap.data() as any;
          this.replacementHistoryContext = {
            institutionName: (cData?.institutionName || cData?.schoolName || '') as string,
            classroomName: (cData?.classroomName || cData?.name || '') as string,
          };
        }
      } catch {
        this.replacementHistoryContext = null;
      }

      const entries: ReplacementHistoryEntry[] = [];

      // Teacher chain
      const teacherRaw = Array.isArray(data?.teacherRemote) ? data.teacherRemote : [];
      const teacherChain = teacherRaw
        .map((x: any) => ({
          mac: this.formatMac(x?.macid ?? x),
          idx: typeof x?.index === 'number' ? x.index : 0,
        }))
        .filter((x: any) => !!x.mac)
        .sort((a: any, b: any) => (a.idx || 0) - (b.idx || 0))
        .map((x: any) => x.mac);

      if (teacherChain.length > 1) {
        entries.push({
          kind: 'teacher',
          title: 'Teacher',
          subtitle: 'Remote replacements',
          chain: teacherChain,
          replacementCount: teacherChain.length - 1,
        });
      }

      // Students chains
      const studentRemotes = data?.studentRemotes || {};
      Object.keys(studentRemotes).forEach((studentDocId) => {
        const entry = studentRemotes?.[studentDocId] || {};
        const chain = this.extractRemoteChain(entry?.remoteUsed);
        if (chain.length <= 1) return;
        entries.push({
          kind: 'student',
          title: entry?.accessCode ? String(entry.accessCode) : 'Student',
          subtitle: studentDocId,
          slotNumber: entry?.slotNumber ?? null,
          chain,
          replacementCount: chain.length - 1,
        });
      });

      // Sort: teacher first, then by slotNumber/accessCode
      entries.sort((a, b) => {
        if (a.kind !== b.kind) return a.kind === 'teacher' ? -1 : 1;
        const sa = typeof a.slotNumber === 'number' ? a.slotNumber : 999999;
        const sb = typeof b.slotNumber === 'number' ? b.slotNumber : 999999;
        if (sa !== sb) return sa - sb;
        return (a.title || '').localeCompare(b.title || '');
      });

      this.replacementHistoryEntries = entries;
    } catch (e: any) {
      console.error('Failed to load replacement history', e);
      this.replacementHistoryError = 'Failed to load replacement history';
    } finally {
      this.replacementHistoryLoading = false;
    }
  }

  isExpanded(kit: Kit): boolean {
    return this.selectedKit?.docId === kit.docId;
  }

  async deleteKit(kit: Kit): Promise<void> {
    // Check if kit is dispatched (assigned to an institution)
    const isDispatched = kit.status === 'dispatched' && kit.institutionId && kit.institutionName;

    const config = {
      title: 'Delete Kit',
      message: isDispatched
        ? `This kit "${kit.kitId}" is currently dispatched to "${kit.institutionName}". Deleting will receive it back and move to trash.`
        : `Are you sure you want to delete "${kit.kitId}"? It will be moved to trash.`,
      icon: {
        name: 'mat_outline:delete',
        color: isDispatched ? 'warn' as const : 'primary' as const
      },
      actions: {
        confirm: {
          label: isDispatched ? 'Delete Anyway' : 'Delete',
          color: 'warn' as const,
          timerSeconds: isDispatched ? 3 : 0 // 3 second timer for dispatched kits
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          await this.kitService.moveToTrash(kit);
          this.uiService.alertMessage('Deleted', `Kit "${kit.kitId}" moved to trash`, 'success');
          if (this.selectedKit?.docId === kit.docId) {
            this.selectedKit = null;
          }
        } catch (error) {
          console.error('Error deleting kit:', error);
          this.uiService.alertMessage('Error', 'Failed to delete kit', 'error');
        }
      }
    });
  }

  async updateStatus(kit: Kit, newStatus: string): Promise<void> {
    // Handle "Received Back" option
    if (newStatus === 'received_back') {
      this.receiveBackKit(kit);
      return;
    }

    // Prevent changing to "dispatched" - always require institution selection
    if (newStatus === 'dispatched') {
      this.uiService.alertMessage('Select Institution', 'Please select an institution to dispatch this kit', 'warning');
      // Start dispatch mode to prompt institution selection
      this.startDispatch(kit);
      return;
    }

    try {
      await this.kitService.updateKitStatus(kit.docId, newStatus as 'active' | 'inactive' | 'dispatched');
      this.uiService.alertMessage('Updated', `Kit status updated to ${newStatus}`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      this.uiService.alertMessage('Error', 'Failed to update status', 'error');
    }
  }

  //   Get status options based on current kit state
  getStatusOptions(kit: Kit): string[] {
    if (kit.status === 'dispatched') {
      // If dispatched, show received_back option
      return ['active', 'inactive', 'dispatched', 'received_back'];
    }
    return ['active', 'inactive', 'dispatched'];
  }

  //  Get display label for status
  getStatusLabel(status: string): string {
    if (status === 'received_back') {
      return 'Received Back';
    }
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  trackByFn(index: number, item: Kit): string {
    return item.docId || index.toString();
  }

  // ========== Remote Editing Methods ==========

  isEditingRemotes(kit: Kit, type: 'teacher' | 'student' | 'spare'): boolean {
    return this.editingRemotes[kit.docId]?.[type] || false;
  }

  async startEditingRemotes(kit: Kit, type: 'teacher' | 'student' | 'spare'): Promise<void> {
    if (!this.editingRemotes[kit.docId]) {
      this.editingRemotes[kit.docId] = {};
    }
    if (!this.editedRemotes[kit.docId]) {
      this.editedRemotes[kit.docId] = {};
    }

    this.editingRemotes[kit.docId][type] = true;

    // Clone the remotes array for editing
    let remotes: KitRemote[] = [];
    switch (type) {
      case 'teacher':
        remotes = kit.teacherRemotes || [];
        break;
      case 'student':
        remotes = kit.studentRemotes || [];
        break;
      case 'spare':
        remotes = kit.spareRemotes || [];
        break;
    }
    this.editedRemotes[kit.docId][type] = JSON.parse(JSON.stringify(remotes));

    // Auto-connect to USB receiver if not already connected
    if (!this.usbConnected) {
      await this.connectUsb();
    }

    // Subscribe to remote signals for adding new remotes
    if (!this.remoteSignalSub) {
      this.remoteSignalSub = this.usbService.remoteSignal$.subscribe((signal) => {
        this.handleRemoteSignalForEdit(signal);
      });
    }
  }

  async connectUsb(): Promise<boolean> {
    if (this.usbConnected || this.usbConnecting) return this.usbConnected;

    this.usbConnecting = true;

    try {
      // First try auto-reconnect (no popup if previously paired)
      const autoConnected = await this.usbService.tryAutoReconnect();
      if (autoConnected) {
        this.usbConnecting = false;
        this.uiService.alertMessage('Connected', 'USB receiver connected successfully', 'success');
        return true;
      }

      // If auto-reconnect failed, request device permission (shows popup)
      const granted = await this.usbService.requestReceiverFromUser();
      if (!granted) {
        this.usbConnecting = false;
        this.uiService.alertMessage('USB Error', 'Failed to connect to USB receiver. Please try again.', 'error');
        return false;
      }

      // Setup receiver (this will set usbService.isConnected = true)
      const setupOk = await this.usbService.setupReceiver();
      if (!setupOk) {
        this.usbConnecting = false;
        this.uiService.alertMessage('USB Error', 'Failed to setup USB receiver. Please try again.', 'error');
        return false;
      }

      // Reset and start listening
      this.usbService.resetRemotes();
      this.usbService.startListening();

      this.usbConnecting = false;
      this.uiService.alertMessage('Connected', 'USB receiver connected successfully', 'success');
      return true;
    } catch (error) {
      console.error('USB connection error:', error);
      this.usbConnecting = false;
      this.uiService.alertMessage('USB Error', 'Failed to connect to USB receiver', 'error');
      return false;
    }
  }

  cancelEditingRemotes(kit: Kit, type: 'teacher' | 'student' | 'spare'): void {
    if (this.editingRemotes[kit.docId]) {
      this.editingRemotes[kit.docId][type] = false;
    }
    if (this.editedRemotes[kit.docId]) {
      delete this.editedRemotes[kit.docId][type];
    }
    this.listeningForRemote = null;
  }

  getEditedRemotes(kit: Kit, type: 'teacher' | 'student' | 'spare'): KitRemote[] {
    return this.editedRemotes[kit.docId]?.[type] || [];
  }

  removeEditedRemote(kit: Kit, type: 'teacher' | 'student' | 'spare', index: number): void {
    if (this.editedRemotes[kit.docId]?.[type]) {
      this.editedRemotes[kit.docId][type].splice(index, 1);
      // Renumber slot numbers
      this.editedRemotes[kit.docId][type].forEach((r, i) => r.slotNumber = i + 1);
    }
  }

  startListeningForRemote(kit: Kit, type: 'teacher' | 'student' | 'spare'): void {
    this.listeningForRemote = { kitId: kit.docId, type };
    this.uiService.alertMessage('Listening', 'Press any button on the remote to add it', 'info');
  }

  isListeningForRemote(kit: Kit, type: 'teacher' | 'student' | 'spare'): boolean {
    return this.listeningForRemote?.kitId === kit.docId && this.listeningForRemote?.type === type;
  }

  handleRemoteSignalForEdit(signal: { MAC: string; value: number; KEY?: string }): void {
    if (!this.listeningForRemote) return;

    const { kitId, type } = this.listeningForRemote;
    const mac = signal.MAC;

    // Check if already exists in edited remotes
    const existingRemotes = this.editedRemotes[kitId]?.[type] || [];
    if (existingRemotes.some(r => r.mac === mac)) {
      this.uiService.alertMessage('Duplicate', 'This remote is already in the list', 'warning');
      return;
    }

    // Check if MAC exists in other kits
    const existingInOtherKit = this.kitService.checkMacExists(mac);
    if (existingInOtherKit) {
      this.uiService.alertMessage(
        'Remote Already Assigned',
        `This remote (${mac}) is already assigned to ${existingInOtherKit.kitId} as ${existingInOtherKit.role} ${existingInOtherKit.slotNumber}.`,
        'error'
      );
      return;
    }

    // Add the remote
    const newRemote: KitRemote = {
      mac,
      role: type,
      slotNumber: existingRemotes.length + 1
    };

    if (!this.editedRemotes[kitId]) {
      this.editedRemotes[kitId] = {};
    }
    if (!this.editedRemotes[kitId][type]) {
      this.editedRemotes[kitId][type] = [];
    }
    this.editedRemotes[kitId][type].push(newRemote);

    this.uiService.alertMessage('Added', `Remote ${mac} added successfully`, 'success');
    this.listeningForRemote = null;
  }

  async saveEditedRemotes(kit: Kit, type: 'teacher' | 'student' | 'spare'): Promise<void> {
    const editedRemotes = this.editedRemotes[kit.docId]?.[type] || [];

    // Get original remotes for comparison
    let originalRemotes: KitRemote[] = [];
    switch (type) {
      case 'teacher':
        originalRemotes = kit.teacherRemotes || [];
        break;
      case 'student':
        originalRemotes = kit.studentRemotes || [];
        break;
      case 'spare':
        originalRemotes = kit.spareRemotes || [];
        break;
    }

    // Determine what changed
    const added = editedRemotes.filter(edited => !originalRemotes.some(original => original.mac === edited.mac));
    const removed = originalRemotes.filter(original => !editedRemotes.some(edited => edited.mac === original.mac));

    let message = '';
    if (added.length > 0 && removed.length > 0) {
      message = `Added ${added.length} remote(s) and removed ${removed.length} remote(s). Save changes?`;
    } else if (added.length > 0) {
      message = `Added ${added.length} new remote(s). Save changes?`;
    } else if (removed.length > 0) {
      message = `Removed ${removed.length} remote(s). Save changes?`;
    } else {
      this.uiService.alertMessage('No Changes', 'No changes were made', 'info');
      this.cancelEditingRemotes(kit, type);
      return;
    }

    const config = {
      title: 'Save Changes',
      message,
      icon: {
        name: 'mat_outline:save',
        color: 'primary' as const
      },
      actions: {
        confirm: {
          label: 'Save',
          color: 'primary' as const
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          // Record old MACs for any slots that changed
          const originalBySlot = new Map<number, string>();
          (originalRemotes || []).forEach((r) => {
            originalBySlot.set(Number(r?.slotNumber || 0), r?.mac);
          });
          const editedBySlot = new Map<number, string>();
          (editedRemotes || []).forEach((r) => {
            editedBySlot.set(Number(r?.slotNumber || 0), r?.mac);
          });

          const changedSlots: number[] = [];
          originalBySlot.forEach((oldMac, slot) => {
            const newMac = editedBySlot.get(slot);
            if (!newMac) {
              changedSlots.push(slot);
              return;
            }
            if (this.normalizeMac(oldMac) !== this.normalizeMac(newMac)) {
              changedSlots.push(slot);
            }
          });

          for (const slot of changedSlots) {
            const oldMac = originalBySlot.get(slot) || '';
            if (!oldMac) continue;
            await this.kitService.addNotWorkingRemoteEntry(kit.docId, {
              mac: oldMac,
              role: type,
              slotNumber: slot,
              // source: 'admin'
            });
          }

          await this.kitService.updateKitRemotes(kit.docId, type, editedRemotes);
          this.uiService.alertMessage('Saved', `${type.charAt(0).toUpperCase() + type.slice(1)} remotes updated successfully`, 'success');
          this.cancelEditingRemotes(kit, type);
        } catch (error) {
          console.error('Error saving remotes:', error);
          this.uiService.alertMessage('Error', 'Failed to save changes', 'error');
        }
      }
    });
  }

  // Search institutions by pincode and board
  searchInstitutions(): void {
    if (!this.dispatchPincode || this.dispatchPincode.length < 6) {
      this.uiService.alertMessage('Invalid Pincode', 'Please enter a valid pincode (6 digits)', 'warning');
      return;
    }
    if (!this.dispatchBoard) {
      this.uiService.alertMessage('Select Board', 'Please select a board first', 'warning');
      return;
    }

    const query: QueryFn = (ref: CollectionReference) =>
      ref.where('board', '==', this.dispatchBoard)
        .where('institutionAddress.pincode', '==', this.dispatchPincode)
        .orderBy('institutionName', 'asc');
    this.institutions$ = this.institutionsService.getSnapshot(query);
    this.searchClicked = true;
  }

  // Start dispatch process - set the kit being dispatched
  startDispatch(kit: Kit): void {
    this.dispatchingKit = kit;
    this.selectedInstitution = null;
    this.dispatchPincode = '';
    this.dispatchBoard = '';
    this.institutions$ = null;
    this.searchClicked = false;
  }

  // Cancel dispatch process
  cancelDispatch(): void {
    this.dispatchingKit = null;
    this.selectedInstitution = null;
    this.dispatchPincode = '';
    this.dispatchBoard = '';
    this.institutions$ = null;
    this.searchClicked = false;
  }

  // Confirm and execute dispatch
  async confirmDispatch(kit: Kit): Promise<void> {
    if (!this.selectedInstitution) {
      this.uiService.alertMessage('Error', 'Please select an institution', 'error');
      return;
    }

    const institutionName = this.selectedInstitution.institutionName;
    const institutionId = this.selectedInstitution.docId || this.selectedInstitution.institutionId;

    const config = {
      title: 'Dispatch Kit',
      message: `Are you sure you want to dispatch "${kit.kitId}" to "${institutionName}"?`,
      icon: {
        name: 'mat_outline:local_shipping',
        color: 'primary' as const
      },
      actions: {
        confirm: {
          label: 'Dispatch',
          color: 'primary' as const
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          await this.kitService.dispatchKit(kit.docId, institutionId, institutionName);
          this.uiService.alertMessage('Dispatched', `Kit "${kit.kitId}" dispatched to "${institutionName}"`, 'success');
          this.cancelDispatch();
        } catch (error) {
          console.error('Error dispatching kit:', error);
          this.uiService.alertMessage('Error', 'Failed to dispatch kit', 'error');
        }
      }
    });
  }

//  Receive back kit from institution
  async receiveBackKit(kit: Kit): Promise<void> {
    const config = {
      title: 'Receive Back Kit',
      message: `Confirm that you have received "${kit.kitId}" back from "${kit.institutionName}"?`,
      icon: {
        name: 'mat_outline:assignment_return',
        color: 'primary' as const
      },
      actions: {
        confirm: {
          label: 'Confirm Received',
          color: 'primary' as const
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          // Pass current institution info to save as history
          await this.kitService.receiveBackKit(kit.docId, kit.institutionId, kit.institutionName);
          this.uiService.alertMessage('Received', `Kit "${kit.kitId}" marked as received back`, 'success');
        } catch (error) {
          console.error('Error receiving back kit:', error);
          this.uiService.alertMessage('Error', 'Failed to update kit status', 'error');
        }
      }
    });
  }

  // Check if kit is in dispatch mode
  isDispatchMode(kit: Kit): boolean {
    return this.dispatchingKit?.docId === kit.docId;
  }

  // Compare function for institution select
  compareInstitutions(inst1: any, inst2: any): boolean {
    if (!inst1 || !inst2) return false;
    const id1 = inst1.docId || inst1.institutionId;
    const id2 = inst2.docId || inst2.institutionId;
    return id1 === id2;
  }


  // Check if report is being generated for a specific kit
  isGeneratingReport(kitDocId: string): boolean {
    return this.generatingReportId === kitDocId;
  }

  // Generate and download kit report PDF
  generateKitReport(kit: Kit): void {
    this.generatingReportId = kit.docId;

    // Use setTimeout to allow UI to update before PDF generation
    setTimeout(() => {
      this.generatePdfReport(kit);
    }, 100);
  }

  // Internal method to generate PDF
  private generatePdfReport(kit: Kit): void {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // ========== PAGE 1: Kit Information ==========

    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(23, 154, 215); // Primary blue color
    doc.text('Kit Report', pageWidth / 2, 25, { align: 'center' });

    // Subtitle with date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const reportDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    doc.text(`Generated on: ${reportDate}`, pageWidth / 2, 33, { align: 'center' });

    // Horizontal line
    doc.setDrawColor(23, 154, 215);
    doc.setLineWidth(0.5);
    doc.line(margin, 38, pageWidth - margin, 38);

    // Kit Information Boxes
    const boxStartY = 48;
    const boxWidth = (pageWidth - margin * 2 - 10) / 2; // Two columns with gap
    const boxHeight = 28;
    const boxGap = 8;

    // Helper function to draw info box
    const drawInfoBox = (x: number, y: number, label: string, value: string, color: string) => {
      // Box background
      doc.setFillColor(248, 250, 252); // Light gray background
      doc.setDrawColor(200, 200, 200);
      doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'FD');

      // Label
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(label, x + 8, y + 10);

      // Value
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      // Parse color
      if (color === 'primary') {
        doc.setTextColor(23, 154, 215);
      } else if (color === 'green') {
        doc.setTextColor(34, 197, 94);
      } else if (color === 'blue') {
        doc.setTextColor(59, 130, 246);
      } else if (color === 'orange') {
        doc.setTextColor(249, 115, 22);
      } else {
        doc.setTextColor(50, 50, 50);
      }
      doc.text(value, x + 8, y + 22);
    };

    // Row 1
    drawInfoBox(margin, boxStartY, 'Kit ID', kit.kitId, 'primary');
    drawInfoBox(margin + boxWidth + 10, boxStartY, 'Total Remotes', kit.totalRemotes?.toString() || '0', 'default');

    // Row 2
    const row2Y = boxStartY + boxHeight + boxGap;
    drawInfoBox(margin, row2Y, 'Teacher Remotes', (kit.teacherRemotes?.length || 0).toString(), 'green');
    drawInfoBox(margin + boxWidth + 10, row2Y, 'Student Remotes', (kit.studentRemotes?.length || 0).toString(), 'blue');

    // Row 3
    const row3Y = row2Y + boxHeight + boxGap;
    drawInfoBox(margin, row3Y, 'Spare Remotes', (kit.spareRemotes?.length || 0).toString(), 'orange');
    drawInfoBox(margin + boxWidth + 10, row3Y, 'Status', kit.status?.charAt(0).toUpperCase() + kit.status?.slice(1), 'primary');

    // School Name Box (full width)
    const schoolBoxY = row3Y + boxHeight + boxGap;
    doc.setFillColor(239, 246, 255); // Light blue background
    doc.setDrawColor(59, 130, 246);
    doc.roundedRect(margin, schoolBoxY, pageWidth - margin * 2, boxHeight + 5, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Dispatched To (School Name)', margin + 8, schoolBoxY + 10);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 64, 175);
    const schoolName = kit.institutionName || 'Not Assigned';
    doc.text(schoolName, margin + 8, schoolBoxY + 24);

    // Dispatch Date (if available)
    if (kit.dispatchedAt) {
      const dispatchDate = this.formatDate(kit.dispatchedAt);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Dispatched on: ${dispatchDate}`, pageWidth - margin - 8, schoolBoxY + 24, { align: 'right' });
    }

    // Instructions Section
    const instructionsY = schoolBoxY + boxHeight + 20;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Instructions', margin, instructionsY);

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, instructionsY + 3, pageWidth - margin, instructionsY + 3);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    const instructions = [
      '1. Verify all remotes are present in the kit before use.',
      '2. Test each remote by pressing any button and checking the receiver response.',
      '3. Mark the status of each remote in the table on the next page.',
      '4. Report any non-working remotes to the administrator.',
      '5. Return the kit with all remotes after use.'
    ];

    let instrY = instructionsY + 12;
    instructions.forEach(instr => {
      doc.text(instr, margin + 5, instrY);
      instrY += 8;
    });

    // Footer on page 1
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Page 1 of 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // ========== PAGE 2: Remote MAC Addresses Table ==========
    doc.addPage();

    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(23, 154, 215);
    doc.text('Remote Inventory', pageWidth / 2, 20, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Kit: ${kit.kitId}`, pageWidth / 2, 28, { align: 'center' });

    // Prepare table data - combine all remotes
    const tableData: any[] = [];

    // Add Teacher Remotes
    (kit.teacherRemotes || []).forEach((remote) => {
      tableData.push({
        type: 'Teacher',
        slotNumber: `T${remote.slotNumber}`,
        mac: remote.mac,
        status: ''
      });
    });

    // Add Student Remotes
    (kit.studentRemotes || []).forEach((remote) => {
      tableData.push({
        type: 'Student',
        slotNumber: `S${remote.slotNumber}`,
        mac: remote.mac,
        status: ''
      });
    });

    // Add Spare Remotes
    (kit.spareRemotes || []).forEach((remote) => {
      tableData.push({
        type: 'Spare',
        slotNumber: `SP${remote.slotNumber}`,
        mac: remote.mac,
        status: ''
      });
    });

    // Generate table
    autoTable(doc, {
      startY: 35,
      head: [['Type', 'Slot', 'MAC Address', 'Status']],
      body: tableData.map(row => [row.type, row.slotNumber, row.mac, row.status]),
      headStyles: {
        fillColor: [23, 154, 215],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 60, fontStyle: 'bold', font: 'courier' },
        3: { cellWidth: 70 }
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      didParseCell: (data) => {
        // Color code the Type column
        if (data.column.index === 0 && data.section === 'body') {
          const type = data.cell.raw as string;
          if (type === 'Teacher') {
            data.cell.styles.textColor = [34, 197, 94]; // Green
          } else if (type === 'Student') {
            data.cell.styles.textColor = [59, 130, 246]; // Blue
          } else if (type === 'Spare') {
            data.cell.styles.textColor = [249, 115, 22]; // Orange
          }
        }
      }
    });

    // Signature section at bottom
    const signatureY = pageHeight - 50;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, signatureY, margin + 60, signatureY);
    doc.line(pageWidth - margin - 60, signatureY, pageWidth - margin, signatureY);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Verified By', margin, signatureY + 5);
    doc.text('Date', pageWidth - margin - 60, signatureY + 5);

    // Footer on page 2
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text('Page 2 of 2', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Download PDF
    const fileName = `Kit_Report_${kit.kitId}_${reportDate.replace(/\//g, '-')}.pdf`;
    doc.save(fileName);

    // Reset loading state
    this.generatingReportId = null;

    this.uiService.alertMessage('Report Downloaded', `Kit report has been downloaded`, 'success');
  }

}
