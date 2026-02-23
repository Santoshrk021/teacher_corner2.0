import { Component, OnInit } from '@angular/core';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-no-classroom',
  templateUrl: './no-classroom.component.html',
  styleUrls: ['./no-classroom.component.scss']
})
export class NoClassroomComponent implements OnInit {
  environment = environment;

  constructor() { }

  ngOnInit(): void {
  }

}
