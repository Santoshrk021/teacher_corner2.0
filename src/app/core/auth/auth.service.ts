
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ActivatedRoute, Router } from '@angular/router';
import { FirstLoginData } from 'app/core/auth/models/first-login';
import { LoginData } from 'app/core/auth/models/login';
import { UserService } from 'app/core/user/user.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { increment, serverTimestamp } from 'firebase/firestore';
import { catchError, first, lastValueFrom, map, Observable, of, ReplaySubject, switchMap, throwError } from 'rxjs';
import { DomainService } from '../../shared/domain.service';
import { TeacherService } from '../dbOperations/teachers/teachers.service';
import { FuseLoadingService } from '@fuse/services/loading';
import { WANotification } from '../models/wa-notification';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { Auth, updateProfile } from 'firebase/auth';
// import firebase from 'firebase/compat';

@Injectable()
export class AuthService {
    private _authenticated: boolean = false;
    private _user$ = { uid: '', phone: ',' };
    authUserSubject = new ReplaySubject(1);
    // private recaptchaVerifier: firebase.auth.RecaptchaVerifier | null = null;
    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private _userService: UserService,
        private afAuth: AngularFireAuth,
        private afs: AngularFirestore,
        private domainService: DomainService,
        private deviceInfoService: DeviceInfoService,
        private _teacherService: TeacherService,
        private _router: Router,
        private _activatedRoute: ActivatedRoute,

