import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewResourcesComponent } from './view-resources.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
@NgModule({
  declarations: [ViewResourcesComponent],
  imports: [
    CommonModule,
    MatTooltipModule,
    MatIconModule,
    MatDialogModule,
    AngularFireStorageModule,
    MatProgressSpinnerModule
  ]
})
export class ViewResourecesModule { }
