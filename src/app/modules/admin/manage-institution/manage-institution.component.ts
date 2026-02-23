import { Component, OnInit, ViewChild } from '@angular/core';
import { MatStepper } from '@angular/material/stepper';


@Component({
  selector: 'app-manage-institution',
  templateUrl: './manage-institution.component.html',
  styleUrls: ['./manage-institution.component.scss']
})
export class ManageInstitutionComponent implements OnInit {

  instituteInfo: any;
  programmeTemplateInfo: any;
  @ViewChild('stepper') stepper!: MatStepper;  // Get stepper instance

  constructor() { }

  ngOnInit(): void {
  }

  catchInstituteInfoEvent(event) {
    this.instituteInfo = event;
  }

  catchProgrammeTemplateEvent(event) {
    this.programmeTemplateInfo = event;
  }

}
