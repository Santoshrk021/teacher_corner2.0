import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import Quill from 'quill';
import { CaseStudy } from 'app/shared/interfaces/case-study.interface';

const ImageBlot = Quill.import('formats/image');

class CustomImage extends ImageBlot {
  static create(value: any): HTMLElement {
    const node = super.create(value) as HTMLElement;
    if (typeof value === 'object') {
      node.setAttribute('src', value.url || value);
      if (value.width) node.setAttribute('width', value.width);
      if (value.height) node.setAttribute('height', value.height);
      if (value.style) node.setAttribute('style', value.style);
    }
    return node;
  }

  static value(node: HTMLElement): object {
    return {
      url: node.getAttribute('src'),
      width: node.getAttribute('width'),
      height: node.getAttribute('height'),
      style: node.getAttribute('style'),
    };
  }

  static formats(node: HTMLElement): object {
    const format: any = {};
    if (node.hasAttribute('width')) format.width = node.getAttribute('width');
    if (node.hasAttribute('height')) format.height = node.getAttribute('height');
    if (node.hasAttribute('style')) format.style = node.getAttribute('style');
    return format;
  }

  format(name: string, value: string): void {
    if (['width', 'height', 'style'].includes(name)) {
      if (value) this.domNode.setAttribute(name, value);
      else this.domNode.removeAttribute(name);
      return;
    }
    super.format(name, value);
  }
}

CustomImage.blotName = 'image';
CustomImage.tagName = 'img';
Quill.register(CustomImage, true);

const BlockEmbed = Quill.import('blots/block/embed');

