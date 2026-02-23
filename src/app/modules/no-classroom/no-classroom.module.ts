import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { NoClassroomComponent } from './no-classroom.component';

const routes: Route[] = [
  {
    path: '',
    component: NoClassroomComponent
  }
];

@NgModule({
  declarations: [NoClassroomComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),

  ]
})
export class NoClassroomModule { }
