import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AngularFireFunctionsModule } from '@angular/fire/compat/functions';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';
import { RejectDialogComponent } from './reject-dialog.component';

const routes: Route[] = [
  {
    path: '',
    component: RejectDialogComponent
  }
];

@NgModule({
  declarations: [RejectDialogComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    AngularFireFunctionsModule,
    MatButtonModule,
    MatButtonModule,
    MatInputModule,
    SharedModule,
    MatSelectModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule
  ]
})
export class RejectDialogModule { }
