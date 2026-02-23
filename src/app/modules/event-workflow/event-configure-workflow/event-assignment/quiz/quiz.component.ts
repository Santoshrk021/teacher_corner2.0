import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { AfterViewInit, ChangeDetectorRef, Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseLoadingService } from '@fuse/services/loading';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { DummyService } from 'app/shared/dummy.service';
import { UiService } from 'app/shared/ui.service';
import { first, interval, lastValueFrom, Observable, PartialObserver, Subject, Subscription, take, takeUntil, timer } from 'rxjs';
import { QuizzerService } from './quizzer.service';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UsbService } from 'app/usb.service';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false },
    },
  ]
})
export class QuizComponent implements OnInit {
  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;
  @ViewChild('stepper') stepper: MatStepper;

  @Input() workflowId: any;
  @Input() quizId;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  progressNum = 0;
  running;

  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  currentStep: number = 0;
  isQuizStart: boolean = false;
  stepIndex = 0;
  timeTaken = {};
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
  teacher: any;

  // Text Answer (Quill) Properties
  textAnswerQuillModules = {
    toolbar: false
  };
  textCharCounts: { [questionIndex: number]: number } = {};

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _dummyService: DummyService,
    private _fuseNavigationService: FuseNavigationService,
    private assignmentService: AssignmentsService,
    private fb: FormBuilder,
    private uiService: UiService,
    private quizzerService: QuizzerService,
    private route: ActivatedRoute,
    private deviceInfoService: DeviceInfoService,
    private userService: UserService,


  ) {
    this.questionsFormGroup = this.fb.group({
      questions: this.fb.array([])
    });

    this.questionsFormGroup.get('questions').valueChanges.subscribe((d) => {
      // console.log(this.questionsFormGroup.getRawValue()['questions']);
    });
  }

  ngOnInit(): void {
    // this.onStartQuiz();
    this.getQuiz(this.quizId);
    this.getQueryParams();
    // Subscribe to media changes
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

    this.userService.user$
      .pipe((takeUntil(this._unsubscribeAll)))
      .subscribe((user: any) => {
        this.teacher = user?.teacherMeta;
        // console.log(user);

        // console.log(user);

      });

  }

  getQueryParams() {
    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
    });
  }
  getQuiz(id) {
    this.assignmentService.getWithId(id).pipe(take(1)).subscribe((res) => {
      if (res != null) {
        this.getAllQuestions(res);
        this.updateQuestionsForm(res.questionsData);
      }
    });
  }
  updateQuestionsForm(qustionArr = []) {
    qustionArr.forEach((qus, index) => {
      this.addQuestion(qus, index);
      this.timeTaken[index] = 0;
      this.pauseClick[index] = new Subject();
      this.stopClick[index] = new Subject();
    });
  }
  addQuestion(ques, index) {
    this.questions.push(this.newQuestion(ques, index));
  }

  newQuestion(question, index) {
    let form: FormGroup;
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

    const optionArr = form?.get('options') as FormArray;
    // assigning options
    if (question?.options) {
      question?.options.map((res) => {
        optionArr.push(this.newOption(res));
      });
    }

    // assigning blanks
    if (question.questionType === 'FILL_IN_THE_BLANKS' || question.questionType === 'RICH_BLANKS') {
      for (const [blankName, options] of Object.entries(question.blanks)) {
        const optionsArr: any = options;
        form.addControl(blankName, this.fb.group({
          options: this.fb.array(optionsArr.map(a => this.newOption(a))),
          selectedOption: this.fb.control({
            name: '---',
            isCorrect: false,
          })
        }));
      }
    }
    return form;
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
    return statusValue.value;
  }

  singleCorrectOptionSetRadio(quesIndex, optionIndex): void {
    const optionsArr = (this.getOptions(quesIndex) as FormArray);
    optionsArr.value.map(d => d.attemptedOption = false);
    optionsArr.at(optionIndex).patchValue({
      attemptedOption: true
    });
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
      'displayName': quizzer.displayName,
      'duration': quizzer.duration,
      'id': quizzer.docId,
      'totalQuestions': quizzer.questionsData.length,
      // "featured": true,
      'progress': {
        'currentStep': 1,
        'completed': 1
      },
      'questions': quizzer.questionsData.map((d, i) => (
        Object.assign({ ...d }, {
          'order': 1 + i,
        })
      )
      )
    };
  }
  closeNavigation() {
    const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>('mainNavigation');
    navigation.close();
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
    if (this.currentStep === this.quizInfo.totalSteps - 1) {
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

  onStartQuiz() {

    this.closeNavigation();
    this.isQuizStart = true;
    this.time(0);

    this.countDown = timer(0, this.tick).subscribe((count) => {
      if (this.counter == 0 && count) {
        if (this.countDown) {
          this.counter = 0;
          this.countDown.unsubscribe();
          this.goToLast();
        }
      }
      if (this.counter != 0) {
        --this.counter;
      }

    });
  }
  ngOnDestroy() {
    this.countDown = null;
  }

  goToLast() {
    this.stepper.linear = false;
    let last = this.stepper._steps.length - 1;
    if (!this.stepper) {
      // last = this.course.totalSteps - 1
      last = this.quizInfo.totalSteps - 1;
    }
    this.stepper._steps.forEach((a) => { this.stepper.next(); a.editable = false; });
    this.stepper.linear = true;

    // for mobile view navigation
    this.goToStep(last - 1);

  }

  onStepChange(event) {

    this.stepIndex = event.selectedIndex;
    this.time(this.stepIndex);
    this.pauseClick[event.previouslySelectedIndex].next('');
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
          });
        } else {
          this.stopClick[index].next('');

        }
      },
    };
    this.timer$.subscribe(this.timerObserver);

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

  onSubmit() {
    this.countDown.unsubscribe();
    this.storeToDb();
  }

  async storeToDb() {
    const teacherId = await this.userService.getUid();

    const marksObj = this.quizzerService.getTACQuesMarks(this.questionsFormGroup.value.questions);
    const finalObj = {
      ...this.questionsFormGroup.value,
      ...marksObj,
      displayName: this.quizInfo.displayName,
      totalQuestions: this.quizInfo.totalQuestions,
      id: this.quizInfo.id,
      duration: this.quizInfo.duration,
    };
    // const [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const d = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

    const obj = {
      [`batchId-${this.params.batchId}`]: {
        [`submId-${this.params.submId}`]: {
          [`assignmentId-${this.quizId}`]: finalObj
        }
      },
      createdAt: serverTimestamp(),
      submissionMeta: arrayUnion(d)
    };
    this.assignmentService.updateEventSubmission(this.params.eventId, teacherId, obj).then(() => {
      this.uiService.alertMessage('Successful', 'Quiz Submitted Successfully', 'success');
    });
  }

  toggleTabs($tabNumber: number) {
    this.openTab = $tabNumber;
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
