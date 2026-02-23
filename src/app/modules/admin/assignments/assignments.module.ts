import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssignmentsComponent } from './assignments.component';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AllAssignmentsTableComponent } from './all-assignments-table/all-assignments-table.component';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';
import { AssignmentReportDialogComponent } from './assignment-report-dialog/assignment-report-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgApexchartsModule } from 'ng-apexcharts';

const AssignmentsRoutes: Route[] = [
  {
    path: '',
    component: AssignmentsComponent,
  }
];


@NgModule({
  declarations: [
    AssignmentsComponent,
    AllAssignmentsTableComponent,
    AssignmentReportDialogComponent,
    

  ],
  imports: [
    CommonModule,
    RouterModule.forChild(AssignmentsRoutes),
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    FuseDrawerModule,
    FormsModule,
    MatCheckboxModule,
    MatCardModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    NgApexchartsModule 
    // RemoteConnectModule

  ]
})
export class AssignmentsModule { }
