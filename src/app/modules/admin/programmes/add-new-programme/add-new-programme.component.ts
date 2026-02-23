import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { MatStepper } from '@angular/material/stepper';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UiService } from 'app/shared/ui.service';
import { Options } from 'ngx-slider-v2';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { Subject, first, lastValueFrom } from 'rxjs';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeFirestore } from 'app/core/dbOperations/programmes/programme.firestore';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { environment } from 'environments/environment';

export interface PeriodicElement {
    name: string;
}

@Component({
    selector: 'app-add-new-programme',
    templateUrl: './add-new-programme.component.html',
    styleUrls: ['./add-new-programme.component.scss']
})
export class AddNewProgrammeComponent implements OnInit {
    @Input() programDetails: any;//--getting the selected program---
    previousInputdata: any; //handling the stepperData when previous button is clicked
    @Input() stepper: MatStepper;
    @Input() stepperData: BehaviorSubject<any>;
    @Input() addNewProgramFlag?: boolean;
    @Input() allPrograms: any;
    @Input() searchTerm: any;
    @Output() searchTermOutput: EventEmitter<any> = new EventEmitter();

    storageBucket = 'programme_images';
    filename;
    bytesTransferred;
    loading: boolean = false;
    classroomTobeUpdated: any = [];
    imagePath: string;
    randomGeneratedId: string;
    images = {
        headLineImage: '',
    };
    gradeList: any = Array.from({ length: 10 }).map((_, i) => i + 1);

    isGrade = true;
    loader = false;
    isUpdateHeadlineImage: boolean = true;
    programStatus: any = ['LIVE', 'DEVELOPEMENT'];
    programType: any = ['REGULAR', 'STEM-CLUB'];
    newProgramme: FormGroup;
    programmeCodeFromConfig;
    masterClassrooms;
    masterDocs;
    lowValueGrade: number;
    highValueGrade: number;
    optionsGrade: Options = {
        floor: 1,
        ceil: 10,
        minRange: 1,
        maxRange: 10
    };
    lowValueAge: number;
    highValueAge: number;
    optionsAge: Options = {
        floor: 1,
        ceil: 16,
        minRange: 1,
        maxRange: 16
    };
    showRangeUi: boolean = false;
    classroomDataSubscription: any;
    disableUploadButton: boolean = true;
    showAgeGrade: boolean = false;
    isLoading: boolean = true;

    constructor(
        private fb: FormBuilder,
        private programmeService: ProgrammeService,
        private masterService: MasterService,
        private afStore: AngularFireStorage,
        private uiService: UiService,
        private programFireStore: ProgrammeFirestore,
        private classroomService: ClassroomsService,
        private teacherService: TeacherService,
        private studentsService: StudentsService,
        private configService: ConfigurationService,
    ) { }

    async ngOnInit(): Promise<void> {
        this.isLoading = true;
        const programCode = await this.getProgrammeCode();

        if (this.stepperData?.value?.institutionId === environment.defaultInstitutionId) {
            this.gradeList.unshift('Pre-primary 3');
            this.gradeList.unshift('Pre-primary 2');
            this.gradeList.unshift('Pre-primary 1');
        }

        const allMasterClassrooms = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('CLASSROOM', 'classrooms').pipe(first()));
        this.masterClassrooms = allMasterClassrooms.sort((x, y) => y.creationDate - x.creationDate);

        if (this.stepperData?.value) {
            this.getStepperdata(programCode);
            this.newProgramme.get('grades').patchValue(parseInt(this.stepperData?.value?.grade));
        } else {
            this.declareForm('', programCode);
        }
        this.isLoading = false;

        if (this.addNewProgramFlag) {
            this.randomGeneratedId = this.programFireStore.getRandomGeneratedId();
            this.newProgramme?.controls?.['grades']?.addValidators(Validators?.required);
        }
        if (!this.addNewProgramFlag) {
            this.randomGeneratedId = this.programDetails?.programmeId;
        }

        const watchList = [
            'programmeName',
            'displayName',
            'programmeCode',
            'programmeStatus',
            'programDescription',
            'type'
        ];

        const unlockList = [
            'displayName',
            'programmeCode',
            'programmeStatus',
            'programDescription',
            'type',
            'grades'
        ];

