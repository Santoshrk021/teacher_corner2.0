import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { BehaviorSubject, Subject, first, lastValueFrom, map, takeUntil } from 'rxjs';
import { serverTimestamp } from '@angular/fire/firestore';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { representativeEmailExistValidator, representativeEmailValidator, representativeNameExistValidator, representativeNameValidator, representativePhoneExistValidator, representativePhoneValidator } from './custom-validators/representativeValidators.directive';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { environment } from 'environments/environment';
import phone from 'phone';
import { UiService } from 'app/shared/ui.service';
import { Router } from '@angular/router';
import { SharedService } from 'app/shared/shared.service';
import { WorkflowTemplateService } from 'app/core/dbOperations/workflowTemplate/workflow-template.service';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { OneClickInstitution } from 'app/core/dbOperations/institutions/institution.type';

export interface names {
  firstName: string;
  lastName: string;
  fullNameLowerCase: string;
}
@Component({
  selector: 'app-school-create',
  templateUrl: './school-create.component.html',
  styleUrls: ['./school-create.component.scss']
})

export class SchoolCreateComponent implements OnInit, OnDestroy {

  /*
  // variables not currently in use
  boards = { 'KSEEB': 'Karnataka State Secondary Education Examination Board' }
  filteredMedium: any;
  boardList: any;
  classroomsAllBSub = new BehaviorSubject(null)
  */

