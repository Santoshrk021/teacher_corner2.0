import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { quizRoutes } from './quiz.routing';


import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatTabsModule } from '@angular/material/tabs';
import { MatRippleModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { McqComponent } from './quiz-interface/mcq/mcq.component';
import { FillBlanksComponent } from './quiz-interface/fill-blanks/fill-blanks.component';
import { RichBlanksComponent } from './quiz-interface/rich-blanks/rich-blanks.component';
import { TextComponent } from './quiz-interface/text/text.component';
import { QuizComponent } from './quiz.component';
import { QuizInterfaceComponent } from './quiz-interface/quiz-interface.component';

import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from 'app/shared/shared.module';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VideoModule } from 'app/modules/media/video/video.module';
import { PDFModule } from 'app/modules/media/pdf.module';
import { FormatTimePipe } from './pipes/format-time.pipe';
import { QuillModule } from 'ngx-quill';


@NgModule({
  declarations: [
    FormatTimePipe,
    QuizComponent,
    QuizInterfaceComponent,
    McqComponent,
    TextComponent,
    FillBlanksComponent,
    RichBlanksComponent,
  ],
  imports: [
    CommonModule,
    QuillModule.forRoot(),
    MatIconModule,
    MatTabsModule,
    MatSidenavModule,
    MatIconModule,
    MatProgressBarModule,
    MatRippleModule,
    MatCheckboxModule,
    VideoModule,
    PDFModule,
    MatStepperModule,
    MatButtonModule,
    SharedModule,
    AngularFireStorageModule,
    MatFormFieldModule,
    MatInputModule
  ],
  exports: [
    QuizComponent
  ]
})
export class EventQuizModule { }
