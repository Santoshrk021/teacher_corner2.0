import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { interval, Observable, PartialObserver, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-rich-blanks',
  templateUrl: './rich-blanks.component.html',
  styleUrls: ['./rich-blanks.component.scss']
})
export class RichBlanksComponent implements OnInit,OnChanges {
  @Input() quizData;
  @Input() indexObj;
  qusForm: FormGroup<any>;
  openTab: number;


  progressNum = 0;
  timer$: Observable<number>;
  timerObserver: PartialObserver<number>;
  stopClick$ = new Subject();
  pauseClick$ = new Subject();
  constructor(
    private fb: FormBuilder,

  ) { }

  qus(ques): FormGroup {
    // const quesTitles: [] = ques.Title.split('<<blank>>');
    return this.fb.group({
      questionTitle: ques.Title,
      questionType: ques.QuestionType,
      pedagogyType: ques.PedagogyType,
      marks: ques.Marks,
      TACtivity: ques.TACtivity,
      Blanks: this.fb.group({}),
      BlanksObj: ques.Blanks,
      // QuesSplit: this.fb.array(quesTitles),
      TimeBound: ques?.TimeBound ? ques.TimeBound : 0,
      TimeTaken: ques?.TimeBound ? ques.TimeBound : 0,
    });
  }
  ngOnInit(): void {
    this.qusForm = this.qus(this.quizData);
    if (this.quizData.Resources) {
      this.toggleTabs(0);
    }
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
