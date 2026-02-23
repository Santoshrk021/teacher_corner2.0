import { Injectable, } from '@angular/core';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PdfGeneratorService {

  private pdfBlobSubject = new BehaviorSubject<Blob | null>(null);
  pdfBlob$ = this.pdfBlobSubject.asObservable();

  constructor(
    private afStore: AngularFireStorage,
    private afs: AngularFirestore,



  ) {


  }

  async generateCertificate(
    studentName: string,
    schoolName: string,
    pdfUrl: string,
    namePositionX: number,
    namePositionY: number,
    schoolNamePositionX: number,
    schoolNamePositionY: number,
    contestId: string,
  ): Promise<Blob | null> {

    try {
      const existingPdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      // Format names if they exceed 34 characters
      studentName = this.formatLongName(studentName);
      schoolName = this.formatLongName(schoolName);

      const page = pdfDoc.getPages()[0];
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
      const fontSize = 18;

      // Draw Student Name
      page.drawText(studentName, {
        x: namePositionX,
        y: namePositionY,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });

      // Draw School Name (if provided)
      if (schoolName.length > 0) {
        page.drawText(schoolName, {
          x: schoolNamePositionX,
          y: schoolNamePositionY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      // Save the modified PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      this.pdfBlobSubject.next(pdfBlob);

      return new Blob([modifiedPdfBytes], { type: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      return null;
    }
  }

  async uploadCertificate(file: File, contestId: string): Promise<string | null> {
    try {
      if (!file) {
        console.error('No file selected for upload.');
        return null;
      }

      const bucketPath = `template_certificate/raman_award_raw_certificate_${contestId}.pdf`;
      const ref = this.afStore.ref(bucketPath);
      const task = ref.put(file); // Upload file

      return new Promise((resolve, reject) => {
        task.then(() => {
          ref.getDownloadURL().subscribe((pdfDownloadUrls) => {
            resolve(pdfDownloadUrls);  // Return the download URL
          }, (error) => {
            console.error('Error retrieving PDF URL:', error);
            reject(null);
          });
        }).catch((uploadError) => {
          console.error('Error uploading PDF:', uploadError);
          reject(null);
        });
      });
    } catch (error) {
      console.error('Error uploading certificate:', error);
      return null;
    }
  }

  async generateCustomCertificate(
    firstName: string,
    lastName: string,
    schoolName: string,
    studentId: string,
    contestId: string,
    phoneNumber: string,
  ) {
    try {
      const trimmedPhoneNumber = phoneNumber.replace('+91', '');
      const studentName = `${firstName} ${lastName}`.trim();
      const formattedStudentName = this.formatLongName(studentName);
      const formattedSchoolName = this.formatLongName(schoolName);

      // 🔹 Fetch certificate config from Firestore
      const docRef = this.afs.collection('Configuration').doc('certificateConfig');
      const docSnap = await docRef.get().toPromise();

      if (!docSnap.exists) {
        console.error('Certificate configuration not found!');
        return null;
      }

      const certConfig = docSnap.data()[`Certificate_${contestId}`];
      if (!certConfig) {
        console.error(`No configuration found for Certificate_${contestId}`);
        return null;
      }

      // 🔹 Load PDF
      const reference = this.afStore.ref(certConfig.pdfUrl);
      const pdfUrlConfig = await reference.getDownloadURL().toPromise();
      const existingPdfBytes = await fetch(pdfUrlConfig).then(res => res.arrayBuffer());
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const page = pdfDoc.getPages()[0];
      const { width: pageWidth } = page.getSize();

      // 🔹 Embed font
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic);
      const fontSize = 18;
      // const fontSize = 24; // previously used for nomination and final certficate of raman

      // 🔹 Calculate text width
      const nameTextWidth = font.widthOfTextAtSize(formattedStudentName, fontSize);
      const schoolTextWidth = font.widthOfTextAtSize(formattedSchoolName, fontSize);

      // 🔹 Calculate centered X position
      const namePositionX = (pageWidth - nameTextWidth) / 2;
      const schoolNamePositionX = (pageWidth - schoolTextWidth) / 2;

      // 🔹 Draw Student Name
      if (certConfig.isStudentValue && formattedStudentName.length > 0) {
        page.drawText(formattedStudentName, {
          x: namePositionX,
          y: certConfig.namePositionY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }


      // 🔹 Check for isSchoolValue and Draw School Name if true
      if (certConfig.isSchoolValue && formattedSchoolName.length > 0) {
        page.drawText(formattedSchoolName, {
          x: schoolNamePositionX,
          y: certConfig.schoolNamePositionY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
      }

      // 🔹 Save and upload PDF
      const modifiedPdfBytes = await pdfDoc.save();
      const pdfBlob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

      const bucketPath = `certificates/certificate_RYSI_finalist_Qualifier/${trimmedPhoneNumber}.pdf`
      const ref = this.afStore.ref(bucketPath);

      await ref.put(pdfBlob);

      const generatedPdfUrl = await ref.getDownloadURL().toPromise();
      return generatedPdfUrl;
    } catch (error) {
      console.error('Error generating custom certificate:', error);
      return null;
    }
  }

  formatLongName(name: string): string {
    if (!name) return '';

    // Convert each word to capitalized format
    const capitalizeWord = (word: string) =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

    const words = name.split(' ').map(capitalizeWord);

    let result = '';
    for (const word of words) {
      // Check if adding the next word exceeds 71 characters
      if ((result + ' ' + word).trim().length > 71) break;
      result = (result + ' ' + word).trim();
    }

    return result;
  }

  // this method is used when the pdf's are already stored in the firebase storage
  async getPdfByPhoneNumbers(phoneNumber: string): Promise<string | null> {
    try {
      const pdfPath = `certificates/certificate_RYSI_finalist_Qualifier/${phoneNumber}.pdf`;

      // Get the download URL
      const pdfUrl = await this.afStore.ref(pdfPath).getDownloadURL().toPromise();

      if (pdfUrl) {
        return pdfUrl;
      }
    } catch (error) {
      console.warn(`PDF not found for phone number: ${phoneNumber}`, error);
      return null; // Return null if not found or error occurs
    }
    return null;
  }

}
