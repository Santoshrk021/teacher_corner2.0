import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { ChangeDetectorRef, Component, Input, HostListener, OnDestroy, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute } from '@angular/router';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { environment } from 'environments/environment';
import { first, firstValueFrom, interval, lastValueFrom, Observable, PartialObserver, Subject, Subscription, take, takeUntil, timer } from 'rxjs';
import { QuizzerService } from './quizzer.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { arrayUnion, } from '@angular/fire/firestore';
import { UiService } from 'app/shared/ui.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { UsbService } from 'app/usb.service';
import { NgZone } from '@angular/core';
import { ConfirmSubmitDialogComponent } from './confirm-submit-dialog/confirm-submit-dialog.component'; // correct path
import { MatDialog } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UserFirestore } from 'app/core/user/user.firestore';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import { QuizAttempt, QuizAttemptService } from './quiz-attempt.service';
(pdfMake as any).vfs = (pdfFonts as any).vfs;
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { KitSelectDialogComponent, KitSelectDialogResult } from './kit-select-dialog/kit-select-dialog.component';
import { StudentMappingDialogComponent, StudentMappingDialogResult, StudentRemoteMapping } from './student-mapping-dialog/student-mapping-dialog.component';
import { KitService } from 'app/modules/admin/kit/kit.service';
import { Kit } from 'app/modules/admin/kit/kit.interface';
import { RemoteSetupDialogComponent, RemoteSetupDialogResult } from './remote-setup-dialog/remote-setup-dialog.component';
import { RemoteReassignDialogComponent, RemoteReassignDialogResult, RemoteReassignTarget } from './remote-reassign-dialog/remote-reassign-dialog.component';
import firebase from 'firebase/compat/app';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CaseStudyDialogComponent } from './case-study-dialog/case-study-dialog.component';
import { MatDialogRef } from '@angular/material/dialog';
import { RemoteEventsService, RemoteEvent } from 'app/shared/remote-events.service';

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
export class QuizComponent implements OnInit, OnDestroy {
  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;
  @ViewChild('stepper') stepper: MatStepper;
  @ViewChild('innerStepper') innerStepper: MatStepper;
  @ViewChild('startModeDialog') startModeDialog: TemplateRef<any>;

  @Input() workflowId: any;
  @Input() quizId;
  @Input() contentInfo: any;
  @Input() parent: any;
  @Input() currentWorkflow;

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  progressNum = 0;
  running;
  isAssignmentUi = true;

  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  currentStep: number = 0;
  isQuizStart: boolean = false;
  stepIndex = 0;
  timeTaken = {};
  countDown: Subscription;
  counter: number = 0;
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
  environment = environment;
  currentTeacher: any;
  previousAttempts: number = 0;
  isExceededAttempts: boolean = false;
  showSubmitButton: boolean = true;

  // related to remote connect
  teacherMac: string | null = null;
  selectedMac: string | null = null;
  isSubmitting = false;
  remoteSelections: { [mac: string]: { [qIndex: number]: Set<number> } } = {};
  manualSelections: { [qIndex: number]: Set<number> } = {};
  connected = false;
  remotes: { mac: string; value: number; time: Date }[] = [];
  studentAnswers: {
    [mac: string]: {
      [qIndex: number]: number[]; // array of selected option indexes
    }
  } = {};

  studentScores: {
    [mac: string]: number;
  } = {};

  liveResults: {
    mac: string;
    name: string;
    questionIndex: number;
    selectedOptions: number[];
    score: number;
  }[] = [];
  macNameMap: { [mac: string]: string } = {};
  hasSubmittedResults = false;
  batchNumber: number = 0;
  registeredCount: number = 0;
  currentQuestionResponses: Set<string> = new Set(); // MACs who have answered current question

  isStartingRemote = false;
  isRemoteInput = false;
  remoteQuestionResponses: {
    [questionIndex: number]: {
      [mac: string]: number[];
    };
  } = {};
  // Remote sub-part answers: questionIndex -> subPartIndex -> mac -> selected option indexes
  remoteSubPartResponses: {
    [questionIndex: number]: {
      [subPartIndex: number]: {
        [mac: string]: number[];
      };
    };
  } = {};
  completedSteps: Set<number> = new Set();
  isGracePeriod: boolean = false;
  graceCounter: number = 0;
  graceTime: number = 30; // 10 seconds grace time
  isTimerPaused: boolean = false;
  zoomLevels: { [key: string]: number } = {};
  focusedOptionIndex: { [questionIndex: number]: number } = {};
  sortedRemoteMappings: { mac: any; studentDocId: string; accessCode: string; }[];
  numberBoxes: { mac: string; macKey?: string; studentDocId: string; accessCode: string; studentName?: string; }[] = [];
  showResponseTracker = false;
  quizStartMode: 'manual' | 'remote' = 'manual';
  questionZoomLevels: { [index: number]: number } = {};
  focusedQuestion: Set<number> = new Set();
  questionZoomActive: { [questionIndex: number]: boolean } = {};
  studentPerformanceTable: { name: string; percentage: number }[] = [];
  questionWiseStats: { question: string; correctCount: number; percentage: string }[] = [];
  attempt!: QuizAttempt;
  private _teardown = new Subscription();
  private _navGuard = false;
  isStarting = false;
  focusedTargetIndex: number[] = [];
  overlayActive = false;
  private _lastRemote = { mac: '', value: -1, ts: 0 };
  showStepperLabels = false;
  private _hideLabelsTimeout: any;
  learningUnits;
  selectedKit: Kit | null = null;
  studentMappings: StudentRemoteMapping[] = [];
  allowedMacs: Set<string> = new Set(); // Only these MACs are allowed to respond

  //CASE STUDY PROPERTIES
  showCaseStudy = false;
  hasCaseStudy = false;
  caseStudyTitle = '';
  caseStudyHtmlSafe: SafeHtml = '';
  private wasTimerPausedBeforeDialog = false;

  // SUB-PARTS PROPERTIES
  activeSubPartIndex: { [questionIndex: number]: number } = {};

  //TEXT ANSWER (Quill) PROPERTIES
  textAnswerQuillModules = {
    toolbar: false
  };
  textCharCounts: { [questionIndex: number]: number } = {};

