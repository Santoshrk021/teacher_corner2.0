
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { CustomNgxDatetimeAdapter } from 'app/shared/customNgxDatetimeAdapter';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, firstValueFrom, lastValueFrom, Subscription } from 'rxjs';
import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter, NgxMatDateFormats } from '@angular-material-components/datetime-picker';
import { NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular-material-components/moment-adapter';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import moment from 'moment';
import { isEqual } from 'lodash';
import { WorkflowTemplatesService } from '../workflow-template.service';

export const MY_FORMATS: NgxMatDateFormats = {
    parse: {
        dateInput: 'l, LTS',
    },
    display: {
        dateInput: 'DD/MM/YYYY hh:mm A', // this is how your date will get displayed on the Input
        monthYearLabel: 'MMMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY'
    },
};

@Component({
    selector: 'app-workflow-step-dialog',
    templateUrl: './workflow-step-dialog.component.html',
    styleUrls: ['./workflow-step-dialog.component.scss'],
    providers: [
        {
            provide: NgxMatDateAdapter,
            useClass: CustomNgxDatetimeAdapter,
            deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS]
        },
        { provide: NGX_MAT_DATE_FORMATS, useValue: MY_FORMATS }
    ],
})
export class WorkflowStepDialogComponent implements OnInit {
    @ViewChild('elementRef', { static: false })
    elementRef: ElementRef;
    allGames: any = []
    workFlowContents: FormGroup;
    resourceKeys
    luResourcesConfig
    mValue
    workFlowsDoc = {
        workflowSteps: [],
        sequenceNumber: 0,
    }
    // fileTypes=['PDF','PPT','Image',]
    staticResources = []
    selectedMaturity: string;
    contentCategory: any[] = [];
    contentSubCategories: any = {};
    additionalResType = [{ type: 'PDF', name: 'Upload a PDF File' }, { type: 'LINK', name: 'Paste YouTube Link' }, { type: 'PPT', name: 'Upload PowerPoint Presentation' }]
    maxValue: any;
    sequenceInitialvalue = new BehaviorSubject(null)
    submitBtnActive: boolean = true;
    _wfInitialValue = new BehaviorSubject(null);
    storageBucket: string = 'workflows'
    bytesTransferred: any
    inputFileName
    currentResource
    assignmentsObject = {
        enableAssignmentDropDown: false,
        type: '',
        fetchAssignmentsNames: [],
        programmeInfo: {},
        userMessage: '',
    }
    assignmentTypes: any[] = [];
    subscriptionRef: Subscription[] = []
    workflowStepsClone: any;
    disableIsDownloadableSlider: boolean = false;
    disableUploadButton: boolean = false;
    disableGameLink: boolean = false;
    currentDate: Date;
    selectedType: string;
    selectMaturity: string;
    subCategories: any[] = [];
    allowedExtensions: any[] = [];
    subCat: any;
    showVideoUi: boolean = false;
    isURLOrRaw: boolean = false;
    subCategoriesType: any[] = [];
    showPdfUi: boolean = false;
    nextMonthDate: Date;
    currentStep: any;
    isEditMode: boolean = false;
    isSubmitEnabled = false;
    categoryListForUnavailable: any[] = ['additional resources', 'assignment'];
    subcategoriesList: any[] = [];
    originalFormValue: any;
    checkSpecificKeys: any[] = [];
    filteredFormData: any;
    isChanged: boolean = false;
    selectedSubCategory: any;
    storagePath: any;
    resourceNames: any;
    legacyTemplates = ['Mentorship Template One', 'Mentorship Template Two', 'Stem Club', 'Concept Connect', 'Default', 'Template Name 5', 'Template Name 4', 'Template Name 3', 'Template Name 2', 'Default (Legacy)', 'External Resources (Legacy)', 'IISER Sample DC Motor Model', 'IISER Sample DIY Battery', 'IISER Sample Thread Climber']

    constructor(
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private uiService: UiService,
        public dialog: MatDialog,
        private afStorage: AngularFireStorage,
        private dialogRef: MatDialogRef<WorkflowStepDialogComponent>,
        private assignmentService: AssignmentsService,
        private masterService: MasterService,
        private dateAdapter: DateAdapter<Date>,
        private config: ConfigurationService,
        private workflowTemplatesService: WorkflowTemplatesService
    ) {
        this.workFlowContents = this.fb.group({
            sequenceNumber: [this.data.step + 1, Validators.required],
            workflowStepName: ['', Validators.required],
            workflowStepDescription: [],
            workflowStepDuration: [],
            workflowLocation: [],
            allowAccess: [],
            viewUnlab: [true],
            canSkipWorkflowStep: [],
            contents: this.fb.array([], Validators.required),
        });
    }

    async ngOnInit() {
        const resourceNames = await firstValueFrom(this.config.getConfigurationDocumentOnce('resourceNames'));
        this.resourceNames = resourceNames.exists ? resourceNames.data() : {};

        // this.contentSubCategories['externalResources'] = await this.camelCaseToProper(Object.keys(this.data.learningUnitInfo.resources).filter(key => !keysToExclude.includes(key)), false);
        this.selectMaturity = this.data.maturity;
        this.selectedType = this.data.type;

        if (this.data.editDialog) {
            this.currentStep = this.data.stepDetails.sequenceNumber;
        } else {
            this.currentStep = this.data.step + 1;
        }

        this.getCategories(this.selectedType || this.data.type, this.selectMaturity || this.data.maturity);

        // const gameDocs = await this.masterService.getAllgames()
        // this.allGames = gameDocs?.['gameNames']

        const gameDocs = await lastValueFrom(this.masterService.getMasterDocByIdOnce('games'));
        this.allGames = gameDocs.exists ? gameDocs.get('gameNames') : [];

        this.assignmentService.getAllAssignments().subscribe(assignments => {
            this.assignmentsObject.fetchAssignmentsNames = assignments;
            // this.setForm(this.data?.selectedStep);
        })
        // this.workFlowsDoc.workflowSteps = this.data?.rawWorkflowInfo?.workflowSteps

        // let selectedStepCopy = JSON.parse(JSON.stringify(this.data.selectedStep))
        // delete selectedStepCopy.workflowStepType;
        // delete selectedStepCopy.workflowSubtitle;

        // this.workFlowContents.valueChanges.subscribe(change => {
        //     console.log('change', change);
        //     console.log(this.data.stepDetails, 'stepDetails');

        //     if (JSON.stringify(this.data.stepDetails) == JSON.stringify(change)) {
        //         this.submitBtnActive = true
        //     }
        //     else {
        //         this.submitBtnActive = false
        //     }
        // })

        // this.workFlowContents.valueChanges.subscribe(change => {
        //     console.log('change', change);
        //     console.log(this.data.stepDetails, 'stepDetails');

        //     this.submitBtnActive = this.workFlowContents.invalid || JSON.stringify(this.data.stepDetails) === JSON.stringify(change);
        // });

        // this.workFlowContents.valueChanges.subscribe(change => {
        //     console.log('change', change);
        //     console.log(this.data.stepDetails, 'stepDetails');
        //     console.log(this.workFlowContents);


        //     this.isSubmitEnabled = this.workFlowContents.valid && JSON.stringify(this.data.stepDetails) !== JSON.stringify(change);
        //     console.log(JSON.stringify(this.data.stepDetails), 'isSubmitEnabled');
        //     console.log(JSON.stringify(change), 'isSubmitEnabled');
        // });

        await this.loadWorkflowContents();
        // this.setupFormValueChangeHandler();
        this.workFlowContents.valueChanges.subscribe(() => {
            this.isChanged = this.checkIfFormChanged();
        });

    }


