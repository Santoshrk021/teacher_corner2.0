import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventsComponent } from './events.component';
import { Route, RouterModule } from '@angular/router';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatRippleModule, MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { AllEventsTableComponent } from './all-events-table/all-events-table.component';
import { EventWorkshopDialogComponent } from './event-workshop-dialog/event-workshop-dialog.component';

const Routes: Route[] = [
  {
    path: '',
    component: EventsComponent
  }
];

@NgModule({
  declarations: [
    EventsComponent,
    AllEventsTableComponent,

  ],
  imports: [
    CommonModule,
    RouterModule.forChild(Routes),
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    MatStepperModule,
    MatIconModule,
    MatDialogModule,
    MatFormFieldModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatRippleModule,
    MatMenuModule,
    MatTooltipModule,
    MatRadioModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    AngularFirestoreModule,
    AngularFireStorageModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    FuseConfirmationModule,
    ClipboardModule,
    FuseDrawerModule,
  ]
})
export class EventsModule { }
