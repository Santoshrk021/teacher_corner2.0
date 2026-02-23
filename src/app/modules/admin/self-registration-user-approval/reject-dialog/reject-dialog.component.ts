import { Component, Inject, OnInit, Optional } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-reject-dialog',
  templateUrl: './reject-dialog.component.html',
  styleUrls: ['./reject-dialog.component.scss']
})
export class RejectDialogComponent implements OnInit {
  infoForm = new FormGroup({
    rejectionReason: new FormControl('', [Validators.required])
  });
  constructor(public dialogRef: MatDialogRef<RejectDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data
  ) {
  }

  ngOnInit(): void {
  }
  async onSubmit(formData) {
    const message = this.infoForm.value['rejectionReason'];
    await this.dialogRef.close({ eventName: 'save', message: message });
  }
}
