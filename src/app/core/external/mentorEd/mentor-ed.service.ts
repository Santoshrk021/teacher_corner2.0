import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { firstValueFrom } from 'rxjs';
import { MentorEdFirestore } from './mentor-ed.firestore';

@Injectable({
  providedIn: 'root'
})
export class MentorEdService {
  baseUrl: string = environment.mentorEdPlatformUrl;

  constructor(
    private http: HttpClient,
    private mentorEdFirestore: MentorEdFirestore,
  ) { }

  async getOtpForRegistration(body: any) {
    const url = `${this.baseUrl}/user/v1/account/registrationOtp`;
    try {
      const response: HttpResponse<any> = await firstValueFrom(this.http.post(url, body, { observe: 'response' }));
      const otp = response.headers.get('x-otp-code');
      return otp;
    } catch (error) {
      console.error(`Error creating otp :`, error);
      return null;
    };
  }

  async createMenteeUsingOtp(body: any) {
    const url = `${this.baseUrl}/interface/v1/account/create`;
    try {
      const response = await firstValueFrom(this.http.post(url, body));
      return response?.['result'];
    } catch (error) {
      console.error(`Error creating mentee :`, error);
      return error?.error?.message;
    };
  }

  async login(body: any) {
    const url = `${this.baseUrl}/interface/v1/account/login`;
    try {
      const response = await firstValueFrom(this.http.post(url, body));
      const access_token = response?.['result'];
      return access_token;
    } catch (error) {
      console.error(`Error creating mentee :`, error);
      return null;
    };
  }

  async joinSession(sessionId: number, access_token: string) {
    const url = `${this.baseUrl}/mentoring/v1/sessions/enroll/${sessionId}`;
    const headers = {
      'x-auth-token': `bearer ${access_token}`,
    }

    try {
      const response = await firstValueFrom(this.http.post(url, {}, { headers }));
      return response?.['message'];
    } catch (error) {
      console.error(`Error joining session :`, error);
      return (error as HttpErrorResponse).error?.message || 'An error occurred while joining the session.';
    }
  }

  async saveMentorEdUserDetails(docId: string, userDetails: any) {
    return this.mentorEdFirestore.createWithId(userDetails, docId);
  }

  async updateMentorEdUserSingleField(docId: string, fieldName: string, fieldValue: any) {
    return this.mentorEdFirestore.updateSingleField(fieldName, fieldValue, docId);
  }

  generateCustomPassword(docId: string): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+[]{}|;:,.<>?';

    function getRandomChars(chars: string, count: number): string {
      return Array.from({ length: count }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }

    const uc = getRandomChars(uppercase, 2);
    const num = getRandomChars(numbers, 2);
    const sp = getRandomChars(specialChars, 3);
    // const rest = getRandomChars(uppercase + numbers + specialChars, 13); // fill up to desired length
    const rest = docId;

    // Shuffle result for better randomness
    const combined = rest + (uc + num + sp).split('').sort(() => 0.5 - Math.random()).join('');
    return combined;
  }

}
