import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { UiService } from 'app/shared/ui.service';

@Component({
  selector: 'app-create-textblock-type',
  templateUrl: './create-textblock-type.component.html',
  styleUrls: ['./create-textblock-type.component.scss']
})
export class CreateTextblockTypeComponent implements OnInit {
  @Output() qusInfo: EventEmitter<any> = new EventEmitter();
  @ViewChild('stepper') private myStepper: MatStepper;
  @Input() assignmentInfo: any;
  @Input() basicInfo: any;
  assignmentsFormGroup: FormGroup;
  totalCalculatedDuration: number = 0;
  tooltipMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private uiService: UiService
  ) { }

  ngOnInit(): void {
    this.assignmentsFormGroup = this.fb.group({
      instructions: ['Please answer all the questions in the fields provided below', Validators.required],
      // questions: this.fb.array([]),
    });
    if (this.assignmentInfo) {
      // this.assignmentInfo.questions.forEach(question => this.addField(question));
      this.assignmentsFormGroup.patchValue(this.assignmentInfo);
    };
  }

  // get questions() {
  //   return this.assignmentsFormGroup.get('questions') as FormArray;
  // }

  // addField(question?: string) {
  //   const questionGroup = this.fb.group({
  //     question: [question || ''],
  //     questionNumber: this.questions.length + 1
  //   });

  //   this.questions.push(questionGroup);
  // }

  // removeQuestion(index: number) {
  //   this.questions.removeAt(index);
  //   this.uiService.alertMessage('Removed', `Question at Step ${index + 1} removed`, 'warn')
  // }

  onClickNext() {
    const form = this.assignmentsFormGroup.value;
    this.qusInfo.emit(form);
  }

}
