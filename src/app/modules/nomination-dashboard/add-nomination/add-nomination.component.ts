import { Component, OnInit, Inject } from '@angular/core';
import { serverTimestamp } from '@angular/fire/firestore';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { first, firstValueFrom, lastValueFrom, take } from 'rxjs';
import { AngularFirestore, QueryFn, CollectionReference } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UiService } from 'app/shared/ui.service';
import { HttpClient } from '@angular/common/http';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { RamanAwardService } from 'app/core/dbOperations/ramanAward2023/ramanAward.service';
import { User } from 'app/core/dbOperations/user/user.types';
import { ActivatedRoute } from '@angular/router';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { selfNominationValidator } from 'app/core/dbOperations/ramanAward2023/self-nomination.directive';
import { FloatLabelType } from '@angular/material/form-field';
import { environment } from 'environments/environment';
import { UserService } from 'app/core/dbOperations/user/user.service';
import phone from 'phone';
import { SharedService } from 'app/shared/shared.service';
import { ContestNominationsService } from 'app/core/dbOperations/contestNominations/contestNominations.service';

@Component({
    selector: 'app-add-nomination',
    templateUrl: './add-nomination.component.html',
    styleUrls: ['./add-nomination.component.scss']
})
export class AddNominationComponent implements OnInit {

    studentMetaArray: Array<User>;
    studentMeta: User;
    limitPhoneValueChanges: boolean = false;
    selfNomination: boolean = false;
    selfNominationError: string = 'Please enter the number of the student or of the student\'s parent.';
    duplicateNameError: string = 'You have already nominated this student.';
    moreThanTwoError: string = 'You can nominate only two students with the same number.';
    allAcceptPhone: Array<string> = ['firstName', 'lastName', 'email', 'gender', 'age'];
    allAcceptAgeNGen: Array<string> = ['firstName', 'lastName', 'email'];
    ageNGen: Array<string> = ['gender', 'age'];
    allAcceptFNameAndLName: Array<string> = ['email', 'gender', 'age', 'phoneNumber'];
    stageInfo: any;
    isDuplicateName: boolean = false;
    isMoreThanTwo: boolean = false;
    // , 'grade'
    hide: boolean = true;
    user;
    clsInfo: any = { classrooms: {} };
    loginSpinner = false;

    genderList = ['Male', 'Female', 'Other'];
    // gradeList: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    teacherCountryCode: string;
    teacherPhoneNumber: string;
    infoForm: FormGroup;
    currentContest: any;
    multipleStudents = false;

    constructor(
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any,
        protected afs: AngularFirestore,
        private afAuth: AngularFireAuth,
        private classroomService: ClassroomsService,
        private studentService: StudentsService,
        private uiService: UiService,
        private httpClient: HttpClient,
        private teacherService: TeacherService,
        private ramanAwardService: RamanAwardService,
        public dialog: MatDialog,
        private dialogRef: MatDialogRef<AddNominationComponent>,
        private activateRoute: ActivatedRoute,
        private contestService: ContestService,
        private userService: UserService,
        private sharedService: SharedService,
        private contestNominationsService: ContestNominationsService
    ) {
        this.infoForm = this.fb.group({
            firstName: [{ value: this.data?.studentInfo?.studentMeta?.firstName || '', disabled: false }, Validators.required],
            lastName: [{ value: this.data?.studentInfo?.studentMeta?.lastName || '', disabled: false }, Validators.required],
            email: [{ value: this.data?.studentInfo?.studentMeta?.email || '', disabled: false }, [Validators.required, Validators.email]],
            countryCode: [{ value: this.data?.studentInfo?.studentMeta?.countryCode || '', disabled: this.data?.studentInfo?.studentMeta?.countryCode ? true : false }],
            phoneNumber: [{ value: this.data?.studentInfo?.studentMeta?.phoneNumber || '', disabled: this.data?.studentInfo?.studentMeta?.phoneNumber ? true : false }, [Validators.required, Validators.pattern('^[0-9]{10}$')]],
            gender: [{ value: this.data?.studentInfo?.studentMeta?.gender || '', disabled: false }, Validators.required],
            age: [{ value: this.data?.studentInfo?.studentMeta?.age || '', disabled: false }, Validators.required],
            grade: [{ value: this.data?.studentInfo?.studentMeta?.grade || this?.data?.grade, disabled: true }],

        });
        this.infoForm.get('phoneNumber').valueChanges.subscribe(async (res: any) => {
            if (res) {
                if (this.teacherPhoneNumber === res) {
                    if (this.data?.institutionInfo?.typeofSchool == 'Private Residential School' || this.data?.institutionInfo?.typeofSchool == 'Government Residential School') {
                        this.selfNomination = false;
                        this.allAcceptPhone.map(item => this.enableAllFields(item));
                    } else {
                        this.selfNomination = true;
                        this.allAcceptPhone.map(item => this.disableAllFields(item));
                        this.infoForm.get('phoneNumber').addValidators(selfNominationValidator(res));
                    }
                } else {
                    this.selfNomination = false;
                    this.allAcceptPhone.map(item => this.enableAllFields(item));
                };
                // disable all fields except phone
                // this.infoForm.get('grade').disable();
                if (res.length == 10 && !this.limitPhoneValueChanges && !this.selfNomination) {
                    this.checkInContestCollection(res);
                    this.limitPhoneValueChanges = true; // stop the valueChanges from repeatedly evaluating res.length == 10
                }

                if (res.length == 9 || res.length == 0) {
                    this.allAcceptPhone.map(item => this.resetAllFields(item)); // reset all fields except phone
                    this.limitPhoneValueChanges = false; // start the valueChanges so it can evaluate res.length == 10 the first time
                }
            }
            else {
                this.allAcceptPhone.map(item => this.enableAllFields(item)); // enable all fields except phone

                // this.selfNomination = false;
            }
        });
    }

