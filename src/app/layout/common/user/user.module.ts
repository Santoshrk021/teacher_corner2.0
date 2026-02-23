import { TitleCasePipe } from '@angular/common';
import { NgModule } from '@angular/core';
import { REGION } from '@angular/fire/compat/functions';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { ExotelService } from 'app/core/auth/exotel.service';
import { UserComponent } from 'app/layout/common/user/user.component';
import { SharedModule } from 'app/shared/shared.module';





// import { DialogModule } from './dialog/dialog.component';

@NgModule({
    declarations: [
        UserComponent,


        // DialogComponent
    ],
    imports: [
        MatButtonModule,
        MatDividerModule,
        MatIconModule,
        MatMenuModule,
        SharedModule
    ],
    exports: [
        UserComponent
    ],
    providers: [ExotelService, {
        provide: REGION, useValue: 'asia-south1'
    }
    ]
})
export class UserModule {
}
