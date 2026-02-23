import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageProgrammeTemplatesComponent } from './manage-programme-templates.component';
import { Route, RouterModule } from '@angular/router';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { GetDownloadURLPipeModule } from '@angular/fire/compat/storage';
import { MatRippleModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { NgxSliderModule } from 'ngx-slider-v2';
import { LearningUnitListComponent } from './learning-unit-list/learning-unit-list.component';
import { AddNewProgrammeTemplateComponent } from './add-new-programme-template/add-new-programme-template.component';
import { FilterLearningUnitListComponent } from './filter-learning-unit-list/filter-learning-unit-list.component';
import { ProgrammeTemplateInfoComponent } from './programme-template-info/programme-template-info.component';
import { ProgrammeTemplateListComponent } from './programme-template-list/programme-template-list.component';
import { ReviewProgrammeTemplateComponent } from './review-programme-template/review-programme-template.component';
import { AssignmentListComponent } from './assignment-list/assignment-list.component';

const programmeTemplateRoutes: Route[] = [
  {
    path: '',
    component: ManageProgrammeTemplatesComponent
  }
];

@NgModule({
  declarations: [
    ManageProgrammeTemplatesComponent,
    AddNewProgrammeTemplateComponent,
    FilterLearningUnitListComponent,
    LearningUnitListComponent,
    ProgrammeTemplateInfoComponent,
    ProgrammeTemplateListComponent,
    ReviewProgrammeTemplateComponent,
    AssignmentListComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GetDownloadURLPipeModule,
    DragDropModule,
    FuseDrawerModule,
    NgxSliderModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatStepperModule,
    MatTableModule,
    MatTabsModule,
    MatTooltipModule,
    RouterModule.forChild(programmeTemplateRoutes),
  ]
})
export class ManageProgrammeTemplatesModule { }
