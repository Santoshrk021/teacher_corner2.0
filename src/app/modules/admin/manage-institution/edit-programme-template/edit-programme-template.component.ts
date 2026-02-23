import { ChangeDetectorRef, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { first, firstValueFrom, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UiService } from 'app/shared/ui.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { WorkflowTemplateService } from 'app/core/dbOperations/workflowTemplate/workflow-template.service';
import { SharedService } from 'app/shared/shared.service';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { environment } from 'environments/environment';
import { OneClickInstitution } from 'app/core/dbOperations/institutions/institution.type';

@Component({
    selector: 'app-edit-programme-template',
    templateUrl: './edit-programme-template.component.html',
    styleUrls: ['./edit-programme-template.component.scss']
})

export class EditProgrammeTemplateComponent implements OnInit {
    @Input() instituteInfo: any;
    @Input() existingProgrammes: any;
    @Input() institutionDetails: any;
    @Input() programmeTemplateInfo;
    @Output() programmeTemplateEmitter: EventEmitter<any> = new EventEmitter();

    allmasterData;
    existingTemplates;
    gradeList: Array<number> = [];
    sectionList: Array<string> = [];
    existingClassrooms;
    latestClassrooms: [{
        grade: number;
        section: string;
        availableSections: string[];
        subject: 'Science' | 'Math';
        availableSubjects: ('Science' | 'Math')[];
        programmeTemplate: 'Discover' | 'Ignite' | 'Explore' | 'Create';
        availableProgrammes: ('Discover' | 'Ignite' | 'Explore' | 'Create')[];
        classroomCode: string;
    }] | [] = [];
    gradeSectionObject: Record<number, { sections: string[]; exhaustedSection: string[] }> = {};
    templateForm = new FormGroup({
        classInfoArray: new FormArray([])
    });
    classroomObj: Record<string, string[]> = {};
    private _unsubscribeAll = new Subject<void>();
    disableAddButton: boolean = false;
    programmeTemplateArray: Array<any> = [];
    filteredSubjectListObj = {};
    filteredTemplateListObj = {};
    latestProgrammeCode: string;
    filteredTemplateListObjSet = {};
    classrooms: any[];
    institutionCreatorsandRepresentatives;
    defaultwfkTemplate;
    loading = false;
    deleteloading = false;
    newClassroomsCreated;
    isSaveButtonEnabled: any;
    programmeTemplates = [];
    classroomCode: any;
    deleteLoading: boolean[] = [];

    constructor(
        private fb: FormBuilder,
        private configurationService: ConfigurationService,
        private masterService: MasterService,
        private classroomService: ClassroomsService,
        private teacherService: TeacherService,
        private uiService: UiService,
        private workflowTemplateService: WorkflowTemplateService,
        private programService: ProgrammeService,
        private sharedService: SharedService,
        private programmeTemplateService: ProgrammeTemplateService,
        private cdRef: ChangeDetectorRef
    ) {
    }

    async getUsers(instituteInfo) {
        const instCreators: any = await lastValueFrom(this.teacherService.getTeacherNameByPhone(instituteInfo.institutionCreatorCountryCode, instituteInfo.institutionCreatorPhoneNumber));
        const instrepresentatives: any = await lastValueFrom(this.teacherService.getTeacherNameByPhone(instituteInfo.representativeCountryCode, instituteInfo.representativePhoneNumber));
        const instcretors = instCreators.docs.map(d => d.data());
        const instrepresent = instrepresentatives.docs.map(d => d.data());
        return { representatives: instcretors.concat(instrepresent) };
    }

    async ngOnInit(): Promise<void> {
        this.instituteInfo = this.institutionDetails;
        const institutionCreatorsandRepresentatives = await this.getUsers(this.instituteInfo);
        this.institutionCreatorsandRepresentatives = institutionCreatorsandRepresentatives.representatives;
        const templateIDs = this.existingProgrammes.map(d => d.templateId);
        await lastValueFrom(this.configurationService.getProgrammeTemplateObject().pipe(first())).then(({ sectionList, subjectList, gradeList, templateList }) => {
            [this.sectionList, this.gradeList,] = [sectionList, gradeList];
        });
        const programmeTemplatesMaster = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('PROGRAMME_TEMPLATE', 'programmeTemplates').pipe(first()));
        this.programmeTemplateArray = programmeTemplatesMaster;
        this.existingTemplates = this.programmeTemplateArray.filter(f => templateIDs.includes(f.templateId));
        this.existingProgrammes.forEach((pr, index) => {
            if (templateIDs.includes(pr?.templateId) && pr?.hasOwnProperty('type') && pr?.type !== 'STEM-CLUB') {
                const template = this.existingTemplates.find(d => d?.templateId == pr?.templateId);
                if (template) {  // Add this check
                    this.existingProgrammes[index]['subject'] = template?.subject;
                    this.existingProgrammes[index]['templateCategory'] = template.templateCategory;
                }
            }
        });

        const exisitingProgramIds = this.existingProgrammes.map(pr => pr.docId);
        const classrooms = await this.classroomService.getAllClassroomByInstitute(this.institutionDetails.institutionId);
        const classroomLinked = await firstValueFrom(classrooms);
        classroomLinked.forEach((classroom, index) => {
            if (!classroom || !classroom.programmes) {
                console.warn(`Skipping classroom at index ${index} due to missing programmes`);
                return; // Skip if classroom or programmes are undefined
            }

            Object.keys(classroom.programmes).forEach((key) => {
                if (exisitingProgramIds.includes(classroom.programmes[key]?.programmeId)) {
                    const programme = this.existingProgrammes.find(d => d.docId == classroom.programmes[key]?.programmeId);
                    if (programme) {
                        classroomLinked[index].programmes[key]['subject'] = programme.subject;
                        classroomLinked[index].programmes[key]['template'] = programme.templateCategory;
                    }
                }
            });
        });

        this.existingClassrooms = classroomLinked;
        this.templateForm.setControl('classInfoArray', this.fb.array([]));
        this.addExistingTemplates(classroomLinked);
        const latestProgramCode = await this.programService.getProgrammeCode();
        this.latestProgrammeCode = latestProgramCode;

        const wftemplate = await this.getworkflowTemplate();
        this.defaultwfkTemplate = wftemplate;
        const rawvalue = this.templateForm.getRawValue();
        this.newClassroomsCreated = rawvalue.classInfoArray;

        this.templateForm.valueChanges.subscribe(() => {
            this.isSaveButtonEnabled = this.templateForm.dirty; // Enable save button if form is modified
        });

    }

    async getworkflowTemplate() {
        return new Promise((resolve, reject) => {
            this.workflowTemplateService.getWorkFlowTemplateById('9aifopMbhpR4Jr5oPHm9').subscribe((workflowtemplate) => {
                resolve(workflowtemplate);
            });
        });
    }

    addExistingTemplates(classroomLinked) {
        classroomLinked.forEach((classroom) => {
            this.addExistingTemplate(classroom);
        });
    }

    addExistingTemplate(classroom) {
        if (!classroom || !classroom.programmes || Object.keys(classroom.programmes).length === 0) {
            console.warn(`Skipping classroom ${classroom?.classroomName || 'Unknown'} as it has no programmes`);
            return; // Skip if classroom or programmes are missing
        }

        Object.keys(classroom.programmes).forEach((key, index) => {
            const programme = classroom.programmes[key];

            if (!programme || !programme.programmeId || !programme.subject || !programme.template) {
                console.warn(`Skipping programme ${key} in classroom ${classroom?.classroomName || 'Unknown'} due to missing data`);
                return; // Skip if essential data is missing
            }

            // Ensure grade and section exist before proceeding
            if (!classroom.grade || !classroom.section) {
                console.warn(`Skipping classroom ${classroom?.classroomName || 'Unknown'} due to missing grade or section`);
                return;
            }

            if (classroom.programmes[key].subject && classroom.programmes[key].template) {
                const fbGroup = this.fb.group({
                    grade: [{ value: classroom.grade, disabled: true }, Validators.required],
                    section: [{ value: classroom.section, disabled: true }],
                    availableSections: [[classroom.section]],
                    subject: [{ value: programme.subject, disabled: true }],
                    availableSubjects: [[programme.subject]],
                    programmeTemplate: [{ value: programme.template, disabled: true }],
                    availableProgrammes: [[programme.template]],
                    availableDoc: [classroom.docId || ''],
                    programDocId: [programme.programmeId || '']
                });

                if (!this.gradeSectionObject.hasOwnProperty(classroom.grade)) {
                    this.gradeSectionObject[classroom.grade] = { sections: [...this.sectionList], exhaustedSection: [] };
                };

                const exhaustedSections = this.gradeSectionObject[classroom.grade].exhaustedSection;
                if (exhaustedSections.length) {
                    const lastExhaustedSection = exhaustedSections[exhaustedSections.length - 1];
                    const sectionIndex = this.gradeSectionObject[classroom.grade].sections.indexOf(lastExhaustedSection);
                    this.gradeSectionObject[classroom.grade].sections.splice(sectionIndex, 1);
                };

                fbGroup.patchValue({
                    availableSections: this.sectionList.filter(section => !this.gradeSectionObject[classroom.grade].exhaustedSection.includes(section)) as any
                });

                const grade = classroom.grade;
                const section = classroom.section;
                const key1 = `${grade}-${section}`;

                this.filteredTemplateListObj[grade] = this.programmeTemplateArray.filter(element => element.grade === grade && element.board === this.instituteInfo?.board && element.learningUnitsIds.length > 0);

                this.filteredSubjectListObj[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map(element => element.subject))).sort();

                const availableSubjects = this.classroomObj.hasOwnProperty(key1)
                    ? this.filteredSubjectListObj[grade].filter(subject => !this.classroomObj[key1].includes(subject))
                    : this.filteredSubjectListObj[grade];

                fbGroup.patchValue({ availableSubjects });

                const subject = classroom.programmes[key]?.subject;
                const key2 = `${grade}-${section}`;
                this.filteredTemplateListObj[grade] = this.programmeTemplateArray.filter(element => element.subject === subject && element.grade === grade && element.board === this.instituteInfo?.board && element.learningUnitsIds.length > 0);
                this.filteredTemplateListObjSet[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map(element => element.templateCategory))).sort();
                if (this.classroomObj.hasOwnProperty(key2)) {
                    this.classroomObj[key2] = [subject, ...this.classroomObj[key2]];
                    if (this.classroomObj[key2].length == this.filteredSubjectListObj[grade].length) {
                        this.gradeSectionObject[grade].exhaustedSection.push(section);
                    };
                }
                else {
                    this.classroomObj[key2] = [subject];
                    if (this.classroomObj[key2].length == this.filteredSubjectListObj[grade].length) {
                        this.gradeSectionObject[grade].exhaustedSection.push(section);
                    };
                };
                fbGroup.patchValue({ availableProgrammes: this.filteredTemplateListObjSet[grade] });
                if (!this.classInfo.controls.some(control => control.value.programDocId === classroom.programmes[key]?.programmeId)) {
                    this.classInfo.push(fbGroup);
                }
            }
        });
    }

    get classInfo(): FormArray {
        return this.templateForm.get('classInfoArray') as FormArray;
    }

    newClassInfo() {
        const fbGroup = this.fb.group({
            grade: [null, Validators.required],
            section: [{ value: '', disabled: true }],
            availableSections: [],
            subject: [{ value: '', disabled: true }],
            availableSubjects: [],
            programmeTemplate: [{ value: '', disabled: true }],
            availableProgrammes: [],
            availableDoc: [''],
            programDocId: ['']
        });

        const watchList = ['grade', 'section', 'subject', 'programmeTemplate'];
        const unlockList = ['section', 'subject', 'programmeTemplate', ''];
        for (let i = 0; i < watchList.length; i++) {
            this.unlockFormSequentially(fbGroup, watchList[i], unlockList[i]);
        };

        return fbGroup;
    }

    async removeClassInfo(index: number) {
        this.uiService.alertMessage('Message', 'Do not refresh the Page', 'warning');
        this.deleteLoading[index] = true; // Start loader for specific index
        const classInfoItem: any = this.classInfo.at(index);

        const finalObject: OneClickInstitution = {
            institution: this.instituteInfo,
            classrooms: classInfoItem.getRawValue(),
            createdSource: 'one-click-institution-classroom-programme-creation',
            operation: 'trash',
            defaultWorkflowTemplate: undefined,
            programmeTemplates: [],
            component: 'EditProgrammeTemplateComponent'
        };

        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/manage_one_click_institution`;
        // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/manage_one_click_institution`;

        try {
            await this.sharedService.sendToCloudFunction(endUrl, finalObject);
            this.uiService.alertMessage('Success', 'Classroom deleted successfully', 'error');
            this.classInfo.removeAt(index); // Remove item from FormArray
        } catch (error) {
            this.uiService.alertMessage('Error', 'Error deleting classroom', 'error');
        } finally {
            this.deleteLoading[index] = false; // Stop loader for specific index
            this.isSaveButtonEnabled = false;
        }
    }

    addClassInfo() {
        this.classInfo?.push(this.newClassInfo());
        this.cdRef.detectChanges();  // Force change detection

        const obj = {
            grade: '',
            section: '',
            availableSections: [],
            subject: '',
            availableSubjects: [],
            programmeTemplate: '',
            availableProgrammes: [],
            availableDoc: '',
            programDocId: ''
        };
        this.newClassroomsCreated.push(obj);
        this.disableAddButton = false;
    }

    onGradeChange(formInfo: FormGroup, index: number) {
        this.classInfo.controls[index].get('grade')?.markAsDirty();
        const grade = formInfo.get('grade').value;
        if (!this.gradeSectionObject.hasOwnProperty(grade)) {
            this.gradeSectionObject[grade] = { sections: [...this.sectionList], exhaustedSection: [] };
        };
        const exhaustedSections = this.gradeSectionObject[grade].exhaustedSection;
        if (exhaustedSections.length) {
            const lastExhaustedSection = exhaustedSections[exhaustedSections.length - 1];
            const sectionIndex = this.gradeSectionObject[grade].sections.indexOf(lastExhaustedSection);
            this.gradeSectionObject[grade].sections.splice(sectionIndex, 1);
        };
        this.classInfo?.at(index).patchValue({
            availableSections: this.sectionList.filter(section => !this.gradeSectionObject[grade].exhaustedSection.includes(section))
        });
        this.newClassroomsCreated[index]['availableSections'] = this.sectionList.filter(section => !this.gradeSectionObject[grade].exhaustedSection.includes(section));
        this.newClassroomsCreated[index]['grade'] = grade;

        // formInfo.get('section').enable();
    }

    onSectionChange(formInfo: FormGroup, index: number) {
        this.classInfo.controls[index].get('section')?.markAsDirty();
        const grade = formInfo.get('grade').value;
        const section = formInfo.get('section').value;
        const key = `${grade}-${section}`;

        this.filteredTemplateListObj[grade] = this.programmeTemplateArray.filter(element => element.grade === grade && element.board === this.instituteInfo?.board && element.learningUnitsIds.length > 0);

        this.filteredSubjectListObj[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map(element => element.subject))).sort();

        const availableSubjects = this.classroomObj.hasOwnProperty(key)
            ? this.filteredSubjectListObj[grade].filter(subject => !this.classroomObj[key].includes(subject))
            : this.filteredSubjectListObj[grade];

        formInfo.patchValue({ availableSubjects });
        this.classInfo?.at(index).patchValue({
            availableSubjects: availableSubjects
        });
        this.newClassroomsCreated[index]['availableSubjects'] = availableSubjects;
        this.newClassroomsCreated[index]['section'] = section;

        // formInfo.get('subject').enable();
    }

    onSubjectChange(formInfo: FormGroup, index: number) {
        this.classInfo.controls[index].get('subject')?.markAsDirty();
        const grade = formInfo.get('grade').value;
        const section = formInfo.get('section').value;
        const subject = formInfo.get('subject').value;
        const key = `${grade}-${section}`;
        this.filteredTemplateListObj[grade] = this.programmeTemplateArray.filter(element => element.subject === subject && element.grade === grade && element.board === this.instituteInfo?.board && element.learningUnitsIds.length > 0);
        this.filteredTemplateListObjSet[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map(element => element.templateCategory))).sort();
        if (this.classroomObj.hasOwnProperty(key)) {
            this.classroomObj[key] = [subject, ...this.classroomObj[key]];
            if (this.classroomObj[key].length == this.filteredSubjectListObj[grade].length) {
                this.gradeSectionObject[grade].exhaustedSection.push(section);
            };
        }
        else {
            this.classroomObj[key] = [subject];
            if (this.classroomObj[key].length == this.filteredSubjectListObj[grade].length) {
                this.gradeSectionObject[grade].exhaustedSection.push(section);
            };
        };
        formInfo.patchValue({ availableProgrammes: this.filteredTemplateListObjSet[grade] });
        this.classInfo?.at(index).patchValue({
            availableProgrammes: this.filteredTemplateListObjSet[grade]
        });
        this.newClassroomsCreated[index]['availableProgrammes'] = this.filteredTemplateListObjSet[grade];
        this.newClassroomsCreated[index]['subject'] = subject;
    }

    onProgrammeTemplateChange(formInfo: FormGroup, index: number) {
        this.classInfo.controls[index].get('programmeTemplate')?.markAsDirty();
        const programmeTemplate = formInfo.get('programmeTemplate').value;
        this.newClassroomsCreated[index]['programmeTemplate'] = programmeTemplate;
        this.disableAddButton = false;
        formInfo.disable();
    }

    async prepareProgrammeTemplates(templateForm) {
        this.programmeTemplates = [];  // Ensure old data is cleared
        const formValue = templateForm.getRawValue();

        if (!formValue || !formValue.classInfoArray) {
            console.warn('No class info array found in form');
            return;
        }

        // Set the classroom code **before** the loop to avoid multiple overwrites
        this.classroomCode = (parseInt(this.instituteInfo?.classroomCounter ?? 0) + 1)
            .toString()
            .padStart(3, '0');

        for (const classInfo of formValue.classInfoArray) {
            const { grade, subject, programmeTemplate } = classInfo;

            try {
                const finalProgrammeTemplate = await lastValueFrom(
                    this.programmeTemplateService.getTemplatesFromDetails(
                        grade,
                        this.instituteInfo?.board,
                        subject,
                        programmeTemplate
                    )
                );

                if (finalProgrammeTemplate.docs.length > 0) {
                    // this.programmeTemplates = [finalProgrammeTemplate.docs[0].data()];
                    this.programmeTemplates.push(finalProgrammeTemplate.docs[0].data());
                }
            } catch (error) {
                console.error(`Error fetching programme template: ${error}`);
            }
        }
    }

    async onSubmit(templateForm) {
        this.disableAddButton = true;
        this.isSaveButtonEnabled = false;
        this.loading = true;

        await this.prepareProgrammeTemplates(templateForm);

        // Update classroom counter
        this.instituteInfo.classroomCounter =
            parseInt(this.instituteInfo?.classroomCounter) + templateForm.value.classInfoArray.length;

        this.latestClassrooms = templateForm.getRawValue().classInfoArray
            .map((classInfo: any, index: number) => {
                const formGroup = templateForm.get('classInfoArray')?.at(index);

                if (formGroup?.dirty) {
                    // Only include dirty fields with no programDocId
                    return {
                        ...classInfo,
                        institutionId: this.instituteInfo.institutionId,
                        // Assigning latest classroomCode
                        classroomCode: this.classroomCode,
                    };
                };
                return null;
            })
            // Remove null values
            .filter((classInfo: any) => classInfo !== null);

        // const lastclassroom = this.latestClassrooms[this.latestClassrooms.length - 1];
        const finalObject: OneClickInstitution = {
            institution: this.instituteInfo,
            classrooms: { classInfoArray: this.latestClassrooms },
            defaultWorkflowTemplate: this.defaultwfkTemplate,
            programmeTemplates: this.programmeTemplates,
            createdSource: 'one-click-institution-classroom-programme-creation',
            operation: 'edit',
            component: 'EditProgrammeTemplateComponent'
        };

        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/manage_one_click_institution`;
        // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/manage_one_click_institution`;

        try {
            await this.sharedService.sendToCloudFunction(endUrl, finalObject);
            this.uiService.alertMessage('Successful', 'Programme Added Successfully', 'success');
            this.disableAddButton = false;
            this.loading = false;
            this.isSaveButtonEnabled = false;

        } catch (error) {
            this.uiService.alertMessage('Error', 'Error adding Programme', 'error');
        }
    }

    unlockFormSequentially(formGroup: FormGroup, watch: string, unlock: string) {
        switch (watch) {
            default:
                formGroup?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe((res) => {
                    if (res) {
                        formGroup?.get(unlock)?.enable();
                    };
                });
                break;
        };
    }

}
