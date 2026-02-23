import { Injectable } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/compat/functions';
import { lastValueFrom } from 'rxjs';
import { WANotification } from '../models/wa-notification';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExotelService {
  otp: number;

  constructor(
    private afFun: AngularFireFunctions,
    private httpClient: HttpClient,
  ) { }

  generateOtp = function(size: number) {
    const zeros = '0'.repeat(size - 1);
    const x = parseFloat('1' + zeros);
    const y = parseFloat('9' + zeros);
    const confirmationCode = Math.floor(x + Math.random() * y);
    return confirmationCode;
  };

  async sendSms(exotelData: any) {
    // this.afFun.useFunctionsEmulator(`http://localhost:5000/${environment.firebase.projectId}/asia-south1/get_user_login_token_from_phone`)
    // this.afFun.useFunctionsEmulator('http://127.0.0.1:5000');

    // const req = this.afFun.httpsCallable('exotelSms')(exotelData);
    const req = this.afFun.httpsCallable('exotelSmsV2')(exotelData);

    try {
      const response = await lastValueFrom(req);
      console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  }

  async createOTP(phone: string) {
    this.otp = this.generateOtp(6);

    const exotelData = {
      // docPath: d.path + '/Communications/welcome',
      username: environment.exotelAuthKey,
      password: environment.exotelAuthToken,
      SId: environment.exotelAccountSid,
      To: phone,
      From: environment.exotelSender,
      Body: `${environment.createOtpBody}`.replace('{{otp}}', this.otp.toString()).replace('{{platformName}}', environment.platformName).replace('{{timeout}}', environment.createOtpTimeout.toString()),
      DltTemplateId: `${environment.createOtpTemplateId}`,
      DltEntityId: environment.exotelEntityId,
    };

    this.sendSms(exotelData);
  }

  async changeMobileNumberOTP(phone: string) {
    this.otp = this.generateOtp(6);

    const exotelData = {
      // docPath: d.path + '/Communications/welcome',
      username: environment.exotelAuthKey,
      password: environment.exotelAuthToken,
      SId: environment.exotelAccountSid,
      To: phone,
      From: environment.exotelSender,
      Body: `${environment.changeMobileNumberOtpBody}`.replace('{{otp}}', this.otp.toString()).replace('{{newMobileNumber}}', phone.toString()).replace('{{platformName}}', environment.platformName).replace('{{timeout}}', environment.createOtpTimeout.toString()),
      DltTemplateId: `${environment.changeMobileNumberOtpTemplateId}`,
      DltEntityId: environment.exotelEntityId,
    };

    this.sendSms(exotelData);
  }

  changeMobileNumberSuccess(name: string, phone: string) {
    const exotelData = {
      username: environment.exotelAuthKey,
      password: environment.exotelAuthToken,
      SId: environment.exotelAccountSid,
      To: phone,
      From: environment.exotelSender,
      Body: `${environment.changeMobileNumberOtpBody}`.replace('{{name}}', name).replace('{{platformName}}', environment.platformName).replace('{{newMobileNumber}}', phone.toString()).replace('{{url}}', environment.createOtpTimeout.toString()),
      DltTemplateId: `${environment.changeMobileNumberOtpTemplateId}`,
      DltEntityId: environment.exotelEntityId,
    };
  }

  async createOTPWhatsApp(countryCode: string, phoneNumber: string) {
    this.otp = this.generateOtp(6);
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/whatsAppNotifications`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/whatsAppNotifications`;

    const formData: WANotification = {
      phoneNumber: countryCode + phoneNumber,
      // tmeplateName: "thinktac_login",
      templateName: environment.whatsAppTemplates.authenticationOtp.templateName,
      whatsAppImageHeader: environment.whatsAppTemplates.authenticationOtp.headerImage,
      whatsAppSender: environment.whatsAppSender,
      whatsAppNamespace: environment.whatsAppNamespace,
      whatsAppToken: environment.whatsAppToken,
      whatsAppUrl: environment.whatsAppUrl,
      params: [
        this.otp.toString()
      ],
      mediaType: 'text',
      urlRoute: undefined
    };

    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await lastValueFrom(this.httpClient.post<any>(endUrl, formData, httpOption));
      console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  }

}
