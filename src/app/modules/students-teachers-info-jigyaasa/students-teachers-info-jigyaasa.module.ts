import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudentsTeachersInfoJigyaasaComponent } from './students-teachers-info-jigyaasa.component';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Route, RouterModule } from '@angular/router';
import { FuseConfirmationModule } from '@fuse/services/confirmation';
import { MatIconModule } from '@angular/material/icon';


const studentsTeachersInfoRoutes: Route[] = [
  {
    path: '',
    component: StudentsTeachersInfoJigyaasaComponent
  },
];
@NgModule({
  declarations: [
    StudentsTeachersInfoJigyaasaComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(studentsTeachersInfoRoutes),
    MatSlideToggleModule,
    FuseConfirmationModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    FormsModule,
    MatTooltipModule,
    MatIconModule,
  ]
})
export class StudentsTeachersInfoJigyaasaModule { }
