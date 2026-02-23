import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NominationDashboardComponent } from './nomination-dashboard.component';
import { Route, RouterModule } from '@angular/router';
import { MatRippleModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CardViewComponent } from './card-view/card-view.component';
import { ListViewComponent } from './list-view/list-view.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NominationTableComponent } from './nomination-table/nomination-table.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';

const Routes: Route[] = [
  {
    path: '',
    component: NominationDashboardComponent
  }
];

@NgModule({
  declarations: [NominationDashboardComponent, CardViewComponent, ListViewComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(Routes),
    MatRippleModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSlideToggleModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatTooltipModule,
    FuseDrawerModule,
    AngularFireStorageModule
  ]
})
export class NominationDashboardModule { }
