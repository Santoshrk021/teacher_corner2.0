import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { BehaviorSubject, take } from 'rxjs';
import { ProgrammeTemplateInfoComponent } from '../programme-template-info/programme-template-info.component';
import { UiService } from 'app/shared/ui.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { ProgrammeTemplate, ProgrammeTemplateMaster } from 'app/core/dbOperations/programmeTemplate/programme-template.type';
import { MasterService } from 'app/core/dbOperations/master/master.service';

@Component({
  selector: 'app-review-programme-template',
  templateUrl: './review-programme-template.component.html',
  styleUrls: ['./review-programme-template.component.scss']
})
export class ReviewProgrammeTemplateComponent implements OnInit {
  @Input() stepperData: BehaviorSubject<any>;
  @Input() stepper: MatStepper;
  @Input() addNewProgramFlag: string;
  templateData: any;
  isLoaded: boolean = false;

  constructor(
    private programmeTemplateService: ProgrammeTemplateService,
    public dialogRef: MatDialogRef<ProgrammeTemplateInfoComponent>,
    private uiService: UiService,
    private masterService: MasterService,
  ) { }

  ngOnInit(): void {
    this.stepperData.subscribe((data) => {
      if (data) {
        this.templateData = data;
        this.isLoaded = true;
      }
    });
  }

  async templateSave() {
    const masterTemplateData: ProgrammeTemplateMaster = {
      board: this.templateData?.board,
      createdAt: this.templateData?.createdAt,
      displayName: this.templateData?.displayName,
      docId: this.templateData?.docId,
      grade: this.templateData?.grade,
      learningUnitsIds: this.templateData?.selectedLearninglist.map((lu: any) => lu.docId),
      subject: this.templateData?.subject,
      templateCategory: this.templateData?.templateCategory,
      templateDescription: this.templateData?.templateDescription,
      templateId: this.templateData?.templateId,
      templateImagePath: this.templateData?.templateImagePath ?? '',
      templateName: this.templateData?.templateName,
      templateStatus: this.templateData?.templateStatus,
      type: this.templateData?.type,
      updatedAt: this.templateData?.updatedAt,
    };

    const templateData: ProgrammeTemplate = {
      assignmentIds: this.templateData?.assignmentIds,
      board: this.templateData?.board,
      createdAt: this.templateData?.createdAt,
      displayName: this.templateData?.displayName,
      docId: this.templateData?.docId,
      grade: this.templateData?.grade,
      isLocalHost: this.templateData?.isLocalHost,
      learningUnitsIds: this.templateData?.selectedLearninglist.map((lu: any) => lu.docId),
      masterDocId: '',
      subject: this.templateData?.subject,
      templateCategory: this.templateData?.templateCategory,
      templateDescription: this.templateData?.templateDescription,
      templateId: this.templateData?.templateId,
      templateImagePath: this.templateData?.templateImagePath ?? '',
      templateName: this.templateData?.templateName,
      templateStatus: this.templateData?.templateStatus,
      type: this.templateData?.type,
      updatedAt: this.templateData?.updatedAt,
    };

    try {
      const masterDocId = await this.masterService.addNewObjectToMasterMap('PROGRAMME_TEMPLATE', 'programmeTemplates', masterTemplateData);
      templateData.masterDocId = masterDocId;
      await this.programmeTemplateService.addNewProgrammeTemplate(templateData, templateData.templateId);
      this.uiService.alertMessage('Successful', 'Programme Created Successfully', 'success');
      this.dialogRef.close(templateData);
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error Creating Programme Template', 'error');
      console.error('Error Creating Programme Template:', error);
    }
  }

}
