import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { first, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-upload-replay',
  templateUrl: './upload-replay.component.html',
  styleUrls: ['./upload-replay.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false },
    },
  ],
})
export class UploadReplayComponent implements OnInit {
  submissions: any;
  lastAttemptTime: any;
  counter: number = 0;
  submittedSteps: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private route: ActivatedRoute,
  ) {
    console.log(data);
  }

  async ngOnInit(): Promise<void> {
    const params = await lastValueFrom(this.route.queryParams.pipe(first()));
    this.submissions = this.data.uploadInfo;
    const keysToRemove = Object.keys(this.submissions).filter(key => !key.includes('submissionId'));
    keysToRemove.forEach(key => delete this.submissions[key]);

    let programmeOrWorkflowId: string;
    if (params.hasOwnProperty('workflowId')) {
      programmeOrWorkflowId = 'workflowId_' + params.workflowId;
    } else {
      programmeOrWorkflowId = 'programmeId_' + params.programmeId;
    };

    if (this.data.hasOwnProperty('submission')) {
      this.lastAttemptTime = this.data.submission[programmeOrWorkflowId][`assignmentId_${params.assignmentId}`].lastAttemptTime;
      this.submittedSteps = this.data.submission[programmeOrWorkflowId][`assignmentId_${params.assignmentId}`];
    };
    const { totalDurationInHours, totalDurationInMinutes, totalDurationInSeconds } = this.data.assignment;
    this.counter = totalDurationInHours * 3600 + totalDurationInMinutes * 60 + totalDurationInSeconds;
  }

}
