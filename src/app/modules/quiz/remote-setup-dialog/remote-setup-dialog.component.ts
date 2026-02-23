import { ChangeDetectorRef, Component, Inject, NgZone, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Subscription, firstValueFrom } from 'rxjs';
import { UsbService } from 'app/usb.service';
import { UiService } from 'app/shared/ui.service';
import { KitSelectDialogComponent, KitSelectDialogResult } from '../kit-select-dialog/kit-select-dialog.component';
import { StudentRemoteMapping } from '../student-mapping-dialog/student-mapping-dialog.component';
import { KitService } from 'app/modules/admin/kit/kit.service';
import { RemoteMappingService } from '../remote-mapping.service';
import { RemoteEventsService, RemoteEvent } from 'app/shared/remote-events.service';

export interface RemoteSetupDialogData {
  institutionId: string;
  classroomId: string;
}

export interface RemoteSetupDialogResult {
  started: boolean;
  teacherMac: string;
  mappings: StudentRemoteMapping[];
  kitDocId: string | null;
  eventSource: 'USB' | 'FIRESTORE';
}

@Component({
  selector: 'app-remote-setup-dialog',
  templateUrl: './remote-setup-dialog.component.html',
  styleUrls: ['./remote-setup-dialog.component.scss']
})
export class RemoteSetupDialogComponent implements OnInit, OnDestroy {
  loadingMapping = true;
  isConnecting = false;
  isConnected = false;

  hasMapping = false;
  teacherMac = '';
  studentMappings: StudentRemoteMapping[] = [];
  kitDocId: string | null = null;

  teacherTested = false;
  testedStudentMacs = new Set<string>();

  private spareMacs = new Set<string>();
  private notifiedWorkingMacs = new Set<string>();
  private notifiedUnknownMacs = new Set<string>();

  private usbSub?: Subscription;
  private firestoreFallbackSub?: Subscription;

  // Track processed event IDs from Firestore to avoid duplicates
  // We track by event ID (or serverReceiveMs) instead of MAC, so we can detect new presses from same remote
  private processedEventIds = new Set<string>();

  // Timestamp when Firestore listening started - ignore events before this
  private firestoreListenStartTime = 0;

  // UI indicator for event source - NONE until user chooses
  eventSource: 'USB' | 'FIRESTORE' | 'NONE' = 'NONE';

  constructor(
    public dialogRef: MatDialogRef<RemoteSetupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RemoteSetupDialogData,
    private afs: AngularFirestore,
    private usbService: UsbService,
    private uiService: UiService,
    private dialog: MatDialog,
    private kitService: KitService,
    private remoteMappingService: RemoteMappingService,
    private cdRef: ChangeDetectorRef,
    private remoteEventsService: RemoteEventsService,
    private zone: NgZone
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    this.uiService.alertMessage('Info', 'Test teacher and all students remotes once.', 'info');

    // Do NOT auto-connect or auto-start listening
    // Always wait for user to click "Connect Receiver" and choose USB or Firestore
    this.isConnected = false;
    this.eventSource = 'NONE';

    await this.loadLatestMapping();
    await this.loadKitSpareRemotes();

    this.cdRef.detectChanges();
  }

  ngOnDestroy(): void {
    this.usbSub?.unsubscribe();
    this.firestoreFallbackSub?.unsubscribe();
  }

