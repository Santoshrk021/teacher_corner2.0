import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ContestDashboardComponent } from './contest-dashboard.component';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContestDashboardService } from './contest-dashboard.service';
import { AngularFireStorageModule } from '@angular/fire/compat/storage';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  declarations: [
    ContestDashboardComponent,
  ],
  imports: [
 CommonModule,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    AngularFireStorageModule,
  ],
  providers:[ContestDashboardService]
})
export class ContestDashboardModule { }
