import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { fuseAnimations } from '@fuse/animations';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { ExotelService } from 'app/core/auth/exotel.service';
import { OutreachService } from 'app/modules/admin/outreach/outreach.service';
import { UiService } from 'app/shared/ui.service';
import { UserService } from 'app/shared/user.service';
import { environment } from 'environments/environment';
import phone from 'phone';
import { first, lastValueFrom, Subject } from 'rxjs';
import { serverTimestamp } from '@angular/fire/firestore';

@Component({
    selector: 'app-outreach-teacher-registration',
    templateUrl: './outreach-teacher-registration.component.html',
    styleUrls: ['./outreach-teacher-registration.component.scss'],
    animations: fuseAnimations,
})
export class OutreachTeacherRegistrationComponent implements OnInit, OnDestroy {
    code = '';
    outreach: any = null;

    firstName = '';
    lastName = '';
    designation = '';

    phoneNumber = '';
    verificationCode: any;

    hideVerification = true;
    sendOTPBtnHide = true;
    resendOTPBtnHide = true;
    sendOTPBtnTimeDisabled = false;
    consentInput = false;
    invalidOtp = false;
    otpExceedError = false;
    resendCount = false;

    loginSpinner = false;
    timeLeft = 60;
    interval: any;

    otpCount = 0;
    userOtpResendCount = 0;
    maxotpAttempts = 3;

    countryCodes: Array<any>;
    selectedCountryCode: any;
    storagePath: string = 'assets/country_flags/';
    storageFormat: string = '.png?alt=media';
    environment = environment;
    disableButtonClick: boolean = false;

