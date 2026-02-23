import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { formAssignmentSubmissionPdf } from 'app/shared/pdf-generation/form-assignment-submission';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-form-display',
  templateUrl: './form-display.component.html',
  styleUrls: ['./form-display.component.scss']
})
export class FormDisplayComponent implements OnInit {
  assignmentFormGroup: FormGroup;
  dependentDropdowns: Array<any> = [];
  storageBucket = 'contest_submissions';

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private afStore: AngularFireStorage,
    private assignmentService: AssignmentsService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.assignmentFormGroup = this.fb.group({
      instructions: [''],
      questions: this.fb.array([
      ]),
    });

    if (!!this.data) {
      const processedQuestions = await this.processQuestions(this.data?.submission?.questions);
      processedQuestions?.forEach((question: any) => {
        this.addQuestion(question);
      })
    }
  }

  get questions() {
    return this.assignmentFormGroup?.get('questions') as FormArray;
  }

  async processQuestions(questionsArray: Array<any>) {
    // for dynamic dropdowns
    const questions = await Promise.all(questionsArray.map(async question => {
      if (question.questionType === 'dropDownDependent' && question.hasOwnProperty('dropDownOptionsDependent') && !Array.isArray(question.dropDownOptionsDependent)) {
        question.dropDownOptionsDependent = Object.values(question.dropDownOptionsDependent).flat();
      };
      return question;
    }));
    return questions;
  }

  addQuestion(questionObject?: any) {
    const fieldsToCheck = ['prompt', 'questionType', 'questionNumber', 'question', 'isSubquestion', 'dropDownOptions', 'dropDownOptionsDynamic', 'dropDownOptionsDependent', 'fieldIcon'];
    const isValid = fieldsToCheck.some(field => questionObject.hasOwnProperty(field));
    if (!isValid) {
      throw new Error(`Fields missing in question : ${fieldsToCheck.filter(field => !questionObject.hasOwnProperty(field)).join(', ')}`);
    }

    const { prompt, questionType, questionNumber, question, isSubquestion, dropDownOptions, dropDownOptionsDynamic, dropDownOptionsDependent, fieldIcon } = questionObject;

    const questionGroup = this.fb.group({
      questionType: [questionType],
      questionNumber: [questionNumber],
      question: [question],
      prompt: [prompt?.length > 0 ? question : 'Enter the answer here'],
      isSubquestion: [isSubquestion],
      dropDownOptions: [dropDownOptions],
      dropDownOptionsDynamic: [dropDownOptionsDynamic],
      dropDownOptionsDependent: [dropDownOptionsDependent],
      fieldIcon: [fieldIcon],
      answer: [questionObject?.answer ?? ''],
    });

    this.questions.push(questionGroup);
  }

  onSelectDynamicDropDown(event: MatSelectChange, index: number) {
    this.dependentDropdowns[index + 1] = event.value;
  }

  onSelectDependentDropDown(event: MatSelectChange, index: number) {
    this.dependentDropdowns[index + 1] = event.value;
  }

  async downloadPdf() {
    const { contestId, stageId, studentId, submId, assignmentId, submission } = this.data;
    const pdfFile = await formAssignmentSubmissionPdf(submission);
    pdfFile.open();
    const buffer = await new Promise((resolve) => pdfFile.getBuffer(async (buffer: any) => resolve(buffer)));
    const submissionPath = `${this.storageBucket}/${contestId}/${stageId}/${submId}/${studentId}-${contestId}/${assignmentId}.pdf`;
    this.afStore.ref(submissionPath);
    const submissionPathString = `stageId-${stageId}.submId-${submId}.assignmentId-${assignmentId}.submissionPath`;
    try {
      const task = await this.afStore.upload(submissionPath, buffer, { contentType: 'application/pdf' });
      if (task.state === 'success') {
        await this.assignmentService.updateKeyInContestSubmission(submissionPathString, submissionPath, studentId, contestId);
      }
    } catch (error) {
      console.error('Error uploading PDF:', error);
    }
  }

}
