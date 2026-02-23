import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstitutionsListComponent } from './institutions-list.component';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { EditProgrammeTemplateComponent } from '../manage-institution/edit-programme-template/edit-programme-template.component';

const InstitutionsListRoutes: Route[] = [
  {
    path: '',
    component: InstitutionsListComponent
  }
];


@NgModule({
  declarations: [InstitutionsListComponent,EditProgrammeTemplateComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(InstitutionsListRoutes),
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatSelectModule,
    FuseConfirmationModule,
    MatTooltipModule,
    FuseDrawerModule,
    InfiniteScrollModule,
    MatSortModule,
    MatProgressSpinnerModule
  ]
})
export class InstitutionsListModule { }
