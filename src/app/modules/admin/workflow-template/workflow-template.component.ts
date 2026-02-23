import { ChangeDetectorRef, Component, EventEmitter, Inject, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatTabChangeEvent, MatTabGroup } from '@angular/material/tabs';
import { environment } from 'environments/environment';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowTemplateService } from 'app/core/dbOperations/workflowTemplate/workflow-template.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { UiService } from 'app/shared/ui.service';
import * as lodash from 'lodash';
import { Subject, first, firstValueFrom, lastValueFrom, take, takeUntil } from 'rxjs';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { FuseConfirmdialogService } from '@fuse/services/confirmdialog';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { EditWorkFlowComponent } from 'app/modules/classroom/classroom-stepper/edit-work-flow/edit-work-flow.component';
import { WorkflowStepDialogComponent } from './workflow-step-dialog/workflow-step-dialog.component';
import { ThisReceiver } from '@angular/compiler';
import { WorkflowTemplatesService } from './workflow-template.service';
import { serverTimestamp, Timestamp } from '@angular/fire/firestore';
import { SharedService } from 'app/shared/shared.service';
import firebase from 'firebase/compat';
import moment from 'moment';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AngularFireStorage } from '@angular/fire/compat/storage';


@Component({
    selector: 'app-workflow-template',
    templateUrl: './workflow-template.component.html',
    styleUrls: ['./workflow-template.component.scss']
})
export class WorkflowTemplateComponent implements OnInit {

