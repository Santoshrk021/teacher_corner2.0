import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DatadetailsComponent } from './datadetails.component';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { datadetailsRoutes} from './datadetails-routing.module';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    DatadetailsComponent
  ],
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RouterModule.forChild(datadetailsRoutes)
  ]
})
export class DatadetailsModule { }
