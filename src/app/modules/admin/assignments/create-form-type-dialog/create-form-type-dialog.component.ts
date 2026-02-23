import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-create-form-type-dialog',
  templateUrl: './create-form-type-dialog.component.html',
  styleUrls: ['./create-form-type-dialog.component.scss']
})
export class CreateFormTypeDialogComponent implements OnInit {
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
