import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-live-session',
  templateUrl: './live-session.component.html',
})
export class LiveSessionComponent implements OnInit {
  @Input() assignmentData: any;
  filename: any;

  constructor() { }

  ngOnInit(): void {
  }
  upload(event) {
    this.filename = event.target.files[0].name;
  }
}
