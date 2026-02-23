import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';

@Component({
  selector: 'app-qr-code-dialog',
  templateUrl: './qr-code-dialog.component.html',
  styleUrls: ['./qr-code-dialog.component.scss']
})
export class QrCodeDialogComponent implements OnInit {

  url = '';
  dataUrl = '';
  loading = true;

  constructor(
    private dialogRef: MatDialogRef<QrCodeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { uniqueCode: string },
    private uiService: UiService,
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    const code = String(this.data?.uniqueCode || '').trim();
    const baseUrl = window.location.origin;
    this.url = `${baseUrl}/outreach/${code}`;

    try {
      const QRCode = await import('qrcode');
      this.dataUrl = await QRCode.toDataURL(this.url, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#0f172a',
          light: '#ffffff'
        }
      });
    } catch (e) {
      console.error(e);
      this.uiService.alertMessage('Error', 'Failed to generate QR code', 'error');
    } finally {
      this.loading = false;
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.url);
      this.uiService.alertMessage('Copied', 'Link copied to clipboard', 'success');
    } catch {
      this.uiService.alertMessage('Error', 'Failed to copy link', 'error');
    }
  }

  openLink(): void {
    window.open(this.url, '_blank', 'noopener');
  }
}
