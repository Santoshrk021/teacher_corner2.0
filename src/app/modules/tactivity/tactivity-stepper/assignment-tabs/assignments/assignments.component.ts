import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';

@Component({
  selector: 'app-assignments',
  templateUrl: './assignments.component.html',
  styleUrls: ['./assignments.component.scss'],
  providers: [
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false },
    },
  ],
})
export class AssignmentsComponent implements OnInit {
  @Input() inputData: any;
  assignments;
  constructor(
    private _formBuilder: FormBuilder,
    private assignmentsService: AssignmentsService) { }

  ngOnInit(): void {
    this.getAssignments();

  }
  firstFormGroup: FormGroup = this._formBuilder.group({ firstCtrl: [''] });
  secondFormGroup: FormGroup = this._formBuilder.group({ secondCtrl: [''] });

  getAssignments() {
    const tacCode = this.inputData?.tacCode||'';
    const tacVersion = this.inputData?.tacVersion||'';
    this.assignmentsService.getAssignments(tacCode, tacVersion).subscribe((res) => {
       this.assignments=res[0];
    });
  }
}
