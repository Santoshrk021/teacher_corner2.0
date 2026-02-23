import { NgModule } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { USE_EMULATOR } from '@angular/fire/compat/auth';
import { AngularFireFunctionsModule, REGION } from '@angular/fire/compat/functions';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Route, RouterModule } from '@angular/router';
import { FuseAlertModule } from '@fuse/components/alert';
import { FuseCardModule } from '@fuse/components/card';
import { SharedModule } from 'app/shared/shared.module';
import { ExotelService } from '../../../core/auth/exotel.service';
import { ImpersonationComponent } from './impersonation.component';
import { MatSelectModule } from '@angular/material/select';

export const authImpersonateRoute: Route[] = [
  {
    path: '',
    component: ImpersonationComponent
  }
];

@NgModule({
  declarations: [
    ImpersonationComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(authImpersonateRoute),
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    FuseCardModule,
    FuseAlertModule,
    SharedModule,
    AngularFireFunctionsModule
    // DatabaseModule
  ],
})
export class ImpersonationModule { }
