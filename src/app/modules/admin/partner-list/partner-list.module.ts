import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

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
import { PartnerListComponent } from './partner-list.component';
import { PartnerTrashComponent } from './partner-trash/partner-trash.component';
import { AddPartnerComponent } from './add-partner/add-partner.component';

const partnerRoutes: Route[] = [
    {
      path: '',
      component: PartnerListComponent
    }
  ];
@NgModule({
  declarations: [PartnerListComponent, AddPartnerComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(partnerRoutes),
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
export class PartnerListModule { }
