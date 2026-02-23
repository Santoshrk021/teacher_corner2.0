import { Component, OnInit } from '@angular/core';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UiService } from 'app/shared/ui.service';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';

@Component({
  selector: 'app-manage-assignments-trash',
  templateUrl: './manage-assignments-trash.component.html',
  styleUrls: ['./manage-assignments-trash.component.scss']
})
export class ManageAssignmentsTrashComponent implements OnInit {
    deletedAssignments=[];
  constructor(
    private drawerService: FuseDrawerService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private assignmentService: AssignmentsService,
  ) { }

  ngOnInit(): void {
    this.getDeletedAssignments();

  }

  getDeletedAssignments() {
    this.assignmentService.trashCollection().subscribe((res) => {
       this.deletedAssignments = res;

     });
   }

  restoreassignment(assignment){
    this.assignmentService.update(assignment,assignment.docId).then(()=>{
        this.assignmentService.deleteInTrash(assignment.docId).then(()=>{
          this.uiService.alertMessage('Successful', 'Assignment Restored Successfully', 'success');
        });
      });
  }

  deletassignment(doc){
    const config = {
        title: 'Delete Assignment',
        message: 'Are you sure you want to delete permanently ?',
        icon: {
          name: 'mat_outline:delete'
        }
      };
      const dialogRef = this.fuseConfirmationService.open(config);
      dialogRef.afterClosed().subscribe((result) => {
        if (result == 'confirmed') {
          this.assignmentService.deleteInTrash(doc?.docId).then(() => {
            // this.updateInstitutesOnDelete(doc.docId)
            this.uiService.alertMessage('Successful', 'Assignment Deleted Permanently', 'success');
          });
        }
      });
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashAssignmentSubject.next(false);
  }


  emptyTrash() {
    const config = {
      title: 'Empty Trash',
      message: 'Are you sure you want to delete All the Assignments permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        this.deletedAssignments.forEach((i) => {
          this.assignmentService.deleteInTrash(i.docId);
        });

        this.uiService.alertMessage('Deleted', 'All Assignments Deleted Successfully', 'success');
      }
    });
  }

}
