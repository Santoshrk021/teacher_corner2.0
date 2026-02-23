import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { KitComponent } from './kit.component';
import { KitTrashComponent } from './kit-trash/kit-trash.component';
import { AddKitComponent } from './add-kit/add-kit.component';
import { KitListComponent } from './kit-list/kit-list.component';
import { InactiveRemotesDialogComponent } from './inactive-remotes-dialog/inactive-remotes-dialog.component';

// Angular Material Modules
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

// Fuse Modules
import { FuseDrawerModule } from '@fuse/components/drawer';

const routes: Routes = [
  {
    path: '',
    component: KitComponent
  }
];

@NgModule({
  declarations: [
    KitComponent,
    KitTrashComponent,
    KitListComponent,
    AddKitComponent,
    InactiveRemotesDialogComponent
  ],
  imports: [
    CommonModule,
    RouterModule.forChild(routes),
    ReactiveFormsModule,
    FormsModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatButtonModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSortModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FuseDrawerModule
  ]
})
export class KitModule { }
