import { Component, ElementRef, Input, NgZone, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-learn-tabs',
  templateUrl: './learn-tabs.component.html',
  styleUrls: ['./learn-tabs.component.scss']
})
export class LearnTabsComponent implements OnInit  {
  @Input() tacData;



  constructor(
  ) { }

  ngOnInit(): void {
  }


}


