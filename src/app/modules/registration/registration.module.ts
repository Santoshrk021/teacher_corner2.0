import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialogModule } from '@angular/material/dialog';

import { RouterModule } from '@angular/router';
import { FuseAlertModule } from '@fuse/components/alert';
import { FuseCardModule } from '@fuse/components/card';
import { SharedModule } from 'app/shared/shared.module';
import { registrationRoutes } from '../registration/registration.routing';
import { RegistrationComponent } from './registration.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectInfiniteScrollModule } from 'ng-mat-select-infinite-scroll';
import { AngularFireModule } from '@angular/fire/compat';
import { environment } from 'environments/environment';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { textTransformPipeModule } from '@fuse/pipes/textTransform/textTransform.module';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClassroomApprovalRejectionComponent } from './classroom-approval-rejection/classroom-approval-rejection.component';
import { DragDropModule } from '@angular/cdk/drag-drop';




@NgModule({
  declarations: [RegistrationComponent, ClassroomApprovalRejectionComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(registrationRoutes),
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    FuseCardModule,
    FuseAlertModule,
    SharedModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatStepperModule,
    MatTooltipModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectInfiniteScrollModule,
    AngularFirestoreModule,
    textTransformPipeModule,
    MatDialogModule,
    DragDropModule,
  ]
})
export class RegistrationModule { }
