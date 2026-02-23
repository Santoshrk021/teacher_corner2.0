import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-upload-type',
  templateUrl: './upload-type.component.html',
  styleUrls: ['./upload-type.component.scss']
})
export class UploadTypeComponent implements OnInit {
  @Input() assignment: any;

  constructor() { }

  ngOnInit(): void {
  }

}
