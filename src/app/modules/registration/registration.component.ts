import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { FuseLoadingService } from '@fuse/services/loading';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { Teacher } from 'app/core/dbOperations/teachers/teacher.types';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { Observable, first, take, lastValueFrom, startWith, map } from 'rxjs';
import { SchoolCreateComponent } from './school-create/school-create.component';
import { combineLatest } from 'rxjs';
import _, { get } from 'lodash';
import { SharedService } from 'app/shared/shared.service';
import { MatSelectChange } from '@angular/material/select';
import { environment } from 'environments/environment';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { NotificationService } from 'app/core/dbOperations/notifications/notification.service';
import { serverTimestamp } from '@angular/fire/firestore';

@Component({
    selector: 'app-registration',
    templateUrl: './registration.component.html',
    styleUrls: ['./registration.component.scss'],

})

export class RegistrationComponent implements OnInit, OnDestroy {

    /*
    // variables not currently in use
    boards = { 'KSEEB': 'Karnataka State Secondary Education Examination Board' }
    filteredBoard = [
      {
        Name: 'demo',
        Code: '001'
      },
      {
        Name: 'demo2',
        Code: '002'
      }
    ]
    createNewSchDropdown = 'No school ! Create One';
    // subjectList: string[] = ['Science', 'Math','Foundational Literacy and Numeracy'];
    // gradeList: number[] = Array.from({ length: 10 }).map((_, i) => i + 1);
    // section: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NA'];
    selectedInst: any
    linkAttribute: boolean = false;
    newSchool: boolean = false;
    offset = 0;
    lastInResponse: import("@angular/fire/compat/firestore").QueryDocumentSnapshot<unknown>;
    tableData: any[];
    boardList: object[] = []
    progSub: any;
    */

    currentUser: any = {};
    authUser: any;
    gradeList: any = [];
    searchBtnClick = false;
    section = [];
    limit = 10;
    isLast: boolean = false;
    institutions$: Observable<any>;
    fetchMore$: Observable<any>;
    loginSpinner = false;
    languageList: object[] = [];
    institutionTypeList: object[] = [];
    subcriptionRef: PushSubscription[] = [];
    isFirstTimeLanding: boolean = false;
    allProgrammes: any;
    allClasses: any = [];
    currentCls: any;
    boardData: any;
    countryBoard: Array<string>;
    countryCodes: any;
    teacherCountry: string;
    isAddNewBoard: boolean = false;
    isLoaded: boolean = false;
    isCreatedInstitution: boolean = false;

    infoForm = this.fb.group({
        fName: [{ value: '', disabled: true }, [Validators.required, this.noWhitespaceValidator]],
        lName: [{ value: '', disabled: true }, [Validators.required, this.noWhitespaceValidator]],
        email: [{ value: '', disabled: true }, [Validators.email, this.noWhitespaceValidator]],
        countryCode: [''],
        phoneNumber: new FormControl<string>({ value: '', disabled: true }, { validators: [Validators.required] }),
        board: [{ value: '', disabled: true }, Validators.required],
        //programme: [{ value: '', disabled: true }, Validators.required],
        programme: ['', Validators.required],
        grade: [{ value: '', disabled: true }, Validators.required],
        section: [{ value: '', disabled: true }, Validators.required],
        // pincode: [null, [Validators.required, Validators.pattern("^[0-9]{6}")]],
        pincode: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
        institution: [{ value: '', disabled: true }, Validators.required],
        representativePhone: [''],
        uid: [''],
        country: [''],
    });
    environment = environment;
    disableButtonClick: boolean = false;
    filteredBoards: Observable<any[]>;


    public noWhitespaceValidator(control: FormControl) {
        return (control.value || '').trim().length ? null : { 'whitespace': true };
    }

    constructor(
        private fb: FormBuilder,
        private router: Router,
        public dialog: MatDialog,
        public afAuth: AngularFireAuth,
        private institutionsService: InstitutionsService,
        private classroomService: ClassroomsService,
        private teacherService: TeacherService,
        private fuseLoaderService: FuseLoadingService,
        private configurationService: ConfigurationService,
        private userService: UserService,
        private sharedService: SharedService,
        private masterService: MasterService,
        private notificationService: NotificationService
    ) {
        /*
        let boardSub: any = this.configurationService.boardListSub.subscribe((d: any) => {
          this.boardList = d?.filter(e=>e.code!=='ICSE')
        })
        this.subcriptionRef.push(boardSub)
        */

        const insSubRef: any = this.configurationService.institutionTypesListSub.subscribe((d: any) => {
            this.institutionTypeList = d;
        });
        this.subcriptionRef.push(insSubRef);

        const lanSub: any = this.configurationService.languageListSub.subscribe((d: any) => {
            this.languageList = d;
        });
        this.subcriptionRef.push(lanSub);
        this.onChangeClsAndSec();
    }

    ngOnDestroy(): void {
        if (this.subcriptionRef?.length) { this.subcriptionRef.map(d => d.unsubscribe()); }
    }

