import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { ContestInteractionComponent } from './contest-interaction.component';
import { ContestAssignmentComponent } from './contest-assignment/contest-assignment.component';
import { SubjectFormGeneralComponents } from './contest-assignment/subject-form-general/subject-form-general.component';
import { UploadAssignmentsComponent } from './contest-assignment/upload-assignments/upload-assignments.component';
import { VideoLinkFormComponent } from './contest-assignment/video-link-form/video-link-form.component';
import { ImageUploadComponent } from './contest-assignment/upload-assignments/image-upload/image-upload.component';
import { ObsUploadComponent } from './contest-assignment/upload-assignments/obs-upload/obs-upload.component';
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
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
// import { DownloadDirectivesModule } from 'app/shared/directives/download-directive.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { QuillModule } from 'ngx-quill';
import { ImageModule } from '../media/image.module';
import { PDFModule } from '../media/pdf.module';
import { VideoModule } from '../media/video/video.module';
import { QuizContestModule } from './quiz-contest/quiz-contest.module';
import { VideoUploadComponent } from './contest-assignment/upload-assignments/video-upload/video-upload.component';
import { FormModule } from '../form/form.module';
import { SubjectFormClassroomStemclubComponent } from './contest-assignment/subject-form-classroom-stemclub/subject-form-classroom-stemclub.component';
import { DownloadDirectivesModule } from 'app/shared/directives/download-directive.module';


const routes: Route[] = [
  {
    path: '',
    title: 'Contest Submission',
    component: ContestInteractionComponent
  }
];

@NgModule({
  declarations: [
    ContestInteractionComponent,
    ContestAssignmentComponent,
    UploadAssignmentsComponent,
    VideoLinkFormComponent,
    ImageUploadComponent,
    ObsUploadComponent,
    VideoUploadComponent,
    SubjectFormClassroomStemclubComponent,
    SubjectFormGeneralComponents
  ],
  imports: [
    QuillModule.forRoot(),
    RouterModule.forChild(routes),
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
    TextFieldModule,
    QuizContestModule,
    FormModule,
    DownloadDirectivesModule
  ]
})
export class ContestInteractionModule { }
