import { Component, OnInit } from '@angular/core';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { ProgrammeTemplate, ProgrammeTemplateMaster } from 'app/core/dbOperations/programmeTemplate/programme-template.type';
import { UiService } from 'app/shared/ui.service';
import { first, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-manage-trash-programme-templates',
  templateUrl: './manage-trash-programme-templates.component.html',
  styleUrls: ['./manage-trash-programme-templates.component.scss']
})
export class ManageTrashProgrammeTemplatesComponent implements OnInit {

  deletedProgrammeTemplates: Array<any> = [];
  selectedProgrammeTemplate: ProgrammeTemplate;
  learningUnitsObj = {};
  assignmentsObj = {};
  allLUData: Array<any>;

  constructor(
    private drawerService: FuseDrawerService,
    private programmeTemplateService: ProgrammeTemplateService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private masterService: MasterService,
    private assignmentsService: AssignmentsService,
  ) { }

  ngOnInit(): void {
    this.getAllProgrammeTemplates();
    this.getMasterLu();
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashProgrammesSubject.next(false);
  }

  getMasterLu() {
    this.masterService.getAllMasterDocsMapAsArray('LEARNINGUNIT', 'tacNames').pipe(first()).subscribe((res) => {
      this.allLUData = res;
    });
  }

  getAllProgrammeTemplates() {
    this.programmeTemplateService.trashCollection().subscribe((res) => {
      this.deletedProgrammeTemplates = res;
    });
  }

  async restoreTemplate(template: ProgrammeTemplate) {
    const masterDocId = await this.addProgrammeTemplateToMaster(template);
    template.masterDocId = masterDocId;
    await this.programmeTemplateService.addNewProgrammeTemplate(template, template.docId);
    await this.programmeTemplateService.deleteInTrash(template.docId);
    this.uiService.alertMessage('Successful', 'Programme Template Restored Successfully', 'success');
  }

  async addProgrammeTemplateToMaster(programmeTemplate: ProgrammeTemplate) {
    const masterTemplateData: ProgrammeTemplateMaster = {
      board: programmeTemplate?.board,
      createdAt: programmeTemplate?.createdAt,
      displayName: programmeTemplate?.displayName,
      docId: programmeTemplate?.docId,
      grade: programmeTemplate?.grade,
      learningUnitsIds: programmeTemplate?.learningUnitsIds,
      subject: programmeTemplate?.subject,
      templateCategory: programmeTemplate?.templateCategory,
      templateDescription: programmeTemplate?.templateDescription,
      templateId: programmeTemplate?.templateId,
      templateImagePath: programmeTemplate?.templateImagePath,
      templateName: programmeTemplate?.templateName,
      templateStatus: programmeTemplate?.templateStatus,
      type: programmeTemplate?.type,
      updatedAt: programmeTemplate?.updatedAt,
    };
    const masterDocId = await this.masterService.addNewObjectToMasterArray('PROGRAMME_TEMPLATE', 'programmeTemplates', masterTemplateData);
    return masterDocId;
  }

  deleteTemplate(docId) {
    const config = {
      title: 'Delete Programme',
      message: 'Are you sure you want to delete permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        await this.programmeTemplateService.deleteInTrash(docId).then(() => {
          this.uiService.alertMessage('Successful', 'Programme Template Deleted Permanently', 'success');
        });
      }
    });
  }

  toggleDetails(template: ProgrammeTemplate) {
    const id = template.docId;
    if (this.selectedProgrammeTemplate?.docId === id) {
      this.selectedProgrammeTemplate = null;
    }
    else {
      this.selectedProgrammeTemplate = template;

      if (!this.learningUnitsObj.hasOwnProperty(template?.templateId)) {
        this.learningUnitsObj[template?.templateId] = [];

        if (template?.learningUnitsIds?.length) {
          template?.learningUnitsIds.forEach((luId) => {
            const luDoc = this.allLUData.find(doc => doc.docId === luId);
            this.learningUnitsObj[template?.templateId].push(luDoc);
          });
        };
      };

      if (this.learningUnitsObj.hasOwnProperty(template?.templateId)) {
        const componentArrLength = this.learningUnitsObj[template?.templateId].length;
        const dynamicArrLength = template.learningUnitsIds;
        if (componentArrLength !== dynamicArrLength) {
          this.learningUnitsObj[template?.templateId] = [];

          template?.learningUnitsIds.forEach((luId) => {
            const luDoc = this.allLUData.find(doc => doc.docId == luId);
            this.learningUnitsObj[template?.templateId].push(luDoc);
          });
        }
      }

      if (!Object.keys(template?.assignmentIds).some(assignmentId => this.assignmentsObj.hasOwnProperty(assignmentId))) {
        this.assignmentsObj[template?.templateId] = [];

        if (Object.keys(template?.assignmentIds).length > 0) {
          Object.keys(template?.assignmentIds).forEach(async (aId) => {
            const doc = await lastValueFrom(this.assignmentsService.getWithId(aId));
            this.assignmentsObj[template?.templateId].push(doc);
          });
        };
      };

      if (Object.keys(template?.assignmentIds).some(assignmentId => this.assignmentsObj.hasOwnProperty(assignmentId))) {
        const componentArrLength = this.assignmentsObj[template?.templateId].length;
        const dynamicArrLength = Object.keys(template.assignmentIds).length;
        if (componentArrLength !== dynamicArrLength) {
          this.assignmentsObj[template?.templateId] = [];
          Object.keys(template?.assignmentIds)?.forEach(async (aId) => {
            const doc = await lastValueFrom(this.assignmentsService.getWithId(aId));
            this.assignmentsObj[template?.templateId].push(doc);
          });
        };
      };
    };
  }

  emptyTrash() {
    const config = {
      title: 'Empty Trash',
      message: 'Are you sure you want to delete All the Programme Templates permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        const originalLength = this.deletedProgrammeTemplates.length;
        for (let i = 0; i < this.deletedProgrammeTemplates.length; i++) {
          try {
            await this.programmeTemplateService.deleteInTrash(this.deletedProgrammeTemplates[i].docId);
            this.uiService.alertMessage('Deleted', `Deleted Programme Template ${i + 1} of ${originalLength} Successfully`, 'success');
          } catch (error) {
            this.uiService.alertMessage('Error', `Error Deleting Programme Template ${i + 1} of ${originalLength}`, 'error');
            console.error(`Error deleting classroom ${this.deletedProgrammeTemplates[i].docId}: `, error);
          }
        }

        this.uiService.alertMessage('Deleted', 'All Programme Templates Deleted Successfully', 'success');
      }
    });
  }

}
