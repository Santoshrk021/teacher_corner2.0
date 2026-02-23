import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-upload-images',
  templateUrl: './upload-images.component.html',
  styleUrls: ['./upload-images.component.scss']
})
export class UploadImagesComponent implements OnInit {
  @Input() assignment: any;

  constructor() { }

  ngOnInit(): void {
  }

}
