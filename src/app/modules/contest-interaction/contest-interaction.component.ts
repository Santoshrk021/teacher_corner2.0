import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit, Optional, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { ContestNominationsService } from 'app/core/dbOperations/contestNominations/contestNominations.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { firstValueFrom, lastValueFrom, Subject, take, takeUntil } from 'rxjs';
import { ContestReviewDialogComponent } from '../contest-review-dialog/contest-review-dialog.component';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { CustomAuthenticationService } from 'app/core/dbOperations/customAuthentication/customAuthentication.service';
import { ContestInteractionService } from './contest-interaction.service';

@Component({
  selector: 'app-contest-interaction',
  templateUrl: './contest-interaction.component.html',
  styleUrls: ['./contest-interaction.component.scss']
})
export class ContestInteractionComponent implements OnInit, OnDestroy {
  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;

  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  workflowInfo
  currentWorkflow
  currentStep: number = 1;
  studentDetails: any;
  iscreenSmall = false;
  contestInfo: any;
  submissionInfo: any;
  studentNominationInfo: any;
  privilege = false
  submissionColumns: any;
  stageInfo: any;
  StudentReviewObj: any;
  reviewData: any;
  submissionDoc: any;
  isViewFeedbackVisible: boolean = false;
  totalSteps: number = 0;
  unlockedSteps: Promise<void>;
  isDialog = false;

  constructor(
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private activateRoute: ActivatedRoute,
    private userService: UserService,
    private studentService: StudentsService,
    private navigationService: NavigationService,
    private contestService: ContestService,
    private contestWorkflowService: ContestWorkflowService,
    private contestNominationsService: ContestNominationsService,
    private dialog: MatDialog,
    private customAuthService: CustomAuthenticationService,
    private contestInteractionService: ContestInteractionService,
    private cdRef: ChangeDetectorRef,
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogData: any,
    @Optional() private dialogRef: MatDialogRef<ContestInteractionComponent>,
  ) { }

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  currentQueryParams

  ngOnDestroy(): void {
    // window.removeEventListener('beforeunload', this.onBrowserLeave);
    this._unsubscribeAll.forEach(obs => {
      obs.unsubscribe()
    })
  }

  close() { this.dialogRef?.close(); }

  async ngOnInit(): Promise<void> {
    this.getResponsiveUpdate();

    // If opened via MatDialog
    if (this.dialogData?.queryParams) {
      this.isDialog = true;

      // Drawer behavior inside a dialog
      const desktop = window.innerWidth >= 1024;
      this.drawerMode = desktop ? 'side' : 'over';
      this.drawerOpened = desktop;

      // (keep the rest of your "dialog mode" init exactly as you already have)
      const qp = this.dialogData.queryParams;
      this.currentQueryParams = qp;

      this.studentDetails = this.dialogData.studentInfo
        ? this.dialogData.studentInfo
        : await this.studentService.getStudentInfo(qp.studentId);

      this.contestNominationsService.setContestId(qp.contestId);
      const contest = await firstValueFrom(this.contestService.get(qp.contestId));
      this.contestInfo = contest;

      const studentNominationRef = await lastValueFrom(
        this.contestNominationsService.getContestDataByDocIdAndContestId(qp.studentId, qp.contestId)
      );
      this.studentNominationInfo = studentNominationRef?.data ? studentNominationRef.data() : studentNominationRef?.data?.();

      const studentCategory = contest.type === 'classroomStemClubdependent'
        ? 'K10'
        : this.getStudentCategory(contest.categories, this.studentNominationInfo?.studentMeta?.grade);

      this.submissionInfo = this.getSubmissionInfo(contest.stagesNames, qp.stageId, qp.submId);
      this.handleBreadcrumb(contest, qp.stageId);
      await this.workflowInitialization(qp, contest, studentCategory);

      this.generateFlattenedSteps();
      await this.checkScreenSize();
      await this.checkForReviewInfo(qp.studentId, qp.stageId, contest, qp);
      return;
    }

    // ---------- ROUTE MODE (your original code) ----------
    await (await this.userService.getCurrentStudentInfo())
      .pipe(take(1))
      .subscribe(async (res) => {
        const studentId = res.currentStudentInfo.studentId;

        this.studentDetails = await this.studentService.getStudentInfo(studentId);

        if (!this.navigationService.isNavigationLoaded) {
          this.studentService.updateUser(studentId);
          await this.creatNav(studentId);
        }

        const queryParams = this.activateRoute.snapshot.queryParams;
        this.currentQueryParams = queryParams;
        const contestId = queryParams.contestId;

        this.contestNominationsService.setContestId(contestId);
        const contest = await firstValueFrom(this.contestService.get(contestId));
        this.contestInfo = contest;

        const studentNominationRef = await lastValueFrom(
          this.contestNominationsService.getContestDataByDocIdAndContestId(studentId, contestId)
        );
        this.studentNominationInfo = studentNominationRef.data();

        let studentCategory;
        if (contest.type == 'classroomStemClubdependent') {
          studentCategory = 'K10';
        } else {
          studentCategory = this.getStudentCategory(
            contest.categories,
            this.studentNominationInfo.studentMeta.grade
          );
        }

        this.submissionInfo = this.getSubmissionInfo(
          contest.stagesNames,
          queryParams?.stageId,
          queryParams?.submId
        );

        this.handleBreadcrumb(contest, queryParams?.stageId);
        await this.workflowInitialization(queryParams, contest, studentCategory);

        this.generateFlattenedSteps();
        await this.checkScreenSize();
        await this.checkForReviewInfo(studentId, queryParams?.stageId, contest, queryParams);

        if (contest.hasOwnProperty('isContestStepsLocked') && contest.isContestStepsLocked) {
          this.contestInteractionService.unlockedSteps
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((res) => {
              if (this.workflowInfo?.contestSteps && res !== null && res < this.workflowInfo?.contestSteps?.length) {
                this.workflowInfo.contestSteps[res].isStepUnlocked = true;
                this.updateProgressInFirestore();
                this.cdRef.detectChanges();
              }
            });
        }
      });

    // this.onBrowserLeave();
  }


