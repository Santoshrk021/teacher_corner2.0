import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { MatStepper } from '@angular/material/stepper';

interface program {
  programmeName: string;
  programmeDesc: string;
  programmeStatus: string;
  programmeImage: string;
  selectedLearninglist: [];
  selectedAssignments: [];
  type: string;
}

const pr = {
  programmeName: '',
  programmeDesc: '',
  programmeStatus: '',
  programmeImage: '',
  selectedLearninglist: [],
  selectedAssignments: [],
  type: ''
};

@Component({
  selector: 'app-program-info',
  templateUrl: './program-info.component.html',
  styleUrls: ['./program-info.component.scss']
})
export class ProgramInfoComponent implements OnInit {
  @ViewChild('stepper') stepper: MatStepper;
  stepperData = new BehaviorSubject(null);
  addNewProgramFlag: boolean;
  allPrograms: any;
  constructor(public dialogRef: MatDialogRef<ProgramInfoComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {
    this.addNewProgramFlag = data.addNewProgramFlag;
    this.allPrograms = data.allPrograms;
  }

  ngOnInit(): void {
    if (this.data.classroomDetails) {
      if (this.stepperData.value && this.stepperData.value !== null) {
        console.error('programme info already exists', this.stepperData.value);
      } else {
        this.stepperData.next(this.data);
      };
    }
  }

  close() {
    this.dialogRef.close();
  }

}
