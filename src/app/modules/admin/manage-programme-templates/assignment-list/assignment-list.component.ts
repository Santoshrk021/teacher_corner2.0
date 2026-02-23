import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, lastValueFrom, Subscription } from 'rxjs';
import { AssignmentDetailsComponent } from '../assignment-details/assignment-details.component';

@Component({
  selector: 'app-assignment-list',
  templateUrl: './assignment-list.component.html',
  styleUrls: ['./assignment-list.component.scss']
})
export class AssignmentListComponent implements OnInit {
  @Input() stepperData: BehaviorSubject<any>;
  @Input() stepper: MatStepper;
  @Input() addNewTemplateFlag: string;
  @Input() templateDetails: any;

  templateInfo: any;
  assignmentListForm: FormGroup;
  filteredAssignments: any;
  assignments: any;
  previousAssignments: any;
  selectedAssignments: any = [];
  assignmentCopy: any;
  filterOptions: any[] = ['ALL', 'UPLOAD', 'QUIZ', 'GAME', 'FORM', 'TEXTBLOCK'];
  subcriptionsRefArr: Subscription[] = [];
  assignment: any = {};
  isDataLoaded: boolean = false;

  constructor(
    public programmeTemplateService: ProgrammeTemplateService,
    private assignmentService: AssignmentsService,
    private uiService: UiService,
    private fb: FormBuilder,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
    const subRef = this.assignmentService.getAllLiveAssignments().subscribe((d) => {
      this.getAssignments(d);
    });

    this.subcriptionsRefArr.push(subRef);
    this.assignmentListForm = this.fb.group({
      selectedAssignments: [[]],
    });

    this.stepperData?.subscribe((data) => {
      this.templateInfoData(data);
    });

    this.isDataLoaded = true;
  }

  getAssignments(data) {
    this.assignments = data;
    this.assignmentCopy = data;
    if (this.templateDetails !== undefined && this.templateDetails?.assignmentIds !== undefined) {
      if (Object.keys(this.templateDetails?.assignmentIds)?.length > 0) {
        this.previousAssignments = this.assignments?.filter(data => Object.keys(this.templateDetails?.assignmentIds)?.includes(data.docId));

        this.assignments = this.assignments.filter(data => !Object.keys(this.templateDetails?.assignmentIds)?.includes(data.docId));
      };
    };

    if (this.addNewTemplateFlag) {
      this.previousAssignments = [];
    };

    if (typeof (this.previousAssignments) !== 'undefined') {
      this.selectedAssignments = this.previousAssignments;
    }
    else {
      this.selectedAssignments = [];
    };

    this.assignmentListForm.patchValue({
      selectedAssignments: this.selectedAssignments,
    });
  }

  templateInfoData(data) {
    this.templateInfo = data;
  };

  async drop(event: CdkDragDrop<string[]>) {
    setTimeout(async () => {
      // if assignment is added from assignment list (left -> right)
      if (parseInt(event?.container?.id?.slice(-1)) - 1 === parseInt(event?.previousContainer?.id?.slice(-1))) {
        const title = 'Set a due date for this Assignment';
        const assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, event?.container?.data[event?.currentIndex]);
        if (assignmentDetails && Object.keys(assignmentDetails).length > 0) {
          const assignmentId = assignmentDetails.assignmentId;
          if (!this.addNewTemplateFlag) {
            this.templateDetails.assignmentIds[assignmentId] = assignmentDetails;
          } else {
            this.assignment[assignmentId] = assignmentDetails;
          };
        };
      };
    }, 0);

    // if assignment is removed (left <- right)
    if (parseInt(event?.container?.id?.slice(-1)) + 1 === parseInt(event?.previousContainer?.id?.slice(-1))) {
      const assignmentToDelete = event.previousContainer.data[event.previousIndex]['docId'];
      if (this.templateDetails && this.templateDetails.hasOwnProperty('assignmentIds') && this.templateDetails.assignmentIds.hasOwnProperty(assignmentToDelete)) {
        delete this.templateDetails.assignmentIds[assignmentToDelete];
      } else {
        delete this.assignment[assignmentToDelete];
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
      this.assignmentListForm.setValue({
        selectedAssignments: this.selectedAssignments,
      });
    };
  }

  async editAssignmentDueDate(assignment: any) {
    const title = 'Edit the due date for this Assignment';
    let assignmentDetails: any;
    if (this.addNewTemplateFlag) {
      assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, { ...assignment, ...this.assignment[assignment.docId][assignment.docId] });
    } else {
      assignmentDetails = await this.openDialogAndGetDetailsOnClose(title, assignment);
    };

    if (assignmentDetails && Object.keys(assignmentDetails).length > 0) {
      const assignmentId = assignmentDetails.assignmentId;
      if (!this.addNewTemplateFlag) {
        this.templateDetails.assignmentIds[assignmentId] = assignmentDetails;
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
          templateData: this.templateDetails
        }
      });

      return await lastValueFrom(dialogRef.afterClosed());
    };
  }

  onSubmit() {
    if (this.addNewTemplateFlag) {
      this.stepperData.next({
        ...this.stepperData?.value,
        selectedLearninglist: this.templateInfo.selectedLearninglist,
        selectedAssignments: this.assignmentListForm.get('selectedAssignments').value,
        assignmentIds: this.assignment,
      });
    }
    else {
      this.programmeTemplateService.updateProgrammeTemplateWithoutMerge(this.templateDetails).then(() => {
        this.uiService.alertMessage('Successful', 'Assignments List Updated Successfully', 'success');
      }).catch((err) => {
        this.uiService.alertMessage('Error', err, 'error');
      });
    };
  }

  filterAssignment(ev: any) {
    const val = ev.target.value;
    if (val && val.trim() != '') {
      this.filteredAssignments = this.assignmentCopy.filter(item => ((item.displayName.toLowerCase().includes(val.toLowerCase()))));
      this.assignments = this.filteredAssignments;
    }
    else {
      this.assignments = this.assignmentCopy;
    };
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
