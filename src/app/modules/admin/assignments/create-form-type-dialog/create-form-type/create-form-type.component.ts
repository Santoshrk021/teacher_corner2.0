import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { RomanNumeralPipe } from 'app/shared/pipes/roman-numeral.pipe';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-form-type',
  templateUrl: './create-form-type.component.html',
  styleUrls: ['./create-form-type.component.scss'],
  providers: [RomanNumeralPipe],
})
export class CreateFormTypeComponent implements OnInit {
  @Output() qusInfo: EventEmitter<any> = new EventEmitter();
  @ViewChild('stepper') private myStepper: MatStepper;
  @Input() assignmentInfo: any;
  @Input() basicInfo: any;
  assignmentsFormGroup: FormGroup;
  totalCalculatedDuration: number = 0;
  tooltipMessage: string = '';
  questionTypes: Array<any> = [];

  constructor(
    private fb: FormBuilder,
    private uiService: UiService,
    private romanNumeralPipe: RomanNumeralPipe,
    private configurationService: ConfigurationService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.assignmentsFormGroup = this.fb.group({
      instructions: ['Please answer all the questions in the fields provided below', Validators.required],
      questions: this.fb.array([]),
    });

    const questionTypesConfig = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('AssignmentTypes'));
    this.questionTypes = questionTypesConfig.get('questionTypesForm') || [];

    if (this.assignmentInfo) {
      this.assignmentInfo.questions.forEach(question => this.addQuestion(question));
      this.assignmentsFormGroup.patchValue(this.assignmentInfo);
    };
  }

  get questions() {
    return this.assignmentsFormGroup.get('questions') as FormArray;
  }

  addQuestion(question?: string) {
    const questionGroup = this.fb.group({
      questionType: [''],
      questionNumber: this.questions.length + 1,
      question: [question || ''],
      prompt: [''],
      isSubquestion: [false],
      dropDownOptions: [''],
      dropDownOptionsDynamic: [''],
      dropDownOptionsDependent: [''],
      fieldIcon: [''],
    });

    this.questions.push(questionGroup);
  }

  removeQuestion(index: number) {
    this.questions.removeAt(index);
    this.uiService.alertMessage('Removed', `Question at Step ${index + 1} removed`, 'warn');
  }

  moveQuestionUp(index: number) {
    if (index > 0) {
      const questions = this.questions;
      const question = questions.at(index);
      questions.removeAt(index);
      questions.insert(index - 1, question);
      this.assignQuestionNumbers();
    }
  }

  moveQuestionDown(index: number) {
    if (index < this.questions.length - 1) {
      const questions = this.questions;
      const question = questions.at(index);
      questions.removeAt(index);
      questions.insert(index + 1, question);
      this.assignQuestionNumbers();
    }
  }

  onClickNext() {
    this.assignQuestionNumbers();
    const form = this.assignmentsFormGroup.value;
    this.qusInfo.emit(form);
  }

  assignQuestionNumbers() {
    let mainQuestionCount = 1;
    let subQuestionCount = 1;

    this.questions.controls.forEach((question, index) => {
      if (!question.get('isSubquestion').value) {
        question.get('questionNumber').setValue(mainQuestionCount);
        mainQuestionCount++;
        subQuestionCount = 1; // Reset subquestion count for the next main question
      } else {
        question.get('questionNumber').setValue(this.romanNumeralPipe.transform(subQuestionCount));
        subQuestionCount++;
      }
    });
  }

  getQuestionNumber(index: number): number {
    let count = 1;
    for (let i = 0; i < index; i++) {
      if (!this.questions.at(i).get('isSubquestion').value) {
        count++;
      }
    }
    return count;
  }

  getSubQuestionNumber(index: number): string {
    let count = 1;
    for (let i = 0; i < index; i++) {
      if (this.questions.at(i).get('isSubquestion').value) {
        count++;
      }
    }
    return this.romanNumeralPipe.transform(count);
  }

}
