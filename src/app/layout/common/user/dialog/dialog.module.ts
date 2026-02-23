import { MatDialogModule } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { DialogComponent } from './dialog.component';
import { USE_EMULATOR } from '@angular/fire/compat/auth';
import { AngularFireFunctionsModule, REGION } from '@angular/fire/compat/functions';
import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { SharedModule } from 'app/shared/shared.module';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

const routes: Route[] = [
  {
    path: '',
    // title: 'settings',

    component: DialogComponent
  }
];

@NgModule({
  declarations: [DialogComponent],
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
    MatDialogModule,
    MatProgressSpinnerModule
  ],
  providers: [{
    provide: REGION, useValue: 'asia-south1'
  },
  //  { provide: USE_EMULATOR, useValue: 'asia-south1' },
    { provide: USE_EMULATOR, useValue: ['localhost', 4200] }
  ]
})
export class DialogModule { }
