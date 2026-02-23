import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-quiz-case-study',
  templateUrl: './quiz-case-study.component.html',
  styleUrls: ['./quiz-case-study.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizCaseStudyComponent {

  safeHtml: SafeHtml = '';

  @Input()
  set html(value: string) {
    const v = value || '';
    this.safeHtml = this.sanitizer.bypassSecurityTrustHtml(v);
  }

  constructor(private sanitizer: DomSanitizer) {}
}