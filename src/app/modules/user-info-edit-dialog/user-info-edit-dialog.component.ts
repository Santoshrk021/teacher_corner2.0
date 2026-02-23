import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from 'app/core/auth/auth.service';
import { ExotelService } from 'app/core/auth/exotel.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { getAuth } from 'firebase/auth';
import { lastValueFrom } from 'rxjs';
@Component({
  selector: 'app-user-info-edit-dialog',
  templateUrl: './user-info-edit-dialog.component.html',
  styleUrls: ['./user-info-edit-dialog.component.scss']
})
export class UserInfoEditDialogComponent implements OnInit {
  infoForm: FormGroup;
  studentsProfiles: any[] = [];
  testOtp: number = 123456;
  phoneNumber: string = '';
  user;
  isserverError: boolean = false;
  serverError: { code: string; message: string } = { code: '', message: '' };
  phone: string;
  email: string;
  firstname: string;
  lastname: string;
  btnDisabled: boolean = true;
  //----------Phone Verification------//
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
  userInputOtp: any = '';
  timeOut: any;
  //---------------------------------//

  //----------Email Verification-------//
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
  verificationEmailCode: number;
  otpSend: number;
  phoneAuthError: { code: string; message: string } = { code: '', message: '' };
  isphoneAuthError: boolean;
  emailInput: string = '';
  emailLinkTimeout: any;
  emailTemplate;
  countryCode: string;

