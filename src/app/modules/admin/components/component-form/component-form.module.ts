import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComponentFormComponent } from './component-form.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';


@NgModule({
  declarations: [
    ComponentFormComponent
  ],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    FormsModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    FuseDrawerModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule
    
    ],
  exports: [
    ComponentFormComponent
  ]
})
export class ComponentFormModule { }
