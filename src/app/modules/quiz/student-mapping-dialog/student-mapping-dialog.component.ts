import { Component, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UsbService } from 'app/usb.service';
import { UiService } from 'app/shared/ui.service';
import { Kit, KitRemote } from 'app/modules/admin/kit/kit.interface';
import { Subscription } from 'rxjs';
import firebase from 'firebase/compat/app';

interface RemoteUsedEntry {
  macid: string;
  reAssignedTime?: any;
  index: number;
}

export interface StudentInfo {
  studentDocId: string;
  studentName: string;
  accessCode: string; // Roll number
}

export interface StudentRemoteMapping {
  studentDocId: string;
  studentName: string;
  accessCode: string;
  mac: string;
  slotNumber: number;
}

export interface StudentMappingDialogData {
  selectedKit: Kit;
  classroomId: string;
  institutionId: string;
  studentCount: number;
  mappedRemotes: KitRemote[];
}

export interface StudentMappingDialogResult {
  mappings: StudentRemoteMapping[];
  teacherMac: string;
  started: boolean;
}

@Component({
  selector: 'app-student-mapping-dialog',
  templateUrl: './student-mapping-dialog.component.html',
  styleUrls: ['./student-mapping-dialog.component.scss']
})
export class StudentMappingDialogComponent implements OnInit, OnDestroy {
  loading = true;
  students: StudentInfo[] = [];
  mappings: StudentRemoteMapping[] = [];
  saving = false;

  // Teacher mapping
  teacherMac: string | null = null;
  isTeacherAssigned = false;

  // Current assignment state
  currentAssignmentIndex = -1; // -1 = teacher, 0+ = student index
  assignmentQueue: Array<{ kind: 'teacher' | 'student'; index?: number }> = [];

  // Spare remote handling
  spareRemotes: KitRemote[] = [];
  showSpareRemoteSelection = false;
  selectedSpareTarget: { kind: 'teacher' | 'student'; index?: number } | null = null;

  private teacherRemoteUsed: RemoteUsedEntry[] = [];
  private studentRemoteUsed: Record<string, RemoteUsedEntry[]> = {};
  private existingCreatedAt: any = null;

  // USB subscription
  private usbSub: Subscription;
  private justAssignedMacs = new Set<string>();
  private JUST_ASSIGNED_TTL_MS = 800;

  constructor(
    public dialogRef: MatDialogRef<StudentMappingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: StudentMappingDialogData,
    private afs: AngularFirestore,
    private usbService: UsbService,
    private uiService: UiService,
    private cdRef: ChangeDetectorRef
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;

    try {
      // Load students from classroom
      await this.loadStudents();

      await this.loadExistingMappingHistory();

      // Initialize spare remotes from kit
      this.spareRemotes = [...(this.data.selectedKit.spareRemotes || [])];

      // Initialize fresh mappings (do not auto-restore from session storage)
      this.initializeMappings();

      // Build assignment queue
      this.buildAssignmentQueue();

      // Subscribe to remote signals
      this.subscribeToRemoteSignals();

    } catch (error) {
      console.error('Error initializing student mapping:', error);
      this.uiService.alertMessage('Error', 'Failed to load student data', 'error');
    } finally {
      this.loading = false;
      this.cdRef.detectChanges();
    }
  }

