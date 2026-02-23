import { Component, OnInit } from '@angular/core';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-no-classroom',
  templateUrl: './no-programmes.component.html',
  styleUrls: ['./no-programmes.component.scss']
})
export class NoProgrammesComponent implements OnInit {
  environment = environment;

  constructor() { }

  ngOnInit(): void {
  }

}
