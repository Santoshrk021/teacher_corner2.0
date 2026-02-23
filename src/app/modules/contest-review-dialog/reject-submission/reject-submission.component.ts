import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { UiService } from 'app/shared/ui.service';

@Component({
  selector: 'app-reject-submission',
  templateUrl: './reject-submission.component.html',
  styleUrls: ['./reject-submission.component.scss']
})
export class RejectSubmissionComponent implements OnInit {
  rejectionReasons: Array<any>;
  rejectionForm: FormGroup;
  isRejectionSubmitted: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: any,
    private fb: FormBuilder,
    private contestService: ContestService,
    private uiService: UiService,
    private matDialog: MatDialog,
  ) { }

  ngOnInit(): void {
    this.setForm();
    this.rejectionReasons = this.data?.rejectionReasons?.rejectionReasons;
    if (this.data.hasOwnProperty('submittedFeedback') && Object.keys(this.data.submittedFeedback)?.length > 0) {
      this.isRejectionSubmitted = true;

      this.rejectionForm.patchValue(this.data?.submittedFeedback);

      this.rejectionReasons = this.rejectionReasons.map(reason =>
        reason.reason === this.data?.submittedFeedback?.rejectionReason?.reason ? this.data?.submittedFeedback?.rejectionReason : reason
      );

      this.rejectionForm.disable();
    };
  }

  setForm() {
    this.rejectionForm = this.fb.group({
      rejectionReason: ['', [Validators.required]],
      rejectionComment: [''],
    });
  }

  async onSubmit() {
    const { contestId, stageId, studentId, submissionId, reviewerId, reviewerFirstName, reviewerLastName, reviewerCountryCode, reviewerPhoneNumber, reviewerEmail } = this.data;
    const rejectObject = {
      docId: studentId,
      [stageId]: {
        [submissionId]: {
          [reviewerId]: {
            reviewerMeta: {
              linkUid: reviewerId,
              firstName: reviewerFirstName,
              lastName: reviewerLastName,
              countryCode: reviewerCountryCode,
              phoneNumber: reviewerPhoneNumber,
              email: reviewerEmail,
            },
            ...this.rejectionForm.value,
            isRejected: true,
            contestId,
            stageId,
            submissionId,
          }
        }
      },

    };

    try {
      await this.contestService.addSubmissionReviewDoc(contestId, studentId, rejectObject);
      this.uiService.alertMessage('Success', 'Submission rejected successfully', 'success');
      this.matDialog.closeAll();
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error rejecting submission', 'error');
      console.error('Error rejecting submission', error);
      return;
    }
  }

}