    async ngOnInit(): Promise<void> {
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        this.authUser = user;
        this.currentUser = (await lastValueFrom(this.userService.getUser(user.uid))) ?? {};

        const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(this.currentUser, this.infoForm, this.isLoaded);
        [this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCodes, boardData, countryName, isLoaded];
        this.infoForm?.get('countryCode').setValue(countryCode);

        this.infoForm?.get('country')?.setValue('india', { emitEvent: false });

        this.registrationSelf();
        this.fuseLoaderService.hide();
        this.checkAndGetLastUsedProgramme();
        // this.getAllLiveProgrammes()

        const watchList = [
            'country',
            'pincode',
            'board',
            'institution',
            'fName',
            'lName',
            // 'phone',
            // 'representativePhone',
            'email',
            'grade',
            'section'
        ];

        const unlockList = [
            'pincode',
            'board',
            'institution',
            'fName',
            'lName',
            // 'phone',
            // 'representativePhone',
            'email',
            'grade',
            'section',
            'programme',
        ];

        for (let i = 0; i < watchList.length; i++) {
            this.unlockFormSequentially(watchList[i], unlockList[i]);
        }

        // this.generateSection();
        // let d = {
        //   "assignments": [{ "uploadRequired": true, maxFileSize: 5, uploadFileType: 'jpeg|png', "dueDate": "", "instructions": "Once you have completed the activity, take an image and upload it here.", "title": "1. Upload the image of completed activity", "assigned": false, "uploadPath": "", "resourcePath": "" },
        //   { "uploadRequired": true, maxFileSize: 5, uploadFileType: 'pdf', "title": " 2. Fill the observation sheet", "instructions": "Download the observation sheet. Fill it using any reader like \"Edge\" or Adobe PDF reader. Upload your digitally filled observation sheet here.", "assigned": false, "uploadPath": "", "resourceUrl": "", "dueDate": "" }]
        // }
        // await this.afs.doc('Assignments/--default_assignments--').set(d);
        // let sch: any = await this.afs.doc('Configuration/Languages').get().toPromise();
        // let schFilter = sch.data().LangTypes.map(d => {
        //   return {
        //     name: d.Name,
        //     code: d.Code
        //   }
        // })
        // let d = [{ "name": "English", "code": "EN" }, { "name": "Hindi", "code": "HI" }, { "name": "Bengali", "code": "BN" }, { "name": "Kannada", "code": "KN" }, { "name": "Tamil", "code": "TA" }, { "name": "Marathi", "code": "MR" }, { "name": "Telugu", "code": "TE" }, { "name": "Gujarati", "code": "GU" }, { "name": "Oriya", "code": "OR" }]
        // let sch = await this.afs.doc('Configuration/Languages').set({ langTypes: d })
        // this.checkApprovalStatus();
    }

    /* Self Registration institution -classroom */
    // old method
    // async onSubmit(form: any) {
    //     this.loginSpinner = true;
    //     const newReg: Teacher = {
    //         countryCode: form?.get('countryCode')?.value?.trim(),
    //         phoneNumber: form?.get('phoneNumber')?.value?.trim(),
    //         uid: form?.get('uid')?.value,
    //         email: form?.get('email')?.value?.trim(),
    //         firstName: form?.get('fName')?.value?.trim(),
    //         lastName: form?.get('lName')?.value?.trim(),
    //         institutionName: form?.get('institution')?.value?.institutionName?.trim(),
    //         institutionId: form?.get('institution')?.value?.institutionId?.trim(),
    //         representativeCountryCode: form?.get('institution')?.value?.representativeCountryCode?.trim(),
    //         representativePhoneNumber: form?.get('institution')?.value?.representativePhoneNumber?.trim(),
    //         board: form?.get('board')?.value?.trim(),
    //         classroomName: this.currentCls.classroomName,
    //         classroomId: this.currentCls.classroomId,
    //         programme: form?.get('programme')?.value,
    //         grade: Number(form?.get('grade')?.value),
    //         section: form?.get('section')?.value?.trim(),
    //         type: this.currentCls.type
    //     };

    //     await this.teacherService.addTeachers(newReg);

    //     if (this.currentUser?.phoneNumber === newReg.representativeCountryCode + newReg.representativePhoneNumber) {
    //         this.router.navigate(['dashboard'], { queryParams: { institutionId: newReg.institutionId, classroomId: newReg.classroomId, programmeId: newReg.programme.programmeId } });
    //         this.fuseLoaderService.hide();
    //         return;
    //     }

    //     await this.updateApprovalStatus(newReg);
    //     await this.sendWhatsAppNotification(newReg);

    //     this.fuseLoaderService.hide();

