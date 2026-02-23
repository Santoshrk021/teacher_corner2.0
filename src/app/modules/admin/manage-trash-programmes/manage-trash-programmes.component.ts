import { Component, OnInit } from '@angular/core';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-manage-trash-programmes',
  templateUrl: './manage-trash-programmes.component.html',
  styleUrls: ['./manage-trash-programmes.component.scss']
})
export class ManageTrashProgrammesComponent implements OnInit {
  deletedProgrammes: any;
  selectedProgramme: any;
  learningUnitsObj = {};
  assignmentsObj = {};
  allLUData: any[];

  constructor(
    private drawerService: FuseDrawerService,
    private programmeService: ProgrammeService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private masterService: MasterService,
    private assignmentsService: AssignmentsService
  ) { }

  ngOnInit(): void {
    this.getAllProgrammes();
    this.getMasterLu();
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashProgrammesSubject.next(false);
  }

  async getMasterLu() {
    this.masterService.getAllMasterDocsMapAsArray('LEARNINGUNIT', 'tacNames').subscribe((res) => {
      this.allLUData = res;
    });
  }

  getAllProgrammes() {
    this.programmeService.trashCollection().subscribe((res) => {
      this.deletedProgrammes = res.sort((a, b) => b?.trashAt?.seconds - a?.trashAt?.seconds);
    });
  }

  async restoreInstitute(programme) {
    await this.programmeService.addNewProgram(programme, programme.programmeId);
    await this.masterService.addNewObjectToMasterMap('PROGRAMME', 'programmes', programme);
    await this.programmeService.deleteInTrash(programme.programmeId);
    this.uiService.alertMessage('Successful', 'Institute Restored Successfully', 'success');
  }

  deleteInstitute(programmeId) {
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
        try {
          await this.programmeService.deleteInTrash(programmeId);
          this.uiService.alertMessage('Successful', 'Programme Deleted Permanently', 'success');
        } catch (error) {
          this.uiService.alertMessage('Successful', 'Error Deleting Programme', 'error');
          console.error('Error deleting programme:', error);
        };
      };
    });
  }

  toggleDetails(programme) {
    const id = programme.programmeId;
    if (this.selectedProgramme?.programmeId === id) {
      // this.selectedProgramme = ''
      this.selectedProgramme = null;
    }
    else {
      this.selectedProgramme = programme;

      if (!this.learningUnitsObj.hasOwnProperty(programme?.programmeId)) {
        this.learningUnitsObj[programme?.programmeId] = [];

        if (programme?.learningUnitsIds?.length) {
          programme?.learningUnitsIds.forEach((luId) => {
            const luDoc = this.allLUData.find(doc => doc.docId === luId);
            this.learningUnitsObj[programme?.programmeId].push(luDoc);
          });
        };
      };

      if (this.learningUnitsObj.hasOwnProperty(programme?.programmeId)) {
        const componentArrLength = this.learningUnitsObj[programme?.programmeId].length;
        const dynamicArrLength = programme.learningUnitsIds;
        if (componentArrLength !== dynamicArrLength) {
          this.learningUnitsObj[programme?.programmeId] = [];

          programme?.learningUnitsIds.forEach((luId) => {
            const luDoc = this.allLUData.find(doc => doc.docId == luId);
            this.learningUnitsObj[programme?.programmeId].push(luDoc);
          });
        }
      }

      if (!Object.keys(programme?.assignmentIds).some(assignmentId => this.assignmentsObj.hasOwnProperty(assignmentId))) {
        this.assignmentsObj[programme?.programmeId] = [];

        if (Object.keys(programme?.assignmentIds).length > 0) {
          Object.keys(programme?.assignmentIds).forEach(async (aId) => {
            const doc = await lastValueFrom(this.assignmentsService.getWithId(aId));
            this.assignmentsObj[programme?.programmeId].push(doc);
          });
        };
      };

      if (Object.keys(programme?.assignmentIds).some(assignmentId => this.assignmentsObj.hasOwnProperty(assignmentId))) {
        const componentArrLength = this.assignmentsObj[programme?.programmeId].length;
        const dynamicArrLength = Object.keys(programme.assignmentIds).length;
        if (componentArrLength !== dynamicArrLength) {
          this.assignmentsObj[programme?.programmeId] = [];
          Object.keys(programme?.assignmentIds)?.forEach(async (aId) => {
            const doc = await lastValueFrom(this.assignmentsService.getWithId(aId));
            this.assignmentsObj[programme?.programmeId].push(doc);
          });
        };
      };
    };
  }

  emptyTrash() {
    const config = {
      title: 'Empty Trash',
      message: 'Are you sure you want to delete All the Programmes permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        const originalLength = this.deletedProgrammes.length;
        for (let i = 0; i < this.deletedProgrammes.length; i++) {
          try {
            await this.programmeService.deleteInTrash(this.deletedProgrammes[i].docId);
            this.uiService.alertMessage('Deleted', `Deleted Programme ${i + 1} of ${originalLength} Successfully`, 'success');
          } catch (error) {
            this.uiService.alertMessage('Error', `Error Deleting Programme ${i + 1} of ${originalLength}`, 'error');
            console.error(`Error deleting classroom ${this.deletedProgrammes[i].docId}: `, error);
          }
        }

        this.uiService.alertMessage('Deleted', 'All Programmes Deleted Successfully', 'success');
      }
    });
  }

}
