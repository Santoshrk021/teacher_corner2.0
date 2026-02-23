import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { BasicInfoFormTypeComponent } from './basic-info-form-type/basic-info-form-type.component';
import { CreateFormTypeComponent } from './create-form-type/create-form-type.component';
import { ReviewFormTypeComponent } from './review-form-type/review-form-type.component';

import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CreateFormTypeDialogComponent } from './create-form-type-dialog.component';
import { MatCheckboxModule } from '@angular/material/checkbox';



@NgModule({
  declarations: [
    BasicInfoFormTypeComponent,
    CreateFormTypeComponent,
    ReviewFormTypeComponent,
    CreateFormTypeDialogComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatTooltipModule,
  ]
})
export class CreateFormTypeDialogModule { }
