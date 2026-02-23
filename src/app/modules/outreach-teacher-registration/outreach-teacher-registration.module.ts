import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { FuseAlertModule } from '@fuse/components/alert';
import { FuseCardModule } from '@fuse/components/card';
import { SharedModule } from 'app/shared/shared.module';
import { OutreachTeacherRegistrationComponent } from './outreach-teacher-registration.component';

export const outreachTeacherRegistrationRoutes: Route[] = [
    {
        path: '',
        component: OutreachTeacherRegistrationComponent,
    },
];

@NgModule({
    declarations: [OutreachTeacherRegistrationComponent],
    imports: [
        CommonModule,
        FormsModule,
        RouterModule.forChild(outreachTeacherRegistrationRoutes),
        MatButtonModule,
        MatCheckboxModule,
        MatFormFieldModule,
        MatInputModule,
        MatProgressSpinnerModule,
        MatSelectModule,
        MatTooltipModule,
        FuseCardModule,
        FuseAlertModule,
        SharedModule,
        DragDropModule,
    ],
})
export class OutreachTeacherRegistrationModule {}