        for (let i = 0; i < watchList.length; i++) {
            if (this.addNewProgramFlag) {
                this.unlockFormSequentially(watchList[i], unlockList[i]);
            } else {
                this.disableUploadButton = false;
            }
        }
    }

    async getProgrammeCode() {
        const counters = await lastValueFrom(this.configService.getCounters().pipe(first()));
        const pCode = this.addOne(counters?.programmeCode);
        // this.declareForm('', pCode);
        return pCode;
    }

    addOne(s) {
        let newNumber = '';
        let continueAdding = true;
        for (let i = s.length - 1; i >= 0; i--) {
            if (continueAdding) {
                const num = parseInt(s[i], 10) + 1;
                if (num < 10) {
                    newNumber += num;
                    continueAdding = false;
                } else {
                    newNumber += '0';
                }
            } else {
                newNumber += s[i];
            }
        }
        return newNumber.split('').reverse().join('');
    }

    async declareForm(data: any, programCode: string) {
        this.newProgramme = this.fb.group({
            age: [{ value: [], disabled: this.addNewProgramFlag ? true : false }, Validators.required],
            displayName: [{ value: this.programDetails?.displayName, disabled: this.addNewProgramFlag ? true : false }, [Validators.required]],
            grades: [{ value: [], disabled: this.addNewProgramFlag ? true : false }, Validators.required],
            institutionId: [this.programDetails?.institutionId || data?.institutionId || ''],
            institutionName: [this.programDetails?.institutionName || data?.institutionName || ''],
            programDescription: [{ value: this.programDetails?.programmeDescription || '', disabled: this.addNewProgramFlag ? true : false }, Validators.required],
            programmeCode: [{ value: this.programDetails?.programmeCode || programCode, disabled: this.addNewProgramFlag ? true : false }],
            programmeImagePath: [this.programDetails?.programmeImagePath || ''],
            programmeName: [this.programDetails?.programmeName || '', Validators.required],
            programmeStatus: [{ value: this.programDetails?.programmeStatus || '', disabled: this.addNewProgramFlag ? true : false }, Validators.required],
            type: [{ value: this.programDetails?.type, disabled: this.addNewProgramFlag ? true : false }, [Validators.required]],
        });

        if (this.programDetails?.grades?.length > 1) {
            const g = this.programDetails?.grades;
            this.isGrade = true;
            this.showRangeUi = g.length == 1 ? false : true;
            const value1 = g[0];
            const value2 = g[g.length - 1];
            this.newProgramme.patchValue({
                grades: [value1, value2]
            });
        }
        else {
            this.newProgramme.patchValue({
                grades: this.programDetails?.grades?.[0]
            });
        }

        if (this.programDetails?.age?.length) {
            const a = this.programDetails?.age;
            this.isGrade = false;
            this.showRangeUi = a.length == 1 ? false : true;
            const value1 = this.programDetails?.age[0];
            const value2 = this.programDetails?.age[this.programDetails?.age.length - 1];
            this.newProgramme.patchValue({
                age: [value1, value2]
            });
        }
    }

    getStepperdata(programCode: string) {
        const previousInputdata = this.previousInputdata = this.stepperData.value;
        this.stepperData.value.programmeCode = programCode;
        this.declareForm(previousInputdata, programCode);
    }

    async onSubmit(form) {
        this.loading = true;
        let age = [];
        let grades = [];
        if (form.value.grades) {
            if (Array.isArray(form.value.grades)) {
                grades = this.getAllclsInArray(form.value.grades);
            }
            else {
                grades.push(form.value.grades);
            }
        }
        if (form.value.age) {
            if (Array.isArray(form.value.age)) {
                age = this.getAllclsInArray(form.value.age);
            }
            else {
                age.push(form.value.age);
            }
        }

        if (this.addNewProgramFlag) {
            if (!!this.previousInputdata) {
                this.previousInputdata.programmeCode = this.stepperData?.value?.programmeCode;
                this.previousInputdata.age = age;
                this.previousInputdata.displayName = form.value.displayName;
                this.previousInputdata.grades = grades;
                this.previousInputdata.institutionId = this.stepperData?.value?.institutionId;
                this.previousInputdata.institutionName = this.stepperData?.value.institutionName;
                this.previousInputdata.programmeDesc = form.controls.programDescription.value;
                this.previousInputdata.programmeId = this.randomGeneratedId;
                this.previousInputdata.programmeImage = this.imagePath;
                this.previousInputdata.programmeName = form.controls.programmeName.value;
                this.previousInputdata.programmeStatus = form.controls.programmeStatus.value;
                this.previousInputdata.type = form.value.type;
                this.stepperData.next(this.previousInputdata);
            }
            else {
                this.stepperData.next({
                    age: age,
                    displayName: form.value.displayName,
                    grades: grades,
                    institutionId: this.stepperData?.value?.institutionId,
                    institutionName: this.stepperData?.value?.institutionName,
                    programmeCode: form.value.programmeCode,
                    programmeDesc: form.controls.programDescription.value,
                    programmeId: this.randomGeneratedId,
                    programmeImage: this.imagePath,
                    programmeName: form.controls.programmeName.value,
                    programmeStatus: form.controls.programmeStatus.value,
                    type: form.controls.type.value,
                });
            }
        }
        else {
            const { programmeId, masterDocId } = this.programDetails;

            const updatedProgramme = {
                programmeId,
                programmeName: form.controls.programmeName.value,
                programmeDescription: form.controls.programDescription.value,
                programmeImagePath: this.imagePath || '',
                programmeStatus: form.controls.programmeStatus.value,
                type: form.controls.type.value,
                grades: grades,
                age: age,
                displayName: form.value.displayName,
            };

            const masterClassroomsWithMatchingProgramme = await this.masterClassrooms.filter((doc: any) => doc?.programmes?.hasOwnProperty(programmeId));
            const matchingClassroomIds = masterClassroomsWithMatchingProgramme.map((classroom: any) => classroom.docId);
            const teachersWithMatchingClassrooms = await this.teacherService.getAllTeacherDocsByClassroom(matchingClassroomIds);
            const studentsWithMatchingClassrooms = await this.studentsService.getAllStudentDocsByClassroom(matchingClassroomIds);

            try {
                await this.updateProgrammeinClassroomsAndClassroomMaster(masterClassroomsWithMatchingProgramme, form.value.displayName, form.value.programmeName);
                await this.updateClassroomProgrammeInStudentsAndTeachers(teachersWithMatchingClassrooms, matchingClassroomIds, programmeId, form.value.displayName, form.value.programmeName, 'Teacher');
                await this.updateClassroomProgrammeInStudentsAndTeachers(studentsWithMatchingClassrooms, matchingClassroomIds, programmeId, form.value.displayName, form.value.programmeName, 'Student');
                await this.programmeService.updateProgramme(updatedProgramme);
                await this.updateProgrammeMaster(updatedProgramme, masterDocId);
                this.uiService.alertMessage('Success', 'Programme details updated successfully', 'success');
                this.searchTermOutput.emit(this.searchTerm);
            } catch (error) {
                this.uiService.alertMessage('Error', 'Error updating programme details', 'error');
                console.error('Error updating programme details: ', error);
            } finally {
                this.loading = false;
            };
        }
    }

    async updateProgrammeinClassroomsAndClassroomMaster(classrooms: Array<any>, displayName: string, programmeName: string) {
        await Promise.all(
            classrooms.map(async (classroom) => {
                const { docId: classroomId, masterDocId } = classroom;
                const programmeId = this.programDetails.programmeId;
                await this.masterService.updateMasterDocField(masterDocId, classroomId, 'classrooms', `programmes.${programmeId}.displayName`, displayName);
                await this.masterService.updateMasterDocField(masterDocId, classroomId, 'classrooms', `programmes.${programmeId}.programmeName`, programmeName);
                await this.classroomService.updateClassroomSingleField(classroomId, `programmes.${programmeId}.displayName`, displayName);
                await this.classroomService.updateClassroomSingleField(classroomId, `programmes.${programmeId}.programmeName`, programmeName);
            }));
    }

    async updateClassroomProgrammeInStudentsAndTeachers(arrayToUpdate: Array<any>, matchingClassroomIds: Array<any>, programmeId: string, displayName: string, programmeName: string, role: string) {
        await Promise.all(arrayToUpdate.map(async (document: any) => {
            const { docId, classrooms } = document;
            for (const classroomId in classrooms) {
                // if (matchingClassroomIds.includes(classroomId)) {
                if (JSON.stringify(classrooms[classroomId]).includes(programmeId)) {
                    const programmes = classrooms[classroomId].programmes;
                    const matchingProgramme = programmes.find((programme: any) => programme.programmeId === programmeId);
                    matchingProgramme.displayName = displayName;
                    matchingProgramme.programmeName = programmeName;
                    await this[`${role.toLowerCase()}Service`][`updateSingleFieldIn${role}`](docId, `classrooms.${classroomId}.programmes`, programmes);
                } else {
                    console.error(`No ${role} classroom to update`);
                };
            };
        }));
    }

    async updateProgrammeMaster(programmeDetails: any, masterDocId: string) {
        await Promise.all(Object.entries(programmeDetails).map(async ([key, value]) => {
            if ((value && this.programDetails[key]) && (value !== this.programDetails[key])) {
                await this.masterService.updateMasterDocField(masterDocId, this.programDetails.programmeId, 'programmes', key, value);
            } else {
                console.error(`Not updating ${key} in master doc ${masterDocId} for programme ${this.programDetails.programmeId} as value is unchanged`);
            };
        }));
    }

    getAllclsInArray(array) {
        const classArr = [];
        for (let i = array[0]; i <= array[1]; ++i) {
            classArr.push(i);
        }
        return classArr;
    }

    async selectFile(event: any) {
        this.filename = event.target.files[0].name;
        const isValid = this.imageTypeAndSizeCheck(event.target.files[0]);
        if (isValid) {
            this.loader = true;
            const bucketPath = `${this.storageBucket}/${this.randomGeneratedId}.` + this.filename.split('.').slice(-1).pop();
            const ref = this.afStore.ref(bucketPath);
            const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();

            await lastValueFrom(task).then((uploadedSnapshot) => {
                this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100;
                if (uploadedSnapshot.state === 'success') {
                    this.loader = false;
                    if (this.programDetails) {
                        this.programDetails.programmeImagePath = bucketPath;
                    }
                    this.imagePath = bucketPath;
                    this.uiService.alertMessage('successful', 'Image Uploaded successfully', 'success');
                }
            });
        }
    }

    imageTypeAndSizeCheck(event) {
        const allowedExtensions = /(\.jpeg|\.png|\.jpg)$/i;
        let isValid = false;
        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage('Invalid file type', 'Only allowed .jpeg, .png, .jpg file types', 'warn');
            this.filename = '';
            isValid = false;
        }
        else if (event.size > 3145728) {
            this.uiService.alertMessage('Invalid file type', 'maximum image size should be 3mb', 'warn');
            this.filename = '';
            isValid = false;
        }
        else {
            isValid = true;
        }
        return isValid;
    }

    ageGradeSelection() {
        if (this.isGrade) {
            this.newProgramme.get('grades').enable();
            this.newProgramme.get('age').disable();
            this.newProgramme.get('age').setValue(null);
            // this.newProgramme.get('grade').addValidators(Validators.required)
            this.newProgramme.controls['grades'].addValidators(Validators.required);
            this.newProgramme.get('age').clearValidators();

            if (this.showRangeUi) {
                this.newProgramme.patchValue({
                    grades: [1, 5]
                });
            }
            else {
                this.newProgramme.patchValue({
                    grades: []
                });
            }
        }
        else {
            this.newProgramme.get('age').enable();
            this.newProgramme.get('grades').disable();
            this.newProgramme.get('grades').setValue('');
            this.newProgramme.controls['age'].addValidators(Validators.required);
            this.newProgramme.get('grades').clearValidators();
            if (this.showRangeUi) {
                this.newProgramme.patchValue({
                    age: [1, 5]
                });
            }
            else {
                this.newProgramme.patchValue({
                    age: []
                });
            }
        }
    }

    rangeToggle(event) {
        if (event.checked) {
            this.showRangeUi = true;
            if (this.isGrade) {
                this.newProgramme.patchValue({
                    grades: [1, 5],
                    age: null
                });
            }
            else {
                this.newProgramme.patchValue({
                    age: [1, 5],
                    grades: null,

                });
            }
        }
        else {
            this.showRangeUi = false;
            if (this.isGrade) {
                this.newProgramme.patchValue({
                    grades: []
                });
            }
            else {
                this.newProgramme.patchValue({
                    age: []
                });
            }
        }
    }

    ngOnDestroy() {
        // Unsubscribe when the component is destroyed
        if (this.classroomDataSubscription) {
            this.classroomDataSubscription.unsubscribe();
        }
    }

    unlockFormSequentially(watch: string, unlock: string) {
        switch (watch) {
            case 'type':
                this.newProgramme?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res) {
                        this.disableUploadButton = false;
                        if (this.isGrade) {
                            this.newProgramme?.get(unlock)?.enable();
                            this.newProgramme?.get('age')?.markAsTouched();
                        } else {
                            this.newProgramme?.get('age')?.enable();
                            this.newProgramme?.get(unlock)?.markAsTouched();
                        }
                        this.showAgeGrade = true;
                    }
                });
                break;

            default:
                this.newProgramme?.get(watch)?.valueChanges.subscribe(async (res) => {
                    if (res) {
                        this.newProgramme?.get(unlock)?.enable();
                    }
                });
                break;
        };
    }

}
