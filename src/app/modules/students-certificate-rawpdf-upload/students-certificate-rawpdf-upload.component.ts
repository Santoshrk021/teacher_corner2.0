import { Component, Inject, Input, OnInit } from '@angular/core';
import { PdfGeneratorService } from '../studentname-pdf-edit/pdf-generator.service';
import { UiService } from 'app/shared/ui.service';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { StudentnamePdfEditComponent } from '../studentname-pdf-edit/studentname-pdf-edit.component';

@Component({
  selector: 'app-students-certificate-rawpdf-upload',
  templateUrl: './students-certificate-rawpdf-upload.component.html',
  styleUrls: ['./students-certificate-rawpdf-upload.component.scss']
})
export class StudentsCertificateRawpdfUploadComponent implements OnInit {

  @Input() contestBasicInfo;
  selectedFile: File | null = null;
  firebasePdfUrl: string | null = null; // Store uploaded PDF URL
  uploading: boolean = false;
  contestId: string;


  constructor(private pdfService: PdfGeneratorService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<StudentsCertificateRawpdfUploadComponent>,
    private dialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public data: { contestIdFromStageInfo: string }
  ) {
    this.contestId = data.contestIdFromStageInfo;
  }

  ngOnInit(): void {

  }

  closeDialog() {
    this.dialogRef.close();
  }

  // Handle PDF selection
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  // Upload selected PDF to Firebase Storage
  async uploadPdfFile() {
    if (!this.selectedFile) {
      return;
    }

    this.uploading = true;
    this.firebasePdfUrl = await this.pdfService.uploadCertificate(this.selectedFile, this.contestId);
    this.uiService.alertMessage('Created', 'PDF Uploaded successfully', 'success');
    this.uploading = false;
  }

  openPdfInNewTab() {
    if (this.firebasePdfUrl) {
      window.open(this.firebasePdfUrl, '_blank');
    }
  }


  openCustomCertificateDialog(): void {
    const dialogRef = this.dialog.open(StudentnamePdfEditComponent, {
      width: '90vw',
      height: '90vh',
      disableClose: true,
      data: { contestIdFromStageInfo: this.contestId }
    });

    dialogRef.afterClosed().subscribe((result) => {
    });
  }


}
