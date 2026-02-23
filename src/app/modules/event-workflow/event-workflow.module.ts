import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventWorkflowComponent } from './event-workflow.component';
import { RouterModule } from '@angular/router';
import { eventRoutes } from './event-workflow.routing';
import { TextFieldModule } from '@angular/cdk/text-field';
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
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { NgApexchartsModule } from 'ng-apexcharts';
import { EventCardComponent } from './event-card/event-card.component';
import { CreateSubmissionComponent } from './create-submission/create-submission.component';
import { ImageUploadComponent } from './event-configure-workflow/event-assignment/upload-assignments/image-upload/image-upload.component';
import { ObsUploadComponent } from './event-configure-workflow/event-assignment/upload-assignments/obs-upload/obs-upload.component';



@NgModule({
  declarations: [
    EventWorkflowComponent,
    EventCardComponent,
    CreateSubmissionComponent,


  ],
  imports: [
    CommonModule,
    RouterModule.forChild(eventRoutes),
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
  ]
})
export class EventWorkflowModule { }
