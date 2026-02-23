import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UiService } from 'app/shared/ui.service';
import { Subscription, lastValueFrom } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentDetailsComponent } from '../assignment-details/assignment-details.component';
import { MasterService } from 'app/core/dbOperations/master/master.service';

export interface assignments {
  allowExitAndReEntry: boolean;
  authenticationType: string;
  author: string;
  creator: string;
  displayCorrectAnswers: boolean;
  displayName: string;
  docId: string;
  duration: string;
  numberOfAllowedSubmissions: string;
}

@Component({
  selector: 'app-assignment-list',
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.scss']
})

export class AssignmentListComponent implements OnInit {
  @Input() stepperData: BehaviorSubject<any>;
  @Input() stepper: MatStepper;
  @Input() addNewProgramFlag: string;
  @Input() programDetails: any; //storing the selected program

  programInfo: any; //gettting the stepperdata in this component
  assignmentListForm: FormGroup;
  filteredAssignments: any;
  assignments: any; //getting all  the assignments
  previousAssignments: any;
  selectedAssignments: any = []; //handling the selecetd assignments
  assignmentCopy: any; //maintaining the duplicate assignment copy to handle the search function
  filterOptions: any[] = ['ALL', 'UPLOAD', 'QUIZ', 'GAME', 'FORM', 'TEXTBLOCK'];
  subcriptionsRefArr: Subscription[] = [];
  assignment: any = {};
  loading: boolean = false;
  deletedAssignments: any = {};
  isDataLoaded: boolean = false;

  constructor(
    private assignmentService: AssignmentsService,
    private programmeService: ProgrammeService, private uiService: UiService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private masterService: MasterService
  ) { }

  async ngOnInit() {
    this.assignmentListForm = this.fb.group({
      selectedAssignments: [[]],
    });

    const allLiveAssignments = await lastValueFrom(this.assignmentService.getAllLiveAssignments());
    if (!allLiveAssignments || !allLiveAssignments?.length) {
      console.error('No live assignments found');
    } else {
      this.getAssignments(allLiveAssignments);
    };

    this.isDataLoaded = true;

    this.stepperData?.subscribe((data) => {
      this.programInfo = data;
    });

  }

  getAssignments(data: any) {
    this.assignments = data;
    this.assignmentCopy = data;
    if (this.programDetails !== undefined && this.programDetails?.assignmentIds !== undefined) {
      if (Object.keys(this.programDetails?.assignmentIds)?.length > 0) {
        this.previousAssignments = this.assignments?.filter(data => Object.keys(this.programDetails?.assignmentIds)?.includes(data.docId));

        this.assignments = this.assignments.filter(data => !Object.keys(this.programDetails?.assignmentIds)?.includes(data.docId));
      };
    };

    if (this.addNewProgramFlag) {
      this.previousAssignments = [];
    };

    if (typeof (this.previousAssignments) !== 'undefined') {
      this.selectedAssignments = this.previousAssignments;
    }
    else {
      this.selectedAssignments = [];
    };

    this.assignmentListForm?.patchValue({
      selectedAssignments: this.selectedAssignments,
    });
  }

  async drop(event: CdkDragDrop<string[]>) {
    setTimeout(async () => {
      // if assignment is added from assignment list (left -> right)
      if (parseInt(event?.container?.id?.slice(-1)) - 1 === parseInt(event?.previousContainer?.id?.slice(-1))) {
        const title = 'Set a due date for this Assignment';
        const assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, event?.container?.data[event?.currentIndex]);
        if (assignmentDetails && Object.keys(assignmentDetails).length > 0) {
          const assignmentId = assignmentDetails.assignmentId;
          if (!this.addNewProgramFlag) {
            this.programDetails.assignmentIds[assignmentId] = assignmentDetails;
          } else {
            this.assignment[assignmentId] = assignmentDetails;
          };
        };
      };
    }, 0);