    async ngOnInit(): Promise<void> {
        this.contestNominationsService.setContestId(this.data.contestInfo.docId);
        this.user = await this.afAuth.authState.pipe(first()).toPromise();
        const { countryCode, phoneNumber } = await this.userService.getPhone();

        this.teacherCountryCode = countryCode;
        this.teacherPhoneNumber = phoneNumber;
        this.currentContest = await this.getContest();
        this.getStageData();
    }

    getContest() {
        return new Promise((resolve, reject) => {
            this.contestService.currentContest.subscribe((d) => {
                resolve(d);

            });
        });
    }

    private resetAllFields(field: string) {
        this.infoForm.get(field).reset();
    }

    private disableAllFields(field: string) {
        this.infoForm.get(field).disable();
    }

    private enableAllFields(field: string) {
        this.infoForm.get(field).enable();
    }

    async checkInStudentCollection(phoneNumber) {
        const query: QueryFn = (ref: CollectionReference) => ref.where('studentMeta.countryCode', '==', this.teacherCountryCode).where('studentMeta.phoneNumber', '==', phoneNumber);
        const studentDocsArr = lastValueFrom(await this.studentService.getDocWithQuery(query));
        studentDocsArr.then(async (res) => {
            this.allAcceptPhone.map(item => this.disableAllFields(item));
            this.multipleStudents = false;
            if (res.length) {

                this.filterStudents(res, phoneNumber);
                const query: QueryFn = (ref: CollectionReference) => ref.where('studentMeta.countryCode', '==', this.teacherCountryCode).where('studentMeta.phoneNumber', '==', phoneNumber);

                this.contestNominationsService.getQueryWithGet(query).subscribe((students) => {

                    const stage2Students = students.docs
                        .filter(d => d.data().hasOwnProperty('nominateMeta'))
                        .map(d => d.data().docId);

                    this.studentMetaArray = this.filterStudents(res, stage2Students);
                    this.multipleStudents = true;
                    this.allAcceptPhone.map(item => this.disableAllFields(item));
                    if (!this.studentMetaArray.length) {
                        this.multipleStudents = false;
                        this.allAcceptPhone.map(item => this.enableAllFields(item));
                    }
                });


            }

            else {
                this.allAcceptPhone.map(item => this.enableAllFields(item));
            }
            // if (res.length == 1) {
            //     this.studentMeta = res;
            //     this.infoForm.patchValue({
            //         firstName: res[0].studentMeta?.firstName,
            //         lastName: res[0].studentMeta?.lastName,
            //         email: res[0].studentMeta?.email,
            //         countryCode: res[0].studentMeta?.countryCode,
            //         phoneNumber: res[0].studentMeta?.phoneNumber
            //     });
            //     this.allAcceptPhone.map(item => this.disableAllFields(item));
            // }
        });
    }

    fillForm(event) {
        const studentInfo = event.value;
        this.infoForm.patchValue({
            firstName: studentInfo.studentMeta?.firstName,
            lastName: studentInfo.studentMeta?.lastName,
            email: studentInfo.studentMeta?.email,
            countryCode: studentInfo?.studentMeta?.countryCode,
        });
        this.data = { ...this.data, newStudent: false, studentInfo: { docId: studentInfo.docId }, existingUnlabStudent: true };
        this.allAcceptAgeNGen.map(item => this.disableAllFields(item));
        this.ageNGen.map(item => this.enableAllFields(item));
    }

    filterStudents(allStudentArr, studentDocIdsArrInRaman) {
        // const exclusionSet = new Set(studentDocIdsArrInRaman);
        // return allStudentArr.filter(entry => !exclusionSet.has(entry.docId));

        return allStudentArr.map((studentObj) => {
            if (studentDocIdsArrInRaman.includes(studentObj.docId)) {
                return {
                    ...studentObj,
                    registeredInRa: true
                };
            }
            else {
                return {
                    ...studentObj,
                    registeredInRa: false
                };
            }
        });
    }