    //     // this.fuseLoaderService.show()
    //     // // this.router.navigateByUrl('/signed-in-redirect');
    //     // const doc = this.orgData.filter(res => {
    //     //   return res.institutionName == form.get('institutionName').value
    //     // })
    //     // this.infoForm.patchValue({
    //     //   institutionId: doc[0].institutionId,
    //     //   representativePhone: this.selectedCountryCode + doc[0].representativePhone.toString().slice(-10);
    //     // })
    //     // this.lastUse(doc[0].institutionId)
    //     // const newReg: Teacher = {
    //     //   phone: form.value.phone.trim(),
    //     //   uid: form.value.uid,
    //     //   email: form.value.email.trim(),
    //     //   firstName: form.value.fName.trim(),
    //     //   lastName: form.value.lName.trim(),
    //     //   institutionName: form.value.institutionName.trim(),
    //     //   institutionId: form.value.institutionId.trim(),
    //     //   representativePhone: form.value.representativePhone.trim(),
    //     //   board: form.value.board.trim(),
    //     //   classroomName: `${form.value.grade} ${form.value.section.trim()}`,
    //     //   classroomId: form.value.classroomId,
    //     //   programme: form.value.programme.trim(),
    //     //   grade: Number(form.value.grade),
    //     //   section: form.value.section.trim(),
    //     // }
    //     // const programmeIdName: any = await this.configurationService.getProgrammeByBGS(newReg.board, newReg.grade)
    //     // const createNewClassroom: Classroom = {
    //     //   institutionName: form.value.institutionName.trim(),
    //     //   institutionId: form.value.institutionId.trim(),
    //     //   board: form.value.board.trim(),
    //     //   classroomName: `${form.value.grade} ${form.value.section.trim()}`,
    //     //   classroomId: form.value.classroomId,
    //     //   // subject: form.value.subject.trim(),
    //     //   grade: Number(form.value.grade),
    //     //   section: form.value.section.trim(),
    //     //   programmes: {
    //     //     [`${programmeIdName.programmeId}`]: {
    //     //       programmeId: `${programmeIdName.programmeId}`,
    //     //       programmeName: `${programmeIdName.programmeName}`,
    //     //     }
    //     //   }
    //     // }
    //     // const classroomRef = await this.classroomService.getClassroomId(newReg.institutionId, newReg.grade, newReg.section)
    //     // const checkClasroom = await firstValueFrom(classroomRef);
    //     // if (checkClasroom.length) {
    //     //   newReg.classroomId = checkClasroom[0]['classroomId']
    //     //   newReg.classroomName = checkClasroom[0]['classroomName']
    //     // } else {
    //     //   const createdClassroom = await this.classroomService.addNewClassroom(createNewClassroom)
    //     //   newReg.classroomId = createdClassroom['classroomId']
    //     //   newReg.classroomName = createdClassroom['classroomName']
    //     // }
    //     // await this.teacherService.addTeachers(newReg)
    //     /* Check Ands Send WA Notification Firsr time landing */
    //     // this.welcomeGreetingWANotificationFirstTimeLanding()
    //     // this.router.navigate(['dashboard'], { queryParams: { institutionId: newReg.institutionId, classroomId: newReg.classroomId, programmeId: newReg.programme.programmeId } });
    // }

    // async onSubmit2(form: any) {
    //     this.loginSpinner = true;
    //     const newReg: any = {
    //         // ...existing fields...
    //         firstName: form?.get('fName')?.value?.trim(),
    //         lastName: form?.get('lName')?.value?.trim(),
    //         email: form?.get('email')?.value?.trim(),
    //         institutionId: form?.get('institution')?.value?.institutionId?.trim(),
    //         // ...other fields...
    //         countryCode: form?.get('countryCode')?.value?.trim(),
    //         phoneNumber: form?.get('phoneNumber')?.value?.trim(),
    //         uid: form?.get('uid')?.value,
    //         institutionName: form?.get('institution')?.value?.institutionName?.trim(),
    //         representativeCountryCode: form?.get('institution')?.value?.representativeCountryCode?.trim(),
    //         representativePhoneNumber: form?.get('institution')?.value?.representativePhoneNumber?.trim(),
    //         board: form?.get('board')?.value?.trim(),
    //         classroomName: this.currentCls.classroomName,
    //         classroomId: this.currentCls.classroomId,
    //         programme: form?.get('programme')?.value,
    //         grade: Number(form?.get('grade')?.value),
    //         section: form?.get('section')?.value?.trim(),
    //         type: this.currentCls.type
    //     };


    //     // PATCH THE INSTITUTION DOCUMENT HERE
    //     await this.institutionsService.update({
    //         institutionCreatorFirstName: newReg.firstName,
    //         institutionCreatorLastName: newReg.lastName,
    //         institutionCreatorEmail: newReg.email,
    //         institutionCreatorName: `${newReg.firstName} ${newReg.lastName}`,
    //     }, newReg.institutionId);


    //     const institutionDoc: any = await this.institutionsService.getDocDataByDocId(newReg.institutionId);
    //     const masterDocId = institutionDoc?.masterDocId;
    //     const institutionName = institutionDoc?.institutionName;
    //     // await this.masterService.updateMasterDoc('institutionNames', masterDocId, {
    //     //     [newReg.institutionId]: {
    //     //         institutionCreatorFirstName: newReg.firstName,
    //     //         institutionCreatorLastName: newReg.lastName,
    //     //         institutionCreatorEmail: newReg.email,
    //     //         institutionCreatorName: `${newReg.firstName} ${newReg.lastName}`,
    //     //     }
    //     // });

