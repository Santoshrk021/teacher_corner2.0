import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-upload-view',
  templateUrl: './upload-view.component.html',
  styleUrls: ['./upload-view.component.scss']
})
export class UploadViewComponent implements OnInit {
  @Input() assignment: any;

  constructor() { }

  ngOnInit(): void {
    console.error(this.assignment);
  }

}
