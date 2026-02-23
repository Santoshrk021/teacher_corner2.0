import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageTrashProgrammeTemplatesComponent } from './manage-trash-programme-templates.component';
import { Route, RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseConfirmationModule } from '@fuse/services/confirmation';

const routes: Route[] = [
  {
    path: '',
    component: ManageTrashProgrammeTemplatesComponent,
  }
];

@NgModule({
  declarations: [
    ManageTrashProgrammeTemplatesComponent
  ],
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
export class ManageTrashProgrammeTemplatesModule { }