  async getSubmissionDataForReview(contest, stageId, studentId, submissionId) {
    // Ensure this.submissionColumns is initialized
    this.submissionColumns = [];

    const stage = contest.stagesNames.find(stage => stage.stageId === stageId);
    this.stageInfo = stage;

    // Use a for...of loop to handle asynchronous operations properly
    for (const submission of stage.submissions) {
      const workflowId = submission.workflowId;

      if (workflowId) {
        let workflowData: any = await this.contestWorkflowService.getDocDataByDocId(workflowId);
        const firstKey = Object.keys(workflowData.contestSteps)[0];

        let columns = workflowData.contestSteps[firstKey].steps
          .filter(step => step.type === 'ASSIGNMENT')
          .flatMap(step =>
            step.contents.map((content, index) => ({
              isMoreThanOneContent: step.contents.length > 1,
              assignmentId: content.assignmentId,
              contestStepName: step.contents.length > 1
                ? `${step.contestStepName}-${index + 1}`
                : step.contestStepName,
            }))
          );

        let subObj = {
          title: `${submission?.displayName}`,
          submissionId: submission.submissionId,
          columns: columns,
        };

        // Push the submission object to submissionColumns
        this.submissionColumns.push(subObj);
      }
    }

    // Ensure asynchronous calls are completed before proceeding
    let contestData: any = await lastValueFrom(this.studentService.getContestDataOfStudent(studentId, this.contestInfo.docId));
    let studentAuthInfo = await lastValueFrom(this.customAuthService.getByIdOnce(studentId));

    let contestSubmissions = [];
    const submissionMeta = contestData.get('submissionMeta');
    const latestSubmission = submissionMeta.reduce((latest, current) => {
      const latestTime = latest.submissionTime.seconds * 1e9 + latest.submissionTime.nanoseconds;
      const currentTime = current.submissionTime.seconds * 1e9 + current.submissionTime.nanoseconds;
      return currentTime > latestTime ? current : latest;
    });

    let stageRef = contestData.data()?.[`stageId-${stageId}`];

    // Check if this.submissionColumns is defined before iterating
    this.submissionColumns = this.submissionColumns.filter(submission => submission.submissionId == submissionId);
    if (this.submissionColumns) {
      this.submissionColumns.forEach(submission => {
        submission.columns.forEach(sub => {
          let subObj = {};
          let data = stageRef?.[`submId-${submission.submissionId}`]?.[`assignmentId-${sub.assignmentId}`];
          if (data?.hasOwnProperty('questions')) {
            subObj['submission'] = data;
            subObj['type'] = 'QUIZ';
            subObj['contestStepName'] = sub?.contestStepName;
          } else {
            subObj['type'] = 'MEDIA';
            subObj['submission'] = Object.values(data);
            subObj['contestStepName'] = sub?.contestStepName;
          }
          if (data?.hasOwnProperty('innovationVideoLink')) {
            subObj['type'] = 'VIDEO';
            subObj['submission'] = data;
            subObj['contestStepName'] = sub?.contestStepName;
          }
          const formFieldNames = ['additionalLanguage', 'category', 'description', 'materialUsed', 'subject', 'title', 'topic'];
          if (formFieldNames.some(fieldName => data?.hasOwnProperty(fieldName))) {
            subObj['type'] = 'FORM';
            subObj['submission'] = data;
            subObj['contestStepName'] = sub?.contestStepName;
          }
          contestSubmissions.push(subObj);
        });
      });
    } else {
      console.error("submissionColumns is undefined");
    }

    this.StudentReviewObj = {
      ...this.studentDetails,
      contestSubmissions,
      authInfo: studentAuthInfo.data() ? studentAuthInfo.data() : {},
      submissionMeta: latestSubmission
    };
  }

