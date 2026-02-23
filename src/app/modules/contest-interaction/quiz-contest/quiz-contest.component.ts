import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { AfterViewInit, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, interval, Observable, PartialObserver, Subject, Subscription, take, takeUntil, timer } from 'rxjs';
import { RamanQuizzerService } from './quizzer.service';
import { arrayUnion, serverTimestamp, Timestamp } from "firebase/firestore";
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
// import { RamanSubmissionService } from '../raman-submission.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { HttpClient } from '@angular/common/http';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { SharedService } from 'app/shared/shared.service';
import { ContestSubmissionsService } from 'app/core/dbOperations/contestSubmissions/contestSubmissions.service'
import { ContestInteractionService } from '../contest-interaction.service';
import { MatDialog } from '@angular/material/dialog';
import { QuizReplayComponent } from 'app/modules/assignments-quiz/quiz-replay/quiz-replay.component';

@Component({
    selector: 'app-quiz-contest',
    templateUrl: './quiz-contest.component.html',
    styleUrls: ['./quiz-contest.component.scss'],
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { displayDefaultIndicatorType: false },
        },
    ]
})
export class QuizContestComponent implements OnInit, OnDestroy, AfterViewInit {
    @ViewChild('courseSteps', { static: false }) courseSteps: MatTabGroup;
    @ViewChild('stepper') stepper: MatStepper;
    private ipUrl = 'https://api.ipify.org?format=json';

    @Input() workflowId: any
    @Input() quizId
    @Input() isOldcontest
    @Input() rawWorkflowInfo
    @Input() contentInfo
    @Input() selectedStageSubmInfo
    @Input() currentWorkflow
    @Input() isLastStep
    @Input() contestInfo

    private _unsubscribeAll: Subject<any> = new Subject<any>()
    progressNum = 0;
    running

    drawerMode: 'over' | 'side' = 'side';
    drawerOpened: boolean = true;
    currentStep: number = 0;
    isQuizStart: boolean = false
    stepIndex = 0
    timeTaken = {}
    countDown: Subscription;
    counter = 1800;
    tick = 1000;
    quizQustions: any;
    test: any[] = [];

    timer$: Observable<number>;
    timerObserver: PartialObserver<number>;
    stopClick$ = new Subject();
    pauseClick$ = new Subject();
    stopClick = {};
    pauseClick = {};

    quizInfo: any = {
    };

    questionsFormGroup: FormGroup;
    openTab: number;
    params: any;
    subcriptionArr = [];
    studentId: any;

    isFinalSubmission = false;
    studentSubmission = {}
    studentDocMeta: any = {}
    contestStageInfo: any = {
        stageName: '',
        contestName: '',
    }

    isQuizSubmit = false
    submissionRef: any;
    qusBehaviorSub = new BehaviorSubject([])
    submitBtnDisabled = false;
    quizSubmissionMeta: any;
    noOfAllowedSubExceed: boolean = false;
    incompleteSubmissions: any[];
    inBetweenContest: boolean = false;
    isContestStarted: boolean = false;
    isContestEnd: boolean = false;
    currentStage: any;

    // Attempt control
    attemptsExhausted: boolean = false;
    currentAttemptNumber: number = 1;
    allowedSubmissions: number = 3;

