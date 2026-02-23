import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { BehaviorSubject, interval, Observable, PartialObserver, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-text',
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.scss']
})
export class TextComponent implements OnInit,OnChanges {
  @Input() quizData 
  @Input() indexObj
  @Input() index
  @Input() qusBehaviorSub:BehaviorSubject<any> 
  openTab: number;


  progressNum = 0;
  timer$: Observable<number>;
  timerObserver: PartialObserver<number>;
  stopClick$ = new Subject();
  pauseClick$ = new Subject();
  constructor() { }

  ngOnInit(): void {
    
    if (this.quizData?.optionalResource) {
      this.toggleTabs(0)
    }
  }

  ngOnChanges(): void {
    if (this.indexObj != undefined) {
      if (this.indexObj?.currentOrder == this.indexObj?.order) {
        this.timeRunning()
      }
      if (this.indexObj?.currentOrder != this.indexObj?.order) {
        this.pause()
      }
    }
  }
  getOneCorrectOption() {
    const statusValue = this.quizData?.OneCorrectOption;
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
}
