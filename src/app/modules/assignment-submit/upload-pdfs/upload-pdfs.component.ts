import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-upload-pdfs',
  templateUrl: './upload-pdfs.component.html',
  styleUrls: ['./upload-pdfs.component.scss']
})
export class UploadPdfsComponent implements OnInit {
  @Input() assignment: any;

  constructor() { }

  ngOnInit(): void {
  }

}
