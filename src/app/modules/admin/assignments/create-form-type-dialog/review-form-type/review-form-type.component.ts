import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { UiService } from 'app/shared/ui.service';
import { CreateFormTypeDialogComponent } from '../create-form-type-dialog.component';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-review-form-type',
  templateUrl: './review-form-type.component.html',
  styleUrls: ['./review-form-type.component.scss']
})
export class ReviewFormTypeComponent implements OnInit {
  @Input() assignmentInfo;
  @Input() qusInfo;
  @Input() basicInfo;

  btnDisable: boolean = false;
  questionTypes: any = {};

  constructor(
    private assignmentsService: AssignmentsService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<CreateFormTypeDialogComponent>,
    private configurationService: ConfigurationService,
  ) { }

  async ngOnInit(): Promise<void> {
    const questionTypesConfig = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('AssignmentTypes'));
    this.questionTypes = questionTypesConfig.get('questionTypesForm')
      .reduce((acc, curr) => {
        acc[curr.key] = curr.display;
        return acc;
      }, {});
  }

  onSave(docId?) {
    this.btnDisable = true;
    let obj = {};
    let id = this.assignmentsService.getRandomGeneratedId();

    if (docId) {
      id = docId;
    }

    obj = { ...this.basicInfo, type: 'FORM', docId: id, instructions: this.qusInfo?.instructions, questions: this.qusInfo?.questions };

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
