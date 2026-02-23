import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter, NgxMatDateFormats } from '@angular-material-components/datetime-picker';
import { NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular-material-components/moment-adapter';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { CustomNgxDatetimeAdapter } from 'app/shared/customNgxDatetimeAdapter';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, Subscription, firstValueFrom, lastValueFrom } from 'rxjs';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { BoardGradeResourcesService } from 'app/core/dbOperations/boardGradeResources/boardGradeResources.service';
import { NotificationService } from 'app/core/dbOperations/notifications/notification.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';

export const MY_FORMATS: NgxMatDateFormats = {
    parse: {
        dateInput: 'l, LTS',
    },
    display: {
        dateInput: 'DD/MM/YYYY hh:mm A',
        monthYearLabel: 'MMMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY'
    },
};

@Component({
    selector: 'app-edit-work-flow',
    templateUrl: './edit-work-flow.component.html',
    styleUrls: ['./edit-work-flow.component.scss'],
    providers: [
        {
            provide: NgxMatDateAdapter,
            useClass: CustomNgxDatetimeAdapter,
            deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS]
        },
        { provide: NGX_MAT_DATE_FORMATS, useValue: MY_FORMATS }
    ],
})
export class EditWorkFlowComponent implements OnInit, OnDestroy {
    @ViewChild('elementRef', { static: false })
    elementRef: ElementRef;

    allGames: any = [];
    workFlowContents: FormGroup;
    resourceKeys;
    luResourcesConfig;
    workFlowsDoc = {
        workflowSteps: [],
        sequenceNumber: 0,
    };
    staticResources = [];
    selectedMaturity: string;
    contentCategory = [
        { key: 'assignment', display: 'Assignment' },
        { key: 'tacDev', display: 'TACDev' },
        { key: '3S', display: '3S' },
        { key: 'graphics', display: 'Graphics' },
        { key: 'video', display: 'Video' },
        { key: 'socialMedia', display: 'Social Media' },
        { key: 'additional resources', display: 'Additional Resources' },
        { key: 'externalResources', display: 'External Resources (Legacy) option ' }
    ];
    contentSubCategories: any = {};
    additionalResType = [
        { type: 'PDF', name: 'Upload a PDF File' },
        { type: 'LINK', name: 'Paste YouTube Link' },
        { type: 'PPT', name: 'Upload PowerPoint Presentation' }
    ];
    maxValue: any;
    sequenceInitialvalue = new BehaviorSubject(null);
    submitBtnActive: boolean = true;
    _wfInitialValue = new BehaviorSubject(null);
    storageBucket: string = 'workflows';
    bytesTransferred: any;
    inputFileName;
    currentResource;
    assignmentsObject = {
        enableAssignmentDropDown: false,
        type: '',
        assignmentsTypes: [
            { displayName: 'Quiz', type: 'QUIZ' },
            { displayName: 'Upload', type: 'UPLOAD' },
            { displayName: 'Game', type: 'GAME' },
            { displayName: 'Form', type: 'FORM' },
            { displayName: 'Text Block', type: 'TEXTBLOCK' },
        ],
        fetchAssignmentsNames: [],
        programmeInfo: {},
        userMessage: '',
    };
    subscriptionRef: Subscription[] = [];
    workflowStepsClone: any;
    disableIsDownloadableSlider: boolean = false;
    disableUploadButton: boolean = false;
    disableGameLink: boolean = false;
    currentDate: Date;

    constructor(
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private workflowService: WorkflowsService,
        private uiService: UiService,
        private classroomService: ClassroomsService,
        public dialog: MatDialog,
        private afStorage: AngularFireStorage,
        private afs: AngularFirestore, // <-- added for Students query
        private dialogRef: MatDialogRef<EditWorkFlowComponent>,
        private assignmentService: AssignmentsService,
        private masterService: MasterService,
        private userService: UserService,
        private dateAdapter: DateAdapter<Date>,
        private config: ConfigurationService,
        private boardGradeResourceService: BoardGradeResourcesService,
        private notificationService: NotificationService
    ) {
        this.workFlowContents = this.fb.group({
            sequenceNumber: [1, Validators.required],
            workflowStepName: ['', Validators.required],
            workflowStepDescription: [],
            workflowStepDuration: [],
            workflowLocation: [],
            allowAccess: [],
            viewUnlab: [true],
            allowArtefactUpload: [false],
            scannedAssignments: [[]],
            canSkipWorkflowStep: [],
            contents: this.fb.array([]),
        });
    }