    private _unsubscribeAll: Subject<any> = new Subject();

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private outreachService: OutreachService,
        private configurationService: ConfigurationService,
        private uiService: UiService,
        private userService: UserService,
        public exotel: ExotelService,
        private httpClient: HttpClient,
        private afAuth: AngularFireAuth,
        private teacherService: TeacherService,
        private classroomService: ClassroomsService,
    ) {}

    ngOnDestroy(): void {
        this.stopTimer();
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    async ngOnInit(): Promise<void> {
        this.code = String(this.route.snapshot.paramMap.get('code') || '').trim();
        if (!this.code) {
            this.uiService.alertMessage('Error', 'Invalid outreach code', 'error');
            return;
        }

        await this.getCountryCodes();
        this.configurationService.getMaxOtpAttempts().then((d: any) => {
            this.maxotpAttempts = d.maxOtpAttempt['maximum_invalid_otp_attempts'];
        });

        try {
            this.outreach = await this.outreachService.getOutreachByUniqueCode(this.code);
            if (!this.outreach?.institutionId) {
                this.uiService.alertMessage('Error', 'Invalid outreach link', 'error');
                return;
            }
        } catch (e) {
            console.error(e);
            this.uiService.alertMessage('Error', 'Failed to load outreach link', 'error');
        }
    }

    async getCountryCodes() {
        const getCountryCodes = await lastValueFrom(this.configurationService.getCountryCodesList().pipe(first()));
        this.countryCodes = getCountryCodes?.countryCodes;
        this.selectedCountryCode = getCountryCodes.countryCodes?.india;
    }

    onchangeInputs(): void {
        const f = (this.firstName || '').trim();
        const l = (this.lastName || '').trim();
        const d = (this.designation || '').trim();

        const num: any = [this.phoneNumber];
        const phoneOk = phone(this.selectedCountryCode?.phone + num).isValid;

        if (f && l && d && phoneOk) {
            this.sendOTPBtnHide = false;
        } else {
            this.sendOTPBtnHide = true;
            this.hideVerification = true;
        }
    }

    async sendLoginCode(): Promise<void> {
        const phoneFull = this.selectedCountryCode?.phone + this.phoneNumber;

        const data1 = {
            user: phoneFull,
            loggedInAt: serverTimestamp(),
        };
        await this.userService.updateUserLoginAttempt(phoneFull, data1);
        const userOtpdata: any = await lastValueFrom(this.userService.getOtpPhoneDetails(phoneFull));

        this.userOtpResendCount =
            typeof userOtpdata.data().otpAttempts !== 'undefined'
                ? userOtpdata?.data()?.otpAttempts
                : this.userOtpResendCount;

        this.otpCount =
            typeof userOtpdata.data().otpAttempts !== 'undefined'
                ? userOtpdata?.data()?.otpAttempts + 1
                : this.otpCount + 1;

        const data = {
            user: phoneFull,
            otpAttempts: this.otpCount,
            updatedAt: serverTimestamp(),
        };

        if (this.userOtpResendCount < this.maxotpAttempts) {
            this.userService.updateOtpForPhone(phoneFull, data);
        }

        const currentDate = new Date(userOtpdata.data().loggedInAt?.toDate()?.toDateString());
        const updatedate =
            typeof userOtpdata.data().otpAttempts !== 'undefined'
                ? new Date(userOtpdata.data().updatedAt?.toDate()?.toDateString())
                : currentDate;

        if (currentDate > updatedate) {
            data.otpAttempts = 1;
            this.userService.updateOtpForPhone(phoneFull, data);
            this.userOtpResendCount = 1;
        }

        if (this.userOtpResendCount < this.maxotpAttempts) {
            this.sendOTPBtnHide = true;
            this.timeLeft = 60;
            this.resendCount = true;
            this.hideVerification = false;

            if (this.selectedCountryCode?.phone === '+91') {
                this.exotel.createOTP(this.phoneNumber);
            } else {
                this.exotel.createOTPWhatsApp(this.selectedCountryCode?.phone, this.phoneNumber);
            }

            setTimeout(() => {
                this.sendOTPBtnHide = false;
                this.resendOTPBtnHide = false;
                this.resendCount = false;
            }, 60000);

            this.startTimer();
        } else {
            this.otpExceedError = true;
            this.sendOTPBtnTimeDisabled = true;
            this.hideVerification = true;
        }
    }

    async verifyLoginCode(): Promise<void> {
        this.loginSpinner = true;

        if (!(this.verificationCode && this.exotel.otp == this.verificationCode)) {
            this.invalidOtp = true;
            this.loginSpinner = false;
            return;
        }

        const countryCode = this.selectedCountryCode?.phone;
        const phoneNumber = this.phoneNumber;
        const phoneFull = countryCode + phoneNumber;

        const resetOtpData = {
            user: phoneFull,
            otpAttempts: 0,
            updatedAt: serverTimestamp(),
        };
        this.userService.updateOtpForPhone(phoneFull, resetOtpData);
        this.userOtpResendCount = 0;

        try {
            const token = await this.getTokenFromPhone(countryCode, phoneNumber);
            const signInResult = await this.afAuth.signInWithCustomToken(token);
            const uid = signInResult?.user?.uid;
            if (!uid) {
                this.uiService.alertMessage('Error', 'Login failed', 'error');
                this.loginSpinner = false;
                return;
            }

            await this.registerTeacherUsingCloudFunction(uid);
        } catch (e) {
            console.error(e);
            this.uiService.alertMessage('Error', 'Failed to login', 'error');
            this.loginSpinner = false;
        }
    }

    async registerTeacherUsingCloudFunction(uid: string): Promise<void> {
        const institutionId = String(this.outreach?.institutionId || '').trim();
        const institutionName = String(this.outreach?.institutionName || '').trim();
        if (!institutionId) {
            this.uiService.alertMessage('Error', 'Institution not found for this outreach link', 'error');
            this.loginSpinner = false;
            return;
        }

        const classrooms: any[] = await lastValueFrom(this.classroomService.getAllClassroomByInstitute(institutionId));
        if (!classrooms?.length) {
            this.uiService.alertMessage('Error', 'No classroom found for this institution', 'error');
            this.loginSpinner = false;
            return;
        }

        const teacherClassrooms = (classrooms || []).map((cls: any) => {
            const classroomId = cls?.docId || cls?.classroomId;
            const classroomName = cls?.classroomName;
            const grade = Number(cls?.grade || 1);
            const section = String(cls?.section || 'A');
            const type = cls?.type || 'CLASSROOM';
            const userRole = cls?.userRole || 'schoolTeacher';

            const programmesList = cls?.programmes ? Object.values(cls.programmes) : [];
            const programmes = (programmesList || []).map((prog: any) => {
                if (!prog) return prog;
                const { workflowIds, ...rest } = prog;
                return rest;
            }).filter((p: any) => typeof p !== 'undefined');

            return {
                institutionId,
                institutionName,
                classroomId,
                classroomName,
                grade,
                section,
                type,
                userRole,
                programmes,
            };
        }).filter((c: any) => c?.classroomId && c?.programmes?.length !== 0);

        if (!teacherClassrooms.length) {
            this.uiService.alertMessage('Error', 'No programmes found for classrooms in this institution', 'error');
            this.loginSpinner = false;
            return;
        }

        const preferred = classrooms.find(c => String(c?.classroomName || '').trim() === '1 A') || classrooms[0];
        const preferredClassroomId = preferred?.docId || preferred?.classroomId;
        const preferredProgrammeId = preferred?.programmes ? Object.keys(preferred.programmes)[0] : null;

        const firstName = String(this.firstName || '').trim();
        const lastName = String(this.lastName || '').trim();
        const fullNameLowerCase = `${firstName.toLowerCase().replace(/ /g, '')}${lastName.toLowerCase().replace(/ /g, '')}`;
        const countryCode = String(this.selectedCountryCode?.phone || '').trim();
        const phoneNumber = String(this.phoneNumber || '').trim();

        const userDetailsWithClassroom: any = {
            isBulkUpload: false,
            isTeacher: true,
            firstName,
            lastName,
            fullNameLowerCase,
            countryCode,
            phoneNumber,
            email: '',
            teacherClassrooms,
        };

        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
        const formData = {
            userClassroomDetails: userDetailsWithClassroom,
        };
        const httpOption: any = {
            responseType: 'application/json',
        };

        try {
            const response: any = await lastValueFrom(this.httpClient.post<any>(endUrl, formData, httpOption).pipe(first()));
            if (!response) {
                this.uiService.alertMessage('Oops', 'Please try again', 'error');
                this.loginSpinner = false;
                return;
            }

            if (this.outreach?.docId) {
                await this.outreachService.addTeacherRegistered(this.outreach.docId, uid);
            }

            if (this.designation?.trim()) {
                await this.teacherService.updateTeacher({ teacherMeta: { designation: this.designation.trim() } }, uid);
            }

            this.loginSpinner = false;
            await this.router.navigate(['dashboard'], {
                queryParams: {
                    institutionId,
                    classroomId: preferredClassroomId,
                    programmeId: preferredProgrammeId,
                },
            });
        } catch (error) {
            console.error('HTTP Error:', error);
            this.uiService.alertMessage('Error', error?.message || 'Network error', 'error');
            this.loginSpinner = false;
        }
    }

    async getTokenFromPhone(countryCode: string, phoneNumber: string) {
        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_users_and_get_firebase_login_token_from_phone`;
        const formData = {
            countryCode,
            phoneNumber,
            accessLevel: 9,
        };
        const httpOption: any = {
            responseType: 'application/json',
        };
        return await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then(response => response).catch(error => error);
    }

    transform(value: number): string {
        const minutes: number = Math.floor(value / 60);
        return ('00' + minutes).slice(-2) + ':' + ('00' + Math.floor(value - minutes * 60)).slice(-2);
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
}
