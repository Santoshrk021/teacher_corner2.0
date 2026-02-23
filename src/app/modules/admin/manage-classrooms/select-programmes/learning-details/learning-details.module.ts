import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LearningDetailsComponent } from './learning-details.component';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { Route, RouterModule } from '@angular/router';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomTooltipModule } from 'app/shared/directives/custom-tooltip/custom-tooltip.module';
const Routes: Route[] = [
  {
    path: '',
    component: LearningDetailsComponent
  }
];

@NgModule({
  declarations: [
    LearningDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSlideToggleModule,
    MatTabsModule,
    MatTooltipModule,
    CustomTooltipModule,
    NgxMatDatetimePickerModule,
    NgxMatTimepickerModule,
    RouterModule.forChild(Routes),
  ]
})
export class LearningDetailsModule { }
