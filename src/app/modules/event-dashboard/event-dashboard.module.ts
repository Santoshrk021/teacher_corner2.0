import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventDashboardComponent } from './event-dashboard.component';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';



@NgModule({
  declarations: [
    EventDashboardComponent,
  ],
  imports: [
    CommonModule,
    MatIconModule,
    FormsModule,
    MatFormFieldModule,
    MatAutocompleteModule,
    MatSelectModule,
    MatInputModule,
    MatTooltipModule,
    AngularFireStorageModule,
    MatProgressSpinnerModule,
    MatSortModule
  ]
})
export class EventDashboardModule { }
