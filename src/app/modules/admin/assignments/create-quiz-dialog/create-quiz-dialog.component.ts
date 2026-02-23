import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { CaseStudy } from 'app/shared/interfaces/case-study.interface';
import { PdfFileEntry } from './background-info-step/background-info-step.component';

@Component({
  selector: 'app-create-quiz-dialog',
  templateUrl: './create-quiz-dialog.component.html',
  styleUrls: ['./create-quiz-dialog.component.scss']
})
export class CreateQuizDialogComponent implements OnInit {

  quizBasicInfo: any;
  quizQusInfo: any;
  optionFiles: { questionIndex: number; optionIndex: number; file: File }[] = [];
  backgroundInfo: CaseStudy | null = null;
  backgroundPdfFiles: PdfFileEntry[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit(): void {}

  catchBasicInfoEvent(event: any): void {
    this.quizBasicInfo = event;
  }

  catchQusInfoEvent(event: any): void {
    this.quizQusInfo = event;
  }

  catchOptionFiles(event: { questionIndex: number; optionIndex: number; file: File }[]): void {
    this.optionFiles = event;
  }

  /**
   * Catch background info from step 2.
   * This can be null if the user skips the step.
   */
  catchBackgroundInfoEvent(event: CaseStudy | null): void {
    this.backgroundInfo = event;
  }

  /**
   * Catch PDF files from background info step.
   * These files need to be uploaded when saving the quiz.
   */
  catchPdfFilesEvent(event: PdfFileEntry[]): void {
    this.backgroundPdfFiles = event;
  }
}