  //--------------------------------//
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private teacherService: TeacherService
    , private afAuth: AngularFireAuth,
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
  ) {
    this.user = data.currentUser;
  }

  async ngOnInit(): Promise<void> {
    this.setForm();
    this.email = this.user?.teacherMeta?.email || this.user?.studentMeta?.email;
    this.firstname = this.user?.teacherMeta?.firstName || this.user?.studentMeta?.firstName;
    this.lastname = this.user?.teacherMeta?.lastName || this.user?.studentMeta?.lastName;
    this.phoneNumber = this.user?.teacherMeta?.phoneNumber || this.user?.studentMeta?.phoneNumber;
    this.emailInput = this.user?.teacherMeta?.email || this.user?.studentMeta?.email;
    this.countryCode = this.user?.teacherMeta?.countryCode || this.user?.studentMeta?.countryCode;
    const obj = {
      firstName: this.firstname,
      email: this.email,
      lastName: this.lastname,
      phone: this.phoneNumber
    };
    this.infoForm.valueChanges.subscribe((x) => {
      if ((x.firstName != obj.firstName) || (x.lastName != obj.lastName)) {
        this.btnDisabled = false;
      }
      else {
        this.btnDisabled = true;
      }
    });
    const template = await this.configurationService.getEmailUpdateTemplate();
    this.emailTemplate = template['mailTemplate'];
  }

  onSubmit(infoForm) {
    const data = {
      firstName: this.infoForm.value.firstName,
      lastName: this.infoForm.value.lastName,
      name: this.infoForm.value.firstName + ' ' + this.infoForm.value.lastName,
      fullNameLowerCase: this.infoForm.value.firstName.toLowerCase().replace(/ /g, '') + this.infoForm.value.lastName.toLowerCase().replace(/ /g, '')
    };

    if (this.data.isStudent) {
      const value = {
        studentMeta: data
      };
      this.studentService.updateStudent(value, this.user.docId);
      this.uiService.alertMessage('Updated', 'Info Successfully Updated', 'success');
    }
    else {
      const value = {
        teacherMeta: data
      };
      this.teacherService.updateTeacher(value, this.user.docId);
      this.uiService.alertMessage('Updated', 'Info Successfully Updated', 'success');
    }
  }

  async verifyEmail() {
    if (this.verificationEmailCode == this.otpSend) {
      console.log('matched');
      const response = await this.updateEmailInAuth(this.emailInput, this.user.linkUid || this.user.docId);
      const email = this.checkEmailErrorInresponse(response);
      const teacherMeta = {
        email: email,
      };
      const teacherEmail = {
        teacherMeta: teacherMeta
      };
      const studentEmail = {
        studentMeta: teacherMeta
      };
      this.teacherService.updateTeacher(teacherEmail, this.user?.linkUid || this.user.docId);
      this.userService.updateLoginUser(teacherMeta, this.user?.linkUid || this.user.docId);

      const query: QueryFn = (ref: CollectionReference) => ref.where('linkUid', '==', this.user?.linkUid || this.user.docId);
      const doc = lastValueFrom(await this.studentService.getWithQuery(query));
      this.studentsProfiles = await doc;

      this.studentsProfiles.forEach((student) => {
        this.studentService.updateStudent(studentEmail, student.docId);
      });
      this.uiService.alertMessage('Updated', 'Successfully Updated', 'success');

      if (this.user?.linkUid || this.user.docId == getAuth().currentUser.uid) {
        const ph = this.countryCode + this.phoneNumber;
        const token = await this.getTokenFromPhone(this.countryCode, this.phoneNumber);
        this.authService.loginUsingToken(token);
      }
    }
    else {
      this.uiService.alertMessage('wrong OTP', 'Wrong OTP', 'warning');
    }
  }

  //-------------Phone Verification------------//
  /* Exotel sms verification */
  async verifyPhoneNumber() {
    const ph = this.countryCode + this.phoneNumber;
    if (this.userInputOtp && this.exotel.otp == this.userInputOtp) {
      const response = await this.updatePhoneNumber(ph, this.user.linkUid || this.user.docId);
      if (!response.err) {
        this.isphoneAuthError = false;
        this.phoneVerification.hideVerification = true;
        this.phoneVerification.numberChanged = false;
        this.phoneVerification.editPhoneAftersubmit = false;
        this.phoneVerification.disablePhoneInput = false;
        clearTimeout(this.timeOut);
        this.phoneVerification.hideResendbtn = true;
        const teacherMeta = {
          countryCode: this.countryCode,
          phoneNumber: this.phoneNumber
        };
        const value = {
          teacherMeta: teacherMeta
        };
        const studentPhone = {
          studentMeta: teacherMeta
        };

        this.teacherService.updateTeacher(value, this.user?.linkUid || this.user.docId);
        this.userService.updateLoginUser(teacherMeta, this.user?.linkUid || this.user.docId);
        const query: QueryFn = (ref: CollectionReference) => ref.where('linkUid', '==', this.user?.linkUid || this.user.docId);
        const doc = lastValueFrom(await this.studentService.getWithQuery(query));
        this.studentsProfiles = await doc;


        this.studentsProfiles.forEach((student) => {
          this.studentService.updateStudent(studentPhone, student.docId);
        });
        this.uiService.alertMessage('Updated', 'Successfully Updated', 'success');
        if (this.user?.linkUid || this.user.docId == getAuth().currentUser.uid) {
          const token = await this.getTokenFromPhone(this.countryCode, this.phoneNumber);
          this.authService.loginUsingToken(token);
        }
      } else {
        this.isphoneAuthError = true;
        this.handlePhoneServerError(response.err);
      }
    }
    else {
      this.uiService.alertMessage('Oops', 'Wrong OTP', 'warning');
    }
  }

  isNumeric(str: string): boolean {
    return /^\d+$/.test(str);
  }

  phoneChange(e) {
    const value = this.countryCode + e.target.value;
    this.phoneVerification.hideSubmitbtn = false;
    this.phoneVerification.hideResendbtn = true;
    const isnum = /^\d+$/.test(value.split('+')[1]);
    if (!isnum || value.length < 13) {
      this.phoneVerification.disableSubmit = true;
    }
    else {
      this.phoneVerification.disableSubmit = false;
    }
    if (value != this.phoneNumber) {
      this.phoneVerification.hideSubmitbtn = false;
      this.phoneVerification.numberChanged = true;
    } else {
      this.phoneVerification.hideSubmitbtn = true;
      this.phoneVerification.numberChanged = false;
    }
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
    this.userInputOtp = e.target.value;
  }

  async sendOTP() {
    const result = await this.checkPhoneNumberinAuth();
    if (!result.error) {
      this.phoneVerification.editPhoneAftersubmit = true;
      this.phoneVerification.disablePhoneInput = true;
      this.phoneVerification.numberChanged = true;
      this.phoneVerification.hideSubmitbtn = true;
      this.phoneVerification.hideVerification = false;
      this.phoneVerification.hideResendbtn = true;
      this.btnDisabled = true;
      const ph = this.countryCode + this.phoneNumber;
      this.exotel.changeMobileNumberOTP(this.phoneNumber);
      this.timeOut = setTimeout(() => {
        this.phoneVerification.hideVerification = true;
        this.phoneVerification.hideSubmitbtn = false;
        this.phoneVerification.hideResendbtn = false;
      }, 100000);
    }
    else {
      this.isphoneAuthError = true;
      this.handlePhoneServerError(result);
    }
  }

  editPhonenumber() {
    this.phoneVerification.hideSubmitbtn = false;
    this.phoneVerification.hideVerification = true;
    this.phoneVerification.editPhoneAftersubmit = false;
    this.phoneVerification.disablePhoneInput = false;
    this.phoneVerification.hideResendbtn = true;
    this.phoneVerification.disableSubmit = true;
    this.isphoneAuthError = false;
    clearTimeout(this.timeOut);
  }

  //---------------------------------------------//
  //-------------Email Verification------------//
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

  checkEmailErrorInresponse(response): string {
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
    const templateChnage = this.emailTemplate['html'].replace(/\b(?:PROFILENAME|PROFILEOTP|PROFILEEMAIL)\b/gi, matched => matchedObj[matched]);
    this.configurationService.AddNotifications(templateChnage, this.emailTemplate, this.emailInput);
  }

  async checkPhoneNumberinAuth(): Promise<any> {
    const ph = this.countryCode + this.phoneNumber;
    const body = {
      test: 'test',
      phone: ph
    };
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/update_user_profile`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/update_user_profile`;
    const response = await this.httpClient.post<any>(endUrl, body).toPromise().then((res) => {
      console.log(res);
      return res;
    });
    return response;
  }

  async checkEmailinAuth(): Promise<any> {
    const ph = this.countryCode + this.phoneNumber;
    const body = {
      test: 'test',
      email: this.emailInput
    };
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/update_user_profile`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/update_user_profile`;
    const response = await this.httpClient.post<any>(endUrl, body).toPromise().then((res) => {
      console.log(res);
      return res;
    });
    return response;
  }

  ngOnDestroy(): void {
  }

  setForm() {
    this.infoForm = this.fb.group({
      firstName: [this.user?.teacherMeta?.firstName || this.user.studentMeta.firstName, Validators.required],
      lastName: [this.user?.teacherMeta?.lastName || this.user?.studentMeta?.lastName, Validators.required],
      email: [this.user?.teacherMeta?.email || this.user?.studentMeta?.email, Validators.email],
      phone: [(this.user?.teacherMeta?.countryCode + this.user?.teacherMeta?.phoneNumber) || (this.user?.studentMeta?.countryCode + this.user?.studentMeta?.phoneNumber), Validators.required],
    });
  }

  async getTokenFromPhone(countryCode, phoneNumber) {
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

}
