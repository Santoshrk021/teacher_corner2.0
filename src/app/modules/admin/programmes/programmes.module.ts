import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { FormsModule } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSortModule } from '@angular/material/sort';
import { MatRippleModule } from '@angular/material/core';
import { GetDownloadURLPipeModule } from '@angular/fire/compat/storage';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ProgrammesComponent } from './programmes.component';
import { MatInputModule } from '@angular/material/input';
import { ProgrammeListComponent } from './programme-list/programme-list.component';
import { LearningListComponent } from './learning-list/learning-list.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { AddNewProgrammeComponent } from './add-new-programme/add-new-programme.component';
import { FilterLearningListComponent } from './filter-learning-list/filter-learning-list.component';
import { ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { AssignmentListComponent } from './assignment-list/assignment-list.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { ProgramInfoComponent } from './program-info/program-info.component';
import { ReviewProgrammeComponent } from './review-programme/review-programme.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { NgxSliderModule } from 'ngx-slider-v2';
import { InstitutionSelectionComponent } from './institution-selection/institution-selection.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { InstitutionAssignmentComponent } from './institution-assignment/institution-assignment.component';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';

const ActivityRoutes: Route[] = [
  {
    path: '',
    component: ProgrammesComponent
  }
];

@NgModule({
  declarations: [
    LearningListComponent,
    ProgrammesComponent,
    ProgrammeListComponent,
    AddNewProgrammeComponent,
    FilterLearningListComponent,
    AssignmentListComponent,
    ProgramInfoComponent,
    ReviewProgrammeComponent,
    InstitutionSelectionComponent,
    InstitutionAssignmentComponent,
  ],
  imports: [
    CommonModule,
    MatAutocompleteModule,
    MatSortModule,
    MatStepperModule,
    DragDropModule,
    ReactiveFormsModule,
    CommonModule,
    MatIconModule,
    GetDownloadURLPipeModule,
    MatRippleModule,
    MatDividerModule,
    MatTableModule,
    MatSelectModule,
    MatInputModule,
    FormsModule,
    MatTabsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatButtonModule,
    RouterModule.forChild(ActivityRoutes),
    MatInputModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    FuseDrawerModule,
    NgxSliderModule,
    MatSlideToggleModule,
    InfiniteScrollModule
  ],
  providers: []
})
export class ProgrammesModule { }
