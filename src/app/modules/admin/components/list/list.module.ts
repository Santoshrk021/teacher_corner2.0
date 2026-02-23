import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ListComponent } from './list.component';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimestampToDatePipe } from './timestamp-to-date.pipe';
import { MatIconModule } from '@angular/material/icon';
import { EditModule } from '../edit/edit.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { InfiniteScrollModule } from 'ngx-infinite-scroll';
import { MatTabsModule } from '@angular/material/tabs';
import { ImagesDialogModule } from '../images-dialog/images-dialog.module';
import {  AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatButtonModule } from '@angular/material/button';


@NgModule({
  declarations: [
    ListComponent,
    TimestampToDatePipe
  ],
  imports: [
    CommonModule,
    MatTableModule,
    MatSortModule,
    MatTooltipModule,
    MatIconModule,
    EditModule,
    MatProgressSpinnerModule,
    InfiniteScrollModule,
    MatTabsModule,
    ImagesDialogModule,
    AngularFireStorageModule,
    MatButtonModule,

  ],
  exports: [
    ListComponent,
    TimestampToDatePipe
  ]
})
export class ListModule { }