    @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;
    private _unsubscribeAll: Subject<any> = new Subject<any>()
    drawerMode: 'over' | 'side' = 'side';
    drawerOpened: boolean = true;
    currentStep: number = 0;
    // currentStep: number = 1;
    resourcePathsinworkflowColl = []
    isLoaded: boolean = false;
    teacherId: string;
    completedSteps: any;
    isHaveWorkflow: boolean = true;
    classroomData
    routerData: any
    privilege: boolean = false
    workFlowForm: FormGroup
    templateCopy
    workflowInfo: any;
    currentWorkflow
    isStarted = true
    templateChanged = false
    workflowTemplateDocs: any = []
    selectedTemplate = ''
    tempView
    queryParams: any;
    resetButton: boolean = false;
    unsubscribeArr = []
    checkLearningUnitId: any = false;
    workflowStepsClone: any;
    showMessage = false;
    templateNameToDisplay: string;
    environment = environment;
    unlockedSteps: Promise<void>;
    workflowDataInProgramme: any;
    showSteps = false;
    stepName: any;
    types: any;
    maturities: any;
    showWorkflowStepButton: boolean = false;
    saveWfTemplateButton: boolean = false;
    createWfTemplateButton: boolean = true;
    step: any;
    workflowData: any[] = [];
    subjectTypes: any;
    currentStepIndex: number;
    workflowTemplateDocuments: any = [];
    availableWorkflowTemplates: any = [];
    disableSubject: boolean = false;
    typeCode: any;
    editMode: boolean = false;
    disableDelete: boolean = false;
    workflowTypes: any = [];
    disableType: boolean = false;
    disableTypeMap: { [key: string]: boolean } = {};
    form = this.fb.group({
        learningUnitType: ['', Validators.required],
        maturity: ['', Validators.required],
        subject: ['', Validators.required],
        type: ['', Validators.required],
        // createdAt: [{}],
        workflowSteps: this.fb.array([])
    });
    contentSubCategory: any;
    fileUrl: SafeResourceUrl | undefined;
    fileType: string | undefined;
    storagePath: string | null = null;
    showWorkflowContent = false;
    // downloadUrls: { name: string, url: string }[] = [];
    downloadUrls: any;
    activeContent: any;
    availableContents: any;
    pdfFilePath: any;
    hasWFContent: boolean = false;
    resourceEntries: [string, any][] = [];
    totalSteps: any;
    resourceNames: any;
    templateWordsList: string[][] = []; // Store extracted template words
    // templateMode: 'default' | 'custom';
    templateMode: string = 'default';
    customTemplateName: string = '';
    stepContents: any;
    customWorkflowType: any;
    @Output() templateModeChanged = new EventEmitter<string>();

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private afs: AngularFirestore,
        private userService: UserService,
        private activateRoute: ActivatedRoute,
        private workflowService: WorkflowsService,
        public dialog: MatDialog,
        private uiService: UiService,
        private workFlowTempService: WorkflowTemplateService,
        private classroomService: ClassroomsService,
        private luService: LearningUnitsService,
        private instituteService: InstitutionsService,
        private fuseConfirmationService: FuseConfirmationService,
        //  private fuseConfirmDialogService: FuseConfirmdialogService,
        private workFlowCompletionService: WorkflowCompletionService,
        private learningUnitService: LearningUnitsService,
        private configurationService: ConfigurationService,
        private fb: FormBuilder,
        private workflowTemplateService: WorkflowTemplatesService,
        private sharedService: SharedService,
        private config: ConfigurationService,
        private masterService: MasterService,
        private afAuth: AngularFireAuth,
        private sanitizer: DomSanitizer,
        private storage: AngularFireStorage,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private dialogRef: MatDialogRef<WorkflowTemplateComponent>
    ) {
        //  this.routerData = this.router.getCurrentNavigation()?.extras?.state || '';
        //  this.activateRoute.queryParams.subscribe(async res => {
        //      this.queryParams = res
        //  })
        this.isStarted = true
        // this.form = this.fb.group({
        //     type: [''],
        //     maturity: [''],
        //     subject: [''],
        //     workflowSteps: this.fb.array([])
        // });
    }

    ngOnDestroy(): void {
        // window.removeEventListener('beforeunload', this.onBrowserLeave);
        // this.unsubscribeArr.forEach(obs => {
        //     obs.unsubscribe()
        // })
    }

    async ngOnInit() {
        if (!this.data.isNewWorkflowTemplate) {
            this.showSteps = true;
            this.createWfTemplateButton = false;
            this.showWorkflowStepButton = true;
            this.customTemplateName = this.data.templateName;
            this.customWorkflowType = this.data.type;
        }
        if (!this.data.isNewWorkflowTemplate && this.data.templateMode === 'custom' && this.data.type && this.data.templateName) {
            this.showWorkflowStepButton = true;
        }

        if (this.data?.templateMode) {
            this.templateMode = this.data.templateMode;
        }


        const resources: any = await firstValueFrom(this.config.getConfigurationDocumentOnce('resourceNames'));
        this.resourceNames = resources.exists ? resources.data() : {};

        this.userService.userInfoSub.subscribe(userInfo => {
            this.teacherId = userInfo?.['docId'];
            this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
        })

        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));

        // this.hasCategories();
        if (this.data.isNewWorkflowTemplate) {
            this.form.valueChanges.subscribe(() => {
                if (this?.types) {
                    this.typeCode = this.types?.find(type => type.name === this.form.value.learningUnitType).code;
                }
            });
        }

        if (this.data) {
            this.form.patchValue({
                learningUnitType: this.data.learningUnitType || '',
                maturity: this.data.maturity || '',
                subject: this.data.subject || '',
                // wfType: this.data.wfType && this.data.wfType.length > 0 ? this.data.wfType[0] : null

                type: this.data.type || ''
            });

            if (this.data.type !== '') {
                this.showSteps = true;
                this.showWorkflowStepButton = true;
                this.createWfTemplateButton = false;

            }

            this.workflowTemplateService.storagePath$.subscribe(path => {
                if (path) {
                    this.storagePath = path;
                    // console.log('📂 Updated Storage Path:', this.storagePath);
                }
            });



            this.loadWorkflowTemplates();

        }

        if (this.data.isNewWorkflowTemplate == false) {
            this.form.controls['learningUnitType'].disable();
            this.form.controls['maturity'].disable();
            this.form.controls['subject'].disable();
            this.form.controls['type'].disable();
        } else {
            this.form.controls['learningUnitType'].enable();
            this.form.controls['maturity'].enable();
            this.form.controls['subject'].enable();
            this.form.controls['type'].enable();
        }
        // if (this.data?.maturity !== '' && this.data.isNewWorkflowTemplate==false) {
        //     this.form.controls['maturity'].disable();
        // } else {
        //     this.form.controls['maturity'].enable();
        // }
        // if (this.data?.subject !== ''  && this.data.isNewWorkflowTemplate==false) {
        //     this.form.controls['subject'].disable();
        // }
        // else {
        //     this.form.controls['subject'].enable();
        // }
        // if (this.data?.type !== ''  && this.data.isNewWorkflowTemplate==false) {
        //     this.form.controls['type'].disable();
        // }
        // else {
        //     this.form.controls['type'].enable();
        // }

        // if (this.data.isNewWorkflowTemplate == false && this.data.type !== '' && this.data.learningUnitType == '' && this.data.maturity == '' && this.data.subject == '') {
        //     this.showWorkflowStepButton = false;
        // }

        if (
            this.data.isNewWorkflowTemplate === false &&
            this.data.templateMode !== 'custom' &&  // ✅ Skip for custom templates
            this.data.type !== '' &&
            this.data.learningUnitType === '' &&
            this.data.maturity === '' &&
            this.data.subject === ''
        ) {
            this.showWorkflowStepButton = false;
        }


        this.configurationService.getLearningUnitTypes().subscribe((res: any) => {
            const LUtypes = res.Types;
            this.types = Object.values(LUtypes);
            this.hasCategories();
        })

        this.configurationService.getMaturity().subscribe((res: any) => {
            this.maturities = res.maturity;
        })

        this.configurationService.getlearningunitSubjecttypes().subscribe((res: any) => {
            this.subjectTypes = res.subjectTypes;
        })

        this.configurationService.getWorkflowTypes().subscribe((res: any) => {
            this.workflowTypes = res.workflowTypes;
        })
        this.fetchTemplates();

    }
    async getClassInfoAndWFTemplateInit(classroomDoc) {
        return await this.getWorkflowTemplates(classroomDoc.get('type'));
    }

    async workflowInitialization(classroomDoc) {
        const luId = this.activateRoute.snapshot.params.tacDocId
        this.checkLearningUnitId = await this.checkWorkFlowIdIntoClassroom(luId)

        if (this.checkLearningUnitId && this.checkLearningUnitId.hasOwnProperty('workflowId') && this.checkLearningUnitId?.['workflowId']?.length) {
            let docref = this.workflowService.get(this.checkLearningUnitId['workflowId']).pipe(takeUntil(this._unsubscribeAll)).subscribe(async res => {
                this.workflowStepsClone = JSON.parse(JSON.stringify(res.workflowSteps))
                let { unlockedSteps, completedSteps } = await this.getWorkflowFromLearningId(res);

                await this.selectedWFTemplate(res, unlockedSteps, true)
                this.setDefaultCurrentStep(completedSteps);
                this.resetButton = false
                this.tempView = false
                this.isHaveWorkflow = true;
            })
            this.unsubscribeArr.push(docref)
        }
        else {
            /* Select Default template */
            if (classroomDoc?.type == 'CLASSROOM') {
                this.selectedWFTemplate(this.workflowTemplateDocs?.find(template => template?.templateName === this.templateNameToDisplay), 1, false)
            }
            this.resetButton = false
            this.tempView = false
            this.isHaveWorkflow = false;
        }
    }

    selectedWFTemplate(e: any, unlockedSteps, isSaved?) {
        if (!isSaved) {
            this.isStarted = false
            this.templateChanged = true
        }
        this.resetButton = true
        this.selectedTemplate = e.templateName
        this.templateCopy = this.workflowTemplateDocs.filter(template => template.templateName === this.selectedTemplate)
        // this.workflowChangeCopy = JSON.parse(JSON.stringify(this.templateCopy))
        return this.viewWorkflowTemplate(e, isSaved, unlockedSteps)
    }

    async checkLearningUnitData() {
        const luId = this.activateRoute.snapshot.params.tacDocId;
        if (!this.routerData.learningUnitInfo) {
        }
    }

    async viewWorkflowTemplate(allWorkFlowSteps, isSaved, unlockedSteps) {
        const institutionDoc = await lastValueFrom(this.instituteService.getInstitutionByIdOnce(this.queryParams.institutionId));
        const classroomDoc = await lastValueFrom(this.classroomService.getClassroomByIdOnce(this.queryParams.classroomId));
        const luId = this.activateRoute.snapshot.params.tacDocId;
        const learningUnitDoc = await lastValueFrom(this.learningUnitService.getLUByIdOnce(luId));
        const boardGradeKeys = {
            board: institutionDoc.get('board'),
            grade: classroomDoc.get('grade'),
            maturity: learningUnitDoc.get('Maturity'),
        };
        this.workflowInfo = await this.workflowService.parseWorkflowTemplate(allWorkFlowSteps, this.routerData, isSaved, boardGradeKeys, unlockedSteps);

        this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
        this.unlockedSteps = this.workflowInfo?.workflowSteps.filter(step => step.isStepUnlocked).length

        const workflowId = this.workflowInfo['workflowId']
        let workflowInfoIndex = this.classroomData.programmes[this.queryParams.programmeId].workflowIds.findIndex(wf => wf.workflowId == workflowId)
        this.workflowDataInProgramme = this.classroomData.programmes[this.queryParams.programmeId].workflowIds[workflowInfoIndex]

        if (isSaved || this.isStarted) {
            let workflowcpy = await this.workflowService.parseWorkflowTemplate(allWorkFlowSteps, this.routerData, isSaved, boardGradeKeys, unlockedSteps);
            // this.resourcePathsinworkflowColl = this.getresourcewithWorkflows(workflowcpy)
            let val = workflowcpy.workflowSteps.some(this.stepContainsWorkflowDoc)
            if (val) {
                this.showMessage = true
            }
            else {
                this.showMessage = false
            }
        }
    }

    stepContainsWorkflowDoc(step) {
        let allResourcePaths = step.contents.map(content => content?.resourcePath?.universalGradeBoardResourcePath ? content?.resourcePath?.universalGradeBoardResourcePath : content?.resourcePath)
        const startsWithLearningUnits = (element) => element.toLowerCase().startsWith("workflows");
        // Use the `some` method
        const hasWorkflows = allResourcePaths.some(startsWithLearningUnits);
        return hasWorkflows

    }

    async saveWorkFlowTemplate3(workflowSteps?) {
        let dialogRef
        if (this.showMessage) {
            //  dialogRef = this.fuseConfirmDialogService.open(config)
            dialogRef.afterClosed().subscribe(async (result) => {
                if (result == 'confirmed') {
                    const classroomId = this.queryParams.classroomId;
                    const programmeId = this.queryParams.programmeId;
                    const templateWorkFlowSteps = {
                        workflowSteps: this.templateCopy[0].workflowSteps,
                        // privilegeTable: this.workflowInfo.privilegeTable,
                        templateId: this.workflowInfo.templateId,
                        templateName: this.workflowInfo.templateName
                    };
                    const luId = this.activateRoute.snapshot.params.tacDocId
                    const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
                    const clsProgrammeWorkFlowIdsArr = teacherCls['programmes']?.[`${programmeId}`]?.['workflowIds'] || []
                    const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId)
                    if (checkLearningUnitId) {
                        const updatedWorkFlowSteps = templateWorkFlowSteps;
                        this.updateWorkflowDoc(updatedWorkFlowSteps, checkLearningUnitId.workflowId)
                    } else {
                        const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps)
                        clsProgrammeWorkFlowIdsArr.push({
                            learningUnitId: luId,
                            workflowId: newlyCreatedWorkFlowDocId,
                            lockAt: '',
                            unlockAt: '',
                            workflowLocked: false,
                        })

                        await this.workflowInitialization(teacherCls)
                    }
                    await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps)
                    this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
                }
                else if (result == 'confirmedStep') {
                    let templateCopy = []
                    templateCopy = this.workflowTemplateDocs.filter(template => template.templateName === this.selectedTemplate)
                    templateCopy[0].workflowSteps[this.currentStep - 1] = this.workflowInfo.workflowSteps[this.currentStep - 1]
                    // const wfdocs=await (this.workFlowTempService.getWorkFlowTemplates().toPromise())
                    const classroomId = this.queryParams.classroomId;
                    const programmeId = this.queryParams.programmeId;
                    const templateWorkFlowSteps = {
                        workflowSteps: this.templateCopy[0].workflowSteps,
                        templateId: this.workflowInfo.templateId,
                        templateName: this.workflowInfo.templateName
                    };
                    const luId = this.activateRoute.snapshot.params.tacDocId
                    const teacherCls: any = await this.classroomService.getClassroomDataById(classroomId);
                    const clsProgrammeWorkFlowIdsArr = teacherCls['programmes']?.[`${programmeId}`]?.['workflowIds'] || []
                    const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId)
                    if (checkLearningUnitId) {
                        const updatedWorkFlowSteps = templateWorkFlowSteps;
                        this.updateWorkflowDoc(updatedWorkFlowSteps, checkLearningUnitId.workflowId)
                    } else {
                        const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps)
                        clsProgrammeWorkFlowIdsArr.push({
                            learningUnitId: luId,
                            workflowId: newlyCreatedWorkFlowDocId,
                            lockAt: '',
                            unlockAt: '',
                            workflowLocked: false,
                        })

                        await this.workflowInitialization(teacherCls)
                    }
                    await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps)
                    this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
                    this.getWorkflowTemplates(teacherCls.type)

                }
                else {
                    //
                }
            })

        } else {
            const classroomId = this.queryParams.classroomId;
            const programmeId = this.queryParams.programmeId;
            const templateWorkFlowSteps = {
                workflowSteps: workflowSteps ? workflowSteps : this.workflowInfo.workflowSteps,
                // privilegeTable: this.workflowInfo.privilegeTable,
                templateId: this.workflowInfo.templateId,
                templateName: this.workflowInfo.templateName
            };
            const luId = this.activateRoute.snapshot.params.tacDocId
            const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
            const clsProgrammeWorkFlowIdsArr = teacherCls?.['programmes']?.[`${programmeId}`]?.['workflowIds'] || []
            const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId)
            if (checkLearningUnitId && checkLearningUnitId?.['workflowId']?.length) {
                const updatedWorkFlowSteps = templateWorkFlowSteps;
                this.updateWorkflowDoc(updatedWorkFlowSteps, checkLearningUnitId.workflowId)
            } else {
                const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps)
                if (clsProgrammeWorkFlowIdsArr.some(wfs => wfs['learningUnitId'].includes(luId))) {
                    const index = clsProgrammeWorkFlowIdsArr.findIndex(wfs => wfs['learningUnitId'].includes(luId));
                    clsProgrammeWorkFlowIdsArr[index].workflowId = newlyCreatedWorkFlowDocId;
                } else {
                    clsProgrammeWorkFlowIdsArr.push({
                        learningUnitId: luId,
                        workflowId: newlyCreatedWorkFlowDocId,
                        lockAt: '',
                        unlockAt: '',
                        workflowLocked: false,
                    })
                };
                await this.workflowInitialization(teacherCls)
            }
            await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps)
            this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
        }
    }



    deleteWFStep(stepName) {
        this.currentStep = stepName.sequenceNumber;
        const dialogRef = this.fuseConfirmationService.open({
            title: `Delete ${stepName.workflowStepName}`,
            message: `Are you sure you want to delete?`,
            icon: { name: 'mat_outline:delete' }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result === 'confirmed') {
                // this.workflowData = this.workflowData.filter(wfs => wfs.workflowStepName !== stepName.workflowStepName);
                this.workflowData = this.workflowData.filter(wfs => wfs.sequenceNumber !== stepName.sequenceNumber);
                this.workflowData.forEach((step, index) => {
                    step.sequenceNumber = index + 1;
                });

                const workflowStepsArray = this.form.get('workflowSteps') as FormArray;
                const stepIndex = workflowStepsArray.value.findIndex(s => s.name === stepName.workflowStepName);

                if (stepIndex !== -1) {
                    workflowStepsArray.removeAt(stepIndex);
                }
                if (this.workflowData.length === 1) {
                    this.disableDelete == true;
                }
                this.saveWorkflowTemplate();
            }
        });
    }

    async checkWorkFlowIdIntoClassroom(luId: string) {
        const classroomId = this.queryParams.classroomId;
        const programmeId = this.queryParams.programmeId;

        const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
        this.classroomData = teacherCls


        const clsProgrammeWorkFlowIdsArr = teacherCls?.['programmes']?.[programmeId]?.['workflowIds'] || []

        const tacdocId = await lastValueFrom(this.activateRoute.params.pipe(first()))
        const d: any = await this.luService.getLearningUnitData(tacdocId.tacDocId)

        return clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'].includes('-') ? wfs['learningUnitId'] === d.learningUnitId : wfs['learningUnitId'] === d.docId)
    }

    /* Update Existing workflow */
    updateWorkflowDoc(workFlowSteps: any, workFlowDocId: string) {
        this.workflowService.updateWorkFlowTemplate(workFlowSteps, workFlowDocId)
    }

    /* Create New WorkFlow */
    createNewWorkFlowDocId(templateWorkFlowSteps: any) {
        const workFlowId = this.workflowService.addNewWorkFlowTemplate(templateWorkFlowSteps);
        return workFlowId
    }


    /* get WorkFlows Templates */
    getWorkflowTemplates(classroomType) {
        let workflowSubcription
        if (classroomType == 'STEM-CLUB') {
            workflowSubcription = this.workFlowTempService.getWorkFlowTemplates().subscribe((d: any) => {
                this.workflowTemplateDocs = d.filter(x => x.type == 'STEM-CLUB');
            })
            this.unsubscribeArr.push(workflowSubcription)
        }
        else {
            workflowSubcription = this.workFlowTempService.getWorkFlowTemplates().subscribe((d: any) => {
                // move Default template to first position
                const clsTypeTemplates = d.filter(x => x.type == 'CLASSROOM');
                const defaultIndex = clsTypeTemplates.findIndex(wf => wf.templateName === this.templateNameToDisplay);
                const defaultObject = clsTypeTemplates.find(x => x.templateName === this.templateNameToDisplay);
                clsTypeTemplates.splice(defaultIndex, 1);
                clsTypeTemplates.unshift(defaultObject);
                this.workflowTemplateDocs = clsTypeTemplates;
            })
            this.unsubscribeArr.push(workflowSubcription)
        }

    }

    /*
    async configureWorkFlowStep(allWorkFlowSteps: any) {
      // const uid = await this.userService.getUid()
      this.workflowInfo = this.workflowService.parseWorkflow(allWorkFlowSteps);
      this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
    }
    */


    trackByFn(index: number, item: any): any {
        return item.id || index;
    }


    // async goToStep(stepNumber: number) {
    //     this.currentStep = stepNumber;
    //     this.showWorkflowContent = true;
    //     this.downloadUrls = {}; // ✅ Reset URLs
    //     this.availableContents = []; // ✅ Reset available contents

    //     const step = this.workflowData.find(s => s.sequenceNumber === stepNumber);
    //     if (!step) {
    //         console.error(`❌ Step ${stepNumber} not found.`);
    //         return;
    //     }

    //     console.log(`🔹 Navigating to Step ${stepNumber}:`, step.workflowStepName);
    //     console.log("📂 Step Contents:", step.contents);
    //     this.stepContents= step.Contents

    //     if (!step.contents || step.contents.length === 0) {
    //         console.warn(`⚠️ No contents found for Step ${stepNumber}`);
    //         return;
    //     }

    //     // ✅ Populate `availableContents` with objects
    //     this.availableContents = step.contents.map(content => ({
    //         contentName: content.contentName,
    //         contentSubCategory: content.contentSubCategory
    //     }));

    //     console.log(`✅ Available contents:`, this.availableContents);


    //     for (const content of step.contents) {
    //         console.log(`📂 Processing: ${content.contentName}`);

    //         const resources: any = await firstValueFrom(this.config.getResourceNames());
    //         const storagePath = this.getStoragePath(resources.resources, content.contentSubCategory);
    //         console.log(`📍 Storage Path: ${storagePath}`);

    //         if (storagePath !== null) {
    //             this.hasWFContent= true;
    //             try {
    //                 const contentUrl = await this.storage.ref(storagePath).getDownloadURL().toPromise();
    //                 console.log(`🔗 Raw URL for ${content.contentName}:`, contentUrl);

    //                 // ✅ Sanitize URL to avoid unsafe errors
    //                 const safeUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(contentUrl);

    //                 // ✅ Store using `content.contentName` as key
    //                 this.downloadUrls[content.contentName] = safeUrl;
    //                 console.log("🟢 Updated downloadUrls:", this.downloadUrls);
    //                 this.resourceEntries = Object.entries(this.downloadUrls);
    //                 console.log(this.resourceEntries, 'resEnt');
    //                 console.log(Object.keys(this.downloadUrls));

    //                 // ✅ Force change detection
    //                 this._changeDetectorRef.detectChanges();
    //             } catch (error) {
    //                 console.error(`🚨 Error fetching download URL for ${content.contentName}:`, error);
    //             }
    //         }else{
    //             this.hasWFContent= false;
    //         }
    //     }

    // }

    async goToStep(stepNumber: number) {
        this.currentStep = stepNumber;
        this.showWorkflowContent = true;
        this.downloadUrls = {}; // ✅ Reset URLs
        this.availableContents = []; // ✅ Reset available contents

        const step = this.workflowData.find(s => s.sequenceNumber === stepNumber);
        if (!step) {
            console.error(`❌ Step ${stepNumber} not found.`);
            return;
        }



        if (!step.contents || step.contents.length === 0) {
            console.warn(`⚠️ No contents found for Step ${stepNumber}`);
            return;
        }

        for (const content of step.contents) {

            const resources: any = this.resourceNames;
            const storagePath = this.getStoragePath(resources.resources, content.contentSubCategory);



            // const contentUrl = await this.storage?.ref(storagePath)?.getDownloadURL().toPromise();
            // ✅ Add to availableContents with storagePath
            this.availableContents.push({
                contentName: content.contentName,
                contentSubCategory: content.contentSubCategory,
                // storagePath: contentUrl || null
            });

            if (storagePath !== null) {
                this.hasWFContent = true;
                try {
                    const contentUrl = await this.storage.ref(storagePath).getDownloadURL().toPromise();

                    const safeUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(contentUrl);
                    // this.downloadUrls[content.contentName] = safeUrl;
                    // this.downloadUrls[storagePath] = storagePath;
                    this.downloadUrls[content.contentName] = {
                        changingThisBreaksApplicationSecurity: safeUrl,
                        storagePath: storagePath
                    };

                    this.resourceEntries = Object.entries(this.downloadUrls);

                    this._changeDetectorRef.detectChanges();
                } catch (error) {
                    console.error(`Error fetching download URL for ${content.contentName}:`, error);
                }
            } else {
                this.hasWFContent = false;
                this.downloadUrls[content.contentName] = {
                    changingThisBreaksApplicationSecurity: null,
                    storagePath: null
                };
                this.resourceEntries = Object.entries(this.downloadUrls);
            }
        }

    }


    sanitizeUrl(url: string): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }


    onTabChange(event: MatTabChangeEvent) {
        this.activeContent = this.availableContents[event.index];
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
        if (this.currentStep === this.totalSteps) {
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

    getStudentQueryInfo() {
        return JSON.parse(localStorage.getItem('studentInfo'))
    }

    filterWorkflow(arr: [], keyword) {
        return arr.filter((d: any) => d.workflowStepName == keyword)[0]
    }


    async getWorkflowFromLearningId(workflow) {
        const luId = this.activateRoute.snapshot.params.tacDocId;
        if (workflow) {
            try {
                const completionObj = {
                    teacherId: this.teacherId,
                    learningunitId: luId,
                };
                const wfId = workflow?.workflowId;

                const response = await this.workFlowCompletionService
                    .getResourceById(completionObj)
                    .pipe(takeUntil(this._unsubscribeAll))
                    .toPromise();

                let completedSteps: number;
                let unlockedSteps: number;

                if (response.data()) {
                    if (response.data()['workflows'].hasOwnProperty(wfId)) {
                        if (response.data()['workflows'][wfId]['completedSteps']) {
                            completedSteps = response.data()['workflows'][wfId]['completedSteps'];
                            unlockedSteps = response.data()['workflows'][wfId]['unlockedSteps'];
                            return { unlockedSteps: unlockedSteps, completedSteps: completedSteps };
                        }
                    }
                }

                completedSteps = 1; // Default step
                unlockedSteps = 1; // Default step
                return { unlockedSteps: unlockedSteps, completedSteps: completedSteps };;
            } catch (error) {
                const defaultStep = 1; // Default step on error
                return { unlockedSteps: defaultStep, completedSteps: defaultStep };
            }
        } else {
            const defaultStep = 1; // Default step if no workflow provided
            return { unlockedSteps: defaultStep, completedSteps: defaultStep };
        }
    }

    setDefaultCurrentStep(step) {
        this.currentStep = step;

        this.currentWorkflow = this.workflowInfo?.workflowSteps?.[this.currentStep - 1];

        this.isLoaded = true;
    }

    onBrowserLeave() {
        window.addEventListener('beforeunload', () => {
            //  this.updateProgressInFirestore();
            // event.preventDefault();
            // event.returnValue = 'Are you sure you want to leave the page?';
        });
    }

    updateProgressInFirestore() {

        if (this.privilege) {
            const luId = this.activateRoute.snapshot.params.tacDocId;
            const wfId = this.workflowInfo['workflowId'];

            const completionObj = {
                teacherId: this.teacherId,
                learningunitId: luId,
            };

            const workFlowProgress = {
                workflows: {
                    [wfId]: {
                        completedSteps: this.currentStep
                    }
                },
                docId: luId
            };

            // send work completion progress to firestore
            this.workFlowCompletionService
                .update(workFlowProgress, completionObj)
                .catch(err => console.error('Error sending work completion progress to firestore: ', err));

            return
        }

        const luId = this.activateRoute.snapshot.params.tacDocId;
        const wfId = this.workflowInfo['workflowId'];

        const completionObj = {
            teacherId: this.teacherId,
            learningunitId: luId,
        };

        let unlockedSteps = this.workflowInfo?.workflowSteps.filter(step => step?.isStepUnlocked)?.length
        const workFlowProgress = {
            workflows: {
                [wfId]: {
                    completedSteps: this.currentStep,
                    unlockedSteps: unlockedSteps ? unlockedSteps : 0
                }
            },
            docId: luId
        };

        this.unlockedSteps = unlockedSteps

        let completePercentage = (this.currentStep / this.workflowInfo.totalSteps) * 100

        if (completePercentage >= 75) {
            this.setFlagInClassroomProgrammeWorkflow()
        }
        this._changeDetectorRef.markForCheck();
        // send work completion progress to firestore
        this.workFlowCompletionService
            .update(workFlowProgress, completionObj)
            .catch(err => console.error('Error sending work completion progress to firestore: ', err));
    }

    setFlagInClassroomProgrammeWorkflow() {
        const workflowId = this.workflowInfo['workflowId']

        let workflowInfoIndex = this.classroomData.programmes[this.queryParams.programmeId].workflowIds.findIndex(wf => wf.workflowId == workflowId)
        this.classroomData.programmes[this.queryParams.programmeId].workflowIds[workflowInfoIndex] =
        {
            ...this.classroomData.programmes[this.queryParams.programmeId].workflowIds[workflowInfoIndex],
            isAllStepsCompleted: true
        }

        let obj = {
            programmes: this.classroomData.programmes
        }

        this.classroomService.updateWorkFlowIdClassroom(obj, this.queryParams.classroomId)
    }



    get workflowSteps(): FormArray {
        return this.form.get('workflowSteps') as FormArray;
    }


    createWorkflowTemplate() {
        this.showSteps = true;

        if (!this.form.get('workflowSteps')) {
            this.form.addControl('workflowSteps', this.fb.array([]));
        }
        const workflowStepsArray = this.form.get('workflowSteps') as FormArray;

        this.currentStepIndex = workflowStepsArray.length;

        if (workflowStepsArray.length === 0) {
            this.addWorkflowStep();
            this.currentStepIndex = 0;
        }


    }

    addWorkflowStep() {
        this.currentStepIndex = this.workflowData.length;
        const dialogRef = this.dialog.open(WorkflowStepDialogComponent, {
            data: {
                // type: this.form.value.learningUnitType || this.data.type,
                type: this.form.value.learningUnitType || this.data.learningUnitType,
                maturity: this.form.value.maturity || this.data.maturity,
                step: this.currentStepIndex,
                editDialog: false,
                templateMode: this.templateMode,

            }
        });

        dialogRef.afterClosed().subscribe(result => {
            if (result) {  // If step is added
                // const step = this.fb.group({ name: result.name });

                const step = this.fb.group({ name: result.workFlowContents.workflowStepName });
                this.workflowData.push(result.workFlowContents);
                const workflowStepsArray = this.form.get('workflowSteps') as FormArray;
                workflowStepsArray.push(step);

                this.stepName = result.workFlowContents.workflowStepName;
                this.showWorkflowStepButton = true;
                this.saveWfTemplateButton = true;
                this.createWfTemplateButton = false;
                this.currentStepIndex = workflowStepsArray.length;

                // this.saveWorkflowTemplate();
            } else if ((this.form.get('workflowSteps') as FormArray).length === 0) {
                // If no step exists after closing dialog, show Create Workflow Template
                this.showWorkflowStepButton = false;
                this.saveWfTemplateButton = false;
                this.createWfTemplateButton = true;
                this.showSteps = false;
            }
        });
    }



    /*
        editWorkflowStep(stepIndex, stepDetails: any) {
            console.log(stepDetails);
            console.log(stepIndex, 'stepIndex');

            const workflowStepsArray = this.form.get('workflowSteps') as FormArray;
            console.log()

            const dialogRef = this.dialog.open(WorkflowStepDialogComponent, {
                data: {
                    type: this.form.value.learningUnitType || this.data.learningUnitType,
                    maturity: this.form.value.maturity || this.data.maturity,
                    wfType: this.form.value.type || this.data.type,
                    stepDetails: stepDetails,
                    editDialog: true,
                    workflowSteps: this.workflowData
                }
            });

            dialogRef.afterClosed().subscribe(result => {
                console.log('Dialog result:', result);
                if (!result) return;

                console.log('Updated workflowData:', this.workflowData);
                console.log('Updated FormArray:', workflowStepsArray.value);

                this.workflowData[stepIndex] = { ...result };

                // additional steps for sorting when the step sequence number is edited
                //   const sortWorkflowSteps = this.workflowData.filter(wfs => wfs['sequenceNumber'] != stepDetails.sequenceNumber);
                this.workflowData = [...this.workflowData].sort((a, b) => a.sequenceNumber - b.sequenceNumber);

                // 🔹 Reassign sequence numbers sequentially (if needed)
                this.workflowData = this.workflowData.map((step, index) => ({
                    ...step,
                    sequenceNumber: index, // Ensuring sequential numbering
                }));

                console.log("Sorted and updated workflowData:", this.workflowData);
                // additional steps for sorting when the step sequence number is edited


                workflowStepsArray.at(stepIndex).patchValue({
                    name: result.workflowStepName,
                    contents: result.contents.map(content => {
                        let updatedContent = { ...content };

                        if (content.assignmentDueDate !== undefined) {
                            updatedContent.assignmentDueDate = content.assignmentDueDate
                                ? new Date(content.assignmentDueDate)
                                : null;
                        } else {
                            delete updatedContent.assignmentDueDate;
                        }

                        return updatedContent;
                    })
                });

                if (result) {
                    this.saveWorkflowTemplate();
                }
            });
        }
    */

    editWorkflowStep(stepIndex, stepDetails: any) {

        const workflowStepsArray = this.form.get('workflowSteps') as FormArray;

        const dialogRef = this.dialog.open(WorkflowStepDialogComponent, {
            data: {
                type: this.form.value.learningUnitType || this.data.learningUnitType,
                maturity: this.form.value.maturity || this.data.maturity,
                wfType: this.form.value.type || this.data.type || this.customWorkflowType,
                stepDetails: stepDetails,
                editDialog: true,
                workflowSteps: this.workflowData,
                templateId: this.data.templateId,
                templateName: this.data.templateName,
                templateMode: this.data.templateMode
            }
        });


        dialogRef.afterClosed().subscribe(result => {
            if (!result) return;

            // Replace workflowData with the correct updated workflowSteps from result
            this.workflowData = [...result.workflowSteps];

            // Sort workflowData by sequenceNumber in ascending order
            this.workflowData.sort((a, b) => a.sequenceNumber - b.sequenceNumber);

            // Clear and update FormArray
            workflowStepsArray.clear();
            this.workflowData.forEach(step => {
                workflowStepsArray.push(this.fb.group({
                    name: step.workflowStepName,
                    sequenceNumber: step.sequenceNumber,
                    contents: this.fb.array(
                        step.contents.map(content =>
                            this.fb.group({
                                ...content,
                                assignmentDueDate: content.assignmentDueDate
                                    ? new Date(content.assignmentDueDate)
                                    : null
                            })
                        )
                    )
                }));
            });

            // Manually trigger change detection to reflect changes in UI
            this._changeDetectorRef.detectChanges();

            // Save the updated workflow template
            this.saveWorkflowTemplate();

            if (result.contentSubCategory) {
                this.contentSubCategory = result.contentSubCategory;
                this.updateFilePath();
            }
        });
    }


    updateFilePath() {
        let storagePath = '';
        let extension = '';

        switch (this.contentSubCategory) {
            case 'ppt':
                storagePath = `resourceNameStoragePath/tttPpts.pptx`;
                extension = 'ppt';
                break;
            case 'pdf':
                storagePath = `resourceNameStoragePath/tacGuideOnline.pdf`;
                extension = 'pdf';
                break;
            case 'image':
                storagePath = `resourceNameStoragePath/learingUnitPic_200x200.jpeg`;
                extension = 'jpg';
                break;
            default:
                console.warn('Unsupported content category');
                return;
        }

        this.getFile(storagePath, extension);
    }

    getFile(storagePath: string, type: string) {
        this.storage.ref(storagePath).getDownloadURL().subscribe(url => {
            this.fileType = type;

            // Directly sanitize the URL here
            this.fileUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
        }, error => {
            console.error("Error fetching file URL:", error);
        });
    }


    // Save Workflow Template

    // async saveWorkflowTemplate() {
    //     console.log('Saving Workflow...');

    //     const cleanedWorkflowData = this.workflowData.map(step => ({
    //         ...step,
    //         contents: step.contents.map(content => {
    //             console.log(content.assignmentDueDate, 'Before Processing');

    //             let processedContent = { ...content };

    //             if (content.contentCategory !== 'assignment') {
    //                 // 🔹 Remove assignment-related fields if not an assignment
    //                 delete processedContent.assignmentDueDate;
    //                 delete processedContent.assignmentName;
    //                 delete processedContent.assignmentId;
    //                 delete processedContent.assignmentType;
    //                 processedContent['isDueDate'] = false;
    //             }
    //             if (content?.isDueDate === true && content.assignmentDueDate) {
    //                 let parsedDate: Date | null = null;

    //                 // ✅ If already Firestore Timestamp, convert to Date
    //                 if (content.assignmentDueDate instanceof Timestamp) {
    //                     parsedDate = content.assignmentDueDate.toDate();
    //                 }
    //                 // ✅ If Firestore Timestamp {seconds, nanoseconds} object, convert to Date
    //                 else if (typeof content.assignmentDueDate === 'object' && content.assignmentDueDate?.seconds !== undefined) {
    //                     parsedDate = new Date(content.assignmentDueDate.seconds * 1000);
    //                 }
    //                 // ✅ If it's a valid Moment.js object, convert to Date
    //                 else if (moment.isMoment(content.assignmentDueDate)) {
    //                     parsedDate = content.assignmentDueDate.toDate();
    //                 }
    //                 // ✅ If it's a string, try parsing it as a Date
    //                 else if (typeof content.assignmentDueDate === 'string') {
    //                     const dateFromString = new Date(content.assignmentDueDate);
    //                     if (!isNaN(dateFromString.getTime())) {
    //                         parsedDate = dateFromString;
    //                     }
    //                 }
    //                 // ✅ If it's already a Date object, use it
    //                 else if (content.assignmentDueDate instanceof Date) {
    //                     parsedDate = content.assignmentDueDate;
    //                 }

    //                 // ✅ If parsedDate is still null or invalid, remove it
    //                 if (parsedDate && !isNaN(parsedDate.getTime())) {
    //                     processedContent.assignmentDueDate = Timestamp.fromDate(parsedDate);
    //                 } else {
    //                     console.error('❌ Invalid Date:', content.assignmentDueDate);
    //                     delete processedContent.assignmentDueDate;
    //                 }
    //             } else {
    //                 // ✅ Do not touch assignmentDueDate if `isDueDate` is false
    //                 delete processedContent.assignmentDueDate;
    //             }



    //             console.log(processedContent.assignmentDueDate, 'Processed assignmentDueDate');

    //             // 🔹 Remove unnecessary fields
    //             const { fetchAssignmentsNames, uploadProgress, subCategoriesList, ...rest } = processedContent;
    //             return rest;
    //         })
    //     }));

    //     console.log('Final Processed Workflow:', cleanedWorkflowData);
    //     const docId = this.data?.templateId ? this.data.templateId : this.afs.createId();

    //     let formData: any = {
    //         ...this.form.value,
    //         docId: docId,
    //         status: 'LIVE',
    //         templateId: docId,
    //         workflowSteps: cleanedWorkflowData
    //     };

    //     // delete formData['luType'];
    //     // delete formData['maturity'];
    //     // delete formData['subject'];
    //     if (formData['learningUnitType']) {
    //         const typeObj = this.types.find((type: any) => type.name === formData['learningUnitType']);
    //         if (typeObj) {
    //             formData['learningUnitType'] = typeObj.code;
    //         }
    //     }
    //     let masterData = { ...formData };
    //     const { workflowSteps, ...rest } = masterData;
    //     masterData = rest;
    //     console.log(masterData, 'masterData');
    //     // 🔹 Remove `undefined` values before saving to Firestore
    //     formData = JSON.parse(JSON.stringify(formData, (key, value) =>
    //         value === undefined ? null : value // Convert undefined to null (Firestore accepts null)
    //     ));
    //     await this.sharedService.convertTimestamps(formData);

    //     console.log('Final Data Before Saving:', formData);
    //     const typeName = this.form.value.learningUnitType || this.data.type;
    //     const typeCode = this.types.find(type => type.name === typeName)?.code || '';
    //     try {
    //         // const docId = this.data?.templateId ? this.data.templateId : this.afs.createId();

    //         if (this.data?.templateId) {

    //             formData['updatedAt'] = new Date();
    //             // masterData['updatedAt'] = new Date();
    //             await this.workflowTemplateService.getWorkflowTemplate(docId).update(formData);
    //             await this.masterService.updateWorkflowTemplateInMasterById(docId, masterData);
    //             this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
    //             console.log('✅ Workflow template updated successfully!');
    //         } else {
    //             formData['createdAt'] = new Date();
    //             masterData['createdAt'] = new Date();
    //             const masterDataForSave = { ...masterData };
    //             delete masterDataForSave.creationDate;
    //             delete masterDataForSave.updatedAt;
    //             formData['templateName'] = `Default (${typeCode}) (${this.form.value.subject}) (${this.form.value.maturity})`;
    //             masterData['templateName'] = `Default (${typeCode}) (${this.form.value.subject}) (${this.form.value.maturity})`
    //             await this.workflowTemplateService.getWorkflowTemplate(docId).set(formData);
    //             await this.masterService.addNewObjectToMasterMap('WORKFLOW_TEMPLATE', 'workflowTemplates', masterDataForSave);

    //             // await this.masterService.addNewWfTemplate(docId, masterData);
    //             this.uiService.alertMessage('Successful', 'Workflow template created successfully', 'success');
    //             console.log('✅ Workflow template created successfully!');
    //         }
    //     } catch (error) {
    //         console.error('❌ Error saving workflow template:', error);
    //     }



    // }


    async saveWorkflowTemplate() {
        if (this.templateMode === 'custom') {
            this.form.patchValue({
                type: this.customWorkflowType
            });
        }
        // const templateType= this.templateMode;
        const cleanedWorkflowData = this.workflowData.map(step => ({
            ...step,
            contents: step.contents.map(content => {
                let processedContent = { ...content };

                if (content.contentCategory !== 'assignment') {
                    delete processedContent.assignmentDueDate;
                    delete processedContent.assignmentName;
                    delete processedContent.assignmentId;
                    delete processedContent.assignmentType;
                    processedContent['isDueDate'] = false;
                }

                if (content?.isDueDate === true && content.assignmentDueDate) {
                    let parsedDate: Date | null = null;

                    if (content.assignmentDueDate instanceof Timestamp) {
                        parsedDate = content.assignmentDueDate.toDate();
                    } else if (typeof content.assignmentDueDate === 'object' && content.assignmentDueDate?.seconds !== undefined) {
                        parsedDate = new Date(content.assignmentDueDate.seconds * 1000);
                    } else if (moment.isMoment(content.assignmentDueDate)) {
                        parsedDate = content.assignmentDueDate.toDate();
                    } else if (typeof content.assignmentDueDate === 'string') {
                        const dateFromString = new Date(content.assignmentDueDate);
                        if (!isNaN(dateFromString.getTime())) {
                            parsedDate = dateFromString;
                        }
                    } else if (content.assignmentDueDate instanceof Date) {
                        parsedDate = content.assignmentDueDate;
                    }

                    if (parsedDate && !isNaN(parsedDate.getTime())) {
                        processedContent.assignmentDueDate = Timestamp.fromDate(parsedDate);
                    } else {
                        delete processedContent.assignmentDueDate;
                    }
                } else {
                    delete processedContent.assignmentDueDate;
                }

                const { fetchAssignmentsNames, uploadProgress, subCategoriesList, ...rest } = processedContent;
                return rest;
            })
        }));

        // const docId = this.data?.templateId ? this.data.templateId : this.afs.createId();

        const docId = this.data?.templateId || this.afs.createId();  // ✅ Use existing ID


        let formData: any = {
            ...this.form.value,
            docId: docId,
            status: 'LIVE',
            templateId: docId,
            workflowSteps: cleanedWorkflowData,
            templateType: this.templateMode
        };

        if (formData['learningUnitType']) {
            const typeObj = this.types.find((type: any) => type.name === formData['learningUnitType']);
            if (typeObj) {
                formData['learningUnitType'] = typeObj.code;
            }
        }

        let masterData = { ...formData };
        const { workflowSteps, ...rest } = masterData;
        masterData = rest;
        // console.log(masterData, 'masterData');

        formData = JSON.parse(JSON.stringify(formData, (key, value) =>
            value === undefined ? null : value
        ));

        await this.sharedService.convertTimestamps(formData);
        const typeName = this.form.value.learningUnitType || this.data.type;
        const typeCode = this.types.find(type => type.name === typeName)?.code || '';

        try {
            if (this.data?.templateId) {
                formData['updatedAt'] = new Date();
                let updatedmasterData = { ...formData };
                delete updatedmasterData['workflowSteps'];

                // masterData['updatedAt'] = new Date();
                await this.workflowTemplateService.getWorkflowTemplate(docId).update(formData);
                await this.masterService.updateWorkflowTemplateInMasterById(docId, updatedmasterData);
                this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
            } else {
                formData['createdAt'] = new Date();
                masterData['createdAt'] = new Date();

                if (typeCode && this.form.value.subject && this.form.value.maturity && this.templateMode === 'default') {
                    formData['templateName'] = `Default (${typeCode}) (${this.form.value.subject}) (${this.form.value.maturity})`;
                } else {
                    formData['templateName'] = this.customTemplateName;
                }
                masterData['templateName'] = formData['templateName'];
                const masterDataForSave = { ...masterData };

                await this.workflowTemplateService.getWorkflowTemplate(docId).set(formData);

                // 🔹 Capture `masterDocId` from `addNewObjectToMasterMap`
                const masterDocId = await this.masterService.addNewObjectToMasterMap('WORKFLOW_TEMPLATE', 'workflowTemplates', masterDataForSave);

                // await this.afs.collection(this.masterService.collectionName).doc(masterDocId).update({
                //     [`workflowTemplates.${docId}.updatedAt`]: firebase.firestore.FieldValue.delete()
                // });

                const masterDocRef = this.afs.collection(this.masterService.collectionName).doc(masterDocId);
                const masterDocSnapshot = await masterDocRef.get().toPromise();

                if (masterDocSnapshot.exists) {
                    let masterData: any = masterDocSnapshot.data();

                    // 🔹 Check if `workflowTemplates` exists and update it
                    if (masterData?.workflowTemplates?.[docId]) {
                        delete masterData.workflowTemplates[docId].updatedAt; // Remove `updatedAt`
                    }

                    // 🔹 Update Firestore without `updatedAt`
                    await masterDocRef.update(masterData);
                }

                // 🔹 Add `masterDocId` to `formData`
                formData['masterDocId'] = masterDocId;
                await this.workflowTemplateService.getWorkflowTemplate(docId).update({ masterDocId });

                this.uiService.alertMessage('Successful', 'Workflow template created successfully', 'success');
            }
        } catch (error) {
            console.error('❌ Error saving workflow template:', error);
        }

        // this.dialogRef.close({ templateMode: this.templateMode });
        // this.emitTemplateMode();
        // this.workflowTemplateService.setTemplateMode(this.templateMode);

    }


    displayFn = (code: string): string => {
        const selected = this.workflowTypes.find(wType => wType.code === code);
        return selected ? selected.displayName : '';
    };


    getMatchingTemplates(type: string, maturity: string, subject: string) {
        this.workflowTemplateService.getTemplates().get().subscribe(snapshot => {
            this.workflowTemplateDocuments = [];

            //   snapshot.forEach(doc => {
            //     const data = doc.data() as { templateName?: string[] }; ;
            //     console.log('Template Data:', data);
            //     if (data?.templateName &&
            //         data.templateName.includes(type) &&
            //         data.templateName.includes(maturity) &&
            //         data.templateName.includes(subject)) {

            //       this.workflowTemplateDocuments.push({ id: doc.id, ...data });

            //     }
            //   });


            //   snapshot.forEach(doc => {
            //     const data = doc.data() as { templateName?: string[] };

            //     if (data?.templateName &&
            //         [type, maturity, subject].every(val => data.templateName.includes(val))) {

            //       this.workflowTemplateDocuments.push({ id: doc.id, ...data });
            //     }
            //   });


            snapshot.forEach(doc => {
                const data = doc.data() as { templateName?: string };

                if (data?.templateName) {


                    const templateWords = data.templateName
                        .toLowerCase()
                        .match(/\(([^)]+)\)|\b\w+\b/g)
                        ?.map(word => word.replace(/[()]/g, '').trim()) || [];

                    const typeNormalized = type.trim().toLowerCase();
                    const maturityNormalized = maturity.trim().toLowerCase();
                    const subjectNormalized = subject.trim().toLowerCase();
                    // console.log(typeNormalized, maturityNormalized, subjectNormalized, 'categoryNormalized, typeNormalized, levelNormalized');
                    // Check if all selected values exist as separate words in templateName
                    if (
                        templateWords.includes(typeNormalized) &&
                        templateWords.includes(maturityNormalized) &&
                        templateWords.includes(subjectNormalized)
                    ) {
                        this.workflowTemplateDocuments.push({ id: doc.id, ...data });
                    }
                }
            });

            //   this.availableWorkflowTemplates = this.workflowTemplateDocuments.map(template => template.templateName);
            //   console.log('Workflow Templates:', this.availableWorkflowTemplates);
        });
    }

    goBack() {

        this.dialog.closeAll();

    }

    disableSubjectOption(subject) {
        this.workflowTemplateService.getTemplates().get().subscribe(snapshot => {
            this.workflowTemplateDocuments = [];

            snapshot.forEach(doc => {
                const data = doc.data() as { templateName?: string };

                if (data?.templateName) {

                    const templateWords = data.templateName
                        .toLowerCase()
                        .match(/\(([^)]+)\)|\b\w+\b/g)
                        ?.map(word => word.replace(/[()]/g, '').trim()) || [];

                    const typeNormalized = this.form.value.learningUnitType.trim().toLowerCase();
                    const maturityNormalized = this.form.value.maturity.trim().toLowerCase();

                    return templateWords.includes(typeNormalized) &&
                        templateWords.includes(maturityNormalized) &&
                        templateWords.includes(subject)

                }
            });

        });
    }



    fetchTemplates(): void {
        this.workflowTemplateService.getTemplates().get().subscribe(snapshot => {
            this.templateWordsList = [];

            snapshot.forEach(doc => {
                const data = doc.data() as { templateName?: string };

                if (data?.templateName) {
                    const templateWords = data.templateName
                        .toLowerCase()
                        .match(/\(([^)]+)\)|\b\w+\b/g)
                        ?.map(word => word.replace(/[()]/g, '').trim()) || [];

                    this.templateWordsList.push(templateWords);
                }
            });

            // this.shouldDisableOption('mathematics');
        });
    }

    // Check if subject should be disabled
    shouldDisableOption(subject: string): boolean {
        // console.log('Checking Subject:', subject);
        // const typeNormalized = this.form.value.type.trim().toLowerCase();


        if (!this.form.value.learningUnitType || !this.form.value.maturity) return false;

        if (!this.typeCode) {
            // console.warn('Type not found for:', this.form.value.type);
            return false;
        }

        // console.log(this.typeCode, 'typeCode');
        const maturityNormalized = this.form.value.maturity?.trim().toLowerCase();
        // console.log(maturityNormalized, 'maturityNormalized');
        const subjectNormalized = subject?.trim().toLowerCase();
        // console.log(subjectNormalized, 'subjectNormalized');
        const typeNormalized = this.typeCode?.trim().toLowerCase();
        // console.log(maturityNormalized, 'maturityNormalized');
        // console.log(subjectNormalized, 'subjectNormalized');
        // console.log(typeNormalized, 'typeNormalized');
        return this.templateWordsList.some(templateWords =>
            templateWords.includes(typeNormalized) &&
            templateWords.includes(maturityNormalized) &&
            templateWords.includes(subjectNormalized)
        );
    }



    // async loadWorkflowTemplates() {
    //     if (!this.form) return; // Ensure the form is initialized

    //     try {
    //         const snapshot = await lastValueFrom(this.workflowTemplateService.getTemplates().get());

    //         snapshot.forEach(doc => {
    //             const data = doc.data() as any;
    //             // console.log(doc.id, 'doc.id');
    //             // console.log(this.data.templateId, 'this.data.templateId');
    //             // console.log(data, 'data');
    //             if (doc.id === this.data.templateId) {
    //                 console.log(data.workflowSteps, 'data.workflowSteps');
    //                 this.workflowData = [...data.workflowSteps];
    //                 console.log('this.workflowData:', this.workflowData);


    //                 const resources: any = firstValueFrom(this.config.getResourceNames());
    //                 this.workflowData.map(step => {
    //                     const stepContents = step.contents.map(content => ({
    //                         ...content,
    //                         contentSubCategory: content.contentSubCategory || 'Not Found'
    //                     })

    //                     )
    //                     console.log(stepContents.contentSubCategory, 'contentsubcategory');
    //                     this.contentSubCategory = stepContents.contentSubCategory;
    //                     const storagePath = this.getStoragePath(resources.resources, this.contentSubCategory);
    //                     console.log(storagePath, 'storagepath');
    //                 }


    //                 );
    //                 const workflowStepsArray = this.form.get('workflowSteps') as FormArray;
    //                 if (!workflowStepsArray) {
    //                     console.error("FormArray 'workflowSteps' not initialized.");
    //                     return;
    //                 }

    //                 // Clear previous values
    //                 workflowStepsArray.clear();

    //                 // Use setTimeout to delay patching, preventing change detection issues
    //                 // setTimeout(() => {
    //                 const newSteps = this.workflowData.map(step =>
    //                     this.fb.group({
    //                         name: step.workflowStepName,
    //                         contents: step.contents,
    //                         sequenceNumber: step.sequenceNumber
    //                     })
    //                 );

    //                 // Efficiently update the FormArray at once
    //                 newSteps.forEach(step => workflowStepsArray.push(step));

    //                 console.log('Updated FormArray:', workflowStepsArray.value);

    //                 // Manually trigger change detection
    //                 this._changeDetectorRef.markForCheck();
    //                 // });
    //             }
    //         });
    //     } catch (error) {
    //         console.error('Error fetching workflow templates:', error);
    //     }
    // }


    async loadWorkflowTemplates() {
        if (!this.form) return;
        // if (!this.form) {
        //     console.warn('Form not initialized, calling initializeForm()...');
        //     this.initializeForm();
        // }
        try {
            const snapshot = await lastValueFrom(this.workflowTemplateService.getTemplates().get());

            // Fetch resources properly
            const resources: any = this.resourceNames;

            snapshot.forEach(doc => {
                const data = doc.data() as any;
                if (doc.id === this.data.templateId) {
                    this.totalSteps = data.workflowSteps.length;
                    this.workflowData = [...data.workflowSteps];

                    const workflowStepsArray = this.form.get('workflowSteps') as FormArray;
                    if (!workflowStepsArray) {
                        console.error("❌ FormArray 'workflowSteps' not initialized.");
                        return;
                    }

                    // Clear previous values
                    workflowStepsArray.clear();

                    // Process workflow steps
                    const newSteps = this.workflowData.map(step => {
                        const updatedContents = step.contents.map(content => {
                            const contentSubCategory = content.contentSubCategory || 'Not Found';
                            const storagePath = this.getStoragePath(resources.resources, contentSubCategory);
                            this.pdfFilePath = storagePath;
                            return {
                                ...content,
                                contentSubCategory,
                                storagePath
                            };
                        });

                        return this.fb.group({
                            name: step.workflowStepName,
                            contents: updatedContents, // Now includes storagePath
                            sequenceNumber: step.sequenceNumber
                        });
                    });

                    // Efficiently update the FormArray
                    newSteps.forEach(step => workflowStepsArray.push(step));

                    // Manually trigger change detection
                    this._changeDetectorRef.markForCheck();
                }
            });
        } catch (error) {
            console.error('❌ Error fetching workflow templates:', error);
        }
    }


    async hasCategories() {
        const resources: any = this.resourceNames;

        if (!resources || typeof resources.resources !== 'object') {
            console.error("Invalid resources data");
            return;
        }

        // Reset disableTypeMap before checking
        this.disableTypeMap = {};

        this.types.forEach(type => {
            const newType = type.name.replace(/\s+/g, ''); // Remove spaces
            const resourceData = resources.resources[newType];
            const isEmptyObject = resourceData && typeof resourceData === 'object' && Object.keys(resourceData).length === 0;

            // If the type is missing, mark it as disabled
            // this.disableTypeMap[type.name] = !resources.resources.hasOwnProperty(newType);
            this.disableTypeMap[type.name] = !resourceData || isEmptyObject;
        });

    }


    getStoragePath(resources, contentSubCategory) {
        for (const category in resources) {
            const subcategories = resources[category];

            for (const subcategory in subcategories) {
                const sections = subcategories[subcategory];

                for (const section in sections) {
                    const items = sections[section];

                    if (items.hasOwnProperty(contentSubCategory)) {
                        return items[contentSubCategory].storagePath || null;
                    }
                }
            }
        }
        return null; // Return null if no match found
    }

    async getDownloadUrl(storagePath: string): Promise<string> {
        try {
            const ref = this.storage.ref(storagePath);
            return await firstValueFrom(ref.getDownloadURL());

        } catch (error) {
            console.error(`🚨 Error fetching download URL for ${storagePath}:`, error);
            return '';
        }
    }



    isPptFile(safeUrl: SafeResourceUrl | null): boolean {
        // console.log(safeUrl);
        const rawUrl = safeUrl?.toString();
        const match = rawUrl?.match(/\/([^\/?]+)\?/);
        const filename = match?.[1] ?? '';
        // console.log(filename);
        return filename.toLowerCase().endsWith('.ppt') || filename.toLowerCase().endsWith('.pptx');
    }

    isPdfFile(safeUrl: SafeResourceUrl | null): boolean {
        const rawUrl = safeUrl?.toString();
        const match = rawUrl?.match(/\/([^\/?]+)\?/);
        const filename = match?.[1] ?? '';
        return filename.toLowerCase().endsWith('.pdf');
    }

    isImageFile(safeUrl: SafeResourceUrl | null): boolean {
        const rawUrl = safeUrl?.toString();
        const match = rawUrl?.match(/\/([^\/?]+)\?/);
        const filename = match?.[1] ?? '';
        return /\.(jpg|jpeg|png|gif)$/i.test(filename);
    }

    isPDF(path: string): boolean {
        return path.toLowerCase().includes('.pdf');
    }

    onTemplateModeChange(mode: 'default' | 'custom') {
        this.templateMode = mode;
        if (mode === 'custom') {
            this.customTemplateName = '';
            // this.showSteps = false;
            this.createWfTemplateButton = true;
            // this.showWorkflowStepButton = true;
            this.saveWfTemplateButton = false;
        } else {
            this.form.reset();
            // this.showSteps = true;
            this.createWfTemplateButton = false;
            // this.showWorkflowStepButton = false;
            this.saveWfTemplateButton = false;
        }
    }


    isCreateButtonEnabled2(): boolean {
        if (this.templateMode === 'custom') {
            // return !!this.customTemplateName?.trim() ;

            const hasName = !!this.customTemplateName?.trim();
            const workflowType = this.form.get('type')?.value;
            return hasName && !!workflowType;
        }

        return this.form.valid;
    }

    isCreateButtonEnabled(): boolean {
        if (this.templateMode === 'custom') {
            return !!this.customTemplateName?.trim() && !!this.customWorkflowType;
        }

        return this.form.valid;
    }


    initializeForm() {
        this.form = this.fb.group({
            learningUnitType: [this.data?.templateMode === 'custom' ? '' : '', Validators.required],
            maturity: [this.data?.templateMode === 'custom' ? '' : '', Validators.required],
            subject: [this.data?.templateMode === 'custom' ? '' : '', Validators.required],
            type: [this.data?.templateMode === 'custom' ? '' : '', Validators.required],
            workflowSteps: this.fb.array([]),
        });
    }

    emitTemplateMode() {
        this.templateModeChanged.emit(this.templateMode);
    }

}










