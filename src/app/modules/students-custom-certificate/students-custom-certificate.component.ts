import { Component, Inject, Input, OnInit } from '@angular/core';
import { UiService } from 'app/shared/ui.service';
import { PdfGeneratorService } from '../studentname-pdf-edit/pdf-generator.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ChangeDetectorRef } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { environment } from 'environments/environment.dev';
import { HttpClient } from '@angular/common/http';

import { collection, doc, getDoc, getDocs, getFirestore, query, where, writeBatch } from '@angular/fire/firestore';

@Component({
  selector: 'app-students-custom-certificate',
  templateUrl: './students-custom-certificate.component.html',
  styleUrls: ['./students-custom-certificate.component.scss']
})
export class StudentsCustomCertificateComponent implements OnInit {

  @Input() contestBasicInfo;
  studentName = '';
  schoolName = '';
  firebasePdfUrl
  selectedStudents: { fullName: string; docId: string; phoneNumber?: string; institutionName?: string, }[] = [];
  studentNames: { fullName: string; docId: string; phoneNumber?: string; institutionName?: string, }[] = [];
  isLoadingSelectAll: boolean = false; // Loader for Select All
  isGenerating: boolean = false;
  contestId: string
  isLoadingStudents: boolean = true;
  displaySchoolNameInCertificate: boolean = false;
  db = getFirestore();

  constructor(
    private pdfService: PdfGeneratorService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<StudentsCustomCertificateComponent>,
    private afs: AngularFirestore,
    private cdr: ChangeDetectorRef,
    private http: HttpClient,
    @Inject(MAT_DIALOG_DATA) public data: { contestIdFromStageInfo: string }
  ) {

    this.contestId = data.contestIdFromStageInfo
  }

  ngOnInit(): void {

    this.fetchStudentNamesFromContest();
  }

  closeDialog() {
    this.dialogRef.close();
  }


  async generatePdf() {
    if (this.selectedStudents.length === 0) {
      alert('Please select at least one student.');
      return;
    }

    try {
      this.isGenerating = true;
      this.uiService.alertMessage('Processing', 'Generating PDFs for selected students...', 'info');

      for (let i = 0; i < this.selectedStudents.length; i++) {
        const selectedStudent = this.selectedStudents[i];
        const { fullName, docId, phoneNumber, institutionName, } = selectedStudent;

        if (!phoneNumber) {
          console.warn(`No phone number found for ${fullName}. Skipping.`);
          continue; // Skip if no phone number
        }

        const [firstName, ...lastNameParts] = fullName.split(' ');
        const lastName = lastNameParts.join(' ');

        this.uiService.alertMessage("Attention", `Generating certificate for student ${i + 1} of ${this.selectedStudents.length}`, "info");

        // used for manual toggeling the instituion if you want to add in the certificate
        // const schoolNameToPass = this.displaySchoolNameInCertificate ? institutionName : '';

        // it is used when the pdf's are already stored in firebase storage
        // const cleanedPhoneNumber = phoneNumber.replace(/^\+91/, '');
        //   this.firebasePdfUrl = await this.pdfService.getPdfByPhoneNumbers(cleanedPhoneNumber)

        this.firebasePdfUrl = await this.pdfService.generateCustomCertificate(
          firstName,
          lastName,
          institutionName,
          docId,
          this.contestId,
          phoneNumber
        );

        if (this.firebasePdfUrl) {

          //  Send WhatsApp notification using the actual phone number for whastapp
          await this.sendWhatsAppNotificationWithImg(
            phoneNumber,
            'raman_awards_school_certificate_en_v1',
            [fullName, institutionName, 'School of Science Accelerator'],
            this.firebasePdfUrl,
            'application/pdf',
          );

        }
      }
      this.uiService.alertMessage('Success', `All PDFs Generated & Notifications Sent Successfully`, 'success');
    } catch (error) {
      console.error('Error generating certificates:', error);
      alert('Failed to generate certificates. Please try again.');
    } finally {
      this.isGenerating = false;
    }
  }

  openPdfInNewTab() {
    if (this.firebasePdfUrl) {
      window.open(this.firebasePdfUrl, '_blank');
    }
  }


