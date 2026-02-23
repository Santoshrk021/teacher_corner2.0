import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrashComponent } from './trash.component';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { EditModule } from '../edit/edit.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ListModule } from '../list/list.module';
import { MatTabsModule } from '@angular/material/tabs';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatButtonModule } from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';


@NgModule({
  declarations: [
    TrashComponent,
  ],
  imports: [
    CommonModule,
    MatTableModule,
    MatTooltipModule,
    MatIconModule,
    MatSortModule,
    EditModule,
    MatProgressSpinnerModule,
    ListModule,
    MatTabsModule,
    AngularFireStorageModule,
    MatButtonModule,
    MatCardModule,
    MatInputModule,
    MatListModule

  ],
  exports: [
    TrashComponent
  ]
})
export class TrashModule { }
