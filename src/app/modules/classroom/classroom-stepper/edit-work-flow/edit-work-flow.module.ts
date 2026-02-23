import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule, MatRippleModule } from '@angular/material/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Route, RouterModule } from '@angular/router';
import { FuseAlertModule } from '@fuse/components/alert';
import { FuseCardModule } from '@fuse/components/card';
import { textTransformPipeModule } from '@fuse/pipes/textTransform/textTransform.module';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { SharedModule } from 'app/shared/shared.module';
import { MatSelectInfiniteScrollModule } from 'ng-mat-select-infinite-scroll';
import { EditWorkFlowComponent } from './edit-work-flow.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { MatDatepickerModule } from '@angular/material/datepicker';


const workFlowRoutes: Route[] = [
  {
    path: '',
    component: EditWorkFlowComponent
  }
];

@NgModule({
  declarations: [EditWorkFlowComponent

  ],
  providers: [{ provide: MatDialogRef, useValue: {} }],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule.forChild(workFlowRoutes),
    AngularFireStorageModule,
    AngularFirestoreModule,
    textTransformPipeModule,
    FuseAlertModule,
    FuseCardModule,
    FuseConfirmationModule,
    SharedModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    MatSelectInfiniteScrollModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatStepperModule,
    MatTooltipModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
  ]
})
export class EditWorkFlowModule { }
