import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { OneClickInstitution } from 'app/core/dbOperations/institutions/institution.type';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { WorkflowTemplateService } from 'app/core/dbOperations/workflowTemplate/workflow-template.service';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { first, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-review-template',
  templateUrl: './review-template.component.html',
  styleUrls: ['./review-template.component.scss']
})
export class ReviewTemplateComponent implements OnInit {

  @Input() programmeTemplateInfo;
  @Input() instituteInfo;
  deleteLoader: boolean;

  constructor(
    private workflowTemplateService: WorkflowTemplateService,
    private programmeTemplateService: ProgrammeTemplateService,
    private sharedService: SharedService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<ReviewTemplateComponent>,
  ) { }

  ngOnInit(): void { }

  async onSave() {
    this.deleteLoader = true;

    try {
      // ✅ NEW: Ensure isCustomer always exists for newly created institutions
      // If missing -> default false
      if (this.instituteInfo?.isCustomer === undefined || this.instituteInfo?.isCustomer === null) {
        this.instituteInfo.isCustomer = false;
      }

      const defaultWorkflowTemplate = await lastValueFrom(
        this.workflowTemplateService.getWorkFlowTemplateById('9aifopMbhpR4Jr5oPHm9').pipe(first())
      );

      const programmeTemplates = [];

      for (let i = 0; i < this.programmeTemplateInfo.classInfoArray.length; i++) {
        const { grade, subject, programmeTemplate } = this.programmeTemplateInfo.classInfoArray[i];

        this.programmeTemplateInfo.classInfoArray[i].classroomCode =
          `${((parseInt(this.instituteInfo?.classroomCounter) ?? 0) + i + 1).toString().padStart(3, '0')}`;

        const finalProgrammeTemplate = await lastValueFrom(
          this.programmeTemplateService.getTemplatesFromDetails(
            grade,
            this.instituteInfo?.board,
            subject,
            programmeTemplate
          )
        );

        if (finalProgrammeTemplate.docs) {
          programmeTemplates.push(finalProgrammeTemplate.docs[0].data());
        }
      }

      this.instituteInfo.classroomCounter =
        parseInt(this.instituteInfo?.classroomCounter) + this.programmeTemplateInfo.classInfoArray.length;

      const finalObject: OneClickInstitution = {
        institution: this.instituteInfo,
        classrooms: this.programmeTemplateInfo,
        defaultWorkflowTemplate,
        programmeTemplates,
        createdSource: 'one-click-institution-classroom-programme-creation',
        operation: 'create',
        component: 'ReviewTemplateComponent'
      };

      const slackBearerToken = environment.slackNotifications.newInstitution.slackBearerToken;
      const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();

      const institutionCreatorName =
        slackUsers?.length
          ? slackUsers?.[0]?.profile?.display_name
          : teacherName?.length
            ? teacherName
            : 'unknown';

      const messageContent =
        `A new institution '${finalObject.institution.institutionName}' has been created in Firebase project ` +
        `'${environment.firebase.projectId}' by '${institutionCreatorName}'.`;

      const slackChannel = await this.sharedService.getSlackChannelDetails(
        environment.slackNotifications.newInstitution.slackChannels
      );

      const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/manage_one_click_institution`;

      const response = await this.sharedService.sendToCloudFunction(endUrl, finalObject);

      if (response?.status?.includes('Success')) {
        this.uiService.alertMessage('Successful', 'Institution set-up successfully complete', 'success');
        this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, slackChannel, messageContent);
        this.dialogRef.close();
      } else {
        this.uiService.alertMessage('Failed', 'Error setting up institution', 'error');
        console.error('Error setting up institution', response);
      }

    } catch (error) {
      this.uiService.alertMessage('Failed', 'Error setting up institution', 'error');
      console.error('Error setting up institution', error);
    } finally {
      this.deleteLoader = false;
    }
  }
}
