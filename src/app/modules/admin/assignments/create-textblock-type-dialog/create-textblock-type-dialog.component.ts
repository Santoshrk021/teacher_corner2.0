import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-create-textblock-type-dialog',
  templateUrl: './create-textblock-type-dialog.component.html',
  styleUrls: ['./create-textblock-type-dialog.component.scss']
})
export class CreateTextblockTypeDialogComponent implements OnInit {
  basicInfo: any;
  qusInfo: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit(): void {
  }

  catchBasicInfoEvent(event) {
    this.basicInfo = event;
  }

  catchQusInfoEvent(event) {
    this.qusInfo = event;
  }


}
