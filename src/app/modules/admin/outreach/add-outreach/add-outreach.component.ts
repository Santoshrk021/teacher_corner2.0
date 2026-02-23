import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';
import { OutreachService } from '../outreach.service';
import { SharedService } from 'app/shared/shared.service';

@Component({
  selector: 'app-add-outreach',
  templateUrl: './add-outreach.component.html',
  styleUrls: ['./add-outreach.component.scss']
})
export class AddOutreachComponent implements OnInit {
  saving = false;
  selectedInstitutionId: string | null = null;
  selectedInstitutionName: string | null = null;
  currentUserName: string = '';

  constructor(
    private dialogRef: MatDialogRef<AddOutreachComponent>,
    private outreachService: OutreachService,
    private uiService: UiService,
    private sharedService: SharedService,
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.sharedService.getCurrentUser();
      const name = (user as any)?.teacherName || '';
      this.currentUserName = String(name || '');
    } catch (e) {
      console.error('Failed to get current user:', e);
    }
  }

  close(): void {
    this.dialogRef.close(false);
  }

  onInstitutionSelected(event: any): void {
    const institution: any = event?.institutionData;
    const institutionName = institution?.institutionName;
    const institutionId = event?.institutionId || institution?.institutionId;

    this.selectedInstitutionId = institutionId ? String(institutionId) : null;
    this.selectedInstitutionName = institutionName ? String(institutionName) : null;
  }

  async save(): Promise<void> {
    if (this.saving) return;
    if (!this.selectedInstitutionId || !this.selectedInstitutionName) {
      this.uiService.alertMessage('Error', 'Please select an institution', 'error');
      return;
    }

    this.saving = true;
    try {
      await this.outreachService.createOutreach({
        institutionId: this.selectedInstitutionId,
        institutionName: this.selectedInstitutionName,
        createdBy: this.currentUserName,
      });
      this.uiService.alertMessage('Created', 'Outreach created successfully', 'success');
      this.dialogRef.close(true);
    } catch (e) {
      console.error(e);
      this.uiService.alertMessage('Error', 'Failed to create outreach', 'error');
    } finally {
      this.saving = false;
    }
  }
}
