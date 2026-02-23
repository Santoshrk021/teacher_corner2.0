import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssignmentsQuizComponent } from './assignments-quiz.component';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

const assignmentsQuizRoutes: Route[] = [
  {
    path: '',
    component: AssignmentsQuizComponent
  },
];

@NgModule({
  declarations: [AssignmentsQuizComponent],
  exports: [AssignmentsQuizComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(assignmentsQuizRoutes),
    MatButtonModule,
    MatIconModule
  ]
})
export class AssignmentsQuizModule { }
