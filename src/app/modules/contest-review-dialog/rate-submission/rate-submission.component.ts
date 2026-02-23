import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { CustomAuthenticationService } from 'app/core/dbOperations/customAuthentication/customAuthentication.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { CrossDomainMessengerService } from 'app/core/external/cross-domain-messenger-service';
import { MentorEdService } from 'app/core/external/mentorEd/mentor-ed.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-rate-submission',
  templateUrl: './rate-submission.component.html',
  styleUrls: ['./rate-submission.component.scss']
})
export class RateSubmissionComponent implements OnInit {
  evaluationData: Array<any>;
  optionCount: Array<number>;
  ratingForm: FormGroup;
  isRatingSubmitted: boolean = false;

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: any,
    private fb: FormBuilder,
    private contestService: ContestService,
    private uiService: UiService,
    private matDialog: MatDialog,
    private fuseConfirmationService: FuseConfirmationService,
    private mentorEdService: MentorEdService,
    private studentService: StudentsService,
    private customAuthenticationService: CustomAuthenticationService,
    private crossDomainMessengerService: CrossDomainMessengerService,
  ) { }

  ngOnInit(): void {
    this.ratingForm = this.fb.group({});
    this.evaluationData = Object.values(this.data?.evaluationCriteria?.evaluationCriteria);

    this.setForm();
    const maxCount = this.evaluationData?.map((option: any) => option?.options?.length)?.reduce((max, current) => Math.max(max, current), 0);
    this.optionCount = Array.from({ length: maxCount }, (_, i) => i + 1);
    if (this.data.hasOwnProperty('submittedFeedback') && Object.keys(this.data.submittedFeedback)?.length > 0) {
      this.isRatingSubmitted = true;

      this.ratingForm.get('additionalFeedback').patchValue(this.data?.submittedFeedback?.additionalFeedback);
      if (this.data.submittedFeedback.ratings) {
        Object.entries(this.data.submittedFeedback.ratings).map(([key, value]) => {
          this.ratingForm.get(key).patchValue(value['option']);
        });
        this.ratingForm.disable();
      }
    };
  }

  setForm() {
    this.evaluationData.forEach((option: any) => this.ratingForm.addControl(option.rubrique, this.fb.control('', [Validators.required])));
    this.ratingForm.addControl('additionalFeedback', this.fb.control(''));
  }

  async onSubmit() {
    const { additionalFeedback, ...ratings } = this.ratingForm.value;

    /*
    // MentorEd Account Creation & Redirect Logic - Disabled for now
    const isMentorshipTresholdCrossed = this.evaluationData.every((evaluation: any) => {
      const { options, mentorshipTreshold, rubrique } = evaluation;
      const selectedRating = ratings[rubrique];
      const selectedOption = options.findIndex((option: any) => option === selectedRating);
      return selectedOption >= mentorshipTreshold;
    });

    if (isMentorshipTresholdCrossed) {
      const config = {
        title: 'Move Student to Mentorship',
        message: 'This student seems to have great potential, would you like them to be mentored?',
        icon: { name: 'mat_outline:check_circle' }
      };

      const confirmationRef = this.fuseConfirmationService.open(config);
      const confirmation = await lastValueFrom(confirmationRef.afterClosed());

      if (confirmation === 'confirmed') {
        const { studentId } = this.data;
        const studentRef = await lastValueFrom(this.studentService.getStudentByIdOnce(studentId));
        if (studentRef.exists) {
          const studentData: any = studentRef.data();
          const { email, firstName, lastName, linkUid } = studentData?.studentMeta;
          const name = firstName.length && lastName.length ? `${firstName} ${lastName}` : linkUid.replace(/[^a-zA-Z]/g, '');
          const lettersToCapitalize = linkUid.split('').slice(0, 5).join('');
          const passwordWithCapitals = /[A-Z]/.test(linkUid) ? linkUid : linkUid.replace(lettersToCapitalize, lettersToCapitalize.toUpperCase());
          const password = `${passwordWithCapitals}@@@`;
          const registrationOtpBody: any = {
            name,
            email,
            password,
            cpassword: password,
          };
          const mentorEdMeta = {
            name,
            email,
            password,
          };
          const registrationOtp = await this.mentorEdService.getOtpForRegistration(registrationOtpBody);
          registrationOtpBody.otp = registrationOtp;
          registrationOtpBody.has_accepted_terms_and_conditions = true;
          const { access_token, user } = registrationOtp.length === 6 ?
            await this.mentorEdService.createMenteeUsingOtp(registrationOtpBody) :
            await this.mentorEdService.login({ email, password });
          user.docId = studentId;
          const sessionId = 1;
          const sessionDetails = await this.mentorEdService.joinSession(sessionId, access_token);
          user.sessionDetails = sessionDetails;
          await this.mentorEdService.saveMentorEdUserDetails(studentId, user);
          await this.studentService.updateSingleFieldInStudent(studentId, 'mentorEdMeta', mentorEdMeta);
          this.crossDomainMessengerService.openAndPostMessage(
            environment.mentorEdPlatformUrl,
            { email, password, sessionId },
            environment.mentorEdPlatformUrl,
            { intervalMs: 2000, timeoutMs: 10000 }
          );

          // await this.submitRating(ratings, additionalFeedback);
          return; // Ensures no further execution
        } else {
          console.error(`Student with ID ${studentId} doesn't exist`);
        };
      }
    }
    */

    // Submit rating if mentorship condition is not met or user didn't confirm
    await this.submitRating(ratings, additionalFeedback);
  }

  async submitRating(ratings: Record<string, any>, additionalFeedback: string) {
    const transformedRatings: Record<string, any> = {};

    for (const ratingKey in ratings) {
      const ratingValue = ratings[ratingKey];
      const matchingRubrique = this.evaluationData.find(evaluation => evaluation.rubrique === ratingKey);

      if (!matchingRubrique) {
        console.warn(`No matching rubrique found for rating key: ${ratingKey}`);
        continue; // Skip if no matching rubrique is found
      }

      const matchingOptionIndex = matchingRubrique.options.findIndex(option => option === ratingValue);

      transformedRatings[ratingKey] = {
        option: ratingValue,
        score: matchingOptionIndex + 1
      };
    }

    const { contestId, stageId, studentId, submissionId, reviewerId, reviewerFirstName, reviewerLastName, reviewerCountryCode, reviewerPhoneNumber, reviewerEmail } = this.data;

    const ratingObj = {
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
            ratings: transformedRatings,
            additionalFeedback: additionalFeedback ?? '',
            isRejected: false,
            contestId,
            stageId,
            submissionId,
          }
        }
      }
    };

    try {
      await this.contestService.addSubmissionReviewDoc(contestId, studentId, ratingObj);
      this.uiService.alertMessage('Success', 'Rating submitted successfully', 'success');
      this.matDialog.closeAll();
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error submitting rating', 'error');
      console.error(error);
    };
  }

}
