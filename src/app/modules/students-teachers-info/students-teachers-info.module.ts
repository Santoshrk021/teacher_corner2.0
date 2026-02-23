import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { StudentsTeachersInfoComponent } from './students-teachers-info.component';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';


const studentsTeachersInfoRoutes: Route[] = [
  {
    path: '',
    component: StudentsTeachersInfoComponent
  },
];
@NgModule({
  declarations: [StudentsTeachersInfoComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(studentsTeachersInfoRoutes),
    MatIconModule,
    MatSlideToggleModule,
    FuseConfirmationModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule
  ],

})
export class StudentsTeachersInfoModule { }