    // Text Answer (Quill) Properties
    textAnswerQuillModules = {
        toolbar: false
    };
    textCharCounts: { [questionIndex: number]: number } = {};

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        private assignmentService: AssignmentsService,
        private fb: FormBuilder,
        private uiService: UiService,
        private quizzerService: RamanQuizzerService,
        private route: ActivatedRoute,
        protected http: HttpClient,
        private studentService: StudentsService,
        private userService: UserService,
        // private ramanSubmService: RamanSubmissionService,
        private contestService: ContestService,
        private contestSubmissionsService: ContestSubmissionsService,
        private fuseConfirmationService: FuseConfirmationService,
        private contestInteractionService: ContestInteractionService,
        private sharedService: SharedService,
        private dialog: MatDialog,
    ) {
        this.questionsFormGroup = this.fb.group({
            questions: this.fb.array([])
        });
        this.route.queryParamMap.subscribe(async (res: any) => {
            this.params = res.params;
        })
    }

    async ngOnInit(): Promise<void> {
        const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
        this.currentStage = currentStage;
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {

                // Set the drawerMode and drawerOpened
                if (matchingAliases.includes('lg')) {
                    this.drawerMode = 'side';
                    this.drawerOpened = true;
                }
                else {
                    this.drawerMode = 'over';
                    this.drawerOpened = false;
                }

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        const inBetweenContest = this.contestService.isInBetweenContest();
        if (inBetweenContest) {
            this.inBetweenContest = true

        }

        const isContestEnd = this.contestService.isContestEnd();
        if (isContestEnd) {
            this.isContestEnd = true

        }

        const isContestStarted = this.contestService.isContestStart();
        if (isContestStarted) {
            this.isContestStarted = true;
        }


    }

    goToPreviousStepInParent() {
        this.quizzerService.goBackBSub.next(true)
    }

    async ngAfterViewInit() {

        await this.getQuiz(this.quizId);

        /* Get Contest Details Here */
        let contest: any = this.contestService.selectedContest.value;
        let stage: any = this.contestService.selectedStage.value;
        this.contestStageInfo.contestName = contest?.contestTitle || '';
        this.contestStageInfo.stageName = stage?.stageName || '';

    }

    checkNumberOfQuizAttempts(studentId) {
        this.contestSubmissionsService.getContestSubmissions(studentId, this.params.contestId).subscribe((res: any) => {
            if (res.data()) {
                this.quizSubmissionMeta = res.data()?.[`stageId-${this.params.stageId}`]?.[`submId-${this.params.submId}`]?.[`assignmentId-${this.quizId}`];
                const attemptsCount = this.quizSubmissionMeta?.versions?.length || 0;
                this.currentAttemptNumber = attemptsCount + 1;
                this.attemptsExhausted = attemptsCount >= this.allowedSubmissions;
                this.noOfAllowedSubExceed = this.attemptsExhausted;
            }
        })
    }

    getQuiz(id) {
        this.assignmentService.getWithId(id).pipe(take(1)).subscribe(res => {
            if (res != null) {
                // Set allowed submissions dynamically from Assignments/{quizId}
                const fromDb = res?.numberOfAllowedSubmissions;
                this.allowedSubmissions = (typeof fromDb === 'number' && fromDb > 0) ? fromDb : 3;
                this.studentOperation();
                this.getAllQuestions(res);
                this.counter = this.quizInfo?.duration;
                this.updateQuestionsForm(res.questionsData);
            }
        })
    }

    updateQuestionsForm(qustionArr = []) {
        qustionArr.forEach((qus, index) => {
            this.addQuestion(qus, index)
            this.timeTaken[index] = 0
            this.pauseClick[index] = new Subject();
            this.stopClick[index] = new Subject();
        })

        this.qusBehaviorSub.next(this.questions.value)
    }

    addQuestion(ques, index) {
        this.questions.push(this.newQuestion(ques, index));
    }

    newQuestion(question, index) {
        let form: FormGroup
        if (question.questionType === 'MCQ') {
            form = this.fb.group({
                questionTitle: [question.questionTitle, Validators.required],
                oneCorrectOption: [question.oneCorrectOption],
                questionType: [question.questionType],
                pedagogyType: [question.pedagogyType, Validators.required],
                marks: [question.marks],
                options: this.fb.array([]),
                timeBound: [question?.timeBound ? question.timeBound : 0],
                timeTaken: [question?.timeTaken ? question.timeTaken : this.timeTaken[index]],
                optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
            });
        }
        else if (question.questionType === 'FILL_IN_THE_BLANKS') {
            const quesTitles: [] = question.questionTitle.split('<<blank>>');
            form = this.fb.group({
                questionTitle: [question.questionTitle, Validators.required],
                questionType: [question.questionType],
                pedagogyType: [question.pedagogyType, Validators.required],
                marks: [question.marks],
                blanks: this.fb.group({}),
                blanksObj: [question.blanks],
                quesSplit: this.fb.array(quesTitles),
                timeBound: [question?.timeBound ? question.timeBound : 0],
                timeTaken: [this.timeTaken[index]],
                optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
            });
        }
        else if (question.questionType === 'RICH_BLANKS') {
            form = this.fb.group({
                questionTitle: [question.questionTitle, Validators.required],
                questionType: [question.questionType],
                pedagogyType: [question.pedagogyType, Validators.required],
                marks: [question.marks],
                blanks: this.fb.group({}),
                blanksObj: [question.blanks],
                timeBound: [question?.timeBound ? question.timeBound : 0],
                timeTaken: [question?.timeTaken ? question.timeTaken : this.timeTaken[index]],
                optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
            });
        }
        else if (question.questionType === 'TEXT') {
            form = this.fb.group({
                questionTitle: [question.questionTitle, Validators.required],
                questionType: question.questionType,
                pedagogyType: [question.pedagogyType, Validators.required],
                marks: [question.marks],
                answer: [question.answer, Validators.required],
                text: [''],
                maxCharLength: [question?.maxCharLength || 10, Validators.required],
                timeBound: [question?.timeBound ? question.timeBound : 0],
                timeTaken: [question?.timeTaken ? question.timeTaken : this.timeTaken[index]],
                optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
            });
        }

        let optionArr = form?.get('options') as FormArray
        // assigning options
        if (question?.options) {
            question?.options.map(res => {
                optionArr.push(this.newOption(res))
            })
        }

        // assigning blanks
        if (question.questionType === 'FILL_IN_THE_BLANKS' || question.questionType === 'RICH_BLANKS') {
            for (let [blankName, options] of Object.entries(question.blanks)) {
                let optionsArr: any = options;
                form.addControl(blankName, this.fb.group({
                    options: this.fb.array(optionsArr.map(a => this.newOption(a))),
                    selectedOption: this.fb.control({
                        name: '---',
                        isCorrect: false,
                    })
                }));
            }
        }
        return form
    }

    get questions() {
        return this.questionsFormGroup.get('questions') as FormArray;
    }

    getResources(questionIndex: number): FormArray {
        return this.questions.at(questionIndex).get('optionalResource') as FormArray;
    }

    newOption(content?): FormGroup {
        return this.fb.group({
            name: this.fb.control(content?.name || '', [Validators.required]),
            isCorrect: this.fb.control(content?.isCorrect || false, [Validators.required]),
            attemptedOption: this.fb.control(false),
        });
    }

    getOptions(questionIndex: number): FormArray {
        return this.questions.at(questionIndex).get('options') as FormArray;
    }

    getOneCorrectOption(quesIndex) {
        const statusValue = (this.questions as FormArray)
            .at(quesIndex).get('oneCorrectOption');
        return statusValue.value
    }

    singleCorrectOptionSetRadio(quesIndex, optionIndex): void {
        const optionsArr = (this.getOptions(quesIndex) as FormArray);
        optionsArr.value.map(d => d.attemptedOption = false);
        optionsArr.at(optionIndex).patchValue({
            attemptedOption: true
        })
    }

    addOptionToBlank(quesIndex, blankName) {
        const blanksFormGroup = (this.questions as FormArray)
            .at(quesIndex)
            .get('blanks');
        const control = blanksFormGroup.get(blankName) as FormArray;
        control.push(this.newOption());
    }

    getAllQuestions(quizzer) {
        this.quizInfo = {
            displayName: quizzer.displayName,
            duration: quizzer.duration,
            numberOfAllowedSubmissions: quizzer?.numberOfAllowedSubmissions,
            "id": quizzer.docId,
            "totalQuestions": quizzer.questionsData.length,
            // "featured": true,
            "progress": {
                "currentStep": 1,
                "completed": 1
            },
            "questions": quizzer.questionsData.map((d, i) => (
                Object.assign({ ...d }, {
                    "order": 1 + i,
                })
            )
            )
        }

    }

    closeNavigation() {
        const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>('mainNavigation');
        navigation.close()
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    goToStep(step: number): void {

        // Set the current step
        this.currentStep = step;

        // Go to the step
        // this.quizInfo.selectedIndex = this.currentStep;

        this.courseSteps.selectedIndex = this.currentStep;


        // Mark for check
        this._changeDetectorRef.markForCheck();
    }

    /**
      * Go to previous step
      */
    goToPreviousStep(): void {
        // Return if we already on the first step
        if (this.currentStep === 0) {
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
        if (this.currentStep === this.quizInfo.totalQuestions - 1) {
            return;
        }

        // Go to step
        this.goToStep(this.currentStep + 1);

        // Scroll the current step selector from sidenav into view
        this._scrollCurrentStepElementIntoView();

        // // Return if we already on the last step
        // if (this.currentStep === this.course.totalSteps - 1) {
        //   return;
        // }

        // // Go to step
        // this.goToStep(this.currentStep + 1);

        // // Scroll the current step selector from sidenav into view
        // this._scrollCurrentStepElementIntoView();
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

    /* Quizzer Start Btn */
    onStartQuiz() {
        if (this.isLastStep && this.incompleteSubmissions?.length) {
            let config = this.contestInteractionService.getConfigForIncompleteSubmissions(this.incompleteSubmissions)
            this.fuseConfirmationService.open()
            return
        }
        this.closeNavigation()
        this.isQuizStart = true;
        // this.time(0)

        this.countDown = timer(0, this.tick).subscribe((count) => {
            if (this.counter == 0 && count) {
                if (this.countDown) {
                    this.counter = 0;
                    this.countDown.unsubscribe();
                    /* Here Commented the Timer */
                    // this.goToLast()
                }
            }
            if (this.counter != 0) {
                --this.counter;
            }

        });
    }

    ngOnDestroy() {
        this.countDown = null;
        if (this.subcriptionArr.length) {
            this.subcriptionArr?.map(sub => sub?.unsubcribe())
        }
        this.isQuizSubmit = false
    }

    goToLast() {
        this.stepper.linear = false;
        let last = this.stepper._steps.length - 1;
        if (!this.stepper) {
            // last = this.course.totalSteps - 1
            last = this.quizInfo.totalQuestions - 1
        }
        this.stepper._steps.forEach(a => { this.stepper.next(); a.editable = false })
        this.stepper.linear = true;

        // for mobile view navigation
        this.goToStep(last - 1);

    }

    onStepChange(event) {

        this.stepIndex = event.selectedIndex

    }


    time(index) {
        this.timer$ = interval(1000).pipe(
            takeUntil(this.pauseClick[index]),
            takeUntil(this.stopClick[index])
        );

        this.timerObserver = {
            next: (_: number) => {
                if (this.timeTaken[index] < 1800) {
                    this.timeTaken[index] += 1;
                    this.questions.at(index).patchValue({
                        'timeTaken': this.timeTaken[index]
                    })
                } else {
                    this.stopClick[index].next('');

                }
            },
        };
        this.timer$?.subscribe(this.timerObserver)

    }
    // time(num) {
    //   this.progressNum = num
    //   this.timer$ = interval(1000).pipe(
    //     takeUntil(this.pauseClick$),
    //     takeUntil(this.stopClick$)
    //   );

    //   this.timerObserver = {
    //     next: (_: number) => {
    //       if (this.progressNum < 1800) {
    //         this.progressNum += 1;

    //       } else {
    //         this.stopClick$.next('');

    //       }
    //     },
    //   };
    //   this.timer$.subscribe(this.timerObserver)

    // }

    // async checkAssignmentSubm(studentId) {
    //   const subm = await this.assignmentsService.getContestSubmissions(studentId, this.params.contestId);
    // }

    emitterCapture(event) {
        this.onSubmit(event)
    }

    getIpAddress(): Observable<any> {
        return this.http.get(this.ipUrl);
    }

    async getIpAddressCurrent() {
        return new Promise((resolve, reject) => {
            this.getIpAddress().subscribe(
                data => {
                    //ip=data.ip
                    resolve(data.ip)
                },
                error => {
                    resolve('null')
                    // console.error('Error getting IP address:', error);
                }
            );
        })
    }

    async onSubmit(questionsData?) {

        this.isQuizSubmit = true
        this.currentWorkflow.isAttempted = true;
        this.countDown.unsubscribe()
        await this.storeToDb(questionsData)
    }


    async storeToDb(questionsData?) {
        let marksObj
        let finalObj = {
            displayName: this.quizInfo.displayName,
            totalQuestions: this.quizInfo.totalQuestions,
            id: this.quizInfo.id,
            duration: this.quizInfo.duration ?? 0,
        }
        if (questionsData) {
            marksObj = this.quizzerService.getTACQuesMarks(questionsData)
            finalObj = {
                questionsData,
                ...marksObj,
                ...finalObj,
                versions: arrayUnion({
                    questionsData,
                    ...marksObj,
                    ...finalObj,
                })


            }
        }
        else {
            marksObj = this.quizzerService.getTACQuesMarks(this.questionsFormGroup.value.questions)
            finalObj = {
                ...this.questionsFormGroup.value,
                ...marksObj,
                ...finalObj,
                versions: arrayUnion({
                    ...this.questionsFormGroup.value,
                    ...marksObj,
                    ...finalObj,
                })
            }
        }

        const d = { clientIp: await this.getIpAddressCurrent(), submissionTime: Timestamp.now().toDate() }
        let obj = {
            [`stageId-${this.params.stageId}`]: {
                [`submId-${this.params.submId}`]: { [`assignmentId-${this.quizId}`]: finalObj },
            },
            submissionMeta: arrayUnion(d),
            createdAt: serverTimestamp(),
        }

        this.contestSubmissionsService.updateInContestSubmission(obj, this.studentId, this.params.contestId).then(async () => {
            const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);

            const isAllStepsMandatory = currentStage.isAllStepsMandatory;
            await this.contestInteractionService.setFlagInStudentDoc(this.params, this.studentId, this.quizId, this.isLastStep);
            if (this.isLastStep) {
                const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
                const submissionArray = currentStage.submissions;
                const isLastSubmission = submissionArray.length > 0 && submissionArray[submissionArray.length - 1].submissionId === this.params.submId;

                const { classroomId, contestId, institutionId, stageId, studentId, submId } = this.params;
                const studentFullName = this.studentService.currentStudent.value.studentMeta.firstName + ' ' + this.studentService.currentStudent.value.studentMeta.lastName;
                const submissionNumber = parseInt(currentStage.submissions.find((subm: any) => subm.submissionId === this.params.submId).displayName.split(' ')[1]);
                const submissionTitle = this.currentWorkflow.contestStepName;
                const stageName = currentStage.stageName;
                const contestTitle = this.contestInfo.contestTitle;
                const urlLink = this.contestInfo.urlLink;
                const selectionOption = currentStage.stageName;
                const selectionMenu = `${contestTitle} "Contests and Challenges"`;
                const contestResultDate = currentStage.hasOwnProperty(`stage_${this.params.stageId}_result_date`) ? this.sharedService.getFormattedDate(currentStage[`stage_${this.params.stageId}_result_date`]) : this.sharedService.getFormattedDate(this.contestInfo.contestEndDate);
                const awardScheduleUrl = this.contestInfo.awardScheduleUrl;
                const senderName = this.contestInfo.senderName;
                const phone = this.studentService.currentStudent.value.studentMeta.countryCode + this.studentService.currentStudent.value.studentMeta.phoneNumber;

                this.contestInteractionService.sendWhatsappNotification(studentFullName, submissionNumber, submissionTitle, stageName, contestTitle, urlLink, selectionOption, selectionMenu, contestResultDate, awardScheduleUrl, senderName, contestId, stageId, phone, classroomId, institutionId, studentId, submId, isLastSubmission);
            }
            this.submitBtnDisabled = true;
            this.uiService.alertMessage('Successful', 'Quiz Submitted Successfully', 'success');
            this.contestInteractionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
        })

    }


    toggleTabs($tabNumber: number) {
        this.openTab = $tabNumber;
    }

    onClickOption(questionIndex: number, blankKey) {
        let formValue = this.questions.at(questionIndex).get(blankKey).value;
        formValue.options.forEach(op => {
            op.attemptedOption = false
            if (op.name === formValue.selectedOption.name) {
                op.attemptedOption = true
            }
        });
    }

    async studentOperation() {
        let studentId;
        studentId = this.studentService.currentStudentId.value
        this.studentId = studentId
        this.studentDocMeta = this.studentService.currentStudent.value
        const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
        const isAllStepsMandatory = currentStage.isAllStepsMandatory;
        if (this.isLastStep && isAllStepsMandatory) {
            this.contestInteractionService.incompleteSubmissions(this.studentDocMeta.docId, this.rawWorkflowInfo, this.currentWorkflow, this.params).subscribe(res => {
                this.incompleteSubmissions = res
            })
        }
        // Keep final submission meta for other flows, but don't use it to block quiz re-attempt UI
        this.isFinalSubmission = this.studentDocMeta?.contestSubmissions?.
        [`contestId_${this.params.contestId}`]?.
        [`stageId_${this.params.stageId}`]?.
        [`submId_${this.params.submId}`]?.isSubmitted === true ? true : false;
        // allowedSubmissions already set in getQuiz() from DB; keep fallback if somehow unset
        if (!(typeof this.allowedSubmissions === 'number' && this.allowedSubmissions > 0)) {
            this.allowedSubmissions = 3;
        }

        if (studentId) {
            this.checkNumberOfQuizAttempts(studentId)
            return studentId
        }
        await (await this.userService.getCurrentStudentInfo()).pipe(take(1)).subscribe(res => {
            studentId = res.currentStudentInfo.studentId
            this.checkNumberOfQuizAttempts(studentId)
            this.studentId = studentId
            this.studentDocMeta = res.currentStudentInfo
            return studentId
        })
    }

    async openReplay(): Promise<void> {
        try {
            await import('app/modules/assignments-quiz/quiz-replay/quiz-replay.module');
        } catch (e) {
            console.error(e);
        }

        // Pick the latest version if available, otherwise use the root object
        const latest = this.quizSubmissionMeta?.versions?.length
            ? this.quizSubmissionMeta.versions[this.quizSubmissionMeta.versions.length - 1]
            : this.quizSubmissionMeta;

        const data = {
            quizInfo: {
                displayName: this.quizInfo?.displayName,
                duration: this.quizInfo?.duration,
            },
            // Some historical saves might use `questionsData` instead of `questions`
            questions: latest?.questions || latest?.questionsData || []
        };

        this.dialog.open(QuizReplayComponent, { data });
    }

    // ===================== TEXT ANSWER METHODS =====================

    onTextAnswerContentChanged(event: any, questionIndex: number): void {
        const html = event?.html || '';
        const plainText = this.extractPlainTextFromHtml(html);
        const charCount = plainText.length;

        this.textCharCounts[questionIndex] = charCount;

        const maxCharLength = this.questions.at(questionIndex)?.get('maxCharLength')?.value || 10;

        if (charCount > maxCharLength) {
            const truncatedText = plainText.substring(0, maxCharLength);
            this.questions.at(questionIndex)?.get('text')?.setValue(
                `<p>${truncatedText}</p>`,
                { emitEvent: false }
            );
            this.textCharCounts[questionIndex] = maxCharLength;
        }

        this._changeDetectorRef.detectChanges();
    }

    getTextCharCount(questionIndex: number): number {
        if (this.textCharCounts[questionIndex] !== undefined) {
            return this.textCharCounts[questionIndex];
        }
        const textValue = this.questions.at(questionIndex)?.get('text')?.value || '';
        const plainText = this.extractPlainTextFromHtml(textValue);
        return plainText.length;
    }

    private extractPlainTextFromHtml(html: string): string {
        if (!html) return '';
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;
        return tempDiv.textContent || tempDiv.innerText || '';
    }
}
