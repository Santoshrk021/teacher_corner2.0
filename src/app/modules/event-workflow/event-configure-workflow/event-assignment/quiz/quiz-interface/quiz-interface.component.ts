import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UiService } from 'app/shared/ui.service';

@Component({
  selector: 'app-quiz-interface',
  templateUrl: './quiz-interface.component.html',
  styleUrls: ['./quiz-interface.component.scss']
})
export class QuizInterfaceComponent implements OnInit, OnChanges, AfterViewInit {

  @Input() quizInfo;
  @Input() indexObj;
  @Input() allQuestionsFormGroup;
  allQuestionsFormArr: any[] = [];
  questionsFormGroup: FormGroup;
  constructor(public fb: FormBuilder, private uiService: UiService) {
    this.questionsFormGroup = this.fb.group({
      questions: this.fb.array([])
    });

    // this.questionsFormGroup.get('questions').valueChanges.subscribe(d=>{
    //   console.log(d);

    // })



  }
  ngOnInit(): void {
    // console.log(this.quizInfo);
    // qustionArr.forEach(qus => {
    // console.log(this.allQuestionsFormGroup);
    this.addQuestion(this.quizInfo);
    // })
    if (this.allQuestionsFormGroup !=undefined) {
      this.allQuestionsFormArr = this.allQuestionsFormGroup;

    }
    // console.log(this.allQuestionsFormArr);

  }

  ngAfterViewInit(): void {
    // console.log(this.quizInfo);
    // console.log(this.indexObj);
  }

  ngOnChanges(): void {
  }

  addQuestion(demoQus) {
    this.questions.push(this.newQuestion(demoQus));
  }

  newQuestion(demoQus) {
    let form;
    if (demoQus.questionType === 'MCQ') {
      form = this.fb.group({
        questionTitle: [demoQus.questionTitle, Validators.required],
        oneCorrectOption: demoQus.oneCorrectOption,
        questionType: demoQus.questionType,
        pedagogyType: [demoQus.pedagogyType, Validators.required],
        marks: demoQus.marks,
        options: this.fb.array([]),
        optionalResource: this.fb.array([]),
        //TimeBound: 0,
      });
    }
    else if (demoQus.questionType === 'FILL_IN_THE_BLANKS') {
      form = this.fb.group({
        questionTitle: [demoQus.questionTitle, Validators.required],
        questionType: demoQus.questionType,
        pedagogyType: [demoQus.pedagogyType, Validators.required],
        marks: demoQus.marks,
        blanks: this.fb.group({}),
        optionalResource: this.fb.array([]),
        //TimeBound: 0,
      });
    }
    else if (demoQus.questionType === 'TEXT') {
      form = this.fb.group({
        questionTitle: [demoQus.questionTitle, Validators.required],
        questionType: demoQus.questionType,
        pedagogyType: [demoQus.pedagogyType, Validators.required],
        marks: demoQus.marks,
        answer: [demoQus.answer, Validators.required],
        maxCharLength: [demoQus.maxCharLength, Validators.required],
        optionalResource: this.fb.array([]),
        //TimeBound: 0,
      });
    }
    else if (demoQus.questionType === 'RICH_BLANKS') {
      form = this.fb.group({
        questionTitle: [demoQus.questionTitle, Validators.required],
        questionType: demoQus.questionType,
        pedagogyType: [demoQus.pedagogyType, Validators.required],
        marks: demoQus.marks,
        blanks: this.fb.group({}),
        optionalResource: this.fb.array([]),
        //TimeBound: 0,
      });
    }

    const resouceArr = form?.get('optionalResource') as FormArray;
    const optionArr = form?.get('options') as FormArray;
    const blankFg = form?.get('blanks') as FormGroup;

    // assigning resources
    if (demoQus?.optionalResource) {
      demoQus?.optionalResource.map((res) => {
        resouceArr.push(this.newResource(res));
      });
    }

    // assigning options
    if (demoQus?.options) {
      demoQus?.options.map((res) => {
        optionArr.push(this.newOption(res));
      });
    }

    // assigning blanks
    if (demoQus.questionType === 'FILL_IN_THE_BLANKS' || demoQus.questionType === 'RICH_BLANKS') {
      for (const [blankName, options] of Object.entries(demoQus.blanks)) {
        blankFg.addControl(blankName, this.fb.array([]));
        this.addToBlankUpdated(blankFg, blankName, options);

      }
    }
    return form;
  }
  get questions() {
    return this.questionsFormGroup.get('questions') as FormArray;
  }

  addToBlankUpdated(formGroup, blankName, options) {
    options.forEach((opt) => {
      this.addOptionToBlankUpdated(formGroup, blankName, opt);
    });
  }

  addOptionToBlankUpdated(formGroup, blankName, option) {
    const control = formGroup.get(blankName) as FormArray;
    control.push(this.newOption(option));

  }

