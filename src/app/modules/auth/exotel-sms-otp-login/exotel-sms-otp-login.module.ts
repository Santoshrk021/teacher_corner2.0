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
import { ExotelSmsOtpLoginComponent } from './exotel-sms-otp-login.component';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';

export const authExotelOtpLogin: Route[] = [
  {
    path: '',
    component: ExotelSmsOtpLoginComponent
  }
];

@NgModule({
  declarations: [
    ExotelSmsOtpLoginComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(authExotelOtpLogin),
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    FuseCardModule,
    FuseAlertModule,
    SharedModule,
    AngularFireFunctionsModule,
    DragDropModule,
    // DatabaseModule
  ],
  providers: [TitleCasePipe, ExotelService, {
    provide: REGION, useValue: 'asia-south1'
  },
    { provide: USE_EMULATOR, useValue: 'asia-south1' },
    { provide: USE_EMULATOR, useValue: ['localhost', 4200] }

  ]
})
export class ExotelSmsOtpLoginModule { }
