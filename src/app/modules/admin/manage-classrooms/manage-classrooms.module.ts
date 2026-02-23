import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Route, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { FuseDrawerModule } from '@fuse/components/drawer';

import { InfiniteScrollModule } from 'ngx-infinite-scroll';

import { ManageClassroomsComponent } from './manage-classrooms.component';
import { SelectProgrammesComponent } from './select-programmes/select-programmes.component';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

const routes: Route[] = [
  {
    path: '',
    component: ManageClassroomsComponent
  }
];


@NgModule({
  declarations: [ManageClassroomsComponent, SelectProgrammesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    FuseConfirmationModule,
    FuseDrawerModule,
    DragDropModule,
    InfiniteScrollModule,
    AngularFireStorageModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSortModule,
    MatTabsModule,
    MatTooltipModule,
  ]
})
export class ManageClassroomsModule { }
