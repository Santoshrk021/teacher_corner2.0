import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuizSubmissionDialogComponent } from './quiz-submission-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';



@NgModule({
  declarations: [QuizSubmissionDialogComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule
  ]
})
export class QuizSubmissionDialogModule { }