    //     await this.masterService.updateMasterDocWithoutMerge(
    //         'institutionNames',
    //         masterDocId,
    //         newReg.institutionId,
    //         {
    //             institutionCreatorFirstName: newReg.firstName,
    //             institutionCreatorLastName: newReg.lastName,
    //             institutionCreatorEmail: newReg.email,
    //             institutionCreatorName: `${newReg.firstName} ${newReg.lastName}`,
    //         }
    //     );


    //     const slackBearerToken = environment.slackNotifications.newInstitution.slackBearerToken;
    //     const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
    //     const institutionCreatorName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
    //     let slackChannel = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.newInstitution.slackChannels);
    //     const messageContent = `A new institution '${institutionName}' has been created in Firebase project '${environment.firebase.projectId}' by '${newReg.firstName} ${newReg.lastName}'.`;

    //     // this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, slackChannel, messageContent);

    //     // Continue with registration flow
    //     await this.teacherService.addTeachers(newReg);

    //     if (this.currentUser?.phoneNumber === newReg.representativeCountryCode + newReg.representativePhoneNumber) {
    //         this.router.navigate(['dashboard'], { queryParams: { institutionId: newReg.institutionId, classroomId: newReg.classroomId, programmeId: newReg.programme.programmeId } });
    //         // this.router.navigate(['dashboard'], { queryParams: { institutionId:  form?.get('institution')?.value?.institutionId?.trim(), classroomId: this.currentCls.classroomId, programmeId: newReg.programme.programmeId } });
    //         this.fuseLoaderService.hide();
    //         return;
    //     }

    //     await this.updateApprovalStatus(newReg);
    //     await this.sendWhatsAppNotification(newReg);

    //     this.fuseLoaderService.hide();
    // }


