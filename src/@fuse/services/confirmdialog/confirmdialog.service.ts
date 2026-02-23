import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { merge } from 'lodash-es';
import { FuseConfirmDialogComponent } from './dialog/dialog.component';
import { FuseConfirmationConfig1 } from './confirmdialog.types';

@Injectable()
export class FuseConfirmdialogService
{
     _defaultConfig: FuseConfirmationConfig1 = {
        title      : 'Confirm action',
        message    : 'Are you sure you want to confirm this action?',
        icon       : {
            show : true,
            name : 'heroicons_outline:exclamation',
            color: 'warn'
        },
        actions    : {
            confirm: {
                show : true,
                label: 'Yes, please overwrite',
                color: 'warn'
            },
            cancel : {
                show : true,
                label: 'No, don’t overwrite'
            },
            confirmnew: {
                show: true,
                label: 'Yes overwrite current step',
                color: 'warn'

            }

        },
        dismissible: false
    };

    /**
     * Constructor
     */
    constructor(
        private _matDialog: MatDialog
    )
    {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    open(config: FuseConfirmationConfig1 = {}): MatDialogRef<FuseConfirmDialogComponent>
    {
        // Merge the user config with the default config
        const userConfig: any = merge({}, this._defaultConfig, config);
        userConfig.actions.confirm.label=userConfig.message1;
        userConfig.actions.cancel.label=userConfig.message2;


        if(userConfig.message3!==''){
            userConfig.actions.confirmnew.label=userConfig.message3;

        }
        else{
            userConfig.actions.confirmnew.show=false;

     // delete  userConfig.actions.confirmnew
        }

        // Open the dialog
        return this._matDialog.open(FuseConfirmDialogComponent, {
            autoFocus   : false,
            disableClose: !userConfig.dismissible,
            data        : userConfig,
            panelClass  : 'fuse-confirmation-dialog-panel'
        });
    }
}
