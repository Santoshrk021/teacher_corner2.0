import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClassLevelContestListComponent } from './class-level-contest-list.component';
import { Route, RouterModule } from '@angular/router';

const route: Route[] = [
  {
    path: '',
    component: ClassLevelContestListComponent
  }
];

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    RouterModule.forChild(route),

  ]
})
export class ClassLevelContestListModule { }
