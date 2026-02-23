import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { Category, FirstStageSubmType } from 'app/core/dbOperations/contests/contest.types';
import { Subject, take } from 'rxjs';
import { CreateSubmissionComponent } from '../create-submission/create-submission.component';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';

@Component({
  selector: 'app-contest-card',
  templateUrl: './contest-card.component.html',
  styleUrls: ['./contest-card.component.scss']
})
export class ContestCardComponent implements OnInit, OnDestroy {
  // categories: Category[];
  // courses: FirstStageSubmType[];
  // filteredCourses: FirstStageSubmType[];

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
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private afs: AngularFirestore,
    private dialog: MatDialog,
    private contestWorkflowService: ContestWorkflowService
  ) {

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
  async ngOnInit(): Promise<void> {

    // let aa = await this.afs.doc('/Assignments/1mFrfUi7DRlAtAAGdzmf').get().toPromise();
    // this.afs.collection('Assignments').add(aa.data())

    if (this.activatedRoute.queryParams) {
      const routeSub = this.activatedRoute.queryParams.subscribe(async (res) => {
        // console.log(res);
        const contestId = res.contestId;
        const stageId = res.stageId;
        this.handleQueryParams(contestId, stageId);
      });
      this.subcriptionArr.push(routeSub);
    }
  }
  getWorkflow(submId: string) {
    console.log(submId);
    this.router.navigate(['workflow'],
      {
        queryParams: { submId: submId },
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge'
      });
    this.contestWorkflowService.isGoBackVisible = true;
  }
  addNewSubm() {
    const dialogRef = this.dialog.open(CreateSubmissionComponent, {
      data: this.selectedContest,
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