    async ngOnInit() {
        this.workFlowContents.statusChanges.subscribe(() => {});
        const typeMod = this.data.learningUnitInfo.type.replace(/\s+/g, '');
        const resourceNames = await firstValueFrom(this.config.getConfigurationDocumentOnce('resourceNames'));
        const resources: any = resourceNames.exists ? resourceNames.data() : {};
        const luResources = resources['resources'][typeMod];
        this.selectedMaturity = (String(this.data.learningUnitInfo.Maturity)).toLowerCase();
        const categories = Object.keys(luResources[this.selectedMaturity]);
        const keysToExclude = ['silver', 'gold', 'diamond', 'platinum'];
        this.contentSubCategories['externalResources'] = await this.camelCaseToProper(Object.keys(this.data.learningUnitInfo.resources).filter(key => !keysToExclude.includes(key)), false);
        const tacDisplayNames = [];

        categories.forEach((cat) => {
            const b = [];
            Object.keys(luResources[this.selectedMaturity][cat]).forEach((k) => {
                let obj;
                if (luResources[this.selectedMaturity][cat][k]) {
                    obj = {
                        key: k,
                        display: luResources[this.selectedMaturity][cat][k]?.display,
                        type: luResources[this.selectedMaturity][cat][k]?.type,
                        contentType: luResources[this.selectedMaturity][cat][k]?.allowedExtensions
                    };
                    b.push(obj);
                }
            });
            if (b.length > 0) {
                tacDisplayNames[cat] = b;
            }
        });
        tacDisplayNames['externalResources'] = this.camelCaseToProper(
            Object.keys(this.data.learningUnitInfo.resources)
                .filter(key => !['gold','silver','platinum','diamond'].includes(key))
                .filter(e => !['qrCodeImagePath','otherImagePath'].includes(e)),
            true
        );
        this.luResourcesConfig = luResources;
        this.resourceKeys = Object.keys(this.luResourcesConfig['resourceNames']);
        this.resourceKeys.push('externalResources');
        this.resourceKeys.push('assignment');
        this.resourceKeys.push('additional resources');
        this.staticResources.push('additional resources');
        this.staticResources.push('assignment');
        this.luResourcesConfig['resourceNames']['externalResources'] = 'External Resources (Legacy)';
        this.luResourcesConfig['resourceNames']['additional resources'] = 'Additional Resources';
        this.luResourcesConfig['resourceNames']['assignment'] = 'Assignment';

        if (this.data?.templateType === 'custom') {
            this.luResourcesConfig['resourceNames']['additional resources'] = 'Custom Resource';
            this.resourceKeys = ['assignment', 'custom resource'];
            this.staticResources = ['assignment', 'custom resource'];
            this.luResourcesConfig['resourceNames'] = {
                'assignment': 'Assignment',
                'custom resource': 'Custom Resource'
            };
        }

        categories.forEach((category) => {
            if (this.data.learningUnitResources.resources[category] && Object.keys(this.data.learningUnitResources.resources[category]).length == 0) {
                this.contentCategory = this.contentCategory.filter(e => e.key != category);
                this.resourceKeys = this.resourceKeys.filter(content => content != category);
            }
            this.contentSubCategories['externalResources'] = this.camelCaseToProper(
                Object.keys(this.data.learningUnitInfo.resources)
                    .filter(key => !['gold','silver','platinum','diamond'].includes(key))
                    .filter(e => !['qrCodeImagePath','otherImagePath'].includes(e)),
                true
            );
        });
        this.contentSubCategories = tacDisplayNames;
        this.workflowStepsClone = JSON.parse(JSON.stringify(this.data?.rawWorkflowInfo?.workflowSteps));
        const gameDocs = await lastValueFrom(this.masterService.getMasterDocByIdOnce('games'));
        this.allGames = gameDocs.exists ? gameDocs.get('gameNames') : [];

        this.assignmentService.getAllAssignments().subscribe((assignments) => {
            this.assignmentsObject.fetchAssignmentsNames = assignments;
            this.setForm(this.data?.selectedStep);
        });
        this.workFlowsDoc.workflowSteps = this.data?.rawWorkflowInfo?.workflowSteps;

        const selectedStepCopy = JSON.parse(JSON.stringify(this.data.selectedStep));
        delete selectedStepCopy.workflowStepType;
        delete selectedStepCopy.workflowSubtitle;

        this.workFlowContents.valueChanges.subscribe((change) => {
            if (JSON.stringify(this._wfInitialValue.value) == JSON.stringify(change)) {
                this.submitBtnActive = true;
            } else {
                this.submitBtnActive = false;
            }
        });
    }

    async checkContentCategory(type: string, contentIndex: number) {
        const nonContentResources = ['assignment', 'additional resources', 'externalResources', 'custom resource'];
        this.currentResource = !nonContentResources.includes(type) ? this.data.learningUnitResources.resources[type] : {};
        this.contents.at(contentIndex).patchValue({
            contentCategory: type,
            contentSubCategory: '',
            resourcePath: '',
            contentType: '',
            uploadProgress: 0,
        });
        this.inputFileName = '';
    }

    displayCategoryLabel = (value: string): string => {
        return this.luResourcesConfig?.resourceNames?.[value] || value;
    };

    camelCaseToProper(text: Array<string>, isExternalResource: boolean) {
        if (!isExternalResource) {
            return text.map((fieldName) => {
                let words = fieldName.replace(/([A-Z])/g, ' $1').trim();
                words = words.replace(/\b\w/g, char => char.toUpperCase());
                words = words.replace(/(\b\w\b) (?=\d|[A-Z])/g, '$1');
                return { key: fieldName, display: words };
            });
        } else {
            const resourceArr = [
                { key: 'observationPath', display: 'Lerning Unit Observation sheet' },
                { key: 'varVideoUrl', display: 'Var video' },
                { key: 'varGuidePath', display: 'Var Guide(pdf)' },
                { key: 'topicVideoUrl', display: 'Topic Video' },
                { key: 'topicGuidePath', display: 'Topic Guide' },
                { key: 'guidePath', display: 'Learning Unit Guide' },
                { key: 'materialPath', display: 'Lerning Unit Materials' },
                { key: 'videoUrl', display: 'Lerning Unit Video' }
            ];
            return resourceArr;
        }
    }

