import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { lastValueFrom } from 'rxjs';
import { deleteField } from 'firebase/firestore';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { UiService } from 'app/shared/ui.service';
import { CreateQuizDialogComponent } from '../create-quiz-dialog.component';
import { CaseStudy, CaseStudyMedia } from 'app/shared/interfaces/case-study.interface';
import { PdfFileEntry } from '../background-info-step/background-info-step.component';

const CASESTUDY_STORAGE_BUCKET = 'quizzer-casestudy-resources';
const QUIZZER_STORAGE_BUCKET = 'quizzer_resources';

@Component({
  selector: 'app-review-quiz',
  templateUrl: './review-quiz.component.html',
  styleUrls: ['./review-quiz.component.scss'],
})
export class ReviewQuizComponent implements OnInit {
  @Input() quizQusInfo: any;
  @Input() quizBasicInfo: any;
  @Input() quizInfo: any;
  @Input() optionFiles: { questionIndex: number; optionIndex: number; file: File }[] = [];
  @Input() backgroundInfo: CaseStudy | null = null;
  @Input() backgroundPdfFiles: PdfFileEntry[] = [];

  btnDisable = false;

  constructor(
    private assignmentsService: AssignmentsService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<CreateQuizDialogComponent>,
    private sanitizer: DomSanitizer,
    private afStorage: AngularFireStorage
  ) { }

  ngOnInit(): void { }

  async quizSave(docId?: string): Promise<void> {
    this.btnDisable = true;

    try {
      const quiz = structuredClone(this.quizQusInfo);

      // Step 1: Process base64 images in questions
      await this.processBase64ImagesInQuestions(quiz);

      // Step 2: Upload option images (blob URLs)
      await this.uploadOptionImages(quiz);

      // Step 3: Process background info (upload base64 images AND blob PDF files)
      const cleanBackgroundInfo = await this.processBackgroundInfo(
        this.backgroundInfo,
        this.backgroundPdfFiles
      );

      // Step 4: Build and save quiz object
      const id = docId ?? this.assignmentsService.getRandomGeneratedId();

      const quizData: any = {
        ...this.quizBasicInfo,
        type: 'QUIZ',
        docId: id,
        status: 'LIVE',
        questionsData: quiz.questions,
      };

      // Handle background info: add if exists, or explicitly delete if removed during update
      if (cleanBackgroundInfo) {
        quizData.backgroundInfo = cleanBackgroundInfo;
      }

      // Clean undefined values first (JSON serialization would break deleteField sentinel)
      const cleanedQuizData = this.removeUndefined(quizData);

      // If user removed background info from an existing quiz, explicitly delete the field
      // This must be added AFTER removeUndefined to preserve the deleteField() sentinel
      if (!cleanBackgroundInfo && this.quizInfo?.backgroundInfo) {
        cleanedQuizData.backgroundInfo = deleteField();
      }

      // Save to Firestore
      await this.assignmentsService.update(cleanedQuizData, id);

      this.dialogRef.close();

      const message = this.quizInfo?.questionsData
        ? 'Quiz Updated Successfully'
        : 'Quiz Created Successfully';

      this.uiService.alertMessage('Successful', message, 'success');
    } catch (err) {
      console.error('[ReviewQuiz] Error saving quiz:', err);
      this.btnDisable = false;
      this.uiService.alertMessage('Error', `${err}`, 'error');
    }
  }


  private async processBackgroundInfo(
    bgInfo: CaseStudy | null,
    pdfFiles: PdfFileEntry[]
  ): Promise<any | null> {
    if (!bgInfo) return null;

    const cleanInfo: any = {
      title: bgInfo.title || '',
    };

    if (bgInfo.description) {
      // 1) Upload base64 images + blob PDFs, and update HTML with Firebase URLs + data-storage-path
      const { processedHtml } = await this.processDescriptionMedia(
        bgInfo.description,
        pdfFiles,
        CASESTUDY_STORAGE_BUCKET
      );

      // 2) Remove editor-only elements (delete buttons, etc.)
      const sanitizedHtml = this.sanitizeDescriptionHtml(processedHtml);
      cleanInfo.description = sanitizedHtml;

      // 3) IMPORTANT: Re-collect ALL media currently present (old + new)
      const allMedia = this.extractAllCaseStudyMediaFromHtml(sanitizedHtml);

      if (allMedia.length > 0) {
        cleanInfo.images = allMedia.map((m, idx) => ({ ...m, order: idx }));
      } else {
        // If nothing remains in HTML, keep it empty/undefined
        delete cleanInfo.images;
      }
    }

    return cleanInfo;
  }

