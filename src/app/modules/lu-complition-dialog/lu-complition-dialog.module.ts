import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LuComplitionDialogComponent } from './lu-complition-dialog.component';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatButtonModule } from '@angular/material/button';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormModule } from '../form/form.module';
import { GamesModule } from '../games/games.module';
import { ImageModule } from '../media/image.module';
import { PDFModule } from '../media/pdf.module';
import { VideoModule } from '../media/video/video.module';
import { QuizModule } from '../quiz/quiz.module';
import { TextblockModule } from '../textblock/textblock.module';
import { ClassRoomModule } from '../classroom/classroom.module';
import { MatDialogModule } from '@angular/material/dialog';



@NgModule({
  declarations: [
    LuComplitionDialogComponent,

  ],
  imports: [
    CommonModule,
    MatTabsModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatRippleModule,
    VideoModule,
    PDFModule,
    ImageModule,
    MatProgressSpinnerModule,
    MatStepperModule,
    MatTooltipModule,
    AngularFireStorageModule,
    QuizModule,
    GamesModule,
    FormModule,
    TextblockModule,
    ClassRoomModule,
    MatDialogModule
  ]
})
export class LuComplitionDialogModule { }
