import { NgModule } from '@angular/core';
import { Route, RouterModule, Routes } from '@angular/router';
import { DatadetailsComponent } from './datadetails.component';

export const datadetailsRoutes: Route[] = [
    {
        path: '',
        component: DatadetailsComponent
    }
];
