import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageInstitutionComponent } from './manage-institution.component';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { textTransformPipeModule } from '@fuse/pipes/textTransform/textTransform.module';
import { SharedModule } from 'app/shared/shared.module';
import { MatSelectInfiniteScrollModule } from 'ng-mat-select-infinite-scroll';
import { InstitutionInfoComponent } from './institution-info/institution-info.component';
import { ProgrammeTemplateComponent } from './programme-template/programme-template.component';
import { ReviewTemplateComponent } from './review-template/review-template.component';
import { EditProgrammeTemplateComponent } from './edit-programme-template/edit-programme-template.component';



@NgModule({
  declarations: [
    ManageInstitutionComponent,
    InstitutionInfoComponent,
    ProgrammeTemplateComponent,
    ReviewTemplateComponent,

  ],
  imports: [
    CommonModule,
    MatIconModule,
    MatFormFieldModule,
    MatRippleModule,
    MatSelectModule,
    MatButtonModule,
    MatTooltipModule,
    MatButtonModule,
    MatCheckboxModule,
    MatInputModule,
    MatProgressSpinnerModule,
    SharedModule,
    MatAutocompleteModule,
    MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectInfiniteScrollModule,
    AngularFirestoreModule,
    textTransformPipeModule,
    MatDialogModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatExpansionModule,
  ]
})
export class ManageInstitutionModule { }