    // if assignment is removed (left <- right)
    if (parseInt(event?.container?.id?.slice(-1)) + 1 === parseInt(event?.previousContainer?.id?.slice(-1))) {
      const assignmentToDelete = event.previousContainer.data[event.previousIndex]['docId'];
      if (this.programDetails && this.programDetails.hasOwnProperty('assignmentIds') && this.programDetails.assignmentIds.hasOwnProperty(assignmentToDelete)) {
        delete this.programDetails.assignmentIds[assignmentToDelete];
        this.deletedAssignments[assignmentToDelete] = {};
      } else {
        delete this.assignment[assignmentToDelete];
        this.deletedAssignments[assignmentToDelete] = {};
      };
    };

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer?.data,
        event?.container.data,
        event?.previousIndex,
        event?.currentIndex
      );
      this.assignmentListForm?.setValue({
        selectedAssignments: this.selectedAssignments,
      });
    };
  }

  async editAssignmentDueDate(assignment: any) {
    const title = 'Edit the due date for this Assignment';
    let assignmentDetails: any;
    if (this.addNewProgramFlag) {
      assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, { ...assignment, ...this.assignment[assignment.docId][assignment.docId] });
    } else {
      assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, assignment);
    };
    if (assignmentDetails && Object.keys(assignmentDetails).length > 0) {
      const assignmentId = assignmentDetails.assignmentId;
      if (!this.addNewProgramFlag) {
        this.programDetails.assignmentIds[assignmentId] = assignmentDetails;
      } else {
        this.assignment[assignmentId] = assignmentDetails;
      };
    };
  }

  async openDialogAndGetDetailsOnClose(title: string, assignmentData: any) {
    const importDialogModule = await import('../assignment-details/assignment-details.module');
    if (Object.keys(importDialogModule).includes('AssignmentDetailsModule')) {
      const dialogRef = this.dialog.open(AssignmentDetailsComponent, {
        data: {
          title: title,
          assignmentData,
          programmeData: this.programDetails
        }
      });

      return await lastValueFrom(dialogRef.afterClosed());
    };
  }

  async onSubmit() {
    this.loading = true;
    if (this.addNewProgramFlag) {
      this.stepperData.next({
        ...this.stepperData?.value,
        selectedLearninglist: this.programInfo.selectedLearninglist,
        selectedAssignments: this.assignmentListForm.get('selectedAssignments').value,
        assignmentIds: this.assignment,
      });
    }
    else {
      const { assignmentIds, docId: programmeId, masterDocId } = this.programDetails;

      const assignmentsToUpdate = {
        ...assignmentIds,
        ...this.deletedAssignments,
      };

      try {
        await Promise.all(Object.entries(assignmentsToUpdate).map(async ([assignmentId, assignmentDetails]) => {
          if (assignmentDetails && Object.values(assignmentDetails).length > 0) {
            this.masterService.updateMasterDocField(masterDocId, programmeId, 'programmes', `assignmentIds.${assignmentId}`, assignmentDetails);
            this.programmeService.updateProgrammeSingleField(programmeId, `assignmentIds.${assignmentId}`, assignmentDetails);
          } else {
            this.masterService.deleteObjectFromMasterMap(masterDocId, `programmes.${programmeId}.assignmentIds`, assignmentId);
            this.programmeService.deleteProgrammeSingleField(programmeId, `assignmentIds.${assignmentId}`);
          };
        }));
        this.uiService.alertMessage('Successful', 'Assignments List Updated Successfully', 'success');
      } catch (error) {
        this.uiService.alertMessage('Error', 'Error Updating Assignments List', 'error');
        console.error('Error Updating Assignments List', error);
      } finally {
        this.loading = false;
      }

      /*
      // old code
      try {
        await Promise.all([
          this.programmeService.updateProgrammeWithoutMerge(this.programDetails),
          this.masterService.updateMasterDoc('programmes', this.programDetails.programmeId, this.programDetails),
        ]);
        this.uiService.alertMessage('Successful', 'Assignments List Updated Successfully', 'success');
      } catch (error) {
        this.uiService.alertMessage('Error', 'Error Updating Assignments List', 'error');
        console.error('Error Updating Assignments List', error);
      } finally {
        this.loading = false;
      };
      */
    }
  }

  filterAssignment(ev: any) {
    const val = ev.target.value;
    if (val && val.trim() != '') {
      this.filteredAssignments = this.assignmentCopy.filter(item => ((item.displayName.toLowerCase().includes(val.toLowerCase()))));
      this.assignments = this.filteredAssignments;
    }
    else {
      this.assignments = this.assignmentCopy;
    }
  }

  ngOnDestroy(): void {
    if (this.subcriptionsRefArr.length) {this.subcriptionsRefArr.map(d => d.unsubscribe());}
  }

  assignmentChange(event: any) {
    if (event.value === 'ALL') {
      this.assignments = this.assignmentCopy;
    } else {
      this.assignments = this.assignmentCopy.filter(data => data.type === event.value);
    };
  }

}