  // Firestore fallback for remote events
  private usbSignalSub?: Subscription;
  private firestoreFallbackSub?: Subscription;
  private processedFallbackMacs = new Set<string>();
  private firestoreListenStartTime = 0; // Timestamp when Firestore listening started - ignore events before this
  eventSource: 'USB' | 'FIRESTORE' | 'NONE' = 'NONE';

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private _fuseNavigationService: FuseNavigationService,
    private assignmentService: AssignmentsService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private quizzerService: QuizzerService,
    private deviceInfoService: DeviceInfoService,
    private uiService: UiService,
    private afAuth: AngularFireAuth,
    private teacherService: TeacherService,
    private workFlowCompletionService: WorkflowCompletionService,
    private usbService: UsbService,
    private zone: NgZone,
    private dialog: MatDialog,
    private afs: AngularFirestore,
    private userFirestoreSerivce: UserFirestore,
    private studentService: StudentsService,
    private drawerService: FuseDrawerService,
    private attempts: QuizAttemptService,
    private institutionService: InstitutionsService,
    private classroomService: ClassroomsService,
    private kitService: KitService,
    private sanitizer: DomSanitizer,
    private remoteEventsService: RemoteEventsService
  ) {
    this.questionsFormGroup = this.fb.group({
      questions: this.fb.array([])
    });

    this.questionsFormGroup.get('questions').valueChanges.subscribe(() => {
      // console.log(this.questionsFormGroup.getRawValue()['questions']);
    });
  }

  @HostListener('window:mousemove', ['$event'])
  onWindowMouseMove(e: MouseEvent) {
    // Only when using remotes and quiz screen is active
    if (!this.isRemoteInput || !this.isQuizStart) return;

    const topRevealPx = 80;                     // reveal when near top
    const halfScreenY = window.innerHeight / 2; // hide when below half screen

    // If header itself is hovered, never hide (lets you click)
    const headerHovered = !!document.querySelector('.mat-horizontal-stepper-header-container:hover');

    this.zone.run(() => {
      // 1) Reveal while in top zone
      if (e.clientY <= topRevealPx) {
        clearTimeout(this._hideLabelsTimeout);
        if (!this.showStepperLabels) {
          this.showStepperLabels = true;
          this._changeDetectorRef.markForCheck();
        }
        return;
      }

      // 2) Hide when mouse goes below half of the viewport (unless header is hovered)
      if (e.clientY >= halfScreenY && !headerHovered) {
        // a tiny delay prevents flicker when crossing the threshold quickly
        clearTimeout(this._hideLabelsTimeout);
        this._hideLabelsTimeout = setTimeout(() => {
          if (!document.querySelector('.mat-horizontal-stepper-header-container:hover')) {
            this.showStepperLabels = false;
            this._changeDetectorRef.markForCheck();
          }
        }, 120);
        return;
      }

      // 3) Otherwise, keep whatever state it is currently in (no change)
    });
  }

  private async ensureFormReady(): Promise<void> {
    await new Promise(r => setTimeout(r)); // wait 1 macrotask so form/stepper exist
  }
  onDestroy() {
    this.drawerService.setQuizStarted(false);
    this.exitFullscreen();
  }

  async ngOnInit() {
    // if(this.data.parent === 'table') {
    //   this.quizId = this.data.quizInfo.docId;
    // }
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentTeacher = await lastValueFrom(this.teacherService.getTeacherByIdOnce(user?.uid));
    this.currentTeacher = currentTeacher.data();

    const teacherDoc = await lastValueFrom(this.userFirestoreSerivce.doc$(user?.uid).pipe(first()));
    this.learningUnits = teacherDoc?.currentTeacherInfo

    if (this.parent === 'AssignmentSubmitComponent') {
      document.documentElement.style.setProperty('--stepper-bg-color', '#F1F5F9');
    } else {
      document.documentElement.style.setProperty('--stepper-bg-color', '#EFEFF2');
    }
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

    const teacherSubmissions = this.assignmentService.existingAssignment ?
      this.assignmentService.existingAssignment :
      await this.getExistingAssignments(this.currentTeacher.docId, this.params.classroomId, this.params.programmeId);

    if (teacherSubmissions && Object.keys(teacherSubmissions).length) {
      if (this.workflowId !== undefined) {
        this.getAttemptsNumber(teacherSubmissions, this.workflowId);
      }
      else {
        this.getAttemptsNumber(teacherSubmissions);
      }
    }

    const hours = this.quizInfo?.totalDurationInHours * 60 * 60;
    const minutes = this.quizInfo?.totalDurationInMinutes * 60;
    const seconds = this.quizInfo?.totalDurationInSeconds;
    this.counter = hours + minutes + seconds;

    await this.ensureFormReady();

    const userId = user?.uid ?? 'anonymous';
    const workflowId = this.workflowId ?? this.params?.workflowId ?? 'unknown';
    const classroomId = this.params?.classroomId ?? this.currentWorkflow?.classroomId ?? 'unknown';
    const quizId = this.quizId;

    // from this line below ARE related to offline mode code
    this.attempt = await this.attempts.loadOrStart({ userId, workflowId, classroomId, quizId });

    this.restoreFormFromAttempt(this.attempt);

    if (this.attempt?.isSubmitted) {
      this.hasSubmittedResults = true;        // show the UI block
      this.generateLiveResults();             // rebuild stats from restored studentAnswers
    }

    // keep currentIndex in sync
    this._teardown.add(
      this.innerStepper.selectionChange.subscribe(ev => this.attempts.jumpTo(ev.selectedIndex))
    );

    window.addEventListener('beforeunload', this._beforeUnloadHandler);
    await this.loadRemoteMappingsFromFirestore();

    this.usbService.remoteSignal$.subscribe(({ MAC, value }) => {
      if (this.blockRapid(MAC, value)) return;
      console.warn(`📡 Remote received: MAC=${MAC}, value=${value}`);
      this.zone.run(() => {
        const selectedIndex = this.innerStepper?.selectedIndex ?? 0;
        const finalStepIndex = this.innerStepper?.steps?.length - 1;
        const lastQuestionStepIndex = finalStepIndex - 1;

        const normalizedMac = this.normalizeMac(MAC);
        this.selectedMac = normalizedMac;

        // ⬇️ Check if remote MAC is valid
        // First check allowedMacs (from student mapping dialog) if it's populated
        if (this.allowedMacs.size > 0) {
          if (!this.allowedMacs.has(normalizedMac)) {
            console.warn(`🚫 MAC not in allowed list: ${MAC}`);
            return; // Ignore MAC not in allowed list
          }
        }

        const isKnownTeacher = normalizedMac === this.normalizeMac(this.teacherMac);
        const isKnownStudent = Object.keys(this.macNameMap).some(m => this.normalizeMac(m) === normalizedMac);

        if (!isKnownTeacher && !isKnownStudent) {
          console.warn(`🚫 Unknown MAC address received: ${MAC}`);
          return; // Ignore unknown MAC
        }

        // ✅ Handle option selection (only for student remotes)
        if (!isKnownTeacher && selectedIndex < this.questions.length && value >= 1 && value <= 4) {
          const hasSubParts = this.hasSubPartsEnabled(selectedIndex);

          if (hasSubParts) {
            // Question has sub-parts - route to sub-part option selection
            const currentSubPartIndex = this.activeSubPartIndex[selectedIndex] ?? 0;
            this.onSubPartOptionSelectedRemote(selectedIndex, currentSubPartIndex, value - 1);
          } else {
            // Regular question without sub-parts
            const isSingle = this.getOneCorrectOption(selectedIndex);
            // This updates studentAnswers + remoteQuestionResponses with 0-based indices
            this.onOptionSelected(selectedIndex, value - 1, isSingle, true);
          }

          if (!this.currentQuestionResponses.has(normalizedMac)) {
            this.currentQuestionResponses.add(normalizedMac);
          }

          // ✅ Persist remote state after each press
          this.attempts.savePartial({
            remoteQuestionResponses: this.remoteQuestionResponses,
            remoteSubPartResponses: this.remoteSubPartResponses,
            studentAnswers: this.studentAnswers,
          });

          this._changeDetectorRef.detectChanges();
        }

        if (isKnownTeacher) {

          // Pause timer (value 2)
          if (value === 2) {
            this.isTimerPaused = true;
            this.uiService.alertMessage('info', '⏸ Timer paused by teacher remote', 'info');
            return;
          }

          // Resume timer (value 3)
          if (value === 3) {
            this.isTimerPaused = false;
            this.uiService.alertMessage('info', '▶️ Timer resumed by teacher remote', 'info');
            return;
          }

          if (value === 4) {
            // zoom in current focus
            this.ensureFocusDefaults(selectedIndex);
            this.zoomCurrentTarget(selectedIndex, true);
            return;
          }

          if (value === 5) {
            // zoom out (reset) current focus
            this.ensureFocusDefaults(selectedIndex);
            this.zoomCurrentTarget(selectedIndex, false);
            return;
          }

          if (value === 6) {
            const finalStepIndex = this.innerStepper?.steps?.length - 1;

            if (selectedIndex === finalStepIndex) {
              this.drawerService.setQuizStarted(false);
              this.exitFullscreen();
              this.uiService.alertMessage('info', '⛔ Exited fullscreen from final step', 'info');
            } else {
              // ✅ Always cycle focus: Question → Opt1 → Opt2 → … → Question
              this.ensureFocusDefaults(selectedIndex);
              this.cycleFocus(selectedIndex, 1);
            }
            return;
          }


          const canNavigate = selectedIndex < this.questions.length ? this.isAnyOptionSelected(selectedIndex) : true;

          // When on the final step, use value 1 to open the confirmation dialog
          if (selectedIndex === finalStepIndex && value === 1) {
            this.onSubmit();
            return;
          }

          // Use value 7 to navigate forward (only when not on final step)
          if (value === 7 && selectedIndex <= lastQuestionStepIndex && canNavigate) {
            this.goToNextStepsForRemote();
          }

          // Use value 8 to navigate to next sub-part (only if question has sub-parts)
          if (value === 8 && selectedIndex < this.questions.length) {
            const hasSubParts = this.hasSubPartsEnabled(selectedIndex);
            if (hasSubParts) {
              const subParts = this.getSubParts(selectedIndex);
              const currentSubPartIndex = this.activeSubPartIndex[selectedIndex] ?? 0;
              if (currentSubPartIndex < subParts.length - 1) {
                this.setActiveSubPart(selectedIndex, currentSubPartIndex + 1);
              }
            }
          }
        }


        // ✅ Track all remote activity
        this.remotes.unshift({ mac: MAC, value, time: new Date() });
      });
    });

    // Auto-persist TEXT questions as the user types
    this.questions.controls.forEach((fg, idx) => {
      if (fg.get('questionType')?.value === 'TEXT') {
        const ctrl = fg.get('text');
        if (ctrl) {
          this._teardown.add(
            ctrl.valueChanges.subscribe(() => {
              const answer = this.buildAnswerFromForm(idx);
              this.attempts.recordAnswer(this.getQuestionId(idx), answer);
            })
          );
        }
      }
    });

  }

  ngAfterViewInit() {
    const idx = this.pickInitialIndex();

    Promise.resolve().then(() => {
      if (this.innerStepper) this.innerStepper.selectedIndex = idx;

      // ✅ Init focus/zoom for the *actual* starting step
      this.ensureFocusDefaults(idx);
      this.setFocusToQuestion(idx);

      this.ensureTrackerHydrated(idx);
      this._changeDetectorRef.detectChanges();
    });
  }

  async getExistingAssignments(docId: string, classroomId: string, programmeId: string) {
    const assignmentResources = await lastValueFrom(this.assignmentService.getTeachersResources({ docId, classroomId, programmeId }));
    return assignmentResources.data();
  }

  getAttemptsNumber(teacherSubmissions, workflowId?) {
    const workflowKey = `workflowId_${workflowId}`;
    const programmeKey = `programmeId_${this.params.programmeId}`;
    let assignmentKey = `assignmentId_${this.params.assignmentId}`;

    const keyToCheck = workflowId ? workflowKey : programmeKey;
    if (workflowId) {
      assignmentKey = `assignmentId_${this.quizId}`;
    }

    const attempts = teacherSubmissions?.versions?.[keyToCheck]?.[assignmentKey];
    this.previousAttempts = attempts ? Object.keys(attempts).length : 0;
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

        //Load case study content
        this.loadCaseStudyFromQuizInfo();
      }
      else {
        this.isAssignmentUi = false;
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
        optionalResource: [question?.optionalResource?.length ? question.optionalResource : []],
        hasSubParts: [question.hasSubParts || false],
        subParts: this.fb.array([]),
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
        optionalResource: [question?.optionalResource?.length ? question.optionalResource : []],
        hasSubParts: [question.hasSubParts || false],
        subParts: this.fb.array([]),
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
        optionalResource: [question?.optionalResource?.length ? question.optionalResource : []],
        hasSubParts: [question.hasSubParts || false],
        subParts: this.fb.array([]),
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
        optionalResource: [question?.optionalResource?.length ? question.optionalResource : []],
        hasSubParts: [question.hasSubParts || false],
        subParts: this.fb.array([]),
      });
    }

    // Assign options for MCQ questions
    const optionArr = form?.get('options') as FormArray;
    if (question?.options && optionArr) {
      question.options.forEach((res) => {
        optionArr.push(this.newOption(res));
      });
    }

    // Assign blanks for FILL_IN_THE_BLANKS and RICH_BLANKS questions
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

    // Load existing sub-parts if any
    const subPartsArr = form?.get('subParts') as FormArray;
    if (question?.subParts && question.subParts.length > 0 && subPartsArr) {
      question.subParts.forEach((subPart: any) => {
        subPartsArr.push(this.newSubPart(subPart));
      });
      this.activeSubPartIndex[index] = 0;
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
      optionType: this.fb.control(content?.optionType || 'TEXT'),
      name: this.fb.control(content?.name || '', []),
      imagePath: this.fb.control(content?.imagePath || '', []),
      isCorrect: this.fb.control(content?.isCorrect || false, [Validators.required]),
      attemptedOption: this.fb.control(content?.attemptedOption || false), // <-- Add this line
    });
  }

  getOptions(questionIndex: number): FormArray {

    const questionsFormArray = this.questionsFormGroup.get('questions') as FormArray;
    if (!questionsFormArray || !questionsFormArray.at(questionIndex)) return null;

    return questionsFormArray.at(questionIndex).get('options') as FormArray;
  }

  getOneCorrectOption(quesIndex) {
    const statusValue = (this.questions as FormArray)
      .at(quesIndex).get('oneCorrectOption');
    return statusValue.value;
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
      totalDurationInHours: quizzer.totalDurationInHours,
      totalDurationInMinutes: quizzer.totalDurationInMinutes,
      totalDurationInSeconds: quizzer.totalDurationInSeconds,
      id: quizzer.docId,
      totalQuestions: quizzer.questionsData.length,
      backgroundInfo: quizzer.backgroundInfo || null,  // ✅ ADD THIS
      progress: {
        currentStep: 1,
        completed: 1
      },
      questions: quizzer.questionsData.map((d, i) => (
        Object.assign({ ...d }, {
          order: 1 + i,
        })
      ))
    };
    // ... rest of the code
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

  startCountdownForCurrentStep(index: number) {
    if (this.countDown) {
      this.countDown.unsubscribe();
    }

    const currentStepper = this.innerStepper;

    // ✅ Skip countdown only on the final 'Done' step
    if (currentStepper && currentStepper.selectedIndex === currentStepper._steps.length - 1) {
      this.graceCounter = 0;
      this.counter = 0;
      this.attempts.tickTimer(0); // ← persist 0 on final step
      return;
    }

    this.isGracePeriod = false;
    this.graceCounter = 0;

    this.countDown = timer(0, this.tick).subscribe(() => {
      if (this.isTimerPaused) {
        // Optional: still persist current value while paused
        this.attempts.tickTimer(this.getDisplayTime());
        return;
      }

      if (this.counter > 0) {
        this.counter--;
      } else if (!this.isGracePeriod) {
        this.isGracePeriod = true;
        this.graceCounter = this.graceTime;
      } else if (this.graceCounter > 0) {
        this.graceCounter--;
      } else {
        // ⏰ Time up for this question
        this.attempts.tickTimer(0); // ← persist 0 before moving ahead
        this.countDown?.unsubscribe();
        this.isGracePeriod = false;

        if (currentStepper?.selectedIndex < currentStepper?._steps?.length - 1) {
          currentStepper.linear = false;
          currentStepper.next();
          currentStepper.linear = true;
          const nextIndex = currentStepper?.selectedIndex || 0;
          this.startCountdownForCurrentStep(nextIndex);
        }
        return;
      }

      // ✅ Persist the new time AFTER updating counters for this tick
      this.attempts.tickTimer(this.getDisplayTime());
    });
  }

  async onStartQuiz() {
    if (this.isStarting) return;
    this.isStarting = true;

    try {
      await this.startQuizCore();
    } finally {
      this.isStarting = false;
    }
  }

  openStartModeDialog(): void {
    this.dialog.open(this.startModeDialog, {
      width: '420px',
      disableClose: true
    });
  }

  closeStartModeDialog(): void {
    this.dialog.closeAll();
  }

  startQuizManual(): void {
    this.quizStartMode = 'manual';
    this.isRemoteInput = false;
    this.showResponseTracker = false;
    this.isStartingRemote = false;
    this.closeStartModeDialog();

    // Check for case study before starting quiz
    this.enterQuizShell();

    if (this.hasCaseStudy) {
      this.showCaseStudy = true;
      this._changeDetectorRef.detectChanges();
      return;
    }

    // No case study, start directly
    this.startQuizCore();
  }

  async startQuizRemote(): Promise<void> {
    if (this.isStartingRemote) return;
    this.isStartingRemote = true;
    this._changeDetectorRef.detectChanges();

    await Promise.resolve();

    const institutionId = this.params?.institutionId || this.currentWorkflow?.institutionId;
    const classroomId = this.params?.classroomId || this.currentWorkflow?.classroomId;

    try {
      if (!institutionId || !classroomId) {
        this.uiService.alertMessage('Error', 'Missing classroomId or institutionId', 'error');
        return;
      }

      const mapping = await this.loadLatestMappingForRemoteStart(classroomId);
      const kitDocIdFromMapping = mapping?.kitDocId ?? null;
      const skipKey = this.getRemoteSetupDoneKey(classroomId, kitDocIdFromMapping);
      const canSkip = !!mapping && this.getSessionFlag(skipKey);

      if (canSkip) {
        this.uiService.alertMessage('Info', 'Remote check already completed. Starting quiz...', 'info');
        // For skip case, auto-detect event source based on USB connection
        const skipEventSource: 'USB' | 'FIRESTORE' = this.usbService.isConnected ? 'USB' : 'FIRESTORE';
        this.applyRemoteStartMapping(mapping.teacherMac, mapping.mappings, mapping.kitDocId, skipEventSource);
        this.closeStartModeDialog();

        //Check for case study
        this.enterQuizShell();
        if (this.hasCaseStudy) {
          this.showCaseStudy = true;
          this._changeDetectorRef.detectChanges();
          return;
        }
        await this.startQuizCore();
        return;
      }

      const ref = this.dialog.open(RemoteSetupDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        disableClose: true,
        data: { institutionId, classroomId }
      });

      const result: RemoteSetupDialogResult = await lastValueFrom(ref.afterClosed());
      if (!result || !result.started) return;

      const skipKeyAfter = this.getRemoteSetupDoneKey(classroomId, result.kitDocId ?? null);
      this.setSessionFlag(skipKeyAfter, true);

      this.applyRemoteStartMapping(result.teacherMac || null, result.mappings || [], result.kitDocId ?? null, result.eventSource);
      this.closeStartModeDialog();

      // Check for case study after remote setup
      this.enterQuizShell();
      if (this.hasCaseStudy) {
        this.showCaseStudy = true;
        this._changeDetectorRef.detectChanges();
        return;
      }
      await this.startQuizCore();

    } finally {
      this.isStartingRemote = false;
      this._changeDetectorRef.detectChanges();
    }
  }

  private getRemoteSetupDoneKey(classroomId: string, kitDocId: string | null): string {
    const c = classroomId || 'unknown';
    const k = kitDocId || 'unknown';
    return `quiz_remote_setup_done_${c}_${k}`;
  }

  private getSessionFlag(key: string): boolean {
    try {
      return sessionStorage.getItem(key) === 'false';
    } catch {
      return false;
    }
  }

  private setSessionFlag(key: string, value: boolean): void {
    try {
      if (value) sessionStorage.setItem(key, 'true');
      else sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }

  private clearRemoteSetupDoneFlag(): void {
    const classroomId = this.params?.classroomId || this.currentWorkflow?.classroomId;
    const kitDocId = this.selectedKit?.docId;
    if (!classroomId || !kitDocId) return;
    const key = this.getRemoteSetupDoneKey(classroomId, kitDocId);
    this.setSessionFlag(key, false);
  }

  private applyRemoteStartMapping(teacherMac: string | null, mappings: StudentRemoteMapping[], kitDocId: string | null, eventSource?: 'USB' | 'FIRESTORE'): void {
    this.quizStartMode = 'remote';
    this.isRemoteInput = true;
    this.showResponseTracker = true;

    // Start listening based on the eventSource selected in the setup dialog
    if (eventSource === 'USB') {
      this.startUsbListening();
    } else if (eventSource === 'FIRESTORE') {
      this.startFirestoreFallbackListening();
    }
    // If no eventSource provided (legacy call), do nothing - let existing logic handle it

    // Only update teacherMac if provided, otherwise keep existing
    if (teacherMac) {
      this.teacherMac = teacherMac;
    }

    // Check if we have new mappings to apply
    const hasNewMappings = mappings && mappings.length > 0;
    // Check if we already have existing mappings (from loadRemoteMappingsFromFirestore)
    const hasExistingMappings = this.sortedRemoteMappings?.length > 0 || Object.keys(this.macNameMap).length > 0;

    console.log(`🔧 applyRemoteStartMapping: hasNewMappings=${hasNewMappings}, hasExistingMappings=${hasExistingMappings}, incoming mappings=${mappings?.length}`);

    if (hasNewMappings) {
      // Apply new mappings
      this.studentMappings = mappings;

      console.log(`🔧 Student mappings received:`, JSON.stringify(mappings.map(m => ({ mac: m.mac, studentDocId: m.studentDocId, accessCode: m.accessCode }))));

      this.allowedMacs = new Set<string>(
        (this.studentMappings || [])
          .map(m => this.normalizeMac(m.mac))
          .filter(m => !!m)
      );

      this.macNameMap = {};
      for (const m of this.studentMappings) {
        if (!m?.mac || !m?.studentDocId) {
          console.warn(`🔧 Skipping mapping with missing mac or studentDocId:`, m);
          continue;
        }
        const normalizedMac = this.normalizeMac(m.mac);
        this.macNameMap[normalizedMac] = m.studentDocId;
        console.log(`🔧 Added to macNameMap: ${normalizedMac} -> ${m.studentDocId}`);
      }

      console.log(`🔧 Final macNameMap:`, this.macNameMap);
      console.log(`🔧 Final allowedMacs:`, Array.from(this.allowedMacs));

      this.sortedRemoteMappings = (this.studentMappings || []).map(m => ({
        mac: m.mac,
        studentDocId: m.studentDocId,
        accessCode: m.accessCode,
      }));
    }
    // If no new mappings but we have existing ones, keep them (don't clear)

    if (kitDocId) {
      this.selectedKit = { ...(this.selectedKit || {} as any), docId: kitDocId } as any;
    }

    // Always ensure teacher MAC is in allowed list
    const teacherNormMac = this.normalizeMac(this.teacherMac || '');
    if (teacherNormMac && !this.allowedMacs.has(teacherNormMac)) {
      this.allowedMacs.add(teacherNormMac);
    }

    // Generate boxes - will preserve existing if no new ones
    this.generateBoxesAutomatically();
  }

  private async loadLatestMappingForRemoteStart(classroomId: string): Promise<{ teacherMac: string | null; mappings: StudentRemoteMapping[]; kitDocId: string | null } | null> {
    try {
      const directSnap = await this.afs.collection('Mapping').doc(classroomId).ref.get();
      const data = directSnap.exists ? (directSnap.data() as any) : null;
      if (!data) return null;

      const teacherRemote = Array.isArray(data?.teacherRemote) ? data.teacherRemote : [];
      const lastTeacher = teacherRemote.length ? teacherRemote[teacherRemote.length - 1] : null;
      const teacherMac = this.normalizeMac(lastTeacher?.macid ?? lastTeacher) || null;

      const kitDocId = data?.kitDocId ?? null;

      const studentRemotesMap = data?.studentRemotes || {};
      const studentEntries: StudentRemoteMapping[] = Object.values(studentRemotesMap).map((entry: any) => {
        const lastMac = this.getLatestStudentMac(entry?.remoteUsed);
        return {
          studentDocId: entry?.studentDocId || entry?.docId || '',
          studentName: entry?.accessCode || '',
          accessCode: entry?.accessCode || '',
          mac: lastMac,
          slotNumber: entry?.slotNumber || 0,
        };
      }).filter((x: any) => !!x.studentDocId);

      studentEntries.sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

      return {
        teacherMac,
        mappings: studentEntries,
        kitDocId,
      };
    } catch {
      return null;
    }
  }

  private getLatestStudentMac(remoteUsedRaw: any): string {
    if (!remoteUsedRaw) return '';
    if (Array.isArray(remoteUsedRaw)) {
      const last = remoteUsedRaw.length ? remoteUsedRaw[remoteUsedRaw.length - 1] : '';
      return this.normalizeMac(last?.macid ?? last);
    }
    if (typeof remoteUsedRaw === 'object') {
      let bestMac = '';
      let bestIndex = -1;
      Object.keys(remoteUsedRaw).forEach((k) => {
        const mac = this.normalizeMac(k);
        if (!mac) return;
        const v = remoteUsedRaw[k];
        const idx = typeof v?.index === 'number' ? v.index : 0;
        if (idx > bestIndex) {
          bestIndex = idx;
          bestMac = mac;
        }
      });
      return bestMac;
    }
    return '';
  }

  async openReassignStudent(student: { mac: string; studentDocId: string; accessCode: string; macKey?: string }): Promise<void> {
    const classroomId = this.params?.classroomId || this.currentWorkflow?.classroomId;
    const kitDocId = (this.selectedKit?.docId as any) || null;

    if (!classroomId) {
      this.uiService.alertMessage('Error', 'Missing classroomId', 'error');
      return;
    }
    let resolvedKitDocId: string | null = kitDocId;
    if (!resolvedKitDocId) {
      try {
        const mapping = await this.loadLatestMappingForRemoteStart(classroomId);
        resolvedKitDocId = mapping?.kitDocId ?? null;
        if (resolvedKitDocId) {
          this.selectedKit = { ...(this.selectedKit || {} as any), docId: resolvedKitDocId } as any;
        }
      } catch {
        resolvedKitDocId = null;
      }
    }
    if (!resolvedKitDocId) {
      this.uiService.alertMessage('Error', 'Missing kit information for reassignment', 'error');
      return;
    }

    const prevPaused = this.isTimerPaused;
    this.isTimerPaused = true;

    try {
      const usedMacs = [
        ...(Array.from(this.allowedMacs || []) as string[]),
      ];

      const target: RemoteReassignTarget = {
        kind: 'student',
        studentDocId: student.studentDocId,
        accessCode: student.accessCode,
        slotNumber: (this.studentMappings || []).find(m => m.studentDocId === student.studentDocId)?.slotNumber || 0,
        currentMac: this.normalizeMac(student.mac),
      };

      const ref = this.dialog.open(RemoteReassignDialogComponent, {
        width: '650px',
        maxWidth: '95vw',
        disableClose: true,
        data: {
          kitDocId: resolvedKitDocId,
          usedMacs,
          target
        }
      });

      const result: RemoteReassignDialogResult = await lastValueFrom(ref.afterClosed());
      if (!result || !result.saved) return;

      // Track old remote as not-working
      try {
        const oldMac = student.mac;
        if (oldMac) {
          const kit = await this.kitService.getKitByIdentifierOnce(resolvedKitDocId);
          if (!kit) {
            console.log('❌ Inactive remote not saved: kit not found', { resolvedKitDocId });
            throw new Error('Kit not found');
          }
          const oldHex = this.normalizeMac(oldMac);
          const findSlot = (arr: any[], role: 'teacher' | 'student' | 'spare') => {
            const found = (arr || []).find((r: any) => this.normalizeMac(r?.mac) === oldHex);
            return found ? { role, slotNumber: Number(found?.slotNumber || 0) } : null;
          };

          const hit =
            findSlot((kit as any)?.teacherRemotes || [], 'teacher') ||
            findSlot((kit as any)?.studentRemotes || [], 'student') ||
            findSlot((kit as any)?.spareRemotes || [], 'spare');

          if (hit?.slotNumber) {
            await this.kitService.addNotWorkingRemoteEntry(resolvedKitDocId, {
              mac: oldMac,
              role: hit.role,
              slotNumber: hit.slotNumber,
            });

            console.log('✅ Saved inactive remote to Kit.notWorkingRemoteEntries', {
              kitDocId: resolvedKitDocId,
              mac: oldMac,
              role: hit.role,
              slotNumber: hit.slotNumber,
            });
          } else {
            console.log('❌ Inactive remote not saved: old MAC not found in kit remotes', { resolvedKitDocId, oldMac });
          }
        } else {
          console.log('❌ Inactive remote not saved: missing oldMac', { student });
        }
      } catch (e) {
        console.log('❌ Error while saving inactive remote', e);
      }

      await this.applyStudentReassignment(classroomId, result.target as any, result.newMac);
    } finally {
      this.isTimerPaused = prevPaused;
      this._changeDetectorRef.detectChanges();
    }
  }

  async openReassignTeacher(): Promise<void> {
    const classroomId = this.params?.classroomId || this.currentWorkflow?.classroomId;
    const kitDocId = (this.selectedKit?.docId as any) || null;

    if (!classroomId) {
      this.uiService.alertMessage('Error', 'Missing classroomId', 'error');
      return;
    }

    let resolvedKitDocId: string | null = kitDocId;
    if (!resolvedKitDocId) {
      try {
        const mapping = await this.loadLatestMappingForRemoteStart(classroomId);
        resolvedKitDocId = mapping?.kitDocId ?? null;
        if (resolvedKitDocId) {
          this.selectedKit = { ...(this.selectedKit || {} as any), docId: resolvedKitDocId } as any;
        }
      } catch {
        resolvedKitDocId = null;
      }
    }
    if (!resolvedKitDocId) {
      this.uiService.alertMessage('Error', 'Missing kit information for reassignment', 'error');
      return;
    }

    const currentTeacherMac = this.normalizeMac(this.teacherMac || '');
    if (!currentTeacherMac) {
      this.uiService.alertMessage('Error', 'Teacher remote not set', 'error');
      return;
    }

    const prevPaused = this.isTimerPaused;
    this.isTimerPaused = true;

    try {
      const usedMacs = [
        ...(Array.from(this.allowedMacs || []) as string[]),
      ];

      const target: RemoteReassignTarget = {
        kind: 'teacher',
        currentMac: currentTeacherMac,
      };

      const ref = this.dialog.open(RemoteReassignDialogComponent, {
        width: '650px',
        maxWidth: '95vw',
        disableClose: true,
        data: {
          kitDocId: resolvedKitDocId,
          usedMacs,
          target
        }
      });

      const result: RemoteReassignDialogResult = await lastValueFrom(ref.afterClosed());
      if (!result || !result.saved) return;

      // Track old teacher remote as not-working
      try {
        const oldMac = this.teacherMac;
        if (oldMac) {
          const kit = await this.kitService.getKitByIdentifierOnce(resolvedKitDocId);
          if (!kit) {
            console.log('❌ Inactive teacher remote not saved: kit not found', { resolvedKitDocId });
            throw new Error('Kit not found');
          }
          const oldHex = this.normalizeMac(oldMac);
          const found = ((kit as any)?.teacherRemotes || []).find((r: any) => this.normalizeMac(r?.mac) === oldHex);
          const slotNumber = Number(found?.slotNumber || 1);
          await this.kitService.addNotWorkingRemoteEntry(resolvedKitDocId, {
            mac: oldMac,
            role: 'teacher',
            slotNumber,
          });

          console.log('✅ Saved inactive teacher remote to Kit.notWorkingRemoteEntries', {
            kitDocId: resolvedKitDocId,
            mac: oldMac,
            role: 'teacher',
            slotNumber,
          });
        } else {
          console.log('❌ Inactive teacher remote not saved: missing oldMac');
        }
      } catch (e) {
        console.log('❌ Error while saving inactive teacher remote', e);
      }

      await this.applyTeacherReassignment(classroomId, result.newMac);
    } finally {
      this.isTimerPaused = prevPaused;
      this._changeDetectorRef.detectChanges();
    }
  }

  private async applyStudentReassignment(
    classroomId: string,
    target: { studentDocId: string; accessCode: string; slotNumber: number; currentMac: string },
    newMac: string,
  ): Promise<void> {
    const studentDocId = target.studentDocId;
    const oldMac = this.normalizeMac(target.currentMac);
    const nextMac = this.normalizeMac(newMac);
    if (!studentDocId || !nextMac) return;

    const docRef = this.afs.collection('Mapping').doc(classroomId).ref;

    await this.afs.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) throw new Error('Mapping not found');
      const data = (snap.data() || {}) as any;

      const studentRemotes = data.studentRemotes || {};
      const existing = studentRemotes[studentDocId] || {};

      const remoteUsedRaw = existing.remoteUsed;
      const remoteUsedMap: Record<string, any> = {};
      let maxIndex = 0;

      if (Array.isArray(remoteUsedRaw)) {
        remoteUsedRaw.forEach((m: any, i: number) => {
          const macid = this.normalizeMac(m?.macid ?? m);
          if (!macid) return;
          const idx = typeof m?.index === 'number' ? m.index : (i + 1);
          const existingEntry = remoteUsedMap[macid];
          if (!existingEntry || idx >= (existingEntry.index || 0)) {
            remoteUsedMap[macid] = {
              index: idx,
              reAssignedTime: m?.reAssignedTime ?? null,
            };
          }
          if (idx > maxIndex) maxIndex = idx;
        });
      } else if (remoteUsedRaw && typeof remoteUsedRaw === 'object') {
        Object.keys(remoteUsedRaw).forEach((k) => {
          const macid = this.normalizeMac(k);
          if (!macid) return;
          const v = remoteUsedRaw[k];
          const idx = typeof v?.index === 'number' ? v.index : 0;
          const existingEntry = remoteUsedMap[macid];
          if (!existingEntry || idx >= (existingEntry.index || 0)) {
            remoteUsedMap[macid] = {
              index: idx,
              reAssignedTime: v?.reAssignedTime ?? null,
            };
          }
          if (idx > maxIndex) maxIndex = idx;
        });
      }

      const nextIndex = maxIndex + 1;
      remoteUsedMap[nextMac] = {
        index: nextIndex,
        reAssignedTime: firebase.firestore.FieldValue.serverTimestamp(),
      };

      // IMPORTANT: overwrite the remoteUsed map to avoid keeping older keys like "cf:2f:..." alongside "cf2f..."
      // Firestore "set(..., {merge:true})" deep-merges maps and will not remove old keys.
      tx.update(docRef, {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        [`studentRemotes.${studentDocId}.docId`]: studentDocId,
        [`studentRemotes.${studentDocId}.studentDocId`]: studentDocId,
        [`studentRemotes.${studentDocId}.accessCode`]: existing.accessCode ?? target.accessCode,
        [`studentRemotes.${studentDocId}.slotNumber`]: existing.slotNumber ?? target.slotNumber,
        [`studentRemotes.${studentDocId}.remoteUsed`]: remoteUsedMap,
      } as any);
    });

    // Update in-memory mappings
    const mIdx = (this.studentMappings || []).findIndex(m => m.studentDocId === studentDocId);
    if (mIdx >= 0) {
      this.studentMappings[mIdx] = { ...this.studentMappings[mIdx], mac: nextMac };
    }

    // Remove old MAC from allowed set, allow new MAC
    if (oldMac) {
      this.allowedMacs.delete(oldMac);
    }
    this.allowedMacs.add(nextMac);

    // Preserve macNameMap history, but add new MAC mapping
    this.macNameMap[nextMac] = studentDocId;

    // Update tracker list
    this.sortedRemoteMappings = (this.sortedRemoteMappings || []).map(s =>
      s.studentDocId === studentDocId ? { ...s, mac: nextMac } : s
    );
    this.generateBoxesAutomatically();

    // ensure old MAC isn't shown as responded anymore
    if (oldMac) this.currentQuestionResponses.delete(oldMac);
    this.currentQuestionResponses.delete(nextMac);
    this.registeredCount = this.currentQuestionResponses.size;
    this.recomputeTrackerVisibility();

    this.uiService.alertMessage('Success', 'Remote reassigned', 'success');
  }

  private async applyTeacherReassignment(classroomId: string, newMac: string): Promise<void> {
    const oldMac = this.normalizeMac(this.teacherMac || '');
    const nextMac = this.normalizeMac(newMac);
    if (!nextMac) return;

    const docRef = this.afs.collection('Mapping').doc(classroomId).ref;

    await this.afs.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) throw new Error('Mapping not found');
      const data = (snap.data() || {}) as any;
      const teacherRemoteRaw = Array.isArray(data.teacherRemote) ? data.teacherRemote : [];

      const normalized = teacherRemoteRaw
        .map((m: any, i: number) => {
          const macid = this.normalizeMac(m?.macid ?? m);
          if (!macid) return null;
          return {
            macid,
            role: 'teacher',
            reAssignedTime: m?.reAssignedTime ?? null,
            index: typeof m?.index === 'number' ? m.index : (i + 1),
          };
        })
        .filter(Boolean) as any[];

      const nextIndex = normalized.length + 1;
      normalized.push({
        macid: nextMac,
        role: 'teacher',
        reAssignedTime: firebase.firestore.Timestamp.fromDate(new Date()),
        index: nextIndex,
      });

      tx.set(docRef, {
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        teacherRemote: normalized,
      }, { merge: true });
    });

    this.teacherMac = nextMac;

    if (oldMac) {
      this.allowedMacs.delete(oldMac);
    }
    this.allowedMacs.add(nextMac);

    this.uiService.alertMessage('Success', 'Teacher remote reassigned', 'success');
  }

  private async startQuizCore() {
    this.closeNavigation();
    this.isQuizStart = true;
    this.drawerService.setQuizStarted(true);

    // If using Firestore fallback with valid mappings, force remote mode
    const hasFirestoreFallback = this.eventSource === 'FIRESTORE' && (this.sortedRemoteMappings?.length > 0 || this.teacherMac);
    if (hasFirestoreFallback) {
      this.quizStartMode = 'remote';
      this.isRemoteInput = true;
      this.showResponseTracker = true;
      console.log('🔄 Forcing remote mode due to Firestore fallback with valid mappings');
    } else if (this.quizStartMode === 'manual') {
      this.isRemoteInput = false;
      this.showResponseTracker = false;
    }

    // Recompute tracker visibility now that isQuizStart is true
    this.recomputeTrackerVisibility();
    this._changeDetectorRef.detectChanges();

    const q0 = this.quizInfo?.questions?.[0] ?? {};
    const { durationInHours, durationInMinutes, durationInSeconds } = q0 as any;
    const { totalDurationInHours, totalDurationInMinutes, totalDurationInSeconds } = this.quizInfo ?? {};

    const hours = (durationInHours ?? totalDurationInHours ?? 0) * 60 * 60;
    const minutes = (durationInMinutes ?? totalDurationInMinutes ?? 0) * 60;
    const seconds = (durationInSeconds ?? totalDurationInSeconds ?? 0);
    this.counter = (hours || 0) + (minutes || 0) + (seconds || 0);

    if (this.counter > 0) {
      this.time(0);
      this.startCountdownForCurrentStep(this.innerStepper?.selectedIndex || 0);
    }

    this.ensureTrackerHydrated(this.innerStepper?.selectedIndex || 0);
    this.recomputeTrackerVisibility();
    this._changeDetectorRef.detectChanges();
  }

  ngOnDestroy() {
    this.countDown = null;
    this._teardown.unsubscribe();
    this.usbSignalSub?.unsubscribe();
    this.firestoreFallbackSub?.unsubscribe();
    window.removeEventListener('beforeunload', this._beforeUnloadHandler);
  }

  // -----------------------
  // Remote Signal Source Switching
  // -----------------------

  private startUsbListening(): void {
    if (this.usbSignalSub) return;

    this.eventSource = 'USB';

    // Stop fallback if running
    this.firestoreFallbackSub?.unsubscribe();
    this.firestoreFallbackSub = undefined;

    this.usbSignalSub = this.usbService.remoteSignal$.subscribe(({ MAC, value }) => {
      this.handleRemoteSignal(MAC, value);
    });
  }

  private startFirestoreFallbackListening(): void {
    if (this.firestoreFallbackSub) return;

    this.eventSource = 'FIRESTORE';
    console.log('🔄 Starting Firestore fallback listening for quiz...');

    // Stop USB subscription if any
    this.usbSignalSub?.unsubscribe();
    this.usbSignalSub = undefined;

    // Clear processed MACs to allow fresh detection
    this.processedFallbackMacs.clear();

    // Record the start time - only process events that arrive AFTER this moment
    // This prevents processing old events from Firestore
    this.firestoreListenStartTime = Date.now();

    // Auto-enable remote mode if we have valid mappings loaded
    // This ensures tracker boxes show when using Firestore fallback
    if (this.sortedRemoteMappings?.length > 0 || this.teacherMac) {
      this.isRemoteInput = true;
      this.quizStartMode = 'remote';
      this.showResponseTracker = true;
      console.log('🔄 Auto-enabled remote mode for Firestore fallback');
      this.recomputeTrackerVisibility();
      this._changeDetectorRef.detectChanges();
    }

    this.firestoreFallbackSub = this.remoteEventsService
      .getFreshLatestEvents$(200, 'SnappyRemoteEvents')
      .subscribe({
        next: (docs: RemoteEvent[]) => {
          // Run inside Angular zone for immediate UI updates
          this.zone.run(() => {
            console.log(`🔥 Firestore received ${docs.length} events, processedFallbackMacs size=${this.processedFallbackMacs.size}`);

            for (const d of docs) {
              const rawMac = d.macId?.trim();
              if (!rawMac) continue;

              // IMPORTANT: Only process events that happened AFTER we started listening
              // This prevents processing old events from Firestore
              if (d.serverReceiveMs < this.firestoreListenStartTime) {
                continue;
              }

              // Normalize MAC for consistent event key
              const normalizedMac = this.normalizeMac(rawMac);

              // Firestore stores MAC in reversed byte order compared to USB
              // Reverse the bytes to match the mapping format
              const reversedMac = this.reverseFirestoreMac(normalizedMac);

              // Create a unique key for this event using normalized MAC + timestamp + button
              const eventKey = `${normalizedMac}_${d.serverReceiveMs}_${d.button}`;

              // Only process each event once
              if (this.processedFallbackMacs.has(eventKey)) continue;
              this.processedFallbackMacs.add(eventKey);

              // Convert button letter to numeric value
              // Firestore stores letters: A=1, B=2, C=3, D=4, E=5, F=6, G=7, etc.
              const value = this.buttonLetterToNumber(d.button);

              console.log(`🔥 Processing Firestore event: MAC=${rawMac}, normalized=${normalizedMac}, reversed=${reversedMac}, button=${d.button}, value=${value}`);
              console.log(`🔥 Current state: teacherMac=${this.teacherMac}, macNameMap keys=[${Object.keys(this.macNameMap).join(', ')}], isRemoteInput=${this.isRemoteInput}, quizStartMode=${this.quizStartMode}`);

              if (value > 0) {
                // Use reversed MAC to match USB format
                this.handleRemoteSignal(reversedMac, value);
              } else {
                console.warn(`🔥 Skipping invalid button value: ${d.button}`);
              }
            }

            // Force immediate change detection
            this._changeDetectorRef.detectChanges();
          });
        },
        error: (err) => {
          console.error('❌ Firestore fallback listen failed:', err);
        }
      });
  }

  private handleRemoteSignal(MAC: string, value: number): void {
    if (this.blockRapid(MAC, value)) return;
    console.warn(`📡 Remote received: MAC=${MAC}, value=${value}`);

    this.zone.run(() => {
      const selectedIndex = this.innerStepper?.selectedIndex ?? 0;
      const finalStepIndex = this.innerStepper?.steps?.length - 1;
      const lastQuestionStepIndex = finalStepIndex - 1;

      const normalizedMac = this.normalizeMac(MAC);
      this.selectedMac = normalizedMac;

      // Debug logging
      console.log(`🔍 Checking MAC: normalized=${normalizedMac}, teacherMac=${this.teacherMac}, macNameMap keys=${Object.keys(this.macNameMap).length}`);

      // ⬇️ Check if remote MAC is valid
      // First check allowedMacs (from student mapping dialog) if it's populated
      if (this.allowedMacs.size > 0) {
        if (!this.allowedMacs.has(normalizedMac)) {
          console.warn(`🚫 MAC not in allowed list: ${MAC}, allowedMacs size=${this.allowedMacs.size}`);
          return; // Ignore MAC not in allowed list
        }
      }

      const isKnownTeacher = normalizedMac === this.normalizeMac(this.teacherMac);
      // macNameMap keys are now always normalized, so direct lookup works
      const isKnownStudent = !!this.macNameMap[normalizedMac];

      // In Firestore fallback mode with empty macNameMap, treat any non-teacher MAC as a student
      const isFirestoreFallbackStudent = this.eventSource === 'FIRESTORE' &&
                                          Object.keys(this.macNameMap).length === 0 &&
                                          !isKnownTeacher;

      console.log(`🔍 isKnownTeacher=${isKnownTeacher}, isKnownStudent=${isKnownStudent}, isFirestoreFallbackStudent=${isFirestoreFallbackStudent}, macNameMap keys=${Object.keys(this.macNameMap).join(', ')}`);

      if (!isKnownTeacher && !isKnownStudent && !isFirestoreFallbackStudent) {
        console.warn(`🚫 Unknown MAC address received: ${MAC}`);
        return; // Ignore unknown MAC
      }

      // ✅ Handle option selection (only for student remotes)
      // Use treatAsStudent to include Firestore fallback students
      const treatAsStudent = isKnownStudent || isFirestoreFallbackStudent;
      if (treatAsStudent && selectedIndex < this.questions.length && value >= 1 && value <= 4) {
        console.log(`👨‍🎓 Student remote detected! MAC=${normalizedMac}, value=${value}, question=${selectedIndex}`);

        const isSingle = this.getOneCorrectOption(selectedIndex);

        // This updates studentAnswers + remoteQuestionResponses with 0-based indices
        this.onOptionSelected(selectedIndex, value - 1, isSingle, true);

        // Show UI feedback for student response
        const studentName = this.macNameMap[normalizedMac] || normalizedMac;
        this.uiService.alertMessage('success', `Student ${studentName}: Option ${value}`, 'success');

        if (!this.currentQuestionResponses.has(normalizedMac)) {
          this.currentQuestionResponses.add(normalizedMac);
          this.registeredCount = this.currentQuestionResponses.size;
        }

        // Mark step as completed when any option is selected
        if (this.innerStepper?.steps?.[selectedIndex]) {
          this.innerStepper.steps[selectedIndex].completed = true;
          this.completedSteps.add(selectedIndex);
        }

        // ✅ Persist remote state after each press
        this.attempts.savePartial({
          remoteQuestionResponses: this.remoteQuestionResponses,
          studentAnswers: this.studentAnswers,
        });

        // Update tracker visibility
        this.recomputeTrackerVisibility();
        this._changeDetectorRef.detectChanges();
      }

      if (isKnownTeacher) {
        console.log(`👨‍🏫 Teacher remote detected! value=${value}, selectedIndex=${selectedIndex}`);
        this.uiService.alertMessage('info', `Teacher remote: button ${value}`, 'info');

        // Pause timer (value 2)
        if (value === 2) {
          this.isTimerPaused = true;
          this.uiService.alertMessage('info', '⏸ Timer paused by teacher remote', 'info');
          return;
        }

        // Resume timer (value 3)
        if (value === 3) {
          this.isTimerPaused = false;
          this.uiService.alertMessage('info', '▶️ Timer resumed by teacher remote', 'info');
          return;
        }

        if (value === 4) {
          // zoom in current focus
          this.ensureFocusDefaults(selectedIndex);
          this.zoomCurrentTarget(selectedIndex, true);
          return;
        }

        if (value === 5) {
          // zoom out (reset) current focus
          this.ensureFocusDefaults(selectedIndex);
          this.zoomCurrentTarget(selectedIndex, false);
          return;
        }

        if (value === 6) {
          const finalStepIdx = this.innerStepper?.steps?.length - 1;

          if (selectedIndex === finalStepIdx) {
            this.drawerService.setQuizStarted(false);
            this.exitFullscreen();
            this.uiService.alertMessage('info', '⛔ Exited fullscreen from final step', 'info');
          } else {
            // ✅ Always cycle focus: Question → Opt1 → Opt2 → … → Question
            this.ensureFocusDefaults(selectedIndex);
            this.cycleFocus(selectedIndex, 1);
          }
          return;
        }


        // For remote mode, check if any student has responded OR form has selection
        // Teacher should be able to navigate freely in remote mode
        const hasRemoteResponses = this.currentQuestionResponses.size > 0 ||
                                   (this.remoteQuestionResponses[String(selectedIndex)] &&
                                    Object.keys(this.remoteQuestionResponses[String(selectedIndex)]).length > 0);
        const canNavigate = selectedIndex < this.questions.length
          ? (this.isAnyOptionSelected(selectedIndex) || hasRemoteResponses || this.isRemoteInput)
          : true;

        console.log(`🔍 Teacher navigation check: value=${value}, selectedIndex=${selectedIndex}, canNavigate=${canNavigate}, hasRemoteResponses=${hasRemoteResponses}, isRemoteInput=${this.isRemoteInput}`);

        // When on the final step, use value 1 to open the confirmation dialog
        if (selectedIndex === finalStepIndex && value === 1) {
          this.onSubmit();
          return;
        }

        // Use value 7 to navigate forward (only when not on final step)
        if (value === 7 || value === 25 && selectedIndex <= lastQuestionStepIndex) {
          console.log(`👨‍🏫 Teacher pressing NEXT (value=7), navigating to next question`);
          this.goToNextStepsForRemote();
        }

        // // Use value 8 to navigate backward (only if not already at first step)
        // if (value === 8 && selectedIndex > 0) {
        //   this.goToPreviousStepsForRemote();
        // }

        this._changeDetectorRef.detectChanges();
      }


      // ✅ Track all remote activity
      this.remotes.unshift({ mac: MAC, value, time: new Date() });
      this._changeDetectorRef.detectChanges();
    });
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

    this.drawerService.setQuizStarted(false);
    this.exitFullscreen();
  }

  onStepChange(event) {
    this.stepIndex = event?.selectedIndex;

    // ✅ Reset paused timer for every new question
    this.isTimerPaused = false;

    // per question time
    const currentQuestion = this.quizInfo?.questions?.[this.stepIndex];
    const { durationInHours, durationInMinutes, durationInSeconds } = currentQuestion || {};
    // total quiz time (as fallback)
    const { totalDurationInHours, totalDurationInMinutes, totalDurationInSeconds } = this.quizInfo;
    const hours = (durationInHours ?? totalDurationInHours ?? 0) * 60 * 60;
    const minutes = (durationInMinutes ?? totalDurationInMinutes ?? 0) * 60;
    const seconds = (durationInSeconds ?? totalDurationInSeconds ?? 0);
    this.counter = (hours || 0) + (minutes || 0) + (seconds || 0);

    // Restart countdown for the new step
    this.startCountdownForCurrentStep(event?.selectedIndex);

    this.resetCurrentQuestionTracking();

    this.hydrateCurrentQuestionResponses(event?.selectedIndex);
    this.attempts.jumpTo(event?.selectedIndex);
    const idx = event?.selectedIndex ?? 0;
    this.ensureFocusDefaults(idx);
    this.setFocusToQuestion(idx);

  }

  time(index) {
    if (index >= this.questions.length) return;
    this.timer$ = interval(1000).pipe(
      takeUntil(this.pauseClick[index]),
      takeUntil(this.stopClick[index])
    );

    this.timerObserver = {
      next: (_: number) => {
        if (this.timeTaken[index] < this.counter) {
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

  /** This is triggered when user clicks the 'Submit' button or remote value 7 */
  onSubmit(): void {
    if (this.counter && this.counter > 0) {
      this.countDown.unsubscribe();
    }
    if (this.isSubmitting) return;
    this.isSubmitting = true;

    const openedAt = Date.now(); // record when dialog is opened

    const dialogRef = this.dialog.open(ConfirmSubmitDialogComponent, {
      width: '350px',
      disableClose: true,
      data: {
        usbService: this.usbService,
        openedAt
      }
    });

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      this.isSubmitting = false;

      if (confirmed) {
        this.handleConfirmedSubmission();
      } else {
        this.uiService.alertMessage('info', 'Cancel button clicked', 'info');
      }
    });
  }

  async storeToDb() {
    // Optional fast guard (UI): block if already at cap
    const current = await this.assignmentService.getAttemptsCountFor({
      rootCollection: 'Teachers',
      ownerId: this.currentTeacher.docId,
      summarySubcollection: 'submissions',
      summaryDocId: `${this.params.classroomId}-${this.params.programmeId}`,
    });

    let allowedSubmissions;
    await this.assignmentService.getAssignmentByIdOnce(this.quizId).pipe(take(1)).toPromise().then((quiz) => {
      if (quiz) {
        allowedSubmissions = quiz.data()?.numberOfAllowedSubmissions ?? 3;
      }
    });
    if (current >= allowedSubmissions) {
      this.uiService.alertMessage('Info', `Max attempts (${allowedSubmissions}) reached.`, 'info');
      return;
    }

    // Build full attempt payload (keep everything you need)
    const marksObj = this.quizzerService.getTACQuesMarks(this.questionsFormGroup.value.questions);
    const finalAttemptPayload = {
      questions: this.questionsFormGroup.value.questions,
      ...marksObj, // { studentScore, maxScore }
      displayName: this.quizInfo.displayName,
      totalQuestions: this.quizInfo.totalQuestions,
      id: this.quizInfo.id,
      totalDurationInHours: this.quizInfo.totalDurationInHours,
      totalDurationInMinutes: this.quizInfo.totalDurationInMinutes,
      totalDurationInSeconds: this.quizInfo.totalDurationInSeconds,
      userAgent: navigator.userAgent,
    };

    // meta
    // const timeIpResponse = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    // const [time, ip] = timeIpResponse
    //   ? await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()))
    //   : [new Date(), ''];
    // const meta = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const meta = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

    try {
      const { attemptId } = await this.assignmentService.saveSubmissionFullPayload({
        rootCollection: 'Teachers',
        ownerId: this.currentTeacher.docId,
        summarySubcollection: 'submissions',
        summaryDocId: `${this.params.classroomId}-${this.params.programmeId}`,
        finalAttemptPayload,
        meta,
        maxAttempts: allowedSubmissions,
        summaryExtras: {
          teacherId: this.currentTeacher.docId,
          classroomId: this.params.classroomId,
          programmeId: this.params.programmeId,
          workflowId: this.workflowId ?? null,
          assignmentId: this.quizId,
          displayName: this.quizInfo.displayName,
          totalQuestions: this.quizInfo.totalQuestions,
          maxScore: marksObj?.maxScore ?? null,
        },
      });

      // (Optional) mark teacher doc with attemptedAssignments as before
      this.currentTeacher.attemptedAssignments = arrayUnion(this.quizId);
      await this.teacherService.updateTeacher(this.currentTeacher, this.currentTeacher.docId);

      // (Optional) refresh any local caches if you read them elsewhere
      this.assignmentService.existingAssignment = await this.getExistingAssignments(
        this.currentTeacher.docId,
        this.params.classroomId,
        this.params.programmeId
      );

      this.uiService.alertMessage('Successful', `Quiz submitted ( ${attemptId} )`, 'success');
      this.workFlowCompletionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
      this.showSubmitButton = false;

    } catch (error: any) {
      if (String(error?.message).includes('MAX_ATTEMPTS_REACHED')) {
        this.uiService.alertMessage('Info', `Max attempts (${allowedSubmissions}) reached.`, 'info');
      } else {
        this.uiService.alertMessage('Error', 'There Is An Error Submitting The Quiz', 'error');
        console.error(error);
      }
    }
  }

  async storeRemoteToDb() {
    const baseQuiz = { questions: this.questionsFormGroup.value.questions };
    const updatedQuestionsMap = this.transformRemoteResponses(this.remoteQuestionResponses, baseQuiz);

    const updatedByNormMac: Record<string, any> = {};
    for (const [k, v] of Object.entries(updatedQuestionsMap || {})) {
      updatedByNormMac[this.normalizeMac(k)] = v;
    }

    // const timeIpResponse = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    // const [time, ip] = timeIpResponse
    //   ? await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()))
    //   : [new Date(), ''];
    // const meta = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const meta = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

    const allMacs = Object.keys(this.macNameMap || {});
    const total = allMacs.length;


    for (let i = 0; i < total; i++) {
      const macColoned = allMacs[i];
      const studentDocId = this.macNameMap[macColoned];
      const normMac = this.normalizeMac(macColoned);
      const updatedQuizForMac = updatedByNormMac[normMac];
      if (!updatedQuizForMac) continue;

      // Optional fast UX guard. The transaction will enforce again.
      const current = await this.assignmentService.getAttemptsCountFor({
        rootCollection: 'Students',
        ownerId: studentDocId,
        summarySubcollection: 'remoteSubmissions',
        summaryDocId: this.quizId,
      });

      let allowedSubmissions;
      await this.assignmentService.getAssignmentByIdOnce(this.quizId).pipe(take(1)).toPromise().then((quiz) => {
        if (quiz) {
          allowedSubmissions = quiz.data()?.numberOfAllowedSubmissions ?? 3;
        }
      });
      if (current >= allowedSubmissions) {
        this.uiService.alertMessage('Info', `Max attempts (${allowedSubmissions}) reached. Skipping.`, 'info');
        continue;
      }

      const marksObj = this.quizzerService.getTACQuesMarks(updatedQuizForMac.questions);
      const finalAttemptPayload = {
        questions: updatedQuizForMac.questions,
        ...marksObj,
        displayName: this.quizInfo.displayName ?? '',
        totalQuestions: this.quizInfo.totalQuestions ?? 0,
        id: this.quizInfo.id ?? this.quizId ?? '',
        totalDurationInHours: this.quizInfo.totalDurationInHours ?? 0,
        totalDurationInMinutes: this.quizInfo.totalDurationInMinutes ?? 0,
        totalDurationInSeconds: this.quizInfo.totalDurationInSeconds ?? 0,
        userAgent: navigator.userAgent,
        clientIp: meta.clientIp,
        latestLearningUnitId: this?.learningUnits.lastUsedLearningUnit ?? null,
        latestLearningUnitName: this?.learningUnits.lastLearningUnitName ?? null,
        latestProgrammeId: this?.params?.programmeId ?? null,
      };

      try {
        const { attemptId } = await this.assignmentService.saveSubmissionFullPayload({
          rootCollection: 'Students',
          ownerId: studentDocId,
          summarySubcollection: 'remoteSubmissions',
          summaryDocId: this.quizId,
          finalAttemptPayload,
          meta,
          maxAttempts: allowedSubmissions,
          summaryExtras: {
            studentId: studentDocId,
            quizId: this.quizId,
            classroomId: this.params?.classroomId ?? this.currentWorkflow?.classroomId ?? null, // ✅ add
            workflowId: this.workflowId ?? null,
            displayName: this.quizInfo.displayName ?? null,
            totalQuestions: this.quizInfo.totalQuestions ?? null,
            maxScore: marksObj?.maxScore ?? null,
          },
        });

        // (Optional) also mark student doc with attemptedAssignments, like before
        const studentRef = await lastValueFrom(this.studentService.getStudentByIdOnce(studentDocId));
        if (!studentRef.exists) {
          this.uiService.alertMessage('Error', `Student not found for MAC: ${macColoned}`, 'error');
          continue;
        }
        const matchingStudent: any = studentRef.data();
        matchingStudent.attemptedAssignments = arrayUnion(this.quizId);
        await this.studentService.updateStudent(matchingStudent, studentDocId);

        this.uiService.alertMessage('Successful', `Saved ${attemptId} (${i + 1} of ${total})`, 'success');
        this.workFlowCompletionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
        this.showSubmitButton = false;

      } catch (err: any) {
        if (String(err?.message).includes('MAX_ATTEMPTS_REACHED')) {
          this.uiService.alertMessage('Info', `Max attempts (${allowedSubmissions}) reached. Skipped.`, 'info');
        } else {
          this.uiService.alertMessage('Error', `Error submitting for MAC: ${macColoned}`, 'error');
          console.error(err);
        }
      }
    }

    this._changeDetectorRef.detectChanges();
  }

  toggleTabs($tabNumber: number) {
    this.openTab = $tabNumber;
  }

  onClickOption(questionIndex: number, blankKey) {
    const formValue = this.questions.at(questionIndex).get(blankKey).value;
    formValue.options.forEach((op) => {
      op.attemptedOption = false;
      if (op.name === formValue.selectedOption.name) {
        op.attemptedOption = true;
      }
    });
  }

  checkOptionsAttempted(options: Array<any>): boolean {
    return options?.every(option => option?.attemptedOption === false);
  }

  getDisplayTime(): number {
    return this.isGracePeriod ? this.graceCounter : this.counter;
  }

  getTimeLabel(): string {
    return this.isGracePeriod ? 'Grace Time' : 'Time Remaining';
  }

  getSelectedOptions(qIndex: number): Set<number> {
    return this.remoteSelections[this.selectedMac]?.[qIndex] || this.manualSelections[qIndex] || new Set();
  }

  isAnyOptionSelected(questionIndex: number): boolean {
    if (this.completedSteps.has(questionIndex)) {
      return true;
    }

    const questionsFA = this.questionsFormGroup.get('questions') as FormArray;
    if (!questionsFA || questionIndex >= questionsFA.length) return false;

    const qFG = questionsFA.at(questionIndex) as FormGroup;
    const qType = qFG.get('questionType')?.value;

    // Remote-selected
    const remoteSelected = Object.values(this.studentAnswers || {}).some((ans: any) =>
      Array.isArray(ans?.[questionIndex]) && ans[questionIndex].length > 0
    );
    if (remoteSelected) return true;

    // Check if this question has sub-parts enabled
    const hasSubParts = this.hasSubPartsEnabled(questionIndex);

    let mainQuestionAnswered = false;
    let mainQuestionHasOptions = false;

    if (qType === 'MCQ') {
      const options = this.getOptions(questionIndex);
      mainQuestionHasOptions = options?.controls?.length > 0;
      mainQuestionAnswered = !!options?.controls?.some(ctrl => !!ctrl.get('attemptedOption')?.value);
    }
    else if (qType === 'TEXT') {
      const htmlContent = qFG.get('text')?.value || '';
      const plainText = this.extractPlainTextFromHtml(htmlContent);
      mainQuestionHasOptions = true;
      mainQuestionAnswered = plainText.length > 0;
    }
    else if (qType === 'FILL_IN_THE_BLANKS' || qType === 'RICH_BLANKS') {
      const blanksObj = qFG.get('blanksObj')?.value || {};
      const keys = Object.keys(blanksObj);
      mainQuestionHasOptions = keys.length > 0;

      if (!keys.length) {
        mainQuestionAnswered = false;
      } else {
        mainQuestionAnswered = keys.every((k) => {
          const sel = qFG.get(k)?.get('selectedOption')?.value;
          const name = (sel?.name ?? '---').trim();
          return name !== '---' && name !== '';
        });
      }
    }

    // For questions WITH sub-parts
    if (hasSubParts) {
      if (mainQuestionHasOptions) {
        return mainQuestionAnswered && this.isAnySubPartOptionSelected(questionIndex);
      }
      return this.isAnySubPartOptionSelected(questionIndex);
    }

    return mainQuestionAnswered;
  }

  goToNextStepsForRemote(): void {
    if (this._navGuard) return;
    this._navGuard = true;

    try {
      if (!this.innerStepper) return;
      const next = Math.min(this.innerStepper.selectedIndex + 1, this.innerStepper._steps.length - 1);

      this.innerStepper.linear = false;
      this.innerStepper.selectedIndex = next;
      this.innerStepper.linear = true;

      this.isTimerPaused = false;
      this.startCountdownForCurrentStep(next);

      // ✅ Init focus/zoom for the new step
      this.ensureFocusDefaults(next);
      this.setFocusToQuestion(next);

      this.hydrateCurrentQuestionResponses(next);
      this.attempts.jumpTo(next);
      this._changeDetectorRef.detectChanges();
    } finally {
      setTimeout(() => (this._navGuard = false), 350);
    }
  }

  goToNextStepsForManual(): void {
    const selectedIndex = this.innerStepper?.selectedIndex ?? 0;
    const finalStepIndex = this.innerStepper?.steps?.length - 1;
    if (selectedIndex >= finalStepIndex) return;

    if (this.isAnyOptionSelected(selectedIndex)) {
      this.innerStepper.next();
      const next = this.innerStepper.selectedIndex;

      // ✅ Init focus/zoom for the new step
      this.ensureFocusDefaults(next);
      this.setFocusToQuestion(next);

      this.hydrateCurrentQuestionResponses(next);
      this.attempts.jumpTo(next);
    }
  }

  onOptionManuallySelected(qIndex: number, optionIndex: number): void {
    this.isRemoteInput = false;
    const isSingle = this.getOneCorrectOption(qIndex);

    if (isSingle) {
      this.onOptionSelected(qIndex, optionIndex, isSingle, false);
    } else {
      if (this.innerStepper?.steps?.[qIndex]) {
        this.innerStepper.steps[qIndex].completed = true;
        this.completedSteps.add(qIndex);
        this._changeDetectorRef.detectChanges();
      }
    }

    const answer = this.buildAnswerFromForm(qIndex);
    this.attempts.recordAnswer(this.getQuestionId(qIndex), answer);

  }

  onOptionSelected(
    qIndex: number,
    optionIndex: number,
    isSingle: boolean,
    isRemote: boolean = false
  ): void {
    this.isRemoteInput = isRemote;

    const options = this.getOptions(qIndex);
    const option = options?.at(optionIndex);
    if (!option) return;

    // Manual (mouse/touch) → update form controls
    if (!isRemote) {
      const attemptedCtrl = option.get('attemptedOption');
      const currentValue = attemptedCtrl.value;

      if (isSingle) {
        options.controls.forEach((ctrl, i) => {
          ctrl.get('attemptedOption').setValue(i === optionIndex, { emitEvent: true });
        });
      } else {
        attemptedCtrl.setValue(!currentValue, { emitEvent: true });
      }

      if (this.innerStepper?.steps?.[qIndex]) {
        this.innerStepper.steps[qIndex].completed = this.isAnyOptionSelected(qIndex);
      }
    }

    // Remote → update our internal stores (0-based indices)
    if (isRemote && this.selectedMac) {
      const mac = this.normalizeMac(this.selectedMac);
      const qKey = String(qIndex);

      if (!this.studentAnswers[mac]) this.studentAnswers[mac] = {};
      if (!this.remoteQuestionResponses[qKey]) this.remoteQuestionResponses[qKey] = {};

      if (isSingle) {
        this.studentAnswers[mac][qIndex] = [optionIndex];
        this.remoteQuestionResponses[qKey][mac] = [optionIndex];
      } else {
        const selected = this.studentAnswers[mac][qIndex] || [];
        const pos = selected.indexOf(optionIndex);
        if (pos >= 0) selected.splice(pos, 1); else selected.push(optionIndex);
        this.studentAnswers[mac][qIndex] = selected;
        this.remoteQuestionResponses[qKey][mac] = [...selected];
      }

      // ⭐ NEW: color the box now
      this.currentQuestionResponses.add(mac);
      this.registeredCount = this.currentQuestionResponses.size;
      this.recomputeTrackerVisibility();

      // ⭐ NEW: persist remote state so it survives refresh
      this.attempts.savePartial({
        remoteQuestionResponses: this.remoteQuestionResponses,
        studentAnswers: this.studentAnswers,
      });
    }

    this.completedSteps.add(qIndex);

    // Persist manual/teacher-side answer snapshot too (already present)
    const answer = this.buildAnswerFromForm(qIndex);
    this.attempts.recordAnswer(this.getQuestionId(qIndex), answer);

    setTimeout(() => this._changeDetectorRef.detectChanges(), 0);
  }

  getCorrectOptionIndices(qIndex: number): number[] {
    const options = this.getOptions(qIndex);
    return options.controls
      .map((ctrl, idx) => ctrl.get('isCorrect').value ? idx : null)
      .filter(i => i !== null);
  }

  // async loadRemoteMappingsFromFirestore(): Promise<void> {
  //   try {
  //     const user = await lastValueFrom(this.afAuth.authState.pipe(first()));

  //     // 1. Get current user's institutionId and classroomId
  //     const teacherDoc = await lastValueFrom(this.userFirestoreSerivce.doc$(user?.uid).pipe(first()));
  //     const institutionId = teacherDoc?.currentTeacherInfo?.institutionId;
  //     const classroomId = teacherDoc?.currentTeacherInfo?.classroomId;

  //     // 2. Fetch remote mappings document
  //     const remoteDocRef = this.afs.doc('Master/remote_master_01');
  //     const snapshot = await lastValueFrom(remoteDocRef.get());

  //     if (!snapshot.exists) {
  //       console.warn('⚠️ remote_master_01 document does not exist');
  //       return;
  //     }

  //     const data = snapshot.data() as {
  //       teacherRemoteMapping?: { [teacherDocId: string]: any };
  //       studentRemoteMapping?: { [studentDocId: string]: any };
  //     };

  //     // Match teacher remote
  //     const matchedTeacherEntry = Object.values(data.teacherRemoteMapping || {}).find((entry: any) =>
  //       entry.institutionId === institutionId &&
  //       entry.classroomId === classroomId &&
  //       entry.teacherDocId === user?.uid
  //     );

  //     if (matchedTeacherEntry) {
  //       this.teacherMac = matchedTeacherEntry.snappyRemote;
  //       // console.log('✅ Matched teacher MAC:', this.teacherMac);
  //     } else {
  //       console.warn('❌ No matching teacher MAC found');
  //     }

  //     // Match student remotes
  //     const matchedStudentEntries = Object.entries(data.studentRemoteMapping || {}).filter(
  //       ([_, entry]: [string, any]) =>
  //         entry.institutionId === institutionId && entry.classroomId === classroomId
  //     );

  //     // Fetch accessCode for each studentDocId from CustomAuthentication
  //     const studentInfos = await Promise.all(
  //       matchedStudentEntries.map(async ([studentDocId, entry]) => {
  //         try {
  //           const authSnap = await this.afs.collection('CustomAuthentication').doc(studentDocId).get().toPromise();
  //           const authData = authSnap.data() as { accessCode?: string } | undefined;
  //           const accessCode = authData?.accessCode ?? '';

  //           return {
  //             mac: entry.snappyRemote,
  //             studentDocId,
  //             accessCode,
  //           };
  //         } catch (err) {
  //           console.warn(`⚠️ Failed to fetch accessCode for student ${studentDocId}`, err);
  //           return null;
  //         }
  //       })
  //     );

  //     // Filter out null/invalid entries
  //     const validStudentInfos = studentInfos.filter(info => info && info.accessCode);

  //     // Sort by last 3 digits of accessCode
  //     validStudentInfos.sort((a, b) => {
  //       const last3A = parseInt(a.accessCode.slice(-3), 10);
  //       const last3B = parseInt(b.accessCode.slice(-3), 10);
  //       return last3A - last3B;
  //     });

  //     // Store as a sorted array
  //     this.sortedRemoteMappings = validStudentInfos.map(info => ({
  //       mac: info.mac,
  //       studentDocId: info.studentDocId,
  //       accessCode: info.accessCode
  //     }));

  //     // Optionally also rebuild macNameMap if you still need it as a lookup
  //     this.macNameMap = {};
  //     for (const item of this.sortedRemoteMappings) {
  //       this.macNameMap[item.mac] = item.studentDocId;
  //     }

  //     this.generateBoxesAutomatically();
  //     // console.log('✅ MAC to studentId map (sorted):',this.macNameMap,`and ✅ Found ${validStudentInfos.length} student MACs`);
  //     this._changeDetectorRef.detectChanges();
  //   } catch (err) {
  //     console.error('❌ Failed to load remote mappings from Firestore', err);
  //   }
  // }

  async loadRemoteMappingsFromFirestore(): Promise<void> {
    try {
      const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
      if (!user?.uid) return;

      // 1. Get current user's institutionId and classroomId
      const teacherDoc = await lastValueFrom(
        this.userFirestoreSerivce.doc$(user.uid).pipe(first())
      );
      const institutionId = teacherDoc?.currentTeacherInfo?.institutionId;
      const classroomId = teacherDoc?.currentTeacherInfo?.classroomId;

      // 2. Fetch all remote_master_XX documents
      const masterCollectionRef = this.afs.collection('Master', ref =>
        ref.orderBy('creationDate', 'asc')
      );
      const snapshot = await lastValueFrom(masterCollectionRef.get());

      if (snapshot.empty) {
        console.warn('⚠️ No remote_master documents found');
        return;
      }

      let aggregatedTeacherMapping: any = {};
      let aggregatedStudentMapping: any = {};

      snapshot.docs.forEach(docSnap => {
        if (!docSnap.id.startsWith('remote_master_')) return;

        const data = docSnap.data() as {
          teacherRemoteMapping?: { [teacherDocId: string]: any };
          studentRemoteMapping?: { [studentDocId: string]: any };
        };

        if (data.teacherRemoteMapping) {
          aggregatedTeacherMapping = { ...aggregatedTeacherMapping, ...data.teacherRemoteMapping };
        }
        if (data.studentRemoteMapping) {
          aggregatedStudentMapping = { ...aggregatedStudentMapping, ...data.studentRemoteMapping };
        }
      });

      // 3. Match teacher remote
      const matchedTeacherEntry = Object.values(aggregatedTeacherMapping).find(
        (entry: any) =>
          entry.institutionId === institutionId &&
          entry.classroomId === classroomId &&
          entry.teacherDocId === user.uid
      );

      if (matchedTeacherEntry) {
        this.teacherMac = (matchedTeacherEntry as { snappyRemote: string }).snappyRemote;
        // console.log('✅ Matched teacher MAC:', this.teacherMac);
      } else {
        console.warn('❌ No matching teacher MAC found');
      }

      // 4. Match student remotes
      const matchedStudentEntries = Object.entries(aggregatedStudentMapping).filter(
        ([_, entry]: [string, any]) =>
          entry.institutionId === institutionId && entry.classroomId === classroomId
      );

      const studentInfos = await Promise.all(
        matchedStudentEntries.map(async ([studentDocId, entry]) => {
          try {
            const authSnap = await this.afs
              .collection('CustomAuthentication')
              .doc(studentDocId)
              .get()
              .toPromise();
            const authData = authSnap.data() as { accessCode?: string } | undefined;
            const accessCode = authData?.accessCode ?? '';
            return { mac: (entry as { snappyRemote: string }).snappyRemote, studentDocId, accessCode };
          } catch (err) {
            console.warn(`⚠️ Failed to fetch accessCode for student ${studentDocId}`, err);
            return null;
          }
        })
      );

      // Filter out invalid entries
      const validStudentInfos = studentInfos.filter(info => info && info.accessCode);

      // Sort by last 3 digits of accessCode
      validStudentInfos.sort((a, b) => {
        const last3A = parseInt(a.accessCode.slice(-3), 10);
        const last3B = parseInt(b.accessCode.slice(-3), 10);
        return last3A - last3B;
      });

      // Store sorted array
      this.sortedRemoteMappings = validStudentInfos.map(info => ({
        mac: info.mac,
        studentDocId: info.studentDocId,
        accessCode: info.accessCode
      }));

      // Rebuild MAC → studentId lookup with normalized keys
      this.macNameMap = {};
      for (const item of this.sortedRemoteMappings) {
        const normalizedMac = this.normalizeMac(item.mac);
        if (normalizedMac) {
          this.macNameMap[normalizedMac] = item.studentDocId;
        }
      }

      // Populate allowedMacs set for validation
      this.allowedMacs = new Set<string>(
        this.sortedRemoteMappings
          .map(m => this.normalizeMac(m.mac))
          .filter(m => !!m)
      );

      // Add teacher MAC to allowed list
      const teacherNormMac = this.normalizeMac(this.teacherMac || '');
      if (teacherNormMac) {
        this.allowedMacs.add(teacherNormMac);
      }

      this.generateBoxesAutomatically();
      this._changeDetectorRef.detectChanges();
      // console.log('✅ MAC to studentId map (sorted):', this.macNameMap, `✅ Found ${validStudentInfos.length} student MACs`);
    } catch (err) {
      console.error('❌ Failed to load remote mappings from Firestore', err);
    }
  }


  generateBoxesAutomatically(): void {
    // Only rebuild numberBoxes if we have mappings, otherwise preserve existing
    const newBoxes = (this.sortedRemoteMappings || []).map(x => ({
      ...x,
      macKey: this.normalizeMac(x.mac),
    }));

    // Don't clear existing boxes if new data is empty
    if (newBoxes.length > 0 || this.numberBoxes.length === 0) {
      this.numberBoxes = newBoxes;
    }

    console.log(`📦 generateBoxesAutomatically: sortedRemoteMappings=${this.sortedRemoteMappings?.length}, numberBoxes=${this.numberBoxes.length}`);

    this.ensureTrackerHydrated();
    this.recomputeTrackerVisibility();
    this._changeDetectorRef.detectChanges();
  }

  transformRemoteResponses(remoteResponses: any, baseQuiz: any) {
    const resultByMac: Record<string, any> = {};

    // Get list of all MAC addresses (from all questions)
    const macSet = new Set<string>();
    for (const qIndex in remoteResponses) {
      for (const mac in remoteResponses[qIndex]) {
        macSet.add(mac);
      }
    }

    // For each mac address, build a full quiz object
    for (const mac of macSet) {
      const quizCopy = JSON.parse(JSON.stringify(baseQuiz)); // deep clone

      quizCopy.questions.forEach((question: any, qIndex: number) => {
        const answer = remoteResponses[qIndex]?.[mac];

        if (answer) {
          for (const idx of answer) {
            if (question.options[idx]) {
              question.options[idx].attemptedOption = true;
            }
          }

        }
      });

      resultByMac[mac] = quizCopy;
    }

    return resultByMac;
  }

  resetCurrentQuestionTracking(): void {
    this.registeredCount = 0;
    this.currentQuestionResponses.clear();
  }

  /** This is triggered ONLY when the user presses 'Yes' inside the confirmation dialog */
  async handleConfirmedSubmission(): Promise<void> {
    if (this.hasSubmittedResults) {
      this.uiService.alertMessage('info', 'Quiz already submitted', 'info');
      return;
    }

    this.hasSubmittedResults = true;
    await this.attempts.markSubmitted(); // NEW

    const remoteUsed = /* your existing detection */ this.remoteQuestionResponses &&
      Object.keys(this.remoteQuestionResponses).length > 0 &&
      Object.values(this.remoteQuestionResponses).some((r: any) => r && Object.keys(r).length > 0);

    if (remoteUsed) {
      await this.storeRemoteToDb();
    } else {
      await this.storeToDb();
    }

    await this.attempts.clear(); // NEW: only after successful upload

    // Clear student-remote mapping from session storage after successful submission
    this.clearStudentMappingFromStorage();

    // Force remote re-check for next quiz
    this.clearRemoteSetupDoneFlag();

    this.generateLiveResults();
  }

  /**
   * Clear student-remote mapping from session storage after quiz submission
   */
  private clearStudentMappingFromStorage(): void {
    const classroomId = this.params?.classroomId || this.currentWorkflow?.classroomId;
    const kitDocId = this.selectedKit?.docId;

    if (classroomId && kitDocId) {
      const key = `quiz_mapping_${classroomId}_${kitDocId}`;
      sessionStorage.removeItem(key);
      console.log(`🗑️ Cleared student mapping from session storage: ${key}`);
    }
  }

  // Helpers to flip a global overlay + freeze scroll while zoomed
  private setOverlay(on: boolean) {
    this.overlayActive = on;
    try {
      document.body.style.overflow = on ? 'hidden' : '';
    } catch { }
  }

  // OPTION zoom
  adjustZoom(questionIndex: number, optionIndex: number, zoomIn: boolean): void {
    // Only if that option is focused
    if (this.focusedTargetIndex[questionIndex] !== optionIndex) return;

    const key = `${questionIndex}-${optionIndex}`;
    const current = this.zoomLevels[key] || 1;

    if (zoomIn) {
      this.zoomLevels[key] = current === 1 ? 3 : Math.min(current + 1, 6);
    } else {
      this.zoomLevels[key] = 1;
    }

    // Turn overlay on if any zoom > 1 anywhere
    this.setOverlay(this.isAnyZoomActive());
    this._changeDetectorRef.detectChanges();
  }

  getZoomStyle(questionIndex: number, optionIndex: number): any {
    const isFocused = this.focusedTargetIndex[questionIndex] === optionIndex;
    const key = `${questionIndex}-${optionIndex}`;
    const scale = isFocused ? (this.zoomLevels[key] || 1) : 1;
    const isZoomed = isFocused && scale > 1;

    return isZoomed
      ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transition: 'transform 0.25s ease',
        'transform-origin': 'center center',
        'z-index': 1001,
        'max-width': '90vw',
        'max-height': '80vh',
        'object-fit': 'contain',
        'box-shadow': '0 12px 36px rgba(0,0,0,0.35)',
        'background-color': 'white',
        'border-radius': '12px',
        'pointer-events': 'none'   // don't trap clicks
      }
      : {
        transform: 'scale(1)',
        transition: 'transform 0.25s ease'
      };
  }

  // QUESTION zoom
  adjustQuestionZoom(questionIndex: number, zoomIn: boolean): void {
    if (this.focusedTargetIndex[questionIndex] !== -1) return; // only when question is focused

    const current = this.questionZoomLevels[questionIndex] || 1;

    if (zoomIn) {
      this.questionZoomLevels[questionIndex] = current === 1 ? 3 : Math.min(current + 1, 6);
      this.questionZoomActive[questionIndex] = true;
    } else {
      this.questionZoomLevels[questionIndex] = 1;
      this.questionZoomActive[questionIndex] = false;
    }

    this.setOverlay(this.isAnyZoomActive());
    this._changeDetectorRef.detectChanges();
  }

  getQuestionZoomStyle(qIndex: number): any {
    const isFocused = this.focusedTargetIndex[qIndex] === -1;
    const scale = isFocused ? (this.questionZoomLevels[qIndex] || 1) : 1;
    const isZoomed = isFocused && scale > 1;

    return isZoomed
      ? {
        position: 'fixed',
        top: '26%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        transition: 'transform 0.25s ease',
        'transform-origin': 'center center',
        'z-index': 1001,
        'max-width': '90vw',
        'max-height': '70vh',
        'box-shadow': '0 12px 36px rgba(0,0,0,0.35)',
        'background-color': 'white',
        'border-radius': '12px',
        'pointer-events': 'none'
      }
      : {
        transform: 'scale(1)',
        transition: 'transform 0.25s ease'
      };
  }

  // Utility: is any zoom active anywhere?
  private isAnyZoomActive(): boolean {
    // any question zoomed?
    for (const k in this.questionZoomLevels) {
      if ((this.questionZoomLevels as any)[k] > 1) return true;
    }
    // any option zoomed?
    for (const k in this.zoomLevels) {
      if (this.zoomLevels[k] > 1) return true;
    }
    return false;
  }

  // Keep your clearAllZooms(...) as-is, but also turn overlay off when everything resets
  private clearAllZooms(qi: number) {
    this.questionZoomLevels[qi] = 1;
    this.questionZoomActive[qi] = false;

    const optLen = this.getOptions(qi)?.length ?? 0;
    for (let oi = 0; oi < optLen; oi++) {
      this.zoomLevels[`${qi}-${oi}`] = 1;
    }

    this.setOverlay(this.isAnyZoomActive());
    this._changeDetectorRef.detectChanges();
  }

  private ensureFocusDefaults(qi: number) {
    if (this.focusedTargetIndex[qi] === undefined) this.focusedTargetIndex[qi] = -1; // question
    if (this.focusedOptionIndex[qi] === undefined) this.focusedOptionIndex[qi] = 0;
    if (this.questionZoomLevels[qi] === undefined) this.questionZoomLevels[qi] = 1;
    this.questionZoomActive[qi] = false;
  }

  private setFocusToQuestion(qi: number) {
    this.focusedTargetIndex[qi] = -1;
    this.focusedOptionIndex[qi] = this.focusedOptionIndex[qi] ?? 0;
    this.clearAllZooms(qi);
  }

  private setFocusToOption(qi: number, oi: number) {
    this.focusedTargetIndex[qi] = oi;
    this.focusedOptionIndex[qi] = oi;
    this.clearAllZooms(qi);
  }

  /** Cycle: question -> opt0 -> opt1 -> ... -> question */
  cycleFocus(qi: number, direction: 1 | -1) {
    const options = this.getOptions(qi);
    if (!options) return;
    const max = options.length - 1;

    let target = this.focusedTargetIndex[qi];
    if (target === undefined) target = -1;

    if (direction === 1) {
      // forward
      if (target === -1) target = 0;             // question -> first option
      else if (target < max) target += 1;        // next option
      else target = -1;                          // wrap to question
    } else {
      // backward
      if (target === -1) target = max;           // question -> last option
      else if (target > 0) target -= 1;          // prev option
      else target = -1;                          // wrap to question
    }

    if (target === -1) this.setFocusToQuestion(qi);
    else this.setFocusToOption(qi, target);

    this.uiService.alertMessage(
      'info',
      target === -1 ? 'Focus: Question' : `Focus: Option ${target + 1}`,
      'info'
    );
  }

  /** Zoom current focus target */
  private zoomCurrentTarget(qi: number, zoomIn: boolean) {
    const target = this.focusedTargetIndex[qi];
    if (target === -1) {
      // QUESTION
      this.adjustQuestionZoom(qi, zoomIn);
    } else {
      // OPTION
      // Ensure question is reset when zooming an option
      if (zoomIn && (this.questionZoomLevels[qi] ?? 1) > 1) {
        this.adjustQuestionZoom(qi, false);
      }
      this.adjustZoom(qi, target, zoomIn);
    }
  }

  calculateStudentPerformance(
    submissionObjs: { obj: any; studentDocId: string }[]
  ): { name: string; percentage: number }[] {
    const studentPerformance: { name: string; percentage: number }[] = [];

    const totalQuestions = this.quizInfo.totalQuestions ?? 5;

    const accessCodeMap = new Map(
      this.sortedRemoteMappings.map(m => [m.studentDocId, m.accessCode])
    );

    for (const { obj, studentDocId } of submissionObjs) {
      const workflowKey = `workflowId_${this.workflowId}`;
      const programmeKey = `programmeId_${this.params.programmeId}`;
      const assignmentKey = `assignmentId_${this.quizId}`;

      const questions =
        obj?.[workflowKey]?.[assignmentKey]?.questions ??
        obj?.[programmeKey]?.[assignmentKey]?.questions ??
        obj?.questions;

      if (!questions || !Array.isArray(questions)) {
        console.warn(`No stored questions found for student ${studentDocId}`);
        continue;
      }

      const accessCode = accessCodeMap.get(studentDocId) ?? 'Unknown';

      // count correct answers only
      let correct = 0;
      questions.forEach((q) => {
        const selected = q.options
          .map((opt, idx) => (opt.attemptedOption ? idx : null))
          .filter(idx => idx !== null);

        const correctIndices = q.options
          .map((opt, idx) => (opt.isCorrect ? idx : null))
          .filter(idx => idx !== null);

        const isCorrect =
          selected.length === correctIndices.length &&
          selected.every(idx => correctIndices.includes(idx));

        if (isCorrect) correct++;
      });

      const percentage = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

      studentPerformance.push({
        name: accessCode,
        percentage: Math.round(percentage),
      });
    }

    this.studentPerformanceTable = studentPerformance;
    return studentPerformance;
  }

  enterFullscreen(): void {
    const elem = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
      msRequestFullscreen?: () => Promise<void>;
    };

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
      elem.msRequestFullscreen();
    }
  }

  exitFullscreen(): void {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void>;
      msExitFullscreen?: () => Promise<void>;
    };

    if (doc.exitFullscreen) {
      doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) { // Safari
      doc.webkitExitFullscreen();
    } else if (doc.msExitFullscreen) { // IE/Edge
      doc.msExitFullscreen();
    }
  }

  getAlphabet(index: number): string {
    if (this.isRemoteInput) {
      return String.fromCharCode(97 + index); // a, b, c...
    } else {
      return (index + 1).toString(); // 1, 2, 3...
    }
  }

  formatTimeDisplay(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  private buildAnswerFromForm(qIndex: number): QuizAttempt['answers'][string] {
    const q = this.questions.at(qIndex);
    const qType = q.get('questionType')?.value;
    const hasSubParts = this.hasSubPartsEnabled(qIndex);

    // Build sub-part answers if question has sub-parts
    let subPartAnswers: Array<{ selectedOptionIndexes: number[] }> | undefined;
    if (hasSubParts) {
      const subParts = this.getSubParts(qIndex);
      if (subParts && subParts.length > 0) {
        subPartAnswers = [];
        for (let spIndex = 0; spIndex < subParts.length; spIndex++) {
          const spOptions = this.getSubPartOptions(qIndex, spIndex);
          const selectedIndexes = spOptions?.controls
            .map((c, i) => c.get('attemptedOption')?.value ? i : -1)
            .filter(i => i >= 0) || [];
          subPartAnswers.push({ selectedOptionIndexes: selectedIndexes });
        }
      }
    }

    if (qType === 'MCQ') {
      const single = q.get('oneCorrectOption')?.value;
      const opts = this.getOptions(qIndex);
      const selected = opts.controls
        .map((c, i) => c.get('attemptedOption')?.value ? i : -1)
        .filter(i => i >= 0);
      return { type: single ? 'MCQ_SINGLE' : 'MCQ_MULTI', selectedOptionIndexes: selected, subPartAnswers };
    }

    if (qType === 'FILL_IN_THE_BLANKS' || qType === 'RICH_BLANKS') {
      const blanksObj = q.get('blanksObj')?.value || {};
      const result: Record<string, string> = {};
      for (const key of Object.keys(blanksObj)) {
        const fg = q.get(key) as FormGroup;
        const sel = fg?.get('selectedOption')?.value;
        result[key] = sel?.name ?? '';
      }
      return { type: qType === 'FILL_IN_THE_BLANKS' ? 'FILL' : 'RICH_BLANKS', blanks: result, subPartAnswers };
    }

    if (qType === 'TEXT') {
      return { type: 'TEXT', textAnswer: q.get('text')?.value ?? '', subPartAnswers };
    }

    return { type: 'TEXT', textAnswer: '', subPartAnswers };
  }

  private getQuestionId(qIndex: number): string {
    const fromForm = (this.questions.at(qIndex) as FormGroup)?.get('questionId')?.value
      || (this.questions.at(qIndex) as FormGroup)?.get('docId')?.value;
    return fromForm ?? `q-${qIndex}`;
  }

  private restoreFormFromAttempt(attempt: QuizAttempt): void {
    if (!attempt) return;
    this.remoteQuestionResponses = attempt.remoteQuestionResponses || {};
    this.remoteSubPartResponses = attempt.remoteSubPartResponses || {};
    this.studentAnswers = attempt.studentAnswers || {};
    // derive instead of reading a flag
    this.isRemoteInput = this.hasAnyRemoteResponses();



    // step index
    if (this.innerStepper) {
      setTimeout(() => this.innerStepper.selectedIndex = attempt.currentIndex ?? 0, 0);
    }

    // timer
    if (typeof attempt.remainingSeconds === 'number' && attempt.remainingSeconds >= 0) {
      this.counter = attempt.remainingSeconds;
    }

    // answers
    for (let qIndex = 0; qIndex < this.questions.length; qIndex++) {
      const qId = this.getQuestionId(qIndex);
      const saved = attempt.answers[qId];
      if (!saved) continue;

      const q = this.questions.at(qIndex);
      const qType = q.get('questionType')?.value;

      if (qType === 'MCQ') {
        const opts = this.getOptions(qIndex);
        const selected = saved.selectedOptionIndexes ?? [];
        opts.controls.forEach((ctrl, idx) =>
          ctrl.get('attemptedOption')?.setValue(selected.includes(idx), { emitEvent: false })
        );
        if (this.innerStepper?.steps?.[qIndex]) {
          this.innerStepper.steps[qIndex].completed = selected.length > 0;
        }
      }

      if (qType === 'FILL_IN_THE_BLANKS' || qType === 'RICH_BLANKS') {
        const blanks = saved.blanks || {};
        Object.keys(blanks).forEach(blankKey => {
          const fg = q.get(blankKey) as FormGroup;
          const optsFA = fg?.get('options') as FormArray;
          const name = blanks[blankKey];
          const match = (optsFA?.value || []).find((o: any) => o.name === name) || { name: '---', isCorrect: false };
          fg?.get('selectedOption')?.setValue(match, { emitEvent: false });
          (optsFA?.controls || []).forEach((ctrl: any) =>
            ctrl.get('attemptedOption')?.setValue(ctrl.get('name')?.value === name, { emitEvent: false })
          );
        });
      }

      if (qType === 'TEXT') {
        q.get('text')?.setValue(saved.textAnswer ?? '', { emitEvent: false });
      }

      // Restore sub-part answers if available
      if (saved.subPartAnswers && saved.subPartAnswers.length > 0) {
        const subParts = this.getSubParts(qIndex);
        if (subParts && subParts.length > 0) {
          saved.subPartAnswers.forEach((spAnswer, spIndex) => {
            if (spIndex < subParts.length) {
              const spOptions = this.getSubPartOptions(qIndex, spIndex);
              if (spOptions) {
                const selectedIndexes = spAnswer.selectedOptionIndexes || [];
                spOptions.controls.forEach((ctrl, optIdx) => {
                  ctrl.get('attemptedOption')?.setValue(selectedIndexes.includes(optIdx), { emitEvent: false });
                });
              }
            }
          });
          // Initialize activeSubPartIndex for this question
          if (this.activeSubPartIndex[qIndex] === undefined) {
            this.activeSubPartIndex[qIndex] = 0;
          }
        }
      }
    }

    const idx = attempt.currentIndex ?? 0;
    this.hydrateCurrentQuestionResponses(idx);
    console.warn('restore attempt', {
      rqr: this.attempt?.remoteQuestionResponses,
      sa: this.attempt?.studentAnswers,
      idx: this.attempt?.currentIndex
    });

    this._changeDetectorRef.detectChanges();
  }

  private _beforeUnloadHandler = () => {
    const idx = this.innerStepper?.selectedIndex ?? 0;
    this.attempts.savePartial({
      currentIndex: idx,
      remoteQuestionResponses: this.remoteQuestionResponses,  // <- persist
      studentAnswers: this.studentAnswers,                    // <- persist
    });
  };

  private recomputeTrackerVisibility() {
    const isFinal = this.innerStepper?.selectedIndex === (this.innerStepper?.steps.length - 1);
    const shouldShow =
      !!this.numberBoxes?.length &&
      !isFinal &&
      this.isQuizStart &&
      this.isRemoteInput &&
      this.quizStartMode === 'remote';

    console.log(`📊 recomputeTrackerVisibility: numberBoxes=${this.numberBoxes?.length}, isFinal=${isFinal}, isQuizStart=${this.isQuizStart}, isRemoteInput=${this.isRemoteInput}, quizStartMode=${this.quizStartMode}, result=${shouldShow}`);

    this.showResponseTracker = shouldShow;
  }

  private hydrateCurrentQuestionResponses(index: number): void {
    // Check if this question has sub-parts - if so, hydrate for the active sub-part
    const hasSubParts = this.hasSubPartsEnabled(index);
    if (hasSubParts) {
      const activeSubPart = this.activeSubPartIndex[index] ?? 0;
      this.hydrateSubPartResponses(index, activeSubPart);
      return;
    }

    // Regular question without sub-parts
    const k = String(index);
    const fromMap = (this.remoteQuestionResponses && (this.remoteQuestionResponses as any)[k]) || {};

    const responders = new Set<string>(
      Object.keys(fromMap).map(m => this.normalizeMac(m))
    );

    if (responders.size === 0 && this.studentAnswers) {
      for (const [mac, perQ] of Object.entries(this.studentAnswers)) {
        const arr = (perQ as any)[index] ?? (perQ as any)[k];
        if (Array.isArray(arr) && arr.length > 0) responders.add(this.normalizeMac(mac));
      }
    }

    this.currentQuestionResponses = responders;
    this.registeredCount = responders.size;
    this.recomputeTrackerVisibility();
    this._changeDetectorRef.detectChanges();
  }

  /**
   * Hydrate response tracker for a specific sub-part
   * Similar to hydrateCurrentQuestionResponses but for sub-parts
   */
  private hydrateSubPartResponses(questionIndex: number, subPartIndex: number): void {
    const qKey = String(questionIndex);
    const spKey = String(subPartIndex);

    // Get responders from remoteSubPartResponses
    const subPartMap = this.remoteSubPartResponses?.[qKey]?.[spKey] || {};
    const responders = new Set<string>(
      Object.keys(subPartMap).map(m => this.normalizeMac(m))
    );

    this.currentQuestionResponses = responders;
    this.registeredCount = responders.size;
    this.recomputeTrackerVisibility();
  }

  private ensureTrackerHydrated(forIndex?: number) {
    const idx = (typeof forIndex === 'number')
      ? forIndex
      : (this.innerStepper?.selectedIndex ?? this.attempt?.currentIndex ?? 0);

    this.hydrateCurrentQuestionResponses(idx);
    this.recomputeTrackerVisibility();                 // ← use this instead
    this._changeDetectorRef.detectChanges();
  }

  private hasAnyRemoteResponses(): boolean {
    // from per-question map
    const fromMap = Object.values(this.remoteQuestionResponses || {})
      .some(qMap => qMap && Object.keys(qMap).length > 0);

    if (fromMap) return true;

    // from studentAnswers
    for (const perQ of Object.values(this.studentAnswers || {})) {
      for (const arr of Object.values(perQ || {})) {
        if (Array.isArray(arr) && arr.length > 0) return true;
      }
    }
    return false;
  }

  private normalizeMac(mac?: string): string {
    return (mac || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  /**
   * Reverse MAC address byte order.
   * Firestore stores MAC in reversed byte order compared to USB.
   * e.g., "701988d2ca5a" → "5acad2881970"
   */
  private reverseFirestoreMac(mac: string): string {
    const normalized = this.normalizeMac(mac);
    if (normalized.length !== 12) return normalized; // Not a valid MAC, return as-is

    // Split into 2-char bytes and reverse
    const bytes: string[] = [];
    for (let i = 0; i < 12; i += 2) {
      bytes.push(normalized.substring(i, i + 2));
    }
    return bytes.reverse().join('');
  }

  /**
   * Converts button letter from Firestore to numeric value.
   * Firestore stores: A, B, C, D, E, F, G, etc.
   * Expected numeric: A=1, B=2, C=3, D=4, E=5, F=6, G=7, etc.
   */
  private buttonLetterToNumber(button: string): number {
    if (!button) return -1;

    const letter = button.trim().toUpperCase();

    // If it's already a number string, parse it
    const numericValue = Number(letter);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }

    // Convert letter to number: A=1, B=2, C=3, etc.
    if (letter.length === 1 && letter >= 'A' && letter <= 'Z') {
      return letter.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    }

    return -1;
  }

  private hasResponsesFor(qIndex: number): boolean {
    const k = String(qIndex);
    if (this.remoteQuestionResponses?.[k] && Object.keys(this.remoteQuestionResponses[k]).length > 0) {
      return true;
    }
    for (const perQ of Object.values(this.studentAnswers || {})) {
      const arr = (perQ as any)[qIndex] ?? (perQ as any)[k];
      if (Array.isArray(arr) && arr.length > 0) return true;
    }
    return false;
  }

  private pickInitialIndex(): number {
    // Prefer Q1 (index 0) if it already has responses
    if (this.hasResponsesFor(0)) return 0;
    return this.attempt?.currentIndex ?? 0;
  }

  /** Strip HTML to plain text and drop any images (incl. data-URIs) */
  private htmlToText(html: string | undefined | null): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;

    // Remove any images so base64 src never leaks into text
    div.querySelectorAll('img, picture, figure').forEach(el => el.remove());

    // Extract clean text
    const text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();

    // Extra guard: if any base64-like chunk sneaks in as text, drop it
    return text.replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi, '').trim();
  }

  /** Remove leading numbering like "3.", "3)", "Q3.", "Question 3:" etc. */
  private stripLeadingIndex(s: string): string {
    return s.replace(/^\s*(?:q(?:uestion)?\s*)?\d{1,3}\s*[\.\)\-–—:]\s*/i, '').trim();
  }

  /** Get correct indices for a question from the value model */
  private getCorrectIndicesFromValue(q: any): number[] {
    const opts = Array.isArray(q?.options) ? q.options : [];
    const isTrue = (v: any) => v === true || v === 'true' || v === 1 || v === '1';
    const indices: number[] = [];
    opts.forEach((opt: any, idx: number) => {
      if (isTrue(opt?.isCorrect)) indices.push(idx);
    });
    return indices;
  }

  /** Safely get selected indices for question i from a student's answer map */
  private getSelectedForQuestion(answersPerQuestion: any, i: number): number[] {
    const v = answersPerQuestion?.[i] ?? answersPerQuestion?.[String(i)] ?? [];
    return Array.isArray(v) ? v : [];
  }

  async exportToExcel() {
    const institutionData = await this.institutionService.getWithId(this.params?.institutionId).toPromise();
    const classroomData = await this.classroomService.getClassroomByIdOnce(this.params?.classroomId).toPromise();
    const classroomName = classroomData.data()?.classroomName || 'Unknown Classroom';
    const baseQuestions: any[] =
      (this.questionsFormGroup?.value?.questions as any[]) ?? [];
    const totalQuestions =
      baseQuestions.length || this.quizInfo?.totalQuestions || 0;

    const totalStudents =
      this.sortedRemoteMappings?.length ||
      Object.keys(this.macNameMap || {}).length ||
      Object.keys(this.studentAnswers || {}).length ||
      0;

    const rows: Array<{
      'Question No.': string;              // <-- string now (Q1, Q2…)
      'Question Description': string;
      'Correct Count': number;
      'Percentage': string;
    }> = [];

    for (let i = 0; i < totalQuestions; i++) {
      const qVal = baseQuestions[i] || {};
      const raw = this.htmlToText(qVal.questionTitle || qVal.questionText);
      const description = this.stripLeadingIndex(raw);

      const correctIndices = this.getCorrectIndicesFromValue(qVal);
      let correctCount = 0;

      for (const answersPerQuestion of Object.values(this.studentAnswers || {})) {
        const selected: number[] = this.getSelectedForQuestion(answersPerQuestion, i);
        const isCorrect =
          selected.length === correctIndices.length &&
          selected.every((idx) => correctIndices.includes(idx));
        if (isCorrect) correctCount++;
      }

      const percentage =
        totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0;

      rows.push({
        'Question No.': `Q${i + 1}`,       // <-- here
        'Question Description': description || `Q${i + 1}`,
        'Correct Count': correctCount,
        'Percentage': `${percentage}%`,
      });
    }

    const header = ['Question No.', 'Question Description', 'Correct Count', 'Percentage'];
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows, { header });

    (ws['!cols'] as any) = [
      { wch: 10 }, // Question No.
      { wch: 70 }, // Question Description
      { wch: 14 }, // Correct Count
      { wch: 12 }, // Percentage
    ];

    const wb: XLSX.WorkBook = {
      SheetNames: ['Question Accuracy'],
      Sheets: { 'Question Accuracy': ws },
    };

    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, `${institutionData.institutionName}_${classroomName}_${this.quizInfo.displayName}.xlsx`);
  }

  generateLiveResults(): void {
    const totalQuestions = this.quizInfo.totalQuestions ?? 0;
    const accessCodeMap = new Map(
      this.sortedRemoteMappings.map(m => [m.studentDocId, m.accessCode])
    );

    const results: {
      mac: string;
      name: string;
      questionIndex: number;
      selectedOptions: number[];
      score: number;
    }[] = [];

    const studentScoreMap: { [name: string]: number } = {};
    const studentAttemptCountMap: { [name: string]: number } = {};

    for (const [mac, answersPerQuestion] of Object.entries(this.studentAnswers)) {
      const studentDocId = this.macNameMap[mac];
      const name = accessCodeMap.get(studentDocId) || 'Unknown';

      let score = 0;

      for (const [qIndexStr, selected] of Object.entries(answersPerQuestion)) {
        const qIndex = parseInt(qIndexStr, 10);
        const options = this.getOptions(qIndex);
        const correctIndices = options.controls
          .map((ctrl, idx) => ctrl.get('isCorrect').value ? idx : null)
          .filter(i => i !== null);

        const isCorrect =
          selected.length === correctIndices.length &&
          selected.every(idx => correctIndices.includes(idx));

        if (isCorrect) score++;

        // Save each response
        results.push({
          mac,
          name,
          questionIndex: qIndex,
          selectedOptions: selected,
          score: isCorrect ? 1 : 0
        });
      }

      // Save total score and attempted count
      studentScoreMap[name] = score;
      studentAttemptCountMap[name] = Object.keys(answersPerQuestion).length;
    }

    // Calculate percentage map for easier rendering
    this.studentScores = {};
    for (const name of Object.keys(studentScoreMap)) {
      const correct = studentScoreMap[name];
      const attempted = studentAttemptCountMap[name];
      this.studentScores[name] = Math.round((correct / attempted) * 100); // percentage
    }

    // Sort by question index for better UI
    this.liveResults = results.sort((a, b) => a.questionIndex - b.questionIndex);
    // ✅ Build per-question correct count and % stats
    const questionWiseCorrectMap: { [qIndex: number]: number } = {};

    for (const result of results) {
      if (result.score === 1) {
        questionWiseCorrectMap[result.questionIndex] = (questionWiseCorrectMap[result.questionIndex] || 0) + 1;
      }
    }

    // Total number of students
    const totalStudents = Object.keys(this.studentAnswers).length;

    // Build final display array
    this.questionWiseStats = [];
    for (let i = 0; i < totalQuestions; i++) {
      const correct = questionWiseCorrectMap[i] || 0;
      const percentage = totalStudents > 0 ? Math.round((correct / totalStudents) * 100) : 0;

      this.questionWiseStats.push({
        question: `Q${i + 1}`,
        correctCount: correct,
        percentage: `${percentage}%`
      });
    }

    this._changeDetectorRef.detectChanges();

  }

  async downloadQuestionAccuracyPdf() {
    const institutionData = await this.institutionService.getWithId(this.params?.institutionId).toPromise();
    const classroomData = await this.classroomService.getClassroomByIdOnce(this.params?.classroomId).toPromise();
    const classroomName = classroomData.data()?.classroomName || 'Unknown Classroom';
    const tableBody = [
      [
        { text: 'Question', style: 'tableHeader' },
        { text: 'Correct Count', style: 'tableHeader' },
        { text: 'Percentage', style: 'tableHeader' }
      ]
    ];

    for (const q of this.questionWiseStats) {
      tableBody.push([
        { text: q.question, style: '' },
        { text: q.correctCount.toString(), style: '' },
        { text: q.percentage.toString(), style: '' }
      ]);
    }

    const docDefinition: any = {
      content: [
        { text: 'Question-wise Accuracy Report', style: 'header' },
        {
          table: {
            widths: ['auto', '*', '*'],
            body: tableBody
          },
          layout: 'lightHorizontalLines',
          margin: [0, 10, 0, 0]
        }
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          alignment: 'center',
          margin: [0, 0, 0, 10]
        },
        tableHeader: {
          bold: true,
          fillColor: '#eeeeee',
        }
      }
    };

    pdfMake.createPdf(docDefinition).download(`${institutionData.institutionName}_${classroomName}_${this.quizInfo.displayName}.pdf`);
  }

  private blockRapid(mac: string, value: number): boolean {
    const now = Date.now();
    if (
      this._lastRemote.mac === mac &&
      this._lastRemote.value === value &&
      now - this._lastRemote.ts < 180 // adjust if needed
    ) {
      return true;
    }
    this._lastRemote = { mac, value, ts: now };
    return false;
  }

  //CASE STUDY METHODS

  /**
   * Build case study state from quizInfo.backgroundInfo
   */
  private loadCaseStudyFromQuizInfo(): void {
    // Show case study ONLY for classroom learning unit quizzes
    if (!this.params?.programmeId) {
      this.hasCaseStudy = false;
      return;
    }

    const bg = this.quizInfo?.backgroundInfo;
    const title = (bg?.title || '').trim();
    const desc = (bg?.description || '').trim();

    this.caseStudyTitle = title || 'Case Study';
    this.caseStudyHtmlSafe = this.sanitizer.bypassSecurityTrustHtml(desc || '');
    this.hasCaseStudy = !!(title || desc);
  }

  /**
   * Continue from case study → start real quiz flow
   */
  async onContinueFromCaseStudy(): Promise<void> {
    this.showCaseStudy = false;
    await this.startQuizCore();
  }

  /**
   * Back button on case study
   */
  closeCaseStudy(): void {
    this.showCaseStudy = false;
    this.isQuizStart = false;
    this.drawerService.setQuizStarted(false);
    this.exitFullscreen();
    this._changeDetectorRef.detectChanges();
  }

  /**
   * Pause timer when opening case study dialog
   */
  private pauseQuizTimer(reason = 'Case study opened'): void {
    this.wasTimerPausedBeforeDialog = this.isTimerPaused;
    this.isTimerPaused = true;
    this.attempts.savePartial({ remainingSeconds: this.getDisplayTime() });
  }

  /**
   * Resume timer when closing case study dialog
   */
  private resumeQuizTimer(reason = 'Case study closed'): void {
    this.isTimerPaused = this.wasTimerPausedBeforeDialog;
  }

  /**
   * Open case study dialog during quiz
   */
  openCaseStudyDialog(): void {
    if (!this.hasCaseStudy) return;

    this.pauseQuizTimer();

    const dialogRef: MatDialogRef<CaseStudyDialogComponent> = this.dialog.open(CaseStudyDialogComponent, {
      width: '80vw',
      maxWidth: '90vw',
      height: '90vh',
      maxHeight: '90vh',
      panelClass: 'case-study-dialog-panel',
      autoFocus: false,
      disableClose: true,
      data: {
        title: this.caseStudyTitle || 'Case Study',
        html: this.quizInfo?.backgroundInfo?.description || ''
      }
    });

    dialogRef.afterClosed().subscribe(() => {
      this.resumeQuizTimer();
      this._changeDetectorRef.detectChanges();
    });
  }


  //SUB-PARTS METHODS

  /**
   * Creates a new sub-part FormGroup for quiz attendance
   */
  newSubPart(content?: any): FormGroup {
    const subPartGroup = this.fb.group({
      label: [content?.label || 'a'],
      subPartTitle: [content?.subPartTitle || ''],
      marks: [content?.marks || 1],
      oneCorrectOption: [content?.oneCorrectOption ?? true],
      options: this.fb.array([]),
    });

    const optionsArr = subPartGroup.get('options') as FormArray;
    if (content?.options && content.options.length > 0) {
      content.options.forEach((opt: any) => {
        optionsArr.push(this.newOption(opt));
      });
    }

    return subPartGroup;
  }

  /**
   * Get sub-parts FormArray for a question
   */
  getSubParts(questionIndex: number): FormArray {
    return this.questions.at(questionIndex)?.get('subParts') as FormArray;
  }

  /**
   * Check if question has sub-parts enabled
   */
  hasSubPartsEnabled(questionIndex: number): boolean {
    const question = this.questions.at(questionIndex);
    return question?.get('hasSubParts')?.value || false;
  }

  /**
   * Set active sub-part for navigation
   */
  setActiveSubPart(questionIndex: number, subPartIndex: number): void {
    this.activeSubPartIndex[questionIndex] = subPartIndex;

    // Refresh response tracker for the new sub-part
    this.hydrateSubPartResponses(questionIndex, subPartIndex);

    this._changeDetectorRef.detectChanges();
  }

  /**
   * Get options for a specific sub-part
   */
  getSubPartOptions(questionIndex: number, subPartIndex: number): FormArray {
    const subParts = this.getSubParts(questionIndex);
    if (!subParts || !subParts.at(subPartIndex)) return null;
    return subParts.at(subPartIndex).get('options') as FormArray;
  }

  /**
   * Handle sub-part option selection (Manual mode)
   */
  onSubPartOptionSelected(questionIndex: number, subPartIndex: number, optionIndex: number): void {
    const options = this.getSubPartOptions(questionIndex, subPartIndex);
    if (!options) return;

    const subPart = this.getSubParts(questionIndex).at(subPartIndex);
    const isSingleCorrect = subPart.get('oneCorrectOption').value;

    if (isSingleCorrect) {
      options.controls.forEach((opt, idx) => {
        opt.patchValue({ attemptedOption: idx === optionIndex });
      });
    } else {
      const currentValue = options.at(optionIndex).get('attemptedOption').value;
      options.at(optionIndex).patchValue({ attemptedOption: !currentValue });
    }

    if (this.innerStepper?.steps?.[questionIndex]) {
      this.innerStepper.steps[questionIndex].completed = this.isAnyOptionSelected(questionIndex);
    }

    // Persist answer to IndexedDB (same as main question)
    const answer = this.buildAnswerFromForm(questionIndex);
    this.attempts.recordAnswer(this.getQuestionId(questionIndex), answer);

    this._changeDetectorRef.detectChanges();
  }

  /**
   * Handle sub-part option selection from remote input
   * Similar to onOptionSelected but for sub-parts
   */
  onSubPartOptionSelectedRemote(questionIndex: number, subPartIndex: number, optionIndex: number): void {
    const options = this.getSubPartOptions(questionIndex, subPartIndex);
    if (!options || !options.at(optionIndex)) return;

    const subPart = this.getSubParts(questionIndex).at(subPartIndex);
    const isSingleCorrect = subPart.get('oneCorrectOption').value;

    this.isRemoteInput = true;

    // Update form controls (same as manual selection)
    if (isSingleCorrect) {
      options.controls.forEach((opt, idx) => {
        opt.patchValue({ attemptedOption: idx === optionIndex });
      });
    } else {
      const currentValue = options.at(optionIndex).get('attemptedOption').value;
      options.at(optionIndex).patchValue({ attemptedOption: !currentValue });
    }

    // Update remote sub-part responses for tracking
    if (this.selectedMac) {
      const mac = this.normalizeMac(this.selectedMac);
      const qKey = String(questionIndex);
      const spKey = String(subPartIndex);

      if (!this.remoteSubPartResponses[qKey]) {
        this.remoteSubPartResponses[qKey] = {};
      }
      if (!this.remoteSubPartResponses[qKey][spKey]) {
        this.remoteSubPartResponses[qKey][spKey] = {};
      }

      if (isSingleCorrect) {
        this.remoteSubPartResponses[qKey][spKey][mac] = [optionIndex];
      } else {
        const selected = this.remoteSubPartResponses[qKey][spKey][mac] || [];
        const pos = selected.indexOf(optionIndex);
        if (pos >= 0) {
          selected.splice(pos, 1);
        } else {
          selected.push(optionIndex);
        }
        this.remoteSubPartResponses[qKey][spKey][mac] = [...selected];
      }
    }

    // Update stepper completion status
    if (this.innerStepper?.steps?.[questionIndex]) {
      this.innerStepper.steps[questionIndex].completed = this.isAnyOptionSelected(questionIndex);
    }

    this.completedSteps.add(questionIndex);

    // Persist answer
    const answer = this.buildAnswerFromForm(questionIndex);
    this.attempts.recordAnswer(this.getQuestionId(questionIndex), answer);

    setTimeout(() => this._changeDetectorRef.detectChanges(), 0);
  }

  /**
   * Check if any sub-part option is selected for a question
   */
  isAnySubPartOptionSelected(questionIndex: number): boolean {
    const subParts = this.getSubParts(questionIndex);
    if (!subParts || subParts.length === 0) return true;

    for (let i = 0; i < subParts.length; i++) {
      const options = this.getSubPartOptions(questionIndex, i);
      if (options) {
        const hasSelection = options.controls.some(opt => opt.get('attemptedOption')?.value === true);
        if (!hasSelection) return false;
      }
    }
    return true;
  }

  /**
   * Get completion status for each sub-part
   */
  getSubPartCompletionStatus(questionIndex: number): boolean[] {
    const subParts = this.getSubParts(questionIndex);
    if (!subParts) return [];

    const status: boolean[] = [];
    for (let i = 0; i < subParts.length; i++) {
      const options = this.getSubPartOptions(questionIndex, i);
      if (options) {
        const hasSelection = options.controls.some(opt => opt.get('attemptedOption')?.value === true);
        status.push(hasSelection);
      } else {
        status.push(false);
      }
    }
    return status;
  }


  //TEXT ANSWER METHODS

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

    if (charCount > 0) {
      this.completedSteps.add(questionIndex);
      if (this.innerStepper?.steps?.[questionIndex]) {
        this.innerStepper.steps[questionIndex].completed = true;
      }
    }

    const answer = this.buildAnswerFromForm(questionIndex);
    this.attempts.recordAnswer(this.getQuestionId(questionIndex), answer);

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
    let text = tempDiv.textContent || tempDiv.innerText || '';
    text = text.replace(/\s+/g, ' ').trim();
    return text;
  }


  private enterQuizShell(): void {
    if (this.isQuizStart) return;

    this.closeNavigation();
    this.isQuizStart = true;
    this.drawerService.setQuizStarted(true);

    this._changeDetectorRef.detectChanges();
  }

  goToPreviousStepsForManual(): void {
    const selectedIndex = this.innerStepper?.selectedIndex ?? 0;
    if (selectedIndex <= 0) return;

    this.innerStepper.previous();
    const prev = this.innerStepper.selectedIndex;

    this.ensureFocusDefaults(prev);
    this.setFocusToQuestion(prev);
    this.hydrateCurrentQuestionResponses(prev);
    this.attempts.jumpTo(prev);

    this.isTimerPaused = false;
    this.startCountdownForCurrentStep(prev);

    this._changeDetectorRef.detectChanges();
  }
}
