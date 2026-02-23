import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-case-study-dialog',
  templateUrl: './case-study-dialog.component.html',
  styleUrls: ['./case-study-dialog.component.scss'],
})
export class CaseStudyDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<CaseStudyDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title: string;
      html: string;
    }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}