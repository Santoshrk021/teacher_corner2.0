import { TextFieldModule } from '@angular/cdk/text-field';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ContestCardComponent } from './contest-card/contest-card.component';
import { ContestWorkflowComponent } from './contest-workflow.component';
import { contestRoutes } from './contest-workflow.routing';
import { CreateSubmissionComponent } from './create-submission/create-submission.component';

@NgModule({
  declarations: [
    ContestWorkflowComponent,
    ContestCardComponent,
    CreateSubmissionComponent
  ],
  imports: [
    RouterModule.forChild(contestRoutes),
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
    MatDialogModule,
    TextFieldModule,
  ],
  // providers:[WorkFlowTemplateResolver]
})
export class ContestWorkflowModule { }
