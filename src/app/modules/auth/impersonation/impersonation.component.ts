import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from 'app/core/auth/auth.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { environment } from 'environments/environment';
import phone from 'phone';
import { Subject, first, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-impersonation',
  templateUrl: './impersonation.component.html',
  styleUrls: ['./impersonation.component.scss']
})
export class ImpersonationComponent implements OnInit, OnDestroy {

  phoneNumber: string = '';
  disableLoginBtn = false;
  existsPhone: boolean = true;
  password;
  passwordInput = false;
  countryCodes: Array<any>;
  selectedCountryCode: any;
  private _unsubscribeAll: Subject<any> = new Subject();
  storagePath: string = 'assets/country_flags/';
  storageFormat: string = '.png?alt=media';
  // isLoggedIn: boolean = false;
  environment = environment;

  constructor(
    private _authService: AuthService,
    private httpClient: HttpClient,
    private configurationService: ConfigurationService,
  ) {
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  ngOnInit(): void {
    this.getCountryCodes();
  }

  async getCountryCodes() {
    const getCountryCodes = await lastValueFrom(this.configurationService.getCountryCodesList().pipe(first()));
    this.countryCodes = getCountryCodes?.countryCodes;
    this.selectedCountryCode = getCountryCodes.countryCodes?.india;
    /*
    this.configurationService.getTeacherCornerConfigurations().pipe(take(1)).subscribe(res => {
      this.countryCodes = res?.countryCodes;
      this.selectedCountryCode = res?.countryCodes?.India;
    })
    */
  }

  onchangePhone() {
    this.existsPhone = true;
    const num: any = [this.phoneNumber];
    if (phone(this.selectedCountryCode.phone + num).isValid) {
    // if (/^\d{10}$/.test(num)) {
      this.disableLoginBtn = false;
      this.passwordInput = true;
    } else {
      this.disableLoginBtn = true;
      this.passwordInput = false;

    }
  }

  async loginPhone() {
    if (this.password.toString() == this.getPassword().toString()) {
      const firebaseAuthToken: any = await this.getTokenFromPhone(this.selectedCountryCode?.phone, this.phoneNumber);
      if (firebaseAuthToken == 'auth/user-not-found') {
        this.existsPhone = false;
      } else {
        await this._authService.loginUsingToken(firebaseAuthToken);
        // this.isLoggedIn = true;
      }
    }
    else {
      alert('wrong password');
    }
  }

  async getTokenFromPhone(countryCode: string, phoneNumber: string) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/add_users_and_get_firebase_login_token_from_phone`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/add_users_and_get_firebase_login_token_from_phone`;
    const formData = {
      countryCode: countryCode,
      phoneNumber: phoneNumber,
      isImpersonation: true
    };
    const httpOption: any = {
      responseType: 'application/json'
    };
    return await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then(response => response).catch(error => JSON.stringify(error));
  }

  getPassword() {
    const today = new Date();
    const year = today.getFullYear();
    const mm = today.getMonth() + 1; // Months start at 0!
    const dd = today.getDate();
    let date;
    let month;
    if (dd < 10) {
      date = '0' + dd;
    } else {date = dd;}
    if (mm < 10) {
      month = '0' + mm;
    } else {month = mm;}
    return date.toString() + month.toString() + year.toString();
  }

  onImageError(event: Event) {
    // (event.target as HTMLInputElement).style.display = "none";
    (event.target as HTMLInputElement).style.visibility = 'hidden';
    // this.isImageLoaded = false;
    // console.log(this.isImageLoaded);
  }

  onImageLoad() {
    (event.target as HTMLInputElement).style.visibility = 'visible';
    // this.isImageLoaded = true;
    // console.log(this.isImageLoaded);
  }

}
