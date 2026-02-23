import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UploadSubmissionDialogComponent } from './upload-submission-dialog.component';
import { MatDialogModule } from '@angular/material/dialog';
import { Routes } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

const routes: Routes = [
  {path: '', component: UploadSubmissionDialogComponent},
];

@NgModule({
  declarations: [UploadSubmissionDialogComponent],
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
  ],
})
export class UploadSubmissionDialogModule { }