  private async loadExistingMappingHistory(): Promise<void> {
    try {
      const classroomId = this.data?.classroomId;
      if (!classroomId) return;

      const snap = await this.afs.collection('Mapping').doc(classroomId).ref.get();
      if (!snap.exists) return;

      const existing = snap.data() as any;
      this.existingCreatedAt = existing?.createdAt ?? null;

      const teacherRemote = Array.isArray(existing?.teacherRemote) ? existing.teacherRemote : [];
      this.teacherRemoteUsed = teacherRemote
        .map((x: any, i: number) => {
          const macid = this.normalizeMac(x?.macid ?? x);
          if (!macid) return null;
          return {
            macid,
            reAssignedTime: x?.reAssignedTime ?? null,
            index: typeof x?.index === 'number' ? x.index : (i + 1),
          } as RemoteUsedEntry;
        })
        .filter(Boolean) as RemoteUsedEntry[];

      const studentRemotes = existing?.studentRemotes || {};
      Object.keys(studentRemotes).forEach((studentDocId) => {
        const entry = studentRemotes?.[studentDocId];
        const normalized = this.normalizeRemoteUsed(entry?.remoteUsed);
        if (normalized.length) {
          this.studentRemoteUsed[studentDocId] = normalized;
        }
      });
    } catch {
      return;
    }
  }

  private normalizeRemoteUsed(remoteUsedRaw: any): RemoteUsedEntry[] {
    if (!remoteUsedRaw) return [];

    // Legacy: string[] OR current: object[]
    if (Array.isArray(remoteUsedRaw)) {
      return remoteUsedRaw
        .map((m: any, i: number) => {
          const macid = this.normalizeMac(m?.macid ?? m);
          if (!macid) return null;
          return {
            macid,
            reAssignedTime: m?.reAssignedTime ?? null,
            index: typeof m?.index === 'number' ? m.index : (i + 1),
          } as RemoteUsedEntry;
        })
        .filter(Boolean) as RemoteUsedEntry[];
    }

    // New: map keyed by macid -> { index, reAssignedTime }
    if (typeof remoteUsedRaw === 'object') {
      const entries: RemoteUsedEntry[] = Object.keys(remoteUsedRaw)
        .map((k, i) => {
          const v = (remoteUsedRaw as any)[k];
          const macid = this.normalizeMac(k);
          if (!macid) return null;
          return {
            macid,
            reAssignedTime: v?.reAssignedTime ?? null,
            index: typeof v?.index === 'number' ? v.index : (i + 1),
          } as RemoteUsedEntry;
        })
        .filter(Boolean) as RemoteUsedEntry[];

      entries.sort((a, b) => (a.index || 0) - (b.index || 0));
      return entries;
    }

    return [];
  }

  private toRemoteUsedMap(entries: RemoteUsedEntry[]): Record<string, any> {
    const out: Record<string, any> = {};
    (entries || []).forEach((e, i) => {
      const macid = this.normalizeMac(e?.macid);
      if (!macid) return;
      out[macid] = {
        index: typeof e?.index === 'number' ? e.index : (i + 1),
        reAssignedTime: e?.reAssignedTime ?? null,
      };
    });
    return out;
  }

  private trackTeacherRemote(mac: string): void {
    const macid = this.normalizeMac(mac);
    if (!macid) return;
    const last = this.teacherRemoteUsed?.length ? this.teacherRemoteUsed[this.teacherRemoteUsed.length - 1] : null;
    if (last?.macid === macid) return;
    const nextIndex = (this.teacherRemoteUsed?.length || 0) + 1;
    this.teacherRemoteUsed = [...(this.teacherRemoteUsed || []), {
      macid,
      reAssignedTime: firebase.firestore.Timestamp.fromDate(new Date()),
      index: nextIndex,
    }];
  }

  private trackStudentRemote(studentDocId: string, mac: string): void {
    if (!studentDocId) return;
    const macid = this.normalizeMac(mac);
    if (!macid) return;
    const existing = this.studentRemoteUsed[studentDocId] || [];
    const last = existing.length ? existing[existing.length - 1] : null;
    if (last?.macid === macid) return;
    const nextIndex = existing.length + 1;
    this.studentRemoteUsed[studentDocId] = [...existing, {
      macid,
      reAssignedTime: firebase.firestore.Timestamp.fromDate(new Date()),
      index: nextIndex,
    }];
  }

