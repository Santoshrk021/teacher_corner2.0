import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ImagesDialogComponent } from './images-dialog.component';
import { MatIconModule } from '@angular/material/icon';

@NgModule({
  declarations: [
    ImagesDialogComponent
  ],
  imports: [
    CommonModule,
    MatIconModule
  ],
  exports: [
    ImagesDialogComponent
  ]
})
export class ImagesDialogModule { }
