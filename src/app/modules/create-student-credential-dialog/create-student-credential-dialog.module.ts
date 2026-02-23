import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { CreateStudentCredentialDialogComponent } from './create-student-credential-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { CustomTooltipModule } from 'app/shared/directives/custom-tooltip/custom-tooltip.module';


const routes: Route[] = [
  {
    path: '',
    component: CreateStudentCredentialDialogComponent
  }
];
@NgModule({
  declarations: [CreateStudentCredentialDialogComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    FormsModule,
    CustomTooltipModule
  ]
})
export class CreateStudentCredentialDialogModule { }
