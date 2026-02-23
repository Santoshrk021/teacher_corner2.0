import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { UiService } from 'app/shared/ui.service';
import { CreateTextblockTypeDialogComponent } from '../create-textblock-type-dialog.component';

@Component({
  selector: 'app-review-textblock-type',
  templateUrl: './review-textblock-type.component.html',
  styleUrls: ['./review-textblock-type.component.scss']
})
export class ReviewTextblockTypeComponent implements OnInit {
  @Input() assignmentInfo;
  @Input() qusInfo;
  @Input() basicInfo;

  btnDisable: boolean = false;

  constructor(
    private assignmentsService: AssignmentsService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<CreateTextblockTypeDialogComponent>,
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

    // obj = { ...this.basicInfo, type: 'TEXTBLOCK', docId: id, instructions: this.qusInfo?.instructions, questions: this.qusInfo?.questions };
    obj = { ...this.basicInfo, type: 'TEXTBLOCK', docId: id, instructions: this.qusInfo?.instructions };

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
