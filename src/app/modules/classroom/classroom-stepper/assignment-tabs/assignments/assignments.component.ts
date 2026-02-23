import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { environment } from 'environments/environment';
import { take } from 'rxjs';

@Component({
    selector: 'app-assignments',
    templateUrl: './assignments.component.html',
    styleUrls: ['./assignments.component.scss'],
    providers: [
        {
            provide: STEPPER_GLOBAL_OPTIONS,
            useValue: { displayDefaultIndicatorType: false },
        },
    ],
})
export class AssignmentsComponent implements OnInit ,OnChanges {
    @Input() inputData: any;
    @Input() contentInfo: any;
    @Input() contentIndex: any;
    @Input() currentWorkflow: any;
    @Input() assignmentId: any;
    @Input() assignmentIdwithtabchange: any;

    currentIndexMatStepper: number = 0;
    selectedsubm;
    @Input() currentData: any;

    @Input() workflowId: any;
    assignments;
    currentAssignments;
    isAssignmentUi = true;
    environment = environment;
    @ViewChild('stepper') stepper!: MatStepper; // Reference to the mat-stepper
    currentIndex: number = 0; // Track the current step index

    constructor(
        private _formBuilder: FormBuilder,
        private assignmentsService: AssignmentsService
    ) {}
    ngOnChanges(changes: SimpleChanges): void {
        if(changes.assignmentIdwithtabchange){
            // console.log(this.currentData)
            this.currentAssignments=this.currentData?.[this.assignmentIdwithtabchange] && this.assignmentIdwithtabchange!==''?this.currentData ?.[this.assignmentIdwithtabchange]:'';
            // console.log(this.assignmentIdwithtabchange)
            // console.log(this.currentAssignments);

        }
    }

    ngOnInit(): void {
        // this.currentAssignments=this.currentData[this.assignmentIdwithtabchange]?this.currentData[this.assignmentIdwithtabchange]:'';
        this.currentAssignments=this.currentData?.[this.assignmentIdwithtabchange]?this.currentData && this.assignmentIdwithtabchange!==''?.[this.assignmentIdwithtabchange]:'';

// console.log(this.currentAssignments)

        this.getAssignments();
    }

    firstFormGroup: FormGroup = this._formBuilder.group({ firstCtrl: [''] });
    secondFormGroup: FormGroup = this._formBuilder.group({ secondCtrl: [''] });

    getAssignments() {
        const assId = this.contentInfo.assignmentId;
        this.assignmentsService
            .getWithId(assId)
            .pipe(take(1))
            .subscribe((res) => {
                if (!res) {
                    this.isAssignmentUi = false;
                    return;
                }
                res.assignments.map(
                    data =>
                        (data['dueDate'] =
                            this.contentInfo['assignmentDueDate'])
                );

                this.assignments = res;
            });
    }

    changestepperStep(data) {
        // console.log(data);
        const stepperlength = 3;
        if (data == 'decrease') {
            this.stepper.previous();
        } else {
            this.stepper.next();
        }
    }

    goToPreviousStep() {
        this.stepper.previous();
    }

    goToNextStep() {
        this.stepper.next();
    }
    getsubmissiondata(index) {
        const url = '';
        // console.log(index)

        return url;
    }
    onStepChange(event) {
        this.currentIndexMatStepper = event.selectedIndex;
        const index=event.selectedIndex+1;
        this.selectedsubm=this.currentData['submissionId_'+index];

       // this.currentIndex = event.selectedIndex;
    }
}
