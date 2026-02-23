import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizReplayComponent } from './quiz-replay.component';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { VideoModule } from 'app/modules/media/video/video.module';
import { PDFModule } from 'app/modules/media/pdf.module';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule } from '@angular/material/dialog';
import { FormatTimePipe } from 'app/shared/pipes/format-time.pipe';
import { SharedModule } from 'app/shared/shared.module';
import { QuillModule } from 'ngx-quill';



@NgModule({
  declarations: [
    QuizReplayComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    QuillModule.forRoot(),
    MatStepperModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    AngularFireStorageModule,
    VideoModule,
    PDFModule,
    MatTabsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
  ]
})
export class QuizReplayModule { }
