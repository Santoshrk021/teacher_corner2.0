import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NominationTableComponent } from './nomination-table.component';
import { Route, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

const Routes: Route[] = [
  {
    path: '',
    component: NominationTableComponent
  }
];

@NgModule({
  declarations: [NominationTableComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(Routes),
    MatIconModule,
    MatSlideToggleModule,
    MatTooltipModule
  ]
})
export class NominationTableModule { }
