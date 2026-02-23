import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
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
import { BasicInfoContestComponent } from './basic-info-contest/basic-info-contest.component';
import { CategoriesContestComponent } from './categories-contest/categories-contest.component';
import { ContestChallengeTypeDialogComponent } from './contest-challenge-type-dialog.component';
import { ReviewContestComponent } from './review-contest/review-contest.component';
import { StageInfoContestComponent } from './stage-info-contest/stage-info-contest.component';
import { ContestVisibilityComponent } from './contest-visibility/contest-visibility.component';
import { StudentsCustomCertificateModule } from 'app/modules/students-custom-certificate/students-custom-certificate.module';

const ContestsRoutes: Route[] = [
  {
    path: '',
    component: ContestChallengeTypeDialogComponent
  }
];

@NgModule({
  declarations: [
    ContestChallengeTypeDialogComponent,
    BasicInfoContestComponent,
    ReviewContestComponent,
    StageInfoContestComponent,
    CategoriesContestComponent,
    ContestVisibilityComponent
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatStepperModule,
    MatIconModule,
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
    MatAutocompleteModule,
    MatChipsModule,
    MatDialogModule,
    StudentsCustomCertificateModule,
    RouterModule.forChild(ContestsRoutes),
  ],
  exports: [ContestChallengeTypeDialogComponent]
})
export class ContestChallengeTypeDialogModule { }
