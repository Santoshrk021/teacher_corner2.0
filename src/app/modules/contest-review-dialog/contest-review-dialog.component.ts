import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { lastValueFrom } from 'rxjs';
import { RateSubmissionComponent } from './rate-submission/rate-submission.component';
import { RejectSubmissionComponent } from './reject-submission/reject-submission.component';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { FormDisplayComponent } from '../../shared/components/form-display/form-display.component';
import { QuizReplayComponent } from '../assignments-quiz/quiz-replay/quiz-replay.component';
import { arrayUnion, serverTimestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-contest-review-dialog',
  templateUrl: './contest-review-dialog.component.html',
  styleUrls: ['./contest-review-dialog.component.scss']
})
export class ContestReviewDialogComponent implements OnInit {
  contestDetails: any;
  studentSubmission: any;
  submissionEvaluations: any;
  reviewer: any;
  isFeedbackSubmitted: boolean = false;
  isRejected: boolean = true;
  canRateSubmission: boolean = true;
  submittedFeedback: any;
  comments: any[] = [];
  rubricsName: string = '';
  rubricsKey: string = 'default';
  // comments = [
  //   {
  //     author: "John Doe",
  //     date: new Date('2025-01-16T15:45:00'),
  //     text: "Great work on the submission! Keep it up."
  //   },
  //   {
  //     author: "Jane Smith",
  //     date: new Date('2025-01-15T10:30:00'),
  //     text: "Please add more details to the report for better clarity."
  //   }
  // ];
  newComment;
  submissionDataRaw: unknown;
  constructor(
    @Inject(MAT_DIALOG_DATA) private data: any,
    private configurationService: ConfigurationService,
    private dialog: MatDialog,
    private afAuth: AngularFireAuth,
    private teacherService: TeacherService,
    private contestService: ContestService,
  ) { }

  async ngOnInit() {
    const contestDetails = this.data?.contestDetails || {};
    const stages: any[] = contestDetails?.stagesNames || [];
    const selectedStageName: string = contestDetails?.selectedStageData?.stageName;
    const matchingStage = stages.find((s: any) => s?.stageName === selectedStageName) || stages[0] || {};
    this.rubricsName = matchingStage?.rubricsName || matchingStage?.chosenRubric || 'default';
    this.rubricsKey = matchingStage?.rubricsValue || matchingStage?.chosenRubric || 'default';

    this.studentSubmission = this.data?.studentSubmission;
    this.contestDetails = {
      selectedStageData: this.data?.selectedStageData,
      submissionDetails: this.data?.submissionDetails,
      ...this.data?.contestDetails,
      submissionMeta: this.data?.submissionMeta,
    };


    this.submissionEvaluations = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('submissionEvaluations'));
    const currentUserUid = (await this.afAuth.currentUser).uid;
    this.reviewer = (await lastValueFrom(this.teacherService.getTeacherByIdOnce(currentUserUid))).data();
    const contestId = this.contestDetails?.docId;
    const submissionDataRaw: any = this.submissionDataRaw = await lastValueFrom(this.contestService.getSubmissionReviewDocById(contestId, this.data?.studentId));

    this.onTabChange(0);
    // const submissionData=this.submittedFeedback  = submissionDataRaw?.reviewData?.[this.reviewer.docId];

    // if (submissionData) {
    //   this.isFeedbackSubmitted = true;
    //   this.isRejected = submissionData.isRejected;

    //   if (submissionData.isRejected) {
    //     this.canRateSubmission = false;
    //     this.rejectSubmission();
    //   } else {
    //     this.canRateSubmission = true;
    //     this.rateSubmission();
    //   };
    // };

