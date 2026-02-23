import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { ClassroomApprovalComponent } from './classroom-approval.component';
import { MatButtonModule } from '@angular/material/button';

export const approvalRoutes: Route[] = [
  {
    path: '',
    // resolve: { data: RegistrationResolver },
    component: ClassroomApprovalComponent
  }
];


@NgModule({
  declarations: [ClassroomApprovalComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(approvalRoutes),
    MatButtonModule
  ]
})
export class ClassroomApprovalModule { }
