import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { ExotelService } from 'app/core/auth/exotel.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { getAuth, sendEmailVerification, updateEmail } from 'firebase/auth';
import { first, firstValueFrom, lastValueFrom, Observable, Subject, takeUntil } from 'rxjs';
import { ProfilesMergeComponent } from '../profiles-merge/profiles-merge.component';
import { FuseConfirmationService } from '@fuse/services/confirmation';


// import firebase from 'firebase/compat';
@Component({
  selector: 'app-user-info-edit-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss']
})
export class DialogComponent implements OnInit {
  user: any;
  auth: any;
  infoForm: FormGroup;
  countryCodeMap: any;
  storagePath: string = 'assets/country_flags/';
  selectedCountryCodeObj: any;
  storageFormat: string = '.png?alt=media';
  isEmailEditable: boolean = false;
  isPhoneEditable: boolean = false;
  phoneValueChanged: boolean = false;
  sendOtpTextForPhone: string = 'Send OTP';
  otpSpinnerForPhone: boolean = false;
  otpUiPhone: boolean = false;
  numberExistsErrorMessage: { teacher: string; student: string } = { teacher: '', student: '' };


  studentsProfiles: any[] = [];
  testOtp: number = 123456;
  phoneNumber: string = '';
  isserverError: boolean = false;
  serverError: { code: string; message: string } = { code: '', message: '' };
  currentUser;
  studentId: any;
  phone: string;
  email: string;
  firstname: string;
  lastname: string;
  profiles$: any;
  btnDisabled: boolean = true;
  phoneVerification: {
    hideSubmitbtn: boolean; numberChanged: boolean; userInputOtp: string
    ; disablePhoneInput: boolean; hideVerification: boolean; disableSubmit: boolean; hideResendbtn: boolean
    ; editPhoneAftersubmit;
  } = {
      hideSubmitbtn: true,
      numberChanged: false,
      userInputOtp: '',
      disablePhoneInput: false,
      hideVerification: true,
      disableSubmit: true,
      hideResendbtn: true,
      editPhoneAftersubmit: false,
    };
  userInputOtp: string = '';
  timeOut: any;
  emailVerification: {
    hideEmailVerification: boolean;
    hideResendLinkbtn: boolean;
    emailChanged: boolean;
    disableEmailInput: boolean;
    hideEmailVerifybtn: boolean;
    disableEmailVerify: boolean;
    emailVerified: boolean;
    isLinkSent: boolean;
    editEmailAftersubmit: boolean;
  } = {
      hideEmailVerification: true,
      hideResendLinkbtn: true,
      emailChanged: false,
      disableEmailInput: false,
      hideEmailVerifybtn: true,
      disableEmailVerify: true,
      emailVerified: false,
      isLinkSent: false,
      editEmailAftersubmit: false
    };
  verificationEmailCode: any;
  otpSend: any;
  phoneAuthError: { code: string; message: string } = { code: '', message: '' };
  isphoneAuthError: boolean;
  emailInput: string = '';
  emailLinkTimeout: any;
  emailTemplate;
  selectedCountryCode: string;

  otpPhone: number;
  SendOTPTextForPhone: string = 'Send OTP';
  verifySpinnerForPhone = false;

