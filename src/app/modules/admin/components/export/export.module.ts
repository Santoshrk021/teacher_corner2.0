import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ExportComponent } from './export.component';
import { MatIconModule } from '@angular/material/icon';



@NgModule({
  declarations: [
    ExportComponent
  ],
  imports: [
    CommonModule,
    MatIconModule
  ],
  exports: [
    ExportComponent
  ]
})
export class ExportModule { }
