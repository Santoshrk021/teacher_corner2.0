import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule } from '@angular/material/core';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Route, RouterModule } from '@angular/router';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { ClassroomCardComponent } from './classroom-list/classroom-card/classroom-card.component';
import { ClassRoomListComponent } from './classroom-list/classroom-list.component';
import { LearningUnitCardComponent } from './classroom-list/learning-unit-card/learning-unit-card.component';
import { LearningUnitListComponent } from './classroom-list/learning-unit-list/learning-unit-list.component';
import { DashboardComponent } from './dashboard.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgApexchartsModule } from 'ng-apexcharts';
import { AssignmentsTableComponent } from './classroom-list/assignments-table/assignments-table.component';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { BuynowComponent } from './classroom-list/buynow/buynow.component';
import { ArrayToNestedObjectPipe } from 'app/core/dashboard/array-to-nested-object.pipe';
import { CustomTooltipModule } from 'app/shared/directives/custom-tooltip/custom-tooltip.module';
import { ClassroomContestCardComponent } from './classroom-list/classroom-contest-card/classroom-contest-card.component';
import { LinkedKitDialogComponent } from 'app/modules/admin/kit/linked-kit-dialog/linked-kit-dialog.component';

const dashboardRoutes: Route[] = [
  {
    path: '',
    component: DashboardComponent,
    children:[
      { path: 'contests-config', loadChildren: () => import('app/modules/contest-workflow/contest-workflow.module').then(m => m.ContestWorkflowModule) },
    ]
  },
];

@NgModule({
  declarations: [
    DashboardComponent,
    ClassRoomListComponent,
    ClassroomCardComponent,
    LearningUnitCardComponent,
    LearningUnitListComponent,
    AssignmentsTableComponent,
    BuynowComponent,
    ArrayToNestedObjectPipe,
    ClassroomContestCardComponent,
    LinkedKitDialogComponent
  ],
  imports: [
    RouterModule.forChild(dashboardRoutes),
    MatRippleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatInputModule,
    CommonModule,
    FuseFindByKeyPipeModule,
    MatButtonModule,
    MatProgressBarModule,
    MatMenuModule,
    MatTabsModule,
    MatTooltipModule,
    AngularFireStorageModule,
    FormsModule,
    ReactiveFormsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    NgApexchartsModule,
    FuseDrawerModule,
    CustomTooltipModule,
    MatDialogModule
  ]
})
export class DashboardModule { }
