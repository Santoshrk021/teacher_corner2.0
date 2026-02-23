import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormWorkflowComponent } from './form-workflow/form-workflow.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from 'app/shared/shared.module';
import { MatSelectModule } from '@angular/material/select';



@NgModule({
  declarations: [
    FormWorkflowComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  exports: [
    FormWorkflowComponent
  ]
})
export class FormModule { }
