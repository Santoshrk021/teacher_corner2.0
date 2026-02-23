import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { first, lastValueFrom, take } from 'rxjs';
@Component({
  selector: 'app-upload-assignments',
  templateUrl: './upload-assignments.component.html',
  styleUrls: ['./upload-assignments.component.scss']
})
export class UploadAssignmentsComponent implements OnInit, AfterViewInit {
  @Input() inputData: any
  @Input() contentInfo: any
  @Input() submissionMeta: any
  @Input() selectedStageSubmInfo
  @Input() isOldcontest
  @Input() rawWorkflowInfo
  @Input() isLastStep
  @Input() currentWorkflow: any
  @Input() workflowId
  @Input() contestInfo

  assignments
  uploadStates: Array<boolean>;

  constructor(
    private assignmentsService: AssignmentsService,
    private route: ActivatedRoute,
  ) { }

  ngAfterViewInit(): void {
  }

  ngOnInit(): void {
    this.getAssignments();
  }

  // firstFormGroup: FormGroup = this._formBuilder.group({ firstCtrl: [''] });
  // secondFormGroup: FormGroup = this._formBuilder.group({ secondCtrl: [''] });

  async getAssignments() {
    const { studentId, stageId, submId } = await lastValueFrom(this.route.queryParams.pipe(first()));
    const contestId = this.contestInfo.docId;
    const studentSubmission = await this.getStudentSubmission(studentId, contestId);

    const assId = this.contentInfo.assignmentId
    this.assignmentsService.getWithId(assId).pipe(take(1)).subscribe(res => {
      res.assignments.map(data => data['dueDate'] = this.contentInfo['assignmentDueDate'])
      this.uploadStates = this.contestInfo?.isContestStepsLocked ? Array(res.assignments.length).fill(false) : Array(res.assignments.length).fill(true);
      this.assignments = res

      if (studentSubmission) {
        const assignmentId = this.contentInfo.assignmentId;
        const submissions = Object.values(
          studentSubmission?.[`stageId-${stageId}`]?.[`submId-${submId}`]?.[`assignmentId-${assignmentId}`] || {}
        );

        submissions.forEach((submission: any, index: number) => {
          if (submission?.submissionPath?.length) {
            this.uploadStates[index] = true;
          }
        });
      };
    })
  }

  catchIsAttemptedEvent(event, index) {
    if (event === true) {
      this.currentWorkflow.isAttempted = true;
      this.uploadStates[index] = true;
    };
  }

  async getStudentSubmission(studentId: string, contestId: string) {
    const studentSubmission = await lastValueFrom(this.assignmentsService.getContestSubmissions(studentId, contestId));
    return studentSubmission.data();
  }

}
