import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Route, RouterModule } from '@angular/router';
import { AllNominationsInfoComponent } from './all-nominations-info.component';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { ClipboardModule } from '@angular/cdk/clipboard';

const NominationsInfoRoutes: Route[] = [
  {
    path: '',
    component: AllNominationsInfoComponent
  }
];

@NgModule({
  declarations: [
    AllNominationsInfoComponent
  ],
  imports: [
    RouterModule.forChild(NominationsInfoRoutes),
    CommonModule,
    ClipboardModule,
    FormsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    FuseDrawerModule,
  ]
})

export class AllNominationsInfoModule { }
