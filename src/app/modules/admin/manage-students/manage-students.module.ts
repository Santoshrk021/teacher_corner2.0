import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ManageStudentsComponent } from './manage-students.component';

import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { FuseDrawerModule } from '@fuse/components/drawer';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { InstitutionInfoModule } from './institution-info/institution-info.module';
import { StudentInfoComponent } from './student-info/student-info.component';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { CustomTooltipModule } from 'app/shared/directives/custom-tooltip/custom-tooltip.module';
import { StudentRemoteMappComponent } from './student-info/student-remote-mapp/student-remote-mapp.component';
import { MatDialogModule } from '@angular/material/dialog';

const studentRoutes: Routes = [
  {
    path: '',
    component: ManageStudentsComponent
  }
];

@NgModule({
  declarations: [
    ManageStudentsComponent,
    StudentInfoComponent,
    StudentRemoteMappComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(studentRoutes),
    FormsModule,
    ReactiveFormsModule,
    FuseConfirmationModule,
    FuseDrawerModule,
    InfiniteScrollModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatSelectModule,
    MatStepperModule,
    MatTooltipModule,
    AngularFireStorageModule,
    CustomTooltipModule,
    MatDialogModule,
    InstitutionInfoModule
  ]
})
export class ManageStudentsModule { }
