import { HttpClient } from '@angular/common/http';
import {
    Component,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UiService } from 'app/shared/ui.service';
import {
    BehaviorSubject,
    first,
    firstValueFrom,
    lastValueFrom,
    Subject,
    Subscription,
    takeUntil,
} from 'rxjs';
import * as XLSX from 'xlsx';
import {
    AngularFirestore,
    CollectionReference,
    QueryFn,
} from '@angular/fire/compat/firestore';
import { fuseAnimations } from '@fuse/animations';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { environment } from 'environments/environment';
import { SharedService } from 'app/shared/shared.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { arrayUnion, deleteField, Timestamp } from '@angular/fire/firestore';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { MatDialog } from '@angular/material/dialog';
import { AddMasterSheetStudentsComponent } from './add-master-sheet-students/add-master-sheet-students.component';

@Component({
    selector: 'app-add-students',
    templateUrl: './add-students.component.html',
    styleUrls: ['./add-students.component.scss'],
    animations: fuseAnimations,
})
export class AddStudentsComponent implements OnInit, OnDestroy {
    @ViewChild('studentFileInputRef') studentFileInputRef: ElementRef;

    @Input() stepper: MatStepper;
    @Input() selectedClassroomsSub: BehaviorSubject<any>;
    @Input() instititutionSubRef: BehaviorSubject<any>;
    @Input() index: any;
    @Input() country: string;
    @Input() accessLevel: number | string;
    @Input() loggedInTeacher: any;

    loading = false;
    isActive = false;
    classrooms: any = [];
    userForm: FormGroup;
    subscriptionRef: Subscription[] = [];
    isBulkUpload: boolean = false;
    filename: any;
    isActiveloader: boolean = false;
    selectCls;
    studentsJson;
    studentInputFile;
    isFormValid = false;
    allClasses: any;
    allClassesClone = [];
    isCollapseActive = false;
    gradeList;
    currentGrade = {};
    uploading: boolean = false;
    studentDoc: any;
    infoLoaded = false;
    classClone = [];
    classroomTobeFitlerd: any = [];
    selectedGrade;
    selectedSection;
    deleteButtonIsActive = [];
    allClsRooms: any[] = [];
    registeredClsIds: string[] = [];
    selectedClsIds: string[] = [];
    studentArr: any;
    multipleStudents = false;
    isUserTobeCreated = false;
    showEmailDiv = false;
    isProfileAutoSelected = false;
    isClassButtonActive = false;
    isWANotificationsDisabled: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    countryCode: string;
    logfileDownload: boolean = false;
    usersLogArr: any[] = [];
    isLoaded: boolean = false;
    classroomSelected: any[] = [];
    genderList = [];
    generalContests = [];
    Contest: any;
    finalContestsLst = [];
    classroomStemClubdependentContests = [];
    // registercontest = [];
    selectContest: any;
    // selectContest: any[] = [];
    selectedContests: any[] = [];
    isContestRegistrationRequired: boolean = true;
    currentTeacher: any;
    rollNoCache = new Map<string, Set<string>>();
    rollNoSubs = new Map<number, Subscription>();

