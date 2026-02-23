import { Component, Inject, OnInit } from '@angular/core';

import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter, NgxMatDateFormats } from '@angular-material-components/datetime-picker';
import { NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular-material-components/moment-adapter';
import { CustomNgxDatetimeAdapter } from 'app/shared/customNgxDatetimeAdapter';
import moment from 'moment';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { Timestamp } from '@angular/fire/firestore';

export const MY_FORMATS: NgxMatDateFormats = {
  parse: {
    dateInput: 'l, LTS',
  },
  display: {
    dateInput: 'DD/MM/YYYY hh:mm A', // this is how your date will get displayed on the Input
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY'
  },
};

@Component({
  selector: 'app-learning-details',
  templateUrl: './assignment-details.component.html',
  styleUrls: ['./assignment-details.component.scss'],
  providers: [
    {
      provide: NgxMatDateAdapter,
      useClass: CustomNgxDatetimeAdapter,
      deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: NGX_MAT_DATE_FORMATS, useValue: MY_FORMATS }
  ],
})
export class AssignmentDetailsComponent implements OnInit {
  assignmentForm: FormGroup;
  currentDate: Date;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private programmeService: ProgrammeService,
    private dateAdapter: DateAdapter<Date>,
  ) { }

  ngOnInit(): void {
    this.setForm();
    this.currentDate = new Date();
    this.currentDate.setHours(this.currentDate.getHours() + 1);
    this.dateAdapter.setLocale('en');
    let parsedDate: any;
    if (this.data.programmeData && this.data.programmeData.assignmentIds.hasOwnProperty(this.data.assignmentData.docId)) {
      const currentAssignment = this.data.programmeData.assignmentIds[this.data.assignmentData.docId];
      parsedDate = new Date(currentAssignment.assignmentDueDate?.seconds * 1000);
    } else {
      parsedDate = new Date(this.data.assignmentData.assignmentDueDate);
    };
    this.assignmentForm.patchValue({
      assignmentDueDate: parsedDate
    });
  }

  setForm() {
    this.assignmentForm = this.fb.group({
      assignmentDueDate: ['', Validators.required]
    });
  }

  formatTime(hours: number, minutes: number) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  onSubmit() {
    const parsedDate = (moment(this.assignmentForm.get('assignmentDueDate').value, 'DD/MM/YYYY hh:mm A')).toDate();
    const serverDate = Timestamp.fromDate(parsedDate);
    /*
    // old code
    this.data.programmeData.assignmentIds = {
      [this.data.assignmentData.docId]: {
        assignmentId: this.data.assignmentData.docId,
        assignmentDueDate: parsedDate
      }
    }
    */
    const assignment = {
      assignmentId: this.data.assignmentData.docId,
      assignmentDueDate: serverDate
    };
    return assignment;
    // this.programmeService.updateProgramme(this.data.programmeData);
  }

}
