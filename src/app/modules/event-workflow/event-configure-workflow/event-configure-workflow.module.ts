import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { EventConfigureWorkflowComponent } from './event-configure-workflow.component';
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
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { ImageModule } from 'app/modules/media/image.module';
import { PDFModule } from 'app/modules/media/pdf.module';
import { VideoModule } from 'app/modules/media/video/video.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { QuillModule } from 'ngx-quill';
import { EventAssignmentComponent } from './event-assignment/event-assignment.component';
import { SubjectFormComponent } from './event-assignment/subject-form/subject-form.component';
import { UploadAssignmentsComponent } from './event-assignment/upload-assignments/upload-assignments.component';
import { VideoFormComponent } from './event-assignment/video-form/video-form.component';
import { TextFieldModule } from '@angular/cdk/text-field';
import { QuizReplayModule } from 'app/modules/assignments-quiz/quiz-replay/quiz-replay.module';
import { GamesModule } from 'app/modules/games/games.module';
import { ImageUploadComponent } from './event-assignment/upload-assignments/image-upload/image-upload.component';
import { ObsUploadComponent } from './event-assignment/upload-assignments/obs-upload/obs-upload.component';
import { EventQuizModule } from './event-assignment/quiz/quiz.module';

const eventWorkFlowRoutes: Route[] = [{
  path: '',
  component: EventConfigureWorkflowComponent,
}];

@NgModule({
  declarations: [
    EventConfigureWorkflowComponent,
    EventAssignmentComponent,
    SubjectFormComponent,
    UploadAssignmentsComponent,
    VideoFormComponent,
    ImageUploadComponent,
    ObsUploadComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(eventWorkFlowRoutes),
    QuillModule.forRoot(),
    // QuillConfigModule.forRoot(),
    MatTabsModule,
    MatSidenavModule,
    MatIconModule,
    MatProgressBarModule,
    VideoModule,
    PDFModule,
    ImageModule,
    MatStepperModule,
    MatTooltipModule,
    AngularFireStorageModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    FuseConfirmationModule,
    MatRippleModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    FuseFindByKeyPipeModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    NgApexchartsModule,
    FuseDrawerModule,
    MatDialogModule,
    MatSelectModule,
    CommonModule,
    MatTabsModule,
    MatSidenavModule,
    MatIconModule,
    MatProgressBarModule,
    VideoModule,
    PDFModule,
    ImageModule,
    MatStepperModule,
    MatTooltipModule,
    AngularFireStorageModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    FuseConfirmationModule,
    MatRippleModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    FuseFindByKeyPipeModule,
    MatMenuModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    NgApexchartsModule,
    FuseDrawerModule,
    MatDialogModule,
    MatSelectModule,
    TextFieldModule,
    QuizReplayModule,
    EventQuizModule,
    GamesModule,
  ]
})
export class EventConfigureWorkflowModule { }
