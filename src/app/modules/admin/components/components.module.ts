import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ComponentsComponent } from './components.component';
import { componentsRoutes } from './components.routing';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatInputModule } from '@angular/material/input';
import { TrashModule } from './trash/trash.module';
import { ListModule } from './list/list.module';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ComponentFormModule } from './component-form/component-form.module';
import { EditimageFilesModule } from './edit-image-files/edit-image-files.module';
import { AddModule } from './add/add.module';
import { ExportModule } from './export/export.module';
@NgModule({
  declarations: [
    ComponentsComponent,
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(componentsRoutes),
    MatFormFieldModule,
    MatSlideToggleModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    FuseDrawerModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    TrashModule,
    ListModule,
    ComponentFormModule,
    EditimageFilesModule,
    AddModule,
    ExportModule
  ],
  exports:[
    ComponentsComponent
  ]
})
export class ComponentsModule { }
