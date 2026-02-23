import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { ExotelService } from '../../../core/auth/exotel.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { Subject, first, lastValueFrom, take, takeUntil } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { environment } from 'environments/environment';
import phone from 'phone';
import { UserService } from 'app/shared/user.service';
import { serverTimestamp } from '@angular/fire/firestore';
@Component({
    selector: 'app-exotel-sms-otp-login',
    templateUrl: './exotel-sms-otp-login.component.html',
    styleUrls: ['./exotel-sms-otp-login.component.scss'],
    animations: fuseAnimations,
})
export class ExotelSmsOtpLoginComponent implements OnInit, OnDestroy {
    phoneNumber: string = '';
    verificationCode: any;
    hideVerification: boolean = true;
    sendOTPBtnHide = true;
    resendOTPBtnHide = true;
    sendOTPBtnTimeDisabled = false;
    consentInput = false;
    invalidOtp = false;
    loginSpinner: boolean = false;
    timeLeft: number = 60; // Set the initial time to 60 seconds
    interval: any;
    otpCount = 0;
    userOtpResendCount = 0;
    testOtp = 123456;
    maxotpAttempts = 3;
    otpExceedError=false;
    resendCount = false;
    countryCodes: Array<any>;
    selectedCountryCode;
    private _unsubscribeAll: Subject<any> = new Subject();
    storagePath: string = 'assets/country_flags/';
    storageFormat: string = '.png?alt=media';
    environment = environment;
    disableButtonClick: boolean = false;

    constructor(
        private _authService: AuthService,
        public exotel: ExotelService,
        private httpClient: HttpClient,
        private configurationService: ConfigurationService,
        private userService: UserService
    ) {}