    async onSubmit(form) {
        this.loginSpinner = true;
        if (this.data?.newStudent) {
            // const fullNameLowerCase = `${form.value.firstName.toLowerCase().replace(/ /g, '')}${form.value.lastName.toLowerCase().replace(/ /g, '')}`
            const id = this.afs.createId();

            // this.addStudentToUnlabAndContest(form.getRawValue(), id).then(res => {
            //     setTimeout(async () => {
            //         this.updateNominationNumber()
            //         // await this.sendWaToTeacher(form.getRawValue())
            //         // await this.sendWAToStudent(form.getRawValue())
            //         this.uiService.alertMessage('Successful', 'Student Nominated Successfully', 'success')
            //         this.dialog.closeAll()

            //     }, 1000);
            // }).catch(err => console.error(err))

            try {
                const a = await this.addStudentToUnlabAndContest(form.getRawValue(), id);

                setTimeout(async () => {
                    try {
                        await this.updateNominationNumber();
                        // await this.sendWaToTeacher(form.getRawValue());
                        // await this.sendWAToStudent(form.getRawValue());
                        this.uiService.alertMessage('Successful', 'Student Nominated Successfully', 'success');
                        this.dialog.closeAll();
                    } catch (innerErr) {
                        console.error('Error during post-nomination actions:', innerErr);
                    }
                }, 1000);

            } catch (err) {
                this.uiService.alertMessage('Error', 'Error during submission', 'error');
                console.error('Error during nomination:', err);
            }
        }

        if (this.data?.existingUnlabStudent) {

            this.setInContestDb(form.getRawValue(), this.data.studentInfo.docId).then((res) => {
                setTimeout(async () => {
                    this.updateNominationNumber();

                    // await this.sendWaToTeacher(form.getRawValue())
                    // await this.sendWAToStudent(form.getRawValue())

                    this.uiService.alertMessage('Successful', 'Student Nominated Successfully', 'success');
                    this.dialog.closeAll();

                }, 1000);
            }).catch(err => console.error(err));
        }
        if (!this.data?.newStudent) {

            this.updateInContestDb(form.value).then(() => {
                this.uiService.alertMessage('Successful', 'Student Updated Successfully', 'success');
                this.dialogRef.close({ data: form.value });
            });
        }

    }

    getStageData() {
        const contestId = this.activateRoute.snapshot.queryParams.contestId;
        const stageId = this.activateRoute.snapshot.queryParams.stageId;
        this.contestService.get(contestId).pipe(take(1)).subscribe((res) => {
            if (res) {
                this.stageInfo = res.stagesNames.find(sDoc => sDoc.stageId === stageId);
            }
        });
    }

    // sendWaToTeacher(studentInfo) {
    //     const date = this.secondsToDate(this.stageInfo.startDate.seconds);
    //     const teacherDoc = this.teacherService.currentTeacher.value;
    //     const s = studentInfo;
    //     const contest = this.data.collName == 'RamanAward2024' ? 'Raman Award 2024' : 'Raman Award 2023';
    //     const phoneNumber = teacherDoc?.teacherMeta?.countryCode + teacherDoc?.teacherMeta?.phoneNumber;
    //     const templateName = environment.whatsAppTemplates.nominationAlertTeacher.templateName;
    //     const headerImage = environment.whatsAppTemplates.nominationAlertTeacher.headerImage;
    //     const mediaType = "image";
    //     const params = [
    //         teacherDoc?.teacherMeta?.firstName?.trim() + ' ' + teacherDoc?.teacherMeta?.lastName?.trim(),
    //         contest,
    //         'Stage 2',
    //         s?.firstName?.trim() + ' ' + s?.lastName?.trim(),
    //         s?.grade,
    //         s?.gender,
    //         s?.phoneNumber,
    //         s?.email,
    //         date,
    //         'register.ramanaward.org'
    //     ];
    //     const urlRoute = undefined;
    //     this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);
    // }

    // sendWAToStudent(studentInfo) {
    //     const date = this.secondsToDate(this.stageInfo.startDate.seconds);
    //     const s = studentInfo;
    //     const contest = this.data.collName == 'RamanAward2024' ? 'Raman Award 2024' : 'Raman Award 2023';
    //     const phoneNumber = this.teacherCountryCode + s?.phoneNumber;
    //     const templateName = environment.whatsAppTemplates.nominationAlertStudent.templateName;
    //     const headerImage = environment.whatsAppTemplates.nominationAlertStudent.headerImage;
    //     const mediaType = "image";
    //     const params = [
    //         s?.firstName.trim() + ' ' + s?.lastName.trim(),
    //         'Stage 2',
    //         contest,
    //         date,
    //         'register.ramanaward.org',
    //     ];
    //     const urlRoute = undefined;
    //     this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);
    // }

