import { HttpClient } from '@angular/common/http';
import {
  Directive,
  ElementRef,
  HostBinding,
  HostListener,
  Inject,
  Input
} from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { SAMEORIGIN } from './token-file';


@Directive({
  selector: '[appDownloadDirective]',
  exportAs: 'appDownloadDirective'
})
export class DownloadDirectiveDirective {


  public error: boolean = false;

  /* True when the request is in process */
  public busy: boolean = false;

  private sub: Subscription;
  private blob: string;
  private href: string;

  constructor(
    @Inject(SAMEORIGIN) private sameOrigin: RegExp,
    private http: HttpClient,
    private ref: ElementRef<HTMLAnchorElement>,
    private sanitizer: DomSanitizer
  ) { }


  @HostBinding('attr.download')
  @Input()
  download: string;

  @Input('href') set source(href: string) {
    if (this.blob) {
      URL.revokeObjectURL(this.blob);
      this.blob = undefined;
    }
    this.error = false;

    this.href = href;
  }

  @HostBinding('href') get safeHref(): SafeUrl {
    return this.sanitizer.bypassSecurityTrustUrl(this.href);
  }

  @HostListener('click') onClick() {
    if (!this.href || this.busy) {
      return false;
    }

    if (this.error || this.sameOrigin.test(this.href)) {
      return true;
    }

    if (this.sub) {
      this.sub.unsubscribe();
    }

    this.busy = true;


    this.sub = this.http
      .get(this.href, { responseType: 'blob' })
      .pipe(
        map(blob => (this.blob = URL.createObjectURL(blob))),

        catchError((error) => {
          console.error('Unable to download the source file', error);

          this.error = true;

          return of(this.href);
        })
      )
      .subscribe((url) => {
        this.href = url;
        // Ends processing
        this.busy = false;

        setTimeout(() => this.ref.nativeElement.click());
      });

    // Prevents default
    return false;
  }

  ngOnDestroy() {
    if (this.blob) {
      URL.revokeObjectURL(this.blob);
    }

    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
