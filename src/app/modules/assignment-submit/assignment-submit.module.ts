import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { Route, RouterModule } from '@angular/router';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';

import { AssignmentSubmitComponent } from './assignment-submit.component';
import { QuizModule } from '../quiz/quiz.module';
import { UploadImagesComponent } from './upload-images/upload-images.component';
import { UploadPdfsComponent } from './upload-pdfs/upload-pdfs.component';
import { UploadModule } from '../upload/upload.module';

const routes: Route[] = [
  {
    path: '',
    component: AssignmentSubmitComponent
  }
];

@NgModule({
  declarations: [
    AssignmentSubmitComponent,
    UploadImagesComponent,
    UploadPdfsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatButtonModule,
    MatStepperModule,
    QuizModule,
    UploadModule,
  ]
})
export class AssignmentSubmitModule { }