    filterUnnecessaryFields(formValue: any): any {
        // console.log("🔍 Before Filtering:", formValue);

        if (!formValue || typeof formValue !== "object") {
            console.error("❌ Invalid Form Value:", formValue);
            return {};
        }

        const filteredContents = formValue.contents?.map(content => {
            let filteredContent = {
                contentName: content.contentName || '',
                contentCategory: content.contentCategory || '',
                contentSubCategory: content.contentSubCategory || '',
                contentIsLocked: content.contentIsLocked ?? false,
                additionalResourceType: content.additionalResourceType || '',
                customResourceType: content.customResourceType || '',
                assignmentType: content.assignmentType || '',
                assignmentName: content.assignmentName || '',
                assignmentId: content.assignmentId || null,
                isDueDate: content.isDueDate ?? false,
                // canSkipWorkflowStep: content.canSkipWorkflowStep ?? null,
                gameName: content.gameName || '',
                // workflowStepDescription: content.workflowStepDescription || null,
                // workflowLocation: content.workflowLocation || null,
            };


            if (!content.isDueDate && content.assignmentId == null) {
                delete filteredContent.assignmentId;
                delete filteredContent.assignmentName;
                delete filteredContent.assignmentType;
            }

            return filteredContent;
        }) || [];

        const filteredData = {
            sequenceNumber: formValue.sequenceNumber || null,
            workflowStepName: formValue.workflowStepName || '',
            workflowStepDescription: formValue.workflowStepDescription || null,
            workflowStepDuration: formValue.workflowStepDuration || null,
            workflowLocation: formValue.workflowLocation || null,
            allowAccess: formValue.allowAccess ?? null,
            viewUnlab: formValue.viewUnlab ?? false,
            canSkipWorkflowStep: formValue.canSkipWorkflowStep ?? false,
            contents: filteredContents
        };

        // console.log("✅ After Filtering:", filteredData);
        this.filteredFormData = filteredData;
        return filteredData;
    }



