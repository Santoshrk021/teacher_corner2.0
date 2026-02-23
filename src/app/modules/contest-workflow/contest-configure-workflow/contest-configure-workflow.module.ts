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
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Route, RouterModule } from '@angular/router';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { ImageModule } from 'app/modules/media/image.module';
import { PDFModule } from 'app/modules/media/pdf.module';
import { VideoModule } from 'app/modules/media/video/video.module';
import { NgApexchartsModule } from 'ng-apexcharts';
import { QuillModule } from 'ngx-quill';
import { ContestAssignmentComponent } from './contest-assignment/contest-assignment.component';
import { SubjectFormGeneralComponent } from './contest-assignment/subject-form-general/subject-form-general.component';
import { ContestConfigureWorkflowComponent } from './contest-configure-workflow.component';
import { QuizModule } from 'app/modules/quiz/quiz.module';
import { QuizReplayModule } from 'app/modules/assignments-quiz/quiz-replay/quiz-replay.module';
import { GamesModule } from 'app/modules/games/games.module';
import { UploadAssignmentsComponent } from './contest-assignment/upload-assignments/upload-assignments.component';
import { VideoLinkFormComponent } from './contest-assignment/video-link-form/video-link-form.component';
import { ContestConfigureWorkflowResolver } from './contest-configure-workflow.resolver';
import { FormModule } from 'app/modules/form/form.module';
import { SubjectFormClassroomStemclubComponent } from './contest-assignment/subject-form-classroom-stemclub/subject-form-classroom-stemclub.component';
// import { DownloadDirectiveDirective } from 'app/shared/directives/download-directive.directive';

const contestWorkFlowRoutes: Route[] = [{
  path: '',
  component: ContestConfigureWorkflowComponent,
  resolve: {
    resolverData: ContestConfigureWorkflowResolver,
  },
}];

@NgModule({
  declarations: [
    ContestConfigureWorkflowComponent,
    ContestAssignmentComponent,
    SubjectFormClassroomStemclubComponent,
    UploadAssignmentsComponent,
    VideoLinkFormComponent,
    SubjectFormGeneralComponent
    // DownloadDirectiveDirective
  ],
  imports: [
    RouterModule.forChild(contestWorkFlowRoutes),
    QuillModule.forRoot(),
    // QuillConfigModule.forRoot(),
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
    QuizModule,
    GamesModule,
    FormModule,
  ]
})
export class ContestConfigureWorkflowModule { }
