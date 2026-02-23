import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageInstituteClassroomComponent } from './manage-institute-classroom.component';
import { Route, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRippleModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ManageInstituteClassroomResolver } from './manage-institute-classroom.resolver';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SharedModule } from 'app/shared/shared.module';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatStepperModule } from '@angular/material/stepper';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectInfiniteScrollModule } from 'ng-mat-select-infinite-scroll';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { textTransformPipeModule } from '@fuse/pipes/textTransform/textTransform.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { InstituteSelectionComponent } from './institute-selection/institute-selection.component';
import { ClassroomSelectionComponent } from './classroom-selection/classroom-selection.component';
import { AddStudentsComponent } from './add-students/add-students.component';
import { AddTeachersComponent } from './add-teachers/add-teachers.component';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SortByKeyPipe } from 'app/shared/pipes/sort-by-key.pipe';
import { MatExpansionModule } from '@angular/material/expansion';
import { AddStemClubStudentsComponent } from './add-stem-club-students/add-stem-club-students.component';
import { AddStemClubTeachersComponent } from './add-stem-club-teachers/add-stem-club-teachers.component';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { AddMasterSheetStudentsComponent } from './add-students/add-master-sheet-students/add-master-sheet-students.component';
const manageInstituteClassroomRoutes: Route[] = [
  {
    path: '',
    title: 'Manage institutes Classrooms',
    resolve: { data: ManageInstituteClassroomResolver },
    component: ManageInstituteClassroomComponent
  }
];

@NgModule({
  declarations: [
    SortByKeyPipe,
    ManageInstituteClassroomComponent,
    InstituteSelectionComponent,
    // ClassroomSelectionComponent,
    AddStudentsComponent,
    AddTeachersComponent,
    AddStemClubStudentsComponent,
    AddStemClubTeachersComponent,
    AddMasterSheetStudentsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(manageInstituteClassroomRoutes),
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
    AngularFireStorageModule
  ]
})
export class ManageInstituteClassroomModule { }
