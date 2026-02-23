import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';

import { TactivityComponent } from './tactivity.component';


import { MatTabsModule } from '@angular/material/tabs';
import { MatStepperModule } from '@angular/material/stepper';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRippleModule } from '@angular/material/core';
import { VideoModule } from '../media/video/video.module';
import { PDFModule } from '../media/pdf.module';
import { ImageModule } from '../media/image.module';

import { ImageUploadComponent } from './tactivity-stepper/assignment-tabs/assignments/image-upload/image-upload.component';
import { ObsUploadComponent } from './tactivity-stepper/assignment-tabs/assignments/obs-upload/obs-upload.component';
import { TactivityStepperComponent } from './tactivity-stepper/tactivity-stepper.component';
import { ResourcesTabsComponent } from './tactivity-stepper/resources-tabs/resources-tabs.component';
import { LearnTabsComponent } from './tactivity-stepper/learn-tabs/learn-tabs.component';
import { AssignmentTabsComponent } from './tactivity-stepper/assignment-tabs/assignment-tabs.component';
import { AssignmentsComponent } from './tactivity-stepper/assignment-tabs/assignments/assignments.component';
import { LiveSessionComponent } from './tactivity-stepper/assignment-tabs/assignments/live-session/live-session.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseAlertModule } from '@fuse/components/alert';
import { QuizTabComponent } from './tactivity-stepper/quiz-tab/quiz-tab.component';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';



const clasRoomRoutes: Route[] = [
  {
    path: '',
    component: TactivityComponent
  }
];
@NgModule({
  declarations: [
    TactivityComponent,
    TactivityStepperComponent,
    ImageUploadComponent,
    ObsUploadComponent,
    AssignmentsComponent,
    ResourcesTabsComponent,
    LearnTabsComponent,
    AssignmentTabsComponent,
    AssignmentsComponent,
    LiveSessionComponent,
    QuizTabComponent
  ],
  imports: [
    RouterModule.forChild(clasRoomRoutes),
    CommonModule,
    MatTabsModule,
    MatSidenavModule,
    MatIconModule,
    MatProgressBarModule,
    MatRippleModule,
    VideoModule,
    PDFModule,
    ImageModule,
    MatStepperModule,
    MatTooltipModule,
    AngularFireStorageModule

    ]
})
export class TactivityModule { }
