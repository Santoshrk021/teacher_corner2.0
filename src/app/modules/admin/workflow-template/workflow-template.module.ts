import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WorkflowTemplateComponent } from './workflow-template.component';
import { Route, RouterModule } from '@angular/router';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
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
import { FuseAlertModule } from '@fuse/components/alert';
import { FuseCardModule } from '@fuse/components/card';
import { textTransformPipeModule } from '@fuse/pipes/textTransform/textTransform.module';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { SharedModule } from 'app/shared/shared.module';
import { MatSelectInfiniteScrollModule } from 'ng-mat-select-infinite-scroll';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatCardModule } from '@angular/material/card';
import { WorkflowStepDialogComponent } from './workflow-step-dialog/workflow-step-dialog.component';
import { ManageWorkflowTemplateTrashComponent } from './manage-workflow-template-trash/manage-workflow-template-trash.component';
import { MatTabsModule } from '@angular/material/tabs';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { PDFModule } from 'app/modules/media/pdf.module';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';



@NgModule({
  declarations: [
    WorkflowTemplateComponent,
    WorkflowStepDialogComponent,
    // ManageWorkflowTemplateTrashComponent
  ],
  imports: [
    CommonModule,
    // RouterModule.forChild(route),
    AngularFirestoreModule,
    AngularFireStorageModule,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatStepperModule,
    MatTooltipModule,
    FuseAlertModule,
    FuseCardModule,
    FuseConfirmationModule,
    SharedModule,
    MatSelectInfiniteScrollModule,
    MatSlideToggleModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    MatNativeDateModule,
    MatRippleModule,
    textTransformPipeModule,
    MatSidenavModule,
    MatCardModule,
    MatTabsModule,
    PDFModule,
    MatProgressBarModule,
    MatButtonToggleModule
  ]
})
export class WorkflowTemplateModule { }
