import { NgModule } from '@angular/core';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthService } from 'app/core/auth/auth.service';
import { AuthInterceptor } from 'app/core/auth/auth.interceptor';
import { FIREBASE_OPTIONS } from '@angular/fire/compat';
import { environment } from 'environments/environment';

@NgModule({
    imports: [
        HttpClientModule
    ],
    providers: [
        AuthService,
        // {
        //     provide : HTTP_INTERCEPTORS,
        //     useClass: AuthInterceptor,
        //     multi   : true
        // }

        // { provide: FIREBASE_OPTIONS, useValue: environment.firebase }

    ]
})
export class AuthModule {
}
