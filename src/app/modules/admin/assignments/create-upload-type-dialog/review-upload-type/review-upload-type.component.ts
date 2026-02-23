import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { UiService } from 'app/shared/ui.service';
import { CreateUploadTypeDialogComponent } from '../create-upload-type-dialog.component';

@Component({
  selector: 'app-review-upload-type',
  templateUrl: './review-upload-type.component.html',
  styleUrls: ['./review-upload-type.component.scss']
})
export class ReviewUploadTypeComponent implements OnInit {
  @Input() assignmentInfo;
  @Input() qusInfo;
  @Input() basicInfo;

  btnDisable: boolean = false;

  constructor(
    private assignmentsService: AssignmentsService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<CreateUploadTypeDialogComponent>,
  ) { }

  ngOnInit(): void {
  }

  onSave(docId?) {
    this.btnDisable = true;
    let obj = {};
    let id = this.assignmentsService.getRandomGeneratedId();

    if (docId) {
      id = docId;
    }

    obj = { ...this.basicInfo, type: 'UPLOAD', docId: id, assignments: this.qusInfo.assignments };

    this.assignmentsService.update(obj, id).then(() => {
      this.dialogRef.close();
      if (this.assignmentInfo?.assignments) {
        this.uiService.alertMessage('Successful', 'Assignment Updated Successfully', 'success');
        return;
      }
      this.uiService.alertMessage('Successful', 'Assignment Created Successfully', 'success');
    }).catch((err) => {
      this.btnDisable = false;
      this.uiService.alertMessage('Error', `${err}`, 'error');
    });
  }

}
