import { CommonModule } from '@angular/common';
import { NgModule, Optional, SkipSelf } from '@angular/core';
import { getApp } from '@angular/fire/app';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireAnalyticsModule } from '@angular/fire/compat/analytics';
import { AngularFireAuthModule } from '@angular/fire/compat/auth';
import { AngularFireAuthGuardModule } from '@angular/fire/compat/auth-guard';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { getAnalytics, isSupported } from '@firebase/analytics';
import { environment } from 'environments/environment';


@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        AngularFireModule.initializeApp(environment.firebase),
        AngularFireModule,
        AngularFireAnalyticsModule,
        AngularFireAuthModule,
        AngularFireAuthGuardModule,
        AngularFirestoreModule,
        AngularFireStorageModule
    ]
})
export class DatabaseModule {

    constructor(
        @Optional() @SkipSelf() parentModule?: DatabaseModule
    ) {
        const app = getApp();
        isSupported().then((isAnalyticsSupported) => {
            if (isAnalyticsSupported) {
                getAnalytics(app);
            } else {
                console.error(`Firebase Analytics is not supported in ${environment.firebase.projectId}`);
            };
        });
        // Do not allow multiple injections
        if (parentModule) {
            throw new Error('DatabaseModule has already been loaded. Import this module in the AppModule only.');
        }
    }
}