  checkForReviewInfo(studentId: string, stageId: string, contest: any, queryParams: any) {
    this.contestService
      .getSubmissionReviewDocById(this.contestInfo?.docId, studentId)
      .pipe(take(1))
      .subscribe(async (res: any) => {
        // Support both: DocumentSnapshot (has data()) OR plain object (already data)
        const doc = typeof res?.data === 'function' ? res.data() : res;

        if (!doc) {
          this.isViewFeedbackVisible = false;
          this.reviewData = {};
          return;
        }

        this.submissionDoc = doc;

        const dataAvailable = this.filterSubmissionData(
          doc?.reviewData,
          this.submissionInfo?.submissionId,
          stageId
        );

        if (dataAvailable || doc?.comments) {
          this.isViewFeedbackVisible = true;
          this.reviewData = dataAvailable ? Object.values(dataAvailable)[0] : {};
          await this.getSubmissionDataForReview(
            contest,
            queryParams?.stageId,
            studentId,
            queryParams?.submId
          );
        } else {
          this.isViewFeedbackVisible = false;
          this.reviewData = {};
        }
      });
  }

  filterSubmissionData(data: any, submissionId: string, stageId: string) {
    if (data?.[stageId]?.[submissionId]) {
      return data?.[stageId]?.[submissionId]
    }
    // Return null if no match is found
    return null;
  }

