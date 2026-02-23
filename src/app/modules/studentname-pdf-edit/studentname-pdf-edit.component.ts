import { Component, Inject, Input, OnInit } from '@angular/core';
import { PdfGeneratorService } from './pdf-generator.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { UiService } from 'app/shared/ui.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { DomSanitizer, } from '@angular/platform-browser';
import { Subject } from 'rxjs/internal/Subject';
import { debounceTime } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-studentname-pdf-edit',
  templateUrl: './studentname-pdf-edit.component.html',
  styleUrls: ['./studentname-pdf-edit.component.scss']
})
export class StudentnamePdfEditComponent implements OnInit {

  @Input() contestBasicInfo;
  studentName = '';
  schoolName = '';
  blobUrl
  // // for Single names, National Qualifier certificate
  // namePositionX: number = 260;
  // namePositionY: number = 350;
  // schoolNamePositionX: number = 420;
  // schoolNamePositionY: number = 190;

  // // for Multiple names, Nominee certificate
  // namePositionX: number = 380;
  // namePositionY: number = 270;
  // schoolNamePositionX: number = 400;
  // schoolNamePositionY: number = 190;

  // for Multiple names, RYSI School and finalist certificate also 
  // for school certificate x = 220 and y= 155 but previous value x= 260 and y=390
  namePositionX: number = 260;
  namePositionY: number = 390;
  schoolNamePositionX: number = 220;
  schoolNamePositionY: number = 155;

  isLoading: boolean = false;
  showSchoolFields: boolean = false;
  contestId: string;
  generatedPdfUrl: string | null = null;
  firebasePdfUrl;
  private generatePdfSubject = new Subject<void>(); // Debounce Subject

  constructor(private pdfService: PdfGeneratorService,
    private afStore: AngularFireStorage,
    private uiService: UiService,
    private sanitizer: DomSanitizer,
    private afs: AngularFirestore,
    private dialogRef: MatDialogRef<StudentnamePdfEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { contestIdFromStageInfo: string }

  ) {
    this.contestId = data.contestIdFromStageInfo;
  }

  ngOnInit(): void {
    this.pdfService.pdfBlob$.subscribe((blob) => {
      this.blobUrl = blob;
    });

    this.generatePdfSubject.pipe(debounceTime(500)).subscribe(() => {
      this.generatePdfCore();
    });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  addNewSchoolFields() {
    this.showSchoolFields = true;
  }
  // Called on input change
  generatePdf() {
    this.isLoading = true; // 🔹 Start loading before generation
    this.firebasePdfUrl = null;
    this.generatePdfSubject.next();
  }

  async generatePdfCore() {
    if (this.namePositionX === undefined) {
      return;
    }

    const templateFilename = `template_certificate/raman_award_raw_certificate_${this.contestId}.pdf`; //without Insert names for 1 name
    const ref = this.afStore.ref(templateFilename);
    this.generatedPdfUrl = await ref.getDownloadURL().toPromise();

    try {
      const pdfBlobUrl = await this.pdfService.generateCertificate(
        this.studentName,
        this.schoolName,
        this.generatedPdfUrl,
        this.namePositionX,
        this.namePositionY,
        this.schoolNamePositionX,
        this.schoolNamePositionY,
        this.contestId,
      );

      const pdfUrlGenerated = URL.createObjectURL(pdfBlobUrl);
      this.firebasePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrlGenerated);
    } catch (error) {
      console.error('Error fetching certificate:', error);
    } finally {
      this.isLoading = false; // 🔹 Stop loading after generation
    }
  }


  // 🔹 This runs only when "Generate Certificate" button is clicked
  async finalizeAndStorePdf() {
    this.isLoading = true;
    if (!this.contestId) return;

    try {

      const pdfBlobUrl = await this.pdfService.generateCertificate(
        this.studentName,
        this.schoolName,
        this.generatedPdfUrl, // Pass the preview URL
        this.namePositionX,
        this.namePositionY,
        this.schoolNamePositionX,
        this.schoolNamePositionY,
        this.contestId
      );

      // Generate file download link
      const filename = `Certificate_${this.studentName}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(pdfBlobUrl);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 🔹 Now store the generated PDF to Firebase Storage & Firestore
      if (pdfBlobUrl) {
        const bucketPath = `certificates/Certificate_${this.studentName}_${this.contestId}.pdf`;
        const ref = this.afStore.ref(bucketPath);
        const task = ref.put(this.blobUrl);

        // 🔹 Determine isSchoolValue based on schoolName presence
        const isSchoolValue = !!this.schoolName?.trim();
        const isStudentValue = !!this.studentName?.trim();

        // 🔹 Store coordinates & PDF URL in Firestore
        const docRef = this.afs.collection('Configuration').doc('certificateConfig');
        await docRef.set({
          [`Certificate_${this.contestId}`]: {
            namePositionX: this.namePositionX,
            namePositionY: this.namePositionY,
            schoolNamePositionX: this.schoolNamePositionX,
            schoolNamePositionY: this.schoolNamePositionY,
            pdfUrl: `template_certificate/raman_award_raw_certificate_${this.contestId}.pdf`,
            isSchoolValue,
            isStudentValue
          }
        }, { merge: true });
        this.uiService.alertMessage('Created', 'PDF Generated successfully', 'success');
      }

    } catch (error) {
      console.error('Error storing certificate:', error);
    } finally {
      this.isLoading = false;
    }
  }

}