  private normalizeMac(mac?: string): string {
    return (mac || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  /**
   * Reverse MAC address byte order.
   * Firestore stores MAC in reversed byte order compared to USB.
   * e.g., "701988d2ca5a" → "5acad2881970"
   */
  private reverseFirestoreMac(mac: string): string {
    const normalized = this.normalizeMac(mac);
    if (normalized.length !== 12) return normalized; // Not a valid MAC, return as-is

    // Split into 2-char bytes and reverse
    const bytes: string[] = [];
    for (let i = 0; i < 12; i += 2) {
      bytes.push(normalized.substring(i, i + 2));
    }
    return bytes.reverse().join('');
  }

  private async loadLatestMapping(): Promise<void> {
    this.loadingMapping = true;
    this.hasMapping = false;

    try {
      const classroomId = this.data?.classroomId;
      if (!classroomId) return;

      const directSnap = await this.afs.collection('Mapping').doc(classroomId).ref.get();
      if (directSnap.exists) {
        this.applyMappingSnapshot(directSnap.id, directSnap.data() as any);
        return;
      }

      try {
        const qSnap = await firstValueFrom(
          this.afs.collection('Mapping', ref =>
            ref.where('docId', '==', classroomId).orderBy('updatedAt', 'desc').limit(1)
          ).get()
        );
        if (!qSnap.empty) {
          const d = qSnap.docs[0];
          this.applyMappingSnapshot(d.id, d.data() as any);
          return;
        }
      } catch {
        return;
      }
    } finally {
      this.loadingMapping = false;
      this.cdRef.detectChanges();
    }
  }

  private getRemoteSetupDoneKey(): string {
    const classroomId = this.data?.classroomId || 'unknown';
    const kitDocId = this.kitDocId || 'unknown';
    return `quiz_remote_setup_done_${classroomId}_${kitDocId}`;
  }

  private async loadKitSpareRemotes(): Promise<void> {
    this.spareMacs.clear();
    const kitDocId = this.kitDocId;
    if (!kitDocId) return;

    try {
      const kit = await firstValueFrom(this.kitService.getKitById(kitDocId));
      (kit?.spareRemotes || []).forEach(r => {
        const mac = this.normalizeMac(r?.mac);
        if (mac) this.spareMacs.add(mac);
      });
    } catch {
      // ignore
    }
  }

  private applyMappingSnapshot(_docId: string, mapping: any): void {
    const teacherRemote = Array.isArray(mapping?.teacherRemote) ? mapping.teacherRemote : [];
    const lastTeacher = teacherRemote.length ? teacherRemote[teacherRemote.length - 1] : null;
    const teacherMac = this.normalizeMac(lastTeacher?.macid ?? lastTeacher);

    this.kitDocId = mapping?.kitDocId ?? null;

    const studentRemotesMap = mapping?.studentRemotes || {};
    const studentEntries: StudentRemoteMapping[] = Object.values(studentRemotesMap).map((entry: any) => {
      const lastMac = this.getLatestStudentMac(entry?.remoteUsed);
      return {
        studentDocId: entry?.studentDocId || entry?.docId || '',
        studentName: entry?.accessCode || '',
        accessCode: entry?.accessCode || '',
        mac: lastMac,
        slotNumber: entry?.slotNumber || 0,
      };
    }).filter(x => !!x.studentDocId);

    studentEntries.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

    this.teacherMac = teacherMac;
    this.studentMappings = studentEntries;

    this.teacherTested = false;
    this.testedStudentMacs.clear();

    this.hasMapping = !!teacherMac && this.studentMappings.length > 0;
  }

  private getLatestStudentMac(remoteUsedRaw: any): string {
    if (!remoteUsedRaw) return '';

    // Legacy string[] OR object[]
    if (Array.isArray(remoteUsedRaw)) {
      const last = remoteUsedRaw.length ? remoteUsedRaw[remoteUsedRaw.length - 1] : '';
      return this.normalizeMac(last?.macid ?? last);
    }

    // New map keyed by macid
    if (typeof remoteUsedRaw === 'object') {
      let bestMac = '';
      let bestIndex = -1;
      Object.keys(remoteUsedRaw).forEach((k) => {
        const mac = this.normalizeMac(k);
        if (!mac) return;
        const v = remoteUsedRaw[k];
        const idx = typeof v?.index === 'number' ? v.index : 0;
        if (idx > bestIndex) {
          bestIndex = idx;
          bestMac = mac;
        }
      });
      return bestMac;
    }

    return '';
  }

  // -----------------------
  // Source Switching Helpers
  // -----------------------

  private startUsbListening(): void {
    if (this.usbSub) return;

    this.eventSource = 'USB';

    // Stop fallback if running
    this.firestoreFallbackSub?.unsubscribe();
    this.firestoreFallbackSub = undefined;

    this.usbSub = this.usbService.remoteSignal$.subscribe(({ MAC }) => {
      this.handleRemoteSignal(MAC);
    });
  }

  private startFirestoreFallbackListening(): void {
    if (this.firestoreFallbackSub) return;

    this.eventSource = 'FIRESTORE';

    // Stop USB subscription if any
    this.usbSub?.unsubscribe();
    this.usbSub = undefined;

    // Clear processed event IDs to allow fresh detection
    this.processedEventIds.clear();

    // Record the start time - only process events that arrive AFTER this moment
    this.firestoreListenStartTime = Date.now();

    this.firestoreFallbackSub = this.remoteEventsService
      .getFreshLatestEvents$(200, 'SnappyRemoteEvents')
      .subscribe({
        next: (docs: RemoteEvent[]) => {
          // Run inside Angular zone for immediate UI updates
          this.zone.run(() => {
            for (const d of docs) {
              const rawMac = this.normalizeMac(d.macId);
              if (!rawMac) continue;

              // IMPORTANT: Only process events that happened AFTER we started listening
              // This prevents pre-selecting boxes from old Firestore events
              if (d.serverReceiveMs < this.firestoreListenStartTime) {
                continue;
              }

              // Firestore stores MAC in reversed byte order compared to USB
              // Reverse the bytes to match the mapping format
              const mac = this.reverseFirestoreMac(rawMac);

              // Create unique event ID using doc ID or timestamp
              const eventId = d.id || `${rawMac}_${d.serverReceiveMs}`;

              // Skip if we've already processed this specific event
              if (this.processedEventIds.has(eventId)) continue;
              this.processedEventIds.add(eventId);

              // Process the remote signal (will mark teacher/student as tested)
              this.handleRemoteSignal(mac);
            }

            // Force immediate change detection
            this.cdRef.detectChanges();
          });
        },
        error: (err) => {
          console.error('❌ Firestore fallback listen failed:', err);
        }
      });
  }

  private handleRemoteSignal(rawMac: string): void {
    const mac = this.normalizeMac(rawMac);
    if (!mac) return;

    // Debug logging
    const normalizedTeacherMac = this.normalizeMac(this.teacherMac);
    const studentMacsNormalized = this.studentMappings.map(m => this.normalizeMac(m.mac));
    console.log('🎯 handleRemoteSignal:', {
      rawMac,
      normalizedMac: mac,
      teacherMac: this.teacherMac,
      normalizedTeacherMac,
      studentMappings: this.studentMappings.map(m => ({ name: m.accessCode, mac: m.mac, normalized: this.normalizeMac(m.mac) })),
      isTeacherMatch: mac === normalizedTeacherMac,
      isStudentMatch: studentMacsNormalized.includes(mac)
    });

    if (this.teacherMac && mac === normalizedTeacherMac) {
      console.log('✅ Teacher remote matched!');
      this.teacherTested = true;
      if (!this.notifiedWorkingMacs.has(mac)) {
        this.notifiedWorkingMacs.add(mac);
        this.uiService.alertMessage('Success', `Teacher remote (${mac}) is working`, 'success');
      }
      this.cdRef.detectChanges();
      return;
    }

    const match = this.studentMappings.find(m => this.normalizeMac(m.mac) === mac);
    if (match) {
      console.log('✅ Student remote matched!', match.accessCode);
      this.testedStudentMacs.add(mac);
      if (!this.notifiedWorkingMacs.has(mac)) {
        this.notifiedWorkingMacs.add(mac);
        this.uiService.alertMessage('Success', `Student ${match.accessCode} remote (${mac}) is working`, 'success');
      }
      this.cdRef.detectChanges();
      return;
    }

    if (this.notifiedUnknownMacs.has(mac)) return;
    this.notifiedUnknownMacs.add(mac);

    if (this.spareMacs.has(mac)) {
      this.uiService.alertMessage('Info', `${mac} is a spare remote`, 'info');
    } else {
      console.log('⚠️ Unknown MAC - not in mapping:', mac);
      this.uiService.alertMessage('Warning', `Remote ${mac} is not in the mapping`, 'warning');
    }
  }

  private subscribeToRemoteSignals(): void {
    if (this.isConnected) {
      this.startUsbListening();
    } else {
      this.startFirestoreFallbackListening();
    }
  }

  isStudentTested(m: StudentRemoteMapping): boolean {
    const mac = this.normalizeMac(m.mac);
    return !!mac && this.testedStudentMacs.has(mac);
  }

  canStartQuiz(): boolean {
    if (!this.hasMapping) return false;
    if (!this.teacherTested) return false;

    const required = this.studentMappings
      .map(m => this.normalizeMac(m.mac))
      .filter(m => !!m);

    if (required.length === 0) return false;

    return required.every(m => this.testedStudentMacs.has(m));
  }

  async connectReceiver(): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;
    this.cdRef.detectChanges();

    try {
      // First try auto-reconnect (no popup if previously paired)
      const autoConnected = await this.usbService.tryAutoReconnect();
      if (autoConnected) {
        this.isConnected = true;
        this.usbService.resetRemotes();
        this.usbService.startListening();
        this.startUsbListening();
        this.uiService.alertMessage('USB Connected', 'USB receiver connected successfully.', 'success');
        return;
      }

      // Show USB device picker dialog
      // User clicking "Cancel" will return false → use Firestore
      // User selecting a device will return true → use USB
      const ok = await this.usbService.requestReceiverFromUser();
      if (!ok) {
        // User clicked Cancel → use Firestore mode
        this.isConnected = false;
        this.startFirestoreFallbackListening();
        this.uiService.alertMessage('Using Cloud Mode', 'USB not selected. Listening via Firestore.', 'info');
        return;
      }

      // User selected a USB device → setup receiver
      const setupOk = await this.usbService.setupReceiver();
      if (!setupOk) {
        // USB setup failed → fallback to Firestore
        this.isConnected = false;
        this.startFirestoreFallbackListening();
        this.uiService.alertMessage('USB Setup Failed', 'Falling back to Firestore mode.', 'warning');
        return;
      }

      // USB connected successfully
      this.usbService.resetRemotes();
      this.usbService.startListening();
      this.isConnected = true;
      this.startUsbListening();
      this.uiService.alertMessage('USB Connected', 'USB receiver connected successfully.', 'success');
    } catch (error) {
      console.error('Connection failed:', error);
      this.isConnected = false;
      this.startFirestoreFallbackListening();
      this.uiService.alertMessage('Connection Error', 'Failed to connect USB. Using Firestore mode.', 'warning');
    } finally {
      this.isConnecting = false;
      this.cdRef.detectChanges();
    }
  }

  // Switch to USB mode manually
  async switchToUsb(): Promise<void> {
    this.isConnecting = true;
    this.cdRef.detectChanges();

    try {
      const granted = await this.usbService.requestReceiverFromUser();
      if (!granted) {
        this.uiService.alertMessage('Cancelled', 'USB device selection cancelled.', 'info');
        return;
      }

      const setupOk = await this.usbService.setupReceiver();
      if (setupOk) {
        this.isConnected = true;
        this.usbService.resetRemotes();
        this.usbService.startListening();
        this.startUsbListening();
        this.uiService.alertMessage('USB Connected', 'Switched to USB receiver mode.', 'success');
      } else {
        this.uiService.alertMessage('Setup Failed', 'Could not setup USB receiver.', 'error');
      }
    } catch (error) {
      console.error('Switch to USB failed:', error);
      this.uiService.alertMessage('Error', 'Failed to connect USB receiver.', 'error');
    } finally {
      this.isConnecting = false;
      this.cdRef.detectChanges();
    }
  }

  // Switch to Firestore mode manually
  switchToFirestore(): void {
    this.isConnected = false;
    this.startFirestoreFallbackListening();
    this.uiService.alertMessage('Cloud Mode', 'Switched to Firestore mode.', 'info');
    this.cdRef.detectChanges();
  }

  async createMap(): Promise<void> {
    const kitRef = this.dialog.open(KitSelectDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      panelClass: 'quiz-remote-setup-dialog',
      disableClose: true,
      data: {
        institutionId: this.data.institutionId,
        classroomId: this.data.classroomId,
      }
    });

    const kitResult: KitSelectDialogResult = await firstValueFrom(kitRef.afterClosed());
    if (!kitResult || !kitResult.selectedKit) return;

    try {
      await this.remoteMappingService.autoCreateMapping({
        classroomId: this.data.classroomId,
        selectedKit: kitResult.selectedKit,
        mappedRemotes: kitResult.mappedRemotes,
      });
    } catch (e) {
      console.error('Error creating mapping:', e);
      this.uiService.alertMessage('Error', 'Failed to create mapping', 'error');
      return;
    }

    this.teacherTested = false;
    this.testedStudentMacs.clear();

    await this.loadLatestMapping();
    await this.loadKitSpareRemotes();
    this.subscribeToRemoteSignals();
    this.cdRef.detectChanges();
  }

  startQuiz(): void {
    if (!this.canStartQuiz()) {
      this.uiService.alertMessage('Error', 'Please test teacher and all student remotes before starting', 'error');
      return;
    }

    try {
      sessionStorage.setItem(this.getRemoteSetupDoneKey(), 'true');
    } catch {
      // ignore
    }

    const result: RemoteSetupDialogResult = {
      started: true,
      teacherMac: this.teacherMac,
      mappings: this.studentMappings,
      kitDocId: this.kitDocId,
      eventSource: this.eventSource === 'USB' ? 'USB' : 'FIRESTORE',
    };

    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
