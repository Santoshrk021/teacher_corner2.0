import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { take } from 'rxjs';
@Component({
  selector: 'app-upload-assignments',
  templateUrl: './upload-assignments.component.html',
  styleUrls: ['./upload-assignments.component.scss']
})
export class UploadAssignmentsComponent implements OnInit {
  @Input() inputData: any;
  @Input() contentInfo: any;
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
    const assId = this.contentInfo.assignmentId;
    console.log(this.contentInfo);
    this.assignmentsService.getWithId(assId).pipe(take(1)).subscribe((res) => {
      res.assignments.map(data => data['dueDate'] = this.contentInfo['assignmentDueDate']);
      this.assignments = res;
    });
  }
}