    if (submissionDataRaw?.comments) {
      this.comments = submissionDataRaw.comments;
    }
  }

  async onClickQuiz(quizData: any) {
    await import('../assignments-quiz/quiz-replay/quiz-replay.module');
    this.dialog.open(QuizReplayComponent, {
      data: {
        quizInfo: quizData,
        parent: 'ContestReviewDialogComponent',
      },
      // disableClose: true,
    });
  }

  onClickForm(formData: any) {
    this.dialog.open(FormDisplayComponent, {
      data: {
        ...formData,
      },
      // disableClose: true,
    });
  }

  rateSubmission(submissionInfo) {
    const stageId = this.data?.selectedStageData?.stageId;
    const submissionId = submissionInfo?.submissionId;
    const reviewInfo = this.submissionDataRaw?.['reviewData']?.[stageId]?.[submissionId]?.[this.reviewer.docId];

    this.dialog.open(RateSubmissionComponent, {
      data: {
        evaluationCriteria: this.submissionEvaluations?.get(this.rubricsKey) ?? {},
        reviewerId: this.reviewer.docId,
        reviewerCountryCode: this.reviewer.teacherMeta.countryCode,
        reviewerEmail: this.reviewer.teacherMeta.email,
        reviewerFirstName: this.reviewer.teacherMeta.firstName,
        reviewerLastName: this.reviewer.teacherMeta.lastName,
        reviewerPhoneNumber: this.reviewer.teacherMeta.phoneNumber,
        contestId: this.data?.contestDetails?.docId,
        stageId: this.data?.selectedStageData?.stageId,
        submissionId: submissionInfo?.submissionId,
        studentId: this.data?.studentId,
        submittedFeedback: reviewInfo ? reviewInfo : {},
      },
      disableClose: true,
    });
  }

  rejectSubmission(submissionInfo) {
    const stageId = this.data?.selectedStageData?.stageId;
    const submissionId = submissionInfo?.submissionId;
    const reviewInfo = this.submissionDataRaw?.['reviewData']?.[stageId]?.[submissionId]?.[this.reviewer.docId];

    this.dialog.open(RejectSubmissionComponent, {
      data: {
        rejectionReasons: this.submissionEvaluations?.get(this.rubricsKey) ?? {},
        reviewerId: this.reviewer.docId,
        reviewerCountryCode: this.reviewer.teacherMeta.countryCode,
        reviewerEmail: this.reviewer.teacherMeta.email,
        reviewerFirstName: this.reviewer.teacherMeta.firstName,
        reviewerLastName: this.reviewer.teacherMeta.lastName,
        reviewerPhoneNumber: this.reviewer.teacherMeta.phoneNumber,
        contestId: this.data?.contestDetails?.docId,
        stageId: this.data?.selectedStageData?.stageId,
        submissionId: submissionInfo?.submissionId,
        studentId: this.data?.studentId,
        submittedFeedback: reviewInfo ? reviewInfo : {},
      },
      disableClose: true,
    });
  }

  addComment() {
    const contestId = this.data?.contestDetails?.docId;
    const studentId = this.data?.studentId;
    const commentObj = {
      time: new Date(),
      text: this.newComment,
      authorName: this.reviewer.teacherMeta.firstName + ' ' + this.reviewer.teacherMeta.lastName,
      role: 'teacher',
      authorId: this.reviewer.docId,
    };

    const commentObjForDb = {
      comments: arrayUnion(commentObj)
    };
    this.contestService.addSubmissionDoc(contestId, studentId, commentObjForDb).then(async () => {
      const submissionDataRaw: any = await lastValueFrom(this.contestService.getSubmissionReviewDocById(contestId, this.data?.studentId));
      this.comments = submissionDataRaw.comments;
      this.newComment = '';
    });

  }

  onTabChange(index) {
    const selectedSubmission = this.contestDetails?.submissionDetails[index];

    const stageId = this.data?.selectedStageData?.stageId;
    const submissionId = selectedSubmission?.submissionId;
    const reviewInfo = this.submissionDataRaw?.['reviewData']?.[stageId]?.[submissionId]?.[this.reviewer.docId];


    if (reviewInfo) {
      this.isFeedbackSubmitted = true;
      this.isRejected = reviewInfo.isRejected;


      if (reviewInfo.isRejected) {
        this.canRateSubmission = false;
        // this.rejectSubmission(selectedSubmission);
      } else {
        this.canRateSubmission = true;
        // this.rateSubmission(selectedSubmission);
      };

    }
    else {
      this.isFeedbackSubmitted = false;
      this.isRejected = false;
      this.canRateSubmission = true;
    }
  }
}