    constructor(
        private classroomService: ClassroomsService,
        private httpClient: HttpClient,
        private uiService: UiService,
        private studentService: StudentsService,
        private fb: FormBuilder,
        private configurationService: ConfigurationService,
        private sharedService: SharedService,
        private afs: AngularFirestore,
        private teacherService: TeacherService,
        private contestService: ContestService,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private dilaog: MatDialog
    ) { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.index) {
            if (this.index === 3) {
                if (this.classInfo()) {
                    this.classInfo().controls = [];
                    this.classroomTobeFitlerd = [];
                    this.userForm.get('fName').markAsUntouched();
                    this.userForm.get('fName').disable();
                    this.userForm.get('email').markAsUntouched();
                    this.userForm.get('email').disable();
                    this.userForm.get('lName').markAsUntouched();
                    this.userForm.get('lName').disable();
                    this.userForm.get('age').markAsUntouched();
                    this.userForm.get('age').disable();
                    this.userForm.get('grade').markAsUntouched();
                    this.userForm.get('grade').disable();
                    this.userForm.controls['lName'].setValue('');
                    this.userForm.controls['lName'].setErrors(null);
                    this.userForm.controls['fName'].setValue('');
                    this.userForm.controls['fName'].setErrors(null);
                    this.userForm.controls['age'].setValue(0);
                    this.userForm.controls['age'].setErrors(null);
                    this.userForm.controls['grade'].setValue('');
                    this.userForm.controls['grade'].setErrors(null);
                    this.userForm.get('isEmailAutoField').setValue(false);
                    this.userForm.get('isFNameAutoField').setValue(false);
                    this.userForm.get('isLNameAutoField').setValue(false);
                    this.userForm.get('isAgeAutoField').setValue(false);
                    this.userForm.get('isGradeAutoField').setValue(false);
                    for (const controlName in this.userForm.controls) {
                        const control = this.userForm.get(controlName);
                        control.reset();
                        control.setErrors(null);
                    }
                }
            }
        } else {
            this.classroomTobeFitlerd = [];
        }
    }

    ngOnDestroy(): void {
        if (this.subscriptionRef.length) {
            this.subscriptionRef.map((d) => d.unsubscribe());
        }
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        this.isProfileAutoSelected = false;
    }

    async ngOnInit() {
        this.configurationService
            .getTeacherCornerConfigurations()
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((res) => {
                this.isWANotificationsDisabled =
                    res?.disableWhatsAppNotifications;
            });

        this.generalContests = await lastValueFrom(
            this.contestService.getContestsByType('general')
        );

        this.classroomStemClubdependentContests = await lastValueFrom(
            this.contestService.getContestsByType('classroomStemClubdependent')
        );
        this.Contest = (this.classroomStemClubdependentContests || []).filter(
            (contest) => {
                const instId = this.instititutionSubRef?.value;
                const visibility =
                    contest?.contestVisibilityToInstitutions?.[instId];
                return visibility?.institutionId === instId;
            }
        );

        this.finalContestsLst = [
            ...this.generalContests,
            ...this.Contest,
        ];

        // this.Contest = []

        this.finalContestsLst = this.sortContestsByStartDate(this.finalContestsLst);

        // this.Contest = this.classroomStemClubdependentContests.filter(contest => {
        //     return contest.contestVisibilityToInstitutions[this.instititutionSubRef?.value].institutionId === this.instititutionSubRef?.value;
        // });

        const genderListRef = await lastValueFrom(
            this.configurationService
                .getConfigurationDocumentOnce('genderList')
                .pipe(first())
        );
        this.genderList = Object.values(genderListRef.get('genderList'));

        this.userForm = this.fb.group({
            fName: ['', [Validators.required]],
            lName: ['', [Validators.required]],
            phone: ['', [Validators.required]],
            email: ['', [Validators.email]],
            age: [0, [Validators.required]],
            gender: ['', [Validators.required]],

            isEmailAutoField: [false],
            isFNameAutoField: [false],
            isLNameAutoField: [false],
            isAgeAutoField: [false],
            isGenderAutoField: [false],

            classInfo: new FormArray([]),
            profile: [''],
        });
        const clasSub =
            this.classroomService.allClassroomByInstituteSub.subscribe(
                async (cls) => {
                    if (cls?.length) {
                        const classrooms = cls.filter(
                            (cls: any) => cls?.type == 'CLASSROOM'
                        );
                        const teacherClassroomIds = Object.keys(
                            this.loggedInTeacher?.classrooms
                        );
                        this.classrooms =
                            Number(this.accessLevel) === 9
                                ? classrooms.filter((cls: any) =>
                                    teacherClassroomIds?.includes(cls?.docId)
                                )
                                : classrooms;
                        this.countryCode = (
                            await this.getCountryCode(cls)
                        )?.countryCode;
                        this.allClsRooms = this.getFilterClssroom(cls, false);

                        // Prepare allClasses and gradeList
                        this.allClasses = [...this.allClsRooms];
                        this.allClassesClone = [...this.allClsRooms];
                        this.gradeList = [
                            ...new Set(
                                this.allClasses
                                    .map((doc) => doc.grade)
                                    .filter(
                                        (g) => g !== null && g !== undefined
                                    )
                            ),
                        ].sort((a, b) =>
                            a
                                .toString()
                                .localeCompare(b.toString(), undefined, {
                                    numeric: true,
                                })
                        );

                        this.addClassInfo();
                        this.isLoaded = true;
                    }
                }
            );

        this.subscriptionRef.push(clasSub);

        const selectedSub = this.selectedClassroomsSub.subscribe((res: any) => {
            if (res != null) {
                this.selectCls = res;
                const selectedClsRooms = this.getFilterClssroom(res, false);
                this.userForm.patchValue({
                    allSelectedClassroom: [...selectedClsRooms],
                });
                const classRoomIdsArr = selectedClsRooms.map(
                    (cls: any) => cls['classroomId']
                );
                this.registeredClsIds = classRoomIdsArr;
                this.selectedClsIds = classRoomIdsArr;
            }
        });
        this.subscriptionRef.push(selectedSub);

        this.getClasses();

        const sub2 = this.userForm
            .get('phone')
            .valueChanges.subscribe((res) => {
                this.isProfileAutoSelected = false;
                if (res) {
                    this.getClasses();
                    this.getBasicStudentInfo(res);
                } else {
                    this.userForm.patchValue({
                        email: '',
                        fName: '',
                        lName: '',
                        age: 0,
                        gender: '',
                    });
                    this.clearFormArray();
                    this.multipleStudents = false;
                    this.showEmailDiv = false;
                    this.isClassButtonActive = false;
                    this.classroomTobeFitlerd = [];
                }
            });
        this.subscriptionRef.push(sub2);

        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        this.currentTeacher = await lastValueFrom(this.teacherService.getWithId(currentUser?.id || currentUser?.docId))
    }

    async checkingStudentData() {
        const snap = await firstValueFrom(this.afs.collection('Students', (ref) => ref.where('studentMeta.phoneNumber', '==', '7676757980')).get());
        const studentData = snap.docs.map(d => { d.data() }) as any;
        for(let student of studentData){
            console.log(student.classrooms);
        }
    }

    isArray(field: any): boolean {
        return Array.isArray(field);
    }

    // registerContestToggle(event: MatSlideToggleChange) {
    //     this.isContestRegistrationRequired = event.checked;
    // }

    classInfo(): FormArray {
        return this.userForm?.get('classInfo') as FormArray;
    }

    addClassInfo(infoObj?, infoLoaded?) {
        if (!this.infoLoaded) {
            this.selectedGrade = 'undefined';
            this.selectedSection = 'undefined';
        }
        this.infoLoaded = infoLoaded || false;
        if (this.infoLoaded) {
            this.deleteButtonIsActive.push(true);
        }
        if (!this.infoLoaded) {
            this.deleteButtonIsActive.push(false);

            const d = this.classInfo().length - 1;
            if (d != -1) {
                this.classInfo()
                    .at(this.classInfo().length - 1)
                    .disable();
            } else {
                console.error(`classInfo is empty`);
            }
        }
        if (typeof infoObj != 'undefined') {
            const index = this.allClasses.findIndex(
                (elem) =>
                    elem.section == infoObj.selectedSection &&
                    elem.grade == infoObj.selectedGrade
            );
            this.removeClassroom(index);
        }
        this.classInfo().push(this.newClassInfo(infoObj));
        const lastIndex = this.classInfo().length - 1;
        const row = this.classInfo().at(lastIndex) as FormGroup;

        const progCtrl = row.get('selectedProgrammes');
        const rollCtrl = row.get('rollNumber');

        // ✅ set initial state (important when patchValue happens)
        const initialProgs = progCtrl?.value;
        if (Array.isArray(initialProgs) && initialProgs.length > 0) {
            rollCtrl?.enable({ emitEvent: false });
        } else {
            rollCtrl?.disable({ emitEvent: false });
            rollCtrl?.reset('', { emitEvent: false });
        }

        // ✅ keep updating when programme changes
        progCtrl?.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((val) => {
            if (Array.isArray(val) && val.length > 0) {
                rollCtrl?.enable({ emitEvent: false });
            } else {
                rollCtrl?.disable({ emitEvent: false });
                rollCtrl?.reset('', { emitEvent: false });
            }
        });

        if (infoObj) {
            const lastIndex = this.classInfo().length - 1;
            const row = this.classInfo().at(lastIndex) as FormGroup;

            // Disable only grade/section/programme if you want read-only rows
            row.get('selectedGrade')?.disable({ emitEvent: false });
            row.get('selectedSection')?.disable({ emitEvent: false });
            row.get('selectedProgrammes')?.disable({ emitEvent: false });
            row.get('selectedContests')?.disable({ emitEvent: false });
            row.get('rollNumber')?.disable({ emitEvent: false });

            // rollNumber should stay enabled/disabled based on programme
            // so don't blindly disable it here
        }

        if (this.classInfo().length > 2) {
            this.isCollapseActive = true;
        }
        this.checkRemainingGrades();
    }

    // newClassInfo(infoObj?): FormGroup {
    //     return this.fb.group({
    //         gradeList: [
    //             infoObj?.gradeList || this.gradeList,
    //             Validators.required,
    //         ],
    //         selectedGrade: [infoObj?.selectedGrade || '', Validators.required],
    //         sectionList: [infoObj?.sectionList || '', Validators.required],
    //         selectedSection: [
    //             infoObj?.selectedSection || '',
    //             Validators.required,
    //         ],
    //         programmesList: [
    //             infoObj?.programmesList || [],
    //             [Validators.required],
    //         ],
    //         selectedProgrammes: [
    //             infoObj?.selectedProgrammes || [],
    //             [Validators.required],
    //         ],
    //         classObj: [infoObj?.classObj || {}],
    //     });
    // }

    newClassInfo(infoObj?): FormGroup {
        const programmesSelected =
            Array.isArray(infoObj?.selectedProgrammes) && infoObj.selectedProgrammes.length > 0;
        return this.fb.group({
            gradeList: [
                infoObj?.gradeList || this.gradeList,
                Validators.required,
            ],
            selectedGrade: [infoObj?.selectedGrade || '', Validators.required],
            sectionList: [infoObj?.sectionList || '', Validators.required],
            selectedSection: [
                infoObj?.selectedSection || '',
                Validators.required,
            ],
            programmesList: [
                infoObj?.programmesList || [],
                [Validators.required],
            ],
            selectedProgrammes: [
                infoObj?.selectedProgrammes || [],
                [Validators.required],
            ],
            // ✅ disabled until programme selected
            rollNumber: [
                { value: infoObj?.rollNumber || '', disabled: !programmesSelected },
                Validators.required,
            ],
            classObj: [infoObj?.classObj || {}],
            // Add contest fields to form array
            contestsList: [infoObj?.contestsList || this.finalContestsLst],
            selectedContests: [infoObj?.selectedContests || []]
        });
    }


    onSelectContest(event: any, index: number) {
        // Update the specific form control for this classroom
        this.classInfo().at(index).patchValue({
            selectedContests: event.value
        });
    }

    addNewClassInfo(classObj, programmesArray, infoLoaded?, availableContests?, registeredContests?) {
        const sectionArr = [];

        this.allClasses.forEach((doc) => {
            if (doc.grade == classObj.grade) {
                sectionArr.push(doc.section);
            }
        });
        const uniqSec: any = [...new Set(sectionArr)];
        const sortedSections = uniqSec.sort((a, b) => a.localeCompare(b));

        const contestsList = availableContests || this.finalContestsLst;
        const selectedContests = registeredContests || [];

        const infoObj = {
            gradeList: this.gradeList,
            selectedGrade: classObj.grade,
            sectionList: sortedSections,
            selectedSection: classObj.section,
            programmesList: Object.values(classObj.programmes),
            selectedProgrammes: programmesArray,
            rollNumber: classObj.rollNumber || '',
            classObj: classObj,
            // Add contest data
            contestsList: contestsList, // Filtered available contests
            selectedContests: selectedContests // Pre-selected registered contests
        };
        this.classroomTobeFitlerd.push(infoObj);
        this.addClassInfo(infoObj, infoLoaded);
    }

    async processClassrooms(form) {
        const studentClassrooms = form.classInfo.map((c) => ({
            institutionId: c.classObj.institutionId,
            institutionName: c.classObj.institutionName,
            classroomId: c.classObj.classroomId,
            classroomName: c.classObj.classroomName,
            grade: c.classObj.grade,
            section: c.classObj.section,
            type: c.classObj.type,
            board: c.classObj.board, // Add board directly to classroom
            programmes: c.selectedProgrammes.map((prog) => {
                const { workflowIds, ...rest } = prog;
                return rest;
            }),
            rollNumber: c.rollNumber || '',
            // Include contests for each classroom
            selectedContests: c.selectedContests || []
        }));

        const userDetailsWithClassroom = {
            isBulkUpload: false,
            isTeacher: false,
            firstName: form.fName.trim(),
            lastName: form.lName.trim(),
            fullNameLowerCase: `${form.fName
                .trim()
                .toLowerCase()
                .replace(/ /g, '')}${form.lName
                    .trim()
                    .toLowerCase()
                    .replace(/ /g, '')}`,
            countryCode: this.countryCode,
            phoneNumber: form.phone,
            email: form.email,
            age: form.age,
            gender: form.gender,
            studentClassrooms: studentClassrooms,
        };

        await this.addUsers(userDetailsWithClassroom);
    }

    // Updated addUsers method with proper contest data extraction
    async addUsers(userClassroom) {
        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
        // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/users_add_into_classrooms_v2`;

        const formData: any = {
            userClassroomDetails: userClassroom,
        };

        // Handle contest data from individual classrooms in form array
        try {
            const classroomsWithContests = userClassroom.studentClassrooms.filter(
                classroom => classroom.selectedContests && classroom.selectedContests.length > 0
            );

            if (classroomsWithContests.length > 0) {
                // Process contests with classroom association
                const allContests = [];
                let board = null;

                // Get current teacher/nominator information (you'll need to get this from your auth service or user context)
                // const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
                // const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
                // const currentTeacher = await lastValueFrom(this.teacherService.getWithId(currentUser?.id || currentUser?.docId))

                classroomsWithContests.forEach(classroom => {
                    if (classroom.selectedContests && classroom.selectedContests.length > 0) {
                        // Set board from first classroom with contests if not already set
                        if (!board && classroom.board) {
                            board = classroom.board;
                        }

                        // Add classroom association to each contest
                        classroom.selectedContests.forEach(contest => {
                            allContests.push({
                                ...contest,
                                classroomId: classroom.classroomId, // Associate contest with classroom
                                nominateMeta: {
                                    firstName: this.currentTeacher.teacherMeta.firstName,
                                    lastName: this.currentTeacher.teacherMeta.lastName,
                                    fullNameLowerCase: this.currentTeacher.teacherMeta.fullNameLowerCase,
                                    countryCode: this.currentTeacher.teacherMeta.countryCode,
                                    phoneNumber: this.currentTeacher.teacherMeta.phoneNumber,
                                    email: this.currentTeacher.teacherMeta.email,
                                    institutionId: classroom.institutionId,
                                    institutionName: classroom.institutionName,
                                    nominationAt: Timestamp.now(), // Will be converted to Timestamp in cloud function
                                    linkUid: this.currentTeacher.teacherMeta.uid || '',
                                    confirm: false
                                }
                            });
                        });
                    }
                });

                if (allContests.length > 0 && board) {
                    formData.contestData = {
                        contests: allContests,
                        board: board,
                    };
                }
            }
        } catch (e) {

        }

        const httpOption: any = {
            responseType: 'application/json',
        };

        try {
            const response = await lastValueFrom(
                this.httpClient
                    .post<any>(endUrl, formData, httpOption)
                    .pipe(first())
            );
            this.loading = false;

            const studentInfo = {
                name: `${formData.userClassroomDetails['firstName']} ${formData.userClassroomDetails['lastName'] || ''}`,
                phone: formData.userClassroomDetails.countryCode + formData.userClassroomDetails.phoneNumber,
                institutionName: formData.userClassroomDetails.studentClassrooms[0].institutionName,
            };

            if (response) {
                if (!this.isWANotificationsDisabled) {
                    this.sendWaNotifications(studentInfo);

                    // Check if any classroom has contests selected
                    const hasContestRegistrations = userClassroom.studentClassrooms.some(
                        classroom => classroom.selectedContests && classroom.selectedContests.length > 0
                    );

                    if (hasContestRegistrations) {
                        this.sendWaNotificationsContests(studentInfo);
                    }
                }
                this.uiService.alertMessage(
                    'Successful',
                    'Student Added To Classroom Successfully',
                    'success'
                );
                this.userForm.reset();
                this.userForm.enable();
            } else {
                this.uiService.alertMessage(
                    'Oops',
                    'Please try again',
                    'error'
                );
                this.userForm.enable();
            }
        } catch (error) {
            console.error(error);
            this.uiService.alertMessage(
                'Error',
                'Error adding student to classroom',
                'error'
            );
            this.userForm.enable();
        }
    }

    getClasses() { }

    getSortedClassrooms(classrooms: any) {
        const prePrimaryClassrooms = classrooms.filter(
            (classroom) =>
                typeof classroom.grade === 'string' &&
                classroom.grade.startsWith('Pre-primary')
        );
        const otherClassrooms = classrooms.filter(
            (classroom) =>
                !(
                    typeof classroom.grade === 'string' &&
                    classroom.grade.startsWith('Pre-primary')
                )
        );

        // Sort pre-primary classrooms
        prePrimaryClassrooms.sort((a, b) => {
            const aNum = parseInt(a.grade.split(' ')[1]);
            const bNum = parseInt(b.grade.split(' ')[1]);
            return aNum - bNum;
        });

        // Combine sorted pre-primary classrooms with other classrooms
        const sortedClassrooms = [...prePrimaryClassrooms, ...otherClassrooms];
        return sortedClassrooms;
    }

    onClickGrade(event, index) {
        const sectionArr = [];
        this.allClasses.forEach((doc) => {
            if (doc?.grade == event?.value) {
                sectionArr.push(doc.section);
            }
        });
        const uniqSec: any = [...new Set(sectionArr)];
        const sortedSections = uniqSec.sort((a, b) => a.localeCompare(b));

        this.classInfo()?.at(index)?.patchValue({
            sectionList: sortedSections,
        });
        if (this.classInfo()?.at(index)?.get('selectedSection')?.value) {
            const cls = this.allClasses.find(
                (doc) =>
                    doc.grade == event.value &&
                    doc.section ==
                    this.classInfo().at(index).get('selectedSection').value
            );

            this.classInfo()
                .at(index)
                .patchValue({
                    programmesList: Object.values(cls.programmes),
                    classObj: cls,
                });
            const sec = this.classInfo().at(index).get('selectedSection').value;

            this.addClassroom(this.currentGrade[index], sec);
        }
        this.currentGrade[index] = event?.value;
        this.selectedGrade = event?.value;
        this.checkRemainingGrades();
    }

    async onSelectSection(event, index) {
        const grade = this.classInfo().at(index).get('selectedGrade').value;
        const cls = this.allClasses.find(
            (doc) => doc.grade == grade && doc.section == event.value
        );

        // Extract contest IDs from the profile's contests object
        const contestsData = this.userForm.get('profile')?.value?.contests || {};
        const studentContestIds: string[] = [];

        // New structure: contests is an object where keys are contest IDs
        // Each contest has a 'classrooms' object containing classroom details
        studentContestIds.push(...Object.keys(contestsData));

        // Get the contests that are already registered for THIS specific classroom
        let registeredContests = [];

        if (cls?.classroomId) {
            const studentsDocs = await this.studentService.getAllStudentDocsByInstitution([cls?.classroomId], this.instititutionSubRef?.value);
            this.applyRollNumberValidator(index, cls, studentsDocs);
            console.log('students docuemnts:', studentsDocs);
            // New structure: Loop through all contests and check if current classroom exists
            Object.keys(contestsData).forEach(contestId => {
                const contestClassrooms = contestsData[contestId]?.classrooms || {};
                // Check if this classroom ID exists in the contest's classrooms
                if (contestClassrooms[cls.classroomId]) {
                    // Find the full contest object from finalContestsLst
                    const contest = this.finalContestsLst.find(c => c.docId === contestId);
                    if (contest) {
                        registeredContests.push(contest);
                    }
                }
            });
        }

        // Filter out contests that student is already registered for (excluding current classroom's contests)
        const availableContests = this.finalContestsLst.filter(contest => {
            const isRegisteredAnywhere = studentContestIds.includes(contest.docId);
            const isRegisteredInThisClassroom = cls?.classroomId && contestsData[contest.docId]?.classrooms?.[cls.classroomId];
            // Show if not registered anywhere OR if registered in this specific classroom
            return !isRegisteredAnywhere || isRegisteredInThisClassroom;
        });

        this.classInfo()
            .at(index)
            .patchValue({
                programmesList: Object.values(cls.programmes),
                classObj: cls,
                contestsList: availableContests, // Add filtered contests (includes registered for this classroom)
                selectedContests: registeredContests // Patch already registered contests for this classroom
            });

        const classIndex = this.allClasses.findIndex(
            (doc) => doc.grade == grade && doc.section == event.value
        );
        if (classIndex != -1) {
            this.removeClassroom(classIndex);
        }

        if (this.allClasses.length == 0) {
            this.isClassButtonActive = false;
        }
    }

    removeClassroom(index) {
        this.allClasses.splice(index, 1);

        this.gradeList = [];
        this.allClasses.forEach((doc) => {
            if (doc.grade !== null && doc.grade !== undefined) {
                this.gradeList.push(doc.grade);
            }
        });

        const uniq: any = [...new Set(this.gradeList)];
        this.gradeList = uniq.sort((a, b) =>
            a.toString().localeCompare(b.toString(), undefined, { numeric: true })
        );

    }

    addClassroom(classroom, section) {
        const cls = this.allClassesClone.find(
            (doc) => doc.grade == classroom && doc.section == section
        );
        this.allClasses.push(cls);
        this.gradeList = [];
        this.allClasses.forEach((doc) => {
            if (doc.grade !== null && doc.grade !== undefined) {
                this.gradeList.push(doc.grade);
            }
        });

        this.gradeList = [...new Set(this.gradeList)].sort((a, b) =>
            a
                .toString()
                .localeCompare(b.toString(), undefined, { numeric: true })
        );
    }

    removeClassInfo(empIndex: number, formValue) {
        this.infoLoaded = false;
        this.isClassButtonActive = true;
        const gradeTobeDel = this.classInfo()
            .at(empIndex)
            .get('selectedGrade').value;
        const sectionTobeDel = this.classInfo()
            .at(empIndex)
            .get('selectedSection').value;
        this.classInfo().removeAt(empIndex);
        if (Object.keys(formValue.value.classObj).length !== 0) {
            this.allClasses.push(formValue.value.classObj);
        }
        this.gradeList = [];
        this.allClasses.forEach((doc) => {
            if (doc.grade !== null && doc.grade !== undefined) {
                this.gradeList.push(doc.grade);
            }
        });

        const uniq: any = [...new Set(this.gradeList)];
        this.gradeList = uniq.sort((a, b) => a - b);
        if (!this.infoLoaded) {
            this.classInfo().controls.forEach((control, index) => {
                if (!control.value.gradeList.includes(gradeTobeDel)) {
                    control.value.gradeList.push(gradeTobeDel);
                }
                const d = control.value.gradeList;
                this.classInfo().at(index).get('gradeList').setValue(d);
            });
            this.classInfo().controls.forEach((control, index) => {
                if (control.value.selectedGrade == gradeTobeDel) {
                    if (!control.value.sectionList.includes(sectionTobeDel)) {
                        control.value.sectionList.push(sectionTobeDel);
                        this.classInfo()
                            .at(index)
                            .get('sectionList')
                            .setValue(control.value.sectionList);
                    }
                }
            });
        }
        this.checkRemainingGrades();
    }

    checkRemainingGrades() {
        const allSelectedGrades = this.classInfo().controls.map(
            (control) => control.get('selectedGrade')?.value
        );

        const totalAvailableGrades =
            this.classInfo().at(0)?.get('gradeList')?.value || [];
        const remainingGrades = totalAvailableGrades.filter(
            (club) => !allSelectedGrades.includes(club)
        );
        this.isClassButtonActive = remainingGrades.length > 0;
    }

    onSelectCsvFile(event) {
        const check = this.csvValidation(event.target.files[0].name);
        this.studentInputFile = event.target.files[0].name;
        if (check) {
            this.chooseFile(event);
        }
        if (!check) {
            this.uiService.alertMessage(
                'Invalid File Type',
                'Only Accepts CSV File',
                'error'
            );
            this.studentInputFile.nativeElement.value = '';
            this.studentInputFile = '';
        }
    }

    csvValidation(el) {
        const regex = new RegExp('(.*?).(xlsx)$');
        let isCsv = false;
        if (regex.test(el?.toLowerCase())) {
            isCsv = true;
        }
        return isCsv;
    }

    async chooseFile(ev: any) {
        let workBook = null;
        let jsonData = null;
        const reader = new FileReader();
        const file = ev.target.files[0];
        reader.onload = () => {
            const data = reader.result;
            workBook = XLSX.read(data, { type: 'binary' });
            jsonData = workBook.SheetNames.reduce((initial, name) => {
                const sheet = workBook.Sheets[name];
                initial[name] = XLSX.utils.sheet_to_json(sheet);
                return initial[name];
            }, {});
            // remove the sample row
            const sampleIndex = jsonData.findIndex(
                (item) => item?.FirstName === 'John' && item?.LastName === 'Doe'
            );
            jsonData.splice(sampleIndex, 1);
            // remove the blank rows
            jsonData = jsonData.filter((item) => {
                if (
                    item?.FirstName === '' &&
                    item?.LastName === '' &&
                    item?.['Country Code'] === '' &&
                    item?.['Phone Number'] === '' &&
                    item?.['Email(optional)'] === '' &&
                    item?.['Programme Code'] === ''
                ) {
                    return;
                } else {
                    return item;
                }
            });
            this.studentsJson = jsonData;
            if (!jsonData.length) {
                this.uiService.alertMessage(
                    'Empty File',
                    'No Data Inside The File',
                    'warning'
                );
                this.studentFileInputRef.nativeElement.value = '';
                this.studentInputFile = '';
            }
            this.studentFileInputRef.nativeElement.value = '';
        };
        reader.readAsBinaryString(file);
        this.logfileDownload = false;
    }

    downloadTemplate() {
        const allProgrammes = Object.values(this.selectCls?.programmes).map(
            (pObj: any) => ({
                existCls: `${pObj?.programmeName}(${pObj?.programmeCode})`,
            })
        );
        this.exportToExcel(allProgrammes, []);
    }

    async exportToExcel(existingProgrammes, teacherCls) {
        const { countryCode } = await this.getCountryCode(this.classrooms);

        const clsHeader = [
            [`List of Programmes in  ${this.selectCls.classroomName}`],
        ];
        // let message = [[`Note: Please enter multiple programmes code separated by commas`]];
        const message = [
            [
                'Notes:',
                '1. Please enter country code without phone number',
                '2. Please enter phone number without country code',
                '3. Please enter programme code only',
                '4. A sample has been provided for reference',
            ],
        ];
        const messageTransposed = message[0].map((_, colIndex) =>
            message.map((row) => row[colIndex])
        );
        const Heading = [
            [
                'FirstName',
                'LastName',
                'Country Code',
                'Phone Number',
                'Email(optional)',
                'Age',
                'Gender',
                'Programme Code',
            ],
        ];
        // in case a sample is required
        const sample = [
            [
                'John',
                'Doe',
                countryCode.toString(),
                '9876543210',
                'john.doe@example.com',
                '10',
                'Male',
                `${existingProgrammes?.[0]?.existCls
                    ?.match(/\(([\s\S\d]+)\)$/)?.[1]
                    ?.trim()}`,
            ],
        ];
        //Had to create a new workbook and then add the header
        const wb = XLSX.utils.book_new();
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(ws, Heading);

        // add sample to sheet
        XLSX.utils.sheet_add_aoa(ws, sample, { origin: 'A2' });

        //Starting in the second row to avoid overriding and skipping headers
        XLSX.utils.sheet_add_json(ws, teacherCls || [], {
            origin: 'A2',
            skipHeader: true,
        });

        XLSX.utils.sheet_add_aoa(ws, clsHeader, { origin: 'J1' });

        XLSX.utils.sheet_add_json(ws, existingProgrammes || [], {
            origin: 'J2',
            skipHeader: true,
        });

        XLSX.utils.sheet_add_aoa(ws, messageTransposed, {
            origin: `J${existingProgrammes.length + 3}`,
        });

        XLSX.utils.book_append_sheet(wb, ws, 'sampleWB');

        this.convertAllCellsToText(wb, ws);
        XLSX.writeFile(wb, 'students upload template.xlsx', {
            bookType: 'xlsx',
            bookSST: false,
            type: 'binary',
        });
    }

    convertAllCellsToText(wb: any, ws: any) {
        // format all cells as text
        const range = XLSX.utils.decode_range(ws['!ref']);
        // range.s.r + 1 means all except header
        for (let r = range.s.r; r <= range.e.r; r++) {
            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellName = XLSX.utils.encode_cell({ c: c, r: r });
                if (!ws[cellName]) {
                    ws[cellName] = { t: 's', v: '', z: '@' };
                }
                wb.Sheets['sampleWB'][cellName].z = '@';
            }
        }
    }


    async uploadCsvData() {
        this.isActiveloader = true;
        this.uploading = true;
        const filterCsvData = [];

        this.studentsJson.map((u) => {
            if (
                u['Country Code'] !== undefined &&
                u['Phone Number'] !== undefined
            ) {
                const user = {
                    firstName: u?.['FirstName']?.toString()?.trim() || '',
                    lastName: u?.['LastName']?.toString()?.trim() || '',
                    fullNameLowerCase: `${(
                        u?.['FirstName']?.toString()?.trim() || ''
                    )
                        ?.toLowerCase()
                        ?.replace(/ /g, '')}${(
                            u?.['LastName']?.toString()?.trim() || ''
                        )
                            ?.toLowerCase()
                            .replace(/ /g, '')}`,
                    countryCode: u?.['Country Code']?.toString().trim() || '',
                    phoneNumber:
                        u?.['Phone Number']
                            ?.toString()
                            ?.trim()
                            ?.replace(/ /g, '') || '',
                    email: u?.['Email(optional)']?.toString()?.trim() || '',
                    age: u?.['Age']?.toString()?.trim() || '',
                    gender: u?.['Gender']?.toString()?.trim() || '',
                    programmes: u?.['Programme Code']?.toString()?.trim(),
                };
                filterCsvData.push(user);
            }
        });

        const usersArr = await this.getFilterUsers(filterCsvData);
        const invalidatedUsers = usersArr[1];
        const validatedUsers = usersArr[0];

        // Invalid Users
        const invalidUserLogArr = this.getUserLogWithCls(invalidatedUsers);
        this.usersLogArr.push(...invalidUserLogArr);

        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
        // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/users_add_into_classrooms_v2`;

        const processUsers = validatedUsers.map((u) => ({
            isTeacher: false,
            firstName: u.firstName.trim(),
            lastName: u.lastName.trim(),
            fullNameLowerCase: u.fullNameLowerCase.trim(),
            countryCode: u.countryCode,
            phoneNumber: u.phoneNumber,
            email: u.email,
            age: u.age,
            gender: u.gender,
            studentClassrooms: [
                {
                    classroomName: this.selectCls.classroomName,
                    classroomId: this.selectCls.classroomId,
                    institutionName: this.selectCls.institutionName,
                    institutionId: this.selectCls.institutionId,
                    grade: this.selectCls.grade,
                    section: this.selectCls.section,
                    programmes: u.programmes
                        .split(',')
                        .map((pId) =>
                            Object.values(this.selectCls.programmes).find(
                                (pInfo: any) => pInfo.programmeCode == pId
                            )
                        ),
                    type: this.selectCls.type,
                },
            ],
        }));

        // Prepare nominateMeta object
        const nominateMetaObj = {
            firstName: this.currentTeacher.teacherMeta.firstName,
            lastName: this.currentTeacher.teacherMeta.lastName,
            fullNameLowerCase: this.currentTeacher.teacherMeta.fullNameLowerCase,
            countryCode: this.currentTeacher.teacherMeta.countryCode,
            phoneNumber: this.currentTeacher.teacherMeta.phoneNumber,
            email: this.currentTeacher.teacherMeta.email,
            institutionId: this.selectCls.institutionId,
            institutionName: this.selectCls.institutionName,
            linkUid: this.currentTeacher.teacherMeta.uid || '',
            confirm: false
            // Note: Don't add nominationAt here - it will be added by the cloud function
        };

        // Build contestData with nominateMeta added to each contest
        let contestData = undefined;
        if (this.selectedContests) {
            contestData = {
                board: this.selectCls.board
            };

            // Add nominateMeta to each numbered contest
            Object.keys(this.selectedContests).forEach(key => {
                // Skip 'board' and other non-contest keys
                if (!isNaN(Number(key))) {
                    contestData[key] = {
                        ...this.selectedContests[key],
                        nominateMeta: nominateMetaObj  // ← Add nominateMeta to each contest
                    };
                } else if (key !== 'board') {
                    // Preserve other keys (like 'board', 'nominateMeta', etc.)
                    contestData[key] = this.selectedContests[key];
                }
            });
        }

        const formData = {
            usersJsonArr: processUsers,
            isTeacher: false,
            isBulkUpload: true,
            contestData: contestData
        };

        const httpOption: any = {
            responseType: 'json',
        };

        try {
            const response: any = await lastValueFrom(
                this.httpClient
                    .post<any>(endUrl, formData, httpOption)
                    .pipe(first())
            );

            // if (response && response?.length) {
            //     if (!this.isWANotificationsDisabled) {
            //         formData['usersJsonArr'].map((d) => {
            //             const studentInfo = {
            //                 name: `${d['firstName']} ${d['lastName'] || ''}`,
            //                 phone: d.countryCode + d.phoneNumber,
            //                 institutionName: this.selectCls.institutionName,
            //             };
            //             this.sendWaNotifications(studentInfo);
            //             if (!!this.selectedContests) {
            //                 this.sendWaNotificationsContests(studentInfo);
            //             }
            //         });
            //     }

            //     const storedUserLogArr = this.getUserLogWithCls(
            //         validatedUsers,
            //         'Success'
            //     );
            //     this.usersLogArr.push(...storedUserLogArr);

            //     this.uiService.alertMessage(
            //         'Successful',
            //         'Students Added To Classroom Successfully',
            //         'success'
            //     );
            //     this.isActiveloader = false;
            //     this.logfileDownload = true;
            //     this.selectCls = '';
            // } else {
            //     this.uiService.alertMessage(
            //         'Oops',
            //         'Please try again',
            //         'error'
            //     );
            // }

            let isSuccess = false;
            let responseUserArr = [];
            let errorMessage = '';

            if (response) {
                // Check for explicit success indicators
                if (
                    // Success case 1: Has userArr with data (your case)
                    (response.userArr && Array.isArray(response.userArr) && response.userArr.length > 0) ||
                    // Success case 2: Response is array with data
                    (Array.isArray(response) && response.length > 0) ||
                    // Success case 3: Has success flag
                    response.success === true ||
                    // Success case 4: Has success status
                    (response.status && (response.status === 'success' || response.status === 200)) ||
                    // Success case 5: Has progressLogId (indicates processing started successfully)
                    response.progressLogId
                ) {
                    isSuccess = true;
                    responseUserArr = response.userArr || response || [];
                }

                // Check for explicit failure indicators
                else if (
                    // Failure case 1: Explicit success = false
                    response.success === false ||
                    // Failure case 2: Error status codes
                    (response.status && (response.status === 'error' || response.status >= 400)) ||
                    // Failure case 3: Has error field
                    response.error ||
                    // Failure case 4: Has message indicating failure
                    (response.message && (
                        response.message.toLowerCase().includes('error') ||
                        response.message.toLowerCase().includes('failed') ||
                        response.message.toLowerCase().includes('invalid')
                    )) ||
                    // Failure case 5: Empty userArr when expected
                    (response.userArr && Array.isArray(response.userArr) && response.userArr.length === 0)
                ) {
                    isSuccess = false;
                    errorMessage = response.message || response.error || 'Upload failed';
                }

                // Fallback: If response has meaningful content, assume success
                else if (typeof response === 'object' && Object.keys(response).length > 0) {
                    console.warn('Response validation: Assuming success for ambiguous response:', response);
                    isSuccess = true;
                    responseUserArr = response.userArr || response || [];
                } else {
                    isSuccess = false;
                    errorMessage = 'Empty or invalid response received';
                }
            } else {
                isSuccess = false;
                errorMessage = 'No response received from server';
            }

            if (isSuccess && invalidatedUsers.length == 0) {
                if (!this.isWANotificationsDisabled) {
                    formData['usersJsonArr'].map((d) => {
                        const studentInfo = {
                            name: `${d['firstName']} ${d['lastName'] || ''}`,
                            phone: d.countryCode + d.phoneNumber,
                            institutionName: d.studentClassrooms[0].institutionName,
                        };
                        this.sendWaNotifications(studentInfo);

                        // Send contest notifications for each selected contest
                        if (this.selectedContests && this.selectedContests.length > 0) {
                            this.sendWaNotificationsContests(studentInfo, this.selectedContests);
                        }
                    });
                }

                const storedUserLogArr = this.getUserLogWithCls(
                    validatedUsers,
                    'Success'
                );
                this.usersLogArr.push(...storedUserLogArr);

                this.uiService.alertMessage(
                    'Successful',
                    'Students Added To STEM Clubs Successfully',
                    'success'
                );
                this.isActiveloader = false;
                this.logfileDownload = true;
                this.selectCls = Array.isArray(this.selectCls) ? [] : '';
                this.selectedContests = []; // Reset selected contests
            } else if (isSuccess && invalidatedUsers.length > 0) {
                this.uiService.alertMessage(
                    'Upload Failed',
                    'Invalid users, please check the log file',
                    'error'
                );
                this.isActiveloader = false;
                this.logfileDownload = true;
                this.selectCls = Array.isArray(this.selectCls) ? [] : '';
            } else {
                this.uiService.alertMessage(
                    'Oops',
                    'Please try again',
                    'error'
                );
                this.isActiveloader = false;
            }
        } catch (error) {
            console.error('Error Adding Students to Classroom: ', error);
            this.uiService.alertMessage(
                'Error Adding Students to Classroom',
                error,
                'error'
            );
            this.isActiveloader = false;
        }

        this.uploading = false;
    }

    async getFilterUsers(userData) {
        const validatedUsers = [];
        const inValidatedUsers = [];
        const allProgrammes = Object.values(this.selectCls?.programmes)?.map(
            (item: any) => item.programmeCode
        );
        const countryCode = (await this.getCountryCode(this.classrooms))
            .countryCode;
        userData?.map(async (user) => {
            if (user.countryCode !== countryCode) {
                user.status = 'Invalid country code';
                inValidatedUsers.push(user);
            } else if (!allProgrammes.includes(user.programmes)) {
                user.status = 'Invalid program code';
                inValidatedUsers.push(user);
            } else if (user.phoneValidator == false) {
                user.status = 'Invalid phone number';
                inValidatedUsers.push(user);
            } else if (user.email != '' && user.emailValidator == false) {
                user.status = 'Invalid email address';
                inValidatedUsers.push(user);
            } else if (user.age == '') {
                user.status = 'Invalid age';
                inValidatedUsers.push(user);
            } else if (user.gender == '') {
                user.status = 'Invalid gender';
                inValidatedUsers.push(user);
            } else if (user.firstName == '') {
                user.status = 'Invalid First Name ';
                inValidatedUsers.push(user);
            } else if (user.lastName == '') {
                user.status = 'Invalid Last Name';
                inValidatedUsers.push(user);
            } else {
                validatedUsers.push(user);
            }
        });

        const students = await this.studentService.getAllStudent();
        const validateFinalData: any[] = [];
        const seen = new Map();
        const validatedUser: typeof userData = [];
        const studentsPhone = students
            .map((s) => ({ phoneNumber: s.studentMeta?.phoneNumber }))
            .filter((p) => !!p.phoneNumber);

        // console.log(studentsPhone);

        for (const user of validatedUsers) {
            const key = `${user.firstName.toLowerCase()}-${user.lastName.toLowerCase()}-${user.phone
                }`;
            if (seen.has(key)) {
                user.status = 'duplicate data';
                inValidatedUsers.push(user);
            } else {
                seen.set(key, true);
                user.status = 'success';
                validatedUser.push(user);
            }
        }

        // validatedUser.forEach((doc, index) => {
        //     const matchesone = studentsPhone.filter(
        //         (sp) => doc.phoneNumber === sp.phoneNumber
        //     );

        //     console.log(`matchesone + {${index}}`, matchesone);
        //     const matchestwo = validateFinalData.filter(
        //         (sp) => doc.phoneNumber === sp.phoneNumber
        //     );

        //     console.log(`matchestwo + {${index}}`, matchestwo);

        //     if (matchesone.length + matchestwo.length <= 2) {
        //         doc.status = 'success';
        //         validateFinalData.push(doc);
        //     } else {
        //         doc.status =
        //             'more than three people are registered with same number';
        //         inValidatedUsers.push(doc);
        //     }
        //     // console.log('matches', matchesone.length);
        //     // console.log('matches', matchestwo.length);
        //     // console.log('matches', validateFinalData.length);
        // });

        // console.log('matches', validateFinalData);

        // console.log('validatedUser', validatedUser);

        validatedUser.forEach((doc) => {
            doc.status = 'success';
            validateFinalData.push(doc);
        });
        return [validateFinalData, inValidatedUsers];
    }

    getUserLogWithCls(usersArr: any, status?: string) {
        let userLogArr = [];
        userLogArr = usersArr.map((user: any) => ({
            FirstName: user?.firstName || '',
            LastName: user?.lastName || '',
            'Country Code': user?.countryCode || '',
            'Phone Number': user?.phoneNumber || '',
            'Email(optional)': user?.email || '',
            Age: user?.age || '',
            Gender: user?.gender || '',
            'Program Code': user?.programmes || '',
            Status: user?.status || status || '',
        }));
        return userLogArr;
    }

    downloadLogFile() {
        const heading = [
            [
                'FirstName',
                'LastName',
                'Country Code',
                'Phone Number',
                'Email(optional)',
                'Age',
                'Gender',
                'Program Code',
                'Status',
            ],
        ];
        //Had to create a new workbook and then add the header
        const wb = XLSX.utils.book_new();
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
        XLSX.utils.sheet_add_aoa(ws, heading);

        //Starting in the second row to avoid overriding and skipping headers
        XLSX.utils.sheet_add_json(ws, this.usersLogArr || [], {
            origin: 'A2',
            skipHeader: true,
        });

        XLSX.utils.book_append_sheet(wb, ws, 'sampleWB');

        this.convertAllCellsToText(wb, ws);

        XLSX.writeFile(wb, 'LogFile.xlsx', {
            bookType: 'xlsx',
            bookSST: false,
            type: 'binary',
        });
    }

    addIntoNewClassroom(clsIdsArr) {
        const filterCls = this.filterNewSelectedCls(clsIdsArr);
        this.userForm.patchValue({
            classroom: [...filterCls],
        });
    }

    filterNewSelectedCls(allSelectedClsIdsArr) {
        const newClsSelected = this.allClsRooms.filter(
            (cls) =>
                allSelectedClsIdsArr.includes(cls.classroomId) &&
                cls.isRegistered != true
        );
        return newClsSelected;
    }

    async getAutoFieldsUserInfo(studentInfo, isAutocalled) {
        if (!isAutocalled) {
            this.isProfileAutoSelected = true;
            this.isUserTobeCreated = false;
        } else {
            this.isUserTobeCreated = false;
        }
        this.showEmailDiv = true;
        this.isClassButtonActive = true;
        this.clearFormArray();
        const checkUserInfo = studentInfo;
        let classArr = [];
        classArr = Object.values(checkUserInfo.classrooms).filter(
            (classroom: any) => classroom.type == 'CLASSROOM'
        );
        let userInfo;
        userInfo = checkUserInfo || {};
        this.userForm.patchValue({
            fName: userInfo?.studentMeta.firstName || '',
            lName: userInfo?.studentMeta.lastName || '',
            email: userInfo?.studentMeta.email || '',
            age: userInfo?.studentMeta.age || 0,
            gender: userInfo?.studentMeta.gender || '',
            isEmailAutoField:
                userInfo?.studentMeta.email &&
                    userInfo?.studentMeta.email !== ''
                    ? true
                    : false,
            isFNameAutoField:
                userInfo?.studentMeta.firstName &&
                    userInfo?.studentMeta.firstName !== ''
                    ? true
                    : false,
            isLNameAutoField:
                userInfo?.studentMeta.lastName &&
                    userInfo?.studentMeta.lastName !== ''
                    ? true
                    : false,
            isAgeAutoField: userInfo?.studentMeta.age > 0 ? true : false,
            isGradeAutoField: userInfo?.studentMeta.grade !== '' ? true : false,
            isGenderAutoField:
                userInfo?.studentMeta.gender &&
                    userInfo?.studentMeta.gender !== ''
                    ? true
                    : false,
        });
        this.userForm.get('email').disable();
        this.userForm.get('fName').disable();
        this.userForm.get('lName').disable();
        const hasAge = (userInfo?.studentMeta.age || 0) > 0;
        const hasGender = !!(
            userInfo?.studentMeta.gender && userInfo?.studentMeta.gender !== ''
        );
        hasAge
            ? this.userForm.get('age').disable()
            : this.userForm.get('age').enable();
        hasGender
            ? this.userForm.get('gender').disable()
            : this.userForm.get('gender').enable();

        const userRegisteredCls: string[] =
            Object.keys(checkUserInfo?.classrooms || {}) || [];
        this.allClsRooms.filter((cls) => {
            if (userRegisteredCls.includes(cls.classroomId)) {
                cls.isRegistered = true;
            } else {
                cls.isRegistered = false;
            }
        });
        if (userRegisteredCls.length) {
            this.registeredClsIds = userRegisteredCls;
        } else {
            this.registeredClsIds = this.selectedClsIds;
            this.addIntoNewClassroom(this.registeredClsIds);
        }

        // Extract all contest IDs from the contests object
        const studentContestIds: string[] = [];
        const contestsData = checkUserInfo?.contests || {};

        // New structure: contests is an object where keys are contest IDs
        // Each contest has a 'classrooms' object containing classroom details
        studentContestIds.push(...Object.keys(contestsData));

        if (classArr.length) {
            this.setClassroomsFormArray(classArr, studentContestIds);
        }
        if (this.allClasses?.length === 0) {
            this.isClassButtonActive = false;
        } else {
            this.isClassButtonActive = true;
        }
    }

    setClassroomsFormArray(classArray, studentContestIds: string[] = []) {
        if (classArray.length) {
            for (const clsObj of classArray) {
                if (clsObj?.programmes?.length) {
                    const cls = this.allClassesClone.find(
                        (doc) => doc.classroomId == clsObj.classroomId
                    );
                    if (cls) {
                        // Get the contests that are already registered for THIS specific classroom
                        const contestsData = this.userForm.get('profile')?.value?.contests || {};
                        let registeredContests = [];

                        // New structure: Loop through all contests and check if current classroom exists
                        Object.keys(contestsData).forEach(contestId => {
                            const contestClassrooms = contestsData[contestId]?.classrooms || {};
                            // Check if this classroom ID exists in the contest's classrooms
                            if (contestClassrooms[clsObj.classroomId]) {
                                // Find the full contest object from finalContestsLst
                                const contest = this.finalContestsLst.find(c => c.docId === contestId);
                                if (contest) {
                                    registeredContests.push(contest);
                                }
                            }
                        });

                        // Filter out contests that student is already registered for (excluding current classroom's contests)
                        const availableContests = this.finalContestsLst.filter(contest => {
                            const isRegisteredAnywhere = studentContestIds.includes(contest.docId);
                            const isRegisteredInThisClassroom = contestsData[contest.docId]?.classrooms?.[clsObj.classroomId];
                            // Show if not registered anywhere OR if registered in this specific classroom
                            return !isRegisteredAnywhere || isRegisteredInThisClassroom;
                        });

                        const rollNumber = clsObj?.rollNumber || '';
                        cls.rollNumber = rollNumber; // or attach to infoObj

                        this.addNewClassInfo(
                            cls,
                            clsObj.programmes,
                            true,
                            availableContests,  // Pass contests list that includes both available and registered for this classroom
                            registeredContests  // Pass registered contests to patch
                        );
                    }
                }
            }
        }
    }

    // addNewClassInfo(classObj, programmesArray, infoLoaded?) {
    //     const sectionArr = [];

    //     this.allClasses.forEach((doc) => {
    //         if (doc.grade == classObj.grade) {
    //             sectionArr.push(doc.section);
    //         }
    //     });
    //     const uniqSec: any = [...new Set(sectionArr)];
    //     const sortedSections = uniqSec.sort((a, b) => a.localeCompare(b));

    //     const infoObj = {
    //         gradeList: this.gradeList,
    //         selectedGrade: classObj.grade,
    //         sectionList: sortedSections,
    //         selectedSection: classObj.section,
    //         programmesList: Object.values(classObj.programmes),
    //         selectedProgrammes: programmesArray,
    //         classObj: classObj,
    //     };
    //     this.classroomTobeFitlerd.push(infoObj);

    //     this.addClassInfo(infoObj, infoLoaded);
    // }


    checkSectionsinRegisterdClasses(e) {
        const sectionsforRegisterdclass = [];
        this.classroomTobeFitlerd.forEach((elem) => {
            if (elem.selectedGrade == e.selectedGrade) {
                sectionsforRegisterdclass.push(elem.selectedSection);
            }
        });
        return sectionsforRegisterdclass;
    }

    // Computed disabled state for Submit button
    get isSubmitDisabled(): boolean {
        if (!this.userForm) {
            return true;
        }

        const formInvalid = this.userForm.invalid;

        // Require at least one classroom added
        const classArr = this.classInfo();
        const noClassAdded = !classArr || classArr.length === 0;

        // Require at least one programme selected in any class
        const hasProgrammeSelected = !!classArr?.controls?.some((ctrl) => {
            const programs = ctrl.get('selectedProgrammes')?.value;
            return Array.isArray(programs) && programs.length > 0;
        });
        // const isContestRegistrationRequired =
        //     this.isContestRegistrationRequired && !this.selectContest;

        const isContestRegistrationRequired =
            this.isContestRegistrationRequired && !this.selectedContests;
        return (
            formInvalid ||
            noClassAdded ||
            !hasProgrammeSelected ||
            isContestRegistrationRequired
        );
    }

    async onSubmit(form: any) {
        const formValue = form.getRawValue();
        this.classroomTobeFitlerd = [];
        this.loading = true;
        this.processClassrooms(form.getRawValue());

    }

    getFilterClssroom(clsArr, isRegistered) {
        const filterClsArr = clsArr?.map((classroom) =>
            Object.assign(classroom, { isRegistered: isRegistered })
        );
        return filterClsArr;
    }

    async sendWaNotifications(student: any) {
        const phoneNumber = student?.phone;
        const templateName =
            environment.whatsAppTemplates.studentClassroomAddition.templateName;
        const headerImage =
            environment.whatsAppTemplates.studentClassroomAddition.headerImage;
        const mediaType = 'text';
        const params = [
            student.name,
            student.institutionName
                ? student.institutionName
                : this.userForm.get('classInfo').value?.[0]?.classObj
                    ?.institutionName,
        ];
        const urlRoute = undefined;

        this.sharedService.sendWhatsAppNotification(
            phoneNumber,
            templateName,
            params,
            headerImage,
            mediaType,
            urlRoute
        );
    }


    async sendWaNotificationsContests(student: any, contests?: any[]) {
        const phone = student?.phone;
        const templateName = environment.whatsAppTemplates.contestRegistrationConfirmationForStudent.templateName;
        const headerImage = environment.whatsAppTemplates.contestRegistrationConfirmationForStudent.headerImage;
        const mediaType = 'image';
        const fullName = student.name;

        // Get contests from parameter or form array
        let allContests = [];

        if (contests && contests.length > 0) {
            // Use passed contests (for bulk upload)
            allContests = contests;
        } else {
            // Get contests from form array (for single student add)
            const classInfoArray = this.classInfo();
            for (let i = 0; i < classInfoArray.length; i++) {
                const selectedContests = classInfoArray.at(i).get('selectedContests')?.value;
                if (selectedContests && selectedContests.length > 0) {
                    allContests.push(...selectedContests);
                }
            }
        }

        // Send notification for each unique contest
        const uniqueContests = allContests.filter((contest, index, self) =>
            index === self.findIndex(c => c.docId === contest.docId)
        );

        for (const contest of uniqueContests) {
            const contestName = contest.contestTitle;
            const stageName = contest.stagesNames[0].stageName;
            const site = new URL(contest.domain).host;
            const startDate = contest.stagesNames[0].startDate.toDate().toLocaleDateString('en-GB');
            const endDate = contest.stagesNames[0].endDate.toDate().toLocaleDateString('en-GB');
            const team = 'Raman Awards';

            const params = [
                fullName,
                contestName,
                stageName,
                contestName,
                stageName,
                'have opened',
                startDate,
                endDate,
                site,
                'begin',
                endDate,
                team,
            ];
            const urlRoute = undefined;

            await this.sharedService.sendWhatsAppNotification(
                phone,
                templateName,
                params,
                headerImage,
                mediaType,
                urlRoute
            );
        }
    }

    bulkUploadEnable(value) {
        this.isBulkUpload = value.checked;
    }


    // A. Null-safe compareWith
    attributeDisplay = (a: any, b: any): boolean => {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;

        const aid = typeof a === 'string' ? a : a.programmeId;
        const bid = typeof b === 'string' ? b : b.programmeId;

        return !!aid && !!bid && aid === bid;
    };


    async getCountryCode(classrooms: any) {
        const internationalBoards = this.configurationService
            .getInternationalBoardList()
            .pipe(first());
        const selectedCountry = this.country;
        const countryName =
            selectedCountry?.[0]?.toUpperCase() + selectedCountry?.slice(1);
        const countryCodes = this.configurationService
            .getCountryCodesList()
            .pipe(first());
        const codesList = await lastValueFrom(countryCodes);
        const countryCode = codesList?.countryCodes?.[selectedCountry]?.phone;
        return { countryCode, countryName };
    }

    async findMatchingCountry(boards: any, classroomBoard: string) {
        for (const key in boards) {
            if (boards[key].map((x) => x.code).includes(classroomBoard)) {
                return key;
            }
        }
    }


    async getBasicStudentInfo(inputPhone: string) {
        this.userForm.get('email').reset();
        this.userForm.get('lName').reset();
        this.userForm.get('fName').reset();
        this.userForm.get('age').reset();
        this.userForm.get('gender').reset();
        this.userForm.get('classInfo').reset();

        this.showEmailDiv = false;
        if (this.userForm.get('phone').invalid) {
            this.isActive = false;
        } else {
            this.isActive = true;
        }

        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('studentMeta.phoneNumber', '==', inputPhone);
        this.studentArr = await lastValueFrom(
            await this.studentService.getDocWithQuery(query)
        );
        if (this.studentArr.length == 1) {
            this.multipleStudents = true;
            this.showEmailDiv = false;
            this.isUserTobeCreated = false;
        }
        if (this.studentArr.length == 0) {
            this.multipleStudents = true;
        }
        if (this.studentArr.length > 1) {
            this.multipleStudents = true;
            this.showEmailDiv = false;
            this.isUserTobeCreated = false;
        }
    }

    clearFormArray() {
        const formArray = this.userForm?.get('classInfo') as FormArray;
        while (formArray.length !== 0) {
            formArray.removeAt(0);
        }
    }

    createClassroom() {
        this.showEmailDiv = true;
        this.isClassButtonActive = true;
        this.multipleStudents = false;
        this.showEmailDiv = true;
        this.isProfileAutoSelected = true;

        this.isUserTobeCreated = true;
        this.userForm.get('fName').enable();
        this.userForm.get('lName').enable();
        this.userForm.patchValue({
            email: '',
            fName: '',
            lName: '',
            age: 0,
            gender: '',
            classInfo: [],
            isEmailAutoField: false,
            isFNameAutoField: false,
            isLNameAutoField: false,
            isAgeAutoField: false,
            isGradeAutoField: false,
        });
        this.clearFormArray();
    }

    uploadFile(event) {
        this.filename = event.target.files[0].name;
    }

    getType(field: any) {
        return typeof field;
    }

    sortContestsByStartDate(contests: any[]): any[] {
        return contests.sort((a, b) => {
            const aStartDate = a.contestStartDate?.seconds || 0;
            const bStartDate = b.contestStartDate?.seconds || 0;
            return bStartDate - aStartDate;
        });
    }


    // Add this enhanced debugging version of isAddClassroomEnabledSimple
    isAddClassroomEnabledSimple(): boolean {

        if (!this.userForm || !this.isClassButtonActive) {
            return false;
        }

        // Check if basic required personal fields are filled
        const fName = this.userForm.get('fName')?.value?.trim();
        const lName = this.userForm.get('lName')?.value?.trim();
        const phone = this.userForm.get('phone')?.value?.trim();
        const age = this.userForm.get('age')?.value;
        const gender = this.userForm.get('gender')?.value;

        if (!fName || !lName || !phone || age < 0 || !gender) {
            return false;
        }

        const classInfoArray = this.classInfo();
        if (!classInfoArray) {
            return false;
        }

        // If no classrooms added yet, allow adding the first one
        if (classInfoArray.length === 0) {
            return true;
        }

        // Check if current classrooms are properly filled
        for (let i = 0; i < classInfoArray.controls.length; i++) {
            const control = classInfoArray.controls[i];
            const grade = control.get('selectedGrade')?.value;
            const section = control.get('selectedSection')?.value;
            const programmes = control.get('selectedProgrammes')?.value;
            const rollNumber = control.get('rollNumber')?.value;

            if (!grade || !section || !programmes || !programmes.length || !rollNumber) {
                return false;
            }
        }

        return true;
    }

    getToolTipText(index) {
        const itemsToBeDisplayed = [];
        this.classInfo()?.at(index).get('selectedProgrammes')?.value.forEach((programme) => {
            itemsToBeDisplayed.push(programme?.programmeName)
        });
        return itemsToBeDisplayed.join(', ');
    }

    getToolTipTextForContests(index) {
        const itemsToBeDisplay = [];
        this.classInfo()?.at(index).get('selectedContests')?.value.forEach((contest) => {
            itemsToBeDisplay.push(contest?.contestTitle)
        });
        return itemsToBeDisplay.join(', ');
    }

    contestCompare = (a: any, b: any): boolean => {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return (a.docId || a.id) === (b.docId || b.id);
    };

    private normalizeRollNo(val: any): string {
        if (val === null || val === undefined) return '';
        return String(val).trim();
    }

    private buildRollSet(studentsDocs: any[], classroomId: string): Set<string> {
        const set = new Set<string>();
        (studentsDocs || []).forEach((st) => {
            const rn = this.normalizeRollNo(st?.classrooms?.[classroomId]?.rollNumber);
            if (rn) set.add(rn);
        });
        return set;
    }

    private applyRollNumberValidator(rowIndex: number, cls: any, studentsDocs: any[]) {
        const row = this.classInfo().at(rowIndex) as FormGroup;
        const rollCtrl = row.get('rollNumber');
        if (!rollCtrl) return;

        const institutionId = this.instititutionSubRef?.value;
        const classroomId = cls?.classroomId;
        if (!institutionId || !classroomId) return;

        const cacheKey = `${institutionId}__${classroomId}`;
        const rollSet = this.buildRollSet(studentsDocs, classroomId);
        this.rollNoCache.set(cacheKey, rollSet);

        // Remove old subscription for this row
        this.rollNoSubs.get(rowIndex)?.unsubscribe();

        // ✅ Custom validator: duplicate roll in THIS classroom
        const duplicateRollValidator = (control: any) => {
            const v = this.normalizeRollNo(control.value);
            if (!v) return null;

            // allow if user is editing existing profile and rollNo unchanged for same classroom
            const selectedProfile = this.userForm.get('profile')?.value;
            const currentStudentId = selectedProfile?.docId || selectedProfile?.id;

            // If current profile already has same rollNumber in this classroom, don't flag it
            if (currentStudentId && selectedProfile?.classrooms?.[classroomId]?.rollNumber) {
                const existing = this.normalizeRollNo(selectedProfile.classrooms[classroomId].rollNumber);
                if (existing === v) return null;
            }

            const set = this.rollNoCache.get(cacheKey);
            return set?.has(v) ? { rollNoTaken: true } : null;
        };

        // ✅ Attach validator (keep required)
        rollCtrl.setValidators([Validators.required, duplicateRollValidator]);
        rollCtrl.updateValueAndValidity({ emitEvent: false });

        // ✅ Update live as user types (optional but good UX)
        const sub = rollCtrl.valueChanges.subscribe(() => {
            rollCtrl.updateValueAndValidity({ emitEvent: false });
        });
        this.rollNoSubs.set(rowIndex, sub);
    }


    async uploadMasterSheet() {
        const classroomsArr = await firstValueFrom(this.classroomService.getAllClassroomByInstitute(this.instititutionSubRef?.value));
        this.dilaog.open(AddMasterSheetStudentsComponent, {
            data: {
                institutionId: this.instititutionSubRef?.value,
                classrooms: classroomsArr,
            },

        })
    }
}
