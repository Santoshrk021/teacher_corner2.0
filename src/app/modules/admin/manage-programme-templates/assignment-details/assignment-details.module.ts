import { Route, RouterModule } from '@angular/router';
import { AssignmentDetailsComponent } from './assignment-details.component';
import { NgModule } from '@angular/core';
import { NgxMatDatetimePickerModule, NgxMatTimepickerModule } from '@angular-material-components/datetime-picker';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

const Routes: Route[] = [
    {
        path: '',
        component: AssignmentDetailsComponent
    }
];

@NgModule({
    declarations: [
      AssignmentDetailsComponent
    ],
    imports: [
      CommonModule,
      FormsModule,
      ReactiveFormsModule,
      MatButtonModule,
      MatDatepickerModule,
      MatDialogModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatNativeDateModule,
      NgxMatDatetimePickerModule,
      NgxMatTimepickerModule,
      RouterModule.forChild(Routes),
    ]
  })
  export class AssignmentDetailsModule { }
