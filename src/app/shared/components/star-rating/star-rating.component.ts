import { AfterViewInit, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-star-rating',
  templateUrl: './star-rating.component.html',
  styleUrls: ['./star-rating.component.scss']
})
export class StarRatingComponent implements OnInit, AfterViewInit {
  @Output() ratingInfo: EventEmitter<any> = new EventEmitter();
  @Input() question;


  rating: number = 0;

  constructor() { }
  ngAfterViewInit(): void {

    setTimeout(()=>{
      if (this.question) {
        this.rating = this.question.answer;
      }
    },2000);
  }

  ngOnInit(): void {

  }

  setRating(value: number) {
    this.rating = value;
    this.ratingInfo.emit(value);
  }

}
