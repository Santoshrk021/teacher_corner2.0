import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ManageTrashInstitutesComponent } from './manage-trash-institutes.component';
import { Route, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';

const routes: Route[] = [
  {
    path: '',
    component: ManageTrashInstitutesComponent
  }
];

@NgModule({
  declarations: [ManageTrashInstitutesComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FuseConfirmationModule,
    MatTooltipModule,
    MatSortModule
  ]
})
export class ManageTrashInstitutesModule { }
