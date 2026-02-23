import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { lastValueFrom } from 'rxjs';
import { Subscription } from 'rxjs';
import { Outreach } from '../outreach.interface';
import { OutreachService } from '../outreach.service';
import { UiService } from 'app/shared/ui.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import * as XLSX from 'xlsx';
import { QrCodeDialogComponent } from '../qr-code-dialog/qr-code-dialog.component';

interface TeacherRegisteredRow {
  uid: string;
  name: string;
  registeredAt: any;
}

interface TeacherLearningUnitRow {
  docId: string;
  displayName: string;
  progressDisplay: string;
}

@Component({
  selector: 'app-outreach-list',
  templateUrl: './outreach-list.component.html',
  styleUrls: ['./outreach-list.component.scss']
})
export class OutreachListComponent implements OnInit, OnDestroy {

  outreach: Outreach[] = [];
  displayedOutreach: Outreach[] = [];
  isLoading = true;
  isScrollLoading = false;
  loadingMessage = '';
  totalCount = 0;
  displayedCount = 30;
  private infinityScrollLocked = false;
  selectedOutreach: Outreach | null = null;
  selectedTab = 0;

  teacherRegisteredState: Record<string, { isLoading: boolean; rows: TeacherRegisteredRow[]; loaded: boolean }> = {};

  teacherLearningUnitsState: Record<string, {
    isLoading: boolean;
    loaded: boolean;
    isOpen: boolean;
    rows: TeacherLearningUnitRow[];
  }> = {};

  private workflowTotalStepsCache: Record<string, number | null> = {};

  private outreachSub: Subscription;
  private exportListener: any;

  constructor(
    private outreachService: OutreachService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private dialog: MatDialog,
    private teacherService: TeacherService,
    private workflowCompletionService: WorkflowCompletionService,
    private learningUnitsService: LearningUnitsService,
    private workflowsService: WorkflowsService,
  ) { }

  ngOnInit(): void {
    this.outreachSub = this.outreachService.outreach$.subscribe(items => {
      this.outreach = items || [];
      this.totalCount = this.outreach.length;
      this.displayedCount = 30;
      this.displayedOutreach = this.outreach.slice(0, this.displayedCount);
      this.loadingMessage = `Loaded ${this.displayedOutreach.length} of ${this.totalCount} documents`;
      this.isLoading = false;
    });

    this.exportListener = () => this.exportToExcel();
    window.addEventListener('outreach-export', this.exportListener as any);
  }

