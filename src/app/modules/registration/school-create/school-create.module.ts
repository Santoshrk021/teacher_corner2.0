import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SchoolCreateComponent } from './school-create.component';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FuseCardModule } from '@fuse/components/card';
import { FuseAlertModule } from '@fuse/components/alert';
import { SharedModule } from 'app/shared/shared.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectInfiniteScrollModule } from 'ng-mat-select-infinite-scroll';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { textTransformPipeModule } from '@fuse/pipes/textTransform/textTransform.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';



@NgModule({
  declarations: [SchoolCreateComponent],
  imports: [
    CommonModule,
    MatAutocompleteModule,
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
    FormsModule,
    ReactiveFormsModule,
    MatSelectInfiniteScrollModule,
    // AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    textTransformPipeModule,
    MatDialogModule,
    MatTooltipModule
  ]
})
export class SchoolCreateModule { }
