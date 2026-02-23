import { NgModule } from "@angular/core";
import { WorkflowTemplateListComponent } from "./workflow-template-list.component";
import { CommonModule } from "@angular/common";
import { Route, RouterModule } from "@angular/router";
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WorkflowTemplateComponent } from "../workflow-template/workflow-template.component";
import { WorkflowTemplateModule } from "../workflow-template/workflow-template.module";
import { FuseDrawerModule } from '@fuse/components/drawer';
import { MatSortModule } from '@angular/material/sort';

const route: Route[] = [
  {
    path: '',
    component: WorkflowTemplateListComponent
  }
];

@NgModule({
  declarations: [
 WorkflowTemplateListComponent,
//  WorkflowTemplateComponent
  ],
  
  imports: [
    CommonModule,
    RouterModule.forChild(route),
    MatTooltipModule,
    MatDialogModule,
    MatMenuModule,
    MatButtonModule,
    MatIconModule,
    WorkflowTemplateModule,
    FuseDrawerModule,
    MatSortModule
]
})

export class WorkflowTemplateListModule { }