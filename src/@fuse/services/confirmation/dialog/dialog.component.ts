import { Component, Inject, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FuseConfirmationConfig } from '@fuse/services/confirmation/confirmation.types';

@Component({
    selector     : 'fuse-confirmation-dialog',
    templateUrl  : './dialog.component.html',
    styles       : [
        `
            .fuse-confirmation-dialog-panel {
                @screen md {
                    @apply w-128;
                }

                .mat-dialog-container {
                    padding: 0 !important;
                }
            }
        `
    ],
    encapsulation: ViewEncapsulation.None
})
export class FuseConfirmationDialogComponent implements OnInit, OnDestroy
{
    confirmDisabled = false;
    timerRemaining = 0;
    private timerInterval: any;

    /**
     * Constructor
     */
    constructor(@Inject(MAT_DIALOG_DATA) public data: FuseConfirmationConfig)
    {
    }

    ngOnInit(): void {
        // Check if timer is configured
        if (this.data.actions?.confirm?.timerSeconds > 0) {
            this.confirmDisabled = true;
            this.timerRemaining = this.data.actions.confirm.timerSeconds;
            this.startTimer();
        }
    }

    ngOnDestroy(): void {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    private startTimer(): void {
        this.timerInterval = setInterval(() => {
            this.timerRemaining--;
            if (this.timerRemaining <= 0) {
                this.confirmDisabled = false;
                clearInterval(this.timerInterval);
            }
        }, 1000);
    }

    get confirmButtonLabel(): string {
        if (this.confirmDisabled && this.timerRemaining > 0) {
            return `${this.data.actions.confirm.label} (${this.timerRemaining})`;
        }
        return this.data.actions.confirm.label;
    }
}