  ngOnDestroy(): void {
    if (this.outreachSub) this.outreachSub.unsubscribe();
    if (this.exportListener) window.removeEventListener('outreach-export', this.exportListener as any);
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatDateTime(timestamp: any): string {
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

  onScroll(event: any): void {
    if (this.infinityScrollLocked) return;
    if (!this.displayedOutreach?.length) return;
    if (this.displayedCount >= this.outreach.length) return;

    const target = event?.target;
    if (!target) return;

    const thresholdPx = 80;
    const atBottom = (target.scrollTop + target.clientHeight) >= (target.scrollHeight - thresholdPx);
    if (!atBottom) return;

    this.isScrollLoading = true;
    this.displayedCount += 10;
    this.displayedOutreach = this.outreach.slice(0, this.displayedCount);
    this.loadingMessage = `Loaded ${this.displayedOutreach.length} of ${this.totalCount} documents`;
    this.isScrollLoading = false;
  }

  toggleDetails(item: Outreach): void {
    if (this.selectedOutreach?.docId === item.docId) {
      this.selectedOutreach = null;
      return;
    }
    this.selectedOutreach = item;
    this.selectedTab = 0;
    this.ensureTeacherRegisteredState(item);
  }

  async downloadQr(item: Outreach): Promise<void> {
    const url = String(item?.qrCodeImageUrl || '').trim();
    const uniqueCode = String(item?.uniqueCode || item?.docId || '').trim();
    if (!url) {
      this.uiService.alertMessage('Info', 'QR image not available for this outreach record', 'info');
      return;
    }

    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `outreach_${uniqueCode || 'qr'}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error(e);
      this.uiService.alertMessage('Error', 'Failed to download QR', 'error');
    }
  }

  onTabChange(event: MatTabChangeEvent, item: Outreach): void {
    if (event?.index === 2) {
      this.ensureTeacherRegisteredState(item);
    }
  }

  teacherTrackByFn(index: number, row: TeacherRegisteredRow): string {
    return row?.uid || index.toString();
  }

  teacherLearningUnitTrackByFn(index: number, row: TeacherLearningUnitRow): string {
    return row?.docId || index.toString();
  }

  getTeacherLearningUnitState(uid: string | undefined | null) {
    const id = String(uid || '').trim();
    if (!id) return null;

    if (!this.teacherLearningUnitsState[id]) {
      this.teacherLearningUnitsState[id] = { isLoading: false, loaded: false, isOpen: false, rows: [] };
    }

    return this.teacherLearningUnitsState[id];
  }

  async toggleTeacherLearningUnits(uid: string | undefined | null): Promise<void> {
    const state = this.getTeacherLearningUnitState(uid);
    if (!state) return;

    state.isOpen = !state.isOpen;
    if (state.isOpen && !state.loaded && !state.isLoading) {
      await this.loadTeacherLearningUnits(String(uid || '').trim());
    }
  }

  private async loadTeacherLearningUnits(uid: string): Promise<void> {
    const teacherId = String(uid || '').trim();
    const state = this.getTeacherLearningUnitState(teacherId);
    if (!teacherId || !state) return;
    if (state.loaded || state.isLoading) return;

    state.isLoading = true;

    try {
      const completionSnap: any = await lastValueFrom(this.workflowCompletionService.getAllResources(teacherId));
      const completionDocs = (completionSnap?.docs || []) as any[];
      const luIds = completionDocs.map((d: any) => String(d?.id || '').trim()).filter(Boolean);

      if (!luIds.length) {
        state.rows = [];
        state.loaded = true;
        state.isLoading = false;
        return;
      }

      const luDocs = await Promise.all(luIds.map(async (docId) => {
        try {
          const completionDoc = completionDocs.find(d => String(d?.id || '').trim() === docId);
          const completionData = completionDoc?.data ? completionDoc.data() : null;
          const workflowsObj = completionData?.workflows || null;
          const workflowId = workflowsObj && typeof workflowsObj === 'object' ? Object.keys(workflowsObj)[0] : '';
          const completedStepsRaw = workflowId ? workflowsObj?.[workflowId]?.completedSteps : null;
          const completedSteps = Number.isFinite(Number(completedStepsRaw)) ? Number(completedStepsRaw) : null;

          let progressDisplay = '-';
          if (workflowId && completedSteps !== null) {
            const totalSteps = await this.getWorkflowTotalSteps(workflowId);
            if (typeof totalSteps === 'number' && totalSteps > 0) {
              const pct = Math.max(0, Math.min(100, Math.round((completedSteps / totalSteps) * 100)));
              progressDisplay = `${pct}%`;
            }
          }

          const snap: any = await lastValueFrom(this.learningUnitsService.getLUByIdOnce(docId));
          if (!snap?.exists) return { docId, displayName: docId, progressDisplay } as TeacherLearningUnitRow;
          const displayName = snap.get ? snap.get('learningUnitDisplayName') : snap.data()?.learningUnitDisplayName;
          return { docId, displayName: String(displayName || docId), progressDisplay } as TeacherLearningUnitRow;
        } catch {
          return { docId, displayName: docId, progressDisplay: '-' } as TeacherLearningUnitRow;
        }
      }));

      state.rows = (luDocs || []).filter(Boolean);
      state.rows.sort((a, b) => (a.displayName || '').localeCompare((b.displayName || '')));
      state.loaded = true;
      state.isLoading = false;
    } catch {
      state.rows = [];
      state.loaded = true;
      state.isLoading = false;
    }
  }

  private async getWorkflowTotalSteps(workflowId: string): Promise<number | null> {
    const id = String(workflowId || '').trim();
    if (!id) return null;

    if (Object.prototype.hasOwnProperty.call(this.workflowTotalStepsCache, id)) {
      return this.workflowTotalStepsCache[id];
    }

    try {
      const snap: any = await lastValueFrom(this.workflowsService.getWorkflowDocByIdOnce(id));
      if (!snap?.exists) {
        this.workflowTotalStepsCache[id] = null;
        return null;
      }

      const steps = snap.get ? snap.get('workflowSteps') : snap.data()?.workflowSteps;
      const total = Array.isArray(steps) ? steps.length : null;
      this.workflowTotalStepsCache[id] = typeof total === 'number' ? total : null;
      return this.workflowTotalStepsCache[id];
    } catch {
      this.workflowTotalStepsCache[id] = null;
      return null;
    }
  }

  private async ensureTeacherRegisteredState(item: Outreach): Promise<void> {
    const docId = String(item?.docId || '').trim();
    if (!docId) return;

    if (!this.teacherRegisteredState[docId]) {
      this.teacherRegisteredState[docId] = { isLoading: false, rows: [], loaded: false };
    }

    const state = this.teacherRegisteredState[docId];
    if (state.loaded || state.isLoading) return;

    const teacherIds = (item?.teacherRegistered || []).map(x => String(x || '').trim()).filter(Boolean);
    state.isLoading = true;

    try {
      if (!teacherIds.length) {
        state.rows = [];
        state.loaded = true;
        state.isLoading = false;
        return;
      }

      const docs = await Promise.all(teacherIds.map(async (uid) => {
        try {
          const snap: any = await lastValueFrom(this.teacherService.getTeacherByIdOnce(uid));
          if (!snap?.exists) return null;
          const teacherMeta = snap.get ? snap.get('teacherMeta') : snap.data()?.teacherMeta;
          const name = `${teacherMeta?.firstName || ''} ${teacherMeta?.lastName || ''}`.trim() || uid;
          const registeredAt = snap.get
            ? (snap.get('createdAt') || teacherMeta?.createdAt || teacherMeta?.updatedAt)
            : (snap.data()?.createdAt || teacherMeta?.createdAt || teacherMeta?.updatedAt);
          return { uid, name, registeredAt } as TeacherRegisteredRow;
        } catch {
          return { uid, name: uid, registeredAt: null } as TeacherRegisteredRow;
        }
      }));

      state.rows = (docs || []).filter(Boolean) as TeacherRegisteredRow[];
      state.rows.sort((a, b) => {
        const aMs = a?.registeredAt?.seconds ? a.registeredAt.seconds * 1000 : (a?.registeredAt ? new Date(a.registeredAt).getTime() : 0);
        const bMs = b?.registeredAt?.seconds ? b.registeredAt.seconds * 1000 : (b?.registeredAt ? new Date(b.registeredAt).getTime() : 0);
        return bMs - aMs;
      });
      state.loaded = true;
      state.isLoading = false;
    } catch {
      state.rows = [];
      state.loaded = true;
      state.isLoading = false;
    }
  }

  isExpanded(item: Outreach): boolean {
    return this.selectedOutreach?.docId === item.docId;
  }

  async deleteOutreach(item: Outreach): Promise<void> {
    const config = {
      title: 'Move to Trash',
      message: `Are you sure you want to move this outreach record to trash?`,
      icon: {
        name: 'heroicons_outline:trash',
        color: 'warn' as const
      },
      actions: {
        confirm: {
          label: 'Move to Trash',
          color: 'warn' as const
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          await this.outreachService.moveToTrash(item);
          this.uiService.alertMessage('Deleted', 'Outreach moved to trash', 'success');
        } catch (e) {
          console.error(e);
          this.uiService.alertMessage('Error', 'Failed to move to trash', 'error');
        }
      }
    });
  }

  openQr(item: Outreach): void {
    const code = String(item?.uniqueCode || '').trim();
    if (!code) {
      this.uiService.alertMessage('Info', 'Unique code not found for this record', 'info');
      return;
    }

    this.dialog.open(QrCodeDialogComponent, {
      width: '560px',
      maxWidth: '95vw',
      data: { uniqueCode: code }
    });
  }

  exportToExcel(): void {
    try {
      const rows = (this.outreach || []).map(o => ({
        'Institution ID': o.institutionId || '',
        'Institution Name': o.institutionName || '',
        'Unique Code': o.uniqueCode || '',
        'QR Code': o.qrCodeValue || '',
        'Date Generated': this.formatDate(o.dateGenerated || o.createdAt),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Outreach');
      XLSX.writeFile(wb, `outreach_${new Date().toISOString().slice(0, 10)}.xlsx`);
      this.uiService.alertMessage('Exported', 'Outreach exported successfully', 'success');
    } catch (e) {
      console.error(e);
      this.uiService.alertMessage('Error', 'Failed to export', 'error');
    }
  }

  trackByFn(index: number, item: Outreach): string {
    return item.docId || index.toString();
  }
}
