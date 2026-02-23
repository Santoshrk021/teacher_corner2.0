import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { first, lastValueFrom } from 'rxjs';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';

@Component({
  selector: 'app-assignments-upload',
  templateUrl: './assignments-upload.component.html',
  styleUrls: ['./assignments-upload.component.scss']
})
export class AssignmentsUploadComponent implements OnInit {
  infoArr: Array<any> = [];
  params: any;
  selectedSubmission: any = {};
  privilege: boolean = false;

  constructor(
    public dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private assignmentService: AssignmentsService,
    private programmeService: ProgrammeService,
    private studentService: StudentsService,
    private userService: UserService,
    private workflowService: WorkflowsService,
  ) {
  }

  async ngOnInit(): Promise<void> {
    this.params = await lastValueFrom(this.route.queryParams.pipe(first()));
    this.userService.userInfoSub.subscribe((userInfo) => {
      this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
    });
    this.getAllAssignments();
  }

  goBack() {
    const { institutionId, classroomId, programmeId } = this.params;
    this.router.navigate(['dashboard', classroomId], { queryParams: { institutionId, classroomId, programmeId } });
  }

  async getAllAssignments() {
    if (this.assignmentService.assignmentsSub.value !== null) {
      this.infoArr = this.assignmentService.assignmentsSub.value;
    } else {
      const assignmentDoc = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(this.params.assignmentId));
      let assignment: any;
      if (this.params.hasOwnProperty('workflowId')) {
        const workflow = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(this.params.workflowId));
        const contentsWithAssignmentId = workflow.get('workflowSteps').find(workflowStep => JSON.stringify(workflowStep).includes(this.params.assignmentId)).contents;
        const stepWithAssignmentId = contentsWithAssignmentId.find(step => step.assignmentId === this.params.assignmentId);
        assignment = {
          ...stepWithAssignmentId,
          ...assignmentDoc.data()
        };
      } else {
        const programme = await lastValueFrom(this.programmeService.getProgrammeDocByIdOnce(this.params.programmeId));
        assignment = {
          assignmentDueDate: programme.get('assignmentIds')[this.params.assignmentId].assignmentDueDate,
          assignmentId: assignmentDoc.get('docId'),
          assignmentName: assignmentDoc.get('displayName'),
          assignmentType: assignmentDoc.get('type'),
          numberOfAllowedSubmissions: assignmentDoc.get('numberOfAllowedSubmissions'),
          ...assignmentDoc.data()
        };
      };
      const studentSubmissions = await lastValueFrom(this.studentService.getAttemptedAssignmentsByAssignmentId(this.params.assignmentId).pipe(first()));
      for (let i = 0; i < studentSubmissions.length; i++) {
        const submission = await lastValueFrom(this.studentService.getStudentSubmissionByIdOnce(studentSubmissions[i].docId, this.params.classroomId, this.params.programmeId));
        if (submission.exists) {
          const student: any = await lastValueFrom(this.studentService.getStudentByIdOnce(studentSubmissions[i].docId));
          let numberOfStudentSubmissions: number;
          if (Object.keys(submission.get('versions')).map(key => key.split('_')[1]).includes(this.params.workflowId)) {
            numberOfStudentSubmissions = Object.keys(submission.get('versions')[`workflowId_${this.params.workflowId}`][`assignmentId_${this.params.assignmentId}`]).length;
          } else if (Object.keys(submission.get('versions')).map(key => key.split('_')[1]).includes(this.params.programmeId)) {
            numberOfStudentSubmissions = Object.keys(submission.get('versions')[`programmeId_${this.params.programmeId}`][`assignmentId_${this.params.assignmentId}`]).length;
          };
          const infoObj = {
            studentInfo: {
              ...student.get('studentMeta'),
              docId: student.get('docId')
            },
            submission: submission.data(),
            assignment: {
              ...assignment,
              numberOfStudentSubmissions
            }
          };
          this.infoArr.push(infoObj);
        };
      };
    };
  }

  goToSubmissionAttemptsTable(assignment: any) {
    this.studentService.studentSubmissionAttempts = assignment;
    const { institutionId, classroomId, programmeId, assignmentId, workflowId } = this.params;
    const studentId = assignment.studentInfo.docId;
    if (workflowId !== undefined) {
      this.router.navigate(['dashboard', classroomId, 'upload-submissions', studentId], { queryParams: { institutionId, classroomId, programmeId, assignmentId, workflowId } });
    } else {
      this.router.navigate(['dashboard', classroomId, 'upload-submissions', studentId], { queryParams: { institutionId, classroomId, programmeId, assignmentId } });
    }
  }

  /*
  // logic for showing submission attempts on toggle
  toggleDetails(assignment: any) {
    const id = assignment?.studentInfo?.docId;
    if (this.selectedSubmission?.studentInfo?.docId === id) {
      this.selectedSubmission = {};
    } else {
      this.selectedSubmission = assignment;
    };
  }

  async submissionDialog(assignmentDoc: any, selectedSubmission: any, index: number) {
    await import('./quiz-submission-dialog/quiz-submission-dialog.module');
    this.dialog.open(QuizSubmissionDialogComponent, {
      data: {
        quizInfo: {
          ...assignmentDoc.value,
          studentInfo: selectedSubmission.studentInfo,
          assignmentDueDate: selectedSubmission.assignment.assignmentDueDate,
          attemptTime: selectedSubmission.submission.versions[`workflowId_${this.params.workflowId}`][`assignmentId_${this.params.assignmentId}`][`attempt${index + 1}`].lastAttemptTime
        }
      }
    });
  }

  async quizReplayDialog(assignmentDoc: any, selectedSubmission: any) {
    await import('./quiz-replay/quiz-replay.module');
    this.dialog.open(QuizReplayComponent, {
      data: {
        quizInfo: assignmentDoc.value
      }
    });
  }
  */

}
