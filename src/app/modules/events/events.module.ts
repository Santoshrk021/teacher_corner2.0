import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventsComponent } from './events.component';
import { Route, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { ContestAssignmentComponent } from './contest-assignment/contest-assignment.component';
import { UploadAssignmentsComponent } from './contest-assignment/upload-assignments/upload-assignments.component';
import { ImageUploadComponent } from './contest-assignment/upload-assignments/image-upload/image-upload.component';
import { ObsUploadComponent } from './contest-assignment/upload-assignments/obs-upload/obs-upload.component';
import { MatStepperModule } from '@angular/material/stepper';
import { QuillModule } from 'ngx-quill';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatTooltipModule } from '@angular/material/tooltip';

const route: Route[] = [
  {
    path: '',
    component: EventsComponent
  }
];

@NgModule({
  declarations: [
    EventsComponent,
    ContestAssignmentComponent,
    UploadAssignmentsComponent,
    ImageUploadComponent,
    ObsUploadComponent,
  ],
  imports: [
    QuillModule.forRoot(),
    CommonModule,
    RouterModule.forChild(route),
    MatSidenavModule,
    MatIconModule,
    MatProgressBarModule,
    MatTabsModule,
    MatStepperModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    AngularFireStorageModule,
    MatTooltipModule
  ]
})
export class EventsModule { }
