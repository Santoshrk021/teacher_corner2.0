import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { OutreachComponent } from './outreach.component';
import { OutreachListComponent } from './outreach-list/outreach-list.component';
import { OutreachTrashComponent } from './outreach-trash/outreach-trash.component';
import { AddOutreachComponent } from './add-outreach/add-outreach.component';
import { QrCodeDialogComponent } from './qr-code-dialog/qr-code-dialog.component';

import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';

import { FuseDrawerModule } from '@fuse/components/drawer';
import { InstitutionInfoModule } from '../manage-students/institution-info/institution-info.module';

const routes: Routes = [
  {
    path: '',
    component: OutreachComponent
  }
];

@NgModule({
  declarations: [
    OutreachComponent,
    OutreachListComponent,
    OutreachTrashComponent,
    AddOutreachComponent,
    QrCodeDialogComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    FuseDrawerModule,
    InstitutionInfoModule,
  ]
})
export class OutreachModule { }