    getFilterAssignments(content) {
        let assignments = []
        if (content?.contentCategory == 'assignment' && content?.assignmentType == 'UPLOAD') {
            assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'UPLOAD')
        }
        else if (content?.contentCategory == 'assignment' && content?.assignmentType == 'QUIZ') {
            assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'QUIZ')
        }
        else if (content?.contentCategory == 'assignment' && content?.assignmentType == 'FORM') {
            assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'FORM')
        }
        return assignments
    }

    get contents() {
        return this.workFlowContents?.controls["contents"] as FormArray;
    }


    /*
        onSubmit() {
            console.log('on submit triggered');
            console.log(this.workFlowContents.value, 'values');

            if (!this.workFlowContents.valid) {
                return;
            }

            console.log(this.workFlowContents.value);
            this._wfInitialValue.next(this.workFlowContents.value);

            console.log(this.data.workflowSteps, 'workflowSteps before update');

            const oldSequenceNumber = this.currentStep;
            const newSequenceNumber = this.workFlowContents.value.sequenceNumber;

            // Prevent unnecessary updates
            if (oldSequenceNumber === newSequenceNumber) {
                return this.dialogRef.close({
                    workFlowContents: this.workFlowContents.value,
                    workflowSteps: this.data.workflowSteps, // No changes needed, just return
                });
            }

            // Clone the array to avoid modifying the original reference
            let updatedSteps = [...this.data.workflowSteps];

            // Find the step that is being moved
            const movingStep = updatedSteps.find((step: any) => step.sequenceNumber === oldSequenceNumber);
            if (!movingStep) {
                console.error("Moving step not found!");
                return;
            }

            // Remove the moving step temporarily
            updatedSteps = updatedSteps.filter((step: any) => step.sequenceNumber !== oldSequenceNumber);

            // Shift steps accordingly
            updatedSteps = updatedSteps.map((step) => {
                if (oldSequenceNumber < newSequenceNumber) {
                    // Moving DOWN: Shift steps between old and new UP by 1
                    if (step.sequenceNumber > oldSequenceNumber && step.sequenceNumber <= newSequenceNumber) {
                        return { ...step, sequenceNumber: step.sequenceNumber - 1 };
                    }
                } else {
                    // Moving UP: Shift steps between new and old DOWN by 1
                    if (step.sequenceNumber >= newSequenceNumber && step.sequenceNumber < oldSequenceNumber) {
                        return { ...step, sequenceNumber: step.sequenceNumber + 1 };
                    }
                }
                return step;
            });

            // Reinsert the moving step at its new position
            movingStep.sequenceNumber = newSequenceNumber;

            updatedSteps.push(movingStep);

            // Ensure correct order
            updatedSteps.sort((a: any, b: any) => a.sequenceNumber - b.sequenceNumber);

            // ✅ Update workflowSteps before closing the dialog
            this.data.workflowSteps = updatedSteps;

            console.log('Updated workflowSteps:', this.data.workflowSteps);

            // ✅ Now pass the updated workflowSteps through dialog close
            this.dialogRef.close({
                workFlowContents: this.workFlowContents.value,
                workflowSteps: this.data?.workflowSteps, // Now updated and correctly passed
            });
        }

        */

    onSubmit() {
        if (!this.workFlowContents.valid) {
            console.warn('⚠ Form is invalid. Exiting.');
            return;
        }


        // ✅ Check if workflowSteps exists, if not, initialize an empty array
        let updatedSteps = Array.isArray(this.data.workflowSteps) ? [...this.data.workflowSteps] : [];

        const oldSequenceNumber = this.currentStep;
        const newSequenceNumber = this.workFlowContents.value.sequenceNumber;

        // Find the existing step
        let movingStep = updatedSteps.find((step: any) => step.sequenceNumber === oldSequenceNumber);

        if (!movingStep) {

            movingStep = { ...this.workFlowContents.value };
        } else {
            movingStep = {
                ...movingStep,
                ...this.workFlowContents.value,
            };

            updatedSteps = updatedSteps.filter((step: any) => step.sequenceNumber !== oldSequenceNumber);
        }

        if (oldSequenceNumber !== newSequenceNumber) {
            updatedSteps = updatedSteps.map((step) => {
                if (oldSequenceNumber < newSequenceNumber) {
                    if (step.sequenceNumber > oldSequenceNumber && step.sequenceNumber <= newSequenceNumber) {
                        return { ...step, sequenceNumber: step.sequenceNumber - 1 };
                    }
                } else {
                    if (step.sequenceNumber >= newSequenceNumber && step.sequenceNumber < oldSequenceNumber) {
                        return { ...step, sequenceNumber: step.sequenceNumber + 1 };
                    }
                }
                return step;
            });
        }

        movingStep.sequenceNumber = newSequenceNumber;
        updatedSteps.push(movingStep);

        updatedSteps.sort((a: any, b: any) => a.sequenceNumber - b.sequenceNumber);

        this.data.workflowSteps = updatedSteps;
        this.dialogRef.close({
            workFlowContents: this.workFlowContents.value,
            workflowSteps: this.data.workflowSteps,
            contentSubCategory: this.selectedSubCategory
        });

    }

    closeDialog() {
        // this.dialogRef.close();
        this.dialogRef.close({ contentSubCategory: this.selectedSubCategory, storagePath: this.storagePath });
    }


    // addNewContent(content?: any, assignmentNames = []) {
    //     const fArr = this.contents
    //     const filterAssignments = this.getFilterAssignments(content);
    //     console.log(filterAssignments, 'filterAssignments');

    //     this.currentDate = new Date();
    //     // this.currentDate.setHours(this.currentDate.getHours() + 1);
    //     this.currentDate.setHours(this.currentDate.getHours());
    //     this.dateAdapter.setLocale('en');
    //     this.nextMonthDate = new Date(this.currentDate);
    //     this.nextMonthDate.setMonth(this.currentDate.getMonth() + 1);

    //     // parsedDate = new Date(currentAssignment.assignmentDueDate?.seconds * 1000);
    //     const fGroup = this.fb.group({
    //         contentName: this.fb.control('', [Validators.required]),
    //         contentCategory: this.fb.control('', [Validators.required]),
    //         contentSubCategory: this.fb.control(''),
    //         subCategoriesList: this.fb.control([]),
    //         // contentType: this.fb.control(''),
    //         // resourcePath: this.fb.control(''),
    //         contentIsLocked: this.fb.control(''),
    //         additionalResourceType: this.fb.control(''),
    //         assignmentType: this.fb.control(''),
    //         assignmentName: this.fb.control(''),
    //         assignmentId: this.fb.control(''),
    //         // isDueDate: this.fb.control(content?.assignmentDueDate?.seconds ? true : false),

    //         // assignmentDueDate: this.fb.control(content?.assignmentDueDate?.seconds ? new Date(content?.assignmentDueDate?.seconds * 1000) : this.nextMonthDate),
    //         isDueDate: this.fb.control(false),
    //         assignmentDueDate: this.fb.control(this.nextMonthDate),
    //         fetchAssignmentsNames: this.fb.control(filterAssignments),
    //         gameName: this.fb.control(''),
    //         'uploadProgress': 0,
    //         // 'isDownloadable': this.fb.control(content?.isDownloadable != undefined ? content?.isDownloadable : true),
    //     })
    //     fArr?.push(fGroup);

    //     const watchList = [
    //         'contentName',
    //         'contentCategory',
    //         // 'contentType',
    //     ];

    //     const unlocklist = [
    //         // 'contentType',
    //         'contentCategory',
    //         'assignmentType',
    //     ];

    //     // for (let i = 0; i < watchList?.length; i++) {
    //     //     this.unlockFormSequentially(watchList[i], unlocklist[i]);
    //     // };
    // }


    addNewContent(content?: any, assignmentNames = []) {
        const fArr = this.contents;
        const filterAssignments = this.getFilterAssignments(content);
        this.currentDate = new Date();
        this.currentDate.setHours(this.currentDate.getHours());
        this.dateAdapter.setLocale('en');
        this.nextMonthDate = new Date(this.currentDate);
        this.nextMonthDate.setMonth(this.currentDate.getMonth() + 1);

        // Initialize form group
        const fGroup = this.fb.group({
            contentName: this.fb.control('', [Validators.required]),
            contentCategory: this.fb.control('', [Validators.required]),
            contentSubCategory: this.fb.control(''),
            subCategoriesList: this.fb.control([]),
            contentIsLocked: this.fb.control(''),
            additionalResourceType: this.fb.control(''),
            customResourceType: this.fb.control(''),
            gameName: this.fb.control(''),
            uploadProgress: this.fb.control(0),
            fetchAssignmentsNames: this.fb.control(filterAssignments),

            // **Assignment Fields (Disabled Initially)**
            assignmentType: this.fb.control({ value: '', disabled: true }),
            assignmentName: this.fb.control({ value: '', disabled: true }),
            assignmentId: this.fb.control({ value: '', disabled: true }),
            isDueDate: this.fb.control({ value: false, disabled: true }),
            assignmentDueDate: this.fb.control({ value: this.nextMonthDate, disabled: true }),
        });

        // **Handle Category Change: Update Subcategories**
        fGroup.get('contentCategory')?.valueChanges.subscribe(async (category) => {
            if (category) {
                const subCategories = await this.checkContentCategory(this.selectedType, this.selectMaturity, category);
                fGroup.get('subCategoriesList')?.setValue(subCategories || []);
            }

            // **Enable/Disable Assignment Fields Based on Category**
            if (category === 'assignment') {
                fGroup.get('assignmentType')?.enable();
                fGroup.get('assignmentName')?.enable();
                fGroup.get('assignmentId')?.enable();
                fGroup.get('isDueDate')?.enable();
            } else {
                fGroup.get('assignmentType')?.disable();
                fGroup.get('assignmentName')?.disable();
                fGroup.get('assignmentId')?.disable();
                fGroup.get('isDueDate')?.disable();
                fGroup.get('assignmentDueDate')?.disable();
            }
        });

        // **Handle Due Date Change**
        fGroup.get('isDueDate')?.valueChanges.subscribe((isDue) => {
            if (isDue) {
                fGroup.get('assignmentDueDate')?.enable();
            } else {
                fGroup.get('assignmentDueDate')?.disable();
            }
        });

        fArr?.push(fGroup);
    }


    deletElements(lessonIndex: number) {
        this.contents.removeAt(lessonIndex);
    }



    // async checkContentCategory(type: string, maturity: string, category: string): Promise<any[]> {
    //     const resources: any = this.resourceNames;

    //     if (!resources || typeof resources.resources !== 'object') {
    //         console.error("Invalid resources data");
    //         return [];
    //     }

    //     const normalizedType = type.replace(/\s/g, '');
    //     const normalizedMaturity = maturity.toLowerCase();

    //     if (!resources.resources.hasOwnProperty(normalizedType)) {
    //         console.warn(`Type "${type}" not found.`);
    //         return [];
    //     }

    //     const typeData = resources.resources[normalizedType];

    //     if (!typeData.hasOwnProperty(normalizedMaturity)) {
    //         return [];
    //     }

    //     const maturityData = typeData[normalizedMaturity];

    //     if (!maturityData || typeof maturityData !== 'object') {
    //         console.error(`Invalid maturity data for "${maturity}".`);
    //         return [];
    //     }


    //     if (category === 'assignment') {
    //         await this.loadAssignmentTypes();
    //     }

    //     if (!maturityData.hasOwnProperty(category)) {
    //         console.warn(`Category "${category}" not found in maturity level "${maturity}".`);
    //         return [];
    //     }

    //     const categoryData = maturityData[category];

    //     if (!categoryData || typeof categoryData !== 'object') {
    //         console.error(`Invalid category data for "${category}".`);
    //         return [];
    //     }

    //     // Create a local subcategory list instead of modifying `this.subCategories`
    //     const subCat = Object.entries(categoryData).reduce((acc, [key, value]) => {
    //         acc[key] = value;
    //         return acc;
    //     }, {} as Record<string, any>);

    //     // Transform `subCat` into an array of objects with `{ key, value }` structure
    //     const subCategoriesList = Object.entries(subCat).map(([key, value]: [string, any]) => ({
    //         key: key,
    //         value: value.display
    //     }));

    //     this.subcategoriesList = subCategoriesList;
    //     return [...subCategoriesList];

    //     // return subCategoriesList;
    // }

    async checkContentCategory(type: string, maturity: string, category: string): Promise<any[]> {
        const resources: any = this.resourceNames;

        // Patch the selected category to the form control
        this.contents.get('contentCategory')?.setValue(category); // << ensure selected value is reflected

        // Handle independent categories
        if (category === 'assignment') {
            await this.loadAssignmentTypes();
            // this.contents.get('subCategoriesList')?.setValue(this.subcategoriesList); 

            // If you want to patch the first assignment subcategory
            if (this.subcategoriesList.length > 0) {
                this.contents.get('contentSubCategory')?.setValue(this.subcategoriesList[0].key);
            }
            return this.subcategoriesList;
        }

        if (category === 'additional resources') {
            // Clear subCategoriesList and patch a basic/default value
            this.subcategoriesList = [];
            this.contents.get('subCategoriesList')?.setValue([]);
            this.contents.get('contentSubCategory')?.setValue('general');
            return [];
        }

        // Rest of your existing logic for type + maturity dependent categories
        if (!resources || typeof resources.resources !== 'object') {
            console.error("Invalid resources data");
            return [];
        }

        const normalizedType = type?.replace(/\s/g, '');
        const normalizedMaturity = maturity?.toLowerCase();

        if (!resources.resources.hasOwnProperty(normalizedType)) {
            return [];
        }

        const typeData = resources.resources[normalizedType];

        if (!typeData.hasOwnProperty(normalizedMaturity)) {
            return [];
        }

        const maturityData = typeData[normalizedMaturity];

        if (!maturityData || typeof maturityData !== 'object') {
            return [];
        }

        if (!maturityData.hasOwnProperty(category)) {
            return [];
        }

        const categoryData = maturityData[category];

        const subCat = Object.entries(categoryData).reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {} as Record<string, any>);

        const subCategoriesList = Object.entries(subCat).map(([key, value]: [string, any]) => ({
            key: key,
            value: value.display
        }));

        this.subcategoriesList = subCategoriesList;
        this.contents.get('subCategoriesList')?.setValue(subCategoriesList);
        this.contents.get('contentSubCategory')?.setValue(subCategoriesList[0]?.key || '');

        return [...subCategoriesList];
    }


    displayFn(key: string): string {
        const selected = this.subCategories.find(sub => sub.key === key);
        return selected ? selected.value : '';
    }


    async loadAssignmentTypes() {
        try {
            const assignTypes = await firstValueFrom(this.config.getAssignmentTypes());
            // this.assignmentTypes = Object.values(assignTypes);
            this.assignmentTypes = Object.values(assignTypes).flat();

        } catch (error) {
            console.error('Error fetching assignment types:', error);
        }
    }


    selectedGames(game, contentIndex) {
        (this.workFlowContents.get('contents') as FormArray).at(contentIndex).patchValue({
            resourcePath: game.url,
            assignmentId: game.gameId,
        });
        // (this.contents.at(contentIndex) as FormGroup).controls.resourcePath.disable();
    }

    async checkExtension(subCat, value) {
        // const subCatKeys = subCat.filter((item:any)=> item.display === value);
        if (!subCat || Object.keys(subCat).length === 0) {
            this.showVideoUi = false;
            this.isURLOrRaw = false;
            return;
        }

        this.allowedExtensions = Object.values(subCat).map((item: any) => item.allowedExtensions);
        // if (this.allowedExtensions.length !== 0) {
        //     console.log(this.allowedExtensions, 'Allowed extensions');
        //     console.log(this.allowedExtensions.length, 'Allowed extensions length');
        // } else {
        //     console.log('No allowed extensions');
        // }
        this.showVideoUi = this.allowedExtensions.includes('video');
        // if (this.allowedExtensions.includes('pdf')) {
        //     console.log('pdf is allowed');
        // }
        this.subCategoriesType.map(() => {
            // console.log(item, index)
        })


        // const flatFilteredItems = Object.values(subCat)
        //     .flatMap(items => Object.values(items).filter(item => item.display === value));

        const flatFilteredItems = Object.entries(subCat)
            .flatMap(items => Object.values(items).filter((item: any) => item.display === value));

        const selectedType = flatFilteredItems.map((item: any) => item.type);

        if (selectedType.includes('pdf') || selectedType.includes('file')) {
            this.isURLOrRaw = false;
            this.showVideoUi = true;
        }
        if (selectedType.includes('video')) {
            this.isURLOrRaw = true;
            this.showVideoUi = false;
        }

    }


    // async getCategories(type: string, maturity: string) {
    //     const resources: any = this.resourceNames;


    //     if (!resources || typeof resources.resources !== 'object') {
    //         console.error("Invalid resources data");
    //         return [];
    //     }

    //     const newType = type.replace(/\s+/g, '');

    //     // Ensure the specified type exists
    //     if (!resources.resources.hasOwnProperty(newType)) {
    //         console.warn(`Type "${newType}" not found.`);
    //         return [];
    //     }

    //     const typeData = resources.resources[newType];

    //     const maturityLowercase = maturity.toLowerCase();
    //     // Ensure the specified maturity level exists inside the type
    //     if (!typeData.hasOwnProperty(maturityLowercase)) {
    //         console.warn(`Maturity level "${maturityLowercase}" not found in type "${newType}".`);
    //         return [];
    //     }

    //     // Get the keys from the specified maturity level
    //     const maturityData = typeData[maturityLowercase];

    //     if (!maturityData || typeof maturityData !== 'object') {
    //         console.error(`Invalid maturity data for "${maturity}".`);
    //         return [];
    //     }

    //     // Extract keys from the maturity object
    //     const result = Object.keys(maturityData);
    //     // if (this.data.type === 'Not Available' || this.data.maturity === 'Not Available') {
    //     //     this.contentCategory.push('additional resources');
    //     //     this.contentCategory.push('assignment');
    //     //     console.log(this.contentCategory, 'contentCategoryWithUnavailable');
    //     // }

    //     if (result) {
    //         this.contentCategory = result;
    //     } else if (!result && (this.data.type === 'Not Available' || this.data.maturity === 'Not Available')) {
    //         this.contentCategory = this.categoryListForUnavailable;
    //     } else {
    //         this.contentCategory = [];
    //     }
    //     // this.contentCategory = result;

    //     this.contentCategory.push('additional resources');
    //     this.contentCategory.push('assignment');

    //     return this.contentCategory;

    // }

    async getCategories(type: string, maturity: string) {
        if (!type || !maturity) {
            console.warn('Type or maturity is undefined.');
            // this.contentCategory = ['additional resources', 'assignment'];
                   this.contentCategory = ['custom resource', 'assignment'];
            return this.contentCategory;
        }

        const resources: any = this.resourceNames;

        if (!resources || typeof resources.resources !== 'object') {
            console.error("Invalid resources data");
            // this.contentCategory = ['additional resources', 'assignment'];
             this.contentCategory = ['custom resource', 'assignment'];
            return this.contentCategory;
        }

        const newType = type.replace(/\s+/g, '');
        const maturityLowercase = maturity.toLowerCase();

        if (!resources.resources.hasOwnProperty(newType)) {
            console.warn(`Type "${newType}" not found.`);
            // this.contentCategory = ['additional resources', 'assignment'];
             this.contentCategory = ['custom resource', 'assignment'];
            return this.contentCategory;
        }

        const typeData = resources.resources[newType];

        if (!typeData.hasOwnProperty(maturityLowercase)) {
            console.warn(`Maturity level "${maturityLowercase}" not found in type "${newType}".`);
            // this.contentCategory = ['additional resources', 'assignment'];
             this.contentCategory = ['custom resource', 'assignment'];
            return this.contentCategory;
        }

        const maturityData = typeData[maturityLowercase];

        if (!maturityData || typeof maturityData !== 'object') {
            console.error(`Invalid maturity data for "${maturity}".`);
            // this.contentCategory = ['additional resources', 'assignment'];
             this.contentCategory = ['custom resource', 'assignment'];
            return this.contentCategory;
        }

        const result = Object.keys(maturityData);
        this.contentCategory = result.length > 0 ? [...result] : [];
        this.contentCategory.push('additional resources', 'assignment');

        return this.contentCategory;
    }


    async selectAssignmentType(type, contentIndex) {
        const assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == type)
        this.contents.at(contentIndex).patchValue({
            assignmentType: type,
            fetchAssignmentsNames: assignments
        });
        return assignments;
    }


    onChooseFile(event, i, type) {
        this.inputFileName = event.target.files[0].name
        const isValid = this.fileTypeAndSizeCheck(event.target.files[0], type)
        if (isValid) {
            this.upload(event, i, type);
        }
        this.elementRef.nativeElement.value = '';
    }

    fileTypeAndSizeCheck(event, type) {
        let isValid = true
        return isValid
    }

    updateResourcePath(resourcePath, i) {
        this.contents.at(i).patchValue({
            resourcePath: resourcePath
        });
    }

    async upload(event, index, filetype?) {
        // console.log( this.contents.at(index))
        const content = this.contents.at(index).getRawValue();
        const bucketPath = `${this.storageBucket}/${this.data.paramInfo.classroomId}_${this.data.paramInfo.programmeId}/${this.data?.paramInfo.luId}_${index}/${content.contentSubCategory}.` + this.inputFileName.split('.').slice(-1).pop()
        const ref = this.afStorage.ref(bucketPath);

        //putting the file into storage with custom metadata
        const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.inputFileName } }).snapshotChanges();
        task.subscribe(async uploadedSnapshot => {
            let bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
            this.contents.at(index).patchValue({
                'uploadProgress': bytesTransferred,
            });
            if (uploadedSnapshot.state === "success") {
                this.updateResourcePath(bucketPath, index);
                // if (type == 'ppt') {
                //     this.uiService.alertMessage('successful', 'The PPT file has been uploaded successfully', 'success')
                // } else {
                this.uiService.alertMessage('successful', `The ${filetype.toUpperCase()} files has been uploaded successfully`, 'success')
                //  }
            }
        })

    }
    selectedAssignment(assignmentObj, contentIndex) {
        this.contents.at(contentIndex).patchValue({
            assignmentId: assignmentObj.docId
        });
        this.checkInvalid(this.workFlowContents)
    }

    checkInvalid(form: FormGroup) {
        // Iterate over each form control in the FormGroup
        Object.keys(this.workFlowContents.controls).forEach(field => {
            const control = this.workFlowContents.get(field);

            if (control instanceof FormArray) {
                // If the control is a FormArray, iterate over its controls
                control.controls.forEach((arrayControl) => {
                    if (arrayControl.invalid) {
                    }
                });
            } else {
                // If it's not a FormArray, check if it's invalid
                if (control && control.invalid) {

                }
            }
        });
    }


    onDateSelected(selectedDate: any, index: number) {
        const contentsArray = this.workFlowContents.get('contents') as FormArray;

        if (contentsArray && contentsArray.at(index)) {
            const assignmentDueDateControl = contentsArray.at(index).get('assignmentDueDate');

            if (assignmentDueDateControl) {
                let formattedDate: Date | null = null;

                if (moment.isMoment(selectedDate)) {
                    formattedDate = selectedDate.toDate();
                } else if (selectedDate instanceof Date) {
                    formattedDate = selectedDate;
                } else {
                    console.error(`❌ Invalid date selected at index ${index}:`, selectedDate);
                    return;
                }

                assignmentDueDateControl.setValue(formattedDate);
            } else {
                console.warn(`⚠️ assignmentDueDate control not found for index ${index}.`);
            }
        } else {
            console.warn(`⚠️ FormArray contents or index ${index} is invalid.`);
        }
    }



    shouldDisableField(): boolean {
        return (
            this.data?.type === '' &&
            this.data?.maturity === '' &&
            this.data?.wfType !== ''
        );
    }


    // async loadWorkflowContents() {
    //     if (this.data?.stepDetails) {
    //         this.isEditMode = true;
    //         console.log(this.data.stepDetails.contents, 'stepDetails.contents');

    //         this.workFlowContents.patchValue({
    //             sequenceNumber: this.data.stepDetails.sequenceNumber,
    //             workflowStepName: this.data.stepDetails.workflowStepName,
    //             workflowStepDescription: this.data.stepDetails.workflowStepDescription,
    //             workflowStepDuration: this.data.stepDetails.workflowStepDuration,
    //             workflowLocation: this.data.stepDetails.workflowLocation,
    //             allowAccess: this.data.stepDetails.allowAccess,
    //             viewUnlab: this.data.stepDetails.viewUnlab,
    //             canSkipWorkflowStep: this.data.stepDetails.canSkipWorkflowStep
    //         });

    //         const contentsArray = this.fb.array(
    //             await Promise.all(
    //                 this.data.stepDetails.contents.map(async (content, index) => {
    //                     console.log(`Processing content at index ${index}:`, content);
    //                     console.log(this.selectedType, 'this.selectedType');
    //                     // console.log(this.data.learningUnitType, 'this.data.learningUnitType');
    //                     console.log(this.data.type, 'this.data.type');
    //                     console.log(this.selectedType, 'this.selectedType');
    //                     console.log(this.selectMaturity, 'this.selectMaturity');
    //                     console.log(content.contentCategory, 'content.contentCategory');
    //                     console.log(this.data.maturity, 'this.data.maturity');
    //                     const contentSubCategoryList = await this.checkContentCategory(
    //                         this.selectedType || this.data.type,
    //                         this.selectMaturity || this.data.maturity,
    //                         content.contentCategory
    //                     );

    //                     // const subcategories = contentSubCategoryList.map(sub => ({
    //                     //     key: sub.key,
    //                     //     value: sub.value
    //                     // }));
    //                     const subcategories = contentSubCategoryList.map(sub => ({
    //                         key: sub.key,
    //                         value: sub.value
    //                     }));

    //                     console.log(subcategories, 'subcategories');
    //                     const selectedSubCategory = subcategories.find(
    //                         sub => sub.key === content.contentSubCategory
    //                     ) || null;

    //                     const allAssignments = await this.getFilterAssignments(content);
    //                     this.currentDate = new Date();
    //                     this.currentDate.setHours(this.currentDate.getHours());
    //                     this.nextMonthDate = new Date(this.currentDate);
    //                     this.nextMonthDate.setMonth(this.currentDate.getMonth() + 1);
    //                     this.dateAdapter.setLocale('en');

    //                     let assignmentDueDate = this.nextMonthDate;

    //                     if (content.assignmentDueDate) {
    //                         if (content.assignmentDueDate.seconds !== undefined) {
    //                             assignmentDueDate = new Date(content.assignmentDueDate.seconds * 1000);
    //                         } else if (moment.isMoment(content.assignmentDueDate)) {
    //                             assignmentDueDate = content.assignmentDueDate.toDate();
    //                         } else {
    //                             assignmentDueDate = new Date(content.assignmentDueDate);
    //                         }
    //                     }

    //                     console.log(assignmentDueDate, 'assignmentDueDate');

    //                     // this.workFlowContents.get('contentCategory')?.valueChanges?.subscribe(async (category) => {
    //                     //     console.log(category, 'category');
    //                     //     if (category) {
    //                     //         const subCategories = await this.checkContentCategory(this.selectedType, this.selectMaturity, category);
    //                     //         console.log(subCategories, 'Updated Subcategories');
    //                     //     }
    //                     // });

    //                     return this.fb.group({
    //                         contentName: this.fb.control(content.contentName, Validators.required),
    //                         contentCategory: this.fb.control(
    //                             { value: content.contentCategory, disabled: this.shouldDisableCategoryField() },
    //                             Validators.required
    //                         ),
    //                         contentSubCategory: this.fb.control({
    //                             value: selectedSubCategory?.key ?? content.contentSubCategory,
    //                             disabled: this.shouldDisableField()
    //                         }),
    //                         subCategoriesList: this.fb.control(subcategories),
    //                         contentIsLocked: this.fb.control(content.contentIsLocked),
    //                         additionalResourceType: this.fb.control(content.additionalResourceType),
    //                         assignmentType: this.fb.control({ value: content.assignmentType, disabled: this.shouldDisableAssignmentField() }),
    //                         assignmentName: this.fb.control({ value: content.assignmentName, disabled: this.shouldDisableAssignmentField() }),
    //                         assignmentId: this.fb.control(content.assignmentId),
    //                         isDueDate: this.fb.control({ value: content.isDueDate, disabled: this.shouldDisableAssignmentField() }),
    //                         assignmentDueDate: this.fb.control({
    //                             value: assignmentDueDate,
    //                             disabled: this.shouldDisableAssignmentField()
    //                         }),
    //                         fetchAssignmentsNames: this.fb.control(await this.getFilterAssignments(content)),
    //                         gameName: this.fb.control({ value: content.gameName, disabled: this.shouldDisableAssignmentField() }),
    //                         uploadProgress: this.fb.control(0),
    //                     });
    //                 })
    //             )
    //         );

    //         this.workFlowContents.setControl('contents', contentsArray);
    //     }
    // }

    async loadWorkflowContents() {
        if (this.data?.stepDetails) {
            this.isEditMode = true;
            // this.workFlowContents.patchValue(this.data.stepDetails, { emitEvent: false });
            this.maxValue = this.data?.workflowSteps.length

            this.workFlowContents.patchValue({
                sequenceNumber: this.data.stepDetails.sequenceNumber,
                workflowStepName: this.data.stepDetails.workflowStepName,
                workflowStepDescription: this.data.stepDetails.workflowStepDescription,
                workflowStepDuration: this.data.stepDetails.workflowStepDuration,
                workflowLocation: this.data.stepDetails.workflowLocation,
                allowAccess: this.data.stepDetails.allowAccess,
                viewUnlab: this.data.stepDetails.viewUnlab,
                canSkipWorkflowStep: this.data.stepDetails.canSkipWorkflowStep
            });

            const contentsArray = this.fb.array(
                await Promise.all(
                    this.data.stepDetails.contents.map(async (content) => {
                        const contentSubCategoryList = await this.checkContentCategory(
                            this.selectedType || this.data.type,
                            this.selectMaturity || this.data.maturity,
                            content.contentCategory
                        );

                        const subcategories = contentSubCategoryList.map(sub => ({
                            key: sub.key,
                            value: sub.value
                        }));

                        const selectedSubCategory = subcategories.find(
                            sub => sub.key === content.contentSubCategory
                        ) || null;

                        // const assignmentDueDate = content.assignmentDueDate
                        //     ? new Date(content.assignmentDueDate.seconds * 1000)
                        //     : new Date();
                        this.selectedSubCategory = content.contentSubCategory;
                        this.currentDate = new Date();
                        this.currentDate.setHours(this.currentDate.getHours());
                        this.nextMonthDate = new Date(this.currentDate);
                        this.nextMonthDate.setMonth(this.currentDate.getMonth() + 1);
                        this.dateAdapter.setLocale('en');

                        let assignmentDueDate = this.nextMonthDate;

                        if (content.assignmentDueDate) {
                            if (content.assignmentDueDate.seconds !== undefined) {
                                assignmentDueDate = new Date(content.assignmentDueDate.seconds * 1000);
                            } else if (moment.isMoment(content.assignmentDueDate)) {
                                assignmentDueDate = content.assignmentDueDate.toDate();
                            } else {
                                assignmentDueDate = new Date(content.assignmentDueDate);
                            }
                        }

                        const resources: any = this.resourceNames;
                        // const contentSubCategory = "teacherTrainingContent";
                        this.storagePath = this.getStoragePath(resources.resources, content.contentSubCategory);

                        if (this.storagePath) {
                            this.workflowTemplatesService.setStoragePath(this.storagePath);
                        }
                        const contentForm = this.fb.group({
                            contentName: this.fb.control(content.contentName, Validators.required),
                            contentCategory: this.fb.control(
                                { value: content.contentCategory, disabled: this.shouldDisableCategoryField() },
                                Validators.required
                            ),
                            contentSubCategory: this.fb.control({
                                value: selectedSubCategory?.key ?? content.contentSubCategory,
                                disabled: this.shouldDisableField()
                            }),
                            subCategoriesList: this.fb.control(subcategories),
                            contentIsLocked: this.fb.control(content.contentIsLocked),
                            additionalResourceType: this.fb.control(content.additionalResourceType),
                            customResourceType: this.fb.control(content.customResourceType),
                            assignmentType: this.fb.control({ value: content.assignmentType, disabled: this.shouldDisableAssignmentField() }),
                            assignmentName: this.fb.control({ value: content.assignmentName, disabled: this.shouldDisableAssignmentField() }),
                            assignmentId: this.fb.control(content.assignmentId),
                            isDueDate: this.fb.control({ value: content.isDueDate, disabled: this.shouldDisableAssignmentField() }),
                            assignmentDueDate: this.fb.control({
                                value: assignmentDueDate,
                                disabled: this.shouldDisableAssignmentField()
                            }),
                            fetchAssignmentsNames: this.fb.control(await this.getFilterAssignments(content)),
                            gameName: this.fb.control({ value: content.gameName, disabled: this.shouldDisableAssignmentField() }),
                            uploadProgress: this.fb.control(0),
                        });

                        // Subscribe to contentCategory changes to update contentSubCategory dynamically
                        this.subscribeToContentCategoryChanges(contentForm);

                        return contentForm;
                    })
                )
            );

            this.workFlowContents.setControl('contents', contentsArray);
            const rawValue = this.workFlowContents.getRawValue();
            // console.log("📝 Raw Form Value (Before Filtering):", JSON.stringify(rawValue, null, 2));

            this.originalFormValue = this.filterUnnecessaryFields(rawValue) || {};
            // console.log("✅ Original Form Value:", JSON.stringify(this.originalFormValue, null, 2));


        }
    }

    // Function to update contentSubCategory based on contentCategory changes
    subscribeToContentCategoryChanges(contentForm: FormGroup) {
        contentForm.get('contentCategory')?.valueChanges.subscribe(async (newCategory) => {
            if (newCategory) {
                const subCategories = await this.checkContentCategory(this.selectedType, this.selectMaturity, newCategory);
                const subcategoriesList = subCategories.map(sub => ({
                    key: sub.key,
                    value: sub.value
                }));

                // Update the subCategoriesList field
                contentForm.get('subCategoriesList')?.setValue(subcategoriesList);

                // Reset contentSubCategory if the previous selection is no longer valid
                const selectedSubCategory = subcategoriesList.find(sub => sub.key === contentForm.get('contentSubCategory')?.value);
                contentForm.get('contentSubCategory')?.setValue(selectedSubCategory?.key ?? null);
            }
        });
    }


    // shouldDisableCategoryField(): boolean {
    //     return (
    //         this.data?.type === '' &&
    //         this.data?.maturity === '' &&
    //         this.data?.wfType !== ''
    //     )

    // }


    // shouldDisableAssignmentField(): boolean {

    //     const disableAssignment = this.data.stepDetails?.contents?.some(item => item.contentCategory === 'assignment');
    //     return (
    //         this.data?.type === '' &&
    //         this.data?.maturity === '' &&
    //         disableAssignment && this.isEditMode == true
    //     );
    // }


    setupFormValueChangeHandler() {
        this.checkSpecificKeys = []; // Reset the keys array

        this.workFlowContents.valueChanges.subscribe(() => {
            const formData = this.workFlowContents.getRawValue(); // Get all form values
            // Extract only relevant keys from luDetails
            Object.keys(formData).forEach((key) => {
                if (this.data.stepDetails.hasOwnProperty(key)) {
                    this.checkSpecificKeys.push(key);
                }
            });

            const isMatching = this.areValuesMatching(formData, this.data.stepDetails); // Compare only necessary fields

            if (isMatching) {
                this.workFlowContents.markAsPristine();
                this.workFlowContents.markAsUntouched();
            } else {
                this.workFlowContents.markAsDirty();
            }
        });
    }

    areValuesMatching(formData: any, dbData: any): boolean {
        // Compare only keys from checkSpecificKeys
        return this.checkSpecificKeys.every((key) => formData[key] === dbData[key]);
    }


    normalizeValue(value: any): any {
        return value === null ? "" : value;  // Convert null to an empty string
    }


    getComparableData(formData: any, dbData: any): any {

        return {
            sequenceNumber: this.normalizeValue(formData?.sequenceNumber),
            workflowStepName: this.normalizeValue(formData?.workflowStepName),
            workflowStepDescription: this.normalizeValue(formData?.workflowStepDescription),
            workflowStepDuration: this.normalizeValue(formData?.workflowStepDuration),
            workflowLocation: this.normalizeValue(formData?.workflowLocation),
            allowAccess: this.normalizeValue(formData?.allowAccess),
            viewUnlab: this.normalizeValue(formData?.viewUnlab),
            canSkipWorkflowStep: this.normalizeValue(formData?.canSkipWorkflowStep),
            contents: formData?.contents?.map((content: any) => ({
                contentName: this.normalizeValue(content?.contentName),
                contentCategory: this.normalizeValue(content?.contentCategory),
                contentSubCategory: this.normalizeValue(content?.contentSubCategory),
                additionalResourceType: this.normalizeValue(content?.additionalResourceType),
                customResourceType: this.normalizeValue(content?.customResourceType),
                contentIsLocked: this.normalizeValue(content?.contentIsLocked),
                isDueDate: this.normalizeValue(content?.isDueDate),
                //   assignmentDueDate: this.normalizeValue(content?.assignmentDueDate),
                gameName: this.normalizeValue(content?.gameName),
                ...(content?.isDueDate ? { assignmentDueDate: this.normalizeValue(content?.assignmentDueDate) } : {})
            }))
        }
    }


    checkIfFormChanged(): boolean {
        const normalizedFormData = this.getComparableData(this.workFlowContents.value, this.data.stepDetails);
        const normalizedDbData = this.getComparableData(this.data.stepDetails, this.data.stepDetails);  // Normalize dbData too
        return !isEqual(normalizedFormData, normalizedDbData);
    }

    getStoragePath(resources, contentSubCategory) {
        for (const category in resources) {  // FLN, CBETheme, etc.
            const subcategories = resources[category];

            for (const subcategory in subcategories) {  // gold, silver, platinum, etc.
                const sections = subcategories[subcategory];

                for (const section in sections) {  // tnt, graphics, video, etc.
                    const items = sections[section];

                    if (items.hasOwnProperty(contentSubCategory)) {  // Match contentSubCategory
                        return items[contentSubCategory].storagePath || null;
                    }
                }
            }
        }
        return null; // Return null if no match found
    }


    shouldDisableAssignmentField(): boolean {
        const disableAssignment = this.data.stepDetails?.contents?.some(
            item => item.contentCategory === 'assignment'
        );

        return (
            this.legacyTemplates.includes(this.data?.templateName?.trim()) &&
            disableAssignment &&
            this.isEditMode === true
        );
    }

    shouldDisableCategoryField(): boolean {

        return this.legacyTemplates.includes(this.data?.templateName?.trim());
    }


}

