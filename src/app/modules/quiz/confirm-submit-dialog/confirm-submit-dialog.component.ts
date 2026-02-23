import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';
import { UsbService } from 'app/usb.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-confirm-submit-dialog',
  templateUrl: './confirm-submit-dialog.component.html',
})
export class ConfirmSubmitDialogComponent implements OnInit, OnDestroy {
  private sub: Subscription;
  private firstEventIgnored = false;

  constructor(
    private dialogRef: MatDialogRef<ConfirmSubmitDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { usbService: UsbService; openedAt: number }
  ) { }

  async ngOnInit(): Promise<void> {
    this.sub = this.data.usbService.remoteSignal$.subscribe(({ MAC, value }) => {
      // console.log('🎮 Remote Pressed in Dialog:', MAC, value);

      // Ignore the very first event if it comes too soon after opening
      const now = Date.now();
      if (!this.firstEventIgnored && now - this.data.openedAt < 300) {
        // console.log('Ignoring initial remote event inside dialog');
        this.firstEventIgnored = true;
        return;
      }

      if (value === 7) {
        this.dialogRef.close(true);  // Confirm
      } else if (value === 8 || value === 14) {
        this.dialogRef.close(false); // Cancel
      }
    });
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }
}
