import { ChangeDetectorRef, Component, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ContestWorkFlowTemplateService } from 'app/core/dbOperations/contestworkflowTemplates/contest-work-flow-template.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { ContestEditWorkflowComponent } from './contest-edit-workflow/contest-edit-workflow.component';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';

import * as lodash from 'lodash';


@Component({
  selector: 'app-contest-configure-workflow',
  templateUrl: './contest-configure-workflow.component.html',
  styleUrls: ['./contest-configure-workflow.component.scss']
})
export class ContestConfigureWorkflowComponent implements OnInit {
  allContestWFTArr = [];

  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  currentStep: number = 1;
currentParamsfromroute;
  privilege: boolean = false;
  workFlowForm: FormGroup;
  workflowInfo: any;
  currentWorkflow;
  workflowTemplateDocs: any = [];
  selectedTemplate = '';
  tempView;
  unsubscribeArr = [];
  checkLearningUnitId: any = false;
  quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline',],        // toggled buttons
        [{ 'size': ['small', false, 'large'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, false] }],

      ],
    }
  };

  selectedStageSubm = {
    submissionId: '',
    workflowId: '',
    contestId: '',
    stageId: '',
    submissionName: '',
    submissionDesc: '',
    rawContestStages: [],
    rawContestWorkflow: {}
  };

  categoryNames: any;
  selectedCategory: any;
  contestInfo: any;

  isGoBackVisible: boolean = true;
  constructor(
    private contestWFTServ: ContestWorkFlowTemplateService,
    private _changeDetectorRef: ChangeDetectorRef,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private router: Router,
    private userService: UserService,
    private activateRoute: ActivatedRoute,
    private workflowService: ContestWorkflowService,
    public dialog: MatDialog,
    private uiService: UiService,
    private contestService: ContestService,
    private fuseConfirmationService: FuseConfirmationService,) {
  }

  async ngOnInit(): Promise<void> {
    this.isGoBackVisible=this.workflowService.isGoBackVisible;
    this.activateRoute.data.subscribe(async (res) => {
      const contestInfo = res.resolverData;
      this.contestInfo = contestInfo;
      // console.log('contestInfooooo',contestInfo);

      const queryParams = this.activateRoute.snapshot.queryParams;

      this.getResponsiveUpdate();
      await this.getAllTemplates(contestInfo);
      this.getAllCategoryNames(contestInfo);
      await this.workflowInitialization(queryParams, contestInfo);
      // console.log('queryParams',queryParams);
      // console.log('contestInfo',contestInfo);


      this.userService.userInfoSub.subscribe((userInfo) => {
        this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
      });
    });
this.contestService.currentcontestParams.subscribe((res)=>{
  if(res){
    this.currentParamsfromroute=res;
  }
  else{
    this.currentParamsfromroute={};
  }

});
  }

  getAllCategoryNames(contestInfo) {
    this.categoryNames = contestInfo?.categories;
    this.selectedCategory = contestInfo?.categories?.[0];
  }
  getSlectedCatRes(category) {
    this.selectedCategory = category;
    // console.log('category',category)
    if (this.selectedStageSubm?.workflowId) {
      if (this.workflowInfo.contestSteps.hasOwnProperty(category.categoryName)) {
        this.getWorkflowDoc(this.selectedStageSubm.workflowId, this.contestInfo);
      }
      else {
        this.workflowInfo.contestSteps = {
          ...this.workflowInfo.contestSteps,
          [category.categoryName]: { steps: [] }
        };
      }
    }
    else {
      this.workflowInfo = {
        templateId: '',
        templateName: '',
        docId: '',
        contestSteps: { [category.categoryName]: { steps: [] } },
        totalSteps: 0,
      };
    }

    if(!this.workflowInfo.contestSteps?.[category.categoryName]){
      this.workflowInfo.contestSteps[category.categoryName] = { steps: [] };
    }

  }
  async workflowInitialization(params, contestInfo) {
    this.selectedStageSubm.contestId = params?.contestId || '';
    this.selectedStageSubm.stageId = params.stageId;
    this.selectedStageSubm.submissionId = params?.submId || '';
    const contestData = contestInfo;
    this.selectedStageSubm.rawContestStages = contestData?.stagesNames || [];
    const checkWF = await this.contestService.checkWorkflowId(this.selectedStageSubm.rawContestStages, this.selectedStageSubm.submissionId);
    // console.log('checkWF',checkWF)
    this.selectedStageSubm.workflowId = checkWF?.workflowId || '';

    this.selectedStageSubm.submissionName = checkWF?.displayName || '';
    this.selectedStageSubm.submissionDesc = checkWF?.description || '';
    if (this.selectedStageSubm.workflowId) {


      this.getWorkflowDoc(this.selectedStageSubm.workflowId, contestInfo);
    }
  }

  getWorkflowDoc(docId, contestInfo) {
    const docref = this.workflowService.get(docId).subscribe((res) => {

      this.selectedStageSubm.rawContestWorkflow = res;

      this.selectedWFTemplate(res, true);
      this.tempView = false;
    });
    this.unsubscribeArr.push(docref);
  }

  addNewWorkFlowStep() {
    this.editWorkFlow(true);
  }

  selectedWFTemplate(eventValue: any, isSaved?) {
    this.selectedTemplate = eventValue.templateName;
    this.viewWorkflowTemplate(eventValue, this.contestInfo, isSaved);
  }

  async viewWorkflowTemplate(allWorkFlowSteps, contestInfo, isSaved) {

    this.workflowInfo = this.workflowService.parseContestTemplate(allWorkFlowSteps, contestInfo, isSaved, this.selectedCategory?.categoryName);

    const categoryName = this.selectedCategory?.categoryName;
    if(!this.workflowInfo.contestSteps?.[categoryName]){
      this.workflowInfo.contestSteps[categoryName] = { steps: [] };
    }
    // this.selectedStageSubm.rawContestWorkflow = this.workflowInfo;
    // this.currentWorkflow = this.workflowInfo.contestSteps[this.currentStep - 1];
    this.currentWorkflow = this.workflowInfo.contestSteps?.[this.selectedCategory?.categoryName]?.steps?.[this.currentStep - 1];

  }

  async saveWorkFlowTemplate(workflowSteps?) {

    // const templateWorkFlowSteps = {
    //   workflowSteps: workflowSteps ? workflowSteps : this.workflowInfo.workflowSteps,
    //   templateId: this.workflowInfo.templateId,
    //   templateName: this.workflowInfo.templateName,
    //   totalSteps: this.workflowInfo?.workflowSteps.length
    // };
    const templateWorkFlowSteps = {
      templateId: this.workflowInfo.templateId,
      templateName: this.workflowInfo.templateName,
      contestSteps: workflowSteps ? workflowSteps : this.workflowInfo.contestSteps
    };
    if (this.selectedStageSubm.workflowId) {
      this.updateWorkflowDoc(templateWorkFlowSteps, this.selectedStageSubm.workflowId);
      this.uiService.alertMessage('Successful', 'Changes has been Successfully Saved', 'success');
    } else {
      const createdWFId: string = await this.createNewWorkFlowDocId(templateWorkFlowSteps);
      this.selectedStageSubm.workflowId = createdWFId;
      const rawStageArr = this.selectedStageSubm.rawContestStages;
      const submId = this.selectedStageSubm.submissionId;
      const contestId = this.selectedStageSubm.contestId;
      const updatedWFIdStagesArr: any = this.contestService.addWFIdIntoStageSubm(rawStageArr, submId, createdWFId);
      const updateStagesArr = {
        stagesNames: updatedWFIdStagesArr
      };
      await this.contestService.updateContest(updateStagesArr, contestId);
      this.selectedStageSubm.rawContestStages = updatedWFIdStagesArr;
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

  /* Update/Edit WorkFlow Here */
  async editWorkFlow(isNewstep: boolean, step?: any): Promise<void> {
    await import('./contest-edit-workflow/contest-edit-workflow.module');
    this.dialog.open(ContestEditWorkflowComponent, {
      data: {
        selectedStep: step != undefined || step != null ? step : false,
        selectedStageSubm: this.selectedStageSubm,
        rawWorkflowInfo: this.workflowInfo || '',
        category: this.selectedCategory?.categoryName || '',
        // paramInfo: {
        //   contestId: contestId,
        //   submissionId: submissionId,
        // },
      }
    });
  }

  deleteWFStep(stepName) {
    const name = stepName.contestStepName;
    const config = {
      title: `Delete ${name}`,
      message: 'Are you sure you want to delete ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    // const workflowSteps: any = lodash.cloneDeep(this.workflowInfo.contestSteps)
    const workflowSteps: any = lodash.cloneDeep(this.workflowInfo?.contestSteps?.[this.selectedCategory?.categoryName]?.steps);
    let sNo = 1;
    const sortFilterWFSteps = workflowSteps.filter((wfs) => {
      if (wfs['sequenceNumber'] != stepName.sequenceNumber) {
        wfs['sequenceNumber'] = sNo;
        ++sNo;
        return wfs;
      }
    });

    const categoryName = this.selectedCategory?.categoryName;
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        await this.saveWorkFlowTemplate({ [this.selectedCategory?.categoryName]: { steps: sortFilterWFSteps } });
      }
    });
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  goToStep(step: number) {
    // Set the current step
    this.currentStep = step;
    // this.currentWorkflow = this.workflowInfo.contestSteps[this.currentStep - 1]
    this.currentWorkflow = this.workflowInfo.contestSteps?.[this.selectedCategory?.categoryName]?.steps?.[this.currentStep - 1];
    // Go to the step
    this.courseSteps.selectedIndex = - 1;
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

  toggleTemplate(change: MatSlideToggleChange) {
    this.tempView = change.checked;
  }

  goBack() {
    const updatedQueryParams = { ...this.currentParamsfromroute };

    // Replace programmeId with contestId
    if (updatedQueryParams.programmeId) {
      updatedQueryParams.contestId = updatedQueryParams.programmeId; // Replace programmeId with contestId
      delete updatedQueryParams.programmeId; // Remove programmeId
    }

    // Navigate to the updated URL without merging existing query parameters
    this.router.navigate(
      [`dashboard/${this.currentParamsfromroute.classroomId}`],
      {
        queryParams: updatedQueryParams, // Use the updated queryParams
        queryParamsHandling: '' // Do not merge with existing query parameters
      }
    );

      //  this.router.navigate([`dashboard/${this.currentParamsfromroute.classroomId}`,{queryParams:this.currentParamsfromroute}])

  }

  // let obj=
  getAllTemplates(contestInfo) {
    this.contestWFTServ.getWorkFlowTemplates().subscribe((wf) => {
      const type = contestInfo?.type;
      this.allContestWFTArr = wf.filter(wf => wf?.type == type);
    });
  }


}
