import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-event-workshop-dialog',
  templateUrl: './event-workshop-dialog.component.html',
  styleUrls: ['./event-workshop-dialog.component.scss']
})
export class EventWorkshopDialogComponent implements OnInit {
  eventBasicInfo: any;
  eventBatchInfo: any;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any) { }

  ngOnInit(): void {
  }

  catchBasicInfoEvent(event){
    this.eventBasicInfo=event;
  }
  catchBatchInfoEvent(event){
    this.eventBatchInfo=event;
  }
}
