import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Route, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { ManageWorkflowTemplateTrashComponent } from './manage-workflow-template-trash.component';

const routes: Route[] = [
    {
        path: '',
        component: ManageWorkflowTemplateTrashComponent
    }
];


@NgModule({
    declarations: [
        ManageWorkflowTemplateTrashComponent
    ],
    imports: [
        CommonModule,
        RouterModule.forChild(routes),
        MatButtonModule,
        MatIconModule,
        MatRippleModule,
        MatTooltipModule,
        MatDialogModule,
        MatMenuModule,
        FuseDrawerModule

    ]
})
export class WorkflowTemplateTrashModule { }