  // async getSubmissionDataForReview1(contest, stageId, studentId) {
  //   const stage = contest.stagesNames.find(stage => stage.stageId === stageId);
  //   this.stageInfo = stage;
  //   stage.submissions.forEach(async (submission, index) => {
  //     const workflowId = submission.workflowId
  //     if (workflowId) {
  //       let workflowData: any = await this.contestWorkflowService.getDocDataByDocId(workflowId);
  //       const firstKey = Object.keys(workflowData.contestSteps)[0];
  //       // Filter and transform steps in one chain using map
  //       let columns = workflowData.contestSteps[firstKey].steps
  //         .filter(step => step.type === 'ASSIGNMENT')
  //         .flatMap(step => step.contents.map((content, index) => ({
  //           isMoreThanOneContent: step.contents.length > 1,
  //           assignmentId: content.assignmentId,
  //           contestStepName: step.contents.length > 1
  //             ? `${step.contestStepName}-${index + 1}`
  //             : step.contestStepName,
  //         })));
  //       // Create the submission object
  //       let subObj = {
  //         // title: `submission ${index + 1} - ${submission?.displayName}`,
  //         title: `${submission?.displayName}`,
  //         submissionId: submission.submissionId,
  //         columns: columns,
  //       };
  //       // Add to submission columns
  //       this.submissionColumns.push(subObj);
  //     }
  //   })
  //   let contestData: any = await lastValueFrom(this.studentService.getContestDataOfStudent(studentId, this.contestInfo.docId))
  //   let studentAuthInfo = await lastValueFrom(this.customAuthService.getWithGet(studentId))
  //   let contestSubmissions = []
  //   const submissionMeta = contestData.get('submissionMeta');
  //   const latestSubmission = submissionMeta.reduce((latest, current) => {
  //     const latestTime = latest.submissionTime.seconds * 1e9 + latest.submissionTime.nanoseconds;
  //     const currentTime = current.submissionTime.seconds * 1e9 + current.submissionTime.nanoseconds;
  //     return currentTime > latestTime ? current : latest;
  //   });
  //   let stageRef = contestData.data()?.[`stageId-${stageId}`]
  //   this.submissionColumns.forEach(submission => {
  //     submission.columns.forEach(sub => {
  //       let subObj = {}
  //       let data = stageRef?.[`submId-${submission.submissionId}`]?.[`assignmentId-${sub.assignmentId}`]
  //       if (data.hasOwnProperty('questions')) {
  //         subObj['submission'] = data
  //         subObj['type'] = 'QUIZ'
  //         subObj['contestStepName'] = sub?.contestStepName
  //       }
  //       else {
  //         subObj['type'] = 'MEDIA'
  //         subObj['submission'] = Object.values(data)
  //         subObj['contestStepName'] = sub?.contestStepName
  //       }
  //       if (data.hasOwnProperty('innovationVideoLink')) {
  //         subObj['type'] = 'VIDEO'
  //         subObj['submission'] = data
  //         subObj['contestStepName'] = sub?.contestStepName
  //       }
  //       const formFieldNames = ['additionalLanguage', 'category', 'description', 'materialUsed', 'subject', 'title', 'topic'];
  //       if (formFieldNames.some(fieldName => data.hasOwnProperty(fieldName))) {
  //         subObj['type'] = 'FORM'
  //         subObj['submission'] = data
  //         subObj['contestStepName'] = sub?.contestStepName
  //       }
  //       contestSubmissions.push(subObj)
  //     })
  //   })
  //   this.StudentReviewObj = { ...this.studentDetails, contestSubmissions, authInfo: studentAuthInfo.data() ? studentAuthInfo.data() : {}, submissionMeta: latestSubmission }
  // }

  getStudentCategory(categories, studentGrade) {
    studentGrade = parseInt(studentGrade);
    const studentCategory = categories.filter((x) => {
      let grades = x.grades.map((grade) => parseInt(grade.grade));
      return grades.includes(studentGrade)
    }
    )?.[0]?.categoryName;
    return studentCategory;
  }

  getSubmissionInfo(stagesInfo, stageId, submissionId) {
    const stage = stagesInfo.find(stage => stage.stageId === stageId);
    const submission = stage.submissions.find(sub => sub.submissionId === submissionId);
    return submission;
  }

