import { Component, EventEmitter, Inject, OnInit, Output, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CategoriesContestComponent } from './categories-contest/categories-contest.component';

@Component({
  selector: 'app-contest-challenge-type-dialog',
  templateUrl: './contest-challenge-type-dialog.component.html',
  styleUrls: ['./contest-challenge-type-dialog.component.scss']
})
export class ContestChallengeTypeDialogComponent implements OnInit {
  @Output() catchContestVisibilityEvent = new EventEmitter<any>();
  @ViewChild(CategoriesContestComponent) categoriesRef: CategoriesContestComponent;


  contestBasicInfo;
  contestCategoryInfo;
  contestStagesInfo;
  contestVisibiltyInfo;
  Create: any;
  contestDoc;
  isupdate: boolean = false;

  isContestGradeclassroomdependent: boolean = false;

  allInst: any[] = [];
  visible = true;
  

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) { }

  async ngOnInit() {

    this.isupdate = this.data.isupdate;

  
  }

  catchBasicInfoEvent(event) {
    if (this.data.isupdate) {
      this.contestDoc = { docId: this.data.contestInfo.docId };
    }
    else {
      this.contestDoc = { docId: event.docId };
    };
    this.contestBasicInfo = event;
  }

  catchCategoryInfoEvent(event) {
    this.contestCategoryInfo = event;
  }

  catchStageInfoEvent(event) {
    this.contestStagesInfo = event;
  }

  catchContestVisibiltyEvent(event) {
    this.contestVisibiltyInfo = event;
  }

  handleClassorStemClubDependent(event) {
    this.isContestGradeclassroomdependent = event;
  }

}
