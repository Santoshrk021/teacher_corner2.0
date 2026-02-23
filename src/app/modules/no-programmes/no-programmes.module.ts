import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NoProgrammesComponent } from './no-programmes.component';
import { Route, RouterModule } from '@angular/router';

const routes: Route[] = [
  {
    path: '',
    component: NoProgrammesComponent
  }
];


@NgModule({
  declarations: [NoProgrammesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
  ]
})
export class NoProgrammesModule { }