  getResponsiveUpdate() {
    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        // desktop if lg and up, else mobile/tablet
        const isDesktop = matchingAliases.includes('lg');
        this.drawerMode = isDesktop ? 'side' : 'over';
        this.drawerOpened = isDesktop;      // open side-nav on desktop, overlay on mobile
        this.iscreenSmall = !isDesktop;     // <-- use this in template
        this._changeDetectorRef.markForCheck();
      });
  }


  goBack() {
    if (this.isDialog && this.dialogRef) { this.close(); return; }
    // (route mode) this.router.navigate(['../'], { relativeTo: this.activateRoute, queryParamsHandling: 'merge' });
  }

  goBacktoClassroom() {
    // const updatedQueryParams = { ...this.currentQueryParams };
    // Replace programmeId with contestId
    // if (updatedQueryParams.programmeId) {
    // updatedQueryParams.contestId = updatedQueryParams.programmeId; // Replace programmeId with contestId
    //  delete updatedQueryParams.programmeId; // Remove programmeId
    // delete updatedQueryParams.submId; // Remove programmeId
    // delete this.currentQueryParams.submId; // Remove programmeId
    // }
    // this.router.navigate(
    //   [`dashboard/${this.currentQueryParams.classroomId}`],
    //   {
    //     queryParams: this.currentQueryParams, // Use the updated queryParams
    //     queryParamsHandling: '' // Do not merge with existing query parameters
    //   }
    // );
    // if(this.currentQueryParams.submId){
    //   delete this.currentQueryParams.submId
    //   alert(JSON.stringify(this.currentQueryParams))
    // }
    this.router.navigate([`dashboard/${this.currentQueryParams.classroomId}`], {
      queryParams: {
        institutionId: this.currentQueryParams.institutionId,
        classroomId: this.currentQueryParams.classroomId,
        studentId: this.currentQueryParams.studentId,
        contestId: this.currentQueryParams.contestId,
        stageId: this.currentQueryParams.stageId
      },
    });
    //this.router.navigate( [`dashboard/${this.currentQueryParams.classroomId}`],{queryParams: this.currentQueryParams,queryParamsHandling: ''})
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  // trackByFn(index: number, item: any): any {
  //   return item?.sequenceNumber || index;
  // }

  /**
    * Go to previous step
    */
  goToPreviousStep(): void {
    // Return if we already on the first step
    if (this.currentStep === 1) {
      return;
    }
    // Go to step
    this.goToStep(this.currentStep - 1);
    // Scroll the current step selector from sidenav into view
    this._scrollCurrentStepElementIntoView();
  }

  /**
    * Go to next step
    */
  goToNextStep(): void {
    // Return if we already on the last step
    if (this.currentStep === this.workflowInfo?.totalSteps) {
      return;
    }
    // Go to step
    this.goToStep(this.currentStep + 1);
    // Scroll the current step selector from sidenav into view
    this._scrollCurrentStepElementIntoView();
  }

  goToStep(step: number) {
    // Set the current step
    this.currentStep = step;
    this.currentWorkflow =
      this.workflowInfo?.contestSteps[this.currentStep - 1];
    // Go to the step
    this.courseSteps.selectedIndex = this.currentStep - 1;
    // Mark for check
    this._changeDetectorRef.markForCheck();
  }

  private _scrollCurrentStepElementIntoView(): void {
    // Wrap everything into setTimeout so we can make sure that the 'current-step' class points to correct element
    setTimeout(() => {
      // Get the current step element and scroll it into view
      const currentStepElement = document.getElementsByClassName('current-step')[0];
      if (currentStepElement) {
        currentStepElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  }

  async creatNav(studentId) {
    await this.navigationService.getNav(studentId);
  }

  async checkScreenSize() {
    return new Promise((resolve, reject) => {
      this._fuseMediaWatcherService.onMediaChange$
        .pipe(takeUntil(this._unsubscribeAll))
        .subscribe(({ matchingAliases }) => {
          // Check if the screen is small
          this.iscreenSmall = !matchingAliases.includes('sm');
          this._changeDetectorRef.markForCheck();

          resolve(this.iscreenSmall)
        });
    })
  }

  handleBreadcrumb(contestData, stageId) {
    this.contestService.selectedContest.next(contestData);
    const selectedStage = this.contestService.getStages(
      contestData.stagesNames,
      stageId
    );
    this.contestService.selectedStage.next(selectedStage);
  }

  async workflowInitialization(params: any, contestData: any, studentCategory: any) {
    const checkWF = await this.contestService.checkWorkflowId(contestData?.stagesNames, params?.submId);
    if (checkWF?.workflowId) {
      await this.getWorkflowDoc(checkWF.workflowId, studentCategory);
    }
  }

  async getWorkflowDoc2(docId, studentCategory) {
    const workflowInfo = await this.contestWorkflowService.getDocDataByDocId(docId);
    const { studentId, contestId } = this.currentQueryParams;
    const contestCompletion = await lastValueFrom(this.contestInteractionService.getContestWorkflowCompletion(studentId, contestId));
    const unlockedStepNumber = contestCompletion.exists ? contestCompletion.get(`workflows.${docId}.unlockedSteps`) : 1;
    const completedStepNumber = contestCompletion.exists ? contestCompletion.get(`workflows.${docId}.completedSteps`) : 1;
    await this.viewWorkflowTemplate(workflowInfo, true, studentCategory, unlockedStepNumber, completedStepNumber);
  }

  async getWorkflowDoc(docId, studentCategory) {
    const workflowInfo: any = await this.contestWorkflowService.getDocDataByDocId(docId);

    const stepsArray = [];

    if (workflowInfo.contestSteps) {
      for (const categoryKey in workflowInfo.contestSteps) {
        const categorySteps = workflowInfo.contestSteps[categoryKey]?.steps || [];
        categorySteps.forEach(step => {
          step.categoryKey = categoryKey; // if you want to use it later in UI
          stepsArray.push(step);
        });
      }
    }

    this.workflowInfo = {
      ...workflowInfo,
      flattenedSteps: stepsArray // <-- Use this in HTML
    };

    const { studentId, contestId } = this.currentQueryParams;
    const contestCompletion = await lastValueFrom(this.contestInteractionService.getContestWorkflowCompletion(studentId, contestId));
    const unlockedStepNumber = contestCompletion.exists ? contestCompletion.get(`workflows.${docId}.unlockedSteps`) : 1;
    const completedStepNumber = contestCompletion.exists ? contestCompletion.get(`workflows.${docId}.completedSteps`) : 1;

    await this.viewWorkflowTemplate(workflowInfo, true, studentCategory, unlockedStepNumber, completedStepNumber);
  }



  async viewWorkflowTemplate(rawWorkflowInfo: any, isSaved: boolean, studentCategory: any, unlockedStepNumber: number, completedStepNumber: number) {
    this.workflowInfo = this.contestWorkflowService.parseContestTemplate(rawWorkflowInfo, isSaved, studentCategory, unlockedStepNumber);
    this.currentWorkflow = this.workflowInfo?.contestSteps[(completedStepNumber ?? this.currentStep) - 1];
  }

  onClickReview() {
    let student = this.StudentReviewObj

    import('../contest-review-dialog/contest-review-dialog.module').then(m => m.ContestReviewDialogModule);
    this.dialog.open(ContestReviewDialogComponent, {
      data: {
        studentSubmission: student?.contestSubmissions,
        contestDetails: this.contestInfo,
        submissionDetails: this.submissionColumns,
        selectedStageData: this.stageInfo,
        submissionMeta: student?.submissionMeta,
        studentId: student?.docId,
        reviewData: this.reviewData,
        comments: this.submissionDoc.comments ? this.submissionDoc.comments : [],
        studentDetails: this.studentDetails
      },
      disableClose: true,
    });
  }

  async updateProgressInFirestore() {
    const contestWorkflowId = this.workflowInfo?.workflowId;
    const contestId = this.contestInfo.docId;
    const studentId = this.studentDetails.docId;
    const unlockedSteps = this.unlockedSteps = this.workflowInfo?.contestSteps.filter((step: any) => step?.isStepUnlocked)?.length;

    const workFlowProgress = {
      type: 'contest',
      workflows: {
        [contestWorkflowId]: {
          completedSteps: this.currentStep,
          unlockedSteps: unlockedSteps || 1,
        }
      },
      docId: contestId,
    };

    // send work completion progress to firestore
    try {
      this.contestInteractionService.setContestWorkflowCompletion(studentId, contestId, workFlowProgress);
    } catch (error) {
      console.error('Error sending work completion progress to firestore: ', error);
    };
  }

  onBrowserLeave() {
    window.addEventListener('beforeunload', (event) => {
      this.updateProgressInFirestore();
      // event.preventDefault();
      // event.returnValue = 'Are you sure you want to leave the page?';
    });
  }

  steps: any[] = [];


  generateFlattenedSteps() {
    const contestSteps = this.workflowInfo?.contestSteps;
    const flattened: any[] = [];

    if (!contestSteps) return;

    // Case 1: If contestSteps is a direct array
    if (Array.isArray(contestSteps)) {
      for (const step of contestSteps) {
        flattened.push(step);
        if (step.contents?.length) {
          for (const content of step.contents) {
            flattened.push({ ...step, ...content });
          }
        }
      }
    }
    // Case 2: If contestSteps is grouped by categories
    else if (typeof contestSteps === 'object') {
      for (const categoryKey of Object.keys(contestSteps)) {
        const steps = contestSteps[categoryKey]?.steps || [];
        for (const step of steps) {
          flattened.push(step);
          if (step.contents?.length) {
            for (const content of step.contents) {
              flattened.push({ ...step, ...content });
            }
          }
        }
      }
    }

    // this.steps = flattened;
    const uniqueData = flattened.filter((value, index, self) =>
      index === self.findIndex((obj) => obj.sequenceNumber === value.sequenceNumber)
    );
    this.steps = uniqueData;
    // this.totalSteps = this.steps.length;
    this.workflowInfo.totalSteps = this.steps.length;

  }





}