    async welcomeGreetingWANotificationFirstTimeLanding() {
        const student = {
            phone: `${this.teacherCountryCode}${this.infoForm.getRawValue()?.phoneNumber}`,
            name: `${this.infoForm.getRawValue()?.firstName} ${this.infoForm.getRawValue()?.lastName}`
        };
        const phoneNumber = student?.phone;
        const templateName = environment.whatsAppTemplates.firstTimeGreetingUnlab.templateName;
        const headerImage = environment.whatsAppTemplates.firstTimeGreetingUnlab.headerImage;
        const mediaType = 'image';
        const params = [
            student?.name
        ];
        const urlRoute = undefined;

        this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);
    }

    async addStudentToUnlabAndContest(formValue, docId) {
        const stageVariables = this.data.contestInfo.stagesNames.reduce((result, stage, index) => {
            result[`stage_${stage.stageId}_nominated`] = stage.stageId == this.activateRoute.snapshot.queryParams.stageId ? true : false;
            return result;
        }, {});
        const programmeId = environment.defaultProgrammeIds[formValue.grade];

        const query: QueryFn = (ref: CollectionReference) => ref
            .where('grade', '==', Number(formValue.grade))
            .where('section', '==', 'A')
            .where(`programmes.${programmeId}.programmeId`, '==', programmeId)
            .where('institutionId', '==', environment.defaultInstitutionId);
        const docArr = await firstValueFrom(await this.classroomService.getWithQuery(query));

        let demoProgramme;


        const pr: any = Object.values(docArr[0].programmes);
        const defaultProgrammeIds = Object.values(environment.defaultProgrammeIds);
        pr.forEach((p) => {
            if (defaultProgrammeIds.includes(p.programmeId)) {
                demoProgramme = p;
            }
        });


        this.clsInfo = docArr[0];
        const clsInfo = docArr[0];
        const contestId = this.data.contestInfo.docId;
        const userDetailsWithClassroom = {
            contestCollectionName: `Contest_${contestId}`,
            stageVariables,
            institutionInfo: {
                board: this.data?.institutionInfo?.board,
                institutionId: this.data?.institutionInfo?.institutionId,
                institutionName: this.data?.institutionInfo?.institutionName,
            },
            teacherDoc: this.teacherService.currentTeacher.value,
            isBulkUpload: false,
            docId: docId,
            isTeacher: false,
            firstName: formValue.firstName,
            lastName: formValue.lastName,
            grade: formValue?.grade,
            gender: formValue?.gender,
            age: formValue?.age,
            countryCode: '+91',
            phoneNumber: formValue.phoneNumber.slice(-10),
            fullNameLowerCase: formValue.firstName.toLowerCase().replace(/ /g, '') + formValue.lastName.toLowerCase().replace(/ /g, ''),
            phone: this.teacherCountryCode + formValue.phoneNumber.slice(-10),
            email: formValue.email,
            studentClassrooms: [
                {
                    classroomId: clsInfo?.classroomId,
                    classroomName: clsInfo?.classroomName,
                    institutionId: clsInfo?.institutionId,
                    institutionName: clsInfo?.institutionName,
                    grade: clsInfo.grade,
                    section: clsInfo.section,
                    programmes: [demoProgramme]
                }
            ],
        };

        const a = await this.addUsers(userDetailsWithClassroom);

        // Update contests field in Students collection
        // try {
        //     const classroomInfo = {
        //         classroomId: clsInfo?.classroomId,
        //         classroomName: clsInfo?.classroomName
        //     };

        //     console.log('🔄 Scheduling contests update for student:', docId);

        //     this.updateStudentContestsField(
        //         docId,
        //         this.data.contestInfo.docId,
        //         classroomInfo
        //     );
        // } catch (error) {
        //     console.error('Error updating student contests field:', error);
        // }

        try {
            // Query for the classroom in the institution they're being nominated from
            const programmeId = environment.defaultProgrammeIds[formValue.grade];
            // console.log('🔍 DEBUG - Institution Info:', this.data?.institutionInfo);
            // console.log(this.data.institutionInfo.institutionId, 'institutionId');
            const query: QueryFn = (ref: CollectionReference) => ref
                .where('grade', '==', Number(formValue.grade))
                .where('section', '==', 'A')
                // .where(`programmes.${programmeId}.programmeId`, '==', programmeId)
                .where('institutionId', '==', this.data?.institutionInfo?.institutionId); // Use nomination institution

            const classroomDocArr = await firstValueFrom(await this.classroomService.getWithQuery(query));

            if (classroomDocArr && classroomDocArr.length > 0) {
                const nominationClassroom = classroomDocArr[0];
                const classroomInfo = {
                    classroomId: nominationClassroom?.classroomId,
                    classroomName: nominationClassroom?.classroomName
                };

                // console.log('🔄 Adding contest with institution classroom:', this.data?.institutionInfo?.institutionName, classroomInfo);

                // Add delay for cloud function to complete
                setTimeout(async () => {
                    try {
                        await this.updateStudentContestsField(
                            docId,
                            this.data.contestInfo.docId,
                            classroomInfo
                        );
                    } catch (error) {
                        console.error('Error updating student contests field:', error);
                    }
                }, 3000);
            } else {
                console.warn('⚠️ No classroom found for institution:', this.data?.institutionInfo?.institutionName, 'grade:', formValue.grade);
            }
        } catch (error) {
            console.error('Error scheduling student contests field update:', error);
        }
        return a;

    }

    updateInContestDb(formData) {
        const dbObj = {
            studentMeta: {
                firstName: formData.firstName.trim(),
                lastName: formData.lastName.trim(),
                email: formData.email,
                gender: formData.gender,
                age: formData.age,
                fullNameLowerCase: formData.firstName.toLowerCase().replace(/ /g, '') + formData.lastName.toLowerCase().replace(/ /g, ''),
            }
        };
        return this.contestNominationsService.setStudentDoc(this.data?.studentInfo?.docId, dbObj);
    }

    // setInRamanAwardDb(formData, id) {
    //     const teacherDoc = this.teacherService.currentTeacher.value

    //     let dbObj = {
    //         id: id,
    //         docId: id,
    //         studentMeta: {
    //             board: this.data?.institutionInfo?.board,
    //             email: formData?.email,
    //             firstName: formData?.firstName.trim(),
    //             lastName: formData?.lastName.trim(),
    //             fullNameLowerCase: formData?.firstName.toLowerCase().replace(/ /g, '') + formData?.lastName.toLowerCase().replace(/ /g, ''),
    //             grade: formData?.grade,
    //             gender: formData?.gender,
    //             age: formData?.age,
    //             institutionId: this.data?.institutionInfo?.institutionId,
    //             institutionName: this.data?.institutionInfo?.institutionName,
    //             registeredAt: serverTimestamp(),
    //             countryCode: formData?.countryCode,
    //             phoneNumber: formData?.phoneNumber,
    //             stage1Nominated: false,
    //             stage2Nominated: true,
    //             updatedAt: serverTimestamp()
    //         },
    //         nominateMeta: {
    //             firstName: teacherDoc.teacherMeta?.firstName,
    //             lastName: teacherDoc.teacherMeta?.lastName,
    //             email: teacherDoc.teacherMeta?.email,
    //             countryCode: this.teacherCountryCode,
    //             phoneNumber: teacherDoc.teacherMeta?.phoneNumber,
    //             linkUid: teacherDoc.docId,
    //             nominationAt: serverTimestamp(),
    //             institutionId: this.data?.institutionInfo?.institutionId,
    //             confirm: false
    //         }
    //     }
    //     let contest = ''
    //     if (this.data.collName == 'RamanAward2024') {
    //         contest = 'RamanAward2024'
    //     }
    //     else {
    //         contest = 'RamanAward2023'

    //     }

    //     return this.ramanAwardService.updateDoc(dbObj, id, contest)
    // }

    // setInContestDb(formData, id) {
    //     const stageVariables = this.data.contestInfo.stagesNames.reduce((result, stage, index) => {
    //         result[`stage_${stage.stageId}_nominated`] = stage.stageId == this.activateRoute.snapshot.queryParams.stageId ? true : false;
    //         return result;
    //     }, {});
    //     const teacherDoc = this.teacherService.currentTeacher.value;

    //     const dbObj = {
    //         id: id,
    //         docId: id,
    //         studentMeta: {
    //             board: this.data?.institutionInfo?.board,
    //             email: formData?.email,
    //             firstName: formData?.firstName.trim(),
    //             lastName: formData?.lastName.trim(),
    //             fullNameLowerCase: formData?.firstName.toLowerCase().replace(/ /g, '') + formData?.lastName.toLowerCase().replace(/ /g, ''),
    //             grade: formData?.grade,
    //             gender: formData?.gender,
    //             age: formData?.age,
    //             institutionId: this.data?.institutionInfo?.institutionId,
    //             institutionName: this.data?.institutionInfo?.institutionName,
    //             registeredAt: serverTimestamp(),
    //             countryCode: formData?.countryCode,
    //             phoneNumber: formData?.phoneNumber,
    //             ...stageVariables,
    //             updatedAt: serverTimestamp()
    //         },
    //         nominateMeta: {
    //             firstName: teacherDoc.teacherMeta?.firstName,
    //             lastName: teacherDoc.teacherMeta?.lastName,
    //             email: teacherDoc.teacherMeta?.email,
    //             countryCode: this.teacherCountryCode,
    //             phoneNumber: teacherDoc.teacherMeta?.phoneNumber,
    //             linkUid: teacherDoc.docId,
    //             nominationAt: serverTimestamp(),
    //             institutionId: this.data?.institutionInfo?.institutionId,
    //             confirm: false
    //         }
    //     };
    //     // return this.contestNominationsService.setStudentDoc(id, dbObj);

    // }

    async setInContestDb(formData, id) {
        const stageVariables = this.data.contestInfo.stagesNames.reduce((result, stage, index) => {
            result[`stage_${stage.stageId}_nominated`] = stage.stageId == this.activateRoute.snapshot.queryParams.stageId ? true : false;
            return result;
        }, {});
        const teacherDoc = this.teacherService.currentTeacher.value;

        const dbObj = {
            id: id,
            docId: id,
            studentMeta: {
                board: this.data?.institutionInfo?.board,
                email: formData?.email,
                firstName: formData?.firstName.trim(),
                lastName: formData?.lastName.trim(),
                fullNameLowerCase: formData?.firstName.toLowerCase().replace(/ /g, '') + formData?.lastName.toLowerCase().replace(/ /g, ''),
                grade: formData?.grade,
                gender: formData?.gender,
                age: formData?.age,
                institutionId: this.data?.institutionInfo?.institutionId,
                institutionName: this.data?.institutionInfo?.institutionName,
                registeredAt: serverTimestamp(),
                countryCode: formData?.countryCode,
                phoneNumber: formData?.phoneNumber,
                ...stageVariables,
                updatedAt: serverTimestamp()
            },
            nominateMeta: {
                firstName: teacherDoc.teacherMeta?.firstName,
                lastName: teacherDoc.teacherMeta?.lastName,
                email: teacherDoc.teacherMeta?.email,
                countryCode: this.teacherCountryCode,
                phoneNumber: teacherDoc.teacherMeta?.phoneNumber,
                linkUid: teacherDoc.docId,
                nominationAt: serverTimestamp(),
                institutionId: this.data?.institutionInfo?.institutionId,
                confirm: false
            }
        };

        // Get classroom info based on grade (same as new students)
        try {
            const programmeId = environment.defaultProgrammeIds[formData.grade];
            const query: QueryFn = (ref: CollectionReference) => ref
                .where('grade', '==', Number(formData.grade))
                .where('section', '==', 'A')
                .where('institutionId', '==', this.data?.institutionInfo?.institutionId);

            const docArr = await firstValueFrom(await this.classroomService.getWithQuery(query));

            if (docArr && docArr.length > 0) {
                const clsInfo = docArr[0];
                const classroomInfo = {
                    classroomId: clsInfo?.classroomId,
                    classroomName: clsInfo?.classroomName
                };

                // Update contests field
                await this.updateStudentContestsField(
                    id,
                    this.data.contestInfo.docId,
                    classroomInfo
                );
            } else {
                console.warn('⚠️ No default classroom found for grade:', formData.grade);
            }
        } catch (error) {
            console.error('❌ Error updating contests field for existing student:', error);
            this.uiService.alertMessage('Warning', 'Nomination successful but contests field update failed', 'warning');
        }

        return this.contestNominationsService.setStudentDoc(id, dbObj);
    }

    updateNominationNumber() {
        const institutionId = this.data?.institutionInfo?.institutionId;
        const grade = this.data?.grade;
        const query: QueryFn = (ref: CollectionReference) => ref.where('nominateMeta.institutionId', '==', institutionId).where('studentMeta.grade', '==', Number(grade));

        this.contestNominationsService.getWithQuery(query).subscribe((res) => {
            const doc = {
                nominationsByClasses: {
                    [this.data.grade]: Number(res.length)
                }
            };
            return this.contestService.updateInstitutionDoc(institutionId, this.data.contestInfo.docId, doc);
        });
    }

    secondsToDate(seconds) {
        const date = new Date(seconds * 1000); // Convert seconds to milliseconds
        const day = date.getDate();
        const month = date.toLocaleString('default', { month: 'long' });
        const year = date.getFullYear();

        let daySuffix = 'th';
        if (day === 1 || day === 21 || day === 31) {
            daySuffix = 'st';
        } else if (day === 2 || day === 22) {
            daySuffix = 'nd';
        } else if (day === 3 || day === 23) {
            daySuffix = 'rd';
        }

        const formattedDate = `${day}${daySuffix} ${month} ${year}`;
        return formattedDate;
    }

    onFocusoutName() {
        const firstName: any = this.infoForm?.get('firstName')?.value;
        const lastName: any = this.infoForm?.get('lastName')?.value;
        const grade = this.data?.grade;
        const institutionId = this.data?.institutionInfo?.institutionId;
        if (firstName && lastName && grade) {
            const fullNameLowerCase = firstName.toLowerCase().replace(/ /g, '') + lastName.toLowerCase().replace(/ /g, '');
            const query: QueryFn = (ref: CollectionReference) => ref.where('nominateMeta.institutionId', '==', institutionId).where('studentMeta.fullNameLowerCase', '==', fullNameLowerCase).where('studentMeta.grade', '==', Number(grade));

            this.contestNominationsService.getWithQuery(query).pipe(take(1)).subscribe((res) => {

                // this.infoForm?.get('firstName').addValidators(duplicateName(res))
                // this.infoForm?.get('lastName').addValidators(duplicateName(res))
                if (res.length) {
                    this.isDuplicateName = true;
                    this.infoForm.controls['firstName'].setErrors({ 'duplicateNameError': true });
                    this.infoForm.controls['lastName'].setErrors({ 'duplicateNameError': true });
                    // this.allAcceptFNameAndLName.map(item => this.disableAllFields(item));
                }
                else {
                    this.isDuplicateName = false;
                    this.infoForm.controls['firstName'].setErrors({ 'duplicateNameError': null });
                    this.infoForm.controls['lastName'].setErrors({ 'duplicateNameError': null });
                    this.infoForm.controls['firstName'].updateValueAndValidity();
                    this.infoForm.controls['lastName'].updateValueAndValidity();
                    // this.allAcceptFNameAndLName.map(item => this.enableAllFields(item));
                }
            });
        }
    }

    checkInContestCollection(phoneNumber) {
        const institutionId = this.data?.institutionInfo?.institutionId;
        const grade = this.data?.grade;

        const query: QueryFn = (ref: CollectionReference) => ref
            .where('nominateMeta.institutionId', '==', institutionId)
            .where('studentMeta.phoneNumber', '==', phoneNumber)
            .where('studentMeta.grade', '==', grade.toString());

        this.contestNominationsService.getWithQuery(query).subscribe((res) => {
            const isResidentialSchool = this.data?.institutionInfo?.typeofSchool === 'Private Residential School' ||
                this.data?.institutionInfo?.typeofSchool === 'Government Residential School';

            if (!isResidentialSchool && res.length > 1) {
                this.infoForm.controls['phoneNumber'].setErrors({ 'moreThanTwoError': true });
                this.isMoreThanTwo = true;
                this.allAcceptPhone.map(item => this.disableAllFields(item)); // disable all fields except phone
            } else {

                this.infoForm.controls['phoneNumber'].setErrors({ 'moreThanTwoError': null });
                this.infoForm.controls['phoneNumber'].updateValueAndValidity();
                this.isMoreThanTwo = false;
                this.allAcceptPhone.map(item => this.enableAllFields(item)); // disable all fields except phone
            }
            if (!this.selfNomination && !this.isMoreThanTwo) {
                this.checkInStudentCollection(phoneNumber);
            }
        });
    }
    // checkRaman2023(phone) {// setting the error when same student is nominated twice for same institution
    //     const institutionId = this.data?.institutionInfo?.institutionId
    //     const grade = this.data?.grade

    //     console.log(institutionId);
    //     console.log(grade);

    //     const query: QueryFn = (ref: CollectionReference) => ref
    //         .where('nominateMeta.institutionId', '==', institutionId)
    //         .where('studentMeta.phoneNumber', '==', phone)
    //         .where('studentMeta.grade', '==', grade.toString())
    //     let contest = ''
    //     if (this.data.collName == 'RamanAward2024') {
    //         contest = 'RamanAward2024'
    //     }
    //     else {
    //         contest = 'RamanAward2023'

    //     }
    //     this.ramanAwardService.getWithQuery(query, contest).subscribe(res => {


    //         const isResidentialSchool = this.data?.institutionInfo?.typeofSchool === 'Private Residential School' ||
    //             this.data?.institutionInfo?.typeofSchool === 'Government Residential School';

    //         if (!isResidentialSchool && res.length > 1) {
    //             this.infoForm.controls['phoneNumber'].setErrors({ 'moreThanTwoError': true });
    //             this.isMoreThanTwo = true;
    //             this.allAcceptPhone.map(item => this.disableAllFields(item)); // disable all fields except phone
    //         } else {

    //             this.infoForm.controls['phoneNumber'].setErrors({ 'moreThanTwoError': null });
    //             this.infoForm.controls['phoneNumber'].updateValueAndValidity();
    //             this.isMoreThanTwo = false;
    //             this.allAcceptPhone.map(item => this.enableAllFields(item)); // disable all fields except phone
    //         }
    //         if (!this.selfNomination && !this.isMoreThanTwo) {
    //             this.checkInStudentCollection(phone);
    //         }
    //     })


    // }

    floatLabelControl = new FormControl('auto' as FloatLabelType);
    getFloatLabelValue(): FloatLabelType {
        return this.floatLabelControl.value || 'auto';
    }

    // async addUsers(userClassroom) {
    //     userClassroom.countryCode = this.teacherCountryCode;
    //     // userClassroom.phoneNumber = userClassroom.phoneNumber;

    //     // const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_to_contest_and_student_collection`;
    //     const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/add_to_contest_and_student_collection`;
    //     // const endUrl = `http://localhost:5000/backup-collection/asia-south1/add_to_contest_and_student_collection`;

    //     const formData = {
    //         userClassroomDetails: userClassroom
    //     }
    //     const httpOption: any = {
    //         responseType: 'application/json'
    //     };

    //    return await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then((res: any) => {
    //         const response = JSON.parse(res)
    //         const studentInfo = {
    //             name: `${formData.userClassroomDetails['firstName']} ${formData.userClassroomDetails['lastName'] || ''}`,
    //             phone: formData.userClassroomDetails.phone,
    //             institutionName: formData.userClassroomDetails.institutionName,
    //         }
    //         if (response) {
    //             // this.sendWaNotifications(studentInfo)
    //         }
    //     }).catch(error => {
    //         console.error(error)
    //     });
    // }

    async addUsers(userClassroom: any) {
        try {
            // Prepare data
            userClassroom.countryCode = this.teacherCountryCode;

            // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/add_to_contest_and_student_collection`;
            const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_to_contest_and_student_collection`;

            const formData = {
                userClassroomDetails: userClassroom
            };

            const httpOption: any = {
                responseType: 'application/json'
            };

            // HTTP POST request
            const res: any = await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise();
            const response = JSON.parse(res);

            // Check response
            if (response) {
                const studentInfo = {
                    name: `${formData.userClassroomDetails['firstName']} ${formData.userClassroomDetails['lastName'] || ''}`,
                    phone: formData.userClassroomDetails.phone,
                    institutionName: formData.userClassroomDetails.institutionName,
                };

                // Uncomment if needed
                // this.sendWaNotifications(studentInfo);

                return response; // Return only if the response is valid
            } else {
                throw new Error('No valid response received from the server');
            }
        } catch (error) {
            console.error('Error occurred while adding users:', error);
            throw error; // Rethrow error for further handling
        }
    }

    // async createStudentDbObj(grade, formValue, docId) {
    //     console.log(grade);

    //     const programmeId = environment.defaultProgrammeIds[grade]
    //     console.log(programmeId);

    //     const query: QueryFn = (ref: CollectionReference) => ref
    //         .where('grade', '==', Number(grade))
    //         .where('section', '==', 'A')
    //         .where(`programmes.${programmeId}.programmeId`, '==', programmeId)
    //         .where('institutionId', '==', environment.defaultInstitutionId)

    //     const docArr = await firstValueFrom(await this.classroomService.getWithQuery(query))
    //     console.log(docArr);

    //     this.clsInfo = docArr[0]
    //     const clsInfo = docArr[0]

    //     const studentInfo = {
    //         createdAt: serverTimestamp(),
    //         docId: docId,
    //         linkUid: this.user.uid,
    //         studentMeta: {
    //             email: formValue.email,
    //             firstName: formValue.firstName,
    //             lastName: formValue.lastName,
    //             fullNameLowerCase: formValue.firstName.toLowerCase().replace(/ /g, '') + formValue.lastName.toLowerCase().replace(/ /g, ''),
    //             linkUid: this.user.uid,
    //             phone: this.teacherCountryCode + formValue.phone.slice(-10),
    //             updatedAt: serverTimestamp(),
    //             age: formValue.age,
    //             gender: formValue.gender,
    //             grade: formValue.grade,
    //         },
    //         classrooms: {
    //             [clsInfo?.classroomId]: {
    //                 classroomId: clsInfo?.classroomId,
    //                 classroomName: clsInfo?.classroomName,
    //                 activeStatus: true,
    //                 institutionId: clsInfo?.institutionId,
    //                 institutionName: clsInfo?.institutionName,
    //                 joinedDate: serverTimestamp(),
    //                 programmes: Object.values(clsInfo.programmes)
    //             }
    //         }

    //     }
    //     return studentInfo
    // }

    // async setStage2Enabled(form) {
    //     const query: QueryFn = (ref: CollectionReference) => ref.where('studentMeta.phoneNumber', '==', form.phoneNumber)
    //     // .where('studentMeta.grade', '==', form.grade);
    //     const studentdocs: any = await this.getStudentdocs(query)
    //     if (studentdocs.length > 0) {
    //         let studentfilterd = studentdocs.filter(s => s.studentMeta?.grade == form.grade)
    //         studentfilterd.forEach((stu, index) => {
    //             stu['stage_2_enabled'] = true
    //             this.studentService.updateStudent(stu, stu.docId)
    //         })
    //     }
    // }
    async getStudentdocs(query) {
        return new Promise((resolve, reject) => {
            this.studentService.getWithQuery(query).subscribe((d) => {
                resolve(d);
            });
        });

    }

    addNewStudent() {
        this.multipleStudents = false;
        this.allAcceptPhone.map(item => this.enableAllFields(item));

    }

    async updateStudentContestsField(studentDocId: string, contestId: string, classroomInfo: any) {
        try {
            // console.log(`🔄 Updating contests for student: ${studentDocId}, contest: ${contestId}`);

            // Get current student document
            const studentDoc: any = await this.studentService.getStudentInfo(studentDocId);

            if (!studentDoc) {
                throw new Error(`Student document ${studentDocId} not found`);
            }

            // Get existing contests or initialize empty object
            let existingContestsObj: any = studentDoc?.contests || {};

            // console.log('📋 Existing contests:', JSON.stringify(existingContestsObj));

            // Initialize contest entry if it doesn't exist
            if (!existingContestsObj[contestId]) {
                existingContestsObj[contestId] = {
                    classrooms: {}
                };
            }

            // Initialize classrooms object if it doesn't exist
            if (!existingContestsObj[contestId].classrooms) {
                existingContestsObj[contestId].classrooms = {};
            }

            // Add this classroom to the contest
            existingContestsObj[contestId].classrooms[classroomInfo.classroomId] = {
                classroomId: classroomInfo.classroomId,
                classroomName: classroomInfo.classroomName
            };

            // console.log('📝 Updated contests object:', JSON.stringify(existingContestsObj));

            // Update using student service
            await this.studentService.updateStudent(
                { contests: existingContestsObj },
                studentDocId
            );

            // console.log(`✅ Successfully updated student ${studentDocId} contests`);

        } catch (error) {
            console.error(`❌ Error updating student ${studentDocId} contests:`, error);
            throw error;
        }
    }
}
