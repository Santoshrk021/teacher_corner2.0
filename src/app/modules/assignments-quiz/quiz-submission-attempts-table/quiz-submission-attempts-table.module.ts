import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { QuizSubmissionAttemptsTableComponent } from './quiz-submission-attempts-table.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const routes: Routes = [
  {path: '', component: QuizSubmissionAttemptsTableComponent},
];

@NgModule({
  declarations: [
    QuizSubmissionAttemptsTableComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatButtonModule,
    MatIconModule,
  ]
})
export class QuizSubmissionAttemptsTableModule { }
