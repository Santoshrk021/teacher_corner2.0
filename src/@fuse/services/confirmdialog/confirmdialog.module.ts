import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { FuseConfirmationService } from '@fuse/services/confirmation/confirmation.service';
import { FuseConfirmDialogComponent } from '@fuse/services/confirmdialog/dialog/dialog.component';
// import { FuseConfirmDialogComponent } from '@fuse/services/confirmdialog/dialog/dialog.component';
import { CommonModule } from '@angular/common';
import { FuseConfirmdialogService } from '@fuse/services/confirmdialog/confirmdialog.service';

@NgModule({
    declarations: [
        FuseConfirmDialogComponent
    ],
    imports     : [
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        CommonModule
    ],
    providers   : [
        FuseConfirmdialogService
    ]
})
export class FuseConfirmdialogModule
{
    /**
     * Constructor
     */
    constructor(private _fuseConfirmationService: FuseConfirmdialogService)
    {
    }
}
