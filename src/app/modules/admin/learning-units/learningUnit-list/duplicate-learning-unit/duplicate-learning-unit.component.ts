import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-duplicate-learning-unit',
  templateUrl: './duplicate-learning-unit.component.html',
  styleUrls: ['./duplicate-learning-unit.component.scss']
})
export class DuplicateLearningUnitComponent implements OnInit {
  @Input() luDetailsInput: any;

  constructor() { }

  ngOnInit(): void {
    console.log(this.luDetailsInput);
  }

}
