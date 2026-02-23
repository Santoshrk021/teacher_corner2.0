import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CreateQuizDialogComponent } from './create-quiz-dialog/create-quiz-dialog.component';
import { CreateUploadTypeDialogComponent } from './create-upload-type-dialog/create-upload-type-dialog.component';
import { ManageAssignmentsTrashComponent } from './manage-assignments-trash/manage-assignments-trash.component';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { Subject, takeUntil } from 'rxjs';
import { CreateFormTypeDialogComponent } from './create-form-type-dialog/create-form-type-dialog.component';
import { CreateTextblockTypeDialogComponent } from './create-textblock-type-dialog/create-textblock-type-dialog.component';

@Component({
  selector: 'app-assignments',
  templateUrl: './assignments.component.html',
  styleUrls: ['./assignments.component.scss']
})
export class AssignmentsComponent implements OnInit {
  component: any;
  drawerOpened: any = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  constructor(
    public dialog: MatDialog,
    private drawerService: FuseDrawerService,


  ) {
    this.drawerService.drawerOpenTrashAssignmentSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.drawerOpened = res;
      if (!res) {
        //this.search(this.searchTerm);
      }
    });
  }

  ngOnInit(): void {
  }

  async createAssignment(type) {
    switch (type) {
      case 'quiz':
        await import('./create-quiz-dialog/create-quiz-dialog.module');
        this.dialog.open(CreateQuizDialogComponent, {
          data: {
          }
        });
        break;

      case 'upload':
        await import('./create-upload-type-dialog/create-upload-type-dialog.module');
        this.dialog.open(CreateUploadTypeDialogComponent, {
          data: {
          }
        });
        break;

      case 'form':
        await import('./create-form-type-dialog/create-form-type-dialog.module');
        this.dialog.open(CreateFormTypeDialogComponent, {
          data: {
          }
        });
        break;

      case 'textblock':
        await import('./create-textblock-type-dialog/create-textblock-type-dialog.module');
        this.dialog.open(CreateTextblockTypeDialogComponent, {
          data: {
          }
        });
        break;

      default:
        break;
    }
  }

  async goToTrash() {
    await import('./manage-assignments-trash/manage-assignments-trash.module').then(() => {
      this.component = ManageAssignmentsTrashComponent;
      ///this.drawerOpened=true
      this.drawerService.drawerOpenTrashAssignmentSubject.next(true);
    });
  }

}
