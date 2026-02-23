import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

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
import { QuizContestComponent } from './quiz-contest.component';
import { QuizInterfaceComponent } from './quiz-interface/quiz-interface.component';
import { MatStepperModule } from '@angular/material/stepper';
import { MatButtonModule } from '@angular/material/button';
import { SharedModule } from 'app/shared/shared.module';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { VideoModule } from 'app/modules/media/video/video.module';
import { PDFModule } from 'app/modules/media/pdf.module';
import { QuillModule } from 'ngx-quill';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  declarations: [
   
    QuizContestComponent,
    QuizInterfaceComponent,
    McqComponent,
    TextComponent,
    FillBlanksComponent,
    RichBlanksComponent,
  ],
  imports: [
    CommonModule,
    // RouterModule.forChild(quizRoutes),
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
    MatInputModule,
    MatTooltipModule,
    MatDialogModule
  ],
  exports: [
    QuizContestComponent
  ]
})
export class QuizContestModule { }
