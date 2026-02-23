import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Route, RouterModule } from '@angular/router';
import { AllContestsTableComponent } from './all-contests-table/all-contests-table.component';
import { ContestsComponent } from './contests.component';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import {ClipboardModule} from '@angular/cdk/clipboard';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { StudentsCustomCertificateModule } from 'app/modules/students-custom-certificate/students-custom-certificate.module';
import { AllNominationsInfoComponent } from './all-nominations-info/all-nominations-info.component';
import { ContestDetailRedirectGuard } from './contest-detail-redirect.guard';


const ContestsRoutes: Route[] = [
  { path: '', component: ContestsComponent },                // -> /contests
  { path: ':contestId', component: AllNominationsInfoComponent, canActivate: [ContestDetailRedirectGuard] }, // -> /contests/:contestId
];


@NgModule({
  declarations: [
    ContestsComponent,
    AllContestsTableComponent,
    // CreateContestDialogComponent,
    // BasicInfoContestComponent,
    // ReviewContestComponent,
    // CreateContestStepComponent,
    // StageInfoContestComponent,

  ],
  imports: [
    RouterModule.forChild(ContestsRoutes),
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatStepperModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatRippleModule,
    MatMenuModule,
    MatTooltipModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    FuseConfirmationModule,
    ClipboardModule,
    FuseDrawerModule,
    StudentsCustomCertificateModule
    // MatProgressSpinnerModule
  ],
  // schemas: [CUSTOM_ELEMENTS_SCHEMA],
  //  providers: [
  //   { provide: MAT_DIALOG_DATA, useValue: {} },
  //   { provide: MatDialogRef, useValue: {} }
  // ]
})
export class ContestsModule { }
