import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-profiles-merge',
  templateUrl: './profiles-merge.component.html',
  styleUrls: ['./profiles-merge.component.scss']
})
export class ProfilesMergeComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    public dialogRef: MatDialogRef<ProfilesMergeComponent>,
    private uiService: UiService,
    private sharedService: SharedService
  ) { }
  selectedOption;
  isProfileOptionsActive = false;
  selectedStudentInfo;
  @Output() dialogClosed: EventEmitter<void> = new EventEmitter();
  ngOnInit(): void {

  }

  onRadioChange(event: any) {
    this.selectedOption = event;
  }

  async onClickUpdate() {
    if (this.selectedOption) {
      this.uiService.alertMessage(
        'Attention',
        'Kindly wait while the profile is been updated',
        'info'
      );

      // Emit the selected option to the parent dialog
      const updatePromise = new Promise((resolve) => {
        this.dialogRef.close({ mergeOption: this.selectedOption });
        resolve(true); // Simulate waiting for UpdatePhoneAndDoc completion
      });

      await updatePromise; // Wait for update to complete
    }
  }

  close() {
    this.dialogClosed.emit();
    this.dialogRef.close();
  }
}
