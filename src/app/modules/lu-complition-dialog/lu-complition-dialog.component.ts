import { ChangeDetectorRef, Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatTabGroup } from '@angular/material/tabs';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { UserService } from 'app/core/user/user.service';
import { environment } from 'environments/environment';
import { firstValueFrom, lastValueFrom, Subject, take, takeUntil } from 'rxjs';

@Component({
  selector: 'app-lu-complition-dialog',
  templateUrl: './lu-complition-dialog.component.html',
  styleUrls: ['./lu-complition-dialog.component.scss']
})
export class LuComplitionDialogComponent implements OnInit {

  @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;

  private _unsubscribeAll: Subject<any> = new Subject<any>();

  drawerMode: 'over' | 'side' = 'side';
  drawerOpened: boolean = true;
  currentStep: number;
  isLoaded: boolean;
  studentAssignments: any;

  course: any = {
    'id': '694e4e5f-f25f-470b-bd0e-26b1d4f64028',
    'title': 'Resources',
    'slug': 'basics-of-angular',
    'description': 'Introductory course for Angular and framework basics',
    'category': 'web',
    'duration': 30,
    'totalSteps': 3,

    'featured': true,
    'progress': {
      'currentStep': 1,
      'completed': 1
    },
    'steps': [
      {
        'order': 0,
        'title': 'Learn And Make',
        'subtitle': 'subtitle',
      },
      {
        'order': 1,
        'title': 'Resources',
        'subtitle': 'subtitle',
      },
      {
        'order': 2,
        'title': 'Assignment',
        'subtitle': 'subtitle',
      },
      {
        'order': 3,
        'title': 'Quiz',
        'subtitle': 'subtitle',
      }

    ]
  };
  pdfLink = 'https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/RamanAward2022%2F8dUv5c4YCCbcvzB6YDcmE0kr1gs1-Adhabfgww5QHagvpBvuC%2Fachary-obs-sheet?alt=media&token=bc6cfe70-5aac-4ccf-9791-3edb3abff3c1';
  luData;
  tacData: any;
  workflow: any;
  queryParams: any;
  currentData: any={};
  workflowInfo: any;
  currentWorkflow: any;
  isHaveWorkflow: boolean = true;
  environment = environment;
  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _fuseMediaWatcherService: FuseMediaWatcherService,
    private activateRoute: Router,
    private userService: UserService,
    private route: ActivatedRoute,
    private learningUnitService: LearningUnitsService,
    private workflowService: WorkflowsService,
    private classroomService: ClassroomsService,
    private workFlowCompletionService: WorkflowCompletionService,
    private instituteService: InstitutionsService,
    private studentService: StudentsService,
    @Inject(MAT_DIALOG_DATA) private data: any
  ) { }

  async ngOnInit() {
    this.luData = this.data.learningUnitInfo;
    const studenetassigi=await this.getStudentAssignments(this.data.teacherOrStudentInfo.docId,this.data.workflowId,this.data.classroomId,this.data.programmeId);

    this.studentAssignments=JSON.parse(JSON.stringify(studenetassigi));

    await this.workflowInitialization(studenetassigi);



  }

  async getStudentAssignments(studentId,learningUnitId,classId,programmeId){
    const assignmentdata=await firstValueFrom(this.studentService.getStudentSubmissionByIdOnce(studentId,classId,programmeId) );
    const currentworkflowSubmission=this.getcurrentSubmissionfromstudentSubmissions(assignmentdata.data(),learningUnitId);
    return currentworkflowSubmission;
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  getcurrentSubmissionfromstudentSubmissions(data,learningUnitId){
    let currentassignment;
    if(data){
      Object.keys((data)).forEach((key)=>{
        if(key.includes(learningUnitId)){
          currentassignment=data[key];
           return data[key];
        }
      });
    }
    else{
      currentassignment={};
    }
      return currentassignment;
  }

  async workflowInitialization(currentsubm) {
    const luId = this.data.learningUnitInfo.docId;
    const workflowId = this.data.workflowId;
    const promise=
    this.workflowService.get(workflowId).pipe(takeUntil(this._unsubscribeAll)).subscribe(async (res) => {
      await this.getWorkflowFromLearningId(res, luId,currentsubm);
      this.isHaveWorkflow = true;
    });

  }

  async viewWorkflowTemplate(workflowInfo, isSaved, unlockedSteps) {

    const institutionDoc = await lastValueFrom(this.instituteService.getInstitutionByIdOnce(this.data.institutionId));
    const classroomDoc = await lastValueFrom(this.classroomService.getClassroomByIdOnce(this.data.classroomId));
    const luId = this.data.learningUnitInfo.docId;
    const learningUnitDoc = await lastValueFrom(this.learningUnitService.getLUByIdOnce(luId));
    const boardGradeKeys = {
      board: institutionDoc.get('board'),
      grade: classroomDoc.get('grade'),
      maturity: learningUnitDoc.get('Maturity'),
    };
    this.workflowInfo = await this.workflowService.parseWorkflowTemplate(workflowInfo, this.data.learningUnitInfo, isSaved, boardGradeKeys, unlockedSteps);

    this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
  }


  async getWorkflowFromLearningId(workflow: any, learningUnitId,currentsubm) {
    const luId = learningUnitId;
    if (workflow) {
      this.workflowService.get(workflow?.workflowId).pipe(take(1)).subscribe(async (res) => {



        // this.workflowInfo = this.workflowService.parseWorkflow(res);
        await this.viewWorkflowTemplate(res, false, 0);

        let completionObj;
        if (this.data.isTeacher == 'teacher') {
          completionObj = {
            teacherId: this.data.teacherOrStudentInfo.docId,
            learningunitId: luId,
          };
        }
        else {
          completionObj = {
            studentId: this.data.teacherOrStudentInfo.docId,
            learningunitId: luId
          };
        }
        // const wfId = this.workflowInfo['workflowId'];
        const wfId = workflow?.workflowId;

        if (this.data.isTeacher) {
          this.workFlowCompletionService
            .getResourceById(completionObj)
            .pipe(takeUntil(this._unsubscribeAll)).subscribe((response) => {

              if (response.exists) {
                if (response.data()['workflows'].hasOwnProperty(wfId)) {
                  if (response.data()['workflows'][wfId]['completedSteps']) {
                    this.setDefaultCurrentStep(response.data()['workflows'][wfId]['completedSteps'],currentsubm);
                  } else {
                    this.setDefaultCurrentStep(1,currentsubm);
                  };
                } else {
                  this.setDefaultCurrentStep(1,currentsubm);
                };
              } else {
                this.setDefaultCurrentStep(1,currentsubm);
              };

            });
        }

        else {
          this.workFlowCompletionService
            .getResourceByIdStudent(completionObj)
            .pipe(takeUntil(this._unsubscribeAll)).subscribe((response) => {

              if (response.exists) {
                if (response.data()['workflows'].hasOwnProperty(wfId)) {
                  if (response.data()['workflows'][wfId]['completedSteps']) {
                    this.setDefaultCurrentStep(response.data()['workflows'][wfId]['completedSteps'],currentsubm);
                  } else {
                    this.setDefaultCurrentStep(1,currentsubm);
                  };
                } else {
                  this.setDefaultCurrentStep(1,currentsubm);
                };
              } else {
                this.setDefaultCurrentStep(1,currentsubm);
              };

            });
        }
      });
    } else {
      this.setDefaultCurrentStep(1,currentsubm);
      this.checkGotoAssignmentStep();
    };
  }


  setDefaultCurrentStep(step,currentsubm) {

    this.currentStep = step;
    this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
    const currentassigmentIds=this.currentWorkflow.contents.map((content)=>{
     if(content?.assignmentId){
      return content.assignmentId;
     }
    });
  if(Object.keys(currentsubm).length!=0){
    Object.keys(currentsubm).forEach((key)=>{
      if(currentassigmentIds.includes(key.split('_')[1])){
        currentsubm[key].assignmentId=key;
        currentsubm[key].assignmentId=key;
         this.currentData[key.split('_')[1]]=currentsubm[key];
      }
    });
  }
    this.isLoaded = true;
  }

  checkGotoAssignmentStep() {
    const checkAssignmentId = this.route.snapshot.params.assignmentId;
    if (checkAssignmentId) {
      const findAssignmentIndex: number = this.workflowInfo.workflowSteps.findIndex((contentsArr) => {
        if (contentsArr.contents.find(content => content['assignmentId'] == checkAssignmentId)) {
          return contentsArr;
        }
      });
      this.goToStep(findAssignmentIndex + 1);
    }
  }


  goToStep(step: number): void {
    // Set the current step
    this.currentData={};
    this.currentStep = step;
    this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
    // alert('ddd')
    const currentassigmentIds=this.currentWorkflow.contents.map((content)=>{
      if(content?.assignmentId){
       return content.assignmentId;
      }
     });
     Object.keys(this.studentAssignments).forEach((key)=>{
       if(currentassigmentIds.includes(key.split('_')[1])){
        this.studentAssignments[key].assignmentId=key;
        this.studentAssignments[key].assignmentId=key;
          this.currentData[key.split('_')[1]]=this.studentAssignments[key];
       }
     });
    // Object.keys(this.studentAssignments).forEach((key)=>{
    //   if(this.studentAssignments.includes(key.split('_')[1])){
    //     this.studentAssignments[key].assignmentId=key
    //     this.studentAssignments[key].assignmentId=key
    //      this.currentData[key.split('_')[1]]=this.studentAssignments[key]
    //   }
    // })
    // console.log("sddddddddddddddddddddddddddd")
    // console.log(this.currentData)
    // console.log(this.studentAssignments)
    // Go to the step
    if(this.courseSteps){
      this.courseSteps.selectedIndex = this.currentStep - 1;

    }

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
    if (this.currentStep === this.workflowInfo.totalSteps) {
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
      const currentStepElement = document.getElementsByClassName('current-step')[0];
      if (currentStepElement) {
        currentStepElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  }
}
