import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { BehaviorSubject, interval, Observable, PartialObserver, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-mcq',
  templateUrl: './mcq.component.html',
  styleUrls: ['./mcq.component.scss']
})
export class McqComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() quizData
  @Input() indexObj
  @Input() qusBehaviorSub: BehaviorSubject<any>
  @Output() emitter = new EventEmitter();
  @Input() lastStep;




  runningSub = new Subject
  openTab = 1;
  @ViewChild('videoRef')
  videoRef: ElementRef;
  progressNum = 0;
  timer$: Observable<number>;
  timerObserver: PartialObserver<number>;
  stopClick$ = new Subject();
  pauseClick$ = new Subject();
  mcq: FormGroup
  constructor(
    private fb: FormBuilder,

  ) {

  }
  ngAfterViewInit(): void {



  }
  ngOnChanges(): void {
  }

  ngOnInit(): void {
    this.newForm(this.quizData)
    if (this.quizData?.optionalResource) {
      this.toggleTabs(0)
    }
    this.mcq.valueChanges.subscribe(res => {
    

      let value = this.qusBehaviorSub.value
      value[this.quizData.order-1] = res
      this.qusBehaviorSub.next(value)
    })
  }

  
  newForm(quizInfo) {
    this.mcq = this.fb.group({
      questionTitle: [quizInfo?.questionTitle || ''],
      oneCorrectOption: [quizInfo?.oneCorrectOption],
      questionType: [quizInfo?.questionType],
      pedagogyType: [quizInfo?.pedagogyType],
      marks: [quizInfo?.marks],
      options: this.fb.array(quizInfo.options.map(a => this.newOption(a))),
      optionalResource: [quizInfo?.optionalResource],
      // optionalResource: this.fb.array([]),
    });
  }

  
  newOption(a): FormGroup {
    return this.fb.group({
      name: [a?.name],
      isCorrect: [a?.isCorrect],
      attemptedOption: [false]
    });
  }
  getOneCorrectOption() {
    const statusValue = this.quizData?.oneCorrectOption;
    return statusValue
  }

  change() {
  }
  toggleTabs($tabNumber: number) {
    this.openTab = $tabNumber;
  }

  timeRunning() {
    this.timer$ = interval(1000).pipe(
      takeUntil(this.pauseClick$),
      takeUntil(this.stopClick$)
    );

    this.timerObserver = {
      next: (_: number) => {
        if (this.progressNum < 1800) {
          this.progressNum += 1;
        } else {
          this.stopClick$.next('');
        }
      },
    };
    this.timer$.subscribe(this.timerObserver)

  }

  pause() {
    this.pauseClick$.next('');
  }


  singleCorrectOptionSetRadio(optionIndex) {
    const optionsArr = (this.mcq.get('options') as FormArray);
    optionsArr.value.map(d => d.attemptedOption = false);
    optionsArr.at(optionIndex).patchValue({
      attemptedOption: true
    })  }

  onSubmit() {
    this.emitter.emit(this.qusBehaviorSub.value)
  }
}


