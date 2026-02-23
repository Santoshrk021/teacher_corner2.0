import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {MatTableModule} from '@angular/material/table';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import {MatSelectModule} from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import { FuseCardModule } from '@fuse/components/card';
import { MatIconModule } from '@angular/material/icon';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import { AddNewLearningUnitComponent } from './add-new-learningunit.component';
import { Route, RouterModule } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';

const routes: Route[] = [
  {
    path: '',
    component: AddNewLearningUnitComponent
  }
];
@NgModule({
  declarations: [AddNewLearningUnitComponent],
  imports: [
    ReactiveFormsModule,
    RouterModule.forChild(routes),
    MatTableModule,
    MatCardModule,
    MatDialogModule,
    MatTooltipModule,
    CommonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FuseCardModule,
    MatFormFieldModule,
    MatButtonModule,
    FormsModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatInputModule,
  ],
})
export class AddNewLearningUnitModule { }
