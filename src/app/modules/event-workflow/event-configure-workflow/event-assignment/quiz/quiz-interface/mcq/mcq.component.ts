import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { interval, Observable, PartialObserver, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-mcq',
  templateUrl: './mcq.component.html',
  styleUrls: ['./mcq.component.scss']
})
export class McqComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() quizData;
  @Input() indexObj;



  runningSub = new Subject();
  openTab = 1;
  @ViewChild('videoRef')
  videoRef: ElementRef;
  progressNum = 0;
  timer$: Observable<number>;
  timerObserver: PartialObserver<number>;
  stopClick$ = new Subject();
  pauseClick$ = new Subject();
  mcq: FormGroup;
  constructor(
    private fb: FormBuilder,

  ) {

  }
  ngAfterViewInit(): void {



  }
  ngOnChanges(): void {
  }

  ngOnInit(): void {

    // console.log(this.quizData);
    this.newForm(this.quizData);
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

    // console.log(this.mcq);

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
    return statusValue;
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
    this.timer$.subscribe(this.timerObserver);

  }

  pause() {
    this.pauseClick$.next('');
  }


  singleCorrectOptionSetRadio(optionIndex) {
    const optionsArr = this.mcq.get('options').value;
    optionsArr.map(d => d.attemptedOption = false);
    optionsArr[optionIndex].attemptedOption = true;
  }

}


