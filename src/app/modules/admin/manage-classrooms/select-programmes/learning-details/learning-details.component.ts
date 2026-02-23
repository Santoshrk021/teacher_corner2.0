import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter, NgxMatDateFormats } from '@angular-material-components/datetime-picker';
import { NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular-material-components/moment-adapter';
import { CustomNgxDatetimeAdapter } from 'app/shared/customNgxDatetimeAdapter';
import moment from 'moment';
import { Timestamp } from '@angular/fire/firestore';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { ClassroomService } from 'app/modules/dashboard/classroom.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';

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
  templateUrl: './learning-details.component.html',
  styleUrls: ['./learning-details.component.scss'],
  providers: [
    {
      provide: NgxMatDateAdapter,
      useClass: CustomNgxDatetimeAdapter,
      deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    { provide: NGX_MAT_DATE_FORMATS, useValue: MY_FORMATS }
  ],
})
export class LearningDetailsComponent implements OnInit {
  workflowIdsForm: FormGroup;
  currentDate: Date;
  learningUnitNames: Array<string>;
  showloading = false;
  modifiedClassroomPr;
  currentProgramObj;
  currentSelectedProgram;
  submitBtnActive: boolean = false;
  _wfInitialValue = new BehaviorSubject(null);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private dateAdapter: DateAdapter<Date>,
    private learningUnitService: LearningUnitsService,
    private classroomService: ClassroomsService,
    private programmmeService: ProgrammeService
  ) { }

  onDateChange(event: any) {
    const momentDate = moment(event, MY_FORMATS.display.dateInput); // Parse selected date
    const dateObject = momentDate.toDate(); // Convert to JavaScript Date
    //this.selectedDate = dateObject;
    return dateObject;
  }

  async ngOnInit() {
    this.showloading = true;
    this.currentDate = new Date();
    this.currentDate.setHours(this.currentDate.getHours() + 1);
    this.dateAdapter.setLocale('en');
    const currentProgrammesinClassroom = await this.getCurrentProgrammes();
    const currentProgramme = await this.getCurrentProgramme();
    this.currentProgramObj = currentProgrammesinClassroom.data().programmes;
    const mapped = await this.convertToMoment();
    this.currentSelectedProgram = currentProgramme.data();
    if (this.currentSelectedProgram.learningUnitsIds && this.currentSelectedProgram.learningUnitsIds.length !== 0) {
      this.learningUnitNames = await Promise.all(this.currentSelectedProgram.learningUnitsIds.map(async (learningUnitId: string) => {
        const learningUnit = await lastValueFrom(this.learningUnitService.getLUByIdOnce(learningUnitId));
        if (learningUnit.exists) {
          return learningUnit.get('learningUnitDisplayName');
        }
      }));
    }
    else {
      this.learningUnitNames = [];
    }

    this.setForm();
    this.showloading = false;
    this.workflowIdsForm.valueChanges.subscribe((change) => {
      if (JSON.stringify(this._wfInitialValue.value) == JSON.stringify(change)) {
        this.submitBtnActive = true;
      }
      else {
        this.submitBtnActive = false;
      }
    });
  }

  onSequntialLockToggleChange(event: MatSlideToggleChange) {
    if (event.checked) {
      (this.workflowIdsForm.get('workflowIds') as FormArray).controls.forEach((control) => {
        control.get('lockAt').reset();
        control.get('lockAt').disable();
        control.get('unlockAt').reset();
        control.get('unlockAt').disable();
      });
    } else {
      (this.workflowIdsForm.get('workflowIds') as FormArray).controls.forEach((control) => {
        control.get('lockAt').enable();
        control.get('unlockAt').enable();
      });
    };
  }

  async getCurrentProgrammes() {
    const currentProgrammes = await lastValueFrom(this.classroomService.getClassroomByIdOnce(this.data.classroomDetails.docId));
    return currentProgrammes;
  }

  async convertToMoment() {
    Object.keys(this.currentProgramObj).forEach((programmekey) => {
      if (this.currentProgramObj[programmekey].workflowIds) {
        this.currentProgramObj[programmekey].workflowIds.forEach((workflow, index) => {
          if (workflow.lockAt !== '' && workflow.unlockAt !== '') {
            this.currentProgramObj[programmekey].workflowIds[index].lockAt = this.momentDate(workflow.lockAt);
            this.currentProgramObj[programmekey].workflowIds[index].unlockAt = this.momentDate(workflow.unlockAt);
          }
        });
      }
    });

    return this.currentProgramObj;
  }

  momentDate(date) {
    const dateObject = new Date(
      date?.seconds * 1000 + date?.nanoseconds / 1e6
    );

    // Create a Moment object and format the date
    const momentObject = moment(dateObject);
    const formattedDate = momentObject.format('DD/MM/YYYY hh:mm A');

    return formattedDate;
  }

  async getCurrentProgramme() {
    const currentProgramme = await lastValueFrom(this.programmmeService.getProgrammeByIdOnce(this.data.programmeData.programmeId));
    return currentProgramme;

  }

  setForm() {
    if (this.currentSelectedProgram.learningUnitsIds) {
      this.workflowIdsForm = this.fb.group({
        sequentiallyLocked: [this.currentProgramObj[this.currentSelectedProgram.docId]?.sequentiallyLocked || false],
        workflowIds: this.fb.array(
          this.currentSelectedProgram?.learningUnitsIds?.map((learningUnitId: string, index) => this.fb.group({
            lockAt: [
              this.formatDateForInput(
                this.currentProgramObj[this.currentSelectedProgram.docId] ? this.currentProgramObj[this.currentSelectedProgram.docId]?.workflowIds ? this.currentProgramObj[this.currentSelectedProgram.docId]?.workflowIds[index]?.lockAt || '' : '' : ''
              )
            ],
            unlockAt: [
              this.formatDateForInput(
                this.currentProgramObj[this.currentSelectedProgram.docId] ? this.currentProgramObj[this.currentSelectedProgram.docId].workflowIds ? this.currentProgramObj[this.currentSelectedProgram.docId]?.workflowIds[index]?.unlockAt || '' : '' : ''
              )
            ],
            workflowLocked: [this.currentProgramObj[this.currentSelectedProgram.docId] ? this.currentProgramObj[this.currentSelectedProgram.docId].workflowIds ? this.currentProgramObj[this.currentSelectedProgram.docId]?.workflowIds[index]?.workflowLocked || false : false : false],
            learningUnitId: [learningUnitId],
            workflowId: [''],
          })
          ))
      });
    }
    else {
      this.workflowIdsForm = this.fb.group({
        sequentiallyLocked: [false],
        workflowIds: this.fb.array([])
      });
    }
    if (this.workflowIdsForm.value.sequentiallyLocked) {
      (this.workflowIdsForm.get('workflowIds') as FormArray).controls.forEach((control) => {
        control.get('lockAt').reset();
        control.get('lockAt').disable();
        control.get('unlockAt').reset();
        control.get('unlockAt').disable();
      });
    };
    this._wfInitialValue.next(this.workflowIdsForm.value);
  }

  get workflowIdsControls() {
    return (this.workflowIdsForm.get('workflowIds') as FormArray).controls;
  }

  // formatDateForInput = (date: Date | string) => {
  //   if (!date || date=='') return '';
  //   return new Date(date).toISOString().slice(0, 16); // Formats to 'YYYY-MM-DDTHH:mm'
  // };

  // formatDateForInput(dateString: string): string {
  //   // Replace 'at' and 'UTC' to make it ISO 8601 compatible
  //      if (!dateString || dateString=='') return '';

  //   const formattedString = dateString.replace('at', '').replace('UTC', 'Z').trim();
  //   const date = new Date(formattedString);

  //   // Format the date using Angular DatePipe (manual formatting here)
  //   return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  // }

  formatDateForInput = (date: Date | string) => {
    if (!date || date == '') {return '';}

    if (typeof date === 'string') {
      // Parse the date string in the format 'DD/MM/YYYY HH:mm AM/PM'
      const [day, month, yearAndTime] = date.split('/');
      const [year, time] = yearAndTime.split(' ');
      const [hour, minute] = time.split(':');
      const isPM = yearAndTime.includes('PM');

      // Convert to 24-hour format
      let hours = parseInt(hour, 10);
      if (isPM && hours < 12) {hours += 12;}
      if (!isPM && hours === 12) {hours = 0;}

      const isoString = `${year}-${month}-${day}T${String(hours).padStart(2, '0')}:${minute}`;
      return isoString; // 'YYYY-MM-DDTHH:mm'
    }

    // If already a Date object, format it directly
    return new Date(date).toISOString().slice(0, 16);
  };


  getIDs() {

  }

  formatTime(hours: number, minutes: number) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  getServerTimestampFromDate(date: Date) {
    const pardsedDate = moment(date, 'DD/MM/YYYY hh:mm A').toDate();
    return Timestamp.fromDate(pardsedDate);
  }

  onSubmit() {
    // const workflowIds = this.workflowIdsForm.value.workflowIds.map(workflow => ({
    //   // ...workflow,
    //   lockAt:  this.onDateChange(workflow.lockAt) ,
    //   unlockAt: this.onDateChange(workflow.unlockAt)
    // }));

    const wfarr = [];
    this.workflowIdsForm.value.workflowIds.forEach((workflow, index) => {
      if (workflow.hasOwnProperty('lockAt') && workflow.lockAt !== '' && workflow.hasOwnProperty('unlockAt') && workflow.unlockAt !== '') {
        if (typeof (workflow.lockAt) === 'string') {
          this.workflowIdsForm.value.workflowIds[index].lockAt = Timestamp.fromDate(new Date(workflow.lockAt));
        }
        else {
          this.workflowIdsForm.value.workflowIds[index].lockAt = this.getServerTimestampFromDate(workflow.lockAt);
        }
        if (typeof (workflow.unlockAt) === 'string') {
          this.workflowIdsForm.value.workflowIds[index].unlockAt = Timestamp.fromDate(new Date(workflow.unlockAt));
        }
        else {
          this.workflowIdsForm.value.workflowIds[index].unlockAt = this.getServerTimestampFromDate(workflow.unlockAt);
        }
        // this.workflowIdsForm.value.workflowIds[index].lockAt = this.getServerTimestampFromDate(workflow.lockAt);
        // this.workflowIdsForm.value.workflowIds[index].unlockAt = this.getServerTimestampFromDate(workflow.unlockAt);
      } else {
        this.workflowIdsForm.value.workflowIds[index].lockAt = '';
        this.workflowIdsForm.value.workflowIds[index].unlockAt = '';
      };
      // this.workflowIdsForm.value.workflowIds[index].workflowLocked = false
    });

    const { displayName, programmeCode, programmeId, programmeName } = this.data.programmeData;
    const classroomProgramme = {
      [this.currentSelectedProgram.docId]: {
        displayName,
        programmeCode,
        programmeId,
        programmeName,
        sequentiallyLocked: this.workflowIdsForm.value.sequentiallyLocked,
        //workflowIds,
        workflowIds: this.workflowIdsForm.value.workflowIds
      }
    };
    this.modifiedClassroomPr = classroomProgramme;
    this.learningUnitService.currentLearningUnitinLockinginterface.next(classroomProgramme[this.currentSelectedProgram.docId]);

    this.currentProgramObj[this.currentSelectedProgram.docId] = classroomProgramme[this.currentSelectedProgram.docId];
    const obj = { programmes: classroomProgramme };
    this.classroomService.updateClsProgrammeswithMerge(obj, this.data.classroomDetails.docId);
    // const parsedDate = (moment(this.assignmentForm.get('assignmentDueDate').value, "DD/MM/YYYY hh:mm A")).toDate();
    // const serverDate = Timestamp.fromDate(parsedDate);
    // const assignment = {
    //   assignmentId: this.data.assignmentData.docId,
    //   assignmentDueDate: serverDate
    // };
    return classroomProgramme;
  }

}
