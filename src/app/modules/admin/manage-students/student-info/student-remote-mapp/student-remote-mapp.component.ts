import { ChangeDetectorRef, Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';
import { FormControl } from '@angular/forms';
import { map, Observable, startWith } from 'rxjs';
import { UsbService } from 'app/usb.service';
import firebase from 'firebase/compat/app';

interface Student {
  studentDocId: string;
  studentName: string;
  accessCode: string;
  isDisabled?: boolean;
}

@Component({
  selector: 'app-student-remote-mapp',
  templateUrl: './student-remote-mapp.component.html'
})
export class StudentRemoteMappComponent implements OnInit, OnDestroy {
  // UI / state
  loading = true;
  currentTeacherName = '';
  teacherId = '';
  teacherSelectedMac: string | null = null;
  isTeacherAssigned = false;

  students: Student[] = [];
  macAddresses: string[] = [];
  mapping: { [accessCode: string]: string } = {};
  assignedStudents = new Set<string>();
  canEditMac: { [accessCode: string]: boolean } = {};
  usedMacs = new Set<string>(); // derived from current state
  validMacsFromFirestore = new Set<string>();

  studentSearchControls: { [accessCode: string]: FormControl } = {};
  teacherSearchControl = new FormControl('');
  filteredTeacherMacs$: Observable<string[]>;
  assignmentQueue: Array<{ kind: 'teacher' | 'student'; index?: number; accessCode?: string }> = [];
  DOCUMENT_LIMIT = 800;

  private usbSub: any;

  // prevents echo/rapid duplicate events from showing "already assigned" right after success
  private justAssignedMacs = new Set<string>();
  private JUST_ASSIGNED_TTL_MS = 800;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      students: Student[];
      macAddresses: string[];
      teacherId: string;
      teacherName: string;
      classroomDocId: string;
      institutionId: string;
    },
    private dialogRef: MatDialogRef<StudentRemoteMappComponent>,
    private afs: AngularFirestore,
    private uiService: UiService,
    private afAuth: AngularFireAuth,
    private _changeDetectorRef: ChangeDetectorRef,
    private usbService: UsbService
  ) { }

  // ---------- Helpers ----------
  private normalizeMac(raw: string | null | undefined): string {
    return (raw ?? '')
      .trim()
      .toLowerCase()
      .replace(/-/g, ':')
      .replace(/\s+/g, '');
  }

  private isMacAssignedNow(mac: string): boolean {
    const m = this.normalizeMac(mac);
    if (!m) return false;
    if (this.normalizeMac(this.teacherSelectedMac) === m) return true;
    for (const ac of Object.keys(this.mapping)) {
      if (this.normalizeMac(this.mapping[ac]) === m) return true;
    }
    return false;
  }

  private recomputeUsedMacs() {
    const next = new Set<string>();
    const t = this.normalizeMac(this.teacherSelectedMac);
    if (t) next.add(t);
    for (const ac of Object.keys(this.mapping)) {
      const m = this.normalizeMac(this.mapping[ac]);
      if (m) next.add(m);
    }
    this.usedMacs = next;
  }

  private markJustAssigned(mac: string) {
    const m = this.normalizeMac(mac);
    if (!m) return;
    this.justAssignedMacs.add(m);
    setTimeout(() => this.justAssignedMacs.delete(m), this.JUST_ASSIGNED_TTL_MS);
  }

  private isJustAssigned(mac: string): boolean {
    return this.justAssignedMacs.has(this.normalizeMac(mac));
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;

    // throttle repeated info toasts per mac
    const notifiedUsedMacs = new Set<string>();

    try {
      const { classroomDocId, institutionId } = this.data;

      // Load valid registered remotes
      const snappySnap = await this.afs.collection('Master').doc('snappyRemotes').get().toPromise();
      const remoteList = (snappySnap.data() as { remotes?: string[] })?.remotes || [];
      this.validMacsFromFirestore = new Set(remoteList.map(r => this.normalizeMac(r)));

      // initialize lists
      this.students = this.data.students || [];
      this.macAddresses = (this.data.macAddresses || []).map(m => this.normalizeMac(m));
      this.teacherId = this.data.teacherId;
      this.currentTeacherName = this.data.teacherName;

      // Load existing mappings from all remote_master_X docs (ordered by creationDate)
      const remoteDocsSnapshot = await this.afs.collection('Master', ref =>
        ref.orderBy('creationDate', 'asc')
      ).ref.get();

      for (const docSnap of remoteDocsSnapshot.docs) {
        if (!docSnap.id.startsWith('remote_master_')) continue;

        const data = docSnap.data() as any;
        const studentMapping = data.studentRemoteMapping || {};
        const teacherMapping = data.teacherRemoteMapping || {};

        // populate per-student mapping for this classroom/institution
        for (const student of this.students) {
          const info = studentMapping[student.studentDocId];
          if (info && info.classroomId === classroomDocId && info.institutionId === institutionId) {
            const mac = this.normalizeMac(info.snappyRemote);
            if (mac) {
              this.mapping[student.accessCode] = mac;
              this.assignedStudents.add(student.studentDocId);
            }
          }
        }

        // teacher mapping
        const teacherKey = `cId_${classroomDocId}-tId_${this.teacherId}`;
        const tInfo = teacherMapping[teacherKey];
        if (tInfo && tInfo.classroomId === classroomDocId && tInfo.institutionId === institutionId) {
          this.teacherSelectedMac = this.normalizeMac(tInfo.snappyRemote);
          if (this.teacherSelectedMac) {
            this.isTeacherAssigned = true;
          }
        }
      }

      // Prepare per-student form controls / edit flags
      for (const student of this.students) {
        this.studentSearchControls[student.accessCode] = new FormControl('');
        this.canEditMac[student.accessCode] = false;
      }

      // derive usedMacs from current state
      this.recomputeUsedMacs();

      // filtered teacher mac observable
      this.filteredTeacherMacs$ = this.teacherSearchControl.valueChanges.pipe(
        startWith(''),
        map(search => this.filterTeacherMacs(search))
      );

      // build initial assignment queue (teacher first if needed then missing students)
      this.buildAssignmentQueue();

      // subscribe to remote signals
      this.usbSub = this.usbService.remoteSignal$.subscribe(({ MAC }) => {
        const mac = this.normalizeMac(MAC);
        if (!mac) return;

        // ignore immediate duplicate bursts after we just assigned this mac
        if (this.isJustAssigned(mac)) return;

        if (!this.validMacsFromFirestore.has(mac)) {
          this.uiService.alertMessage('Invalid Remote', `MAC ${mac} is not registered.`, 'error');
          return;
        }

        // check against current on-screen state
        if (this.isMacAssignedNow(mac)) {
          if (!notifiedUsedMacs.has(mac)) {
            notifiedUsedMacs.add(mac);
            this.uiService.alertMessage('Info', `Remote ${mac} is already assigned.`, 'info');
          }
          return;
        }

        // perform queued assignment
        this.assignMac(mac);

        // mark as just assigned to swallow echo signals
        this.markJustAssigned(mac);
      });

    } catch (err) {
      console.error('Error loading remote mappings:', err);
      this.uiService.alertMessage('Error', 'Failed to load remote mappings.', 'error');
    } finally {
      this.loading = false;
      this._changeDetectorRef.detectChanges();
    }
  }

  ngOnDestroy(): void {
    if (this.usbSub && this.usbSub.unsubscribe) {
      this.usbSub.unsubscribe();
    }
  }

  filterTeacherMacs(search: string): string[] {
    const term = this.normalizeMac(search);
    return this.macAddresses.filter(m =>
      m.includes(term) && !this.isMacAssignedNow(m)
    );
  }

  buildAssignmentQueue() {
    this.assignmentQueue = [];
    if (!this.isTeacherAssigned) this.assignmentQueue.push({ kind: 'teacher' });
    for (let i = 0; i < this.students.length; i++) {
      const s = this.students[i];
      if (!this.mapping[s.accessCode]) this.assignmentQueue.push({ kind: 'student', index: i, accessCode: s.accessCode });
    }

    if (this.assignmentQueue.length === 0) {
      this.currentAssignmentIndex = this.students.length;
    } else {
      const first = this.assignmentQueue[0];
      this.currentAssignmentIndex = first.kind === 'teacher' ? -1 : (first.index ?? 0);
    }
  }

  currentAssignmentIndex = -1;

  isSaveEnabled(): boolean {
    const hasStudentMapping = this.students.some(student => !!this.mapping[student.accessCode]);
    const teacherMappingReady = !!this.teacherSelectedMac;
    return hasStudentMapping || teacherMappingReady;
  }

  assignMac(mac: string) {
    const m = this.normalizeMac(mac);
    if (!m) return;

    if (!this.assignmentQueue.length) this.buildAssignmentQueue();
    if (!this.assignmentQueue.length) {
      this.uiService.alertMessage('Info', 'All targets already assigned.', 'info');
      return;
    }

    const target = this.assignmentQueue.shift();
    if (!target) return;

    if (target.kind === 'teacher') {
      this.teacherSelectedMac = m;
      this.isTeacherAssigned = true;
      this.uiService.alertMessage('Success', `Teacher assigned ${m}`, 'success');
    } else if (target.kind === 'student') {
      const student = this.students[target.index!];
      this.mapping[student.accessCode] = m;
      this.assignedStudents.add(student.studentDocId);
      this.uiService.alertMessage('Success', `Assigned ${m} → ${student.accessCode}`, 'success');
    }

    // keep derived set in sync
    this.recomputeUsedMacs();

    // rebuild queue + update UI highlight
    this.buildAssignmentQueue();
    this._changeDetectorRef.detectChanges();
  }

  unassignStudentByAccessCode(accessCode: string) {
    const student = this.students.find(s => s.accessCode === accessCode);
    if (!student) return;

    delete this.mapping[accessCode];
    this.assignedStudents.delete(student.studentDocId);
    this.canEditMac[accessCode] = true;

    this.recomputeUsedMacs();
    this.buildAssignmentQueue();
    this._changeDetectorRef.detectChanges();
  }

  unassignTeacher() {
    this.teacherSelectedMac = null;
    this.isTeacherAssigned = false;

    this.recomputeUsedMacs();
    this.buildAssignmentQueue();
    this._changeDetectorRef.detectChanges();
  }

  async onSave() {
    const { classroomDocId, institutionId } = this.data;
    const allEntries: Array<any> = [];

    for (const student of this.students) {
      const mac = this.normalizeMac(this.mapping[student.accessCode]);
      if (mac) allEntries.push({
        type: 'student',
        studentDocId: student.studentDocId,
        studentAccessCode: student.accessCode,
        snappyRemote: mac,
        classroomId: classroomDocId,
        institutionId
      });
    }

    if (this.teacherSelectedMac) {
      allEntries.push({
        type: 'teacher',
        teacherDocId: this.teacherId,
        snappyRemote: this.normalizeMac(this.teacherSelectedMac),
        classroomId: classroomDocId,
        institutionId
      });
    }

    if (!allEntries.length) {
      this.uiService.alertMessage('Info', 'No entries to save.', 'info');
      return;
    }

    this.loading = true;
    this._changeDetectorRef.detectChanges();

    try {
      let docIndex = 1;
      let remainingEntries = [...allEntries];

      while (remainingEntries.length > 0) {
        const docId = `remote_master_${docIndex.toString().padStart(2, '0')}`;
        const slice = remainingEntries.splice(0, this.DOCUMENT_LIMIT);

        const studentMapping: any = {};
        const teacherMapping: any = {};

        for (const entry of slice) {
          if (entry.type === 'student') {
            studentMapping[entry.studentDocId] = {
              snappyRemote: entry.snappyRemote,
              classroomId: entry.classroomId,
              institutionId: entry.institutionId,
              studentAccessCode: entry.studentAccessCode,
              studentDocId: entry.studentDocId
            };
          } else if (entry.type === 'teacher') {
            teacherMapping[`cId_${entry.classroomId}-tId_${entry.teacherDocId}`] = {
              snappyRemote: entry.snappyRemote,
              classroomId: entry.classroomId,
              institutionId: entry.institutionId,
              teacherDocId: entry.teacherDocId
            };
          }
        }

        await this.afs.collection('Master').doc(docId).set({
          studentRemoteMapping: studentMapping,
          teacherRemoteMapping: teacherMapping,
          creationDate: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        docIndex++;
      }

      this.uiService.alertMessage('Success', 'All mappings saved successfully.', 'success');
      this.dialogRef.close(true);
    } catch (err) {
      console.error('Save failed', err);
      this.uiService.alertMessage('Error', 'Failed to save mappings.', 'error');
    } finally {
      this.loading = false;
      this._changeDetectorRef.detectChanges();
    }
  }

  closeDialog() {
    if (this.usbSub && this.usbSub.unsubscribe) {
      this.usbSub.unsubscribe();
    }
    this.dialogRef.close(false);
  }
}
