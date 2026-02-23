import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-upload-submission-dialog',
  templateUrl: './upload-submission-dialog.component.html',
  styleUrls: ['./upload-submission-dialog.component.scss']
})
export class UploadSubmissionDialogComponent implements OnInit {

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) { }

  ngOnInit(): void {
  }

}
