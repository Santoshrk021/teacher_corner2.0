import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssignmentsUploadComponent } from './assignments-upload.component';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const assignmentsUploadRoutes: Route[] = [
  {
    path: '',
    component: AssignmentsUploadComponent
  },
];


@NgModule({
  declarations: [AssignmentsUploadComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(assignmentsUploadRoutes),
    MatButtonModule,
    MatIconModule
  ]
})
export class AssignmentsUploadModule { }
