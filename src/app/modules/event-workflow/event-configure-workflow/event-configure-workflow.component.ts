import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { ActivatedRoute, Router } from '@angular/router';
import { MatTabGroup } from '@angular/material/tabs';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { EventWorkFlowTemplateService } from 'app/core/dbOperations/eventworkflowTemplates/event-work-flow-template.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { MatDialog } from '@angular/material/dialog';
import { EventEditWorkflowComponent } from './event-edit-workflow/event-edit-workflow.component';
import { EventService } from 'app/core/dbOperations/events/event.service';
import { EventWorkflowService } from 'app/core/dbOperations/eventworkflows/event-workflow.service';
import { UiService } from 'app/shared/ui.service';
import lodash from 'lodash';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { environment } from 'environments/environment';

@Component({
    selector: 'app-event-configure-workflow',
    templateUrl: './event-configure-workflow.component.html',
    styleUrls: ['./event-configure-workflow.component.scss']
})
export class EventConfigureWorkflowComponent implements OnInit {
    @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;
    eventDoc: any;
    isHaveWorkflow: boolean = true;
    isPrivilaged = false;
    environment = environment;

    constructor(
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _changeDetectorRef: ChangeDetectorRef,
        private router: Router,
        private activateRoute: ActivatedRoute,
        private eventWFTServ: EventWorkFlowTemplateService,
        private userService: UserService,
        public dialog: MatDialog,
        public eventService: EventService,
        private workflowService: EventWorkflowService,
        private uiService: UiService,
        private fuseConfirmationService: FuseConfirmationService,
    ) { }

    drawerMode: 'over' | 'side' = 'side';
    drawerOpened: boolean = true;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    selectedBatchSubm = {
        submissionId: '',
        workflowId: '',
        eventId: '',
        batchId: '',
        submissionName: '',
        submissionDesc: '',
        rawEventBatches: [],
        rawEventWorkflow: {}
    };

    currentStep: number = 1;
    workflowInfo: any;
    selectedCategory: any;
    currentWorkflow;
    tempView;
    selectedTemplate = '';
    allContestWFTArr = [];
    resetButton: boolean = false;
    privilege: boolean = false;

    ngOnInit(): void {
        this.getResponsiveUpdate();
        this.getAllTemplates();
        this.userInfo();
        const queryParams = this.activateRoute.snapshot.queryParams;
        this.getEventInfo(queryParams);
        this.workflowInitialization(queryParams);
        this.userService.userInfoSub.subscribe((userInfo) => {
            this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
        });
    }

