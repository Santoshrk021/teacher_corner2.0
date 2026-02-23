import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { Route, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AngularFireStorageModule } from '@angular/fire/compat/storage';

import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRippleModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AssignmentsComponent } from './classroom-stepper/assignment-tabs/assignments/assignments.component';
import { AssignmentStepComponent } from './classroom-stepper/assignment-tabs/assignments/assignment-step/assignment-step.component';
import { AssignmentTabsComponent } from './classroom-stepper/assignment-tabs/assignment-tabs.component';
import { ClassRoomComponent } from './classroom.component';
import { ClassroomStepperComponent } from './classroom-stepper/classroom-stepper.component';
// import { DownloadDirectiveDirective } from 'app/shared/directives/download-directive.directive';
import { GamesModule } from '../games/games.module';
import { ImageModule } from '../media/image.module';
import { LearnTabsComponent } from './classroom-stepper/learn-tabs/learn-tabs.component';
import { LiveSessionComponent } from './classroom-stepper/assignment-tabs/assignments/live-session/live-session.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PDFModule } from '../media/pdf.module';
import { QuizModule } from '../quiz/quiz.module';
import { QuizReplayModule } from '../assignments-quiz/quiz-replay/quiz-replay.module';
import { ResourcesTabsComponent } from './classroom-stepper/resources-tabs/resources-tabs.component';
import { VideoModule } from '../media/video/video.module';
import { UploadModule } from '../upload/upload.module';
import { FormModule } from '../form/form.module';
import { TextblockModule } from '../textblock/textblock.module';
import { FuseConfirmdialogModule } from '@fuse/services/confirmdialog';

const clasRoomRoutes: Route[] = [
  {
    path: '',
    component: ClassRoomComponent
  }
];
@NgModule({
  declarations: [
    AssignmentStepComponent,
    ClassRoomComponent,
    ClassroomStepperComponent,
    AssignmentsComponent,
    ResourcesTabsComponent,
    LearnTabsComponent,
    AssignmentTabsComponent,
    AssignmentsComponent,
    LiveSessionComponent,
    // DownloadDirectiveDirective
  ],
  imports: [
    RouterModule.forChild(clasRoomRoutes),
    CommonModule,
    FormModule,
    TextblockModule,
    MatTabsModule,
    MatSidenavModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRippleModule,
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
    MatSlideToggleModule,
    QuizReplayModule,
    QuizModule,
    UploadModule,
    GamesModule,
    FuseConfirmationModule,
    FuseConfirmdialogModule
  ],
  exports:[
    AssignmentStepComponent,
    ClassRoomComponent,
    AssignmentsComponent,
    ResourcesTabsComponent,
    LearnTabsComponent,
    AssignmentTabsComponent,
    AssignmentsComponent,
    LiveSessionComponent,

  ]
})
export class ClassRoomModule { }
