/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { DeviceDetectorService } from 'ngx-device-detector';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { SharedService } from './shared.service';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {
  timeIpSubject = new BehaviorSubject(null);
  constructor(
    private http: HttpClient,
    private deviceDetector: DeviceDetectorService,
    private sharedService: SharedService) { }
  getOsName() {
    return this.deviceDetector.os;
  }
  getOsVersion() {
    return this.deviceDetector.os_version;
  }
  getBrowserName() {
    return this.deviceDetector.browser;
  }
  getBrowserVersion() {
    return this.deviceDetector.browser_version;
  }
  getDeviceType() {
    return this.deviceDetector.deviceType;
  }
  isMobile() {
    return this.deviceDetector.isMobile();
  }
  isTablet() {
    return this.deviceDetector.isTablet();
  }
  isDesktop() {
    return this.deviceDetector.isDesktop();
  }
  getDeviceInfo() {
    return this.deviceDetector.getDeviceInfo();
  }

  //old method
  // getTime() {
  //     const timeObj = this.http.get<any>('https://worldtimeapi.org/api/timezone/Asia/Kolkata');
  //     return lastValueFrom(timeObj).then((a) => {
  //         this.timeIpSubject.next([a.unixtime * 1000, a.client_ip]);
  //     }).catch(err => console.error(err));
  // }


  // async getTime() {
  //   try {
  //     const data: any = await lastValueFrom(this.http.get('https://ipwho.is/'));
  //     // console.log(data);
  //     const unixMs = Date.now();
  //     const ip = data.ip;
  //     const timezone = data.timezone?.id || 'Unknown';
  //     // console.log('IPWHOIS data:', { unixMs, ip, timezone });
  //     this.timeIpSubject.next([unixMs, ip, timezone]);
  //   } catch (err) {
  //     console.error('Failed to get IP/timezone:', err);
  //   }
  // }

  async getTime() {
    try {
      const response = await lastValueFrom(
        this.http.get<any>(`https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/getClientInfo`)
      );
      // console.log(response);
      // Convert Firestore-style timestamp object to JS Date
      const utcDate = new Date(response.timestamp._seconds * 1000 + response.timestamp._nanoseconds / 1e6);
      // Or convert to Firestore Timestamp
      const firebaseTimestamp = Timestamp.fromMillis(utcDate.getTime());
      // console.log('UTC Date:', utcDate.toISOString());
      // console.log('Firestore Timestamp:', firebaseTimestamp.toDate().toISOString());
      this.timeIpSubject.next([utcDate, response.ip]);
      return [this.sharedService.convertTimestamps(response.timestamp), response.ip];
    } catch (err) {
      console.error('Error fetching time/IP:', err);
    }
  }
}
