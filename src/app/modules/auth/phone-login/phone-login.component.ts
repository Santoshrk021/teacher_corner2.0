
import { Component, NgZone, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseLoadingService } from '@fuse/services/loading';
import { AuthService } from 'app/core/auth/auth.service';
import { ConsentService } from 'app/shared/consent.service';
import { DomainService } from 'app/shared/domain.service';
import { getAuth, RecaptchaVerifier } from 'firebase/auth';
@Component({
    selector: 'app-phone-login',
    templateUrl: './phone-login.component.html',
    styleUrls: ['./phone-login.component.scss']
})
export class PhoneLoginComponent implements OnInit {

    user;
    windowRef: any;
    phoneNumber: string = '';
    verificationCode: string;
    invalidOTP = false;
    userEmail: any;
    hideVerification: boolean = true;
    phoneNumValidity = false;
    captchaHide: boolean = true;
    sendOTPBtnHide = true;
    resendOTPBtnHide = true;
    sendOTPBtnTimeDisabled = false;
    consentInput = false;
    ramanUI = false;
    disableLoginBtn = false;
    selectedCountryCode: string = '+91';

    constructor(
        private _authService: AuthService,
        private ngZone: NgZone,
        private domainService: DomainService,
        private consentService: ConsentService,
        private router: Router,
        private _activatedRoute: ActivatedRoute,
        private afAuth: AngularFireAuth,
        private _fuseLoadingService: FuseLoadingService,
    ) {
    }
    ngOnInit(): void {
        this.getCaptchaWidgetId();
        const domain = this.domainService.getDomain();
        if (!domain.includes('raman')) {
            this.ramanUI = true;
        }
    }

    onchangePhone() {
        const num: any = [this.phoneNumber];
        if (/^\d{10}$/.test(num)) {
            this.captchaHide = false;
        } else {
            this.captchaHide = true;
            this.sendOTPBtnHide = true;
            this.hideVerification = true;
        }
    }

    getCaptchaWidgetId() {
        this.ngZone.run(() => {
            const auth = getAuth();
            this.windowRef = this.getWindow;
            this.windowRef.recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
                'size': 'visible',
                'callback': () => {
                    this.ngZone.run(() => {
                        this.captchaHide = true;
                        this.sendOTPBtnHide = false;
                    });
                },
                'expired-callback': () => {
                    console.error('Expired');
                    this.captchaHide = false;
                    // Response expired. Ask user to solve reCAPTCHA again.
                    // ...
                }
            }, auth);
            this.windowRef.recaptchaVerifier
                .render()
                .then((widgetId) => {
                    this.windowRef.recaptchaWidgetId = widgetId;
                });
        });
    }

    async sendLoginCode() {
        this.invalidOTP = false;
        this.sendOTPBtnTimeDisabled = true;
        const appVerifier = this.windowRef.recaptchaVerifier;
        const num = this.selectedCountryCode + this.phoneNumber;
        (await this.afAuth.settings).appVerificationDisabledForTesting = true;
        this.afAuth
            .signInWithPhoneNumber(num, appVerifier)
            .then((result) => {
                this.windowRef.confirmationResult = result;
                this.hideVerification = false;
                this.resendOTPBtnHide = false;
                setTimeout(() => {
                    this.sendOTPBtnTimeDisabled = false;
                }, 5000 * 6);
            })
            .catch(error => console.log(error));
    }

    verifyLoginCode() {
        this.disableLoginBtn = true;
        this.windowRef.confirmationResult.confirm(this.verificationCode).then(async (result) => {
            await this._authService.updateFirstLogin(result.user);
            this.user = result.user;
            this.login(this.user);

            if (await this._authService.isFirstTimeUser() && this.domainService.isRamanDomain()) {
                const num = '91' + this.phoneNumber;
                await this.consentService.postRegWhatsappMsg(num);
            }
            this.disableLoginBtn = false;

        })
            .catch((error) => {
                console.error(error.message);
                if (error.code === 'auth/invalid-verification-code') {
                    this.invalidOTP = true;
                }
                this.disableLoginBtn = false;

            });
    }
    getWindow() {
        return window;
    }
    async login(user) {

        const checkFirstLogin = await this._authService.isFirstTimeUser();
        if (checkFirstLogin) {
            const userDetails = await this._authService.getFirstLoginUserData(user);
            this._authService.addFirstTimeLogin(userDetails);
        }
        const loginDetails = await this._authService.getLoginUserData(user);
        await this._authService.addLogin(loginDetails, user);

        // Navigate to the redirect url
        const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/dashboard';

        this._fuseLoadingService._setLoadingStatus(true, redirectURL);

        this.router.navigateByUrl(redirectURL);
    }
}
