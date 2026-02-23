import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { ClassroomApprovalRejectionComponent } from './classroom-approval-rejection.component';
import { MatButtonModule } from '@angular/material/button';
export const approvalRoutes: Route[] = [
    {
      path: '',
      // resolve: { data: RegistrationResolver },
      component: ClassroomApprovalRejectionComponent
    }
  ];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(approvalRoutes),
    MatButtonModule
  ]
})
export class ClassroomApprovalRejectionModule { }
