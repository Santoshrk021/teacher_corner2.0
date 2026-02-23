import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { CreateQuizDialogComponent } from '../create-quiz-dialog/create-quiz-dialog.component';
import { CreateUploadTypeDialogComponent } from '../create-upload-type-dialog/create-upload-type-dialog.component';
import { CreateFormTypeDialogComponent } from '../create-form-type-dialog/create-form-type-dialog.component';
import { CreateTextblockTypeDialogComponent } from '../create-textblock-type-dialog/create-textblock-type-dialog.component';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UiService } from 'app/shared/ui.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { AssignmentReportDialogComponent } from '../assignment-report-dialog/assignment-report-dialog.component';
import { FuseDrawerService, AssignmentReportPayload } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { Subject, takeUntil } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-all-assignments-table',
  templateUrl: './all-assignments-table.component.html',
  styleUrls: ['./all-assignments-table.component.scss']
})
export class AllAssignmentsTableComponent implements OnInit {
  allAssignments: any;
  component;
  // match the contest page pattern
  drawerOpened = false;
  private _destroy$ = new Subject<void>();
  private loadingIds = new Set<string>();


  constructor(
    private assignmentService: AssignmentsService,
    public dialog: MatDialog,
    private fuseConfirmationService: FuseConfirmationService,
    private uiService: UiService,
    private workflowService: WorkflowsService,
    private programmeService: ProgrammeService,
    private drawerService: FuseDrawerService,
    private cdr: ChangeDetectorRef,
    private afs: AngularFirestore,
  ) {
    // mirror AllContestsTableComponent subscription
    this.drawerService.drawerOpenSubject
      .pipe(takeUntil(this._destroy$))
      .subscribe((open) => {
        this.drawerOpened = open;
      });
  }