  private async processDescriptionMedia(
    html: string,
    pdfFiles: PdfFileEntry[],
    bucket: string
  ): Promise<{
    processedHtml: string;
    uploadedImages: { storagePath: string; filename: string }[];
    uploadedPdfs: { storagePath: string; filename: string }[];
  }> {
    const uploadedImages: { storagePath: string; filename: string }[] = [];
    const uploadedPdfs: { storagePath: string; filename: string }[] = [];

    if (!html || typeof html !== 'string') {
      return { processedHtml: html, uploadedImages, uploadedPdfs };
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Process base64 images
      const imgs = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];
      const imageUploadTasks: Promise<void>[] = [];

      imgs.forEach((img, imgIdx) => {
        const src = img.getAttribute('src') || '';

        // Skip if not base64 (already uploaded or external URL)
        if (!src.startsWith('data:')) return;

        imageUploadTasks.push(
          (async () => {
            try {
              const { blob, ext, mimeType } = this.dataUrlToBlob(src);
              const bucketId = this.assignmentsService.getRandomGeneratedId();
              const filename = `image_${imgIdx + 1}.${ext}`;
              const storagePath = `${bucket}/${bucketId}.${ext}`;

              const ref = this.afStorage.ref(storagePath);
              const uploadTask = this.afStorage.upload(storagePath, blob, {
                contentType: mimeType,
              });

              await lastValueFrom(uploadTask.snapshotChanges());
              const downloadURL = await lastValueFrom(ref.getDownloadURL());

              // Update image element
              img.setAttribute('src', downloadURL);
              img.setAttribute('data-storage-path', storagePath);

              // Track uploaded image
              uploadedImages.push({ storagePath, filename });
            } catch (err) {
              console.error(`[ReviewQuiz] Failed to upload base64 image ${imgIdx}:`, err);
            }
          })()
        );
      });

      // Process blob URL PDFs
      const pdfContainers = Array.from(
        doc.querySelectorAll('.pdf-embed-container')
      ) as HTMLElement[];
      const pdfUploadTasks: Promise<void>[] = [];

      pdfContainers.forEach((container, pdfIdx) => {
        const blobUrl = container.getAttribute('data-url') || '';
        const isBlob = container.getAttribute('data-is-blob') === 'true';
        const filename = container.getAttribute('data-filename') || `document_${pdfIdx + 1}.pdf`;

        // Skip if not a blob URL (already uploaded)
        if (!isBlob || !blobUrl.startsWith('blob:')) return;

        // Find the corresponding file entry
        const fileEntry = pdfFiles.find((entry) => entry.blobUrl === blobUrl);
        if (!fileEntry) {
          console.warn(`[ReviewQuiz] PDF file entry not found for blob URL: ${blobUrl}`);
          return;
        }

        pdfUploadTasks.push(
          (async () => {
            try {
              const bucketId = this.assignmentsService.getRandomGeneratedId();
              const ext = this.getFileExtension(fileEntry.filename);
              const storagePath = `${bucket}/${bucketId}.${ext}`;

              const ref = this.afStorage.ref(storagePath);
              const uploadTask = this.afStorage.upload(storagePath, fileEntry.file, {
                contentType: 'application/pdf',
              });

              await lastValueFrom(uploadTask.snapshotChanges());
              const downloadURL = await lastValueFrom(ref.getDownloadURL());

              // Update PDF container attributes
              container.setAttribute('data-url', downloadURL);
              container.setAttribute('data-storage-path', storagePath);
              container.setAttribute('data-is-blob', 'false');

              // Update iframe src
              const iframe = container.querySelector('iframe');
              if (iframe) {
                iframe.setAttribute('src', downloadURL);
              }

              // Revoke the blob URL to free memory
              URL.revokeObjectURL(blobUrl);

              // Track uploaded PDF
              uploadedPdfs.push({ storagePath, filename: fileEntry.filename });
            } catch (err) {
              console.error(`[ReviewQuiz] Failed to upload PDF ${pdfIdx}:`, err);
            }
          })()
        );
      });

      // Wait for all uploads to complete
      await Promise.all([...imageUploadTasks, ...pdfUploadTasks]);

      return {
        processedHtml: doc.body.innerHTML,
        uploadedImages,
        uploadedPdfs,
      };
    } catch (e) {
      console.error('[ReviewQuiz] Parsing/processing error:', e);
      return { processedHtml: html, uploadedImages, uploadedPdfs };
    }
  }

  /**
   * Remove editor-only elements from HTML before saving
   */
  private sanitizeDescriptionHtml(html: string): string {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Remove delete buttons
      doc.querySelectorAll('.pdf-delete-btn').forEach((n) => n.remove());

      // Remove filename spans (only needed in editor)
      doc.querySelectorAll('.pdf-filename').forEach((n) => n.remove());

      // Remove empty headers
      doc.querySelectorAll('.pdf-header').forEach((h) => {
        if (!h.querySelector('img') && h.textContent?.trim() === '') {
          h.remove();
        }
      });

      return doc.body.innerHTML;
    } catch {
      return html;
    }
  }

  /**
   * Process base64 images in question titles and sub-part titles
   */
  private async processBase64ImagesInQuestions(quiz: any): Promise<void> {
    if (!quiz?.questions?.length) return;

    const uploadTasks: Promise<void>[] = [];

    quiz.questions.forEach((question: any, questionIndex: number) => {
      // Process main question title
      if (question?.questionTitle && typeof question.questionTitle === 'string') {
        uploadTasks.push(this.replaceBase64InQuestionHtml(question, questionIndex));
      }

      // Process sub-part titles if they exist
      if (question?.subParts && Array.isArray(question.subParts)) {
        question.subParts.forEach((subPart: any, subPartIndex: number) => {
          if (subPart?.subPartTitle && typeof subPart.subPartTitle === 'string') {
            uploadTasks.push(this.replaceBase64InSubPartHtml(subPart, questionIndex, subPartIndex));
          }
        });
      }
    });

    await Promise.all(uploadTasks);
  }

  private async replaceBase64InQuestionHtml(question: any, questionIndex: number): Promise<void> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(question.questionTitle, 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];

      if (!imgs.length) return;

      const tasks: Promise<void>[] = [];

      imgs.forEach((img, imgIdx) => {
        const src = img.getAttribute('src') || '';
        if (!src.startsWith('data:')) return;

        tasks.push(
          (async () => {
            try {
              const { blob, ext, mimeType } = this.dataUrlToBlob(src);
              const bucketId = this.assignmentsService.getRandomGeneratedId();
              const storagePath = `${QUIZZER_STORAGE_BUCKET}/${bucketId}.${ext}`;

              const ref = this.afStorage.ref(storagePath);
              const uploadTask = this.afStorage.upload(storagePath, blob, {
                contentType: mimeType,
              });

              await lastValueFrom(uploadTask.snapshotChanges());
              const downloadURL = await lastValueFrom(ref.getDownloadURL());

              img.setAttribute('src', downloadURL);
              img.setAttribute('data-storage-path', storagePath);
            } catch (err) {
              console.error(
                `[ReviewQuiz] Failed to upload base64 image for question ${questionIndex}, image ${imgIdx}:`,
                err
              );
            }
          })()
        );
      });

      await Promise.all(tasks);
      question.questionTitle = doc.body.innerHTML;
    } catch (e) {
      console.error(`[ReviewQuiz] Parsing/processing error for question ${questionIndex}:`, e);
    }
  }

  /**
   * Process base64 images in sub-part titles and upload to Firebase Storage
   */
  private async replaceBase64InSubPartHtml(subPart: any, questionIndex: number, subPartIndex: number): Promise<void> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(subPart.subPartTitle, 'text/html');
      const imgs = Array.from(doc.querySelectorAll('img')) as HTMLImageElement[];

      if (!imgs.length) return;

      const tasks: Promise<void>[] = [];

      imgs.forEach((img, imgIdx) => {
        const src = img.getAttribute('src') || '';
        if (!src.startsWith('data:')) return;

        tasks.push(
          (async () => {
            try {
              const { blob, ext, mimeType } = this.dataUrlToBlob(src);
              const bucketId = this.assignmentsService.getRandomGeneratedId();
              const storagePath = `${QUIZZER_STORAGE_BUCKET}/${bucketId}.${ext}`;

              const ref = this.afStorage.ref(storagePath);
              const uploadTask = this.afStorage.upload(storagePath, blob, {
                contentType: mimeType,
              });

              await lastValueFrom(uploadTask.snapshotChanges());
              const downloadURL = await lastValueFrom(ref.getDownloadURL());

              img.setAttribute('src', downloadURL);
              img.setAttribute('data-storage-path', storagePath);
            } catch (err) {
              console.error(
                `[ReviewQuiz] Failed to upload base64 image for question ${questionIndex}, sub-part ${subPartIndex}, image ${imgIdx}:`,
                err
              );
            }
          })()
        );
      });

      await Promise.all(tasks);
      subPart.subPartTitle = doc.body.innerHTML;
    } catch (e) {
      console.error(`[ReviewQuiz] Parsing/processing error for question ${questionIndex}, sub-part ${subPartIndex}:`, e);
    }
  }

  private async uploadOptionImages(quiz: any): Promise<void> {
    if (!this.optionFiles || this.optionFiles.length === 0) return;

    const uploadTasks: Promise<void>[] = [];

    for (const fileEntry of this.optionFiles) {
      const { questionIndex, optionIndex, file } = fileEntry;
      const option = quiz.questions[questionIndex]?.options?.[optionIndex];

      if (!option || !option.imagePath?.startsWith('blob:')) continue;

      const ext = this.getFileExtension(file.name);
      const bucketId = this.assignmentsService.getRandomGeneratedId();
      const storagePath = `${QUIZZER_STORAGE_BUCKET}/${bucketId}.${ext}`;

      const ref = this.afStorage.ref(storagePath);
      const task = this.afStorage.upload(storagePath, file);

      const uploadPromise = lastValueFrom(task.snapshotChanges()).then(async () => {
        // Store the storage path (not download URL) - consistent with existing pattern
        option.imagePath = storagePath;
      });

      uploadTasks.push(uploadPromise);
    }

    await Promise.all(uploadTasks);
  }

  /**
   * Convert data URL to Blob with proper typing
   */
  private dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string; mimeType: string } {
    const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
    if (!match) {
      throw new Error('Invalid data URL');
    }

    const mimeType = match[1];
    const b64 = match[2];
    const byteString = atob(b64);
    const len = byteString.length;
    const u8 = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      u8[i] = byteString.charCodeAt(i);
    }

    const blob = new Blob([u8], { type: mimeType });

    // Determine extension from MIME type
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
      ext = 'jpg';
    } else if (mimeType.includes('gif')) {
      ext = 'gif';
    } else if (mimeType.includes('webp')) {
      ext = 'webp';
    } else if (mimeType.includes('png')) {
      ext = 'png';
    } else {
      ext = mimeType.split('/')[1] || 'png';
    }

    return { blob, ext, mimeType };
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin';
  }

  sanitizeBlobUrl(url: string): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }

  removeUndefined(obj: any): any {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
 * Extract ALL media (images + PDFs) currently present in the HTML,
 * preserving the order they appear in the document.
 *
 * IMPORTANT: This relies on `data-storage-path` being present on <img>
 * and on `.pdf-embed-container` (which your upload code already sets).
 */
  private extractAllCaseStudyMediaFromHtml(html: string): CaseStudyMedia[] {
    const media: CaseStudyMedia[] = [];

    if (!html || typeof html !== 'string') return media;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Walk through DOM in-order and capture IMG + PDF containers
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);

      while (walker.nextNode()) {
        const el = walker.currentNode as HTMLElement;

        // IMAGE
        if (el.tagName === 'IMG') {
          const img = el as HTMLImageElement;
          const storagePath = img.getAttribute('data-storage-path') || '';
          if (!storagePath) continue; // if missing, we can't persist reliably

          const filename =
            this.filenameFromStoragePath(storagePath) || 'image';

          media.push({
            storagePath,
            filename,
            order: media.length,
            type: 'image',
          });

          continue;
        }

        // PDF
        if (el.classList.contains('pdf-embed-container')) {
          const storagePath = el.getAttribute('data-storage-path') || '';
          if (!storagePath) continue;

          const filename =
            el.getAttribute('data-filename') ||
            this.filenameFromStoragePath(storagePath) ||
            'document.pdf';

          media.push({
            storagePath,
            filename,
            order: media.length,
            type: 'pdf',
          });
        }
      }
    } catch (e) {
      console.error('[ReviewQuiz] Failed extracting media from HTML:', e);
    }

    return media;
  }

  private filenameFromStoragePath(storagePath: string): string {
    try {
      const parts = storagePath.split('/');
      return parts[parts.length - 1] || storagePath;
    } catch {
      return storagePath;
    }
  }

  /**
   * Calculate total marks for all sub-parts of a question
   */
  getTotalSubPartMarks(quiz: any): number {
    if (!quiz?.subParts || quiz.subParts.length === 0) return 0;
    let total = 0;
    for (const subPart of quiz.subParts) {
      total += subPart.marks || 0;
    }
    return total;
  }

  /**
   * Get alphabet letter for option index (0 = A, 1 = B, etc.)
   */
  getAlphabet(index: number): string {
    return String.fromCharCode(65 + index);
  }

}