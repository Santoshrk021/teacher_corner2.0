import { AfterContentChecked, AfterContentInit, AfterViewChecked, AfterViewInit, ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { ManageTrashInstitutesComponent } from 'app/modules/admin/manage-trash-institutes/manage-trash-institutes.component';
import { firstValueFrom, lastValueFrom } from 'rxjs';

@Component({
    selector: 'app-learn-tabs',
    templateUrl: './learn-tabs.component.html',
    styleUrls: ['./learn-tabs.component.scss']
})
export class LearnTabsComponent implements OnInit, OnChanges {
    @Input() tacData;
    @Input() workflow;
    @Input() luData;
    @Input() currentStep;


    @Input() currentSubmdataofstep;
    // uploadAssignments:any[]=[]
    // formAssignments:any[]
    selectedTabIndex = 0;

    assignmentID: string = '';


    @Input() workflowId;

    quillConfig = {
        toolbar: {
            container: [
                ['bold', 'italic', 'underline',],        // toggled buttons
                [{ 'size': ['small', false, 'large'] }],  // custom dropdown
                [{ 'header': [1, 2, 3, false] }],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
                [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
            ],
        }
    };

    luResources;
    resourceKeys;
    workflowChange;
    externalResources = {
        templatePath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit Tempalate'
        },
        guidePath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit guide'
        },
        materialPath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit material'
        },
        observationPath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit observation'
        },
        otherImagePath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit observation'
        },
        qrCodeImagePath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit qrCodeImage'
        },
        topicGuidePath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit topicGuide'
        },
        varGuidePath: {
            type: 'file',
            contentType: 'pdf',
            isGradeDependent: false,
            display: 'LearningUnit varGuide'
        },
        topicVideoUrl: {
            type: 'video',
            contentType: 'video',
            isGradeDependent: false,
            display: 'LearningUnit topic Video'
        },
        varVideoUrl: {
            type: 'video',
            contentType: 'video',
            isGradeDependent: false,
            display: 'LearningUnit var Video'
        },
        videoUrl: {
            type: 'video',
            contentType: 'video',
            isGradeDependent: false,
            display: 'LearningUnit video'
        }
    };

    gameNo;
    subscriptions = [];

    constructor(
        private assignmentService: AssignmentsService,
        private userService: UserService,
        private config: ConfigurationService,
        private cdr: ChangeDetectorRef,
        private studentService: StudentsService,
        private workFlowCompletionService: WorkflowCompletionService,
    ) {
        this.gameNo = 0;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.currentStep) {
            // this.assignmentID=this.workflow.contents[0].assignmentId?this.workflow.contents[0].assignmentId:''
        }

        if (this.workflow?.contents.length == 1) {

            this.onTabChange(0);
        }
    }

    tabChanged = (tabChangeEvent: MatTabChangeEvent): void => {
        this.gameNo = tabChangeEvent.index;
    };

    async ngOnInit() {
        this.assignmentID = this.workflow.contents[0].assignmentId;
        // let currentwids=Object.keys(this.currentSubmdataofstep)
        // this.workflow.contents.forEach((element, index) => {
        //     if(currentwids.includes(element.assignmentId)){
        //         if(element.contentCategory=='assignment' && element.assignmentType=='UPLOAD' ){
        //         let arraysofsubm=Object.keys(this.currentSubmdataofstep[element.assignmentId]).filter(d=>d.includes('submissionId')).map(f=>Number(f.split('_')[1]))
        //         let arraysofsubms=Object.keys(this.currentSubmdataofstep[element.assignmentId]).filter(d=>d.includes('submissionId'))
        //         // let latestsubm=Math.max(...arraysofsubm)
        //         this.currentSubmdataofstep[element.assignmentId]['submissions']={}
        //         // let submlatest=Object.keys(this.currentSubmdataofstep[element.assignmentId]).filter(d=>d.includes('submissionId')).filter(f=>Number(f.split('_')[1])==latestsubm)[0]
        //         arraysofsubms.forEach((ele:any,index) => {
        //             this.currentSubmdataofstep[element.assignmentId]['submissions'][index]=this.currentSubmdataofstep[element.assignmentId][ele].submissionPath
        //          })
        //         // this.workflow.contents[index].resourcePath=this.currentSubmdataofstep[element.assignmentId][submlatest].submissionPath
        //         }
        //         if(element.contentCategory=='assignment' && element.assignmentType=='FORM' ){
        //             if(this.currentSubmdataofstep[element.assignmentId].questions){
        //                 this.currentSubmdataofstep[element.assignmentId].questions={type:'form',questions:this.currentSubmdataofstep[element.assignmentId].questions}
        //             }
        //        }
        //     }
        // })
        // let mValue = (String(this.luData.Maturity)).toLowerCase();
        // // let typeMod = this.luData.type.replace(/\s+/g, '')
        // // const resources: any = await firstValueFrom(this.config.getResourceNames())
        // // const luResources = resources['resources'][typeMod][mValue]
        // // this.luResources = luResources
        // // this.resourceKeys = Object.keys(luResources)
    }

    checkIfUrl(input: string) {
        const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
        return urlPattern.test(input) ? true : false;
    }

    getFileExtension(resourcePath: string | undefined | null): boolean {
        if (typeof resourcePath === 'string') {
            return true;
        }
        return false; // Return an empty string if resourcePath is not a valid string
    }

    onTabChange(event) {

        if (this.workflow.contents[event].contentCategory == 'assignment' && this.workflow.contents[event].assignmentType == 'TEXTBLOCK') {
            if (this.workflow?.contents.length == event + 1) {
                this.workFlowCompletionService.unlockedSteps.next(this.workflow.sequenceNumber);
            }
        }
        if (this.workflow.contents[event].contentCategory == 'assignment') {

        }
        else {
            if (this.workflow?.contents.length == event + 1) {
                this.workFlowCompletionService.unlockedSteps.next(this.workflow.sequenceNumber);
            }
        }

    }

    onTabChanged(event) {
        this.selectedTabIndex = event.index;
        this.assignmentID = this.workflow?.contents[event.index]?.assignmentId ? this.workflow?.contents[event.index]?.assignmentId : '';
    }

}
