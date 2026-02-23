import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AddComponent } from './add.component';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { EditModule } from '../edit/edit.module';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ComponentFormModule } from '../component-form/component-form.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';


@NgModule({
  declarations: [
    AddComponent
  ],
  imports: [
    CommonModule,
    MatButtonModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSelectModule,
    EditModule,
    AngularFireStorageModule,
    MatTooltipModule,
    ComponentFormModule,
    MatProgressSpinnerModule,
    MatButtonModule

  ],
  exports:[
	AddComponent
  ]
})
export class AddModule { }
