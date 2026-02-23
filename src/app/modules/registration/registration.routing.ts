import { NgModule } from '@angular/core';
import { Route, RouterModule, Routes } from '@angular/router';
import { RegistrationComponent } from './registration.component';
import { RegistrationResolver } from './registration.resolver';


export const registrationRoutes: Route[] = [
    {
        path: '',
        title: 'registration',
        resolve: { data: RegistrationResolver },
        component: RegistrationComponent
    }
];
