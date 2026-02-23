import { Component, Inject, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'app-quiz-replay',
    templateUrl: './quiz-replay.component.html',
    styleUrls: ['./quiz-replay.component.scss']
})
export class QuizReplayComponent implements OnInit {
    Table: string;
    counter: number = 0;
    questionsFormGroup: FormGroup;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private fb: FormBuilder,
    ) {
        this.Table = data.parent;


        this.questionsFormGroup = this.fb.group({
            questions: this.fb.array([])
        });
    }

    ngOnInit(): void {
        this.updateQuestionsForm(this.data?.quizInfo?.questions);
        const { totalDurationInHours, totalDurationInMinutes, totalDurationInSeconds } = this.data?.quizInfo;
        this.counter = totalDurationInHours * 3600 + totalDurationInMinutes * 60 + totalDurationInSeconds;
    }

    get questions() {
        return this.questionsFormGroup.get('questions') as FormArray;
    }

    updateQuestionsForm(qustionArr = []) {
        qustionArr.forEach((qus, index) => {
            this.addQuestion(qus, index);
        });
    }

    addQuestion(ques, index) {
        this.questions.push(this.newQuestion(ques, index));
    }

    newQuestion(question, index) {
        let form: FormGroup;
        if (question.questionType === 'MCQ') {
            form = this.fb.group({
                questionTitle: [question.questionTitle, Validators.required],
                oneCorrectOption: [question.oneCorrectOption],
                questionType: [question.questionType],
                pedagogyType: [question.pedagogyType, Validators.required],
                marks: [question.marks],
                options: this.fb.array([]),
                timeBound: [question?.timeBound ? question.timeBound : 0],
                timeTaken: [question?.timeTaken ? question.timeTaken : 0],
                optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
            });
            console.log('MCQ');
            console.log(form);
        }

        else if (question.questionType === 'FILL_IN_THE_BLANKS') {
            const quesTitles: [] = question.questionTitle.split('<<blank>>');
            const myObjectArray = Object.keys(question.blanks).map(key => ({ key: key, value: question.blanks[key] }));
            if (this.Table == 'ntable') {
                form = this.fb.group({
                    questionTitle: [question.questionTitle, Validators.required],
                    questionType: [question.questionType],
                    pedagogyType: [question.pedagogyType, Validators.required],
                    marks: [question.marks],
                    blanks: [myObjectArray.sort(this.compareKeys)],
                    blanksObj: [question.blanksObj],
                    quesSplit: this.fb.array(quesTitles),
                    timeBound: [question?.timeBound ? question.timeBound : 0],
                    timeTaken: [question?.timeTaken ? question.timeTaken : 0],
                    optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
                });
            }
            else {
                form = this.fb.group({
                    questionTitle: [question.questionTitle, Validators.required],
                    questionType: [question.questionType],
                    pedagogyType: [question.pedagogyType, Validators.required],
                    marks: [question.marks],
                    blanks: this.fb.group({}),
                    blanksObj: [question.blanksObj],
                    quesSplit: this.fb.array(quesTitles),
                    timeBound: [question?.timeBound ? question.timeBound : 0],
                    timeTaken: [question?.timeTaken ? question.timeTaken : 0],
                    optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
                });
            }
        }
        else if (question.questionType === 'RICH_BLANKS') {
             if (this.Table == 'ntable') {
                const myObjectArray = Object.keys(question.blanks).map(key => ({ key: key, value: question.blanks[key] }));

                form = this.fb.group({
                    questionTitle: [question.questionTitle, Validators.required],
                    questionType: [question.questionType],
                    pedagogyType: [question.pedagogyType, Validators.required],
                    marks: [question.marks],
                    blanks: [myObjectArray.sort(this.compareKeys1)],
                    blanksObj: [question.blanksObj],
                    timeBound: [question?.timeBound ? question.timeBound : 0],
                    timeTaken: [question?.timeTaken ? question.timeTaken : 0],
                    optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
                });
            }
            else {
                // let d=this.getBlanks(question)
                form = this.fb.group({
                    questionTitle: [question.questionTitle, Validators.required],
                    questionType: [question.questionType],
                    pedagogyType: [question.pedagogyType, Validators.required],
                    marks: [question.marks],
                    blanks: this.fb.group({}),
                    // customBlanks:[d.sort(this.compareKeys1)],
                    blanksObj: [question.blanksObj],
                    timeBound: [question?.timeBound ? question.timeBound : 0],
                    timeTaken: [question?.timeTaken ? question.timeTaken : 0],
                    optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
                });
            }
        }
        else if (question.questionType === 'TEXT') {
            form = this.fb.group({
                questionTitle: [question.questionTitle, Validators.required],
                questionType: question.questionType,
                pedagogyType: [question.pedagogyType, Validators.required],
                marks: [question.marks],
                answer: [question.answer, Validators.required],
                text: [question.text],
                maxCharLength: [question?.maxCharLength || 10, Validators.required],
                timeBound: [question?.timeBound ? question.timeBound : 0],
                timeTaken: [question?.timeTaken ? question.timeTaken : 0],
                optionalResource: [question?.optionalResource?.length ? question.optionalResource : []]
            });
        }

        const optionArr = form?.get('options') as FormArray;
        // assigning options
        if (question?.options) {
            question?.options.map((res) => {
                optionArr.push(this.newOption(res));
            });
        }

        // assigning blanks
        // if (question.questionType === 'FILL_IN_THE_BLANKS' || question.questionType === 'RICH_BLANKS') {
        //   for (let [blankName, options] of Object.entries(question.blanksObj)) {
        //     form.addControl(blankName, new FormControl(question[blankName]));
        //   }
        // }
        if (question.questionType === 'FILL_IN_THE_BLANKS' || question.questionType === 'RICH_BLANKS') {

            // for (let [blankName, options] of Object.entries(question.blanksObj)) {
            //   let optionsArr: any = options;
            //   form.addControl(blankName, this.fb.group({
            //     options: this.fb.array(optionsArr.map(a => this.newOption(a))),
            //     selectedOption: this.fb.control({
            //       name: question[blankName]['selectedOption']['name'],
            //       isCorrect: question[blankName]['selectedOption']['isCorrect'],
            //     })
            //   }));
            // }

            if (question.questionType === 'FILL_IN_THE_BLANKS' || question.questionType === 'RICH_BLANKS') {
                if (question.hasOwnProperty('blanksObj')) {
                    for (const [blankName, options] of Object.entries(question.blanksObj)) {
                        form.addControl(blankName, new FormControl(
                            {
                                ...question[blankName],
                                selectedOption: {
                                    ...question[blankName]['selectedOption'],
                                    attemptedOption: true
                                }
                            }
                        ));
                    }

                };
            }
        }
        return form;
    }

    newOption(content?): FormGroup {
        return this.fb.group({
            name: this.fb.control(content?.name || '', [Validators.required]),
            isCorrect: this.fb.control(content?.isCorrect || false, [Validators.required]),
            attemptedOption: this.fb.control(content?.attemptedOption),
        });
    }

    getOptions(questionIndex: number): FormArray {
        return this.questions.at(questionIndex).get('options') as FormArray;
    }

    getOneCorrectOption(quesIndex) {
        const statusValue = (this.questions as FormArray)
            .at(quesIndex).get('oneCorrectOption');
        return statusValue.value;
    }

    singleCorrectOptionSetRadio(quesIndex, optionIndex): void {
        const optionsArr = (this.getOptions(quesIndex) as FormArray);
        optionsArr.value.map(d => d.attemptedOption = false);
        optionsArr.at(optionIndex).patchValue({
            attemptedOption: true
        });
    }

    addOptionToBlank(quesIndex, blankName) {
        const blanksFormGroup = (this.questions as FormArray)
            .at(quesIndex)
            .get('blanks');
        const control = blanksFormGroup.get(blankName) as FormArray;
        control.push(this.newOption());
    }

    onClickOption(questionIndex: number, blankKey) {
        const formValue = this.questions.at(questionIndex).get(blankKey).value;
        formValue.options.forEach((op) => {
            op.attemptedOption = false;
            if (op.name === formValue.selectedOption.name) {
                op.attemptedOption = true;
            }
        });
    }

    compareKeys(a, b) {
        const numA = parseInt(a.key.match(/\d+/)[0]);
        const numB = parseInt(b.key.match(/\d+/)[0]);
        return numA - numB;
    }

    compareKeys1(a, b) {
        const keyA = a.key.toLowerCase();
        const keyB = b.key.toLowerCase();
        if (keyA < keyB) {
            return -1;
        }
        if (keyA > keyB) {
            return 1;
        }
        return 0;
    }

    onStepChange(event: any) {
        if (this.Table != 'table' && typeof (this.Table) != 'undefined') {
            if (this.data?.quizInfo?.questions[event.previouslySelectedIndex].questionType != 'MCQ'
                && this.data?.quizInfo?.questions[event.selectedIndex].questionType == 'MCQ') {

                const optionsArr = (this.getOptions(event.selectedIndex) as FormArray);
                const i = this.data?.quizInfo?.questions[event.selectedIndex].options.findIndex((d: any) => d.isCorrect == true);
                if(i>-1){
                    optionsArr.at(i).patchValue({
                        isCorrect: true
                    });
                }

            }
            if (this.data?.quizInfo?.questions[event.previouslySelectedIndex].questionType == 'MCQ'
                && this.data?.quizInfo?.questions[event.selectedIndex].questionType == 'MCQ') {
                const optionsArr = (this.getOptions(event.previouslySelectedIndex) as FormArray);
                const j = this.data?.quizInfo?.questions[event.previouslySelectedIndex].options.findIndex((d: any) => d.isCorrect == true);
                if(j>-1){
                    optionsArr.at(j).patchValue({
                        isCorrect: false
                    });
                }

                setTimeout(() => {
                    const optionsArr = (this.getOptions(event.selectedIndex) as FormArray);
                    const i = this.data?.quizInfo?.questions[event.selectedIndex].options.findIndex((d: any) => d.isCorrect == true);
                    if(i>-1){
                        optionsArr.at(i).patchValue({
                            isCorrect: true
                        });
                    }
                }, 1000);

            }
            if (this.data?.quizInfo?.questions[event.selectedIndex].questionType == 'TEXT') {
                setTimeout(() => {
                    const ans = this.data?.quizInfo?.questions[event.selectedIndex].answer.toString();
                    const form = this.questions.at(event.selectedIndex) as FormGroup;
                    form.get('answer').setValue(ans);
                }, 1000);
            }
            if (this.data?.quizInfo?.questions[event.previouslySelectedIndex].questionType == 'MCQ'
                && this.data?.quizInfo?.questions[event.selectedIndex].questionType != 'MCQ') {

                const optionsArr = (this.getOptions(event.previouslySelectedIndex) as FormArray);
                const j = this.data?.quizInfo?.questions[event.previouslySelectedIndex].options.findIndex((d: any) => d.isCorrect == true);
                if(j>-1){
                    optionsArr.at(j).patchValue({
                        isCorrect: false
                    });
                }

            }
        }

        if (this.data.parent === 'QuizSubmissionAttemptsTableComponent') {
            if (this.data?.quizInfo?.questions[event.previouslySelectedIndex].questionType != 'MCQ'
                && this.data?.quizInfo?.questions[event.selectedIndex].questionType == 'MCQ') {
                const optionsArr = (this.getOptions(event.selectedIndex) as FormArray);
                const i = this.data?.quizInfo?.questions[event.selectedIndex].options.findIndex((d: any) => d.attemptedOption == true);
                if(i>-1){
                    optionsArr.at(i).patchValue({
                        attemptedOption: true
                    });
                }
            }
            if (this.data?.quizInfo?.questions[event.previouslySelectedIndex].questionType == 'MCQ'
                && this.data?.quizInfo?.questions[event.selectedIndex].questionType == 'MCQ') {
                const optionsArr = (this.getOptions(event.previouslySelectedIndex) as FormArray);
                const j = this.data?.quizInfo?.questions[event.previouslySelectedIndex].options.findIndex((d: any) => d.attemptedOption == true);
                if(j>-1){
                    optionsArr.at(j).patchValue({
                        attemptedOption: false
                    });
                }

                console.log(j);
                setTimeout(() => {
                    const optionsArr = (this.getOptions(event.selectedIndex) as FormArray);
                    const i = this.data?.quizInfo?.questions[event.selectedIndex].options.findIndex((d: any) => d.attemptedOption == true);
                    console.log(i);
                    if(i>-1){
                        optionsArr.at(i).patchValue({
                            attemptedOption: true
                        });
                    }

                }, 1000);
            }
            if (this.data?.quizInfo?.questions[event.previouslySelectedIndex].questionType == 'MCQ'
                && this.data?.quizInfo?.questions[event.selectedIndex].questionType != 'MCQ') {
                const optionsArr = (this.getOptions(event.previouslySelectedIndex) as FormArray);
                const j = this.data?.quizInfo?.questions[event.previouslySelectedIndex].options.findIndex((d: any) => d.attemptedOption == true);
                if(j>-1){
                    optionsArr.at(j).patchValue({
                        attemptedOption: false
                    });
                }

            }
        }
    }

    getBlanks(question) {
        const k = ['blanks', 'blanksObj'];
        const n = Object.keys(question).filter((m, index) => m.includes('blank')).filter(e => !k.includes(e)).map((f, index) => ({ ...question[f], key: f }));
        return n;
    }
    // getBlanks1(question){
    //     let n=Object.keys(question).filter((m,index)=>m.includes('options')).map((f,index)=>({...question[f],key:f}))
    //     return n
    // }
}
