import { ChangeDetectorRef, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatTabGroup } from '@angular/material/tabs';
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
import { EditWorkFlowComponent } from './edit-work-flow/edit-work-flow.component';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { FuseConfirmdialogService } from '@fuse/services/confirmdialog';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { environment } from 'environments/environment';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { SharedService } from 'app/shared/shared.service';
import { ScannedDocumentManagerComponent } from '../../../shared/components/scanned-document-manager/scanned-document-manager.component';

@Component({
    selector: 'app-classroom-stepper',
    templateUrl: './classroom-stepper.component.html',
    styleUrls: ['./classroom-stepper.component.scss']
})
export class ClassroomStepperComponent implements OnInit, OnDestroy {

    @ViewChild('courseSteps', { static: true }) courseSteps: MatTabGroup;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    drawerMode: 'over' | 'side' = 'side';
    drawerOpened: boolean = true;
    currentStep: number;
    // currentStep: number = 1;
    resourcePathsinworkflowColl = [];
    isLoaded: boolean = false;
    teacherId: string;
    completedSteps: any;
    isHaveWorkflow: boolean = true;
    classroomData;
    routerData: any;
    privilege: boolean = false;
    workFlowForm: FormGroup;
    templateCopy;
    workflowInfo: any;
    currentWorkflow;
    isStarted = true;
    templateChanged = false;
    workflowTemplateDocs: any = [];
    selectedTemplate = '';
    tempView;
    queryParams: any;
    resetButton: boolean = false;
    unsubscribeArr = [];
    checkLearningUnitId: any = false;
    workflowStepsClone: any;
    showMessage = false;
    templateNameToDisplay: string;
    environment = environment;
    unlockedSteps: Promise<void>;
    workflowDataInProgramme: any;
    templateType: any;
    isQuizActive: boolean = false;

    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private router: Router,
        private userService: UserService,
        private activateRoute: ActivatedRoute,
        private workflowService: WorkflowsService,
        public dialog: MatDialog,
        private uiService: UiService,
        private workFlowTempService: WorkflowTemplateService,
        private classroomService: ClassroomsService,
        private luService: LearningUnitsService,
        private programmeService: ProgrammeService,
        private instituteService: InstitutionsService,
        private fuseConfirmationService: FuseConfirmationService,
        private fuseConfirmDialogService: FuseConfirmdialogService,
        private workFlowCompletionService: WorkflowCompletionService,
        private learningUnitService: LearningUnitsService,
        private configurationService: ConfigurationService,
        private learningUnitResourceService: LearningUnitResourcesService,
        private sharedService: SharedService,
        private drawerService: FuseDrawerService,
    ) {
        this.routerData = this.router.getCurrentNavigation()?.extras?.state || '';
        this.activateRoute.queryParams.subscribe(async (res) => {
            this.queryParams = res;
        });
        this.isStarted = true;
    }

    ngOnDestroy(): void {
        window.removeEventListener('beforeunload', this.onBrowserLeave);
        this.unsubscribeArr.forEach((obs) => {
            obs.unsubscribe();
        });
    }

    async ngOnInit() {
        this.drawerService.drawerCloseQuizSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((isQuizActive) => {
            this.isQuizActive = isQuizActive;
        });
        const luId = this.activateRoute.snapshot.params.tacDocId;
        const learningUnit: any = await this.luService.getLearningUnitData(luId);
        const domainCodesToInclude = await lastValueFrom(this.configurationService.getDomainCodesToInclude().pipe(first()));
        this.templateNameToDisplay = learningUnit.hasOwnProperty('subjectName') && learningUnit.hasOwnProperty('Maturity') && domainCodesToInclude.includes(learningUnit.domainCode) ? `Default (${learningUnit.typeCode}) (${learningUnit.subjectName}) (${learningUnit.Maturity})` : 'Default';
        this.onBrowserLeave();
        const classroomDoc: any = await lastValueFrom(this.classroomService.getClassroomByIdOnce(this.queryParams.classroomId));
        await this.getClassInfoAndWFTemplateInit(classroomDoc);
        await this.workflowInitialization(classroomDoc.data());
        this.getResponsiveUpdate();
        this.checkLearningUnitData();
        this.checkRouterData();
        this.userService.userInfoSub.subscribe((userInfo) => {
            this.teacherId = userInfo?.['docId'];
            this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
        });

        this.workFlowCompletionService.unlockedSteps.subscribe((res) => {
            if (this.workflowInfo?.workflowSteps) {
                this.workflowInfo.workflowSteps[res].isStepUnlocked = true;
                this.updateProgressInFirestore();
            }
        });


    }

    async getClassInfoAndWFTemplateInit(classroomDoc) {
        return await this.getWorkflowTemplates(classroomDoc.get('type'));
    }
    checkRouterData() {
        if (this.routerData) {
            this.luService.currentLearningUnitsName.next(this.routerData?.learningUnitDisplayName);

            const currentTeacherInfo = {
                lastProgrammeName: this.programmeService.currentProgrammeName.value,
                lastClassroomName: this.classroomService.currentClassroomName.value,
                lastInstitutionName: this.instituteService.currentInstitutionName.value,
                lastLearningUnitName: this.routerData?.learningUnitDisplayName
            };

            this.userService.setTeacherInfo({ currentTeacherInfo });
        }
    }

    async workflowInitialization(classroomDoc) {
        const luId = this.activateRoute.snapshot.params.tacDocId;
        this.checkLearningUnitId = await this.checkWorkFlowIdIntoClassroom(luId);

        if (this.checkLearningUnitId && this.checkLearningUnitId.hasOwnProperty('workflowId') && this.checkLearningUnitId?.['workflowId']?.length) {
            const docref = this.workflowService.get(this.checkLearningUnitId['workflowId']).pipe(takeUntil(this._unsubscribeAll)).subscribe(async (res) => {
                if (res && res.hasOwnProperty('workflowSteps')) {
                    this.workflowStepsClone = JSON.parse(JSON.stringify(res.workflowSteps));
                    const { unlockedSteps, completedSteps } = await this.getWorkflowFromLearningId(res);

                    await this.selectedWFTemplate(res, unlockedSteps, true);
                    this.setDefaultCurrentStep(completedSteps);
                    this.resetButton = false;
                    this.tempView = false;
                    this.isHaveWorkflow = true;
                    this.userService.changeWhatsappIconPosition.next(true);
                } else {
                    this.isHaveWorkflow = false;
                };
            });
            this.unsubscribeArr.push(docref);
        }
        else {
            /* Select Default template */
            if (classroomDoc?.type == 'CLASSROOM') {
                this.selectedWFTemplate(this.workflowTemplateDocs?.find(template => template?.templateName === this.templateNameToDisplay), 1, false);
            }
            this.resetButton = false;
            this.tempView = false;
            this.isHaveWorkflow = false;
        }
    }

    selectedWFTemplate(e: any, unlockedSteps, isSaved?) {
        if (!isSaved) {
            this.isStarted = false;
            this.templateChanged = true;
        }
        this.resetButton = true;
        this.selectedTemplate = e?.templateName;
        this.templateCopy = this.workflowTemplateDocs.filter(template => template?.templateName === this.selectedTemplate);
        // this.workflowChangeCopy = JSON.parse(JSON.stringify(this.templateCopy))
        return this.viewWorkflowTemplate(e, isSaved, unlockedSteps);
    }

    async checkLearningUnitData() {
        const luId = this.activateRoute.snapshot.params.tacDocId;
        if (!this.routerData.learningUnitInfo) {
            const luData = await this.luService.get(luId).pipe(take(1)).subscribe((lu) => {
                this.routerData = lu;
            });
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
        this.templateType = await firstValueFrom(this.workFlowTempService.checkWorkflowTemplateType(this.workflowInfo.templateId));
        this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
        this.unlockedSteps = this.workflowInfo?.workflowSteps.filter(step => step.isStepUnlocked).length;
        const workflowId = this.workflowInfo['workflowId'];
        if (workflowId && workflowId.length) {
            const workflowInfoIndex = this.classroomData.programmes[this.queryParams.programmeId].workflowIds.findIndex((wf: any) => wf.workflowId == workflowId);
            this.workflowDataInProgramme = this.classroomData.programmes[this.queryParams.programmeId].workflowIds[workflowInfoIndex];
        } else {
            console.error('Workflow not found in classroom programme for learning unit');
        }

        if (isSaved || this.isStarted) {
            const workflowcpy = await this.workflowService.parseWorkflowTemplate(allWorkFlowSteps, this.routerData, isSaved, boardGradeKeys, unlockedSteps);
            this.resourcePathsinworkflowColl = this.getresourcewithWorkflows(workflowcpy);
            const val = workflowcpy.workflowSteps.some(this.stepContainsWorkflowDoc);
            if (val) {
                this.showMessage = true;
            }
            else {
                this.showMessage = false;
            }
        }
    }

    getresourcewithWorkflows(workflowcpy) {
        const resourcewithWorkflow = [];
        workflowcpy?.workflowSteps?.forEach((step) => {
            let count = 0;
            step?.contents?.forEach((content) => {
                const resourcePathObj = content?.resourcePath?.universalGradeBoardResourcePath ? content?.resourcePath?.universalGradeBoardResourcePath : content?.resourcePath;
                if (resourcePathObj.includes('workflows')) {
                    count = count + 1;
                }
            });
            if (count > 0) {
                resourcewithWorkflow.push(step?.workflowStepName);
            }
        });
        return resourcewithWorkflow;
    }

    stepContainsWorkflowDoc(step) {
        const allResourcePaths = step.contents.map(content => content?.resourcePath?.universalGradeBoardResourcePath ? content?.resourcePath?.universalGradeBoardResourcePath : content?.resourcePath);
        const startsWithLearningUnits = element => element.toLowerCase().startsWith('workflows');
        // Use the `some` method
        const hasWorkflows = allResourcePaths.some(startsWithLearningUnits);
        const learningUnitsUrls = allResourcePaths.filter(startsWithLearningUnits);
        return hasWorkflows;
    }

    // async saveWorkFlowTemplate(workflowSteps?) {

    //     let dialogRef;
    //     if (this.showMessage) {
    //         const config = {
    //             title: 'Edit Workflow Steps',
    //             message: `Certain resources in the '${this.resourcePathsinworkflowColl.join(',')}' step differ from the template. Would you like to retain these modifications, or override them with the template?`,
    //             icon: {
    //                 name: 'mat_outline:delete'
    //             },
    //             message2: 'Do not overwrite any step',
    //             message1: 'Overwrite all steps',
    //             message3: 'Overwrite except custom step'
    //         };
    //         dialogRef = this.fuseConfirmDialogService.open(config);
    //         dialogRef.afterClosed().subscribe(async (result) => {
    //             if (result == 'confirmed') {
    //                 console.log('Confirmed to overwrite all steps');
    //                 const classroomId = this.queryParams.classroomId;
    //                 const programmeId = this.queryParams.programmeId;
    //                 const templateWorkFlowSteps = {
    //                     workflowSteps: this.templateCopy[0].workflowSteps,
    //                     // privilegeTable: this.workflowInfo.privilegeTable,
    //                     templateId: this.workflowInfo.templateId,
    //                     templateName: this.workflowInfo.templateName
    //                 };
    //                 const luId = this.activateRoute.snapshot.params.tacDocId;
    //                 const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
    //                 const clsProgrammeWorkFlowIdsArr = teacherCls['programmes']?.[`${programmeId}`]?.['workflowIds'] || [];
    //                 const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId);
    //                 if (checkLearningUnitId) {
    //                     const updatedWorkFlowSteps = templateWorkFlowSteps;
    //                     this.updateWorkflowDoc(updatedWorkFlowSteps, checkLearningUnitId.workflowId);


    //                 } else {
    //                     const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps);
    //                     clsProgrammeWorkFlowIdsArr.push({
    //                         learningUnitId: luId,
    //                         workflowId: newlyCreatedWorkFlowDocId,
    //                         lockAt: '',
    //                         unlockAt: '',
    //                         workflowLocked: false,
    //                     });

    //                     console.log('updating workflowId into classroom programme');
    //                     await this.updateWorkFlowIdIntoCls(clsProgrammeWorkFlowIdsArr);
    //                     await this.workflowInitialization(teacherCls);


    //                 }
    //                 console.log('Updating user student notifications');
    //                 await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps);
    //                 this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
    //             }
    //             else if (result == 'confirmedStep') {
    //                 console.log('Confirmed to overwrite except custom step');
    //                 let templateCopy = [];
    //                 templateCopy = this.workflowTemplateDocs.filter(template => template.templateName === this.selectedTemplate);
    //                 templateCopy[0].workflowSteps[this.currentStep - 1] = this.workflowInfo.workflowSteps[this.currentStep - 1];
    //                 // const wfdocs=await (this.workFlowTempService.getWorkFlowTemplates().toPromise())
    //                 const classroomId = this.queryParams.classroomId;
    //                 const programmeId = this.queryParams.programmeId;
    //                 const templateWorkFlowSteps = {
    //                     workflowSteps: this.templateCopy[0].workflowSteps,
    //                     templateId: this.workflowInfo.templateId,
    //                     templateName: this.workflowInfo.templateName
    //                 };
    //                 const luId = this.activateRoute.snapshot.params.tacDocId;
    //                 const teacherCls: any = await this.classroomService.getClassroomDataById(classroomId);
    //                 const clsProgrammeWorkFlowIdsArr = teacherCls['programmes']?.[`${programmeId}`]?.['workflowIds'] || [];
    //                 const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId);
    //                 if (checkLearningUnitId) {
    //                     const updatedWorkFlowSteps = templateWorkFlowSteps;
    //                     this.updateWorkflowDoc(updatedWorkFlowSteps, checkLearningUnitId.workflowId);
    //                 } else {
    //                     console.log('Creating new workflow document');
    //                     const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps);
    //                     clsProgrammeWorkFlowIdsArr.push({
    //                         learningUnitId: luId,
    //                         workflowId: newlyCreatedWorkFlowDocId,
    //                         lockAt: '',
    //                         unlockAt: '',
    //                         workflowLocked: false,
    //                     });
    //                     await this.updateWorkFlowIdIntoCls(clsProgrammeWorkFlowIdsArr);
    //                     await this.workflowInitialization(teacherCls);


    //                 }
    //                 console.log('finally updating user student notifications');
    //                 await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps);
    //                 this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
    //                 this.getWorkflowTemplates(teacherCls.type);
    //             }
    //             else {
    //                 //
    //             }
    //         });

    //     } else {

    //         const classroomId = this.queryParams.classroomId;
    //         const programmeId = this.queryParams.programmeId;
    //         const templateWorkFlowSteps = {
    //             workflowSteps: workflowSteps ? workflowSteps : this.workflowInfo.workflowSteps,
    //             // privilegeTable: this.workflowInfo.privilegeTable,
    //             templateId: this.workflowInfo.templateId,
    //             templateName: this.workflowInfo.templateName
    //         };
    //         const luId = this.activateRoute.snapshot.params.tacDocId;
    //         const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
    //         const clsProgrammeWorkFlowIdsArr = teacherCls?.['programmes']?.[`${programmeId}`]?.['workflowIds'] || [];
    //         const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId);



    //         if (checkLearningUnitId && checkLearningUnitId?.['workflowId']?.length) {
    //             const updatedWorkFlowSteps = templateWorkFlowSteps;
    //             this.updateWorkflowDoc(updatedWorkFlowSteps, checkLearningUnitId.workflowId);
    //         } else {
    //             const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps);
    //             if (clsProgrammeWorkFlowIdsArr.some(wfs => wfs['learningUnitId'].includes(luId))) {
    //                 const index = clsProgrammeWorkFlowIdsArr.findIndex(wfs => wfs['learningUnitId'].includes(luId));
    //                 clsProgrammeWorkFlowIdsArr[index].workflowId = newlyCreatedWorkFlowDocId;
    //             } else {
    //                 clsProgrammeWorkFlowIdsArr.push({
    //                     learningUnitId: luId,
    //                     workflowId: newlyCreatedWorkFlowDocId,
    //                     lockAt: '',
    //                     unlockAt: '',
    //                     workflowLocked: false,
    //                 });
    //             };
    //             console.log(templateWorkFlowSteps.templateName, 'templateName');
    //             console.log(classroomId, 'classroomId');
    //             console.log(programmeId, 'programmeId');
    //             console.log(this.queryParams.institutionId, 'institutionId');



    //             await this.updateWorkFlowIdIntoCls(clsProgrammeWorkFlowIdsArr);
    //             await this.workflowInitialization(teacherCls);


    //         }
    //         // const updateMessage = `A new workflow '${templateWorkFlowSteps.templateName}' has been updated for classroom Id '${classroomId}' and programme Id '${programmeId}'`;

    //         console.log('user student notifications updated');
    //         await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps);
    //         this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
    //     }
    // }

    async saveWorkFlowTemplate(workflowSteps?) {
        const slackBearerToken = environment.slackNotifications.newInstitution.slackBearerToken;
        const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
        const workflowAssignedBy = slackUsers?.[0]?.profile?.display_name || teacherName || 'unknown';
        const slackChannel = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.workflowSet.slackChannels);

        const classroomId = this.queryParams.classroomId;
        const programmeId = this.queryParams.programmeId;
        const luId = this.activateRoute.snapshot.params.tacDocId;

        let templateWorkFlowSteps = {
            workflowSteps: workflowSteps ? workflowSteps : this.workflowInfo.workflowSteps,
            templateId: this.workflowInfo.templateId,
            templateName: this.workflowInfo.templateName
        };

        let dialogRef;
        if (this.showMessage) {
            const config = {
                title: 'Edit Workflow Steps',
                message: `Certain resources in the '${this.resourcePathsinworkflowColl.join(',')}' step differ from the template. Would you like to retain these modifications, or override them with the template?`,
                icon: { name: 'mat_outline:delete' },
                message2: 'Do not overwrite any step',
                message1: 'Overwrite all steps',
                message3: 'Overwrite except custom step'
            };

            dialogRef = this.fuseConfirmDialogService.open(config);

            dialogRef.afterClosed().subscribe(async (result) => {
                if (!result) return;

                const teacherCls: any = await this.classroomService.getClassroomDataById(classroomId);
                const clsProgrammeWorkFlowIdsArr = teacherCls['programmes']?.[`${programmeId}`]?.['workflowIds'] || [];
                const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId);

                if (result === 'confirmedStep') {
                    // Overwrite all except current step
                    const templateCopy = this.workflowTemplateDocs.find(template => template.templateName === this.selectedTemplate);
                    templateCopy.workflowSteps[this.currentStep - 1] = this.workflowInfo.workflowSteps[this.currentStep - 1];
                    templateWorkFlowSteps = {
                        workflowSteps: templateCopy.workflowSteps,
                        templateId: templateCopy.templateId,
                        templateName: templateCopy.templateName
                    };
                }

                if (checkLearningUnitId) {
                    await this.updateWorkflowDoc(templateWorkFlowSteps, checkLearningUnitId.workflowId);
                } else {
                    const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps);
                    clsProgrammeWorkFlowIdsArr.push({
                        learningUnitId: luId,
                        workflowId: newlyCreatedWorkFlowDocId,
                        lockAt: '',
                        unlockAt: '',
                        workflowLocked: false,
                    });
                    await this.updateWorkFlowIdIntoCls(clsProgrammeWorkFlowIdsArr);
                    await this.workflowInitialization(teacherCls);
                }

                await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps);
                this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
                await this.sendWorkflowSlackNotification(templateWorkFlowSteps.templateName, templateWorkFlowSteps.templateId, workflowAssignedBy, slackUsers, slackChannel, slackBearerToken);

                if (result === 'confirmedStep') {
                    this.getWorkflowTemplates(teacherCls.type);
                }
            });

        } else {
            // No overwrite prompt, direct save
            const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
            const clsProgrammeWorkFlowIdsArr = teacherCls?.['programmes']?.[`${programmeId}`]?.['workflowIds'] || [];
            const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'] == luId);

            if (checkLearningUnitId?.['workflowId']?.length) {
                await this.updateWorkflowDoc(templateWorkFlowSteps, checkLearningUnitId.workflowId);
            } else {
                const newlyCreatedWorkFlowDocId = await this.createNewWorkFlowDocId(templateWorkFlowSteps);
                const existingIndex = clsProgrammeWorkFlowIdsArr.findIndex(wfs => wfs['learningUnitId'] === luId);
                if (existingIndex >= 0) {
                    clsProgrammeWorkFlowIdsArr[existingIndex].workflowId = newlyCreatedWorkFlowDocId;
                } else {
                    clsProgrammeWorkFlowIdsArr.push({
                        learningUnitId: luId,
                        workflowId: newlyCreatedWorkFlowDocId,
                        lockAt: '',
                        unlockAt: '',
                        workflowLocked: false,
                    });
                }
                await this.updateWorkFlowIdIntoCls(clsProgrammeWorkFlowIdsArr);
                await this.workflowInitialization(teacherCls);
            }

            await this.userService.updateUserStudentNotifications(this.workflowStepsClone, templateWorkFlowSteps.workflowSteps);
            this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
            await this.sendWorkflowSlackNotification(templateWorkFlowSteps.templateName, templateWorkFlowSteps.templateId, workflowAssignedBy, slackUsers, slackChannel, slackBearerToken);
        }
    }


    deleteWFStep(stepName) {
        const name = stepName.workflowStepName;
        const config = {
            title: `Delete ${name}`,
            message: 'Are you sure you want to delete ?',
            icon: {
                name: 'mat_outline:delete'
            }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        const workflowSteps: any = lodash.cloneDeep(this.workflowInfo.workflowSteps);
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

    async checkWorkFlowIdIntoClassroom(luId: string) {
        const classroomId = this.queryParams.classroomId;
        const programmeId = this.queryParams.programmeId;

        const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
        this.classroomData = teacherCls;



        const clsProgrammeWorkFlowIdsArr = teacherCls?.['programmes']?.[programmeId]?.['workflowIds'] || [];

        const tacdocId = await lastValueFrom(this.activateRoute.params.pipe(first()));
        const d: any = await this.luService.getLearningUnitData(tacdocId.tacDocId);

        return clsProgrammeWorkFlowIdsArr.find(wfs => wfs['learningUnitId'].includes('-') ? wfs['learningUnitId'] === d.learningUnitId : wfs['learningUnitId'] === d.docId);
    }

    /* Update Existing workflow */
    updateWorkflowDoc(workFlowSteps: any, workFlowDocId: string) {
        this.workflowService.updateWorkFlowTemplate(workFlowSteps, workFlowDocId);
    }

    /* Create New WorkFlow */
    createNewWorkFlowDocId(templateWorkFlowSteps: any) {
        const workFlowId = this.workflowService.addNewWorkFlowTemplate(templateWorkFlowSteps);
        return workFlowId;
    }

    // UpdateWorkId into classroom
    async updateWorkFlowIdIntoCls(workFlowArr: any[]) {
        const classroomId = this.queryParams.classroomId;
        const programmeId = this.queryParams.programmeId;
        const updateWorkFlowIntoClsroom = {
            programmes: {
                [`${programmeId}`]: {
                    // sequentiallyLocked: false,
                    workflowIds: workFlowArr
                }
            }
        };
        await this.classroomService.updateWorkFlowIdClassroom(updateWorkFlowIntoClsroom, classroomId);
    }

    addNewWorkFlowStep() {
        this.editWorkFlow(true);
    }

    /* Update/Edit WorkFlow Here */
    async editWorkFlow(isNewstep: boolean, step?: any): Promise<void> {
        const institutionId = this.queryParams.institutionId;
        const classroomId = this.queryParams.classroomId;
        const programmeId = this.queryParams.programmeId;
        const luId = this.activateRoute.snapshot.params.tacDocId;
        // get the learning unit resources here for both maturities. ask sriram about a maturity selector
        const maturity = this.routerData?.Maturity.toLowerCase();
        const resources = this.routerData?.resources;
        const learningResourceId = resources[maturity];
        const learningUnitResourceRef = await lastValueFrom(this.learningUnitResourceService.getDocDataByIdOnce(learningResourceId));
        const learningUnitResources = learningUnitResourceRef.exists ? learningUnitResourceRef.data() : {};

        await import('./edit-work-flow/edit-work-flow.module').then(() => {
            this.dialog.open(EditWorkFlowComponent, {
                data: {
                    selectedStep: step || false,
                    rawWorkflowInfo: this.workflowInfo || '',
                    paramInfo: {
                        institutionId: institutionId,
                        classroomId: classroomId,
                        programmeId: programmeId,
                        classroomData: this.classroomData,
                        luId
                    },
                    learningUnitInfo: this.routerData,
                    learningUnitResources,
                    templateType: this.templateType
                }
            });
        });
    }

    async openScannedDocumentsInterface(step: any) {
        const workflow = this.workflowInfo;
        const { scannedArtefacts } = step;
        const { tacDocId: learningUnitId } = this.activateRoute.snapshot.params;
        const { institutionId, classroomId, programmeId } = this.queryParams;
        const teacherDocId = this.teacherId;
        await import('../../../shared/components/scanned-document-manager/scanned-document-manager.component');
        this.dialog.open(ScannedDocumentManagerComponent, {
            data: {
                teacherDocId,
                institutionId,
                classroomId,
                programmeId,
                learningUnitId,
                workflow,
                step,
                scannedArtefacts,
            },
            minWidth: '90vw',
            minHeight: '80vh',
            disableClose: true,
        });
    }

    /* get WorkFlows Templates */
    getWorkflowTemplates(classroomType) {
        let workflowSubcription;
        if (classroomType == 'STEM-CLUB') {
            workflowSubcription = this.workFlowTempService.getWorkFlowTemplates().subscribe((d: any) => {
                this.workflowTemplateDocs = d.filter(x => x.type == 'STEM-CLUB');
            });
            this.unsubscribeArr.push(workflowSubcription);
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
            });
            this.unsubscribeArr.push(workflowSubcription);
        }

    }

    /*
    async configureWorkFlowStep(allWorkFlowSteps: any) {
      // const uid = await this.userService.getUid()
      this.workflowInfo = this.workflowService.parseWorkflow(allWorkFlowSteps);
      this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
    }
    */

    creatNav(studentId) {
        // this.sideNavigationService.getNav(studentId)
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    goToStep(step: number) {

        // Set the current step
        this.currentStep = step;


        this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
        // Go to the step
        // this.courseSteps.selectedIndex = this.currentStep - 1;
        // Mark for check
        this.updateProgressInFirestore();
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

    goBack() {
        if (this.isHaveWorkflow) {
            this.updateProgressInFirestore();
        }

        this.activateRoute.queryParams.subscribe(async (res) => {
            const institutionId = res?.institutionId;
            const classroomId = res?.classroomId;
            const programmeId = res?.programmeId;
            // this.router.navigate(['dashboard'],
            this.router.navigate([`dashboard/${classroomId}`],
                {
                    queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: programmeId }
                },
            );
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
        return JSON.parse(localStorage.getItem('studentInfo'));
    }

    filterWorkflow(arr: [], keyword) {
        return arr.filter((d: any) => d.workflowStepName == keyword)[0];
    }

    checkWorkflowstorageContent(workflowInfo) {
        this.resourcePathsinworkflowColl = this.getresourcewithWorkflows(workflowInfo);
        if (this.resourcePathsinworkflowColl.length > 0) {
            return true;
        }
        else {
            return false;
        }
    }

    toggleTemplate(change: MatSlideToggleChange) {
        if (change.checked == true && this.checkWorkflowstorageContent(this.workflowInfo)) {
            const config = {
                title: 'Edit Workflow Steps',
                message: 'You have made modifications to the current template. These changes will be lost if you select a new template. Would you like to proceed?',
                icon: {
                    name: 'mat_outline:delete'
                },
                message2: 'No, please cancel',
                message1: 'Yes, please proceed',
                message3: ''


            };
            const dialogRef = this.fuseConfirmDialogService.open(config);
            dialogRef.afterClosed().subscribe(async (result) => {
                if (result == 'confirmed') {
                    this.tempView = change.checked;
                }
                else {
                    this.tempView = !change.checked;
                }
            });
        }
        this.tempView = change.checked;

    }

    // async getWorkflowFromLearningId(workflow) {
    //     const luId = this.activateRoute.snapshot.params.tacDocId;
    //     if (workflow) {
    //         this.workflowService.get(workflow?.workflowId).pipe(take(1)).subscribe(res => {
    //             /*
    //             this.workflowInfo = this.workflowService.parseWorkflow(res);
    //             */
    //             const completionObj = {
    //                 teacherId: this.teacherId,
    //                 learningunitId: luId,
    //             };
    //             // const wfId = this.workflowInfo['workflowId'];
    //             const wfId = workflow?.workflowId;
    //             this.workFlowCompletionService
    //                 .getResourceById(completionObj)
    //                 .pipe(takeUntil(this._unsubscribeAll)).subscribe(response => {
    //                     if (response.data()) {
    //                         if (response.data()['workflows'].hasOwnProperty(wfId)) {
    //                             if (response.data()['workflows'][wfId]['completedSteps']) {
    //                                 this.setDefaultCurrentStep(response.data()['workflows'][wfId]['completedSteps']);
    //                             } else {
    //                                 this.setDefaultCurrentStep(1);
    //                             };
    //                         } else {
    //                             this.setDefaultCurrentStep(1);
    //                         };
    //                     } else {
    //                         this.setDefaultCurrentStep(1);
    //                         // this.currentWorkflow = this.workflowInfo.workflowSteps[this.currentStep - 1];
    //                     };
    //                 });
    //         });
    //     } else {
    //         this.setDefaultCurrentStep(1);
    //     };
    // }
    async getWorkflowFromLearningId(workflow) {
        const luId = this.activateRoute.snapshot.params.tacDocId;
        if (workflow) {
            try {
                const res = await this.workflowService.get(workflow?.workflowId).pipe(take(1)).toPromise();
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
                console.error('Error fetching workflow or completion data:', error);
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
        window.addEventListener('beforeunload', (event) => {
            this.updateProgressInFirestore();
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

            return;
        }

        const luId = this.activateRoute.snapshot.params.tacDocId;
        const wfId = this.workflowInfo['workflowId'];

        const completionObj = {
            teacherId: this.teacherId,
            learningunitId: luId,
        };

        const unlockedSteps = this.workflowInfo?.workflowSteps.filter(step => step?.isStepUnlocked)?.length;
        const workFlowProgress = {
            workflows: {
                [wfId]: {
                    completedSteps: this.currentStep,
                    unlockedSteps: unlockedSteps ? unlockedSteps : 0
                }
            },
            docId: luId
        };

        this.unlockedSteps = unlockedSteps;

        const completePercentage = (this.currentStep / this.workflowInfo.totalSteps) * 100;

        if (completePercentage >= 75) {
            this.setFlagInClassroomProgrammeWorkflow();
        }
        this._changeDetectorRef.markForCheck();
        // send work completion progress to firestore
        this.workFlowCompletionService
            .update(workFlowProgress, completionObj)
            .catch(err => console.error('Error sending work completion progress to firestore: ', err));
    }

    setFlagInClassroomProgrammeWorkflow() {
        const workflowId = this.workflowInfo['workflowId'];

        const workflowInfoIndex = this.classroomData.programmes[this.queryParams.programmeId].workflowIds.findIndex(wf => wf.workflowId == workflowId);
        this.classroomData.programmes[this.queryParams.programmeId].workflowIds[workflowInfoIndex] =
        {
            ...this.classroomData.programmes[this.queryParams.programmeId].workflowIds[workflowInfoIndex],
            isAllStepsCompleted: true
        };

        const obj = {
            programmes: this.classroomData.programmes
        };

        this.classroomService.updateWorkFlowIdClassroom(obj, this.queryParams.classroomId);
    }


    private async getEntityNames() {
        const [institutionDoc, classroomDoc, learningUnitDoc, programmeDoc] = await Promise.all([
            firstValueFrom(this.instituteService.getInstitutionByIdOnce(this.queryParams.institutionId)),
            firstValueFrom(this.classroomService.getClassroomByIdOnce(this.queryParams.classroomId)),
            firstValueFrom(this.learningUnitService.getLUByIdOnce(this.activateRoute.snapshot.params.tacDocId)),
            firstValueFrom(this.programmeService.getProgrammeByIdOnce(this.queryParams.programmeId)),
        ]);

        let classroomName = 'Unknown';
        if (classroomDoc.exists) {
            classroomName = classroomDoc.get('classroomName') || classroomDoc.get('stemClubName') || 'Unknown';
        }

        return {
            institutionName: institutionDoc.exists ? institutionDoc.get('institutionName') : 'Unknown',
            classroomName,
            // classroomName: classroomDoc.exists ? classroomDoc.get('classroomName') : 'Unknown',
            learningUnitName: learningUnitDoc.exists ? learningUnitDoc.get('learningUnitDisplayName') : 'Unknown',
            programmeName: programmeDoc.exists ? programmeDoc.get('displayName') : 'Unknown'
        };
    }

    private async sendWorkflowSlackNotification(
        templateName: string,
        templateId: string,
        workflowAssignedBy: string,
        slackUsers: any,
        slackChannel: any,
        slackBearerToken: string
    ) {
        const { institutionName, classroomName, learningUnitName, programmeName } = await this.getEntityNames();

        const slackMessage =
            `A new workflow has been set by ${workflowAssignedBy}, the details of which can be found below:\n\n` +
            `1. Institution Name: ${institutionName}\n` +
            `2. Classroom: ${classroomName}\n` +
            `3. Programme: ${programmeName}\n` +
            `4. Learning Unit: ${learningUnitName}\n` +
            `5. Template from which workflow was created: ${templateName}`


        await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, slackChannel, slackMessage);
    }

}
