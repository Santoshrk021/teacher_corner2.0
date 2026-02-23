import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BasicInfoUploadTypeComponent } from './basic-info-upload-type/basic-info-upload-type.component';
import { CreateUploadTypeComponent } from './create-upload-type/create-upload-type.component';
import { ReviewUploadTypeComponent } from './review-upload-type/review-upload-type.component';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { CreateUploadTypeDialogComponent } from './create-upload-type-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from 'app/shared/shared.module';




@NgModule({
  declarations: [
    BasicInfoUploadTypeComponent,
    CreateUploadTypeComponent,
    ReviewUploadTypeComponent,
    CreateUploadTypeDialogComponent
  ],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    SharedModule,
    MatIconModule,
    MatStepperModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTooltipModule,
    MatSelectModule,
  ],

})
export class CreateUploadTypeDialogModule { }