    ngOnDestroy() {
        this.stopTimer();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    ngOnInit(): void {
        this.getCountryCodes();
        this.configurationService.getMaxOtpAttempts().then((d: any) => {
            this.maxotpAttempts =
                d.maxOtpAttempt['maximum_invalid_otp_attempts'];
        });
    }

  async getCountryCodes() {
    const getCountryCodes = await lastValueFrom(this.configurationService.getCountryCodesList().pipe(first()));
    this.countryCodes = getCountryCodes?.countryCodes;
    this.selectedCountryCode = getCountryCodes.countryCodes?.india;
    /*
    this.configurationService.getTeacherCornerConfigurations().pipe(take(1)).subscribe(res => {
      // this.countryCodes = res?.["countryCodes"]
      // this.selectedCountryCode = res?.["countryCodes"]?.filter(item => item.hasOwnProperty("India"))[0];
      this.countryCodes = res?.countryCodes;
      this.selectedCountryCode = res?.countryCodes?.India;
    })
    */
  }

  onchangePhone() {
    const num: any = [this.phoneNumber];
    if(phone(this.selectedCountryCode.phone + num).isValid) {
    // if (/^\d{10}$/.test(num)) {
      this.sendOTPBtnHide = false;
    } else {
      this.sendOTPBtnHide = true;
      this.hideVerification = true;
    }
  }

    async sendLoginCode() {
        //------------------------------checking otp count------------------------//
        const phone = this.selectedCountryCode?.phone + this.phoneNumber;
        const data1 = {
            user: phone,
            loggedInAt: serverTimestamp(),
        };
        await this.userService.updateUserLoginAttempt(phone, data1);
        const userOtpdata: any = await lastValueFrom(
            this.userService.getOtpPhoneDetails(phone)
        );

        this.userOtpResendCount =
            typeof userOtpdata.data().otpAttempts !== 'undefined'
                ? userOtpdata?.data()?.otpAttempts
                : this.userOtpResendCount;
        this.otpCount =
            typeof userOtpdata.data().otpAttempts !== 'undefined'
                ? userOtpdata?.data()?.otpAttempts + 1
                : this.otpCount + 1;
        const data = {
            user: phone,
            otpAttempts: this.otpCount,
            updatedAt: serverTimestamp(),
        };
        if (this.userOtpResendCount < this.maxotpAttempts) {
            this.userService.updateOtpForPhone(phone, data);
        }

        const currentDate = new Date(
            userOtpdata.data().loggedInAt?.toDate()?.toDateString()
        );
        const updatedate =
            typeof userOtpdata.data().otpAttempts !== 'undefined'
                ? new Date(
                    userOtpdata.data().updatedAt?.toDate()?.toDateString()
                  )
                : currentDate;
        if (currentDate > updatedate) {
            data.otpAttempts = 1;
            this.userService.updateOtpForPhone(phone, data);
            this.userOtpResendCount = 1;
        }

        //-----------------------------------------------------------------//
        if (this.userOtpResendCount < this.maxotpAttempts) {
            this.sendOTPBtnHide = true;
            this.timeLeft = 60;
            this.resendCount = true;
            this.hideVerification = false;
            // const ph = this.selectedCountryCode?.phone + this.phoneNumber;
            if (this.selectedCountryCode?.phone === '+91') {
                this.exotel.createOTP(this.phoneNumber);
                // this.exotel.createOTPWhatsApp(ph);
            } else {
                // console.log("Send whatsapp to :", ph)
                // this.exotel.createOTP(ph);
              this.exotel.createOTPWhatsApp(this.selectedCountryCode?.phone, this.phoneNumber);
            }
            setTimeout(() => {
                this.sendOTPBtnHide = false;
                this.resendOTPBtnHide = false;
                this.resendCount = false;
            }, 60000);
            this.startTimer();
        } else {
            this.otpExceedError=true;
            this.sendOTPBtnTimeDisabled=true;
            this.hideVerification=true;
        }
    }

    async verifyLoginCode() {
        this.loginSpinner = true;
        const ph = this.selectedCountryCode?.phone + this.phoneNumber;
        // console.log(ph);
        // if (true) {
        //   const firebaseAuthToken = await this.getTokenFromPhone(ph);
        //   this._authService.loginUsingToken(firebaseAuthToken);
        // }
        if (this.verificationCode && this.exotel.otp == this.verificationCode) {
            const data = {
                user: ph,
                otpAttempts:  this.otpCount,
                updatedAt:serverTimestamp()
            };
            data.otpAttempts = 0;
            this.userService.updateOtpForPhone(ph, data);
            this.userOtpResendCount=0;
            const firebaseAuthToken = await this.getTokenFromPhone(this.selectedCountryCode?.phone, this.phoneNumber);
            this._authService.loginUsingToken(firebaseAuthToken);
        } else {
            this.invalidOtp = true;
            this.loginSpinner = false;
        }
    }

  /*
  // async getTokenFromPhone(phone) {
  //   const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_users_and_get_firebase_login_token_from_phone`;
  //   const formData = {
  //     phone: phone
  //   }
  //   const httpOption: any = {
  //     responseType: 'application/json'
  //   };
  //   return await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then((response) => {
  //     console.log(response)
  //     return response
  //   }).catch(error => {
  //     return error
  //   });
  // }
  */

  async getTokenFromPhone(countryCode: string, phoneNumber: string) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_users_and_get_firebase_login_token_from_phone`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/add_users_and_get_firebase_login_token_from_phone`;
    const formData = {
      countryCode,
      phoneNumber,
      accessLevel: 9
    };
    const httpOption: any = {
      responseType: 'application/json'
    };
    return await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then(response => response).catch(error => error);
  }

    // set otp counter format
    transform(value: number): string {
        const minutes: number = Math.floor(value / 60);
        return (
            ('00' + minutes).slice(-2) +
            ':' +
            ('00' + Math.floor(value - minutes * 60)).slice(-2)
        );
    }

    // otp counter timer start
    startTimer() {
        this.interval = setInterval(() => {
            if (this.timeLeft > 0) {
                this.timeLeft--;
            } else {
                this.stopTimer();
            }
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.interval);
        this.resendCount = false;
        this.resendOTPBtnHide;
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

}