    async onSubmit(form: any) {
        this.loginSpinner = true;
        const baseReg = {
            firstName: form?.get('fName')?.value?.trim(),
            lastName: form?.get('lName')?.value?.trim(),
            email: form?.get('email')?.value?.trim(),
            institutionId: form?.get('institution')?.value?.institutionId?.trim(),
            phoneNumber: form?.get('phoneNumber')?.value?.trim(),
            uid: form?.get('uid')?.value,
            institutionName: form?.get('institution')?.value?.institutionName?.trim(),
            representativeCountryCode: form?.get('institution')?.value?.representativeCountryCode?.trim(),
            representativePhoneNumber: form?.get('institution')?.value?.representativePhoneNumber?.trim(),
            board: form?.get('board')?.value?.trim(),
            type: this.currentCls?.type
        }


        if (!this.isCreatedInstitution) {
            // PATCH THE INSTITUTION DOCUMENT HERE
            const newReg: any = {
                // ...existing fields...
                ...baseReg,
                classroomName: this.currentCls.classroomName,
                classroomId: this.currentCls.classroomId,
                programme: form?.get('programme')?.value,
                grade: Number(form?.get('grade')?.value),
                section: form?.get('section')?.value?.trim(),
                type: this.currentCls.type,
                countryCode: baseReg.representativeCountryCode ?? '',
                phoneNumber: baseReg.phoneNumber ?? ''

            };
            await this.teacherService.addTeachers(newReg);
            await this.updateApprovalStatus(newReg);
            await this.sendWhatsAppNotification(newReg);
            if (this.currentUser?.phoneNumber === newReg.representativeCountryCode + newReg.representativePhoneNumber) {
                this.router.navigate(['dashboard'], { queryParams: { institutionId: newReg.institutionId, classroomId: newReg.classroomId, programmeId: newReg.programme.programmeId } });
                // this.router.navigate(['dashboard'], { queryParams: { institutionId:  form?.get('institution')?.value?.institutionId?.trim(), classroomId: this.currentCls.classroomId, programmeId: newReg.programme.programmeId } });
                this.fuseLoaderService.hide();
                return;
            }

        } else {

            await this.institutionsService.update({
                institutionCreatorFirstName: baseReg.firstName,
                institutionCreatorLastName: baseReg.lastName,
                institutionCreatorEmail: baseReg.email,
                institutionCreatorName: `${baseReg.firstName} ${baseReg.lastName}`,
            }, baseReg.institutionId);

            await this.teacherService.updateTeacher({
                teacherMeta: {
                    firstName: baseReg.firstName,
                    lastName: baseReg.lastName,
                    email: baseReg.email,
                    fullNameLowerCase: `${baseReg.firstName}${baseReg.lastName}`.toLowerCase()
                }
            }, this.currentUser?.uid);
            const institutionDoc: any = await this.institutionsService.getDocDataByDocId(baseReg.institutionId);
            const masterDocId = institutionDoc?.masterDocId;
            const institutionName = institutionDoc?.institutionName;


            await this.masterService.updateMasterDocWithoutMerge(
                'institutionNames',
                masterDocId,
                baseReg.institutionId,
                {
                    institutionCreatorFirstName: baseReg.firstName,
                    institutionCreatorLastName: baseReg.lastName,
                    institutionCreatorEmail: baseReg.email,
                    institutionCreatorName: `${baseReg.firstName} ${baseReg.lastName}`,
                }
            );

            const result = await this.classroomService.getClassroomIdAndProgrammeIdByInstitutionAndName(baseReg.institutionId, '1 A');

            if (result) {
                const { classroomId, programmeId } = result;
                this.router.navigate(['dashboard'], {
                    queryParams: {
                        institutionId: baseReg.institutionId,
                        classroomId,
                        programmeId
                    }
                });
            }
            const slackBearerToken = environment.slackNotifications.newInstitution.slackBearerToken;
            const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
            const institutionCreatorName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
            let slackChannel = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.newInstitution.slackChannels);
            const messageContent = `A new institution '${institutionName}' has been created in Firebase project '${environment.firebase.projectId}' by '${baseReg.firstName} ${baseReg.lastName}'.`;

            this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, slackChannel, messageContent);
        }

        // Continue with registration flow
        this.fuseLoaderService.hide();
    }


    sendWhatsAppNotification(newReg: Teacher) {
        const name = newReg.firstName + ' ' + newReg.lastName;
        const className = newReg.classroomName;
        const programme = newReg.programme.programmeName;
        const institution = newReg.institutionName;
        const phone = newReg.countryCode + newReg.phoneNumber;
        const templateName = environment.whatsAppTemplates.approvalRequest.templateName;
        const headerImage = environment.whatsAppTemplates.approvalRequest.headerImage;
        const mediaType = 'image';
        const params = [
            name,
            className,
            programme,
            institution
        ];
        const imageForAdminmessage = environment.whatsAppTemplates.approvalRequest.headerImage;
        const customAdminParam = [newReg.firstName, newReg.lastName, newReg.email, phone, className, programme, institution];
        const formData = {
            adminMessageParam: {
                firstName: newReg.firstName,
                lastName: newReg.lastName,
                email: newReg.email,
                className: className,
                programmeName: programme,
                institution: institution
            },
            imageForAdminmessage: imageForAdminmessage,
            // adminMessagetemplate: "teacher_corner_approval_request_admin_notification_en_v1",
            adminMessagetemplate: environment.whatsAppTemplates.approvalAdminNotification.templateName,
            phoneNumber: phone,
            whatsAppSender: environment.whatsAppSender,
            whatsAppNamespace: environment.whatsAppNamespace,
            whatsAppToken: environment.whatsAppToken,
            whatsAppUrl: environment.whatsAppUrl,
        };
        const urlRoute = undefined;

        this.sharedService.sendWhatsAppNotification(phone, templateName, params, headerImage, mediaType, urlRoute);

        this.sharedService.sendWhatsAppNotificationWithImgtoAdmins(customAdminParam, imageForAdminmessage, formData);
    }

    // ✅ UPDATED: Write approval notification into Notifications collection with extra fields
    async updateApprovalStatus(cls) {
        const uid = cls.uid;
        const firstName = cls.firstName;
        const lastName = cls.lastName;
        const classroomName = cls.classroomName;

        const schoolRepCountryCode = `${cls.representativeCountryCode}`;
        const schoolRepPhoneNumber = `${cls.representativePhoneNumber}`;

        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('countryCode', '==', schoolRepCountryCode).where('phoneNumber', '==', schoolRepPhoneNumber);

        const docRef = lastValueFrom(await this.userService.getDocWithQuery(query));
        const userDocData: any = await docRef;
        const schoolRepUserData: any = userDocData[0];
        const schRepUserDocId: string = schoolRepUserData?.docId || '';

        // Keep existing approval status markers on users (unchanged)
        const approvalObj = {
            countryCode: cls.countryCode,
            phoneNumber: cls.phoneNumber,
            selfRegTeacherApproval: {
                [`${cls.classroomId}`]: {
                    approvalStatus: false,
                    classroomId: `${cls.classroomId}`,
                    classroomName: `${cls.classroomName}`,
                    institutionName: `${cls.institutionName}`,
                }
            },
        };
        await this.userService.updateSelfRegUserApproval(approvalObj, uid);

        // ✅ Create a Notification document (visible to Admins via streamAllNotifications)
        const approvalNotification: Omit<Notification, 'id' | 'updatedAt' | 'time'> & {
            userId: string;
            role: 'teacher' | 'student';
        } = {
            userId: schRepUserDocId || 'school-rep-unknown',
            role: 'teacher',
            read: false,
            remove: false,
            title: 'Approval Request',
            description: `${firstName} ${lastName} has requested to join your classroom ${classroomName} with programme "${cls.programme.programmeName}"`,
            icon: 'mat_outline:circle_notifications',
            image: '',
            link: '',
            useRouter: false,
            approvalRequest: true,
            selfRegUserId: uid,
            classroomId: cls.classroomId,

            firstName: cls.firstName,
            lastName: cls.lastName,
            countryCode: cls.countryCode,
            phoneNumber: cls.phoneNumber,
            email: cls.email,
            instituteName: cls.institutionName,
            classroomName: cls.classroomName,
            subject: cls.programme.programmeName,

            // Admin visibility flag
            viewNotificationsAdmin: true,

            // 🔹 Newly added fields:
            actionTakenBy: '',
            actionDate: '',          // you can keep this as '' initially; it’ll be updated later on approval/reject
            rejectionReason: '',
            schoolRepUid: schRepUserDocId,
        };

        await this.notificationService.createNotification(approvalNotification as any);

        const clssroomInfo = {
            classroomName: `${cls.classroomName}`,
            institutionName: `${cls.institutionName}`,
        };
        this.userService.approvalClassroomInfoSub.next(clssroomInfo);
        this.router.navigateByUrl('approval-page');
    }


    async checkAndGetLastUsedProgramme() {
        await (await this.userService.getTeacherInfo()).pipe(take(1)).subscribe((res) => {
            this.isFirstTimeLanding = res?.currentTeacherInfo ? false : true;
        });
    }

    generateSection() {
        const first = 'a'; const last = 'z';
        for (let i = first.charCodeAt(0); i <= last.charCodeAt(0); i++) {
            const letter = eval('String.fromCharCode(' + i + ')').toUpperCase();
            this.section.push(letter);
        }
    }

    lastUse(id) {
        const institution = {
            'lastUsedDate': new Date()
        };
        this.institutionsService.update(institution, id);
    }

    // getSchoolByPincode(pincode) {
    // }

    async registrationSelf() {
        const uid = this.currentUser?.uid || this.authUser?.uid || '';
        const authPhone = this.authUser?.phoneNumber || '';
        const storedCountryCode = this.currentUser?.countryCode || '';
        const storedPhone = this.currentUser?.phoneNumber || '';

        const fullPhone = storedPhone || authPhone;
        const derivedCountryCode = fullPhone
            ? (this.configurationService.getCountryCodeFromPhone(fullPhone) || '')
            : '';
        const countryCode = storedCountryCode || derivedCountryCode;
        const phoneNumber = fullPhone
            ? String(fullPhone).replace(String(countryCode || ''), '')
            : '';

        this.infoForm.get('countryCode')?.setValue(countryCode, { emitEvent: false });
        this.infoForm.get('phoneNumber')?.setValue(phoneNumber as any, { emitEvent: false });
        this.infoForm.get('uid')?.setValue(uid, { emitEvent: false });
    }

    displayFn(thinktacID: any): string {
        return thinktacID && thinktacID.name ? thinktacID.name : '';
    }


    async createSchool() {
        await import('./school-create/school-create.module').then(() => {
            const dialogRef = this.dialog.open(SchoolCreateComponent, {
                data: {
                    parent: 'registration',
                    country: this.infoForm.get('country').value,
                    countryCode: this.infoForm.get('countryCode').value,
                    pin: this.infoForm.get('pincode').value,
                    board: this.infoForm.get('board').value,
                    lang: this.languageList,
                    createdSource: 'teacher-corner-self-registration'
                }
            });
            // patch created institution after dialog close
            dialogRef.afterClosed().subscribe((createdInstitution) => {
                if (createdInstitution) {
                    this.loadInstitutes();
                    //true iscreatedinst
                    this.isCreatedInstitution = true;
                    this.toggleInstitutionValidators();
                    this.toggleFormState();
                    this.institutions$.pipe(first()).subscribe((schools) => {
                        const matchedSchool = schools.find(school => {
                            const data = school.payload.doc.data();
                            const schoolId = data.institutionId || data.docId || data.id;
                            const createdId = createdInstitution.institutionId || createdInstitution.docId || createdInstitution.id;
                            return schoolId === createdId;
                        });

                        if (matchedSchool) {
                            const matchedData = matchedSchool.payload.doc.data();
                            this.infoForm.get('institution').setValue(matchedData);
                            this.onChangeInstitution({ value: matchedData } as MatSelectChange);
                        }
                    });
                }
            });

        });
    }
    logout() {
        this.router.navigate(['/sign-out']);
    }

    /*
    pinOnChange() {
      this.infoForm.get('institution').reset()
      this.loadInstitutes()
      this.infoForm.get('email').reset()
      this.infoForm.get('fName').reset()
      this.infoForm.get('lName').reset()
      this.infoForm.controls['lName'].disable()
      this.infoForm.controls['fName'].disable()
      this.infoForm.controls['email'].disable()
      this.infoForm.get('grade').reset()
      this.infoForm.get('section').reset()
      this.infoForm.get('programme').reset()
    }
    */

    async onClickSearch() {
        this.loadInstitutes();
        // this.loadItems()
    }

    loadInstitutes() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('board', '==', this.infoForm.get('board').value)
                .where('institutionAddress.pincode', '==', this.infoForm.get('pincode').value)
                .orderBy('institutionName', 'asc');

        this.institutions$ = this.institutionsService.getSnapshot(query).pipe(map((response: any) =>
            response.filter(res => res.payload.doc.data().institutionName != 'ThinkTac')
            //return response
        ));
    }

    // loadItems() {
    //   const query: QueryFn = (ref: CollectionReference) =>
    //     ref.limit(5)
    //       .where('board', '==', this.infoForm.get('board').value)
    //       .where('institutionAddress.pincode', '==', this.infoForm.get('pincode').value)
    //       .orderBy('institutionName', 'asc')
    //   this.institutions$ = this.institutionsService.getSnapshot(query).pipe(tap((response: any) => {
    //     this.orgData = response.map(value => {
    //       return value.payload.doc.data()
    //     })
    //     if (response.length <= 5) {
    //       this.isLast = true
    //     }
    //     this.lastInResponse = response[response.length - 1]?.payload?.doc;
    //   }))
    //     , error => {
    //       console.error(error)
    //     };
    // }
    // async getNextBatch() {
    //   this.nextPage()
    // }
    // nextPage() {
    //   if (this.lastInResponse) {
    //     const query: QueryFn = (ref: CollectionReference) =>
    //       ref.limit(5)
    //         .where('board', '==', this.infoForm.get('board').value)
    //         .where('institutionAddress.pincode', '==', this.infoForm.get('pincode').value)
    //         .orderBy('lastUsedDate', 'desc')
    //         .startAfter(this.lastInResponse)
    //     this.fetchMore$ = this.institutionsService.getSnapshot(query).pipe(tap((response: any) => {
    //       const data = response.map(value => {
    //         return value.payload.doc.data()
    //       })
    //       this.orgData = [...this.orgData, ...data]
    //       if (!response.length) {
    //         this.isLast = true;
    //       }
    //       if (response.length == 5) {
    //         this.lastInResponse = response[response.length - 1].payload.doc;
    //       }
    //       else {
    //         this.lastInResponse = null
    //       }
    //     }))
    //     this.institutions$ = merge(this.institutions$, this.fetchMore$).pipe(reduce((a, b) => a.concat(b)));
    //   }
    // }
    // getAllLiveProgrammes() {
    //   this.progSub = this.programmeService.getAllLiveProgrammes().subscribe(res => {
    //     this.allProgrammes = res
    //   })
    // }

    /*
    onSelectSchool(school) {
    }
    */

    onChangeClsAndSec() {
        // this.infoForm.get('grade').valueChanges.subscribe()
        combineLatest([
            this.infoForm.get('grade').valueChanges.pipe(startWith(null)),
            this.infoForm.get('section').valueChanges.pipe(startWith(null))
        ]).subscribe(([grade, section]) => {
            this.infoForm.get('programme').reset();
            if (grade && section) {
                const cls = this.allClasses.find(doc => doc.grade == grade && doc.section == section);
                this.allProgrammes = cls.programmes;
                this.currentCls = cls;
            }
        });
    }

    onClickGrade(grade) {
        const sectionsArr = [];
        this.allClasses.forEach((doc) => {
            if (doc.grade == grade) {
                sectionsArr.push(doc.section);
            }
        });
        const uniqSec: any = [...new Set(sectionsArr)];

        this.section = uniqSec.sort((a, b) => a.localeCompare(b));

        this.infoForm.controls.institution.value;
    }

    disableGradeSelect() {
        // checking if object is empty
        return _.isEmpty(this.infoForm.get('institution').value);
    }

    onChangeInstitution(event: MatSelectChange) {
        const school = event?.value;
        /*
        if (school) {
          this.infoForm.controls['lName'].enable()
          this.infoForm.controls['fName'].enable()
          this.infoForm.controls['email'].enable()
        }
        */
        const instituteId = school?.institutionId;
        const query: QueryFn = (ref: CollectionReference) => ref.where('institutionId', '==', instituteId);

        this.classroomService.getWithQuery(query).pipe(take(1)).subscribe((res) => {
            this.allClasses = res;
            res.forEach((doc) => {
                this.gradeList.push(doc.grade);
            });
            const uniq: any = [...new Set(this.gradeList)];
            // const uniqSec: any = [...new Set(this.section)]
            this.gradeList = uniq.sort((a, b) => a - b);
            // this.section = uniqSec.sort((a, b) => a - b);
        });
    }

    onChangeGrade(event: MatSelectChange) {
        this.onClickGrade(event?.value);
    }

    onFocusoutName(controlName: string) {
        // trim spaces in form field
        const name: any = this.infoForm?.get(controlName)?.value;
        if (name && typeof (name) === 'string') {
            this.infoForm?.patchValue({
                [controlName]: name?.trim()
            });
            // if form patch value fails, then use set value
            // (this.infoForm?.get(controlName) as FormControl)?.setValue(name.trim());
        };
    }

    async saveNewBoard() {
        const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.infoForm, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
        [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
    }

    unlockFormSequentially(watch: string, unlock: string) {
        switch (watch) {
            case 'country':
                const countryName = this.infoForm?.get(watch)?.value;
                if (countryName) {
                    const internationalBoards = this.boardData?.boardsInternational;
                    const country = countryName?.includes(' ') ? countryName?.toLowerCase()?.replace(/\s/g, '-') : countryName?.toLowerCase();
                    this.teacherCountry = country;
                    this.countryBoard = internationalBoards?.[country];
                    // this.countryBoard = this.moveBoardToTop(internationalBoards?.[country], 'UKSSP');
                    this.isAddNewBoard = false;
                    this.infoForm?.get('pincode').enable();
                    this.infoForm?.get('board')?.disable();
                };
                this.infoForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res) {
                        const internationalBoards = this.boardData?.boardsInternational;
                        const countryName = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
                        this.teacherCountry = countryName;
                        this.countryBoard = internationalBoards?.[countryName];
                        // this.countryBoard = this.moveBoardToTop(internationalBoards?.[countryName], 'UKSSP');
                        this.isAddNewBoard = false;
                        this.infoForm?.get(unlock)?.reset();
                        this.infoForm?.get(unlock)?.enable();
                        this.infoForm?.get('board')?.disable();
                    };
                });
                break;

            case 'pincode':
                this.infoForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res && /^\d{4,6}|[\w\d]+( )|( - )[\w\d]+$/.test(res?.toString())) {
                        this.infoForm?.get(unlock)?.enable();
                        if (this.infoForm?.get(unlock)?.value) {
                            this.loadInstitutes();
                        };
                    };
                });
                break;

            case 'board':
                this.filteredBoards = this.infoForm?.get(watch)?.valueChanges?.pipe(startWith(''), map(value => this._filter(value)));
                break;

            case 'email':
                this.infoForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res && !this.disableGradeSelect()) {
                        this.infoForm?.get(unlock)?.enable();
                    }
                });
                break;

            default:
                this.infoForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res) {
                        this.infoForm?.get(unlock)?.enable();
                    }
                });
                break;
        };
    }

    private _filter(value: any): Array<any> {
        const boardName = this.getBoardName(value);
        return (this.countryBoard ?? []).filter((option: any) =>
            String(option?.name ?? '')
                .toLowerCase()
                .includes(String(boardName ?? '').toLowerCase())
        );
    }

    displayBoard = (boardCode: string): string =>
        // Use arrow function to ensure "this" context is preserved
        this.getBoardName(boardCode)
        ;

    private getBoardName(boardCode: string): string {
        const board: any = this.countryBoard?.find((b: any) => b?.code === boardCode);
        return board ? board?.name : boardCode;
    }

    moveBoardToTop(boardArray: any[], searchBoard: string) {
        const index = boardArray.findIndex(board => board.code === searchBoard);
        if (index !== -1) {
            const [item] = boardArray.splice(index, 1);
            boardArray.unshift(item);
            return boardArray;
        }
    }

    onDragStarted(): void {
        this.disableButtonClick = true;
    }

    onDragEnded(): void {
        // Delay resetting dragging to false to allow the link's click event to pass without triggering.
        setTimeout(() => {
            this.disableButtonClick = false;
        });
    }

    onLinkClick(event: MouseEvent): void {
        if (this.disableButtonClick) {
            event.preventDefault(); // Prevent link activation if a drag just occurred.
        }
    }


    compareInstitutions = (a: any, b: any): boolean => {
        if (!a || !b) return false;
        const aId = a.institutionId || a.docId || a.id;
        const bId = b.institutionId || b.docId || b.id;
        return aId === bId;
    };

    toggleInstitutionValidators() {
        if (!this.isCreatedInstitution) {
            this.infoForm.get('grade')?.setValidators([Validators.required]);
            this.infoForm.get('section')?.setValidators([Validators.required]);
            this.infoForm.get('programme')?.setValidators([Validators.required]);
        } else {
            this.infoForm.get('grade')?.clearValidators();
            this.infoForm.get('section')?.clearValidators();
            this.infoForm.get('programme')?.clearValidators();
        }
        this.infoForm.get('grade')?.updateValueAndValidity();
        this.infoForm.get('section')?.updateValueAndValidity();
        this.infoForm.get('programme')?.updateValueAndValidity();
    }

    toggleFormState() {
        const keepEnabled = ['fName', 'lName', 'email'];

        Object.keys(this.infoForm.controls).forEach(controlName => {
            const control = this.infoForm.get(controlName);

            if (this.isCreatedInstitution) {
                // Disable everything except firstName, lastName, email
                if (keepEnabled.includes(controlName)) {
                    control?.enable({ emitEvent: false });
                } else {
                    control?.disable({ emitEvent: false });
                }
            } else {
                // Enable everything (normal registration flow)
                control?.enable({ emitEvent: false });
            }
        });
    }

}