  resetMappings(): void {
    this.teacherMac = null;
    this.isTeacherAssigned = false;

    this.mappings = (this.mappings || []).map(m => ({
      ...m,
      mac: ''
    }));

    this.assignmentQueue = [];
    this.currentAssignmentIndex = -1;

    this.justAssignedMacs.clear();

    try {
      const key = `quiz_mapping_${this.data.classroomId}_${this.data.selectedKit.docId}`;
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }

    this.buildAssignmentQueue();
    this.cdRef.detectChanges();
  }

  ngOnDestroy(): void {
    if (this.usbSub) {
      this.usbSub.unsubscribe();
    }
  }

  /**
   * Load students from Firestore for this classroom
   */
  private async loadStudents(): Promise<void> {
    const { classroomId } = this.data;

    if (!classroomId) {
      this.students = [];
      return;
    }

    try {
      const snapshot = await this.afs.collection('Students', ref =>
        ref.where(`classrooms.${classroomId}.classroomId`, '==', classroomId)
      ).get().toPromise();

      const studentsWithAccessCodes = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data() as any;
          const studentDocId = doc.id;

          const firstName = data?.studentMeta?.firstName ?? '';
          const lastName = data?.studentMeta?.lastName ?? '';
          const fallbackName = (data?.studentMeta?.name || data?.name || `${firstName} ${lastName}`.trim() || 'Unknown') as string;

          let accessCode = '';
          try {
            const authDoc = await this.afs
              .collection('CustomAuthentication')
              .doc(studentDocId)
              .get()
              .toPromise();
            const authData = authDoc?.data() as { accessCode?: string } | undefined;
            accessCode = authData?.accessCode ?? '';
          } catch {
            accessCode = '';
          }

          // Final fallback chain (kept for backwards compatibility)
          const finalAccessCode =
            accessCode || data?.accessCode || data?.studentMeta?.accessCode || data?.rollNumber || '';

          if (!finalAccessCode) {
            return null;
          }

          return {
            studentDocId,
            studentName: fallbackName,
            accessCode: finalAccessCode
          } as StudentInfo;
        })
      );

      this.students = (studentsWithAccessCodes.filter(Boolean) as StudentInfo[]);

      // Sort by accessCode (roll number)
      this.students.sort((a, b) => {
        const aNum = parseInt(a.accessCode.slice(-3), 10) || parseInt(a.accessCode, 10) || 0;
        const bNum = parseInt(b.accessCode.slice(-3), 10) || parseInt(b.accessCode, 10) || 0;
        if (aNum && bNum) return aNum - bNum;
        return a.accessCode.localeCompare(b.accessCode);
      });

      // Limit to mapped remotes count
      if (this.data.mappedRemotes && this.data.mappedRemotes.length > 0) {
        this.students = this.students.slice(0, this.data.mappedRemotes.length);
      }

    } catch (error) {
      console.error('Error loading students:', error);
      this.students = [];
    }
  }

  /**
   * Initialize mappings based on students and kit remotes
   */
  private initializeMappings(): void {
    const mappedRemotes = this.data.mappedRemotes || [];

    this.mappings = this.students.map((student, index) => {
      const remote = mappedRemotes[index];
      return {
        studentDocId: student.studentDocId,
        studentName: student.studentName,
        accessCode: student.accessCode,
        mac: '', // Will be assigned when remote is pressed
        slotNumber: remote?.slotNumber || (index + 1)
      };
    });

    // Initialize teacher MAC from kit
    const teacherRemote = this.data.selectedKit.teacherRemotes?.[0];
    if (teacherRemote) {
      this.teacherMac = null; // Will be assigned when remote is pressed
    }
  }

  /**
   * Build assignment queue
   */
  private buildAssignmentQueue(): void {
    this.assignmentQueue = [];

    // Teacher first if not assigned
    if (!this.isTeacherAssigned) {
      this.assignmentQueue.push({ kind: 'teacher' });
    }

    // Then students without MAC
    this.mappings.forEach((mapping, index) => {
      if (!mapping.mac) {
        this.assignmentQueue.push({ kind: 'student', index });
      }
    });

    // Update current assignment index
    if (this.assignmentQueue.length === 0) {
      this.currentAssignmentIndex = this.mappings.length; // All done
    } else {
      const first = this.assignmentQueue[0];
      this.currentAssignmentIndex = first.kind === 'teacher' ? -1 : (first.index ?? 0);
    }
  }

  /**
   * Subscribe to USB remote signals
   */
  private subscribeToRemoteSignals(): void {
    this.usbSub = this.usbService.remoteSignal$.subscribe(({ MAC }) => {
      const mac = this.normalizeMac(MAC);
      if (!mac) return;

      // Ignore duplicate bursts
      if (this.isJustAssigned(mac)) return;

      // Check if already assigned
      if (this.isMacAssigned(mac)) {
        this.uiService.alertMessage('Info', `Remote is already assigned`, 'info');
        return;
      }

      // Get current target to validate correct remote type
      const currentTarget = this.assignmentQueue[0];
      if (!currentTarget) {
        this.uiService.alertMessage('Info', 'All remotes already assigned', 'info');
        return;
      }

      // Validate remote type matches current target
      if (currentTarget.kind === 'teacher') {
        if (!this.isTeacherRemote(mac)) {
          this.uiService.alertMessage('Warning', `Please use the Teacher remote from this kit`, 'warning');
          return;
        }
      } else if (currentTarget.kind === 'student') {
        if (!this.isStudentRemote(mac)) {
          this.uiService.alertMessage('Warning', `Please use a Student remote from this kit`, 'warning');
          return;
        }
      }

      // Assign to next in queue
      this.assignMac(mac);
      this.markJustAssigned(mac);
    });
  }

  /**
   * Check if MAC is a teacher remote from this kit
   */
  private isTeacherRemote(mac: string): boolean {
    const normalizedMac = this.normalizeMac(mac);
    const kit = this.data.selectedKit;
    return (kit.teacherRemotes || []).some(r => this.normalizeMac(r.mac) === normalizedMac);
  }

  /**
   * Check if MAC is a student remote from this kit
   */
  private isStudentRemote(mac: string): boolean {
    const normalizedMac = this.normalizeMac(mac);
    const kit = this.data.selectedKit;
    return (kit.studentRemotes || []).some(r => this.normalizeMac(r.mac) === normalizedMac);
  }

  /**
   * Check if MAC is a spare remote from this kit
   */
  private isSpareRemote(mac: string): boolean {
    const normalizedMac = this.normalizeMac(mac);
    const kit = this.data.selectedKit;
    return (kit.spareRemotes || []).some(r => this.normalizeMac(r.mac) === normalizedMac);
  }

  /**
   * Assign MAC to next target in queue
   */
  private assignMac(mac: string): void {
    if (!this.assignmentQueue.length) {
      this.buildAssignmentQueue();
    }

    if (!this.assignmentQueue.length) {
      this.uiService.alertMessage('Info', 'All remotes already assigned', 'info');
      return;
    }

    const target = this.assignmentQueue.shift();
    if (!target) return;

    if (target.kind === 'teacher') {
      this.teacherMac = mac;
      this.isTeacherAssigned = true;
      this.trackTeacherRemote(mac);
      this.uiService.alertMessage('Success', `Teacher remote assigned`, 'success');
    } else if (target.kind === 'student' && target.index !== undefined) {
      const student = this.mappings[target.index];
      student.mac = mac;
      this.trackStudentRemote(student.studentDocId, mac);
      this.uiService.alertMessage('Success', `Assigned to ${student.accessCode}`, 'success');
    }

    this.buildAssignmentQueue();
    this.cdRef.detectChanges();
  }

  /**
   * Check if MAC is already assigned
   */
  private isMacAssigned(mac: string): boolean {
    const normalizedMac = this.normalizeMac(mac);

    if (this.normalizeMac(this.teacherMac) === normalizedMac) return true;

    return this.mappings.some(m => this.normalizeMac(m.mac) === normalizedMac);
  }

  /**
   * Normalize MAC address
   */
  private normalizeMac(mac: string | null | undefined): string {
    return (mac ?? '').trim().toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  /**
   * Mark MAC as just assigned to prevent duplicate signals
   */
  private markJustAssigned(mac: string): void {
    const normalized = this.normalizeMac(mac);
    if (!normalized) return;
    this.justAssignedMacs.add(normalized);
    setTimeout(() => this.justAssignedMacs.delete(normalized), this.JUST_ASSIGNED_TTL_MS);
  }

  private isJustAssigned(mac: string): boolean {
    return this.justAssignedMacs.has(this.normalizeMac(mac));
  }

  /**
   * Unassign teacher remote
   */
  unassignTeacher(): void {
    this.teacherMac = null;
    this.isTeacherAssigned = false;
    this.buildAssignmentQueue();
    this.cdRef.detectChanges();
  }

  /**
   * Unassign student remote
   */
  unassignStudent(index: number): void {
    this.mappings[index].mac = '';
    this.buildAssignmentQueue();
    this.cdRef.detectChanges();
  }

  /**
   * Replace remote with spare
   */
  openSpareSelection(kind: 'teacher' | 'student', index?: number): void {
    if (this.spareRemotes.length === 0) {
      this.uiService.alertMessage('Info', 'No spare remotes available', 'info');
      return;
    }
    this.selectedSpareTarget = { kind, index };
    this.showSpareRemoteSelection = true;
  }

  /**
   * Select spare remote
   */
  selectSpareRemote(spare: KitRemote): void {
    if (!this.selectedSpareTarget) return;

    const mac = this.normalizeMac(spare.mac);

    if (this.selectedSpareTarget.kind === 'teacher') {
      this.teacherMac = mac;
      this.isTeacherAssigned = true;
      this.trackTeacherRemote(mac);
    } else if (this.selectedSpareTarget.index !== undefined) {
      this.mappings[this.selectedSpareTarget.index].mac = mac;
      const m = this.mappings[this.selectedSpareTarget.index];
      this.trackStudentRemote(m.studentDocId, mac);
    }

    // Remove from spare list
    this.spareRemotes = this.spareRemotes.filter(s => this.normalizeMac(s.mac) !== mac);

    this.showSpareRemoteSelection = false;
    this.selectedSpareTarget = null;
    this.buildAssignmentQueue();
    this.cdRef.detectChanges();
  }

  cancelSpareSelection(): void {
    this.showSpareRemoteSelection = false;
    this.selectedSpareTarget = null;
  }

  /**
   * Check if ready to start
   */
  canStart(): boolean {
    // Teacher must be assigned
    if (!this.isTeacherAssigned) return false;

    // At least one student must be assigned
    return this.mappings.some(m => !!m.mac);
  }

  /**
   * Get assignment progress
   */
  getProgress(): { assigned: number; total: number } {
    const teacherAssigned = this.isTeacherAssigned ? 1 : 0;
    const studentsAssigned = this.mappings.filter(m => !!m.mac).length;
    return {
      assigned: teacherAssigned + studentsAssigned,
      total: 1 + this.mappings.length
    };
  }

  /**
   * Save mapping to session storage
   */
  private saveMappingToStorage(): void {
    const key = `quiz_mapping_${this.data.classroomId}_${this.data.selectedKit.docId}`;
    const data = {
      teacherMac: this.teacherMac,
      mappings: this.mappings,
      timestamp: Date.now()
    };
    sessionStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Load mapping from session storage
   */
  private loadMappingFromStorage(): any {
    const key = `quiz_mapping_${this.data.classroomId}_${this.data.selectedKit.docId}`;
    const saved = sessionStorage.getItem(key);
    if (!saved) return null;

    try {
      const data = JSON.parse(saved);
      // Check if mapping is recent (within 2 hours)
      if (Date.now() - data.timestamp > 2 * 60 * 60 * 1000) {
        sessionStorage.removeItem(key);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  /**
   * Restore mapping from saved data
   */
  private restoreMapping(saved: any): void {
    this.teacherMac = saved.teacherMac;
    this.isTeacherAssigned = !!saved.teacherMac;

    // Match saved mappings with current students
    if (saved.mappings && Array.isArray(saved.mappings)) {
      this.mappings = this.students.map((student, index) => {
        const savedMapping = saved.mappings.find(m => m.studentDocId === student.studentDocId);
        return {
          studentDocId: student.studentDocId,
          studentName: student.studentName,
          accessCode: student.accessCode,
          mac: savedMapping?.mac || '',
          slotNumber: savedMapping?.slotNumber || (index + 1)
        };
      });
    } else {
      this.initializeMappings();
    }
  }

  /**
   * Start quiz with current mappings
   */
  startQuiz(): void {
    if (!this.canStart()) {
      this.uiService.alertMessage('Error', 'Please assign teacher remote and at least one student remote', 'error');
      return;
    }

    this.saveMapping();
  }

  private async saveMapping(): Promise<void> {
    if (this.saving) return;
    this.saving = true;

    try {
      // Save mapping to session storage
      this.saveMappingToStorage();

      const classroomId = this.data?.classroomId;
      if (!classroomId) {
        this.uiService.alertMessage('Error', 'Missing classroomId', 'error');
        return;
      }

      const nowServer = firebase.firestore.FieldValue.serverTimestamp();
      const createdAt = this.existingCreatedAt ?? nowServer;

      const teacherMac = this.normalizeMac(this.teacherMac || '');
      if (teacherMac) {
        this.trackTeacherRemote(teacherMac);
      }

      const teacherRemote = (this.teacherRemoteUsed || [])
        .map((e, i) => ({
          macid: this.normalizeMac(e?.macid),
          role: 'teacher',
          reAssignedTime: e?.reAssignedTime ?? null,
          index: typeof e?.index === 'number' ? e.index : (i + 1),
        }))
        .filter(e => !!e.macid);

      const studentRemotes: Record<string, any> = {};
      this.mappings.forEach((m, idx) => {
        const mac = this.normalizeMac(m.mac);
        if (mac) {
          this.trackStudentRemote(m.studentDocId, mac);
        }

        const remoteUsedEntries = (this.studentRemoteUsed[m.studentDocId] || [])
          .map((e, i) => ({
            macid: this.normalizeMac(e?.macid),
            reAssignedTime: e?.reAssignedTime ?? null,
            index: typeof e?.index === 'number' ? e.index : (i + 1),
          } as RemoteUsedEntry))
          .filter(e => !!e.macid);

        studentRemotes[m.studentDocId] = {
          docId: m.studentDocId,
          studentDocId: m.studentDocId,
          accessCode: m.accessCode,
          slotNumber: idx + 1,
          remoteUsed: this.toRemoteUsedMap(remoteUsedEntries)
        };
      });

      await this.afs.collection('Mapping').doc(classroomId).set({
        docId: classroomId,
        kitDocId: this.data?.selectedKit?.docId ?? null,
        createdAt,
        updatedAt: nowServer,
        teacherRemote,
        studentRemotes
      });

      const result: StudentMappingDialogResult = {
        mappings: this.mappings.filter(m => !!m.mac),
        teacherMac: this.teacherMac || '',
        started: true
      };

      this.dialogRef.close(result);
    } catch (error) {
      console.error('Error saving mapping:', error);
      this.uiService.alertMessage('Error', 'Failed to save mapping', 'error');
    } finally {
      this.saving = false;
      this.cdRef.detectChanges();
    }
  }

  /**
   * Close without starting
   */
  close(): void {
    this.dialogRef.close(null);
  }
}
