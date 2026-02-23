import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-quiz-submission-dialog',
  templateUrl: './quiz-submission-dialog.component.html',
  styleUrls: ['./quiz-submission-dialog.component.scss']
})
export class QuizSubmissionDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit(): void {
  }

}