  //To generate bulk pdf certificates fetch from collections
  fetchStudentNamesFromContest() {
    this.isLoadingStudents = true;

    this.afs
      .collection('Contest_f2wfDuKW2BDTslZ6NcqW', (ref) =>
        ref
          .where('studentMeta.stage_73s0s_nominated', '==', true)
          .where('studentMeta.stage_8i2a0_nominated', '==', false)
      )
      .get()
      .subscribe(
        (snapshot) => {
          this.studentNames = snapshot.docs
            .map((doc) => {
              const data = doc.data() as {
                firstName?: string;
                lastName?: string;
                studentMeta?: {
                  firstName?: string;
                  lastName?: string;
                  isCertificateGenerated?: boolean;
                  phoneNumber?: string;
                  institutionName?: string;
                  countryCode?: string;
                };
              };

              // Extract names from both main document and studentMeta
              const firstName = data.studentMeta?.firstName?.trim() || data.firstName?.trim() || '';
              const lastName = data.studentMeta?.lastName?.trim() || data.lastName?.trim() || '';
              const fullName = `${firstName} ${lastName}`.trim();
              const phoneNumber = data.studentMeta?.phoneNumber?.trim() || '';
              const countryCode = data.studentMeta?.countryCode?.trim() || '91'; // Default to +91 if missing
              const institutionName = data.studentMeta?.institutionName?.trim() || '';
              const isCertificateGenerated = data.studentMeta?.isCertificateGenerated ?? false;

              if (!fullName || !phoneNumber) {
                console.warn(`Invalid student data for docId: ${doc.id}`);
                return null;
              }

              const formattedPhoneNumber = `${countryCode}${phoneNumber}`; // Combine CountryCode with PhoneNumber
              return { fullName, docId: doc.id, isCertificateGenerated, phoneNumber: formattedPhoneNumber, institutionName };
            })
            .filter(student => student !== null);

          this.isLoadingStudents = false; // Hide spinner
        },
        (error) => {
          console.error('Error fetching student data:', error);
          this.isLoadingStudents = false; // Ensure spinner is hidden even on error
        }
      );
  }

  async sendWhatsAppNotificationWithImg(
    phone: string,
    templateName: string,
    paramsArr: string[],
    mediaUrl?: string,
    mediaType?: string,
    urlRoute?: string
  ) {

    // const endUrl = `http://localhost:5000/backup-collection/asia-south1/whatsAppNotifications`;
     const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/whatsAppNotifications`

    let headerImage;

    // Using switch case to handle PDF, Image, Video, and Normal Text
    switch (mediaType) {
      case 'application/pdf':
        if (!mediaUrl) {
          console.error("PDF URL is required for sending PDF documents.");
          return;
        }
        headerImage = {
          type: "document",
          document: {
            media_url: mediaUrl,
            filename: `${phone}.pdf`
          }
        };
        break;

      case 'image':
        if (!mediaUrl) {
          console.error("Image URL is required for sending images.");
          return;
        }
        headerImage = {
          type: "image",
          media_url: mediaUrl
        };
        break;

      case 'video':
        if (!mediaUrl) {
          console.error("Video URL is required for sending videos.");
          return;
        }

        if (urlRoute) {
          // ✅ Video size greater than 16MB, sending with link
          headerImage = {
            type: "image",
            media_url: mediaUrl
          };
        } else {
          // ✅ Video size less than 16MB, sending directly as a video
          headerImage = {
            type: "video",
            media_url: mediaUrl
          };
        }
        break;

      case 'text': // Normal Text (No media)
        headerImage = undefined; // No header for plain text
        break;

      default:
        console.error("Unsupported media type. Please use 'application/pdf', 'image', 'video', or 'text'.");
        return;
    }

    // Forming request data
    const formData = {
      phoneNumber: phone,
      templateName,
      whatsAppSender: environment.whatsAppSender,
      whatsAppNamespace: environment.whatsAppNamespace,
      whatsAppToken: environment.whatsAppToken,
      whatsAppUrl: environment.whatsAppUrl,
      params: paramsArr,
      headerImage,
      mediaType,
      urlRoute
    };

    try {
      await lastValueFrom(this.http.post<any>(endUrl, formData, { responseType: 'json' }));

    } catch (error) {
      console.error('Error sending WhatsApp Notification:', error);
    }
  }

  toggleSelectAll(event: Event) {
    event.stopPropagation(); // Prevent dropdown from closing

    if (this.isAllSelected()) {
      this.selectedStudents = []; // Clear selection
    } else {
      this.isLoadingSelectAll = true;
      this.cdr.detectChanges();

      setTimeout(() => {
        this.selectedStudents = [...this.studentNames]; // Direct assignment
        this.isLoadingSelectAll = false;
        this.cdr.detectChanges(); // Ensure UI updates
      }, 2000);

    }
  }

  // ✅ Check if all students are selected
  isAllSelected(): boolean {
    return this.selectedStudents.length === this.studentNames.length;
  }

  // ✅ Reset Loader on Dropdown Open
  resetLoader() {
    this.isLoadingSelectAll = false;
  }

  trackByFn(index: number, student: any) {
    return student.docId; // Assuming docId is unique
  }

}