  newResource(content?): FormGroup {
    return this.fb.group({
      resourceName: this.fb.control(content?.resourceName || '', [Validators.required]),
      type: this.fb.control(content?.type || '', [Validators.required]),
      resourcePath: this.fb.control(content?.resourcePath || '', [Validators.required])
    });
  }
  getResources(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get('optionalResource') as FormArray;
  }

  async addResource(questionIndex: number) {
    return await this.getResources(questionIndex).push(this.newResource());
  }

  newOption(content?): FormGroup {
    return this.fb.group({
      name: this.fb.control(content?.name || '', [Validators.required]),
      isCorrect: this.fb.control(content?.isCorrect || false, [Validators.required]),
    });
  }
  getOptions(questionIndex: number): FormArray {
    return this.questions.at(questionIndex).get('options') as FormArray;
  }

  mcqSingleCorrectOptionToggle(quesIndex, value) {
    (this.questionsFormGroup.controls.questions as FormArray)
      .at(quesIndex).patchValue({
        oneCorrectOption: !value
      });
  }

  getOneCorrectOption(quesIndex) {
    const statusValue = (this.questionsFormGroup.controls.questions as FormArray)
      .at(quesIndex).get('oneCorrectOption');
    return statusValue.value;
  }

  singleCorrectOptionSetRadio(quesIndex, optionIndex) {
    const optionsArr = (this.questionsFormGroup.controls.questions as FormArray)
      .at(quesIndex)
      .get('options').value;
    optionsArr.map(d => d.isCorrect = false);
    optionsArr[optionIndex].isCorrect = true;
  }


  getBlankCountQues(quesIndex) {
    const blanksObj = (this.questionsFormGroup.controls.questions as FormArray).at(quesIndex).get('blanks');
    const len = Object.keys(blanksObj?.value).length;
    let i = 0;
    const blankCounts = this.questionsFormGroup.value.questions[quesIndex].questionTitle.split('<<blank>>').length - 1;
    for (i = 0; i < blankCounts; i++) {
      this.addBlank(quesIndex, i + 1);
    }
    /* Here Remove the blank object -> reduced the <<blank>>*/
    for (; i < len; i++) {
      (((this.questionsFormGroup.controls.questions as FormArray).at(quesIndex).get('blanks')) as FormGroup).removeControl('optionsBlank' + (i + 1));
    }
  }

  addBlank(index, blockNo = 1) {
    (((this.questionsFormGroup.controls.questions as FormArray).at(index).get('blanks')) as FormGroup).addControl('optionsBlank' + blockNo, this.fb.array([this.newOption()]));
  }

  addOptionToBlank(quesIndex, blankName) {
    const blanksFormGroup = (this.questionsFormGroup.controls.questions as FormArray)
      .at(quesIndex)
      .get('blanks');
    const control = blanksFormGroup.get(blankName) as FormArray;
    control.push(this.newOption());
  }

  setRadioBtnDynamic(quesIndex, blankName, optionIndex, blankArr) {
    const blanksFormGroup = (this.questionsFormGroup.controls.questions as FormArray)
      .at(quesIndex)
      .get('blanks');
    const control = blanksFormGroup.get(blankName) as FormArray;
    for (let i = 0; i < blankArr.length; i++) {
      if (i === optionIndex) {
        control.at(optionIndex).patchValue({
          isCorrect: true
        });
      } else {
        control.at(i).patchValue({
          isCorrect: false
        });
      }
    }
    return true;
  }

  blankCount = 1;
  addRichBlank(index, blockNo = 1) {
    const blanksObj = ((this.questionsFormGroup.controls.questions as FormArray).at(index).get('blanks')).value;
    this.blankCount = Object.keys(blanksObj).length;
    const title = (this.questionsFormGroup.controls.questions as FormArray).at(index).get('questionTitle').value;
    const idx = title.lastIndexOf('</');
    const ch = String.fromCharCode(97 + this.blankCount);
    const blankTxt = `<i>___(${ch})___</i>&nbsp`;
    const filler = title.charAt(idx - 1) == ' ' ? blankTxt : ' ' + blankTxt;
    const txt2 = title.slice(0, idx) + filler + title.slice(idx);
    (this.questionsFormGroup.controls.questions as FormArray).at(index).get('questionTitle').setValue(txt2);
    (((this.questionsFormGroup.controls.questions as FormArray).at(index).get('blanks')) as FormGroup).addControl('blank ' + ch, this.fb.array([this.newOption()]));
    this.blankCount++;
  }

  removeRichBlanks(questionIndex) {
    const blanksObj = ((this.questionsFormGroup.controls.questions as FormArray).at(questionIndex).get('blanks')).value;
    const blanksArr = Object.keys(blanksObj).sort();
    const blankCount = blanksArr.length;

    if (blankCount) {
      const lastBlank = blanksArr[blankCount - 1];
      const blankChar = lastBlank.replace('blank ', '');
      ((
        (this.questionsFormGroup.controls.questions as FormArray).at(questionIndex).get('blanks')
      ) as FormGroup).removeControl(lastBlank);
      this.uiService.alertMessage('Remove Blank', `Remove "${lastBlank}" Manually`, 'warn');
    }

  }

}