    async checkContentType(contentSubCategory: string, contentIndex: number) {
        const currentGrade = `grade_${this.data?.paramInfo?.classroomData?.grade?.toString()?.padStart(2, '0')}`;
        const contentCategory = this.contents.at(contentIndex).get('contentCategory').value;
        this.handleBoardGradeResources(this.currentResource, contentCategory, contentSubCategory, contentIndex, this.data?.paramInfo?.classroomData?.board, currentGrade);
    }

    async handleBoardGradeResources(currentResource: any, contentCategory: string, contentSubCategory: string, contentIndex: number, currentBoard: string, currentGrade: string) {
        if (!!this.data.learningUnitResources.resources[contentCategory][contentSubCategory] && typeof (this.data.learningUnitResources.resources[contentCategory][contentSubCategory]) === 'object') {
            if (this.data.learningUnitResources.resources[contentCategory][contentSubCategory].hasOwnProperty(currentBoard)) {
                const boardGradeResourceId = this.data.learningUnitResources.resources[contentCategory][contentSubCategory][currentBoard];
                const boardGradeResource = await lastValueFrom(this.boardGradeResourceService.getDocDataByDocIdOnce(boardGradeResourceId));
                if (boardGradeResource.get('resources').hasOwnProperty(currentGrade)) {
                    const resourcePath = boardGradeResource.get('resources')[currentGrade];
                    this.contents.at(contentIndex).patchValue({ contentSubCategory, resourcePath });
                } else if ((this.data.learningUnitResources.resources[contentCategory][contentSubCategory]).hasOwnProperty('universalGradeBoardResourcePath')) {
                    const resourcePath = this.data.learningUnitResources.resources[contentCategory][contentSubCategory].universalGradeBoardResourcePath;
                    this.contents.at(contentIndex).patchValue({ contentSubCategory, resourcePath });
                } else {
                    console.error(`Category "${contentCategory}" subcategory "${contentSubCategory}" not found in board "${currentBoard}" for grade "${currentGrade}"`);
                }
            } else {
                console.error(`Category "${contentCategory}" subcategory "${contentSubCategory}" not found in board "${currentBoard}"`);
            }
        }
        else if (this.data.learningUnitResources.resources[contentCategory][contentSubCategory] && this.data.learningUnitResources.resources[contentCategory][contentSubCategory].length) {
            this.contents.at(contentIndex).patchValue({ contentSubCategory, resourcePath: this.data.learningUnitResources.resources[contentCategory][contentSubCategory] });
        }
        else if (this.data.selectedStep.contents[contentIndex]['contentSubCategory'] === contentSubCategory) {
            this.contents.at(contentIndex).patchValue({ contentSubCategory, resourcePath: this.data.selectedStep.contents[contentIndex].resourcePath });
        }
        else {
            this.contents.at(contentIndex).patchValue({ contentSubCategory, resourcePath: currentResource?.[contentSubCategory] });
        };
        this.checkInvalid(this.workFlowContents);
    }

    selectedOtherType(otherName, contentIndex) {
        this.contents.at(contentIndex).patchValue({ contentName: otherName });
    }

