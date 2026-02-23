import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { interval, Observable, PartialObserver, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-fill-blanks',
  templateUrl: './fill-blanks.component.html',
  styleUrls: ['./fill-blanks.component.scss']
})
export class FillBlanksComponent implements OnInit, OnChanges {
  @Input() quizData;
  @Input() indexObj;
  qusForm: FormGroup;
  openTab: number;

  progressNum = 0;
  timer$: Observable<number>;
  timerObserver: PartialObserver<number>;
  stopClick$ = new Subject();
  pauseClick$ = new Subject();
  constructor(
    private fb: FormBuilder,
  ) { }

  newForm(ques) {
    const quesTitles: [] = ques.questionTitle.split('<<blank>>');
    this.qusForm = this.fb.group({
      questionTitle: [ques.questionTitle],
      questionType: [ques.questionType],
      pedagogyType: [ques.pedagogyType],
      marks: [ques.marks],
      blanks: this.fb.group({}),
      optionalResource: this.fb.array([]),
      options: this.fb.array([]),
      blanksObj: [ques.blanks],
      quesSplit: this.fb.array(quesTitles),
      // selectedOption: [],
    });

    for (const [blankName, optionsArr] of Object.entries(ques.blanks)) {
      this.addBlank(blankName, optionsArr);
    }
    // console.log(this.qusForm);

  }
  addBlank(blankName, optionsArr) {
    this.qusForm.addControl(blankName, this.fb.group({
      options: this.fb.array(optionsArr.map(a => this.newOption(a))),
      selectedOption: this.fb.control({
        Title: '---',
        Correct: false,
      })
    }));
    // formGroup.addControl('SelectedOption', this.fb.control(''));
  }

  newOption(a): FormGroup {
    return this.fb.group({
      name: [a?.name],
      isCorrect: [a?.isCorrect],
      attemptedOption: [false]
    });
  }
  ngOnInit(): void {
    // console.log(this.quizData);
    this.newForm(this.quizData);
  }

  ngOnChanges(): void {
    if (this.indexObj != undefined) {
      if (this.indexObj?.currentOrder == this.indexObj?.order) {
        this.timeRunning();

      }
      if (this.indexObj?.currentOrder != this.indexObj?.order) {
        this.pause();
      }
    }
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
}
