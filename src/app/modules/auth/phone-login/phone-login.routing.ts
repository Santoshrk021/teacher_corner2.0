import { NgModule } from '@angular/core';
import { Route, RouterModule, Routes } from '@angular/router';
import { PhoneLoginComponent } from './phone-login.component';


export const authPhoneLoginRoutes: Route[] = [
    {
        path: '',
        title: 'Phone Sign',
        component: PhoneLoginComponent
    }
];
