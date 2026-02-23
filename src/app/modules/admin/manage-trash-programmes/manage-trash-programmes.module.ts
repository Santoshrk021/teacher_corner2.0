import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageTrashProgrammesComponent } from './manage-trash-programmes.component';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatCardModule } from '@angular/material/card';

const routes: Route[] = [
  {
    path: '',
    component: ManageTrashProgrammesComponent
  }
];


@NgModule({
  declarations: [ManageTrashProgrammesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    FormsModule,
    ReactiveFormsModule,
    AngularFireStorageModule,
    FuseConfirmationModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
  ]
})
export class ManageTrashProgrammesModule { }
