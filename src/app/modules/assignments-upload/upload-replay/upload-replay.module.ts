import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { UploadReplayComponent } from './upload-replay.component';
import { RouterModule, Routes } from '@angular/router';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatButtonModule } from '@angular/material/button';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SharedModule } from 'app/shared/shared.module';

const routes: Routes = [];

@NgModule({
  declarations: [
    UploadReplayComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    SharedModule,
    AngularFireStorageModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatStepperModule,
    MatTooltipModule,
  ]
})
export class UploadReplayModule { }
