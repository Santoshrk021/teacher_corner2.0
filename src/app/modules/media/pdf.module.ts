import { CommonModule } from '@angular/common';
import { Component, Input, NgModule, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PdfViewerModule } from 'ng2-pdf-viewer';

@Component({
    selector: 'app-pdf',
    template: `<pdf-viewer [src]="sanitizedBlobUrl.changingThisBreaksApplicationSecurity" [show-borders]="true"  [fit-to-page]="true" [render-text]="false" >
        </pdf-viewer>`,
    styles: ['pdf-viewer{width:100%; height: 100%}']

})
export class PDFComponent implements OnInit, OnChanges {
    @Input() pdfUrl: string;
    sanitizedBlobUrl: any;


    constructor(private sanitizer: DomSanitizer) { }

    ngOnChanges(changes: SimpleChanges): void {
        this.sanitizedBlobUrl = this.sanitizer.bypassSecurityTrustUrl(this.pdfUrl);
    }

    ngOnInit(): void {


    }

}
@NgModule({
    declarations: [PDFComponent],
    imports: [
        CommonModule,
        PdfViewerModule
    ],
    exports: [
        PDFComponent
    ]
})
export class PDFModule { }
