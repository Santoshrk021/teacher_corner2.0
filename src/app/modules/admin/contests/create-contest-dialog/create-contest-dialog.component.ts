import { Component, Inject, Input, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-create-contest-dialog',
  templateUrl: './create-contest-dialog.component.html',
  styleUrls: ['./create-contest-dialog.component.scss']
})
export class CreateContestDialogComponent implements OnInit {
  contestBasicInfo;
  contestQusInfo;

  constructor(@Inject(MAT_DIALOG_DATA) public data: any,) { }

  ngOnInit(): void {
  }
  catchBasicInfoEvent(event) {
    this.contestBasicInfo = event;

  }
  catchStageInfoEvent(event) {
    this.contestQusInfo = event;
  }
}
