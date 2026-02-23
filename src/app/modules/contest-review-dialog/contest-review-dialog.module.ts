import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { ContestReviewDialogComponent } from './contest-review-dialog.component';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { RateSubmissionComponent } from './rate-submission/rate-submission.component';
import { RejectSubmissionComponent } from './reject-submission/reject-submission.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { FormDisplayComponent } from '../../shared/components/form-display/form-display.component';
import { MatTooltipModule } from '@angular/material/tooltip';

const route: Route[] = [
  { path: '', component: ContestReviewDialogComponent },
];

@NgModule({
  declarations: [
    ContestReviewDialogComponent,
    RateSubmissionComponent,
    RejectSubmissionComponent,
    FormDisplayComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(route),
    AngularFireStorageModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
  ]
})
export class ContestReviewDialogModule { }
