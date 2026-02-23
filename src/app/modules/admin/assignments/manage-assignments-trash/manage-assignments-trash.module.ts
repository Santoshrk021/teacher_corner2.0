import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { ManageAssignmentsTrashComponent } from './manage-assignments-trash.component';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { MatTooltipModule } from '@angular/material/tooltip';
const routes: Route[] = [
    {
      path: '',
      component: ManageAssignmentsTrashComponent
    }
  ];


@NgModule({
  declarations: [ManageAssignmentsTrashComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatButtonModule,
    MatTabsModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FuseConfirmationModule,
    MatTooltipModule,
    MatIconModule

  ]
})
export class ManageAssignmentsTrashModule { }
