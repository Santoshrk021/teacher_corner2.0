import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { EventWorkflowService } from 'app/core/dbOperations/eventworkflows/event-workflow.service';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { Subject, takeUntil } from 'rxjs';
import { SharedService } from 'app/shared/shared.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit,OnDestroy {
  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;

  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  currentStep: number = 1;
  currentWorkflow;
  workflowInfo;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    private router: Router,
    private activateRoute: ActivatedRoute,
    private _changeDetectorRef: ChangeDetectorRef,
    private eventWorkflowService: EventWorkflowService,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private sharedService: SharedService,

  ) { }
  ngOnDestroy(): void {
    this.sharedService.isWhatsappBtnVisible=true;
  }

  ngOnInit(): void {
    this.getResponsiveUpdate();
    this.activateRoute.queryParams.pipe(takeUntil(this._unsubscribeAll)).subscribe(async (res) => {
      // this.currentStep=1
      this.getWorkflowData(res);
    });
    this.sharedService.isWhatsappBtnVisible=false;

  }

  getWorkflowData(queryParams) {
    this.eventWorkflowService.getEventWorkflowByGet(queryParams.workflowId).subscribe((res) => {
      if (res.data().eventId === queryParams.eventId) {

        this.workflowInfo = res.data();
        this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];

      }

      else {
        this.router.navigate(['/']);
      }
    });
  }
  goBack() {
    this.router.navigate(['../'],
      {
        relativeTo: this.activateRoute,
        queryParamsHandling: 'merge'
      });
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  goToStep(step: number) {
    // Set the current step
    this.currentStep = step;
    this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
    // Go to the step
    this.courseSteps.selectedIndex = this.currentStep - 1;
    // Mark for check
    this._changeDetectorRef.markForCheck();
  }
  /**
   * Go to next step
   */
  goToNextStep(): void {
    // Return if we already on the last step
    if (this.currentStep === this.workflowInfo.totalSteps) {
      return;
    }
    // Go to step
    this.goToStep(this.currentStep + 1);
    // Scroll the current step selector from sidenav into view
    // this._scrollCurrentStepElementIntoView();
  }

  /**
   * Go to previous step
   */
  goToPreviousStep(): void {
    // Return if we already on the first step
    if (this.currentStep === 1) {
      return;
    }
    // Go to step
    this.goToStep(this.currentStep - 1);

  }


  getResponsiveUpdate() {
    // Subscribe to media changes
    this._fuseMediaWatcherService.onMediaChange$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(({ matchingAliases }) => {
        // Set the drawerMode and drawerOpened
        if (matchingAliases.includes('lg')) {
          this.drawerMode = 'side';
          this.drawerOpened = true;
        }
        else {
          this.drawerMode = 'over';
          this.drawerOpened = false;
        }
        // Mark for check
        this._changeDetectorRef.markForCheck();
      });
  }
}
