import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MyTACtivityComponent } from './my-tactivity.component';
import { MatRippleModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FuseFindByKeyPipeModule } from '@fuse/pipes/find-by-key';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { RouterModule } from '@angular/router';
import { myTactivityRoutes } from './my-tactivity.routing';



@NgModule({
  declarations: [MyTACtivityComponent],
  imports: [
    CommonModule,
    MatRippleModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatInputModule,
    CommonModule,
    FuseFindByKeyPipeModule,
    MatButtonModule,
    MatProgressBarModule,
    MatMenuModule,
    RouterModule.forChild(myTactivityRoutes),

  ]
})
export class MyTACtivityModule { }
