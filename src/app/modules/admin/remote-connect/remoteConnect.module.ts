import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RemoteConnectComponent } from './remote-connect.component'
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import { RemoteDialogComponent } from './remote-connect-dialog/remote-dialog.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Route, RouterModule } from '@angular/router';
import { MatMenuModule } from '@angular/material/menu';
import { FuseDrawerModule } from '@fuse/components/drawer';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatCardModule } from '@angular/material/card';

const remotePannelRoutes: Route[] = [
  {
    path: '',
    component: RemoteConnectComponent
  }
];

@NgModule({
  declarations: [
    RemoteConnectComponent,
    RemoteDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(remotePannelRoutes),
    MatButtonModule,
    MatIconModule,
    MatRippleModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    FuseDrawerModule,
    FormsModule,
    MatCheckboxModule,
    MatCardModule,
    MatDialogModule

  ],

})
export class RemoteConnectModule { }