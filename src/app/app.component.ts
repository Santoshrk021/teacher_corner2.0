import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FuseAlertService } from '@fuse/components/alert';
import { FuseLoadingService } from '@fuse/services/loading';
import { firstValueFrom, Subscription, } from 'rxjs';
import { UserService } from './core/dbOperations/user/user.service';
import { DeviceInfoService } from './shared/deviceInfoService';
import { UiService } from './shared/ui.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { environment } from 'environments/environment';
import { SharedService } from './shared/shared.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  type;
  alertMsg;

  allcontentsTypes = ['guide', 'material', 'observation', 'template', 'varGuide', 'topicGuide', 'additional resources'];
  alertTitle;
  dismissible: boolean = false;
  visible = false;
  subscriptionRef: Subscription[] = [];

  currentUser: any;
  loggedInUser: any;
  cookieStatus: boolean = false;
  isLoggedIn: boolean = false;
  user;
  LUtypes = [];


  /**
   * Constructor
   */
  constructor(
    private deviceService: DeviceInfoService,
    private _fuseLoadingService: FuseLoadingService,
    private userService: UserService,
    private afAuth: AngularFireAuth,
    private _fuseAlertService: FuseAlertService,
    private uiService: UiService,
    private afs: AngularFirestore,
    private sharedService: SharedService,
  ) {
    // this.preloadAllCollections().catch(console.error);
    this.deviceService.getTime();
    this.uiService.snackbarSubject.subscribe((res: any) => {
      this.type = res.type;
      this.alertMsg = res.message;
      this.alertTitle = res.title;
      this.dismissible = true;
      if (res) {
        this.alertMessage('alertBox1');
      }
    });
    this._fuseLoadingService.hide();
  }

  async ngOnInit(): Promise<void> {
    const subscription = this.afAuth.authState.subscribe((data) => {
      this.user = data;
      this.getLoggedinUser(data);
    });
    this.subscriptionRef.push(subscription);
    this.test();
    this.requestLocationPermission();
    // this.addPrivateChannel();
    // this.getChannel('C095QSD3820').subscribe((data) => {
    //   console.log('Channel Data:', data);
    // });
    // this.setChannel();
  }

  alertMessage(name) {
    this._fuseAlertService.show(name);
    setTimeout(() => {
      this._fuseAlertService.dismiss(name);
    }, 3000);
  }

  getLoggedinUser(user) {
    this.currentUser = user;
    this.loggedInUser = this.userService.getUser(this.currentUser?.uid);
    this.loggedInUser.subscribe((data) => {
      this.cookieStatus = data?.cookieConsent;
    });
  }

  addCookietouser() {
    const value = {
      cookieConsent: true,
    };
    this.userService.updateLoginUser(value, this.currentUser.uid);
    this.checkUserCookie();
  }

  checkUserCookie() {
    const userSubscription = this.userService
      .getUser(this.currentUser.uid)
      .subscribe((data) => {
        this.loggedInUser = data;
        if (
          data.cookieConsent == 'false' ||
          typeof data.cookieConsent == 'undefined'
        ) {
          this.cookieStatus = false;
        } else {
          this.cookieStatus = true;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscriptionRef.length) { this.subscriptionRef.map(d => d.unsubscribe()); }
  }

  addOne(s) {
    let x = Number(s);
    x++;
    const num = ('000' + String(x)).slice(-4);
    return num;
  }

  requestLocationPermission(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location access granted. Latitude:', position.coords.latitude, 'Longitude:', position.coords.longitude);
          // Handle the location data here
        },
        (error) => {
          console.error('Error requesting location permission:', error);
          // Handle the error or permission denial here
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

  async test(): Promise<void> {
    //write script here

  }


}