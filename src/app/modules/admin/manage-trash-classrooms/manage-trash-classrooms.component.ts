import { Component, OnDestroy, OnInit } from '@angular/core';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UiService } from 'app/shared/ui.service';

@Component({
  selector: 'app-manage-trash-classrooms',
  templateUrl: './manage-trash-classrooms.component.html',
  styleUrls: ['./manage-trash-classrooms.component.scss']
})
export class ManageTrashClassroomsComponent implements OnInit, OnDestroy {
  deletedClassrooms: any;
  clsRef: any;

  constructor(
    private drawerService: FuseDrawerService,
    private classroomService: ClassroomsService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private masterService: MasterService,
  ) { }

  ngOnDestroy(): void {
    this.clsRef.unsubscribe();
  }

  ngOnInit(): void {
    this.getDeletedClassrooms();
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashClsSubject.next(false);
  }

  getDeletedClassrooms() {
    this.clsRef = this.classroomService.trashCollection().subscribe((res) => {
      this.deletedClassrooms = res.sort((a: any, b: any) => {
        if (a.trashAt && b.trashAt) {
          return b.trashAt - a.trashAt;
        }
        else {
          return b.creationDate - a.creationDate;
        }
      });
    });
  }

  async restoreIcls(cls: any) {
    let masterClassroomData = {};

    if (cls.type === 'CLASSROOM') {
      masterClassroomData = {
        board: cls.board,
        classroomCode: cls.classroomCode,
        classroomId: cls.classroomId,
        classroomName: cls.classroomName,
        creationDate: cls?.creationDate || cls?.createdAt,
        docId: cls?.docId || '',
        grade: cls?.grade,
        institutionId: cls?.institutionId,
        institutionName: cls?.institutionName,
        programmes: cls?.programmes || {},
        section: cls.section,
        studentCounter: cls.studentCounter ?? 0,
        studentCredentialStoragePath: cls.studentCredentialStoragePath ?? '',
        type: cls.type,
        updatedAt: cls.updatedAt || cls?.creationDate || cls?.createdAt,
      };
    }
    else if (cls.type === 'STEM-CLUB') {
      masterClassroomData = {
        board: cls.board,
        classroomCode: cls.classroomCode,
        classroomId: cls.classroomId,
        creationDate: cls?.creationDate || cls?.createdAt,
        docId: cls?.docId || '',
        institutionId: cls?.institutionId,
        institutionName: cls?.institutionName,
        programmes: cls?.programmes || {},
        stemClubName: cls.stemClubName,
        studentCounter: cls.studentCounter ?? 0,
        studentCredentialStoragePath: cls.studentCredentialStoragePath ?? '',
        type: cls.type,
        updatedAt: cls.updatedAt || cls?.creationDate || cls?.createdAt,
      };
    }
    else {
      console.error('Type: ', cls.type);
    };
    const pr = cls.programmes;
    const keys = Object.keys(pr);

    keys.forEach((k) => {
      if (pr[k].hasOwnProperty('workflowIds')) {
        delete pr[k]['workflowIds'];
      }
    });

    try {
      await this.masterService.addNewObjectToMasterMap('CLASSROOM', 'classrooms', masterClassroomData);
      await this.classroomService.update(cls, cls.docId);
      this.classroomService.deleteInTrash(cls.docId);
      this.uiService.alertMessage('Successful', 'Classroom Restored Successfully', 'success');
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error Restoring Classroom', 'error');
      console.error('Error restoring classroom: ', error);
    }
  }

  deletecls(doc: any) {
    const config = {
      title: 'Delete Classroom',
      message: 'Are you sure you want to delete permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        try {
          // this.updateInstitutesOnDelete(doc.docId)
          await this.classroomService.deleteInTrash(doc?.docId);
          this.uiService.alertMessage('Successful', 'Classroom Deleted Permanently', 'success');
        } catch (error) {
          this.uiService.alertMessage('Error', 'Error Deleting Classroom', 'error');
          console.error('Error deleting classroom: ', error);
        }
      }
    });
  }

  emptyTrash() {
    const config = {
      title: 'Empty Trash',
      message: 'Are you sure you want to delete All the Classrooms permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        const originalLength = this.deletedClassrooms.length;
        for (let i = 0; i < this.deletedClassrooms.length; i++) {
          try {
            await this.classroomService.deleteInTrash(this.deletedClassrooms[i].docId);
            this.uiService.alertMessage('Deleted', `Deleted Classroom ${i + 1} of ${originalLength} Successfully`, 'success');
          } catch (error) {
            this.uiService.alertMessage('Error', `Error Deleting Classroom ${i + 1} of ${originalLength}`, 'error');
            console.error(`Error deleting classroom ${this.deletedClassrooms[i].docId}: `, error);
          }
        };
        this.uiService.alertMessage('Deleted', 'All Classrooms Deleted Successfully', 'success');
      }
    });
  }

}