        private _fuseLoadingService: FuseLoadingService,
        private functions: AngularFireFunctions,
        // private auth: Auth

    ) {
        this.start();
        // this.signOut();
    }

    loginUsingToken(token) {
        return this.afAuth.signInWithCustomToken(token)
            .then((re) => {
                // this.welcomeGreetingWANotificationFirstTimeLogin();
                // Navigate to the redirect url

                // localStorage.setItem('user','user')
                const redirectURL = this._activatedRoute.snapshot.queryParamMap.get('redirectURL') || '/registration-page';
                // console.log(redirectURL);

                this._fuseLoadingService._setLoadingStatus(true, redirectURL);
                this._router.navigateByUrl(redirectURL);
            }).catch(e => false);
    }

    initializeApp(user: any) {
        // this.afAuth.authState.subscribe((user: User) => {
        this.authUserSubject.next(user);
        this._user$.uid = user.uid;
        this._user$.phone = user.phoneNumber;
        this._teacherService.updateUser();
        // this.checkClassroom(user.uid)
        // })
    }
    // async checkClassroom(uid: string) {
    //     this._teacherService.getAllTeacherClassroom(uid).pipe(map(cls => cls?.classrooms || [])).subscribe(teacherCls => {
    //         if (teacherCls.length == 0) {
    //             this._router.navigate(['registration'])
    //         }
    //     })
    // }

    getLogedInUid() {
        return this._user$.uid;
    }

    getLogedInUser() {
        return this._user$;
    }

    async getFirstLoginUserData(user) {
        const [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
        const firstTimeUserInfo: FirstLoginData = {
            phone: user.phoneNumber,
            uid: user.uid,
            registeredAt: serverTimestamp(),
            registeredDomain: this.domainService.getDomain()
        };
        return firstTimeUserInfo;
    }

    async getLoginUserData(user) {
        const [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
        const userInfo: LoginData = {
            domain: this.domainService.getDomain(),
            timestamp: serverTimestamp(),
            uid: user.uid,
            ipAddress: ip,
            browserInfo: this.deviceInfoService.getDeviceInfo()
        };
        return userInfo;
    }

    async addLogin(userData, user) {
        if (!this.checkTestPhones(user.phoneNumber))
            {await this.afs.collection('Logins').add(userData);}
        this.accessToken = user?.accessToken !== undefined ? user?.accessToken : user.refreshToken;
        this._authenticated = true;
        this._userService.user = user;
        return of(user);

        /* ----------------------------Developer------------------------------------------------------- */
        // Store the user on the user service
        // const userObj = await this.afAuth.currentUser;
        // userObj.updateProfile({
        //     displayName: 'Manzoor',
        //     photoURL: "https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBA01%2FV12%2FTACiMAGE.PNG?alt=media&token=244babf6-5009-4081-b750-e81c0fd0dd84"
        // });

        // return this._user.next(user);
        // user['avatar'] = "https://firebasestorage.googleapis.com/v0/b/tactile-education-services-pvt.appspot.com/o/TACtivities%2FBA01%2FV12%2FTACiMAGE.PNG?alt=media&token=244babf6-5009-4081-b750-e81c0fd0dd84"
        // Set the authenticated flag to true
        // Store the user on the user service
        // console.log(user);

        /*
            id: string;
            name: string;
            email: string;
            avatar?: string;
            status?: string;
        */

        /*  let profileData = {
             accessToken: this.accessToken,
             tokenType: "bearer",
             user: {
                 avatar: "assets/images/avatars/brian-hughes.jpg",
                 email: "hughes.brian@company.com",
                 id: "cfaad35d-07a3-4447-a6c3-d8c3d54fd5df",
                 name: "Brian Hughes",
                 status: "online",
             }
         }
         this._userService.user = profileData.user; */

    }

    checkTestPhones(phone) {
        const phNos = ['+918003555725', '+918018823385', '+918249320948'];
        return phNos.includes(phone);
    }

    async addFirstTimeLogin(user) {
        await this.afs.collection('Users').doc(user.uid).set(
            user, { merge: true });
    }

    async isFirstTimeUser() {
        const userObj = this.afAuth.authState.pipe(first());
        const user = await lastValueFrom(userObj);
        return user?.metadata && user.metadata.creationTime === user.metadata.lastSignInTime;
    }

    // async isFirstTimeUser(user) {
    //     return user?.metadata && user.metadata.creationTime === user.metadata.lastSignInTime;
    // }

    updateFirstLogin(user) {
        if (user?.metadata && user.metadata.creationTime === user.metadata.lastSignInTime) {
            return this.afs.doc('Counters/firstTimeLogins').set({
                [this.domainService.getDomain()]: {
                    latestLogin: serverTimestamp(),
                    count: increment(1)
                },
                // totalRegistrations: increment(1)
            }, { merge: true }).then(() => {
                // let firstTimeUserInfo: FirstLogin;
                // this.afs.collection('Users').doc(user.uid).set({
                //     registeredDomain: this.domainService.getDomain(),
                //     registeredAt: serverTimestamp(),
                //     registeredBrowserInfo: this.deviceInfoService.getDeviceInfo(),
                //     uid: user.uid,
                //     phone: user?.phoneNumber || '',
                //     email: user?.email || '',
                // }, { merge: true });
            });
        }
        return;
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for access token
     */
    set accessToken(token: string) {
        localStorage.setItem('accessToken', token);
    }

    // eslint-disable-next-line @typescript-eslint/member-ordering
    get accessToken(): string {
        return localStorage.getItem('accessToken') ?? '';
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Forgot password
     *
     * @param email
     */
    forgotPassword(email: string): Observable<any> {
        return this._httpClient.post('api/auth/forgot-password', email);
    }

    /**
     * Reset password
     *
     * @param password
     */
    resetPassword(password: string): Observable<any> {
        return this._httpClient.post('api/auth/reset-password', password);
    }

    /**
     * Sign in
     *
     * @param credentials
     */
    signIn(credentials: { email: string; password: string }): Observable<any> {
        // Throw error, if the user is already logged in
        if (this._authenticated) {
            return throwError('User is already logged in.');
        }

        return this._httpClient.post('api/auth/sign-in', credentials).pipe(
            switchMap((response: any) => {
                // console.log("sign in api response : \n" + response);

                // Store the access token in the local storage
                this.accessToken = response.accessToken;
                // console.log();

                // Set the authenticated flag to true
                this._authenticated = true;

                // Store the user on the user service
                this._userService.user = response.user;

                // Return a new observable with the response
                return of(response);
            })
        );
    }

    /**
     * Sign in using the access token
     */
    signInUsingToken(): Observable<any> {
        // Sign in using the token
        return this._httpClient.post('api/auth/sign-in-with-token', {
            accessToken: this.accessToken
        }).pipe(
            catchError(() =>

                // Return false
                of(false)
            ),
            switchMap((response: any) => {

                // Replace the access token with the new one if it's available on
                // the response object.
                //
                // This is an added optional step for better security. Once you sign
                // in using the token, you should generate a new one on the server
                // side and attach it to the response object. Then the following
                // piece of code can replace the token with the refreshed one.
                if (response.accessToken) {
                    this.accessToken = response.accessToken;
                }

                // Set the authenticated flag to true
                this._authenticated = true;

                // Store the user on the user service
                this._userService.user = response.user;

                // Return true
                return of(true);
            })
        );
    }

    /**
     * Sign out
     */
    signOut(): Observable<any> {
        // Remove the access token from the local storage
        localStorage.removeItem('accessToken');
        this.afAuth.signOut();

        // Set the authenticated flag to false
        this._authenticated = false;

        // Return the observable
        return of(true);
    }

    /**
     * Sign up
     *
     * @param user
     */
    signUp(user: { name: string; email: string; password: string; company: string }): Observable<any> {
        return this._httpClient.post('api/auth/sign-up', user);
    }

    /**
     * Unlock session
     *
     * @param credentials
     */
    unlockSession(credentials: { email: string; password: string }): Observable<any> {
        return this._httpClient.post('api/auth/unlock-session', credentials);
    }

    // -
    /**
     * Check the authentication status
     */
    check(): Observable<boolean> {
        // // Check if the user is logged in
        // if (this._authenticated) {
        //     return of(true);
        // }

        // // Check the access token availability
        // if (!this.accessToken) {
        //     return of(false);
        // }

        // // Check the access token expire date
        // if (AuthUtils.isTokenExpired(this.accessToken)) {
        //     return of(false);
        // }

        // // If the access token exists and it didn't expire, sign in using it
        // return this.signInUsingToken();
        return this.afAuth.authState.pipe(map((user) => {
            if (Boolean(user?.uid)) {
                this.initializeApp(user);
                return true;
            } else {
                return false;
            }
        }));
    }

    public start(): void {

        window.addEventListener(
            'storage',
            this.storageEventListener.bind(this)
        );
    }

    private storageEventListener(event: StorageEvent) {
        if (event.storageArea == localStorage) {
            if (event?.key && event.key == 'logout-event') {
                console.log(
                    '🔥 ~ storageEventListener ~ event',
                    event.newValue
                );
                // this.logOut();
                //alert('loggingout');
                this._router.navigate(['/sign-out']);

            }
        }
    }

    public stop(): void {
        window.removeEventListener(
            'storage',
            this.storageEventListener.bind(this)
        );
    }

    getUserByPhoneNumber(phoneNumber: string): Observable<any> {
        const callable = this.functions.httpsCallable('getUserByPhoneNumber');
        return callable({ phoneNumber: phoneNumber });
    }

   async getUserByPhoneNumber2(phoneNumber: string){
        // Construct the URL with the query parameter
        const functionUrl = 'http://localhost:5000/backup-collection/asia-south1/getUserByPhoneNumber2/';
        // const url = `${functionUrl}?phoneNumber=${encodeURIComponent(phoneNumber)}`;
        const body = { phoneNumber };
        console.log(body);
        const httpOption: any = {
            responseType: 'application/json'
          };
          console.log(httpOption);
        // Make the GET request and return the Observable
        try {
          const response= await lastValueFrom(this._httpClient.post<any>(functionUrl, body, httpOption));
          console.log(response);
          return response;
        } catch (error) {
            console.log(error);
            return error;
        }

    }
    // async updateUserByPhoneNumber(phoneNumber: string) {
    //     try {

    //       const user = await this.afAuth.currentUser;
    //       if (user) {
    //         // Update the user's profile
    //         await user.updateProfile({
    //           displayName: updateData.displayName,
    //           photoURL: updateData.photoURL,
    //           phoneNumber: updateData.phoneNumber
    //         });
    //         console.log('User profile updated successfully');
    //       } else {
    //         console.error('No authenticated user found');
    //       }
    //     } catch (error) {
    //       console.error('Error updating user:', error);
    //     }
    //   }


    //   async updateUserProfile(phoneNumber: string): Promise<void> {
    //     const user = this.auth.currentUser;
    //     if (user) {
    //       try {
    //         await updateProfile(user, { phoneNumber: phoneNumber });
    //         console.log("User profile updated successfully.");
    //       } catch (error) {
    //         console.error("Error updating user profile:", error);
    //       }
    //     } else {
    //       console.error("No user is signed in.");
    //     }
    //   }

  /*  private initRecaptchaVerifier() {
        if (!this.recaptchaVerifier) {
          this.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
            size: 'invisible', // Use 'normal' if you want a visible reCAPTCHA
            callback: (response: any) => {
              console.log('reCAPTCHA solved:', response);
            },
            'expired-callback': () => {
              console.error('reCAPTCHA expired. Please try again.');
            },
          });
        }
      }

      /**
       * Sends OTP to the provided phone number.
       * @param phoneNumber The phone number to send OTP.
       * @returns A Promise that resolves with the verification ID.
       */

  /*    async sendOTP(phoneNumber: string): Promise<string> {
        try {

          this.initRecaptchaVerifier();


          const confirmationResult = await firebase.auth().signInWithPhoneNumber(phoneNumber, this.recaptchaVerifier!);

          console.log('OTP sent to:', phoneNumber);
          return confirmationResult.verificationId; // Return the verification ID
        } catch (error) {
          console.error('Error sending OTP:', error);
          throw error;
        }
      }
    updatePhoneNumber(verificationId: string, verificationCode: string) {
        const credential = firebase.auth.PhoneAuthProvider.credential(verificationId, verificationCode);


        const currentUser = firebase.auth().currentUser;

        if (currentUser) {

          return currentUser.updatePhoneNumber(credential).then(() => {
            console.log('Phone number updated successfully!');
          }).catch((error) => {
            console.error('Error updating phone number:', error);
          });
        } else {
          console.error('No authenticated user found.');
          return Promise.reject('No authenticated user found.');
        }
      }
        */
}