  ngOnInit(): void {
    this.allAssignments = this.assignmentService.getAllAssignments();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  async onClickEdit(assignmentInfo) {
    switch (assignmentInfo.type) {
      case 'QUIZ':
        await import('../create-quiz-dialog/create-quiz-dialog.module');
        this.dialog.open(CreateQuizDialogComponent, {
          data: {
            assignmentInfo
          }
        });
        break;

      case 'UPLOAD':
        await import('../create-upload-type-dialog/create-upload-type-dialog.module');
        this.dialog.open(CreateUploadTypeDialogComponent, {
          data: {
            assignmentInfo
          }
        });
        break;

      case 'FORM':
        await import('../create-form-type-dialog/create-form-type-dialog.module');
        this.dialog.open(CreateFormTypeDialogComponent, {
          data: {
            assignmentInfo
          }
        });
        break;

      case 'TEXTBLOCK':
        await import('../create-textblock-type-dialog/create-textblock-type-dialog.module');
        this.dialog.open(CreateTextblockTypeDialogComponent, {
          data: {
            assignmentInfo
          }
        });
        break;

      default:
        break;
    };
  }

  // Copy the 'text' to clipboard here (you can use document.execCommand('copy') or Clipboard API)
  // For simplicity, I'll use the Clipboard API here:
  copyToClipboard(text: string | undefined): void {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        console.info('Copied to clipboard:', text);
      }).catch((error) => {
        console.error('Failed to copy:', error);
      });
    }
  }

  copyToClipboardDate(d) {
    const dateInMilliseconds = d.seconds * 1000 + Math.floor(d.nanoseconds / 1e6);
    const formattedDate = new Date(dateInMilliseconds).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    navigator.clipboard.writeText(formattedDate).then(() => {
      console.info('Copied to clipboard:', formattedDate);
    }).catch((error) => {
      console.error('Failed to copy:', error);
    });
  }

  onclickDelete(assignment) {
    const name = assignment.displayName;
    const config = {
      title: 'Delete Assignment',
      // message: 'Are you sure you want to delete this assignment?',
      message: name.length > 13
        ? `<br><p class="">Are you sure you want to delete "${name.slice(0, 13)}..."?</p><br>
         <p class=" text-justify">On deleting this assignment, all teachers, students, classrooms and programmes to which this assignment is assigned will be removed and lost forever.</p><br>
         <p> These assignments will have to be set manually in case the assignment is restored.</p>`
        : `<p>Are you sure you want to delete "${name}"?</p><br>
         <p class=" text-justify"> On deleting this assignment, all teachers, students, and classrooms to which this assignment is assigned will be removed and lost forever.</p><br>
         <p> These assignments will have to be set manually in case the assignment is restored.</p>`,
      icon: {
        name: 'mat_outline:delete'
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        this.sendToTrash(assignment);
        this.removeAssignmentFromProgrammes(assignment?.docId);
        this.removeAssignmentFromWorkflows(assignment?.docId);
        this.assignmentService.delete(assignment?.docId);
        this.uiService.alertMessage('Deleted', 'Successfully Deleted', 'warn');
      };
    });
  }

  sendToTrash(assignment) {
    this.assignmentService.toTrash(assignment.docId, assignment);
  }

  removeAssignmentFromProgrammes(assignmentId: string) {
    this.programmeService.deleteAssignmentIdFromProgrammes(assignmentId);
  }

  removeAssignmentFromWorkflows(assignmentId: string) {
    this.workflowService.deleteAssignmentFromWorkflow(assignmentId);
  }

  private async buildReportDataForAssignment(assignmentId: string): Promise<AssignmentReportPayload> {
    if (!assignmentId) {
      return { institutions: [], classrooms: [], programmes: [], learningUnits: [], assignmentId: '', assignmentName: '' };
    }

    // ---- Firestore compat API (your existing students query) ----
    const snap = await this.afs.collection('Students', ref =>
      ref.where('attemptedAssignments', 'array-contains', assignmentId)
    ).get().toPromise();

    const institutions = new Map<string, { institutionId: string; institutionName: string }>();
    const classrooms = new Map<string, { classroomId: string; classroomName: string; institutionId: string }>();
    const programmes = new Map<string, { programmeId: string; programmeName: string; classroomId: string; institutionId: string }>();

    (snap?.docs || []).forEach(d => {
      const data = d.data() as any;
      const clsMap = data?.classrooms || {}; // map keyed by classroomId

      Object.values(clsMap).forEach((c: any) => {
        if (!c) return;

        const institutionId = c.institutionId ?? '';
        const institutionName = c.institutionName ?? '';
        const classroomId = c.classroomId ?? '';
        const classroomName = c.classroomName ?? '';

        if (institutionId && !institutions.has(institutionId)) {
          institutions.set(institutionId, { institutionId, institutionName });
        }
        if (classroomId && !classrooms.has(classroomId)) {
          classrooms.set(classroomId, { classroomId, classroomName, institutionId });
        }

        const progs: any[] = Array.isArray(c.programmes) ? c.programmes : [];
        progs.forEach(p => {
          const programmeId = p?.programmeId || p?.docId || '';
          const programmeName = p?.programmeName || p?.displayName || '';
          if (programmeId && !programmes.has(programmeId)) {
            programmes.set(programmeId, { programmeId, programmeName, classroomId, institutionId });
          }
        });
      });
    });

    // ---------------------------
    // Learning Units (from remoteSubmissions docs with this quizId)
    // ---------------------------
    const learningUnitsMap = new Map<string, { learningUnitId: string; learningUnitName: string }>();

    // Prefer collectionGroup for one-shot query
    let usedCollectionGroup = false;
    try {
      const cgSnap = await this.afs.firestore
        .collectionGroup('remoteSubmissions')
        .where('quizId', '==', assignmentId)
        .get();

      cgSnap?.forEach(doc => {
        const rd = doc.data() as any;
        const id = rd?.latestLearningUnitId || rd?.learningUnitId || '';
        const name = rd?.latestLearningUnitName || rd?.learningUnitName || rd?.displayName || id;
        if (id && !learningUnitsMap.has(id)) {
          learningUnitsMap.set(id, { learningUnitId: id, learningUnitName: name });
        }
      });

      usedCollectionGroup = true;
    } catch {
      // Fallback: per-student subcollection queries
    }

    if (!usedCollectionGroup) {
      const studentDocs = snap?.docs || [];
      for (const sd of studentDocs) {
        try {
          const rsSnap = await this.afs
            .collection(`Students/${sd.id}/remoteSubmissions`, ref =>
              ref.where('quizId', '==', assignmentId)
            )
            .get().toPromise();

          rsSnap?.docs.forEach(rsd => {
            const rd = rsd.data() as any;
            const id = rd?.latestLearningUnitId || rd?.learningUnitId || '';
            const name = rd?.latestLearningUnitName || rd?.learningUnitName || rd?.displayName || id;
            if (id && !learningUnitsMap.has(id)) {
              learningUnitsMap.set(id, { learningUnitId: id, learningUnitName: name });
            }
          });
        } catch { /* ignore */ }
      }
    }

    const byName = <T extends Record<string, any>>(k: string) =>
      (a: T, b: T) => (a[k] || '').localeCompare(b[k] || '');

    return {
      institutions: Array.from(institutions.values()).sort(byName('institutionName')),
      classrooms: Array.from(classrooms.values()).sort(byName('classroomName')),
      programmes: Array.from(programmes.values()).sort(byName('programmeName')),
      learningUnits: Array.from(learningUnitsMap.values()).sort(byName('learningUnitName')), // 👈 NEW
      assignmentId: assignmentId,
      assignmentName: '',
    };
  }

  async openReportDrawer(assignment: any) {
    const id: string | undefined = assignment?.docId;
    if (!id) return;

    // prevent double-click spam on same row
    if (this.loadingIds.has(id)) return;

    this.loadingIds.add(id);
    this.cdr.markForCheck();

    try {
      // 1) Build dropdown data for this assignment
      const payload = await this.buildReportDataForAssignment(id);

      // 2) Stash it in the drawer service
      this.drawerService.setReportData({
        ...payload,
        assignmentId: id,
        assignmentName: assignment?.displayName || '',
      });

      // 3) Project component & open drawer
      const mod = await import('../assignment-report-dialog/assignment-report-dialog.component');
      this.component = mod.AssignmentReportDialogComponent;
      this.cdr.markForCheck();
      this.drawerService.drawerOpenSubject.next(true);
    } catch (e) {
      console.error(e);
      this.uiService.alertMessage('Error', 'Failed to open report. Please try again.', 'warn');
    } finally {
      this.loadingIds.delete(id);
      this.cdr.markForCheck();
    }
  }

  closeReportDrawer() {
    this.drawerService.setReportData(null); // optional cleanup
    this.drawerService.drawerOpenSubject.next(false);
  }

  // Clear the projected component on close so it re-creates next time
  onOpenedChange(open: boolean) {
    if (!open) {
      this.component = null;
    }
  }

  isLoading(id?: string): boolean {
    return !!id && this.loadingIds.has(id);
  }

}
