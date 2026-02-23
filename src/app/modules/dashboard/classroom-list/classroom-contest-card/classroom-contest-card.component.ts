import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';
import { CreateSubmissionComponent } from 'app/modules/contest-workflow/create-submission/create-submission.component';
import { Subject, take } from 'rxjs';

@Component({
  selector: 'app-classroom-contest-card',
  templateUrl: './classroom-contest-card.component.html',
  styleUrls: ['./classroom-contest-card.component.scss']
})
export class ClassroomContestCardComponent implements OnInit, OnChanges {
  @Input() stageData;
  @Input() currentQueryparams;

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  subcriptionArr = [];
  selectedContest = {
    rawContest: {},
    allSubmissions: [],
    contestId: '',
    stageId: '',
    allowedSubmission: 0,
  };
  constructor(
    private contestService: ContestService,
    private router: Router,
    private dialog: MatDialog,
    private contestWorkflowService: ContestWorkflowService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    const contestId = this.stageData.contest.docId;
    const stageId = this.stageData.stageName.stageId;
    this.handleQueryParams(contestId, stageId);
  }

  ngOnInit(): void {
  }

  handleQueryParams(contestId, stageId) {

    const subSubj = this.contestService.getSelectedContest(contestId).pipe(take(1)).subscribe((contest: any) => {
      const selectedStage = this.contestService.getStages(contest.stagesNames, stageId);
      this.selectedContest.allSubmissions = selectedStage?.submissions != undefined ? selectedStage?.submissions : [];
      this.selectedContest.stageId = stageId;
      this.selectedContest.contestId = contestId;
      this.selectedContest.rawContest = contest;
      this.selectedContest.allowedSubmission = selectedStage.numberOfAllowedSubmissions;

      // this._changeDetectorRef.markForCheck();
    });
    this.subcriptionArr.push(subSubj);
  }

  getWorkflow(submId: string) {

    this.contestService.currentcontestParams.next(this.currentQueryparams);

    this.router.navigate(['contests-config', this.stageData.contest.docId,'workflow'], {
      queryParams: {
        contestId: this.stageData.contest.docId,
        stageId: this.stageData.stageName.stageId,
        submId: submId,
       // currentParams:this.currentQueryparams
      },
    });
    this.contestWorkflowService.isGoBackVisible=false;
  }
  addNewSubm() {
    const dialogRef = this.dialog.open(CreateSubmissionComponent, {
      data: this.selectedContest,
    });

    dialogRef.afterClosed().subscribe((res) => {
      if (res == 'success') {
        this.handleQueryParams(this.selectedContest.contestId, this.stageData.stageName.stageId);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.subcriptionArr.length) {
      // this.subcriptionArr.map(sub => sub.unsubcribe())
    }
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }
}
