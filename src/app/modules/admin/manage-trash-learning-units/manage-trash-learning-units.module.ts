import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Route, RouterModule } from '@angular/router';
import { LearningUnitsModule } from '../learning-units/learning-units.module';
import { ManageTrashLearningUnitsComponent } from './manage-trash-learning-units.component';

const routes: Route[] = [
  {
    path: '',
    component: ManageTrashLearningUnitsComponent
  }
];

@NgModule({
  declarations: [
    ManageTrashLearningUnitsComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    LearningUnitsModule,
    MatProgressSpinnerModule
  ]
})
export class ManageTrashLearningUnitsModule { }