  genderTypes = ['Boys', 'Girls', 'Co-ed'];
  typeofSchools;
  boardList: any;
  langList: any;
  schoolInfo: FormGroup;
  locationInfo: any;
  programmeBSub = new BehaviorSubject(null);
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  loginSpinner = false;
  invalidRepresentativePhoneMsg: string;
  representativePhoneExistErrorMsg: string;
  invalidRepresentativeNameMsg: string;
  representativeNameExistErrorMsg: string;
  invalidRepresentativeEmailMsg: string;
  representativeEmailExistErrorMsg: string;
  options: string[] = [];
  teacherCountry: string;
  teacherCountryCode: string;
  countryBoard: Array<string>;
  countryCodes: any;
  isAddNewBoard: boolean = false;
  isLoaded: boolean = false;
  boardData: any;
  institutionId: string;
  classroomId: string;
  programmeId: string;
  currentTeacherInfo: any;
  institutionCounter: number;
  classroomCounter: string | number;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private afAuth: AngularFireAuth,
    private classroomService: ClassroomsService,
    private configurationService: ConfigurationService,
    private dialogRef: MatDialogRef<SchoolCreateComponent>,
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private institutionService: InstitutionsService,
    private masterService: MasterService,
    private router: Router,
    private sharedService: SharedService,
    private teacherService: TeacherService,
    private uiService: UiService,
    private userService: UserService,
    private workflowTemplateService: WorkflowTemplateService,
    private programmeTemplateService: ProgrammeTemplateService
  ) {
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit(): Promise<void> {
    // get country details (board, country code, country)
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    this.getTypeOfInstitutions();
    this.getProgrammes();

    if (this.data?.pin) {
      this.locationInfo = await this.getInfoFromPin(this.data?.pin);
    }

    /*
    // old code
    this.configurationService.boardListSub.pipe(takeUntil(this._unsubscribeAll)).subscribe(res => {
      this.boardList = res?.filter(e=>e.code!=='ICSE')
      if (res == null) {
        this.configurationService.getBoardList('BoardListAll')
      }
    })
    */
    this.configurationService.languageListSub.pipe(takeUntil(this._unsubscribeAll)).subscribe((d) => {
      if (d == null) {
        this.configurationService.getLanguageList('Languages');
      }
      this.langList = d;
    });


    // this.schoolInfo = this.fb.group<Institute>({
    this.schoolInfo = this.fb.group({
      registrationNumber: [{ value: null, disabled: true },
      [Validators.required, Validators.minLength(4),
      Validators.pattern('^(?=.*[0-9])[0-9a-zA-Z]*$')]],
      institutionName: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('[A-Za-z "\']+[0-9]{0,2}')]],
      representativeEmail: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
      representativeFirstName: [{ value: null, disabled: true }, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
      representativeLastName: [{ value: null, disabled: true }, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
      representativeCountryCode: [''],
      representativePhoneNumber: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      institutiontype: 'school',
      institutionId: this.institutionService.generateRandomDocId(),
      institutionAddress: this.fb.group({
        street: [{ value: '', disabled: true }, Validators.required],
        village: [{ value: '', disabled: true }, Validators.required],
        landmark: [{ value: '', disabled: true }, Validators.required],
        city: [{ value: this.locationInfo?.Block || '', disabled: true }, Validators.required],
        subDistrict: [{ value: this.locationInfo?.Block || '', disabled: true }, Validators.required],
        district: [{ value: this.locationInfo?.District || '', disabled: true }, Validators.required],
        state: [{ value: this.locationInfo?.State || '', disabled: true }, Validators.required],
        country: [this.data?.country ? this.data?.country : ''],
        // pincode: [{ value: this.data?.pin ? this.data?.pin : "", disabled: this.data?.pin ? true : false }, [Validators.required, Validators.pattern("^[0-9]{6}")]],
        pincode: [{ value: this.data?.pin ? this.data?.pin : '', disabled: true }, [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
      }),
      creationDate: serverTimestamp(),
      lastUsedDate: serverTimestamp(),
      board: [{ value: this.data?.board ? this.data?.board : '', disabled: this.data?.board ? true : null }, Validators.required],
      medium: [{ value: null, disabled: true }, [Validators.required]],
      genderType: [{ value: '', disabled: true }, Validators.required],
      typeofSchool: [{ value: '', disabled: true }, Validators.required],
      institutionCreatorFirstName: [''],
      institutionCreatorLastName: [''],
      institutionCreatorEmail: [''],
      institutionCreatorCountryCode: [''],
      institutionCreatorPhoneNumber: ['']
    });

    /*
    // old code
    if(this.data?.parent !== 'registration') {
      // cannot enter own number as rep phone number
      const user = await this.afAuth.authState.pipe(first()).toPromise();
      this.schoolInfo?.get('representativePhone')?.addValidators(representativePhoneValidator(user.phoneNumber.slice(-10)));
      this.schoolInfo?.get('representativePhone')?.updateValueAndValidity({ emitEvent: false });
      this.invalidRepresentativePhoneMsg = `Enter the number of the school representative, not your own number`;
    } else {
      // cannot enter existing rep phone number
      this.schoolInfo.get('representativePhone').valueChanges.subscribe(async res => {
        const query: QueryFn = (ref: CollectionReference) => ref.where('representativePhone', '==', this.teacherCountryCode + res);
        const institutionPhones = await lastValueFrom(this.institutionService.getWithQuery(query).pipe(first()));

        this.schoolInfo?.get('representativePhone')?.addValidators(representativePhoneExistValidator(institutionPhones?.[0]?.representativePhoneNumber));
        this.schoolInfo?.get('representativePhone')?.updateValueAndValidity({ emitEvent: false });
        this.representativePhoneExistErrorMsg = `This number, ${this.teacherCountryCode + res} has already already belongs to the representative ${(institutionPhones?.[0]?.representativeFirstName + ' ' + institutionPhones?.[0]?.representativeLastName).trim()}, of the school “${institutionPhones?.[0]?.institutionName}” with PIN code ${institutionPhones?.[0]?.institutionAddress.pincode}`;
        /*
        this.institutionService.getWithQuery(query).pipe(takeUntil(this._unsubscribeAll)).subscribe(arr => {
          this.schoolInfo?.get('representativePhone')?.addValidators(representativePhoneExistValidator(arr?.[0]?.representativePhone));
          this.schoolInfo?.get('representativePhone')?.updateValueAndValidity({ emitEvent: false });
          this.representativePhoneExistErrorMsg = `This number, ${this.teacherCountryCode + res} has already already belongs to the representative ${arr[0].representativeName}, of the school “${arr[0].institutionName}” with PIN code ${arr[0].institutionAddress.pincode}`;
        });
        //
      });
    }
    */

    const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.schoolInfo, this.isLoaded, this.data);
    [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

    const watchList = [
      'institutionAddress.country',
      'board',
      'registrationNumber',
      'institutionName',
      'medium',
      'typeofSchool',
      'genderType',
      'institutionAddress.pincode',
      'institutionAddress.street',
      'institutionAddress.village',
      'institutionAddress.landmark',
      'institutionAddress.city',
      'institutionAddress.subDistrict',
      'institutionAddress.district',
      'institutionAddress.state',
      'representativePhoneNumber',
      'representativeFirstName',
      'representativeLastName'
    ];

    const unlockList = [
      'board',
      'registrationNumber',
      'institutionName',
      'medium',
      'typeofSchool',
      'genderType',
      'institutionAddress.pincode',
      'institutionAddress.street',
      'institutionAddress.village',
      'institutionAddress.landmark',
      'institutionAddress.city',
      'institutionAddress.subDistrict',
      'institutionAddress.district',
      'institutionAddress.state',
      'representativePhoneNumber',
      'representativeFirstName',
      'representativeLastName',
      'representativeEmail'
    ];

    for (let i = 0; i < watchList.length; i++) {
      this.unlockFormSequentially(watchList[i], unlockList[i]);
    }

    // validate representativeEmail
    this.onEmailValueChanges();
    this.phoneOnValueChanges();
    /*
    // old code
    if(this.data?.parent !== 'institutions-list') {
      this.schoolInfo?.get('institutionAddress.country')?.disable();
      this.schoolInfo?.get('board')?.disable();
      this.schoolInfo?.get('registrationNumber')?.enable();
    } else {
      this.schoolInfo?.get('institutionAddress.country')?.valueChanges?.subscribe(async res => {
        if(res) {
          const internationalBoards = this.boardData?.boardsInternational;
          const country = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
          this.teacherCountryCode = this.countryCodes?.[res]?.phone;
          this.countryBoard = internationalBoards?.[country];
          this.isAddNewBoard = false;
        }
      });
    }
    if (this.router.url.includes('registration')) {
      this.phoneOnValueChanges()
    }
    */

    this.teacherService.currentTeacher.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.currentTeacherInfo = res;
    });

  }

  onEmailValueChanges() {
    this.schoolInfo.get('representativeEmail').valueChanges.subscribe(async (res) => {
      if (res.length) {
        if (this.data?.parent == 'registration') {
          // cannot enter own name as rep name
          const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
          // const userEmail = await lastValueFrom(this.userService.getUser(user.uid));
          const userEmail = await lastValueFrom(this.teacherService.getWithId(user.uid));
          if (userEmail) {
            this.schoolInfo?.get('representativeEmail')?.addValidators(representativeEmailValidator(userEmail.teacherMeta.email));
            this.schoolInfo?.get('representativeEmail')?.updateValueAndValidity({ emitEvent: false });
            this.invalidRepresentativeEmailMsg = 'Enter the email of the school representative, not your own email';
          }
        }
        // cannot enter existing rep email
        const query: QueryFn = (ref: CollectionReference) => ref.where('representativeEmail', '==', res);
        const institutionEmails = await lastValueFrom(this.institutionService.getWithQuery(query));

        if (institutionEmails?.length) {
          this.schoolInfo?.get('representativeEmail')?.addValidators(representativeEmailExistValidator(institutionEmails?.[0]?.representativeEmail));
          this.schoolInfo?.get('representativeEmail')?.updateValueAndValidity({ emitEvent: false });
          this.representativeEmailExistErrorMsg = `This email, ${res} is already registered to the school representative “${institutionEmails?.[0]?.representativeFirstName} ${institutionEmails?.[0]?.representativeLastName}” of the school “${institutionEmails?.[0]?.institutionName}” with PIN code ${institutionEmails?.[0]?.institutionAddress?.pincode}`;
        }
      };
    });
  }

  getTypeOfInstitutions() {
    this.configurationService.getTypeOfInstitutionsByGet().subscribe((res) => {
      this.typeofSchools = res.data().names;
    });
  }

  async checkRepresentativeProfile(classroomsInfo: Array<any>) {
    // remove the workflow Ids from classrooms' programmes
    classroomsInfo.map((classroom) => {
      const { programmes, ...others } = classroom;
      return {
        ...others,
        programmes: programmes.map((programme) => {
          programme.hasOwnProperty('workflowIds') ? delete programme.workflowIds : programme;
        })
      };
    });

    const countryCode = this.schoolInfo?.get('representativeCountryCode')?.value;
    const phoneNumber = this.schoolInfo?.get('representativePhoneNumber')?.value;
    const query: QueryFn = (ref: CollectionReference) => ref.where('teacherMeta.countryCode', '==', countryCode).where('teacherMeta.phoneNumber', '==', phoneNumber);

    const teacher = await lastValueFrom(this.teacherService.getWithQuery(query).pipe(first()));
    if (teacher.length) {
      this.updateRepresentativeProfile(teacher[0].teacherMeta, classroomsInfo);
    } else {
      //  await this.createRepresentativeProfile(classroomsInfo);
      const representativeProfile = await this.createRepresentativeProfile(classroomsInfo);
    }
    /*
    // old code
    this.teacherService.getWithQuery(query).pipe(takeUntil(this._unsubscribeAll)).subscribe(res => {
      if (res.length) {
        this.updateRepresentativeProfile(res[0].teacherMeta, classroomsInfo)
      }
      else {
        this.createRepresentativeProfile(classroomsInfo)
      }
    })
    */
  }

  /*
  // old code
  defaultClassrooms() {
    let classArr = []
    this.configurationService.getClassrooms().pipe(takeUntil(this._unsubscribeAll)).subscribe(res => {
      const classConfig = res.defaults.CBSE
      const programmeConfig = this.programmeBSub.value
      const classIds = Object.keys(classConfig)
      classIds.forEach(id => {
        classArr.push(
          {
            classroomId: classConfig[id]['classroomId'],
            classroomName: classConfig[id]['classroomName'],
            activeStatus: true,
            institutionId: this.schoolInfo.get('institutionId').value,
            institutionName: this.schoolInfo.get('institutionName').value,
            joinedDate: serverTimestamp(),
            programmes: [programmeConfig[id]],
            grade:Number(classConfig[id]['classroomName'].split(' ')[0])
          }
        )
      })
      this.classroomsAllBSub.next(classArr)
    })
  }
  */

  async createRepresentativeProfile(classroomsInfo) {
    const name = this.deconstructName();
    const userDetailsWithClassroom = {
      isBulkUpload: false,
      isTeacher: true,
      firstName: name.firstName,
      lastName: name.lastName,
      fullNameLowerCase: name.fullNameLowerCase,
      countryCode: this.schoolInfo.get('representativeCountryCode').value,
      phoneNumber: this.schoolInfo.get('representativePhoneNumber').value,
      email: this.schoolInfo.get('representativeEmail').value,
      teacherClassrooms: classroomsInfo,
    };

    // this.addUsers(userDetailsWithClassroom);
    return await this.addUsers(userDetailsWithClassroom);
  }

  phoneOnValueChanges() {
    this.schoolInfo.get('representativePhoneNumber').valueChanges.subscribe((res) => {
      if (res.length === 10 && this.data?.parent == 'registration') {
        const query: QueryFn = (ref: CollectionReference) =>
          ref.where('representativePhoneNumber', '==', res);

        this.institutionService.getWithQuery(query).pipe(takeUntil(this._unsubscribeAll)).subscribe((arr) => {
          if (arr?.length) {
            this.schoolInfo?.get('representativePhoneNumber')?.addValidators(representativePhoneExistValidator(arr?.[0]?.representativePhoneNumber));
            this.schoolInfo?.get('representativePhoneNumber')?.updateValueAndValidity({ emitEvent: false });
            this.representativePhoneExistErrorMsg = `This number, ${res} has already already belongs to the representative ${(arr[0].representativeFirstName + ' ' + arr[0].representativeLastName).trim()}, of the school “${arr[0].institutionName}” with PIN code ${arr[0].institutionAddress.pincode}`;
          }
        });
      }
    });
  }

  deconstructName(): names {
    const firstName = this.schoolInfo?.get('representativeFirstName')?.value?.toString()?.trim();
    const lastName = this.schoolInfo?.get('representativeLastName')?.value?.toString()?.trim();
    const fullNameLowerCase = (firstName + lastName).toLowerCase().replace(/ /g, '');
    return {
      firstName: firstName, lastName: lastName, fullNameLowerCase: fullNameLowerCase
    };
  }

  async addUsers(userClassroom) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/users_add_into_classrooms_v2`;

    const formData = {
      userClassroomDetails: userClassroom
    };

    const httpOption: any = {
      responseType: 'application/json'
    };

    await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().catch((error) => {
      console.error(error);
    });
  }

  updateRepresentativeProfile(teacherInfo, classroomsInfo) {
    const userDetailsWithClassroom = {
      isBulkUpload: false,
      isTeacher: true,
      firstName: teacherInfo.firstName,
      lastName: teacherInfo.lastName,
      fullNameLowerCase: teacherInfo.fullNameLowerCase,
      countryCode: teacherInfo.countryCode,
      phoneNumber: teacherInfo.phoneNumber,
      email: teacherInfo.email,
      teacherClassrooms: classroomsInfo,
    };

    this.addUsers(userDetailsWithClassroom);
  }
  // old code
  // async onSubmit(form: FormGroup) {
  //   const institutionCounter = await this.getCorrectInstitutionCounter();
  //   this.loginSpinner = true;
  //   // this.defaultClassrooms()
  //   const name = this.schoolInfo.get('institutionName').value;
  //   const id = this.schoolInfo.get('institutionId').value;
  //   const board = this.schoolInfo.get('board').value;
  //   const typeofschool = this.schoolInfo.get('typeofSchool').value;

  //   this._unsubscribeAll.next(null);
  //   this._unsubscribeAll.complete();

  //   this.schoolInfo.patchValue({
  //     'institutionName': name,
  //   });

  //   const schoolObj = form.getRawValue();
  //   schoolObj.institutionCode = institutionCounter;
  //   const { countryCode, phoneNumber } = await this.userService.getPhone();
  //   schoolObj['institutionCreatorCountryCode'] = countryCode;
  //   schoolObj['institutionCreatorPhoneNumber'] = phoneNumber;
  //   const teacherRef = await lastValueFrom(this.teacherService.getTeacherNameByPhone(countryCode, phoneNumber));
  //   if (teacherRef.empty) {
  //     schoolObj['institutionCreatorFirstName'] = this.schoolInfo.get('representativeFirstName').value;
  //     schoolObj['institutionCreatorLastName'] = this.schoolInfo.get('representativeLastName').value;
  //     schoolObj['institutionCreatorName'] = this.schoolInfo.get('representativeFirstName').value + ' ' + this.schoolInfo.get('representativeLastName').value;
  //     schoolObj['institutionCreatorEmail'] = this.schoolInfo.get('representativeEmail').value;
  //   } else {
  //     const { firstName, lastName, email } = await teacherRef.docs[0].get('teacherMeta');
  //     schoolObj['institutionCreatorFirstName'] = firstName;
  //     schoolObj['institutionCreatorLastName'] = lastName;
  //     schoolObj['institutionCreatorName'] = firstName + ' ' + lastName;
  //     schoolObj['institutionCreatorEmail'] = email;
  //   }
  //   schoolObj['representativeName'] = schoolObj['representativeFirstName'] + ' ' + schoolObj['representativeLastName'];
  //   schoolObj['board'] = board;
  //   schoolObj['typeofSchool'] = typeofschool;
  //   schoolObj['createdSource'] = this.data?.createdSource;
  //   schoolObj['classroomCounter'] = 10;

  //   const masterInstituteDoc = {
  //     board: board,
  //     createdSource: 'teacher-corner-self-registration',
  //     creationDate: schoolObj.creationDate,
  //     docId: id,
  //     institutionCode: schoolObj.institutionCode,
  //     institutionCreatorCountryCode: schoolObj.institutionCreatorCountryCode,
  //     institutionCreatorEmail: schoolObj.institutionCreatorEmail,
  //     institutionCreatorName: schoolObj.institutionCreatorFirstName + ' ' + schoolObj.institutionCreatorLastName,
  //     institutionCreatorPhoneNumber: schoolObj.institutionCreatorPhoneNumber,
  //     institutionName: schoolObj.institutionName,
  //     pincode: schoolObj['institutionAddress']['pincode'],
  //     registrationNumber: schoolObj.registrationNumber,
  //     representativeCountryCode: schoolObj.representativeCountryCode,
  //     representativeEmail: schoolObj.representativeEmail,
  //     representativeName: schoolObj.representativeName,
  //     representativePhoneNumber: schoolObj.representativePhoneNumber,
  //     typeofSchool: schoolObj.typeofSchool,
  //     verificationStatus: false,
  //   };

  //   this.configurationService.incrementInstitutionCounter(institutionCounter);

  //   const slackBearerToken = environment.slackNotifications.newInstitution.slackBearerToken;
  //   const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
  //   // const slackChannel = ['team-tech-home-internal'];
  //   const institutionCreatorName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
  //   const messageContent = `A new institution '${masterInstituteDoc.institutionName}' has been created in Firebase project '${environment.firebase.projectId}' by '${institutionCreatorName}'.`;
  //   const slackChannel = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.newInstitution.slackChannels);
  //   // return;


  //   const createInstitutionMaster = this.masterService.addNewObjectToMasterMap('INSTITUTE', 'institutionNames', masterInstituteDoc);
  //   schoolObj['masterDocId'] = await createInstitutionMaster;
  //   const createInstitution = this.institutionService.createWithId(schoolObj, id);

  //   const classes = this.createClassrooms(schoolObj);

  //   this.checkRepresentativeProfile(classes);

  //   const formData = {
  //     countryCode: schoolObj.representativeCountryCode,
  //     phoneNumber: schoolObj.representativePhoneNumber,
  //     email: schoolObj.representativeEmail,
  //     firstName: schoolObj.representativeFirstName,
  //     lastName: schoolObj.representativeLastName,
  //     isSchoolRepresentative: true,
  //   };

  //   const httpOption: any = {
  //     responseType: 'application/json'
  //   };

  //   const addUserUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_users_and_get_firebase_login_token_from_phone`;
  //   // const addUserUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/add_users_and_get_firebase_login_token_from_phone`;

  //   const addUser = this.httpClient.post<any>(addUserUrl, formData, httpOption).toPromise();

  //   const sendWaNotifications = this.sendWaNotifications(schoolObj);

  //   const promiseArray = classes.concat(createInstitution, createInstitutionMaster, addUser, sendWaNotifications);

  //   try {
  //     await Promise.all(promiseArray);
  //     this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, slackChannel, messageContent);
  //     if (this.data?.parent === 'registration') {
  //       const repCountryCode = this.schoolInfo?.get('representativeCountryCode')?.value;
  //       const repPhone = this.schoolInfo?.get('representativePhoneNumber')?.value;
  //       const query: QueryFn = (ref: CollectionReference) => ref.where('teacherMeta.countryCode', '==', repCountryCode).where('teacherMeta.phoneNumber', '==', repPhone);
  //       this.teacherService.getWithQuery(query).subscribe((res) => {
  //         if (res?.length) {
  //           this.router.navigate([`dashboard/${this.classroomId}`], { queryParams: { institutionId: this.institutionId, classroomId: this.classroomId, programmeId: this.programmeId } });
  //         };
  //       });

  //     } else {
  //       this.uiService.alertMessage('Successful', `${name} successfully created`, 'success');
  //       this.dialogRef.close();
  //     };
  //   } catch (error) {
  //     this.uiService.alertMessage('Error', 'An error occurred while creating the institution', 'error');
  //     console.error(error);
  //   };
  // }


  // async onSubmit2(form: FormGroup) {
  //   this.loginSpinner = true;
  //   const name = this.schoolInfo.get('institutionName')?.value;
  //   const id = this.schoolInfo.get('institutionId')?.value;
  //   const board = this.schoolInfo.get('board')?.value;
  //   const typeofschool = this.schoolInfo.get('typeofSchool')?.value;

  //   this._unsubscribeAll.next(null);
  //   this._unsubscribeAll.complete();

  //   const schoolObj = {
  //     ...form.getRawValue(),
  //     institutionCode: await this.getCorrectInstitutionCounter(),
  //     board,
  //     typeofSchool: typeofschool,
  //     createdSource: this.data?.createdSource,
  //     classroomCounter: 10,
  //   };

  //   const { countryCode, phoneNumber } = await this.userService.getPhone();
  //   Object.assign(schoolObj, {
  //     institutionCreatorCountryCode: countryCode,
  //     institutionCreatorPhoneNumber: phoneNumber,
  //   });

  //   const teacherMeta = await this.getTeacherMeta(countryCode, phoneNumber);
  //   Object.assign(schoolObj, teacherMeta);

  //   schoolObj.representativeName = `${schoolObj.representativeFirstName} ${schoolObj.representativeLastName}`;

  //   const masterInstituteDoc = this.buildMasterInstituteDoc(schoolObj, id);

  //   // Update institution counter
  //   this.configurationService.incrementInstitutionCounter(schoolObj.institutionCode);

  //   const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
  //   const institutionCreatorName = slackUsers?.[0]?.profile?.display_name || teacherName || 'unknown';
  //   const slackChannel = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.newInstitution.slackChannels);
  //   const slackMessage = `A new institution '${masterInstituteDoc.institutionName}' has been created in Firebase project '${environment.firebase.projectId}' by '${institutionCreatorName}'.`;

  //   // Async Operations
  //   const [masterDocId] = await Promise.all([
  //     this.masterService.addNewObjectToMasterMap('INSTITUTE', 'institutionNames', masterInstituteDoc),
  //   ]);
  //   schoolObj.masterDocId = masterDocId;

  //   const createInstitution = this.institutionService.createWithId(schoolObj, id);
  //   const classes = this.createClassrooms(schoolObj);
  //   await this.checkRepresentativeProfile(classes);

  //   const addUser = this.addUserRequest(schoolObj);
  //   const sendWaNotifications = this.sendWaNotifications(schoolObj);

  //   try {
  //     await Promise.all([...classes, createInstitution, addUser, sendWaNotifications]);

  //     // Send Slack Notification if not from registration
  //     if (this.data?.parent !== 'registration') {
  //       this.sharedService.sendSlackNotifications(
  //         environment.slackNotifications.newInstitution.slackBearerToken,
  //         slackUsers,
  //         slackChannel,
  //         slackMessage
  //       );
  //     }

  //     await this.handlePostCreationFlow(schoolObj, name);

  //   } catch (error) {
  //     this.uiService.alertMessage('Error', 'An error occurred while creating the institution', 'error');
  //     console.error(error);
  //   }
  // }


  async onSubmit(form: FormGroup) {
    this.loginSpinner = true;
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();

    // Gather basic school info
    const name = this.schoolInfo.get('institutionName')?.value;
    const id = this.schoolInfo.get('institutionId')?.value;
    const board = this.schoolInfo.get('board')?.value;
    const typeofschool = this.schoolInfo.get('typeofSchool')?.value;

    // Build school object
    const schoolObj = {
      ...form.getRawValue(),
      institutionCode: await this.getCorrectInstitutionCounter(),
      board,
      typeofSchool: typeofschool,
      createdSource: this.data?.createdSource,
      classroomCounter: 10,
    };

    // Add creator info
    const { countryCode, phoneNumber } = await this.userService.getPhone();
    Object.assign(schoolObj, {
      institutionCreatorCountryCode: countryCode,
      institutionCreatorPhoneNumber: phoneNumber,
    });
    const teacherMeta = await this.getTeacherMeta(countryCode, phoneNumber);
    Object.assign(schoolObj, teacherMeta);
    schoolObj.representativeName = `${schoolObj.representativeFirstName} ${schoolObj.representativeLastName}`;

    // Build master doc
    // const masterInstituteDoc = this.buildMasterInstituteDoc(schoolObj, id);

    // Update institution counter
    this.configurationService.incrementInstitutionCounter(schoolObj.institutionCode);

    // --- PROGRAMME TEMPLATES LOGIC FOR BOARD ONLY ---
    // Fetch all programme templates and filter by board
    // const allProgrammeTemplates: any[] = await lastValueFrom(
    //     this.programmeTemplateService.getAllProgrammeTemplates().pipe(first())
    // );

    // console.log(allProgrammeTemplates, '<--- All Programme Templates');
    // const programmeTemplates = allProgrammeTemplates.filter(
    //     (template: any) => template.board === board
    // );

    // console.log(programmeTemplates, '<--- Programme Templates');
    // Fetch default workflow template
    const defaultWorkflowTemplate = await lastValueFrom(
      this.workflowTemplateService.getWorkFlowTemplateById('9aifopMbhpR4Jr5oPHm9').pipe(first())
    );


    // Build final object for cloud function
    const finalObject: OneClickInstitution = {
      institution: schoolObj,
      classrooms: { classInfoArray: [] }, // or your classroom info if any
      defaultWorkflowTemplate,
      programmeTemplates: [],
      createdSource: this.data?.createdSource,
      operation: 'create',
      component: 'SchoolCreateComponent'
    };

    // return;
    // Slack notification setup
    const slackBearerToken = environment.slackNotifications.newInstitution.slackBearerToken;
    const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
    const institutionCreatorName = slackUsers?.[0]?.profile?.display_name || teacherName || 'unknown';
    const slackChannel = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.newInstitution.slackChannels);
    const slackMessage = `A new institution '${finalObject.institution.institutionName}' has been created in Firebase project '${environment.firebase.projectId}' by '${institutionCreatorName}'.`;



    // Send to cloud function
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/manage_one_click_institution`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/manage_one_click_institution`;
    // const endUrl = `http://127.0.0.1:5001/${environment.firebase.projectId}/asia-south1/manage_one_click_institution`;

    try {
      const response = await this.sharedService.sendToCloudFunction(endUrl, finalObject);
      if (response?.status?.includes('Success')) {
        this.uiService.alertMessage('Successful', 'Institution set-up successfully complete', 'success');
        this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, slackChannel, slackMessage);
        // this.dialogRef.close();
      } else {
        this.uiService.alertMessage('Failed', 'Error setting up institution', 'error');
        console.error('Error setting up institution', response);
      }
      //  await this.handlePostCreationFlow(schoolObj, name);
      this.dialogRef.close(schoolObj);
    } catch (error) {
      this.uiService.alertMessage('Deleted', 'Error setting up institution', 'error');
      console.error('Error setting up institution', error);
    } finally {
      this.loginSpinner = false;
    }
  }

  private async getTeacherMeta(countryCode: string, phoneNumber: string) {
    const teacherRef = await lastValueFrom(this.teacherService.getTeacherNameByPhone(countryCode, phoneNumber));
    if (teacherRef.empty) {
      return {
        institutionCreatorFirstName: this.schoolInfo.get('representativeFirstName')?.value,
        institutionCreatorLastName: this.schoolInfo.get('representativeLastName')?.value,
        institutionCreatorName: `${this.schoolInfo.get('representativeFirstName')?.value} ${this.schoolInfo.get('representativeLastName')?.value}`,
        institutionCreatorEmail: this.schoolInfo.get('representativeEmail')?.value,
      };
    }

    const meta = teacherRef.docs[0].get('teacherMeta');
    return {
      institutionCreatorFirstName: meta.firstName,
      institutionCreatorLastName: meta.lastName,
      institutionCreatorName: `${meta.firstName} ${meta.lastName}`,
      institutionCreatorEmail: meta.email,
    };
  }

  private buildMasterInstituteDoc(schoolObj: any, docId: string) {
    return {
      board: schoolObj.board,
      createdSource: schoolObj.createdSource,
      creationDate: schoolObj.creationDate,
      docId,
      institutionCode: schoolObj.institutionCode,
      institutionCreatorCountryCode: schoolObj.institutionCreatorCountryCode,
      institutionCreatorEmail: schoolObj.institutionCreatorEmail,
      institutionCreatorName: schoolObj.institutionCreatorName,
      institutionCreatorPhoneNumber: schoolObj.institutionCreatorPhoneNumber,
      institutionName: schoolObj.institutionName,
      pincode: schoolObj?.institutionAddress?.pincode,
      registrationNumber: schoolObj.registrationNumber,
      representativeCountryCode: schoolObj.representativeCountryCode,
      representativeEmail: schoolObj.representativeEmail,
      representativeName: schoolObj.representativeName,
      representativePhoneNumber: schoolObj.representativePhoneNumber,
      typeofSchool: schoolObj.typeofSchool,
      verificationStatus: false,
    };
  }

  private addUserRequest(schoolObj: any) {
    const formData = {
      countryCode: schoolObj.representativeCountryCode,
      phoneNumber: schoolObj.representativePhoneNumber,
      email: schoolObj.representativeEmail,
      firstName: schoolObj.representativeFirstName,
      lastName: schoolObj.representativeLastName,
      isSchoolRepresentative: true,
    };

    const addUserUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_users_and_get_firebase_login_token_from_phone`;
    const httpOption: any = { responseType: 'application/json' };
    return this.httpClient.post<any>(addUserUrl, formData, httpOption).toPromise();
  }

  private async handlePostCreationFlow(schoolObj: any, name: string) {
    if (this.data?.parent === 'registration') {
      const creatorQuery: QueryFn = ref =>
        ref.where('teacherMeta.countryCode', '==', schoolObj.institutionCreatorCountryCode)
          .where('teacherMeta.phoneNumber', '==', schoolObj.institutionCreatorPhoneNumber);

      const repQuery: QueryFn = ref =>
        ref.where('teacherMeta.countryCode', '==', this.schoolInfo.get('representativeCountryCode')?.value)
          .where('teacherMeta.phoneNumber', '==', this.schoolInfo.get('representativePhoneNumber')?.value);

      try {
        const [creatorRes, repRes] = await Promise.all([
          lastValueFrom(this.teacherService.getWithQuery(creatorQuery).pipe(first())),
          lastValueFrom(this.teacherService.getWithQuery(repQuery).pipe(first())),
        ]);

        if (repRes?.length > 0) {
          if (creatorRes?.length > 0) {
            this.institutionId = creatorRes[0].institutionId;
            this.classroomId = creatorRes[0].classroomId;
            this.programmeId = creatorRes[0].programmes?.[0]?.programmeId || null;

            return this.router.navigate([`dashboard/${this.classroomId}`], {
              queryParams: {
                institutionId: this.institutionId,
                classroomId: this.classroomId,
                programmeId: this.programmeId
              },
              replaceUrl: true
            });
          } else {
            this.uiService.alertMessage('Successful', `${name} successfully created`, 'success');
            return this.dialogRef.close(schoolObj);
          }
        } else {
          this.uiService.alertMessage('Error', 'School creation failed: No representative teacher account found.', 'error');
          this.dialogRef.close();
          return;
        }

      } catch (error) {
        this.uiService.alertMessage('Error', 'Failed to check teacher accounts.', 'error');
        console.error(error);
      }
    } else {
      this.uiService.alertMessage('Successful', `${name} successfully created`, 'success');
      this.dialogRef.close(schoolObj);
    }
  }

  async getCorrectInstitutionCounter(): Promise<string> {
    const institutionCounter = await lastValueFrom(this.configurationService.getInstitutionCounter());

    const masterInstitutionsCount = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames').pipe(
      first(),
      map((institutions: any) => institutions.map((institution: any) => parseInt(institution.institutionCode)))
    ));

    const masterInstitutionsMaxCount = Math.max(...masterInstitutionsCount);

    return institutionCounter < masterInstitutionsMaxCount ? `${await this.checkInstitutionCode(masterInstitutionsMaxCount) + 1}` : `${institutionCounter + 1}`;
  }

  async checkInstitutionCode(masterInstitutionMaxCount: any): Promise<number> {
    const queryResult = await lastValueFrom(
      this.institutionService.getInstitutionByInstitutionCode((parseInt(masterInstitutionMaxCount) + 1).toString())
    );

    if (queryResult.empty) {
      return masterInstitutionMaxCount;
    } else {
      console.error('Institution code already exists. Adding one to code and checking again');
      return await this.checkInstitutionCode(masterInstitutionMaxCount + 1);
    };
  }

  createClassrooms(schoolInfo) {
    const classes = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const classArr = [];
    const programmes = this.programmeBSub.value;
    classes.forEach(async (cls, index) => {
      const id = this.configurationService.getRandomDocId();
      const pr = programmes[`${cls}-Science`];
      const classObj = {
        board: schoolInfo.board,
        classroomCode: `${index + 1}`.padStart(3, '0'),
        classroomId: id,
        classroomName: `${cls} A`,
        creationDate: serverTimestamp(),
        docId: id,
        grade: cls,
        institutionId: schoolInfo.institutionId,
        institutionName: schoolInfo.institutionName,
        programmes: {
          [pr.programmeId]: pr
        },
        section: 'A',
        studentCounter: 0,
        studentCredentialStoragePath: '',
        type: 'CLASSROOM'
      };
      const classObjForRepresentative = {
        board: schoolInfo.board,
        classroomCode: `${(parseInt(schoolInfo.classroomCounter) ?? 0) + index + 1}`.padStart(3, '0'),
        classroomId: id,
        classroomName: `${cls} A`,
        creationDate: serverTimestamp(),
        docId: id,
        grade: cls,
        institutionId: schoolInfo.institutionId,
        institutionName: schoolInfo.institutionName,
        programmes: [pr],
        section: 'A',
        studentCounter: 0,
        studentCredentialStoragePath: '',
        type: 'CLASSROOM',
      };
      classArr.push(classObjForRepresentative);

      this.institutionId = classObjForRepresentative.institutionId;
      this.classroomId = classArr[0].classroomId;
      this.programmeId = Object.keys(classObj.programmes)[0];

      const updateClasroomMaster = await this.masterService.addNewObjectToMasterMap('CLASSROOM', 'classrooms', classObj);
      classObj['masterDocId'] = await updateClasroomMaster;
      const updateClasroom = await this.classroomService.update(classObj, id);
      return [updateClasroom, updateClasroomMaster];
    });

    return classArr;
  }

  async sendWaNotifications(schInfo) {
    const phoneNumber = schInfo?.representativeCountryCode + schInfo?.representativePhoneNumber;
    const templateName = environment.whatsAppTemplates.institutionCreation.templateName;
    const headerImage = environment.whatsAppTemplates.institutionCreation.headerImage;
    const mediaType = 'text';
    const params = [
      schInfo?.representativeFirstName + ' ' + schInfo?.representativeLastName,
      schInfo.institutionName
    ];
    const urlRoute = undefined;

    this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);
  }

  async getInfoFromPin(pin) {
    // let doc = this.httpClient.get(`https://api.postalpincode.in/pincode/${pin}`)
    const doc = this.httpClient.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${pin}&key=${environment.gmapApiKey}`);
    const ref = lastValueFrom(doc);
    const value: any = await ref;
    const options = value?.results?.[0]?.postcode_localities || value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('route') || item?.types?.includes('sublocality'))?.[0]?.long_name;
    this.options = typeof (options) === 'string' ? [options] : options;
    let country: string;
    if (this.data?.country) {
      country = this.data?.country;
    } else {
      country = this.schoolInfo?.get('institutionAddress.country')?.value;
    };
    const pinCountry = value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('country'))?.[0]?.long_name.toLowerCase();
    let addressObj: any;
    if (country === pinCountry) {
      addressObj = {
        // Name:       '',
        Block: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('locality') || item?.types?.includes('postal_town'))?.[0]?.long_name,
        District: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('administrative_area_level_2') || item?.types?.includes('administrative_area_level_3') || item?.types?.includes('postal_town'))?.[0]?.long_name,
        State: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('administrative_area_level_1'))?.[0]?.long_name,
        Country: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('country'))?.[0]?.long_name,
        /*
        Block:      value?.results?.[0]?.address_components?.[2]?.long_name,
        District:   value?.results?.[0]?.address_components?.[3]?.long_name,
        State:      value?.results?.[0]?.address_components?.[4]?.long_name,
        Country:    value?.results?.[0]?.address_components?.[5]?.long_name,
        */
      };
    } else {
      addressObj = {
        // Name:       '',
        Block: '',
        District: '',
        State: '',
        Country: '',
      };
    }
    // return value[0].PostOffice[0]
    return addressObj;
  }

  async getProgrammes() {
    this.configurationService.getProgrammesWithWorkflow().pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.programmeBSub.next(res.defaults.defaultProgramme);
    });
  }

  async onFocusoutName(controlName: string) {
    // trim spaces in form field
    const name: any = this.schoolInfo?.get(controlName)?.value;
    if (name && typeof (name) === 'string') {
      this.schoolInfo?.patchValue({
        [controlName]: name?.trim()
      });
      // if form patch value fails, then use set value
      // (this.schoolInfo?.get(controlName) as FormControl)?.setValue(name.trim());
    };
    // check if representative name matches current user
    if (name && controlName === 'representativeLastName') {
      const fullNameLowerCase = (this.schoolInfo?.get('representativeFirstName')?.value + name).toLowerCase().replace(/ /g, '');
      if (this.currentTeacherInfo?.teacherMeta?.fullNameLowerCase == fullNameLowerCase) {
        this.schoolInfo?.get(controlName).setErrors({ 'duplicateNameError': true });
      }
      else {
        this.schoolInfo?.get(controlName).setErrors({ 'duplicateNameError': null });
        this.schoolInfo?.get(controlName).updateValueAndValidity({ emitEvent: false });
      }
    };
    // check if representative phone number valid
    if (name && controlName === 'representativePhoneNumber') {
      const inputValue = this.schoolInfo?.get(controlName)?.value;
      const ph = this.teacherCountryCode + inputValue;
      const isValid = phone(ph).isValid;
      if (!isValid && inputValue) {
        this.schoolInfo?.get(controlName)?.setErrors({ 'notMobileNo': true });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      } else {
        this.schoolInfo?.get(controlName)?.setErrors({ 'notMobileNo': null });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      };
    };
    // check if representative email matches current user
    if (name && controlName === 'representativeEmail') {
      const email = this.schoolInfo?.get(controlName)?.value;
      if (this.currentTeacherInfo?.teacherMeta?.email === email) {
        this.schoolInfo?.get(controlName)?.setErrors({ 'duplicateEmailError': true });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      }
      else {
        this.schoolInfo?.get(controlName)?.setErrors({ 'duplicateEmailError': null });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      };
    };
  }

  /*
  validatePhone(event) {
    const inputValue = event.target.value;
    const ph = this.teacherCountryCode + inputValue;
    const isValid = phone(ph).isValid
    if (!isValid && inputValue) {
      this.schoolInfo.controls['representativePhone'].setErrors({ 'notMobileNo': true });
    }
    else {
      this.schoolInfo.controls['representativePhone'].setErrors({ 'notMobileNo': null });
      this.schoolInfo.controls['representativePhone'].updateValueAndValidity();
    }
  }
  */

  async saveNewBoard() {
    const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.schoolInfo, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
    [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
  }

  async unlockFormSequentially(watch: string, unlock: string) {
    switch (watch) {
      case 'institutionAddress.country':
        const countryName = this.schoolInfo?.get(watch)?.value;
        if (countryName) {
          const internationalBoards = this.boardData?.boardsInternational;
          const country = countryName?.includes(' ') ? countryName?.toLowerCase()?.replace(/\s/g, '-') : countryName?.toLowerCase();
          this.teacherCountry = country;
          this.teacherCountryCode = this.countryCodes?.[country]?.phone;
          this.schoolInfo?.get('representativeCountryCode')?.setValue(this.teacherCountryCode);
          this.countryBoard = internationalBoards?.[country];
          this.isAddNewBoard = false;
        };
        if (this.data?.parent !== 'institutions-list') {
          this.schoolInfo?.get(watch)?.disable();
          this.schoolInfo?.get(unlock)?.disable();
          this.schoolInfo?.get('registrationNumber')?.enable();
        } else {
          this.schoolInfo?.get(watch)?.valueChanges?.subscribe(async (res) => {
            if (res) {
              const internationalBoards = this.boardData?.boardsInternational;
              const country = this.teacherCountry = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
              this.teacherCountryCode = this.countryCodes?.[res]?.phone;
              this.teacherCountry = country;
              this.schoolInfo?.get('representativeCountryCode')?.setValue(this.teacherCountryCode);
              this.countryBoard = internationalBoards?.[country];
              this.isAddNewBoard = false;
            }
          });
        };
        break;

      case 'institutionAddress.pincode':
        this.schoolInfo?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe(async (res) => {
          if (res) {
            this.locationInfo = await this.getInfoFromPin(res);
            this.schoolInfo.get('institutionAddress').patchValue({
              village: this.locationInfo?.Name || '',
              city: this.locationInfo?.Block || '',
              subDistrict: this.locationInfo?.Block || '',
              district: this.locationInfo?.District || '',
              state: this.locationInfo?.State || '',
              // country: this.teacherCountry || '',
            });
            this.schoolInfo?.get(unlock)?.enable();
          };
        });
        break;

      case 'representativePhoneNumber':
        // this.schoolInfo?.get('representativeCountryCode')?.setValue(this.teacherCountryCode);
        const countryCode = this.schoolInfo?.get('representativeCountryCode')?.value;
        if (this.data?.parent !== 'registration') {
          // cannot enter own number as rep phone number
          const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
          const userPhone = await lastValueFrom(this.userService.getUser(user.uid));
          this.schoolInfo?.get(watch)?.addValidators(representativePhoneValidator(userPhone.phoneNumber));
          this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
          this.invalidRepresentativePhoneMsg = 'Enter the number of the school representative, not your own number';
          this.schoolInfo?.get(unlock)?.enable();
        } else {
          // cannot enter existing rep phone number
          this.schoolInfo.get(watch).valueChanges.subscribe(async (res) => {
            if (res) {
              const query: QueryFn = (ref: CollectionReference) => ref.where('representativeCountryCode', '==', countryCode).where(watch, '==', res);
              const institutionPhones = await lastValueFrom(this.institutionService.getWithQuery(query).pipe(first()));
              this.schoolInfo?.get(watch)?.addValidators(representativePhoneExistValidator(institutionPhones?.[0]?.representativePhoneNumber));
              this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
              this.representativePhoneExistErrorMsg = `This number, ${countryCode + res} already belongs to the representative ${institutionPhones?.[0]?.representativeName}, of the school “${institutionPhones?.[0]?.institutionName}” with PIN code ${institutionPhones?.[0]?.institutionAddress?.pincode}`;
              this.schoolInfo?.get(unlock)?.enable();
            }
          });
        };
        break;

      case 'representativeLastName':
        this.schoolInfo.get(watch).valueChanges.subscribe(async (res) => {
          if (res) {
            if (this.data?.parent !== 'registration') {
              // cannot enter own name as rep name
              const repFirstName = this.schoolInfo?.get('representativeFirstName')?.value;
              const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
              const userName = await lastValueFrom(this.teacherService.getWithId(user.uid));
              const userFullName = userName.teacherMeta.firstName + ' ' + userName.teacherMeta.lastName;
              this.schoolInfo?.get(watch)?.addValidators(representativeNameValidator(repFirstName, userFullName));
              this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
              this.invalidRepresentativeNameMsg = 'Enter the name of the school representative, not your own name';
              this.schoolInfo?.get(unlock)?.enable();
            } else {
              // cannot enter existing rep phone number
              const repFirstName = this.schoolInfo?.get('representativeFirstName')?.value;
              const query: QueryFn = (ref: CollectionReference) => ref.where('representativeFirstName', '==', repFirstName).where(watch, '==', res);
              const institutionPhones = await lastValueFrom(this.institutionService.getWithQuery(query).pipe(first()));
              this.schoolInfo?.get(watch)?.addValidators(representativeNameExistValidator(repFirstName, institutionPhones?.[0]?.representativeFullName));
              this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
              this.representativeNameExistErrorMsg = `This name, ${repFirstName + ' ' + res} is already registered with the school “${institutionPhones?.[0]?.institutionName}” with PIN code ${institutionPhones?.[0]?.institutionAddress?.pincode}`;
              this.schoolInfo?.get(unlock)?.enable();
            }
          }
        });
        break;

      default:
        this.schoolInfo?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe((res) => {
          if (res) {
            this.schoolInfo?.get(unlock)?.enable();
          };
        });
        break;
    }
  }

}