class PdfEmbed extends BlockEmbed {
  static create(value: any): HTMLElement {
    const node = super.create() as HTMLElement;
    node.classList.add('pdf-embed-container');

    const wrapper = document.createElement('div');
    wrapper.className = 'pdf-embed-wrapper';

    const header = document.createElement('div');
    header.className = 'pdf-header';

    // Show filename
    const filenameSpan = document.createElement('span');
    filenameSpan.className = 'pdf-filename';
    filenameSpan.textContent = value.filename || 'PDF Document';
    header.appendChild(filenameSpan);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'pdf-delete-btn';
    delBtn.setAttribute('title', 'Delete PDF');
    delBtn.setAttribute('aria-label', 'Delete PDF');
    delBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
        <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/>
      </svg>
    `;

    header.appendChild(delBtn);

    const iframe = document.createElement('iframe');
    iframe.src = value.url;
    iframe.setAttribute('width', value.width || '100%');
    iframe.setAttribute('height', value.height || '400px');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('allowfullscreen', 'true');

    wrapper.appendChild(header);
    wrapper.appendChild(iframe);
    node.appendChild(wrapper);

    // Store metadata as data attributes
    node.setAttribute('data-url', value.url);
    node.setAttribute('data-filename', value.filename || '');
    // data-storage-path will be empty for new PDFs (blob URLs), filled for existing PDFs
    node.setAttribute('data-storage-path', value.storagePath || '');
    // Mark as blob if it's a blob URL (not yet uploaded)
    node.setAttribute('data-is-blob', value.url?.startsWith('blob:') ? 'true' : 'false');

    return node;
  }

  static value(node: HTMLElement): object {
    return {
      url: node.getAttribute('data-url'),
      filename: node.getAttribute('data-filename'),
      storagePath: node.getAttribute('data-storage-path'),
      isBlob: node.getAttribute('data-is-blob') === 'true',
    };
  }
}

PdfEmbed.blotName = 'pdfEmbed';
PdfEmbed.tagName = 'div';
PdfEmbed.className = 'pdf-embed-container';
Quill.register(PdfEmbed, true);

/**
 * Interface for tracking PDF files that need to be uploaded on save
 */
export interface PdfFileEntry {
  blobUrl: string;
  file: File;
  filename: string;
}

@Component({
  selector: 'app-background-info-step',
  templateUrl: './background-info-step.component.html',
  styleUrls: ['./background-info-step.component.scss'],
})
export class BackgroundInfoStepComponent implements OnInit, OnDestroy {
  @Input() quizInfo: any;
  @Output() backgroundInfo = new EventEmitter<CaseStudy | null>();
  @Output() pdfFiles = new EventEmitter<PdfFileEntry[]>();
  @ViewChild('inlineFileInput') inlineFileInput!: ElementRef<HTMLInputElement>;

  backgroundForm!: FormGroup;
  quillInstance: any;
  currentCursorPosition = 0;
  isInlineUploading = false;

  // Modal state for image resize
  showImageModal = false;
  selectedImageForResize: HTMLImageElement | null = null;
  customImageWidth = 0;
  selectedAlignment: 'left' | 'center' | 'right' = 'center';
  selectedSize: number | 'custom' = 50;

  // Track PDF files for later upload (similar to optionFiles in create-question-step)
  private uploadedPdfFiles: PdfFileEntry[] = [];

  // Configuration options
  imageSizeOptions = [
    { label: 'Small (25%)', value: 25 },
    { label: 'Medium (50%)', value: 50 },
    { label: 'Large (75%)', value: 75 },
    { label: 'Full Width (100%)', value: 100 },
    { label: 'Custom', value: 'custom' },
  ];

  alignmentOptions = [
    { label: 'Left', value: 'left', icon: 'format_align_left' },
    { label: 'Center', value: 'center', icon: 'format_align_center' },
    { label: 'Right', value: 'right', icon: 'format_align_right' },
  ];

  quillConfig = {
    toolbar: {
      container: '#custom-toolbar',
      handlers: {
        image: () => this.customImageHandler(),
        insertPdf: () => this.insertPdfHandler(),
      },
    },
  };

  constructor(
    private fb: FormBuilder,
    private assignmentsService: AssignmentsService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadExistingData();
  }

  private initializeForm(): void {
    this.backgroundForm = this.fb.group({
      title: [''],
      description: [''],
    });
  }

  private loadExistingData(): void {
    if (!this.quizInfo?.backgroundInfo) return;

    const bgInfo = this.quizInfo.backgroundInfo;

    this.backgroundForm.patchValue({
      title: bgInfo.title || '',
      description: bgInfo.description || '',
    });


  }

  onEditorCreated(quill: any): void {
    this.quillInstance = quill;
    this.setupEditorEventListeners(quill);
    this.restorePdfDeleteButtons(quill);
  }

  private setupEditorEventListeners(quill: any): void {
    quill.root.addEventListener('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Handle PDF delete button click
      const delBtn = target.closest('.pdf-delete-btn') as HTMLElement | null;
      if (delBtn) {
        event.preventDefault();
        event.stopPropagation();
        this.handlePdfDelete(target);
        return;
      }

      // Handle image click for resize modal
      if (target.tagName === 'IMG') {
        this.openImageResizeModal(target as HTMLImageElement);
        return;
      }
    });

    // Track cursor position for inserts
    quill.on('selection-change', (range: any) => {
      if (range) this.currentCursorPosition = range.index;
    });
  }

  private handlePdfDelete(target: HTMLElement): void {
    const pdfContainer = target.closest('.pdf-embed-container') as HTMLElement | null;
    if (!pdfContainer) return;

    const blobUrl = pdfContainer.getAttribute('data-url') || '';
    const isBlob = pdfContainer.getAttribute('data-is-blob') === 'true';

    pdfContainer.remove();

    // If it was a blob URL, remove from pending uploads and revoke the blob
    if (isBlob && blobUrl.startsWith('blob:')) {
      this.uploadedPdfFiles = this.uploadedPdfFiles.filter(
        (entry) => entry.blobUrl !== blobUrl
      );
      URL.revokeObjectURL(blobUrl);
    }

    this.syncEditorToForm();
  }

  private restorePdfDeleteButtons(quill: any): void {
    setTimeout(() => {
      const existingPdfs = quill.root.querySelectorAll('.pdf-embed-container');
      existingPdfs.forEach((container: Element) => {
        const pdfContainer = container as HTMLElement;

        if (pdfContainer.querySelector('.pdf-delete-btn')) return;

        let header = pdfContainer.querySelector('.pdf-header') as HTMLElement | null;

        if (!header) {
          header = document.createElement('div');
          header.className = 'pdf-header';

          const wrapper = pdfContainer.querySelector('.pdf-embed-wrapper');
          if (wrapper) wrapper.insertBefore(header, wrapper.firstChild);
          else pdfContainer.insertBefore(header, pdfContainer.firstChild);
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pdf-delete-btn';
        btn.setAttribute('title', 'Delete PDF');
        btn.setAttribute('aria-label', 'Delete PDF');
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path d="M18.3 5.7a1 1 0 0 0-1.4 0L12 10.6 7.1 5.7a1 1 0 1 0-1.4 1.4L10.6 12l-4.9 4.9a1 1 0 1 0 1.4 1.4L12 13.4l4.9 4.9a1 1 0 0 0 1.4-1.4L13.4 12l4.9-4.9a1 1 0 0 0 0-1.4z"/>
          </svg>
        `;
        header.appendChild(btn);
      });
    }, 0);
  }

  customImageHandler(): void {
    const range = this.quillInstance?.getSelection();
    this.currentCursorPosition = range ? range.index : this.quillInstance.getLength();

    this.inlineFileInput.nativeElement.accept = 'image/jpeg,image/png,image/gif,image/jpg,image/webp';
    this.inlineFileInput.nativeElement.click();
  }

  insertPdfHandler(): void {
    const range = this.quillInstance?.getSelection();
    this.currentCursorPosition = range ? range.index : this.quillInstance.getLength();

    this.inlineFileInput.nativeElement.accept = 'application/pdf';
    this.inlineFileInput.nativeElement.click();
  }

  onInlineFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    if (file.type === 'application/pdf') {
      // PDFs are inserted as blob URLs (uploaded on save)
      this.insertPdfAsBlobUrl(file);
    } else if (file.type.startsWith('image/')) {
      // Images are inserted as base64 (uploaded on save)
      this.insertImageAsBase64(file);
    }

    input.value = '';
  }


  private insertImageAsBase64(file: File): void {
    this.isInlineUploading = true;

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const base64Data = e.target?.result as string;

      this.quillInstance.insertEmbed(this.currentCursorPosition, 'image', {
        url: base64Data,
        width: '50%',
        style: 'max-width: 100%; height: auto; display: block; margin: 10px auto;',
      });

      this.quillInstance.setSelection(this.currentCursorPosition + 1);
      this.syncEditorToForm();
      this.isInlineUploading = false;
    };

    reader.onerror = (err) => {
      console.error('[BackgroundInfoStep] Error reading image file:', err);
      this.isInlineUploading = false;
    };

    reader.readAsDataURL(file);
  }


  private insertPdfAsBlobUrl(file: File): void {
    this.isInlineUploading = true;

    // Create a blob URL for temporary preview
    const blobUrl = URL.createObjectURL(file);

    // Store the file for later upload
    this.uploadedPdfFiles.push({
      blobUrl,
      file,
      filename: file.name,
    });

    // Insert into editor with blob URL
    this.quillInstance.insertEmbed(this.currentCursorPosition, 'pdfEmbed', {
      url: blobUrl,
      filename: file.name,
      storagePath: '', // Will be filled after upload
      width: '100%',
      height: '600px',
    });

    this.quillInstance.setSelection(this.currentCursorPosition + 1);
    this.syncEditorToForm();
    this.isInlineUploading = false;
  }

  openImageResizeModal(img: HTMLImageElement): void {
    this.selectedImageForResize = img;

    // Determine current alignment
    const style = img.getAttribute('style') || '';
    if (style.includes('margin-right: auto') && !style.includes('margin-left: auto')) {
      this.selectedAlignment = 'left';
    } else if (style.includes('margin-left: auto') && !style.includes('margin-right: auto')) {
      this.selectedAlignment = 'right';
    } else {
      this.selectedAlignment = 'center';
    }

    // Determine current size
    const width = img.getAttribute('width') || img.style.width;
    if (width) {
      if (width.includes('%')) {
        const percent = parseInt(width, 10);
        if ([25, 50, 75, 100].includes(percent)) {
          this.selectedSize = percent;
        } else {
          this.selectedSize = 'custom';
          this.customImageWidth = percent;
        }
      } else {
        this.selectedSize = 'custom';
        this.customImageWidth = parseInt(width, 10) || img.width || img.naturalWidth;
      }
    } else {
      this.selectedSize = 50;
    }

    this.showImageModal = true;
  }

  applyImageSettings(): void {
    if (!this.selectedImageForResize) return;

    let alignmentStyle = 'margin-left: auto; margin-right: auto;';
    if (this.selectedAlignment === 'left') alignmentStyle = 'margin-left: 0; margin-right: auto;';
    if (this.selectedAlignment === 'right') alignmentStyle = 'margin-left: auto; margin-right: 0;';

    const newWidth = this.selectedSize === 'custom' ? `${this.customImageWidth}px` : `${this.selectedSize}%`;
    const baseStyle = `max-width: 100%; height: auto; display: block; ${alignmentStyle}`;

    this.selectedImageForResize.style.cssText = baseStyle;
    this.selectedImageForResize.style.width = newWidth;
    this.selectedImageForResize.setAttribute('width', newWidth);
    this.selectedImageForResize.setAttribute('style', `${baseStyle} width: ${newWidth};`);

    this.syncEditorToForm();
    this.closeImageModal();
  }

  deleteSelectedMedia(): void {
    if (this.selectedImageForResize) {
      this.selectedImageForResize.remove();
      this.syncEditorToForm();
    }
    this.closeImageModal();
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedImageForResize = null;
    this.selectedAlignment = 'center';
    this.selectedSize = 50;
    this.customImageWidth = 0;
  }

  private syncEditorToForm(): void {
    if (!this.quillInstance || !this.backgroundForm) return;

    let html = this.quillInstance.root.innerHTML;

    // Remove editor-only delete buttons before saving HTML
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      doc.querySelectorAll('.pdf-delete-btn').forEach((n) => n.remove());
      html = doc.body.innerHTML;
    } catch {
      // Fallback to raw HTML if parsing fails
    }

    this.backgroundForm.get('description')?.setValue(html);
  }

  skipStep(): void {
    this.backgroundInfo.emit(null);
    this.pdfFiles.emit([]);
  }

  saveAndNext(): void {
    const info: CaseStudy = {
      title: this.backgroundForm.value.title || '',
      description: this.backgroundForm.value.description || '',
      // Images array will be populated in review step after uploads
      images: [],
    };

    // Emit both the case study info and the PDF files to be uploaded
    this.backgroundInfo.emit(info);
    this.pdfFiles.emit(this.uploadedPdfFiles);
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : 'bin';
  }

  ngOnDestroy(): void {
    // Revoke all blob URLs to free memory
    this.uploadedPdfFiles.forEach((entry) => {
      if (entry.blobUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(entry.blobUrl);
      }
    });
  }
}