  originalPhoneNumber: any;
  studentProfile: any;
  countryCode: any;
  teacherProfile: any;
  userProfile: any;
  newPhoneNumber: any;
  studentUidNewPhone: any;
  newCountryCode: any;
  phoneNumberChange: any;
  originalFormValues: any;
  originalUiState: any;
  newStudentProfile: any;
  currentLinkUid: any;
  newLinkUid: any;
  newId: any;
  isUpdating = false;
  emailValueChanged: boolean = false;
  otpUiEmail = false;
  initialValues: { firstName: string; lastName: string };
  showStudentDetails = false;
  userEmailInputOtp: string = '';
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  environment: any = environment;
  studentsWithTeacherUid: any;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private teacherService: TeacherService,
    private afAuth: AngularFireAuth,
    private uiService: UiService,
    private userService: UserService,
    public dialog: MatDialog,
    private studentService: StudentsService,
    private exotel: ExotelService,
    private fb: FormBuilder,
    private httpClient: HttpClient,
    private route: ActivatedRoute,
    private configurationService: ConfigurationService,
    private authService: AuthService,
    private sharedService: SharedService,
    private afs: AngularFirestore,
    private _userService: UserService,
    public fuseConfirmationService: FuseConfirmationService,
    private _router: Router,

  ) {
    this.user = data?.currentUser;

  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit(): Promise<void> {
    // this.auth = getAuth()
    const loggedInUser = this.auth = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const teacherData = await lastValueFrom(this.teacherService.getTeacherByIdOnce(loggedInUser.uid));
    const countryCodeMap = this.countryCodeMap = await this.getCountryCodes();

    const requiredFields = ['firstName', 'lastName', 'email', 'countryCode', 'phoneNumber'];
    const teacherMeta = teacherData.get('teacherMeta');
    if (requiredFields.every(field => teacherMeta.hasOwnProperty(field))) {
      const { firstName, lastName, email, countryCode, phoneNumber } = teacherMeta;
      this.setForm(firstName, lastName, email, countryCode, phoneNumber);
    } else {
      // console.error('Required fields are missing: ', requiredFields.filter(field => !teacherMeta.hasOwnProperty(field)).join(', '));
    };

    // this.afAuth.user.subscribe((data) => {
    //   this.currentUser = data
    //   this.selectedCountryCode = this.user.teacherMeta.countryCode
    //   // get the user country code to edit phone number field
    // })
    // this.profiles$ = await this.studentService.get()
    // this.profiles$.subscribe(students => {
    //   this.studentsProfiles = students
    // })

    // this.setForm()
    // this.phone = (this.user?.teacherMeta?.countryCode + this.user?.teacherMeta?.phoneNumber)
    // this.email = this.user?.teacherMeta?.email
    // this.firstname = this.user?.teacherMeta?.firstName
    // this.lastname = this.user?.teacherMeta?.lastName
    // this.phoneNumber = this.user?.teacherMeta?.phoneNumber
    // this.emailInput = this.user?.teacherMeta?.email
    // let obj = {
    //   firstName: this.firstname,
    //   email: this.email,
    //   lastName: this.lastname,
    //   phone: this.phoneNumber
    // }
    // this.infoForm.valueChanges.subscribe(x => {
    //   if ((x.firstName != obj.firstName) || (x.lastName != obj.lastName)) {
    //     this.btnDisabled = false
    //   }
    //   else {
    //     this.btnDisabled = true
    //   }
    // })
    const template = await this.configurationService.getEmailUpdateTemplate();
    this.emailTemplate = template['mailTemplate'];

    this.getStudentForExistingProfile();
    this.getTeacherForExistingProfile();

    this.originalFormValues = this.infoForm.getRawValue();
    this.originalUiState = {
      isPhoneEditable: this.isPhoneEditable,
      showSendOtpButton: this.showSendOtpButton,
      otpUiPhone: this.otpUiPhone,
      phoneValueChanged: this.phoneValueChanged,
      otpSpinnerForPhone: this.otpSpinnerForPhone,
      verifySpinnerForPhone: this.verifySpinnerForPhone
    };

    // console.log(this.user?.teacherMeta?.phoneNumber);

    this.checkStudentsWithTeacherUid();
  }

  async getCountryCodes() {
    const countryCodeRef = await lastValueFrom(this.configurationService.getCountryCodesList().pipe(first()));
    return countryCodeRef?.countryCodes;
  }

  setForm(firstNameInput: string, lastNameInput: string, emailInput: string, countryCodeInput: string, phoneNumberInput: string) {
    this.originalPhoneNumber = phoneNumberInput ?? '';

    this.infoForm = this.fb.group({
      firstName: [firstNameInput ?? '', Validators.required],
      lastName: [lastNameInput ?? '', Validators.required],
      email: [{ value: emailInput ?? '', disabled: true }, [Validators.required, Validators.email]],
      countryCode: [countryCodeInput ?? '', Validators.required],
      phoneNumber: [{ value: phoneNumberInput ?? '', disabled: true }],
    });

    this.infoForm.valueChanges.subscribe((response) => {
      const { firstName, lastName, email, countryCode, phoneNumber } = response;
      const isFormChanged = firstName !== this.infoForm.get('firstName').value || lastName !== this.infoForm.get('lastName').value;
      this.btnDisabled = !isFormChanged;
    });

    this.infoForm.controls.phoneNumber.valueChanges.subscribe((value: string) => {
      this.phoneValueChanged =
        value !== this.originalPhoneNumber &&
        value?.length === 10 &&
        this.infoForm.controls.phoneNumber.valid;
    });


    this.initialValues = {
      firstName: firstNameInput,
      lastName: lastNameInput,
    };


    this.infoForm.valueChanges.subscribe((currentValue) => {
      const firstNameChanged = currentValue.firstName !== this.initialValues.firstName;
      const lastNameChanged = currentValue.lastName !== this.initialValues.lastName;

      // this.btnDisabled = !(firstNameChanged || lastNameChanged);
      this.btnDisabled = !(firstNameChanged || lastNameChanged) || !this.infoForm.get('firstName')?.valid || !this.infoForm.get('lastName')?.valid;
    });
    // this.infoForm.get('firstName')?.valueChanges.subscribe(() => this.checkIfButtonShouldBeEnabled());
    // this.infoForm.get('lastName')?.valueChanges.subscribe(() => this.checkIfButtonShouldBeEnabled());
  }

  getSelectedCountryCode(countryCodeMap: { [key: string]: { phone: string } }, countryCode: string) {
    return Object.entries(countryCodeMap).find(([key, value]) => value.phone === countryCode)?.[1];
  }

  enableEmailEdit() {
    this.isEmailEditable = true;
    this.infoForm.controls.email.enable();
  }

  /*
  enablePhoneEdit() {
    this.isPhoneEditable = true;
    this.infoForm.controls.phoneNumber.enable();
  }
*/

  /*
  async onPhoneInputChange(event: any) {
    // async onPhoneInputChange(countryCode: string, phoneNumber: string) {
    const countryCode = this.infoForm?.get('countryCode')?.value;
    const phoneNumber = event?.target?.value;
    const existingTeachers = await lastValueFrom(this.teacherService.getTeacherNameByPhone(countryCode, phoneNumber));
    const existingStudents = await lastValueFrom(this.studentService.getStudentNamesByPhone(countryCode, phoneNumber));
    const existingUsers = await lastValueFrom(this.userService.getUserNameByPhone(countryCode, phoneNumber));
    // console.log(existingTeachers.empty, existingStudents.empty, existingUsers.empty);
    if (existingTeachers.empty) {
      this.phoneValueChanged = true;
    } else {
      if (phoneNumber === this.user?.teacherMeta?.phoneNumber) {
        this.phoneValueChanged = false;
      } else {
        this.numberExistsErrorMessage.teacher = `This phone number is already in use by another teacher. Please enter a different phone number.`;
        this.infoForm?.get('phoneNumber')?.setErrors({ teacherPhoneExistError: true });
      };
    };

    if (existingStudents.empty) {

    } else {
      this.numberExistsErrorMessage.student = `This phone number is already in use by a student. Please enter a different phone number.`;
      this.infoForm?.get('phoneNumber')?.setErrors({ studentPhoneExistError: true });
    }
  }
*/

  /*
  sendOtpToPhone() {
    this.btnDisabled = true;
    this.otpSpinnerForPhone = true;
    const phoneNumber = this.infoForm?.get('phoneNumber')?.value;
    this.exotel.changeMobileNumberOTP(phoneNumber);
    this.otpUiPhone = true;
    this.timeOut = setTimeout(() => {
      this.otpUiPhone = false;
      this.otpSpinnerForPhone = false;
      this.sendOtpTextForPhone = "Resend OTP";
    }, 100000);
  }
*/

  /*
  async verifyOtpForPhone() {
    // const ph = this.selectedCountryCode + this.phoneNumber;
    if (this.userInputOtp && this.exotel.otp.toString() == this.userInputOtp) {
      const oldCountryCode = this.user?.teacherMeta?.countryCode;
      const oldPhoneNumber = this.user?.teacherMeta?.phoneNumber;
      const newCountryCode = this.infoForm?.get('countryCode')?.value;
      const newPhoneNumber = this.infoForm?.get('phoneNumber')?.value;
      const body = {
        oldCountryCode,
        oldPhoneNumber,
        newCountryCode,
        newPhoneNumber,
        fieldToUpdate: 'phoneNumber',
        role: 'teacher',
      };
      // const url = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/updateProfileDetails`;
      const url = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/updateProfileDetails`;
      this.sharedService.sendToCloudFunction(url, body);
      clearTimeout(this.timeOut);
      // if (!response.err) {
      //   this.isphoneAuthError = false
      //   this.phoneVerification.hideVerification = true
      //   this.phoneVerification.numberChanged = false
      //   this.phoneVerification.editPhoneAftersubmit = false
      //   this.phoneVerification.disablePhoneInput = false
      //   clearTimeout(this.timeOut)
      //   this.phoneVerification.hideResendbtn = true
      //   const teacherMeta = {
      //     countryCode: this.selectedCountryCode,
      //     phoneNumber: this.phoneNumber
      //   }
      //   const value = {
      //     teacherMeta: teacherMeta
      //   }
      //   const studentPhone = {
      //     studentMeta: teacherMeta
      //   }
      //   this.teacherService.updateTeacher(value, this.user.docId)
      //   this.userService.updateLoginUser(teacherMeta, this.user.docId)
      //   this.studentsProfiles.forEach(student => {
      //     this.studentService.updateStudent(studentPhone, student.docId)
      //   });
      // this.uiService.alertMessage('Updated', 'Successfully Updated', 'success')
      // const token = await this.getTokenFromPhone(this.selectedCountryCode, this.phoneNumber);
      // this.authService.loginUsingToken(token)
      // } else {
      // this.isphoneAuthError = true
      // this.handlePhoneServerError(response.err)
      // }
      // this.btnDisabled = false
    }
    else {
      this.uiService.alertMessage("Oops", "Wrong OTP", "warning")
    }
  }
*/

  /*
    onSubmit(infoForm) {
      const data = {
        firstName: this.infoForm.value.firstName,
        lastName: this.infoForm.value.lastName,
        name: this.infoForm.value.firstName + " " + this.infoForm.value.lastName,
        fullNameLowerCase: this.infoForm.value.firstName.toLowerCase().replace(/ /g, '') + this.infoForm.value.lastName.toLowerCase().replace(/ /g, '')
      }
      const value = {
        teacherMeta: data
      }

      // this.teacherService.updateTeacher(value, this.user.docId);
      this.uiService.alertMessage('Updated', 'Info Successfully Updated', 'success')

    }
      */

  /*
    async verifyEmail() {

      if (this.verificationEmailCode == this.otpSend) {
        console.log("matched")
        const response = await this.updateEmailInAuth(this.emailInput, this.auth.currentUser.uid)
        let email = this.checkEmailErrorInresponse(response)
        // const ph = this.selectedCountryCode + this.phoneNumber;
        const teacherMeta = {
          email: email,
        }
        const teacherEmail = {
          teacherMeta: teacherMeta
        }
        const studentEmail = {
          studentMeta: teacherMeta
        }
        this.teacherService.updateTeacher(teacherEmail, this.user.docId)
        this.userService.updateLoginUser(teacherMeta, this.user.docId)

        this.studentsProfiles.forEach(student => {
          this.studentService.updateStudent(studentEmail, student.docId)
        });
        this.uiService.alertMessage('Updated', 'Successfully Updated', 'success')
        const token = await this.getTokenFromPhone(this.selectedCountryCode, this.phoneNumber);
        this.authService.loginUsingToken(token)
        this.btnDisabled = false
      }
      else {
        this.uiService.alertMessage("wrong OTP", "Wrong OTP", "warning")
      }

    }

  */

  phoneChange(e) {
    /*
    const value = this.selectedCountryCode + e.target.value
    this.phoneVerification.hideSubmitbtn = false
    this.phoneVerification.hideResendbtn = true
    let isnum = /^\d+$/.test(value.split("+")[1]);
    if (!isnum || value.length < 13) {
      this.phoneVerification.disableSubmit = true
    }
    else {
      this.phoneVerification.disableSubmit = false
    }
    if (value != this.phone) {
      this.phoneVerification.hideSubmitbtn = false
      this.phoneVerification.numberChanged = true
    } else {
      this.phoneVerification.hideSubmitbtn = true
      this.phoneVerification.numberChanged = false
    }
    */
  }

  isNumeric(str: string): boolean {
    return /^\d+$/.test(str);
  }

  handlePhoneServerError(error) {
    console.log(error.code);

    switch (error.code) {
      case 'auth/phone-number-already-exists': {
        this.phoneAuthError.code = 'already registered';
        this.phoneAuthError.message = 'User is already registered';
        break;
      }
      case 'already registered':
        this.phoneAuthError.code = 'already registered';
        this.phoneAuthError.message = 'User is already registered';
        break;
    }

  }

  async updatePhoneNumber(ph, uid): Promise<any> {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/update_user_profile`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/update_user_profile`;

    const formData = {
      userUid: uid,
      phone: ph
    };
    const response = this.httpClient.post<any>(endUrl, formData).toPromise().then(res => res);
    return response;
  }

  getVerificationCode(e: any) {
    console.log(e, e?.target?.value);
    /*
    this.userInputOtp = e.target.value
    */
  }

  /*
 async sendOTP() {
   const result = await this.checkPhoneNumberinAuth()
   if (!result.error) {
     this.phoneVerification.editPhoneAftersubmit = true
     this.phoneVerification.disablePhoneInput = true
     this.phoneVerification.numberChanged = true
     this.phoneVerification.hideSubmitbtn = true
     this.phoneVerification.hideVerification = false
     this.phoneVerification.hideResendbtn = true
     this.btnDisabled = true
     const ph = this.selectedCountryCode + this.phoneNumber;
     this.exotel.changeMobileNumberOTP(this.phoneNumber);
     this.timeOut = setTimeout(() => {
       this.phoneVerification.hideVerification = true
       this.phoneVerification.hideSubmitbtn = false
       this.phoneVerification.hideResendbtn = false
     }, 100000)
   }
   else {
     this.isphoneAuthError = true
     this.handlePhoneServerError(result)
   }
 }
 */

  /*
  editPhonenumber() {
    this.phoneVerification.hideSubmitbtn = false;
    this.phoneVerification.hideVerification = true;
    this.phoneVerification.editPhoneAftersubmit = false
    this.phoneVerification.disablePhoneInput = false
    this.phoneVerification.hideResendbtn = true
    this.phoneVerification.disableSubmit = true
    this.isphoneAuthError = false
    clearTimeout(this.timeOut)
  }
  */


  emailChange(event: any) {

    this.isserverError = false;
    if (this.email != event.target.value) {
      this.emailVerification.emailChanged = true;
      this.emailVerification.disableEmailVerify = false;
      this.emailVerification.hideEmailVerifybtn = false;
    }
    else {
      this.emailVerification.emailChanged = false;
      this.emailVerification.disableEmailVerify = true;
      this.emailVerification.hideEmailVerifybtn = true;
    }

  }

  async updateEmail() {

    const otp = Math.floor(Math.random() * 899999 + 100000);
    const name = this.infoForm.controls.firstName.value + ' ' + this.infoForm.controls.lastName.value;
    this.otpSend = otp;
    const test = await this.checkEmailinAuth();
    if (!test.error) {
      this.sendEmailVerificationLink(otp, name);
      this.emailVerification.editEmailAftersubmit = true;
      this.emailVerification.hideEmailVerification = false;
      this.emailVerification.hideEmailVerifybtn = true;
      this.emailVerification.disableEmailInput = true;
    }
    else {
      this.emailVerification.hideEmailVerification = true;
      this.emailVerification.editEmailAftersubmit = false;
      this.emailVerification.hideEmailVerifybtn = false;
      this.emailVerification.disableEmailVerify = true;
      this.isserverError = true;
      this.handleEmailServerError(test);
    }
    this.emailLinkTimeout = setTimeout(() => {
      this.emailVerification.hideEmailVerification = true;
      this.emailVerification.hideEmailVerifybtn = false;
      this.emailVerification.hideResendLinkbtn = false;
    }, 50000);

  }

  handleEmailServerError(error) {


    switch (error.code) {
      case 'auth/requires-recent-login': {
        this.serverError.code = 'Login Required';
        this.serverError.message = 'You are going to update your credentials.Please login again to update the email';
        break;
      }
      case 'auth/email-already-exists': {
        this.serverError.code = 'already in Use';
        this.serverError.message = 'Email is already registered';
        break;
      }
      case 'already registered': {
        this.serverError.code = 'already in Use';
        this.serverError.message = 'Email is already registered. ';
        break;
      }
    }

  }

  editEmailAfterSubmit() {

    this.emailVerification.hideEmailVerifybtn = false;
    this.emailVerification.hideEmailVerification = true;
    this.emailVerification.disableEmailInput = false;
    this.emailVerification.hideResendLinkbtn = true;
    this.emailVerification.disableEmailVerify = true;
    this.isserverError = false;
    clearTimeout(this.emailLinkTimeout);

  }

  async updateEmailInAuth(email, uid): Promise<any> {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/update_user_profile`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/update_user_profile`;
    const formData = {
      userUid: uid,
      email: email
    };
    const response = this.httpClient.post<any>(endUrl, formData).toPromise().then(res => res);
    return response;
  }

  checkEmailErrorInresponse(response) {

    if (!response.err) {
      this.isserverError = false;
      this.emailVerification.hideEmailVerification = true;
      this.emailVerification.emailChanged = false;
      this.emailVerification.editEmailAftersubmit = false;
      this.emailVerification.disableEmailInput = false;
      clearTimeout(this.emailLinkTimeout);
      this.emailVerification.hideResendLinkbtn = true;
      return this.emailInput;
    } else {
      this.isserverError = true;
      this.handleEmailServerError(response.err);
    }

  }

  sendEmailVerificationLink(otp, name) {

    const matchedObj = {
      PROFILENAME: name,
      PROFILEOTP: otp,
      PROFILEEMAIL: this.emailInput,
    };
    // console.log(this.emailTemplate);
    const templateChnage = this.emailTemplate['html'].replace(/\b(?:PROFILENAME|PROFILEOTP|PROFILEEMAIL)\b/gi, matched => matchedObj[matched]);
    this.configurationService.AddNotifications(templateChnage, this.emailTemplate, this.emailInput);

  }

  async checkPhoneNumberinAuth(): Promise<any> {
    /*
    const ph = this.selectedCountryCode + this.phoneNumber;
    const body = {
      test: "test",
      phone: ph
    }
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/update_user_profile`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/update_user_profile`;
    const response = await this.httpClient.post<any>(endUrl, body).toPromise().then((res) => {
      console.log(res)
      return res
    })
    return response;
    */
  }

  async checkEmailinAuth(): Promise<any> {

    const ph = this.selectedCountryCode + this.phoneNumber;
    const body = {
      test: 'test',
      email: this.emailInput
    };


    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/update_user_profile`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/update_user_profile`;
    const response = await this.httpClient.post<any>(endUrl, body).toPromise().then(res => res);
    return response;

  }

  async getTokenFromPhone(countryCode: string, phoneNumber: string) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_users_and_get_firebase_login_token_from_phone`;
    const formData = {
      countryCode: countryCode,
      phoneNumber: phoneNumber
    };
    const httpOption: any = {
      responseType: 'application/json'
    };
    return await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then(response => response).catch(error => error);
  }


  async getStudentForExistingProfile() {
    const query: QueryFn = (ref: CollectionReference) => ref
      .where('studentMeta.phoneNumber', '==', this.user?.teacherMeta?.phoneNumber);
    const docs = await firstValueFrom(await this.studentService.getWithQuery(query));
    this.studentProfile = docs;
    this.studentProfile.map((data) => {
      this.currentLinkUid = data.linkUid;
    });
  }

  // async getStudentForExistingProfile() {
  //   try {
  //     // Ensure teacherMeta and phoneNumber are valid
  //     if (!this.user?.teacherMeta) {
  //       console.error('teacherMeta is undefined.');
  //       return;
  //     }

  //     const phoneNumber = this.user.teacherMeta.phoneNumber;

  //     // Validate phoneNumber specifically
  //     if (!phoneNumber) {
  //       console.error('Phone number is undefined or invalid.');
  //       return;
  //     }

  //     const query: QueryFn = (ref: CollectionReference) =>
  //       ref.where('studentMeta.phoneNumber', '==', phoneNumber);

  //     const docs = await firstValueFrom(this.studentService.getWithQuery(query));
  //     this.studentProfile = docs;

  //     this.studentProfile.forEach((data) => {
  //       this.currentLinkUid = data.linkUid;
  //     });
  //   } catch (error) {
  //     console.error('Error fetching student profile:', error);
  //   }
  // }


  async getStudentForNewProfile() {
    const query: QueryFn = (ref: CollectionReference) => ref
      .where('studentMeta.phoneNumber', '==', this.phoneNumberChange);
    const docs = await firstValueFrom(await this.studentService.getWithQuery(query));
    this.newStudentProfile = docs;
    this.newStudentProfile.map((data) => {
      this.newLinkUid = data.linkUid;
      this.newId = data.docId;
    });
  }

  async getTeacherForExistingProfile() {
    const query: QueryFn = (ref: CollectionReference) => ref
      .where('teacherMeta.phoneNumber', '==', this.user?.teacherMeta?.phoneNumber);
    const docs = await firstValueFrom(await this.teacherService.getDocWithQuery(query));
    this.teacherProfile = docs;
  }

  async sendOtpToPhone() {
    await this.getStudentForNewProfile();
    this.otpSpinnerForPhone = true;
    this.exotel.changeMobileNumberOTP(this.phoneNumberChange);
    const otp = this.exotel.otp;
    // const otp = 112233;
    this.otpPhone = otp;

    this.otpUiPhone = true;
    setTimeout(() => {
      this.otpUiPhone = false;
      this.otpSpinnerForPhone = false;
      this.SendOTPTextForPhone = 'Resend OTP';
    }, 300000);
  }

  async verifyOtpForPhone() {
    if (this.otpPhone === Number(this.userInputOtp)) {
      const query: QueryFn = (ref: CollectionReference) => ref
        .where('studentMeta.phoneNumber', '==', this.infoForm.get('phoneNumber').value);

      const docs = await firstValueFrom(await this.studentService.getWithQuery(query));
      if (docs.length) {
        await import('../profiles-merge/profiles-merge.module').then(() => {

          const dialogRef = this.dialog.open(ProfilesMergeComponent, {

            data: {
              allStudents: docs,
              studentProfile: this.studentProfile,
              showStudentDetails: true
            },
            backdropClass: 'backdropBackground1',
            panelClass: 'my-class',
            disableClose: true,

          });

          dialogRef.afterClosed().subscribe(async (result) => {

            if (!result || !result.mergeOption) {
              this.infoForm.reset(this.originalFormValues);
              this.userInputOtp = ''; // Clear the OTP value
              this.infoForm.get('phoneNumber')?.disable();
              // Reset UI flags to their original state
              this.isPhoneEditable = this.originalUiState.isPhoneEditable;
              this.otpUiPhone = this.originalUiState.otpUiPhone;
              this.phoneValueChanged = this.originalUiState.phoneValueChanged;
              this.otpSpinnerForPhone = this.originalUiState.otpSpinnerForPhone;
              this.verifySpinnerForPhone = this.originalUiState.verifySpinnerForPhone;

              this.isPhoneEditable = false;

            }
            else {
              this.verifySpinnerForPhone = true;
              if (result.mergeOption === 'dependentMerge') {
                // Handle dependent merge logic

                try {
                  this.isUpdating = true;
                  await this.UpdatePhoneAndDoc(this.originalPhoneNumber, this.phoneNumberChange, this.user.teacherMeta.countryCode, this.newCountryCode, result.mergeOption, this.emailInput);
                  this.authService.signOut();
                  const firebaseAuthToken = await this.getTokenFromPhone(this.newCountryCode, this.phoneNumberChange);
                  this.authService.loginUsingToken(firebaseAuthToken);

                  this.dialog.closeAll();
                  this.uiService.alertMessage('Updated', 'Phone number updated successfully', 'success');

                } catch (error) {
                  this.isUpdating = false;
                  this.dialog.closeAll();
                  this.uiService.alertMessage('error', 'Error updating phone number', 'warning');
                }
                finally {
                  this.isPhoneEditable = false;
                  this.phoneValueChanged = false;
                  this.otpUiPhone = false;
                  this.verifySpinnerForPhone = false;
                }


                const value = {
                  loginType: 'phone',
                  studentMeta: {
                    countryCode: this.newCountryCode,
                    phoneNumber: this.phoneNumberChange
                  }
                };

                const teacherValue = {
                  teacherMeta: {
                    countryCode: this.newCountryCode,
                    phoneNumber: this.phoneNumberChange
                  }

                };
                // this.updateTeacherphoneInDb();
              }

              if (result.mergeOption === 'independentMerge') {
                // Handle independent merge logic
                try {
                  this.isUpdating = true;
                  await this.UpdatePhoneAndDoc(this.originalPhoneNumber, this.phoneNumberChange, this.user.teacherMeta.countryCode, this.newCountryCode, result.mergeOption, this.emailInput);
                  this.authService.signOut();
                  const firebaseAuthToken = await this.getTokenFromPhone(this.newCountryCode, this.phoneNumberChange);
                  this.authService.loginUsingToken(firebaseAuthToken);

                  this.dialog.closeAll();
                  this.uiService.alertMessage('Updated', 'Phone number updated successfully', 'success');

                } catch (error) {
                  this.isUpdating = false;
                  this.dialog.closeAll();
                  this.uiService.alertMessage('error', 'Error updating phone number', 'warning');
                }
                finally {
                  this.isPhoneEditable = false;
                  this.phoneValueChanged = false;
                  this.otpUiPhone = false;
                  this.verifySpinnerForPhone = false;
                }
              }
            }
          });
        });
      } else {

        try {

          this.verifySpinnerForPhone = true;
          this.isUpdating = true;
          this.uiService.alertMessage(
            'Attention',
            'Kindly wait while the profile is being updated',
            'info'
          );
          await this.UpdatePhoneForAuth(
            this.originalPhoneNumber,
            this.phoneNumberChange,
            this.user?.teacherMeta?.countryCode,
            this.newCountryCode,
            this.emailInput,
            this.initialValues.firstName,
            this.initialValues.lastName
          );
          this.authService.signOut();
          const firebaseAuthToken = await this.getTokenFromPhone(this.newCountryCode, this.phoneNumberChange);
          this.authService.loginUsingToken(firebaseAuthToken);
          this.dialog.closeAll();
          this.uiService.alertMessage('Updated', 'Phone number updated successfully', 'success');
        } catch (error) {
          this.uiService.alertMessage('Error', 'Failed to update phone number', 'error');
        } finally {
          // Reset UI flags
          this.isPhoneEditable = false;
          this.phoneValueChanged = false;
          this.otpUiPhone = false;
          this.verifySpinnerForPhone = false;
        }
        // If no student found, directly update phone number in DB
      }
    } else {
      this.uiService.alertMessage('Oops', 'Wrong OTP', 'warning');
      this.verifySpinnerForPhone = false;
    }
  }


  phoneNumberIsValid(): boolean {
    const phoneControl = this.infoForm.get('phoneNumber');
    return phoneControl?.value?.length === 10 && !phoneControl?.hasError('pattern');
  }


  enablePhoneEdit() {
    this.isPhoneEditable = true;
    this.infoForm.controls.phoneNumber.enable();

  }

  get showSendOtpButton(): boolean {
    // return this.phoneValueChanged;
    const phoneNumber = this.infoForm.get('phoneNumber')?.value;
    const isValidPhoneNumber =
      phoneNumber && phoneNumber.length === 10 && !this.infoForm.get('phoneNumber')?.hasError('pattern');
    return isValidPhoneNumber && this.phoneValueChanged;
  }

  /*
  async onPhoneInputChange(event: any) {
    const countryCode = this.infoForm?.get('countryCode')?.value;
    const phoneNumber = event?.target?.value;

    if (!phoneNumber || phoneNumber.length !== 10) {
      // Reset state if the phone number is invalid
      this.phoneValueChanged = false;
      this.infoForm?.get('phoneNumber')?.setErrors(null);
      return;
    }

    try {
      // Fetch data from services to check phone number existence
      const [existingTeachers] = await Promise.all([
        lastValueFrom(this.teacherService.getTeacherNameByPhone(countryCode, phoneNumber)),
        // lastValueFrom(this.studentService.getStudentNamesByPhone(countryCode, phoneNumber)),
        // lastValueFrom(this.userService.getUserNameByPhone(countryCode, phoneNumber)),
      ]);

      // Check phone number against existing records
      if (!existingTeachers.empty) {
        if (phoneNumber === this.user?.teacherMeta?.phoneNumber) {
          // Phone number matches current user's number
          this.phoneValueChanged = false;
        } else {
          // Handle existing teacher
          if (!existingTeachers.empty) {
            this.numberExistsErrorMessage.teacher = `This phone number is already in use by another teacher. Please enter a different phone number.`;
            this.infoForm?.get('phoneNumber')?.setErrors({ teacherPhoneExistError: true });
          }

          // Handle existing student
          // if (!existingStudents.empty) {
          //   this.numberExistsErrorMessage.student = `This phone number is already in use by a student. Please enter a different phone number.`;
          //   this.infoForm?.get('phoneNumber')?.setErrors({ studentPhoneExistError: true });
          // }

          // Handle existing user
          // if (!existingUsers.empty) {
          //   this.infoForm?.get('phoneNumber')?.setErrors({ userPhoneExistError: true });
          // }

          this.phoneValueChanged = false;
        }
      } else {
        // No existing records, valid new phone number
        this.phoneValueChanged = true;
        this.infoForm?.get('phoneNumber')?.setErrors(null);
      }
    } catch (error) {
      console.error('Error checking phone number:', error);
      this.phoneValueChanged = false;
      this.infoForm?.get('phoneNumber')?.setErrors({ serverError: true });
    }
  }
*/

  async onPhoneInputChange(event: any) {
    const countryCode = this.infoForm?.get('countryCode')?.value;
    const phoneNumber = event?.target?.value;
    this.newCountryCode = this.infoForm?.get('countryCode')?.value;
    this.phoneNumberChange = event?.target?.value;
    this.newPhoneNumber = countryCode + phoneNumber;

    // Reset error messages and state
    // this.numberExistsErrorMessage = {};
    this.phoneValueChanged = false;

    // If the phone number is invalid, reset errors and return early
    if (!phoneNumber || phoneNumber.length !== 10) {
      this.infoForm?.get('phoneNumber')?.setErrors(null);
      return;
    }

    // Set a pending state to disable the button
    this.infoForm?.get('phoneNumber')?.setErrors({ pending: true });

    try {
      // Fetch data from services to check phone number existence
      const [existingTeachers] = await Promise.all([
        lastValueFrom(this.teacherService.getTeacherNameByPhone(countryCode, phoneNumber)),

      ]);

      // Check if the phone number exists
      if (!existingTeachers.empty) {
        if (phoneNumber === this.user?.teacherMeta?.phoneNumber) {
          // Phone number matches current user's number
          this.phoneValueChanged = false;
          this.infoForm?.get('phoneNumber')?.setErrors(null);
        } else {
          // Phone number is in use by another teacher
          this.numberExistsErrorMessage.teacher = 'This phone number is already in use by another teacher. Please enter a different phone number.';
          this.infoForm?.get('phoneNumber')?.setErrors({ teacherPhoneExistError: true });
          this.phoneValueChanged = false;

        }
      } else {
        // No existing records, valid new phone number
        this.phoneValueChanged = true;
        // this.fetchUserByPhoneNumber(this.newPhoneNumber);
        this.infoForm?.get('phoneNumber')?.setErrors(null);
      }
    } catch (error) {
      this.infoForm?.get('phoneNumber')?.setErrors({ serverError: true });
      this.phoneValueChanged = false;
    } finally {
      // Remove the pending state after validation
      const currentErrors = this.infoForm?.get('phoneNumber')?.errors || {};
      delete currentErrors.pending;
      this.infoForm?.get('phoneNumber')?.setErrors(Object.keys(currentErrors).length ? currentErrors : null);
    }
  }

  async UpdatePhoneAndDoc(oldPhonenumber: string, newPhonenumber: string, oldCountryCode: string, countryCode: any, mergeOption: string, email) {
    const functionUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/updateUserPhone`;
    // let functionUrl = "http://localhost:5000/backup-collection/asia-south1/updateUserPhone";
    try {

      const response = await this.sharedService.sendToCloudFunctionWithErrorHandling(functionUrl, {
        oldPhonenumber,
        newPhonenumber,
        oldCountryCode,
        countryCode,
        mergeOption,
        email
      });

      return response; // Return the response for further handling
    } catch (error) {

      throw error; // Re-throw the error to propagate it to the caller
    }
  }



  async UpdatePhoneForAuth(oldPhoneNumber: string, newPhoneNumber: string, countryCode: any, newCountryCode: string, email: string,
    firstName: string, lastName: string
  ) {
    // const functionUrl = 'http://localhost:5000/backup-collection/asia-south1/updateAuthUserPhone';
    const functionUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/updateAuthUserPhone`;
    try {
      const response = await this.sharedService.sendToCloudFunctionWithErrorHandling(functionUrl, {
        oldPhoneNumber,
        newPhoneNumber,
        countryCode,
        newCountryCode,
        email,
        firstName,
        lastName
      });

      return response; // Return the response for further handling
    } catch (error) {
      throw error; // Re-throw the error to propagate it to the caller
    }
  }

  /*
 async onEmailInputChange(event: any) {
    console.log(event, event?.target?.value);
    const emailChange = event?.target?.value;

    // Reset error messages and state
    // this.numberExistsErrorMessage = {};
    this.emailValueChanged = false;

    // If the phone number is invalid, reset errors and return early
    if (!emailChange) {
      this.infoForm?.get('email')?.setErrors(null);
      return;
    }

    // Set a pending state to disable the button
    this.infoForm?.get('email')?.setErrors({ pending: true });

    try {
      // Fetch data from services to check phone number existence
      const [existingTeachers] = await Promise.all([
        lastValueFrom(this.teacherService.getTeacherByEmail(emailChange)),

      ]);

      // Check if the phone number exists
      if (!existingTeachers.empty) {
        if (emailChange === this.user?.teacherMeta?.email) {
          // Phone number matches current user's number
          this.emailValueChanged = false;
          this.infoForm?.get('email')?.setErrors(null);
        } else {
          // Phone number is in use by another teacher
          this.numberExistsErrorMessage.teacher = `This email address is already in use by another teacher. Please enter a different phone number.`;
          this.infoForm?.get('email')?.setErrors({ teacherPhoneExistError: true });
          this.emailValueChanged = false;

        }
      } else {
        // No existing records, valid new phone number
        this.emailValueChanged = true;
        // this.fetchUserByPhoneNumber(this.newPhoneNumber);
        this.infoForm?.get('email')?.setErrors(null);
      }
    } catch (error) {
      this.infoForm?.get('phoneNumber')?.setErrors({ serverError: true });
      this.phoneValueChanged = false;
    } finally {
      // Remove the pending state after validation
      const currentErrors = this.infoForm?.get('phoneNumber')?.errors || {};
      delete currentErrors.pending;
      this.infoForm?.get('phoneNumber')?.setErrors(Object.keys(currentErrors).length ? currentErrors : null);
    }
  }
*/

  /*
    async onEmailInputChange2(event: any) {
      console.log(event, event?.target?.value);
      const emailChange = event?.target?.value;
      console.log("Email entered:", emailChange);
      this.emailInput = emailChange;
      // Reset emailValueChanged state
      this.emailValueChanged = false;

      // If the email is empty or invalid format, reset errors and return early
      if (!emailChange) {
        console.log("No email entered. Clearing errors.");
        this.infoForm.get('email')?.setErrors(null); // Reset all errors
        return;
      } else if (this.infoForm.get('email')?.hasError('email')) {
        console.log("Invalid email format. Exiting validation.");
        return; // Exit if the built-in email validation is already invalid
      }

      // Set a pending state to indicate ongoing validation
      this.infoForm?.get('email')?.setErrors({ ...this.infoForm.get('email')?.errors, pending: true });

      try {
        // Fetch data from both collections to check for email existence
        const [existingTeachers, existingStudents] = await Promise.all([
          lastValueFrom(this.teacherService.getTeacherByEmail(emailChange)),
          lastValueFrom(this.studentService.getStudentByEmail(emailChange)),
        ]);

        // Merge custom errors with existing errors
        const currentErrors = this.infoForm.get('email')?.errors || {};

        if (!existingTeachers.empty) {
          if (emailChange === this.user?.teacherMeta?.email) {
            console.log("Email matches the current teacher's email.");
            this.emailValueChanged = false;
            this.infoForm.get('email')?.setErrors(null); // Clear all errors
          } else {
            console.log("Email is in use by another teacher.");
            this.infoForm.get('email')?.setErrors({ ...currentErrors, teacherEmailExistError: true });
            this.emailValueChanged = false;
          }
        } else if (!existingStudents.empty) {
          if (emailChange === this.user?.studentMeta?.email) {
            console.log("Email matches the current student's email.");
            this.emailValueChanged = false;
            this.infoForm.get('email')?.setErrors(null); // Clear all errors
          } else {
            console.log("Email is in use by another student.");
            this.infoForm.get('email')?.setErrors({ ...currentErrors, studentEmailExistError: true });
            this.emailValueChanged = false;
          }
        } else {
          console.log("Email is valid and not in use.");
          this.emailValueChanged = true;
          delete currentErrors.teacherEmailExistError;
          delete currentErrors.studentEmailExistError;
          this.infoForm.get('email')?.setErrors(Object.keys(currentErrors).length ? currentErrors : null); // Clear custom errors
        }
      } catch (error) {
        console.error("Error during email validation:", error);
        this.infoForm.get('email')?.setErrors({ ...this.infoForm.get('email')?.errors, serverError: true });
        this.emailValueChanged = false;
      } finally {
        // Remove the pending state after validation
        const finalErrors = this.infoForm.get('email')?.errors || {};
        delete finalErrors.pending;
        this.infoForm.get('email')?.setErrors(Object.keys(finalErrors).length ? finalErrors : null);
      }
    }
  */

  async onEmailInputChange(event: any) {
    const emailChange = event?.target?.value;
    this.emailInput = emailChange;
    this.emailValueChanged = false;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    // If the email is empty or doesn't match the regex, reset errors and return early
    if (!emailChange) {
      this.infoForm.get('email')?.setErrors(null); // Reset all errors
      return;
    } else if (!emailRegex.test(emailChange)) {
      this.infoForm.get('email')?.setErrors({ email: true });
      return; // Exit if the email format is invalid
    } else if (this.infoForm.get('email')?.hasError('email')) {
      return; // Exit if the built-in email validation is already invalid
    }

    this.infoForm.get('email')?.setErrors({ ...this.infoForm.get('email')?.errors, pending: true });

    try {
      const [existingTeachers, existingStudents] = await Promise.all([
        lastValueFrom(this.teacherService.getTeacherByEmail(emailChange)),
        lastValueFrom(this.studentService.getStudentByEmail(emailChange)),
      ]);

      const currentErrors = this.infoForm.get('email')?.errors || {};

      if (!existingTeachers.empty) {
        if (emailChange === this.user?.teacherMeta?.email) {
          this.emailValueChanged = false;
          this.infoForm.get('email')?.setErrors(null); // Clear all errors
        } else {
          this.infoForm.get('email')?.setErrors({ ...currentErrors, teacherEmailExistError: true });
          this.emailValueChanged = false;
        }
      }
      // else if (!existingStudents.empty) {
      //   if (emailChange === this.user?.studentMeta?.email) {
      //     console.log("Email matches the current student's email.");
      //     this.emailValueChanged = false;
      //     this.infoForm.get('email')?.setErrors(null); // Clear all errors
      //   } else {
      //     console.log("Email is in use by another student.");
      //     this.infoForm.get('email')?.setErrors({ ...currentErrors, studentEmailExistError: true });
      //     this.emailValueChanged = false;
      //   }
      // }
      else {
        this.emailValueChanged = true;
        delete currentErrors.teacherEmailExistError;
        delete currentErrors.studentEmailExistError;
        this.infoForm.get('email')?.setErrors(Object.keys(currentErrors).length ? currentErrors : null); // Clear custom errors
      }
    } catch (error) {
      this.infoForm.get('email')?.setErrors({ ...this.infoForm.get('email')?.errors, serverError: true });
      this.emailValueChanged = false;
    } finally {
      const finalErrors = this.infoForm.get('email')?.errors || {};
      delete finalErrors.pending;
      this.infoForm.get('email')?.setErrors(Object.keys(finalErrors).length ? finalErrors : null);
    }
  }

  /*
  async sendEmailOtp() {

    console.log('otp sent');
    const otp = Math.floor(Math.random() * 899999 + 100000);
    console.log(otp);
    const name = this.infoForm.controls.firstName.value + " " + this.infoForm.controls.lastName.value;
    console.log(name);
    this.otpSend = otp
    const test = await this.checkEmailinAuth()
    if (!test.error) {
      this.otpUiEmail = true
      this.sendEmailVerificationLink(otp, name)
      this.emailVerification.editEmailAftersubmit = true
      this.emailVerification.hideEmailVerification = false
      this.emailVerification.hideEmailVerifybtn = true
      this.emailVerification.disableEmailInput = true
    }
    else {
      this.emailVerification.hideEmailVerification = true;
      this.emailVerification.editEmailAftersubmit = false;
      this.emailVerification.hideEmailVerifybtn = false;
      this.emailVerification.disableEmailVerify = true
      this.isserverError = true
      this.handleEmailServerError(test)
    }
    this.emailLinkTimeout = setTimeout(() => {
      this.emailVerification.hideEmailVerification = true
      this.emailVerification.hideEmailVerifybtn = false
      this.emailVerification.hideResendLinkbtn = false
    }, 50000)

  }
*/

  async sendEmailOtp() {
    const otp = Math.floor(Math.random() * 899999 + 100000);
    const name = this.infoForm.controls.firstName.value + ' ' + this.infoForm.controls.lastName.value;
    this.otpSend = otp;
    this.verificationEmailCode = otp;
    this.otpUiEmail = true;
    // console.log('otp sent', otp);
    this.sendEmailVerificationLink(otp, name);

    // this.emailLinkTimeout = setTimeout(() => {
    //   this.emailVerification.hideEmailVerification = true
    //   this.emailVerification.hideEmailVerifybtn = false
    //   this.emailVerification.hideResendLinkbtn = false
    // }, 50000)
    setTimeout(() => {
      this.otpUiEmail = false;
      this.otpSpinnerForPhone = false;
      this.SendOTPTextForPhone = 'Resend OTP';
    }, 300000);
  }



  async verifyEmail() {
    if (this.verificationEmailCode == Number(this.userEmailInputOtp)) {
      const query: QueryFn = (ref: CollectionReference) => ref
        .where('studentMeta.phoneNumber', '==', this.infoForm.get('phoneNumber').value);

      const docs = await firstValueFrom(await this.studentService.getWithQuery(query));
      if (docs.length) {
        await import('../profiles-merge/profiles-merge.module').then(() => {

          const dialogRef = this.dialog.open(ProfilesMergeComponent, {
            data: {
              allStudents: docs,
              studentProfile: this.studentProfile,
              showStudentDetails: false
            },
            backdropClass: 'backdropBackground1',
            panelClass: 'my-class',
            disableClose: true
          });

          dialogRef.afterClosed().subscribe(async (result) => {
            if (!result || !result.mergeOption) {
              this.infoForm.reset(this.originalFormValues);
              this.otpSend = ''; // Clear the OTP value
              this.infoForm.get('email')?.disable();

              this.isEmailEditable = false;
              this.otpUiEmail = false;
              this.emailValueChanged = false;
              this.verificationEmailCode = '';
            }
            else {
              this.verifySpinnerForPhone = true;
              if (result.mergeOption === 'dependentMerge') {
                // Handle dependent merge logic

                try {
                  this.isUpdating = true;
                  await this.UpdatePhoneAndDoc(this.originalPhoneNumber, this.phoneNumberChange, this.user.teacherMeta.countryCode, this.newCountryCode, result.mergeOption, this.emailInput);
                  this.dialog.closeAll();
                  this.uiService.alertMessage('Updated', 'Email updated successfully', 'success');

                } catch (error) {
                  this.isUpdating = false;
                  this.dialog.closeAll();
                  this.uiService.alertMessage('error', 'Error updating Email', 'warning');
                }
                finally {
                  this.isPhoneEditable = false;
                  this.phoneValueChanged = false;
                  this.otpUiPhone = false;
                  this.verifySpinnerForPhone = false;
                }

                // this.updateTeacherphoneInDb();
              }

              if (result.mergeOption === 'independentMerge') {
                // Handle independent merge logic
                try {
                  this.isUpdating = true;
                  await this.UpdatePhoneAndDoc(this.originalPhoneNumber, this.phoneNumberChange, this.user.teacherMeta.countryCode, this.newCountryCode, result.mergeOption, this.emailInput);


                  this.dialog.closeAll();
                  this.uiService.alertMessage('Updated', 'Email updated successfully', 'success');

                } catch (error) {
                  this.isUpdating = false;
                  this.dialog.closeAll();
                  this.uiService.alertMessage('error', 'Error updating Email', 'warning');
                }
                finally {
                  this.isPhoneEditable = false;
                  this.phoneValueChanged = false;
                  this.otpUiPhone = false;
                  this.verifySpinnerForPhone = false;
                }
              }
            }
          });
        });
      } else {
        try {
          this.verifySpinnerForPhone = true;
          this.isUpdating = true;
          this.uiService.alertMessage(
            'Attention',
            'Kindly wait while the profile is being updated',
            'info'
          );
          await this.UpdatePhoneForAuth(
            this.originalPhoneNumber,
            this.phoneNumberChange,
            this.user.teacherMeta.countryCode,
            this.newCountryCode,
            this.emailInput,
            this.initialValues.firstName,
            this.initialValues.lastName
          );
          this.dialog.closeAll();
          this.uiService.alertMessage('Updated', 'Email updated successfully', 'success');
        } catch (error) {
          this.uiService.alertMessage('Error', 'Failed to update Email', 'error');
        } finally {
          // Reset UI flags
          this.isPhoneEditable = false;
          this.phoneValueChanged = false;
          this.otpUiPhone = false;
          this.verifySpinnerForPhone = false;
        }
        // If no student found, directly update email in DB
      }
    } else {
      this.uiService.alertMessage('Oops', 'Wrong OTP', 'warning');
      this.verifySpinnerForPhone = false;
    }
  }

  async onSubmit(form: FormGroup) {
    if (form.valid) {
      this.isUpdating = false;

      // Simulate an update operation
      try {
        this.isUpdating = true;
        await this.UpdatePhoneForAuth(this.user.teacherMeta.phoneNumber, this.phoneNumberChange, this.user.teacherMeta.countryCode, this.newCountryCode, this.emailInput, form.value.firstName, form.value.lastName);
        this.dialog.closeAll();
        this.uiService.alertMessage('Updated', 'Name updated successfully', 'success');
        // Reset initial values and disable the button after updating
        this.initialValues = { firstName: form.value.firstName, lastName: form.value.lastName };
        this.btnDisabled = false;
      } catch (error) {
        this.uiService.alertMessage('Error', 'Failed to update details', 'error');
      }

      // this.isUpdating = false;
    }
  }

  deleteAccount() {
    const config = {
      title: 'Delete Profile',
      message: 'Are you sure you want to delete your profile?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().pipe(takeUntil(this._unsubscribeAll)).subscribe(async (result) => {
      if (result === 'confirmed') {

        try {
          await this.checkStudentsWithTeacherUid();
          await this.teacherService.deleteTeacher(this.user.docId);
          if (this.studentsWithTeacherUid.length === 0) {
            await this._userService.deleteUser(this.user.docId);
            await this.deleteAuthUser(this.user.docId);
          }

          await firstValueFrom(this.authService.signOut());
          await this.dialog.closeAll();
          await this._router.navigate(['/login']);

        } catch (error) {
          console.error('Error during account deletion:', error);
        }
      }
    })
  }

  async deleteAuthUser(uid: string) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/deleteAuthUser`;
    const formData = {
      uid
    };

    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise();
      return response;
    } catch (error: any) {
      console.error('Error response:', error);
      return error;
    }
  }

  async checkStudentsWithTeacherUid() {
    const querySnapshot = await firstValueFrom(
      this.studentService.getStudentByLinkUid(this.user.docId)
    );

    this.studentsWithTeacherUid = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}



