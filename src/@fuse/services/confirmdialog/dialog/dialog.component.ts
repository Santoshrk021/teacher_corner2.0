import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FuseConfirmationConfig } from '@fuse/services/confirmation/confirmation.types';
import { FuseConfirmationConfig1 } from '../confirmdialog.types';

@Component({
    selector     : 'fuse-confirm-dialog',
    templateUrl  : './dialog.component.html',
    styles       : [
        `
            .fuse-confirmation-dialog-panel {
                // @screen md {
                //     @apply w-150;
                // }

                .mat-dialog-container {
                    // max-width: 100vw !important;
                    width:790px;
                    height:250px;

                    padding: 0 !important;
                }
            }

            .inventory-grid {
    display: grid;
    // padding-inline:35px;
     margin-left:-14px;
    grid-template-columns:31% 28% 35%;
    margin-bottom:3px;
    // align-items: center;
    gap:28px; // Adjust the gap between grid items as needed
    // padding: 1rem 2rem; // Adjust padding as needed
    // border-bottom: 1px solid #d1d5db; // Tailwind's gray-300 color
    // color: #6b7280; // Tailwind's text-secondary color

    @media (min-width: 768px) {
    //   padding: 1rem 2rem;
    }
  }
  ::ng-deep #cdk-overlay-1{
    max-width:1200px !important;
  }

  ::ng-deep .cdk-overlay-pane{
    max-width:1200px !important;
  }

  ::ng-deep .fuse-confirmation-dialog-panel{
    max-width:1200px !important;
  }

  .cdk-overlay-pane.custom-confirmation-dialog {
  max-width: 1200px !important; /* Set the desired width */
}
        `
    ],
    encapsulation: ViewEncapsulation.None
})
export class FuseConfirmDialogComponent
{
    /**
     * Constructor
     */
    constructor(@Inject(MAT_DIALOG_DATA) public data: FuseConfirmationConfig1)
    {
    }

}
