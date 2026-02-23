import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ProgrammeTemplate } from 'app/core/dbOperations/programmeTemplate/programme-template.type';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-programme-template-info',
  templateUrl: './programme-template-info.component.html',
  styleUrls: ['./programme-template-info.component.scss']
})
export class ProgrammeTemplateInfoComponent implements OnInit {

  @ViewChild('stepper') stepper: MatStepper;
  stepperData = new BehaviorSubject(null);
  addNewTemplateFlag: boolean;
  allTemplates: ProgrammeTemplate;

  constructor(
    public dialogRef: MatDialogRef<ProgrammeTemplateInfoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.addNewTemplateFlag = data.addNewTemplateFlag;
    this.allTemplates = data.allTemplates;
  }

  ngOnInit(): void {
  }

  close() {
    this.dialogRef.close();
  }

}
