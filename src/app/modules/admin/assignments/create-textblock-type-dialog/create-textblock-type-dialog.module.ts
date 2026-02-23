import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreateTextblockTypeDialogComponent } from './create-textblock-type-dialog.component';
import { BasicInfoTextblockTypeComponent } from './basic-info-textblock-type/basic-info-textblock-type.component';
import { CreateTextblockTypeComponent } from './create-textblock-type/create-textblock-type.component';
import { ReviewTextblockTypeComponent } from './review-textblock-type/review-textblock-type.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { QuillModule } from 'ngx-quill';
import { SharedModule } from 'app/shared/shared.module';



@NgModule({
  declarations: [
    CreateTextblockTypeDialogComponent,
    BasicInfoTextblockTypeComponent,
    CreateTextblockTypeComponent,
    ReviewTextblockTypeComponent
  ],
  imports: [
    CommonModule,
    QuillModule.forRoot(),
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatStepperModule,
    MatTooltipModule,
  ]
})
export class CreateTextblockTypeDialogModule { }