    async selectAssignmentType(type, contentIndex) {
        const assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == type);
        this.contents.at(contentIndex).patchValue({
            assignmentType: type,
            fetchAssignmentsNames: assignments
        });
    }

    selectedGames(game, contentIndex) {
        (this.workFlowContents.get('contents') as FormArray).at(contentIndex).patchValue({
            resourcePath: game.url,
            assignmentId: game.gameId,
        });
    }

    selectedAssignment(assignmentObj, contentIndex) {
        this.contents.at(contentIndex).patchValue({ assignmentId: assignmentObj.docId });
        this.checkInvalid(this.workFlowContents);
    }

    addNewContent(content?: any, assignmentNames = []) {
        const fArr = this.contents;
        const filterAssignments = this.getFilterAssignments(content);
        this.currentDate = new Date();
        this.currentDate.setHours(this.currentDate.getHours() + 1);
        this.dateAdapter.setLocale('en');

        const fGroup = this.fb.group({
            'contentName': this.fb.control(content?.contentName || '', [Validators.required]),
            'contentCategory': this.fb.control(content?.contentCategory || '', [Validators.required]),
            'contentSubCategory': this.fb.control(content?.contentSubCategory || ''),
            'contentType': this.fb.control(''),
            'resourcePath': this.fb.control(content?.resourcePath || ''),
            'contentIsLocked': this.fb.control(content?.contentIsLocked || ''),
            'additionalResourceType': this.fb.control(content?.additionalResourceType || ''),
            'customResourceType': this.fb.control(content?.customResourceType || ''),
            'assignmentType': this.fb.control(content?.assignmentType || ''),
            'assignmentName': this.fb.control(content?.assignmentName || ''),
            'assignmentId': this.fb.control(content?.assignmentId || ''),
            'isDueDate': this.fb.control(content?.assignmentDueDate?.seconds ? true : false),
            'assignmentDueDate': this.fb.control(
                content?.assignmentDueDate?.seconds ? new Date(content?.assignmentDueDate?.seconds * 1000) : this.currentDate
            ),
            'fetchAssignmentsNames': this.fb.control(filterAssignments),
            'gameName': this.fb.control(content?.gameName || ''),
            'uploadProgress': 0,
            'isDownloadable': this.fb.control(content?.isDownloadable != undefined ? content?.isDownloadable : true),
        });
        fArr?.push(fGroup);

        const watchList = ['contentName','contentCategory'];
        const unlocklist = ['contentCategory','assignmentType'];

        for (let i = 0; i < watchList?.length; i++) {
            this.unlockFormSequentially(watchList[i], unlocklist[i]);
        };
    }

    getFilterAssignments(content) {
        let assignments = [];
        if (content?.contentCategory == 'assignment' && content?.assignmentType == 'UPLOAD') {
            assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'UPLOAD');
        } else if (content?.contentCategory == 'assignment' && content?.assignmentType == 'QUIZ') {
            assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'QUIZ');
        } else if (content?.contentCategory == 'assignment' && content?.assignmentType == 'FORM') {
            assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'FORM');
        }
        return assignments;
    }

    get contents() {
        return this.workFlowContents?.controls['contents'] as FormArray;
    }

    getAllSteps() {
        const updatedFormData = this.workFlowContents.value;

        updatedFormData.contents.map((c) => {
            delete c['fetchAssignmentsNames'];
            delete c['uploadProgress'];

            if (c['contentCategory'] == 'assignment') {
                c['assignmentDueDate'] = new Date(c['assignmentDueDate']);
                delete c['uploadProgress'];
            } else {
                delete c['assignmentDueDate'];
                delete c['assignmentName'];
                delete c['assignmentId'];
                delete c['assignmentType'];
                delete c['assignmentId'];
            };
        });
        const initialIndex = this.sequenceInitialvalue.value - 1;
        const newIndex = this.workFlowContents.get('sequenceNumber').value - 1;
        const arr = this.data.rawWorkflowInfo.workflowSteps;
        const reArr = this.reArrange(arr, initialIndex, updatedFormData, newIndex);
        this.data.rawWorkflowInfo.workflowSteps = this.getSequentially(reArr);
        return this.getSequentially(reArr);
    }

    /** -------------------- SUBMIT: CREATE / UPDATE + NOTIFICATIONS -------------------- */
    async onSubmit(resourcePath = '') {
        try {
            const classroomId = this.data.paramInfo.classroomId;
            const programmeId = this.data.paramInfo.programmeId;
            const luId = this.data?.paramInfo.luId;

            const templateWorkFlowSteps = {
                workflowSteps: this.getAllSteps(),
                templateId: this.data?.rawWorkflowInfo?.templateId,
                templateName: this.data?.rawWorkflowInfo?.templateName
            };

            // Read classroom (we’ll reuse to derive recipients)
            const classroomDoc = await this.classroomService.getClassroomDataById(classroomId);

            // Attach or create workflowId on classroom
            const clsProgrammeWorkFlowIdsArr = classroomDoc['programmes']?.[`${programmeId}`]?.['workflowIds'] || [];
            const checkLearningUnitId = clsProgrammeWorkFlowIdsArr.find((wfs: any) => wfs['learningUnitId'] == luId);

            if (checkLearningUnitId) {
                this.updateWorkflowDoc(templateWorkFlowSteps, checkLearningUnitId.workflowId);
            } else {
                const newlyCreatedWorkFlowDocId = this.createNewWorkFlowDocId(templateWorkFlowSteps);
                clsProgrammeWorkFlowIdsArr.push({ learningUnitId: luId, workflowId: newlyCreatedWorkFlowDocId });
                this.updateWorkFlowIdIntoCls(clsProgrammeWorkFlowIdsArr);
            }

            // Student notification cleanup (existing)
            await this.notificationService.updateUserStudentNotifications(
                this.workflowStepsClone,
                templateWorkFlowSteps.workflowSteps
            );

            // --------- NEW ASSIGNMENTS DETECT + RECIPIENTS RESOLUTION ----------
            const oldAssignmentIds = new Set<string>();
            (this.workflowStepsClone || []).forEach((step: any) =>
                (step?.contents || []).forEach((c: any) => {
                    if (c?.contentCategory === 'assignment' && c?.assignmentId) {
                        oldAssignmentIds.add(c.assignmentId);
                    }
                })
            );

            const newAssignments: Array<{ assignmentId: string; assignmentName: string; dueAt?: Date }> = [];
            (templateWorkFlowSteps.workflowSteps || []).forEach((step: any) =>
                (step?.contents || []).forEach((c: any) => {
                    if (c?.contentCategory === 'assignment' && c?.assignmentId && !oldAssignmentIds.has(c.assignmentId)) {
                        const dueAt =
                            c?.assignmentDueDate instanceof Date
                                ? c.assignmentDueDate
                                : (c?.assignmentDueDate?.seconds ? new Date(c.assignmentDueDate.seconds * 1000) : undefined);

                        newAssignments.push({
                            assignmentId: c.assignmentId,
                            assignmentName: c.assignmentName || c.contentName || 'Assignment',
                            dueAt
                        });
                    }
                })
            );

            const { teacherUid, studentIds } = await this._resolveRecipients(classroomId, classroomDoc);
         

            // ---------“DUE DATE” NOTIFICATIONS (created immediately; time = due date) ----------
            await this._createAssignmentDueNotifications({
                workflowSteps: templateWorkFlowSteps.workflowSteps,
                classroomId,
                programmeId,
                learningUnitId: luId,
                classroomDoc
            });

            this.uiService.alertMessage('Successful', 'Changes Successfully Saved', 'success');
            if (!resourcePath) {
                this.dialogRef.close();
            }
        } catch (error) {
            console.error(error);
        }
    }

    /** Resolve recipients:
     *  - teacherUid from auth
     *  - studentIds from classroomDoc or Students collection (classrooms.<id>.classroomId == <id>)
     */
    private async _resolveRecipients(classroomId: string, classroomDoc: any): Promise<{ teacherUid?: string, studentIds: string[] }> {
        const teacherAuth = await this.notificationService.getLoggedInUser();
        const teacherUid = teacherAuth?.uid;

        // 1) Try classroom lists first
        let studentIds: string[] =
            (Array.isArray(classroomDoc?.students) ? classroomDoc.students.map((s: any) => s?.uid).filter(Boolean) : []) ||
            (Array.isArray(classroomDoc?.studentIds) ? classroomDoc.studentIds.filter(Boolean) : []);

        // 2) If not present, query Students collection using nested map path
        if (!studentIds || studentIds.length === 0) {
            const nestedPath = `classrooms.${classroomId}.classroomId`;
            const snap = await this.afs.collection('Students', ref => ref.where(nestedPath, '==', classroomId)).get().toPromise();
            studentIds = (snap?.docs || []).map(d => d.id);
        }

        return { teacherUid, studentIds: Array.from(new Set(studentIds || [])) };
    }

    async checkWorkFlowIdIntoClassroom(luId: string) {
        const classroomId = this.data.paramInfo.classroomId;
        const programmeId = this.data.paramInfo.programmeId;
        const teacherCls = await this.classroomService.getClassroomDataById(classroomId);
        const clsProgrammeWorkFlowIdsArr = teacherCls['programmes'][`${programmeId}`]?.['workflowIds'] || [];
        return clsProgrammeWorkFlowIdsArr.find((wfs: any) => wfs['learningUnitId'] == luId);
    }

    updateWorkflowDoc(workFlowSteps: any, workFlowDocId) {
        this.workflowService.updateWorkFlowTemplate(workFlowSteps, workFlowDocId);
    }

    createNewWorkFlowDocId(templateWorkFlowSteps: any) {
        const workFlowId = this.workflowService.addNewWorkFlowTemplate(templateWorkFlowSteps);
        return workFlowId;
    }

    updateWorkFlowIdIntoCls(workFlowArr: any[]) {
        const classroomId = this.data.paramInfo.classroomId;
        const programmeId = this.data.paramInfo.programmeId;
        const updateWorkFlowIntoClsroom = {
            programmes: {
                [`${programmeId}`]: {
                    workflowIds: workFlowArr
                }
            }
        };
        this.classroomService.updateWorkFlowIdClassroom(updateWorkFlowIntoClsroom, classroomId);
    }

    setForm(formInfo) {
        if (formInfo) {
            this.maxValue = this.data?.rawWorkflowInfo?.workflowSteps?.length;
            this.sequenceInitialvalue.next(formInfo.sequenceNumber);
            this.workFlowContents.patchValue(formInfo);

            this.data.selectedStep.contents.map((c) => {
                this.addNewContent(c);
            });
            this._wfInitialValue.next(this.workFlowContents.value);
        } else {
            this.maxValue = this.data?.rawWorkflowInfo?.workflowSteps?.length + 1;
            this.sequenceInitialvalue.next(this.maxValue);
            this.workFlowContents.patchValue({
                sequenceNumber: this.data?.rawWorkflowInfo?.workflowSteps?.length + 1,
            });
            this.addNewContent();
        }
    }

    insert(arr, index, newItem) {
        arr.splice(index, 1);
        return [...arr.slice(0, index), newItem, ...arr.slice(index)];
    }

    reArrange(arr, initialIndex, newItem, newIndex) {
        arr.splice(initialIndex, 1);
        return [...arr.slice(0, newIndex), newItem, ...arr.slice(newIndex)];
    }

    getSequentially(arr: Array<any>) {
        let count = 1;
        return arr.map((d: any) => {
            const a = { ...d, 'sequenceNumber': count };
            count++;
            return a;
        });
    }

    deletElements(lessonIndex: number) {
        this.contents.removeAt(lessonIndex);
    }

    updateResourcePath(resourcePath, i) {
        this.contents.at(i).patchValue({ resourcePath });
    }

    onChooseFile(event, i, type) {
        this.inputFileName = event.target.files[0].name;
        const isValid = this.fileTypeAndSizeCheck(event.target.files[0], type);
        if (isValid) {
            this.upload(event, i, type);
        }
        this.elementRef.nativeElement.value = '';
    }

    async upload2(event, index, filetype?) {
        const content = this.contents.at(index).getRawValue();
        const bucketPath = `${this.storageBucket}/${this.data.paramInfo.classroomId}_${this.data.paramInfo.programmeId}/${this.data?.paramInfo.luId}_${index}/${content.contentSubCategory}.` + this.inputFileName.split('.').slice(-1).pop();
        const ref = this.afStorage.ref(bucketPath);

        const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.inputFileName } }).snapshotChanges();
        task.subscribe(async (uploadedSnapshot) => {
            const bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
            this.contents.at(index).patchValue({ 'uploadProgress': bytesTransferred });
            if (uploadedSnapshot.state === 'success') {
                this.updateResourcePath(bucketPath, index);
                this.uiService.alertMessage('successful', `The ${filetype.toUpperCase()} files has been uploaded successfully`, 'success');
            }
        });
    }

    async upload(event, index, filetype?) {
        const originalFileName = event.target.files[0].name;
        const bucketPath = `${this.storageBucket}/${this.data.paramInfo.classroomId}_${this.data.paramInfo.programmeId}/${this.data?.paramInfo.luId}_${index}/${originalFileName}`;
        const ref = this.afStorage.ref(bucketPath);

        const task = ref.put(event.target.files[0], { customMetadata: { original_name: originalFileName } }).snapshotChanges();
        task.subscribe(async (uploadedSnapshot) => {
            const bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
            this.contents.at(index).patchValue({ 'uploadProgress': bytesTransferred });
            if (uploadedSnapshot.state === 'success') {
                this.updateResourcePath(bucketPath, index);
                this.uiService.alertMessage('successful', `The ${filetype.toUpperCase()} files has been uploaded successfully`, 'success');
            }
        });
    }

    fileTypeAndSizeCheck(event, type) {
        const isValid = true;
        return isValid;
    }

    ngOnDestroy(): void {
        if (this.subscriptionRef.length) { this.subscriptionRef.map(d => d.unsubscribe()); }
    }

    unlockFormSequentially(watch: string, unlock: string) {
        const contentsArray = this.workFlowContents.get('contents') as FormArray;
        for (let i = 0; i < contentsArray.length; i++) {
            if (contentsArray?.at(i)?.get(watch)?.invalid && contentsArray?.at(i)?.get(watch) !== null) {
                contentsArray?.at(i)?.get(unlock)?.disable();
            };
            switch (watch) {
                case 'contentCategory':
                    contentsArray?.at(i)?.get(watch)?.valueChanges.subscribe((contentType) => {
                        if (['assignment', 'tacDev', 'video', 'additional resources', '3S', 'custom resource'].includes(contentType)) {
                            switch (contentType) {
                                case 'assignment': {
                                    const assignmentWatchList = ['contentCategory','assignmentType','assignmentName'];
                                    const assignmentUnlockList = ['assignmentType','assignmentName','isDueDate'];

                                    contentsArray?.at(i)?.get('assignmentDueDate')?.clearValidators();
                                    contentsArray?.at(i)?.get('assignmentDueDate')?.updateValueAndValidity();
                                    contentsArray?.at(i)?.get('contentSubCategory')?.clearValidators();
                                    contentsArray?.at(i)?.get('contentSubCategory')?.updateValueAndValidity();
                                    contentsArray?.at(i)?.get('assignmentType')?.valueChanges.subscribe((type) => {
                                        if (type === 'GAME') {
                                            contentsArray?.at(i)?.get('resourcePath')?.disable();
                                        };
                                    });
                                    for (let x = 0; x < assignmentWatchList.length; x++) {
                                        if (assignmentWatchList[x] == 'contentCategory') {
                                            contentsArray?.at(i)?.get(assignmentUnlockList[x]).addValidators(Validators.required);
                                        }
                                        if (!contentsArray?.at(i)?.get(assignmentUnlockList[x]).value) {
                                            contentsArray?.at(i)?.get(assignmentUnlockList[x])?.disable();
                                        };
                                        contentsArray?.at(i)?.get(assignmentWatchList[x])?.valueChanges?.subscribe((res) => {
                                            if (res && contentsArray?.at(i)?.get(assignmentWatchList[x])?.enabled) {
                                                contentsArray?.at(i)?.get(assignmentUnlockList[x])?.enable();
                                            }
                                        });
                                    };
                                    break;
                                }
                                case 'tacDev': {
                                    const tacDevWatchList = ['contentCategory','contentSubCategory'];
                                    const tacDevUnlockList = ['contentSubCategory','resourcePath'];
                                    contentsArray?.at(i)?.get('assignmentDueDate')?.clearValidators();
                                    contentsArray?.at(i)?.get('assignmentDueDate')?.updateValueAndValidity();
                                    contentsArray?.at(i)?.get('contentSubCategory')?.addValidators(Validators.required);

                                    for (let x = 0; x < tacDevWatchList.length; x++) {
                                        contentsArray?.at(i)?.get(tacDevWatchList[x])?.valueChanges?.subscribe((res) => {
                                            if (res && contentsArray?.at(i)?.get(tacDevWatchList[x])?.enabled) {
                                                if (contentsArray?.at(i).get('contentSubCategory').hasError('contentEmptyValidator')) {
                                                    console.error('empty category');
                                                }
                                                contentsArray?.at(i)?.get(tacDevUnlockList[x])?.enable();
                                            }
                                        });
                                    };
                                    break;
                                }
                                case 'video': {
                                    const videoWatchList = ['contentCategory','contentSubCategory'];
                                    const videoUnlockList = ['contentSubCategory','resourcePath'];
                                    contentsArray?.at(i)?.get('assignmentDueDate')?.clearValidators();
                                    contentsArray?.at(i)?.get('assignmentDueDate')?.updateValueAndValidity();
                                    contentsArray?.at(i)?.get('contentSubCategory')?.addValidators(Validators.required);

                                    for (let x = 0; x < videoWatchList.length; x++) {
                                        contentsArray?.at(i)?.get(videoWatchList[x])?.valueChanges?.subscribe((res) => {
                                            if (res && contentsArray?.at(i)?.get(videoWatchList[x])?.enabled) {
                                                contentsArray?.at(i)?.get(videoUnlockList[x])?.enable();
                                            }
                                        });
                                    };
                                    break;
                                }
                                case '3S': {
                                    const SWatchList = ['contentCategory','contentSubCategory'];
                                    const SUnlockList = ['contentSubCategory','resourcePath'];
                                    contentsArray?.at(i)?.get('assignmentDueDate')?.clearValidators();
                                    contentsArray?.at(i)?.get('assignmentDueDate')?.updateValueAndValidity();
                                    contentsArray?.at(i)?.get('contentSubCategory')?.addValidators(Validators.required);

                                    for (let x = 0; x < SWatchList.length; x++) {
                                        if (SWatchList[x] == 'contentCategory') {
                                            contentsArray?.at(i)?.get(SUnlockList[x]).addValidators([Validators.required]);
                                        }
                                        contentsArray?.at(i)?.get(SWatchList[x])?.valueChanges?.subscribe((res) => {
                                            if (res && contentsArray?.at(i)?.get(SWatchList[x])?.enabled) {
                                                contentsArray?.at(i)?.get(SUnlockList[x])?.enable();
                                            }
                                        });
                                    };
                                    break;
                                }
                                case 'additional resources': {
                                    const additionalResourcesWatchList = ['contentCategory','additionalResourceType'];
                                    const additionalResourcesUnlockList = ['additionalResourceType','resourcePath'];
                                    contentsArray?.at(i)?.get('contentSubCategory')?.clearValidators();
                                    contentsArray?.at(i)?.get('contentSubCategory')?.updateValueAndValidity();
                                    contentsArray?.at(i)?.get('resourcePath')?.clearValidators();
                                    contentsArray?.at(i)?.get('resourcePath')?.updateValueAndValidity();
                                    for (let x = 0; x < additionalResourcesWatchList.length; x++) {
                                        if (additionalResourcesWatchList[x] == 'contentCategory') {
                                            contentsArray?.at(i)?.get(additionalResourcesUnlockList[x]).addValidators([Validators.required]);
                                        }
                                        contentsArray?.at(i)?.get(additionalResourcesWatchList[x])?.valueChanges?.subscribe((res) => {
                                            if (res && contentsArray?.at(i)?.get(additionalResourcesWatchList[x])?.enabled) {
                                                contentsArray?.at(i)?.get(additionalResourcesUnlockList[x])?.enable();
                                            };
                                        });
                                    };
                                    break;
                                }
                                case 'custom resource': {
                                    const customResourceWatchList = ['contentCategory','customResourceType'];
                                    const customResourceUnlockList = ['customResourceType','resourcePath'];
                                    contentsArray?.at(i)?.get('contentSubCategory')?.clearValidators();
                                    contentsArray?.at(i)?.get('contentSubCategory')?.updateValueAndValidity();
                                    contentsArray?.at(i)?.get('resourcePath')?.clearValidators();
                                    contentsArray?.at(i)?.get('resourcePath')?.updateValueAndValidity();
                                    for (let x = 0; x < customResourceWatchList.length; x++) {
                                        if (customResourceWatchList[x] == 'contentCategory') {
                                            contentsArray?.at(i)?.get(customResourceUnlockList[x]).addValidators([Validators.required]);
                                        }
                                        contentsArray?.at(i)?.get(customResourceWatchList[x])?.valueChanges?.subscribe((res) => {
                                            if (res && contentsArray?.at(i)?.get(customResourceWatchList[x])?.enabled) {
                                                contentsArray?.at(i)?.get(customResourceUnlockList[x])?.enable();
                                            };
                                        });
                                    };
                                    break;
                                }
                                default:
                                    break;
                            }
                        } else {
                            const NewResourcesWatchList = ['contentCategory','contentSubCategory'];
                            const NewResourcesUnlockList = ['contentSubCategory','resourcePath'];
                            contentsArray?.at(i)?.get('contentSubCategory')?.clearValidators();
                            contentsArray?.at(i)?.get('contentSubCategory')?.updateValueAndValidity();
                            contentsArray?.at(i)?.get('assignmentDueDate')?.clearValidators();
                            contentsArray?.at(i)?.get('assignmentDueDate')?.updateValueAndValidity();
                            contentsArray?.at(i)?.get('resourcePath')?.clearValidators();
                            contentsArray?.at(i)?.get('resourcePath')?.updateValueAndValidity();
                            for (let x = 0; x < NewResourcesWatchList.length; x++) {
                                if (NewResourcesWatchList[x] == 'contentCategory') {
                                    contentsArray?.at(i)?.get(NewResourcesUnlockList[x]).addValidators([Validators.required]);
                                }
                                contentsArray?.at(i)?.get(NewResourcesWatchList[x])?.valueChanges?.subscribe((res) => {
                                    if (res && contentsArray?.at(i)?.get(NewResourcesWatchList[x])?.enabled) {
                                        contentsArray?.at(i)?.get(NewResourcesUnlockList[x])?.enable();
                                    };
                                });
                            };
                        }
                    });
                    break;
                default:
                    contentsArray?.at(i)?.get('assignmentDueDate')?.clearValidators();
                    contentsArray?.at(i)?.get('assignmentDueDate')?.updateValueAndValidity();
                    contentsArray?.at(i)?.get(watch)?.valueChanges?.subscribe((res) => {
                        if (res) {
                            contentsArray?.at(i)?.get(unlock)?.enable();
                        };
                    });
                    break;
            };
        };
    }

    formatTime(hours: number, minutes: number) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    checkInvalid(form: FormGroup) {
        Object.keys(this.workFlowContents.controls).forEach((field) => {
            const control = this.workFlowContents.get(field);
            if (control instanceof FormArray) {
                control.controls.forEach((arrayControl, index) => {
                    if (arrayControl.invalid) {}
                });
            } else {
                if (control && control.invalid) {}
            }
        });
    }

    getDynamicText(resource, type): string {
        return resource ? `Re-Upload ${type.toUpperCase()} file` : `Upload ${type.toUpperCase()} file`;
    }

    isYouTubeLink(url: string): boolean {
        return url && (url.startsWith('http://') || url.startsWith('https://'));
    }

    getInvalidControls(form: FormGroup | FormArray): string[] {
        const invalid: string[] = [];
        Object.keys(form.controls).forEach(key => {
            const control = form.get(key);
            if (control instanceof FormGroup || control instanceof FormArray) {
                const childInvalid = this.getInvalidControls(control).map(childKey => `${key}, ${childKey}`);
                invalid.push(...childInvalid);
            } else if (control && control.invalid) {
                console.warn(`${key} =>`, control.errors, 'Disabled:', control.disabled, 'Value:', control.value);
                invalid.push(key);
            }
        });
        return invalid;
    }

    /** -------------------- DUE DATE NOTIFICATIONS -------------------- */
    private async _createAssignmentDueNotifications(params: {
        workflowSteps: any[];
        classroomId: string;
        programmeId: string;
        learningUnitId: string;
        classroomDoc?: any;
    }) {
        const { workflowSteps, classroomId, programmeId, learningUnitId, classroomDoc } = params;

        const dueItems: Array<{ assignmentId?: string; assignmentName?: string; assignmentDueDate: Date; }> = [];
        for (const step of (workflowSteps || [])) {
            for (const content of (step?.contents || [])) {
                const isAssignment = content?.contentCategory === 'assignment';
                const dueDate: Date | undefined =
                    content?.assignmentDueDate instanceof Date
                        ? content.assignmentDueDate
                        : (content?.assignmentDueDate?.seconds ? new Date(content.assignmentDueDate.seconds * 1000) : undefined);

                if (isAssignment && dueDate) {
                    dueItems.push({
                        assignmentId: content?.assignmentId || '',
                        assignmentName: content?.assignmentName || content?.contentName || 'Assignment',
                        assignmentDueDate: dueDate
                    });
                }
            }
        }
        if (!dueItems.length) return;

        const { teacherUid, studentIds } = await this._resolveRecipients(classroomId, classroomDoc);

        const fmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
        const tasks: Promise<any>[] = [];

        for (const item of dueItems) {
            const dueStr = fmt.format(item.assignmentDueDate);

            const base: Omit<Notification, 'id'> = {
                description: `Your assignment ${item.assignmentName} is due on ${dueStr}`,
                title: 'Assignment due date',
                icon: 'mat_outline:circle_notifications',
                read: false,
                remove: false,
                time: item.assignmentDueDate as any, // store actual due time
                assignmentId: item.assignmentId || '',
                learningUnitId,
                classroomId,
                programmeId
            };

            if (teacherUid) {
                tasks.push(this.notificationService.createNotification({
                    ...(base as any),
                    userId: teacherUid,
                    role: 'teacher'
                }));
            }
            for (const sid of studentIds) {
                tasks.push(this.notificationService.createNotification({
                    ...(base as any),
                    userId: sid,
                    role: 'student'
                }));
            }
        }

        try { await Promise.all(tasks); } catch (e) { console.warn('[Notifications] fan-out failed', e); }
    }
}
