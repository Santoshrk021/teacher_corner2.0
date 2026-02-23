import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AssignmentDialogComponent } from './assignment-dialog.component';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { PDFModule } from '../media/pdf.module';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';


@NgModule({
  declarations: [AssignmentDialogComponent],
  imports: [
    CommonModule,
    MatIconModule,
    MatDialogModule,
    PDFModule,
    AngularFireStorageModule

  ]
})
export class AssignmentDialogModule { }