    getEventInfo(params) {
        const eventId = params?.eventId || '';
        this.eventService.getWithGet(eventId).subscribe((res) => {
            this.eventDoc = res.data();
        });
    }
    userInfo() {
        this.userService.userInfoSub.subscribe((userInfo) => {
            this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
        });
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

    goBack() {
        this.router.navigate(['../'],
            {
                relativeTo: this.activateRoute,
                queryParamsHandling: 'merge'
            });
    }

    goToStep(step: number) {
        // Set the current step
        this.currentStep = step;
        // this.currentWorkflow = this.workflowInfo.contestSteps[this.currentStep - 1]
        this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
        // Go to the step
        this.courseSteps.selectedIndex = this.currentStep - 1;
        // Mark for check
        this._changeDetectorRef.markForCheck();
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
        // Scroll the current step selector from sidenav into view
        this._scrollCurrentStepElementIntoView();
    }

    /**
     * Go to next step
     */
    goToNextStep(): void {
        // Return if we already on the last step
        // if (this.currentStep === this.workflowInfo.totalSteps) {
        if (this.currentStep === this.workflowInfo?.totalSteps?.[this.selectedCategory?.categoryName]) {
            return;
        }
        // Go to step
        this.goToStep(this.currentStep + 1);
        // Scroll the current step selector from sidenav into view
        this._scrollCurrentStepElementIntoView();
    }

    private _scrollCurrentStepElementIntoView(): void {
        // Wrap everything into setTimeout so we can make sure that the 'current-step' class points to correct element
        setTimeout(() => {
            // Get the current step element and scroll it into view
            // const currentStepElement = document.getElementsByClassName('current-step')[0];
            // if (currentStepElement) {
            //   currentStepElement.scrollIntoView({
            //     behavior: 'smooth',
            //     block: 'start'
            //   });
            // }
        });
    }


    toggleTemplate(change: MatSlideToggleChange) {
        // console.log(change.checked)
        this.tempView = change.checked;
    }

    getAllTemplates() {
        this.eventWFTServ.getWorkFlowTemplates().subscribe((wf) => {
            this.allContestWFTArr = wf;
        });
    }

    selectedWFTemplate(e: any, isSaved?) {
        this.resetButton = true;
        this.isHaveWorkflow = true;
        this.selectedTemplate = e.templateName;
        this.viewWorkflowTemplate(e, isSaved);
    }

    async viewWorkflowTemplate(allWorkFlowSteps, isSaved) {
        this.workflowInfo = allWorkFlowSteps;
        this.currentWorkflow = this.workflowInfo.workflowSteps?.[this.currentStep - 1];
    }

    addNewWorkFlowStep() {
        this.editWorkFlow(true);
    }

    async editWorkFlow(isNewstep: boolean, step?: any): Promise<void> {
        await import('./event-edit-workflow/event-edit-workflow.module');
        this.dialog.open(EventEditWorkflowComponent, {
            data: {
                selectedStep: step != undefined || step != null ? step : false,
                selectedStageSubm: this.selectedBatchSubm,
                rawWorkflowInfo: this.workflowInfo || '',
            }
        });
    }

    async saveWorkFlowTemplate(workflowSteps?) {
        const templateWorkFlowSteps = {
            workflowSteps: workflowSteps ? workflowSteps : this.workflowInfo.workflowSteps,
            templateId: this.workflowInfo.templateId,
            templateName: this.workflowInfo.templateName,
            totalSteps: this.workflowInfo?.workflowSteps.length
        };


        if (this.selectedBatchSubm.workflowId) {
            this.updateWorkflowDoc(templateWorkFlowSteps, this.selectedBatchSubm.workflowId);
            this.uiService.alertMessage('Successful', 'Changes has been Successfully Saved', 'success');
        } else {
            const createdWFId: string = await this.createNewWorkFlowDocId(templateWorkFlowSteps);

            this.selectedBatchSubm.workflowId = createdWFId;
            const rawBatchArr = this.selectedBatchSubm.rawEventBatches;
            const submId = this.selectedBatchSubm.submissionId;
            const eventId = this.selectedBatchSubm.eventId;
            const updatedWFIdBatchArr: any = this.eventService.addWFIdIntoBatchSubm(rawBatchArr, submId, createdWFId);
            const updateBatchArr = {
                batches: updatedWFIdBatchArr
            };

            await this.eventService.updateEvent(updateBatchArr, eventId);
            this.selectedBatchSubm.rawEventBatches = updatedWFIdBatchArr;
            this.uiService.alertMessage('Successful', 'Workflow has been Successfully Saved', 'success');
        }
    }

    /* Update Existing workflow */
    updateWorkflowDoc(workFlowSteps: any, workFlowDocId) {
        this.workflowService.updateWorkFlowTemplate(workFlowSteps, workFlowDocId);
    }

    /* Create New WorkFlow */
    createNewWorkFlowDocId(templateWorkFlowSteps: any) {
        const workFlowId = this.workflowService.addNewWorkFlowTemplate(templateWorkFlowSteps);
        return workFlowId;
    }

    async workflowInitialization(params) {
        this.selectedBatchSubm.eventId = params?.eventId || '';
        this.selectedBatchSubm.batchId = params.batchId;
        this.selectedBatchSubm.submissionId = params?.submId || '';
        const contestData = await firstValueFrom(this.eventService.get(this.selectedBatchSubm.eventId));
        this.selectedBatchSubm.rawEventBatches = contestData?.batches || [];
        const checkWF = await this.eventService.checkWorkflowId(this.selectedBatchSubm.rawEventBatches, this.selectedBatchSubm.submissionId);

        if (!checkWF.workflowId) {
            this.isHaveWorkflow = false;

        }
        this.selectedBatchSubm.workflowId = checkWF.workflowId || '';
        this.selectedBatchSubm.submissionName = checkWF.displayName || '';
        this.selectedBatchSubm.submissionDesc = checkWF.description || '';
        if (this.selectedBatchSubm.workflowId) {
            this.getWorkflowDoc(this.selectedBatchSubm.workflowId);
        }
    }

    getWorkflowDoc(docId) {
        const docref = this.workflowService.get(docId).subscribe((res) => {
            this.selectedBatchSubm.rawEventWorkflow = res;
            this.selectedWFTemplate(res, true);
            this.resetButton = false;
            this.tempView = false;
        });
    }

    deleteWFStep(stepName) {
        const name = stepName.eventStepName;
        const config = {
            title: `Delete ${name}`,
            message: 'Are you sure you want to delete ?',
            icon: {
                name: 'mat_outline:delete'
            }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        // const workflowSteps: any = lodash.cloneDeep(this.workflowInfo.contestSteps)
        const workflowSteps: any = lodash.cloneDeep(this.workflowInfo?.workflowSteps);
        let sNo = 1;
        const sortFilterWFSteps = workflowSteps.filter((wfs) => {
            if (wfs['sequenceNumber'] != stepName.sequenceNumber) {
                wfs['sequenceNumber'] = sNo;
                ++sNo;
                return wfs;
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                await this.saveWorkFlowTemplate(sortFilterWFSteps);
            }
        });
    }
}
