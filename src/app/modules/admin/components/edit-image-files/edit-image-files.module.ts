import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EditImageFilesComponent } from './edit-image-files.component';
import { AddModule } from '../add/add.module';


@NgModule({
  declarations: [
    EditImageFilesComponent

  ],
  imports: [
    CommonModule,
    AngularFireStorageModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFirestoreModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatInputModule,
    MatListModule,
    MatProgressSpinnerModule,
    AddModule
  ],  
  exports:[
    EditImageFilesComponent
  ]
})
export class EditimageFilesModule { }
