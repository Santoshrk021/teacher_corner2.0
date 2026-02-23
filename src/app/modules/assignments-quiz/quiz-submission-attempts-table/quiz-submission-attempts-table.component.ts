import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { QuizSubmissionDialogComponent } from '../quiz-submission-dialog/quiz-submission-dialog.component';
import { QuizReplayComponent } from '../quiz-replay/quiz-replay.component';
import { first, lastValueFrom } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';

@Component({
  selector: 'app-quiz-submission-attempts-table',
  templateUrl: './quiz-submission-attempts-table.component.html',
  styleUrls: ['./quiz-submission-attempts-table.component.scss']
})
export class QuizSubmissionAttemptsTableComponent implements OnInit {
  params: any;
  selectedSubmission: any;
  versions: any;

  constructor(
    public dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private studentService: StudentsService,
    private assignmentService: AssignmentsService,
    private workflowService: WorkflowsService,
    private programmeService: ProgrammeService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.params = await lastValueFrom(this.route.queryParams.pipe(first()));
    const { studentId } = await lastValueFrom(this.route.params.pipe(first()));
    if (this.studentService.studentSubmissionAttempts !== undefined) {
      this.selectedSubmission = this.studentService.studentSubmissionAttempts;
      let programmeOrWorkflowId: string;
      if (this.params.hasOwnProperty('workflowId')) {
        programmeOrWorkflowId = 'workflowId_' + this.params.workflowId;
      } else {
        programmeOrWorkflowId = 'programmeId_' + this.params.programmeId;
      }
      this.versions = this.studentService.studentSubmissionAttempts.submission.versions[programmeOrWorkflowId][`assignmentId_${this.params.assignmentId}`];
    } else {
      const assignmentDoc = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(this.params.assignmentId));
      let assignment: any;
      if (this.params.hasOwnProperty('workflowId')) {
        const workflow = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(this.params.workflowId));
        const contentsWithAssignmentId = workflow.get('workflowSteps').find(workflowStep => JSON.stringify(workflowStep).includes(this.params.assignmentId)).contents;
        const stepWithAssignmentId = contentsWithAssignmentId.find(step => step.assignmentId === this.params.assignmentId);
        assignment = stepWithAssignmentId;
      } else {
        const programme = await lastValueFrom(this.programmeService.getProgrammeDocByIdOnce(this.params.programmeId));
        assignment = programme.data();
      };
      const student: any = await lastValueFrom(this.studentService.getStudentByIdOnce(studentId));
      const submission = await lastValueFrom(this.studentService.getStudentSubmissionByIdOnce(studentId, this.params.classroomId, this.params.programmeId));
      if (submission.exists) {
        let numberOfStudentSubmissions: number;
        let programmeOrWorkflowId: string;
        if (Object.keys(submission.get('versions')).map(key => key.split('_')[1]).includes(this.params.workflowId)) {
          numberOfStudentSubmissions = Object.keys(submission.get('versions')[`workflowId_${this.params.workflowId}`][`assignmentId_${this.params.assignmentId}`]).length;
          programmeOrWorkflowId = 'workflowId_' + this.params.workflowId;
        } else if (Object.keys(submission.get('versions')).map(key => key.split('_')[1]).includes(this.params.programmeId)) {
          numberOfStudentSubmissions = Object.keys(submission.get('versions')[`programmeId_${this.params.programmeId}`][`assignmentId_${this.params.assignmentId}`]).length;
          programmeOrWorkflowId = 'programmeId_' + this.params.programmeId;
        };



        this.selectedSubmission = {
          studentInfo: {
            ...student.get('studentMeta'),
            docId: student.get('docId')
          },
          submission: submission.data()
        };

        if (this.params.hasOwnProperty('workflowId')) {
          this.selectedSubmission.assignment = {
            ...assignment,
            ...assignmentDoc.data(),
            numberOfStudentSubmissions
          };
        } else {
          this.selectedSubmission.assignment = {
            ...assignment,
            assignmentDueDate: assignment['assignmentIds'][this.params.assignmentId].assignmentDueDate,
            assignmentId: assignmentDoc.get('docId'),
            assignmentName: assignmentDoc.get('displayName'),
            assignmentType: assignmentDoc.get('type'),
            numberOfAllowedSubmissions: assignmentDoc.get('numberOfAllowedSubmissions')
          };
        };

        this.versions = this.selectedSubmission.submission.versions[programmeOrWorkflowId][`assignmentId_${this.params.assignmentId}`];
      };
    };
  }

  goBack() {
    const { institutionId, classroomId, programmeId, assignmentId, workflowId } = this.params;
    if (workflowId !== undefined) {
      this.router.navigate(['dashboard', classroomId, 'quiz-submissions'], { queryParams: { institutionId, classroomId, programmeId, assignmentId, workflowId } });
    } else {
      this.router.navigate(['dashboard', classroomId, 'quiz-submissions'], { queryParams: { institutionId, classroomId, programmeId, assignmentId } });
    };
  }

  async viewScore(assignmentDoc: any, selectedSubmission: any, index: number) {
    let programmeOrWorkflowId: string;
    if (Object.keys(selectedSubmission.submission.versions).map(key => key.split('_')[1]).includes(this.params.workflowId)) {
      programmeOrWorkflowId = 'workflowId_' + this.params.workflowId;
    } else if (Object.keys(selectedSubmission.submission.versions).map(key => key.split('_')[1]).includes(this.params.programmeId)) {
      programmeOrWorkflowId = 'programmeId_' + this.params.programmeId;
    };

    await import('../quiz-submission-dialog/quiz-submission-dialog.module');
    this.dialog.open(QuizSubmissionDialogComponent, {
      data: {
        quizInfo: {
          ...assignmentDoc.value,
          studentInfo: selectedSubmission.studentInfo,
          assignmentDueDate: selectedSubmission.assignment.assignmentDueDate,
          attemptTime: selectedSubmission.submission.versions[programmeOrWorkflowId][`assignmentId_${this.params.assignmentId}`][`attempt${index + 1}`].lastAttemptTime
        }
      }
    });
  }

  async quizReplayDialog(assignmentDoc: any, selectedSubmission: any) {
    await import('../quiz-replay/quiz-replay.module');
    this.dialog.open(QuizReplayComponent, {
      data: {
        quizInfo: assignmentDoc.value,
        parent: 'QuizSubmissionAttemptsTableComponent',
      }
    });
  }

}
