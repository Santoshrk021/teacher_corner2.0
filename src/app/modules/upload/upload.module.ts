import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { RouterModule, Routes } from '@angular/router';
import { UploadComponent } from './upload.component';
import { UploadTypeComponent } from './upload-type/upload-type.component';
import { MatStepperModule } from '@angular/material/stepper';
import { UploadViewComponent } from './upload-view/upload-view.component';

const routes: Routes = [];

@NgModule({
  declarations: [
    UploadComponent,
    UploadTypeComponent,
    UploadViewComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatStepperModule,
  ],
  exports: [
    UploadComponent,
    UploadTypeComponent,
    UploadViewComponent,
  ]
})
export class UploadModule { }
