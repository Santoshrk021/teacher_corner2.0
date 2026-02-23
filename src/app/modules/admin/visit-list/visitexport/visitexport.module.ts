import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VisitexportComponent } from './visitexport.component';
import { MatIconModule } from '@angular/material/icon';



@NgModule({
  declarations: [
    VisitexportComponent
  ],
  imports: [
    CommonModule,
    MatIconModule
  ],
  exports: [
    VisitexportComponent
  ]
})
export class VisitexportModule { }
