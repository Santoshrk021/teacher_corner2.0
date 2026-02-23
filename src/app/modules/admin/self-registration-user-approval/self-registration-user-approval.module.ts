import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Route, RouterModule } from '@angular/router';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { SelfRegistrationUserApprovalComponent } from './self-registration-user-approval.component';
import { MatTabsModule } from '@angular/material/tabs';

const userApprovalRoutes: Route[] = [
  {
    path: '',
    component: SelfRegistrationUserApprovalComponent
  }
];

@NgModule({
  declarations: [
    SelfRegistrationUserApprovalComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(userApprovalRoutes),
    MatIconModule,
    MatTooltipModule,
    MatButtonModule,
    MatSlideToggleModule,
    FuseConfirmationModule,
    MatTabsModule
  ]
})
export class SelfRegistrationUserApprovalModule { }
