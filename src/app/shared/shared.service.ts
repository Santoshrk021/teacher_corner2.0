import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { WANotification } from 'app/core/models/wa-notification';
import { environment } from 'environments/environment';
import { first, lastValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import { UiService } from './ui.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { KekaEmployeesService } from 'app/core/dbOperations/keka-employees/keka-employees.service';
import { SlackChannelsService } from 'app/core/dbOperations/slack-channels/slack-channels.service';
import { SlackUsersService } from 'app/core/dbOperations/slack-users/slack-users.service';

@Injectable({
  providedIn: 'root'
})
export class SharedService {

  isWhatsappBtnVisible = true;

  constructor(
    private http: HttpClient,
    private uiService: UiService,
    private afAuth: AngularFireAuth,
    private teacherService: TeacherService,
    private kekaEmployeesService: KekaEmployeesService,
    private slackChannelsService: SlackChannelsService,
    private slackUsersService: SlackUsersService,
  ) { }

  async sendWhatsAppNotification(phoneNumber: string, templateName: string, params: string[], whatsAppImageHeader: string | any | undefined, mediaType: string | undefined, urlRoute: string | undefined) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/whatsAppNotifications`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/whatsAppNotifications`;
    // const endUrl = `http://127.0.0.1:5001/jigyasa-e3fbb/asia-south1/whatsAppNotifications`

    const formData: WANotification = {
      phoneNumber,
      templateName,
      whatsAppSender: environment.whatsAppSender,
      whatsAppNamespace: environment.whatsAppNamespace,
      whatsAppToken: environment.whatsAppToken,
      whatsAppUrl: environment.whatsAppUrl,
      params,
     whatsAppImageHeader,
      mediaType,
      urlRoute
    };

    // console.log('WhatsApp Notification Payload:', formData);
// return;
    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endUrl, formData, httpOption));
      // console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  }

  async checkWhatsAppMessageStatus(requestId: string) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/whatsAppMessageStatusChecker`;
    // const endUrl = `http://localhost:5000/backup-collection/asia-south1/whatsAppMessageStatusChecker`;

    const payload = {
      requestId,
    };
    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endUrl, payload, httpOption));
      return response;
    } catch (error) {
      console.error(error);
      return error;
    }
  }

  async sendWhatsAppNotificationWithImgtoAdmins(customAdminParam: string[], imageForAdminmessage: string, formData: any) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/waNotificationtoAdmins`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/waNotificationtoAdmins`;

    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endUrl, formData, httpOption));
      // console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  }

  async getCurrentUser() {
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const teacher = await lastValueFrom(this.teacherService.getTeacherByIdOnce(user.uid));
    const teacherMeta = teacher.exists ? teacher.get('teacherMeta') : {};
    const teacherName = `${teacherMeta?.firstName} ${teacherMeta?.lastName}`;

    // Extract 10-digit number and create both formats for searching
    const phoneNumber = user.phoneNumber || '';
    const tenDigitNumber = phoneNumber.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);
    const phoneWithCountryCode = `+91${tenDigitNumber}`;

    let kekaEmployees: Array<any> = [];

    // Try with +91 prefix first (work phone)
    kekaEmployees = await lastValueFrom(this.kekaEmployeesService.getKekaEmployeeByWorkPhoneNumber(phoneWithCountryCode));

    // Try without +91 prefix (work phone)
    if (!kekaEmployees || kekaEmployees.length === 0) {
      kekaEmployees = await lastValueFrom(this.kekaEmployeesService.getKekaEmployeeByWorkPhoneNumber(tenDigitNumber));
    }

    // Try with +91 prefix (home phone)
    if (!kekaEmployees || kekaEmployees.length === 0) {
      kekaEmployees = await lastValueFrom(this.kekaEmployeesService.getKekaEmployeeByHomePhoneNumber(phoneWithCountryCode));
    }

    // Try without +91 prefix (home phone)
    if (!kekaEmployees || kekaEmployees.length === 0) {
      kekaEmployees = await lastValueFrom(this.kekaEmployeesService.getKekaEmployeeByHomePhoneNumber(tenDigitNumber));
    }

    if (!kekaEmployees || kekaEmployees.length === 0) {
      this.uiService.alertMessage('Error', `Account not found in Keka for phone number ${user.phoneNumber}`, 'error');
    }
    const kekaName = kekaEmployees?.length ? kekaEmployees?.[0]?.displayName?.toString()?.replace(/[^a-zA-Z ]/g, '') : '';
    const slackUsers = kekaName.length ? await lastValueFrom(this.slackUsersService.getSlackUserByKekaName(kekaName)) : [];
    return { slackUsers, teacherName };
  }

  async getSlackChannelDetails(channelNames: Array<string>) {
    const slackChannels = await Promise.all(channelNames.map(async channelName => {
      const result: any = await lastValueFrom(this.slackChannelsService.getChannelByName(channelName));
      return result.empty ? null : result[0];
    }));
    return slackChannels;
  }

  async sendSlackNotifications(slackBearerToken: string, slackUsers: Array<any>, channels: Array<any>, messageContent: string) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/sendSlackNotifications`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/sendSlackNotifications`;

    const formData = {
      channels,
      messageContent,
      slackBearerToken,
      slackUsers,
    };

    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endUrl, formData, httpOption));
      // console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  }

  async sendSlackNotificationsWithImage(slackBearerToken: string, slackUsers: Array<any>, channels: Array<any>, messageContent: string, imageUrl: string, imageAltText: string) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/sendSlackNotifications`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/sendSlackNotifications`;

    const formData = {
      channels,
      messageContent,
      slackBearerToken,
      slackUsers,
      imageUrl,       //URL of the image to be sent
      imageAltText,  //Alternative text for the image
    };

    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endUrl, formData, httpOption));
      // console.log(response);
      return response;
    } catch (error) {
      console.error(error);
      return error;
    };
  }

  async sendToCloudFunction(endUrl: string, objectToCreate: any) {
    const formData = objectToCreate;

    const httpOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };

    try {
      const response = await lastValueFrom(this.http.post<any>(endUrl, formData, httpOptions));
      // console.log('Response from Cloud Function:', response);
      return response;
    } catch (error) {
      console.error('Error sending data to Cloud Function:', error);
      return error;
    }
  }

  convertTimestamps(obj: any) {
    if (typeof obj === 'object' && obj !== null) {
      // Check if the object has 'seconds' and 'nanoseconds'
      if ('seconds' in obj && 'nanoseconds' in obj) {
        return Timestamp.fromDate(new Date(obj.seconds * 1000 + obj.nanoseconds / 1000000));
      }

      if ('_seconds' in obj && '_nanoseconds' in obj) {
        return Timestamp.fromDate(new Date(obj._seconds * 1000 + obj._nanoseconds / 1000000));
      }

      // If it's an array, apply the function to each item
      if (Array.isArray(obj)) {
        return obj.map(item => this.convertTimestamps(item));
      }

      // Otherwise, it's an object, recursively apply to each property
      for (const key in obj) {
        obj[key] = this.convertTimestamps(obj[key]);
      }
    }

    // Return the object (or value if it's a primitive type) unchanged if no timestamps found
    return obj;
  }

  async requestLocationPermission(): Promise<{ latitude: number; longitude: number }> {
    if ('geolocation' in navigator) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            // console.log('Location access granted. Latitude:', latitude, 'Longitude:', longitude);
            resolve({ latitude, longitude });
          },
          (error) => {
            console.error('Error requesting location permission:', error);
            reject(error);
          }
        );
      });
    } else {
      console.error('Geolocation is not supported by this browser.');
      throw new Error('Geolocation is not supported by this browser.');
    }
  }

  async sendToCloudFunctionWithErrorHandling(endUrl: string, payload: any): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.http.post<any>(endUrl, payload, { observe: 'response' })
      );

      // Explicitly check for HTTP error status or response structure
      if (response.status >= 400 || response.body?.error) {
        console.error('Server returned an error:', response.body?.error || response);
        throw new Error(response.body?.error?.message || 'Server returned an error');
      }

      return response.body; // Return the response body if successful
    } catch (error) {
      console.error('Error in sendToCloudFunction:', error);

      // Rethrow the error to propagate it to the calling function
      throw error instanceof Error ? error : new Error('Unexpected error occurred');
    }
  }

  getFormattedDate(date: Timestamp): string {
    function getSuffix(day: number): string {
      if (day > 3 && day < 21) { return 'th'; } // Handle 11th to 19th
      switch (day % 10) {
        case 1:
          return 'st';
        case 2:
          return 'nd';
        case 3:
          return 'rd';
        default:
          return 'th';
      }
    }

    // Format the date
    const contestEndDate = new Date(date.seconds * 1000);
    const day = contestEndDate.getUTCDate();
    const month = contestEndDate.toLocaleString('default', { month: 'long' }); // "February"
    const year = contestEndDate.getUTCFullYear();

    const formattedDate = `${day}${getSuffix(day)} of ${month}, ${year}`;
    return formattedDate;
  }


  createExcelSheet(data: any, name: string) {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws);
    XLSX.writeFile(wb, `${name}.xlsx`);
  }



  copyToClipboard(textToCopy: any) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      console.info('Copied to clipboard:', textToCopy);
      this.uiService.alertMessage('Success', 'Successfully copied to clipboard', 'success');
    }).catch((error) => {
      console.error('Failed to copy:', error);
      this.uiService.alertMessage('Error', `Error copying to clipboard`, 'error');
    });
  }

}
