import {
    Component,
    ViewEncapsulation,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
    AfterViewInit,
} from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
// import CustomBlockBlot from 'app/customBlotFormatter';
import { UiService } from 'app/shared/ui.service';
import Quill from 'quill';
import { lastValueFrom, take } from 'rxjs';

@Component({
    selector: 'app-create-question-step',
    encapsulation: ViewEncapsulation.None,

    templateUrl: './create-question-step.component.html',
    styleUrls: ['./create-question-step.component.scss'],
})
export class CreateQuestionStepComponent implements OnInit, AfterViewInit {
    @Output() quizQusInfo: EventEmitter<any> = new EventEmitter();
    @Output() optionFiles = new EventEmitter<{ questionIndex: number, optionIndex: number, file: File }[]>();
    @Input() quizInfo: any;
    @Input() quizBasicInfo: any;
    @ViewChild('elementRef', { static: false })
    elementRef: ElementRef;
    @ViewChild('editor') editor: ElementRef;
    quill: any;
    x;
    y;
    title = 'sampleProject';
    editorModel = [
        {
            attributes: {
                font: 'Roboto',
            },
            insert: 'test',
        },
    ];
    quillConfig = {
        toolbar: {
            container: [
                // ['bold', 'italic', 'underline'],        // toggled buttons
                // [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
                // [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                // [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                // [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
                // [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
                // [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
                // [{ 'font': [] }],
                // [{ 'align': [] }],
                ['bold', 'italic', 'underline', 'strike'], // toggled buttons
                ['blockquote', 'code-block'],

                [{ header: 1 }, { header: 2 }], // custom button values
                [{ list: 'ordered' }, { list: 'bullet' }],
                [{ script: 'sub' }, { script: 'super' }], // superscript/subscript
                [{ indent: '-1' }, { indent: '+1' }], // outdent/indent
                [{ direction: 'rtl' }], // text direction

                [{ size: ['small', false, 'large', 'huge'] }], // custom dropdown
                [{ header: [1, 2, 3, 4, 5, 6, false] }],

                [{ color: [] }, { background: [] }], // dropdown with defaults from theme

                [
                    {
                        font: [
                            'mirza',
                            'roboto',
                            'aref',
                            'serif',
                            'sansserif',
                            'monospace',
                        ],
                    },
                ],
                [{ align: [] }],
                ['clean'], // remove formatting button
                ['link', 'image', 'video'],
                ['custom-block'],
            ],
        },
    };
    editorStyle = {
        height: '300px',
        backgroundColor: '#ffffff',
    };

    checkQues: boolean = false;
    blankCount = 1;

    questionsFormGroup: FormGroup;
    quizzerSchema: any[];
    marks = 1;
    storageBucket = 'quizzer_resources';
    loader;
    inputFileName: any;
    textBoxVisible: boolean;
    uploadedOptionFiles: { questionIndex: number, optionIndex: number, file: File }[] = [];
    optionImagePreviews: { questionIndex: number, optionIndex: number, url: string }[] = [];
    viewedImageUrl: string | null = null;

    // Sub-parts navigation tracking
    activeSubPartIndex: { [questionIndex: number]: number } = {};

    constructor(
        private fb: FormBuilder,
        private uiService: UiService,
        private assignmentService: AssignmentsService,
        private afStorage: AngularFireStorage,
        private sanitizer: DomSanitizer
    ) {

    }
    sanitizeUrl(url: string): SafeUrl {
        return this.sanitizer.bypassSecurityTrustUrl(url);
    }

    ngAfterViewInit(): void {
        // let quillid=document.getElementById('editor') as HTMLElement
        // this.quill = new Quill(quillid)
        // console.log(this.quill)
    }

    ngOnInit(): void {
        this.getQuizzerSchema();
        this.questionsFormGroup = this.fb.group({
            questions: this.fb.array([]),
        });

        if (this.quizInfo?.questionsData) {
            this.loadExistingQustions(this.quizInfo.questionsData);
        }
    }

    get questions() {
        return this.questionsFormGroup.get('questions') as FormArray;
    }

    getQuizzerSchema() {
        this.assignmentService
            .getWithId('---quizzer_schema---')
            .subscribe((res) => {
                this.quizzerSchema = res.questionsSchema;
            });
    }

    loadExistingQustions(qustionArr = []) {
        qustionArr.forEach((qus, index) => {
            this.addQuestion(qus);
            // Initialize activeSubPartIndex for questions with sub-parts
            if (qus.hasSubParts && qus.subParts && qus.subParts.length > 0) {
                this.activeSubPartIndex[index] = 0;
            }
        });
    }

    addQuestion(demoQus: any) {
        const questionIndex = this.questions.length;
        this.questions.push(this.newQuestion(demoQus));
        // Initialize activeSubPartIndex for new questions with sub-parts
        if (demoQus.hasSubParts && demoQus.subParts && demoQus.subParts.length > 0) {
            this.activeSubPartIndex[questionIndex] = 0;
        }
    }

    newQuestion(demoQus: any) {
        /*
        // old code
        let remainingTime: number;
        const info = this.quizInfo ?? this.quizBasicInfo;
        const { totalDurationInSeconds, totalDurationInMinutes, totalDurationInHours } = info;
        const totalTimeCalculatedInSeconds = totalDurationInHours * 60 * 60 + totalDurationInMinutes * 60 + totalDurationInSeconds;
        const { durationInHours, durationInMinutes, durationInSeconds } = demoQus;
        const demoQusTimeCalculatedInSeconds = durationInHours * 60 * 60 + durationInMinutes * 60 + durationInSeconds;
        if (this.questionsFormGroup.get('questions').value.length === 0) {
            remainingTime = totalTimeCalculatedInSeconds - demoQusTimeCalculatedInSeconds;
        } else {
            const formArray = this.questionsFormGroup.get('questions') as FormArray;
            const previousTime = [];
            for (let i = 0; i < formArray.length; i++) {
                const { durationInSeconds, durationInMinutes, durationInHours } = formArray.at(i).value;
                previousTime[i] = { durationInSeconds, durationInMinutes, durationInHours };
            }
            const previousTimeInHours = previousTime.map(item => item.durationInHours).reduce((a, b) => a + b, 0);
            const previousTimeInMinutes = previousTime.map(item => item.durationInMinutes).reduce((a, b) => a + b, 0);
            const previousTimeInSeconds = previousTime.map(item => item.durationInSeconds).reduce((a, b) => a + b, 0);
            const totalPreviousTime = previousTimeInHours * 60 * 60 + previousTimeInMinutes * 60 + previousTimeInSeconds;
            remainingTime = totalTimeCalculatedInSeconds - totalPreviousTime - demoQusTimeCalculatedInSeconds;
        };
        const remainingTimeInHours = Math.floor(remainingTime / 60 / 60);
        const remainingTimeInMinutes = Math.floor(remainingTime / 60);
        const remainingTimeInSeconds = remainingTime % 60;
        */

        let remainingTime: number;
        const info = this.quizInfo ?? this.quizBasicInfo;
        const { totalDurationInSeconds, totalDurationInMinutes, totalDurationInHours } = info;
        const totalTimeCalculatedInSeconds = totalDurationInHours * 3600 + totalDurationInMinutes * 60 + totalDurationInSeconds;

        const { durationInHours: demoHours, durationInMinutes: demoMinutes, durationInSeconds: demoSeconds } = demoQus;
        const demoQusTimeCalculatedInSeconds = demoHours * 3600 + demoMinutes * 60 + demoSeconds;

        const questions = this.questionsFormGroup.get('questions').value;
        const hasAnsweredQuestions = questions.length > 0;

        if (!hasAnsweredQuestions) {
            remainingTime = totalTimeCalculatedInSeconds - demoQusTimeCalculatedInSeconds;
        } else {
            const totalPreviousTimeInSeconds = questions.reduce((total, { durationInHours, durationInMinutes, durationInSeconds }) => total + durationInHours * 3600 + durationInMinutes * 60 + durationInSeconds, 0);
            remainingTime = totalTimeCalculatedInSeconds - totalPreviousTimeInSeconds - demoQusTimeCalculatedInSeconds;
        }

        const remainingTimeInHours = Math.floor(remainingTime / 3600);
        const remainingTimeInMinutes = Math.floor((remainingTime % 3600) / 60);
        const remainingTimeInSeconds = remainingTime % 60;


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
                durationInHours: [remainingTimeInHours],
                durationInMinutes: [remainingTimeInMinutes],
                durationInSeconds: [remainingTimeInSeconds],
                // Sub-parts support
                hasSubParts: [demoQus.hasSubParts || false],
                subParts: this.fb.array([]),
                //TimeBound: 0,
            });
        } else if (demoQus.questionType === 'FILL_IN_THE_BLANKS') {
            form = this.fb.group({
                questionTitle: [demoQus.questionTitle, Validators.required],
                questionType: demoQus.questionType,
                pedagogyType: [demoQus.pedagogyType, Validators.required],
                marks: demoQus.marks,
                blanks: this.fb.group({}),
                optionalResource: this.fb.array([]),
                durationInHours: [remainingTimeInHours],
                durationInMinutes: [remainingTimeInMinutes],
                durationInSeconds: [remainingTimeInSeconds],
                // Sub-parts support
                hasSubParts: [demoQus.hasSubParts || false],
                subParts: this.fb.array([]),
                //TimeBound: 0,
            });
        } else if (demoQus.questionType === 'TEXT') {
            form = this.fb.group({
                questionTitle: [demoQus.questionTitle, Validators.required],
                questionType: demoQus.questionType,
                pedagogyType: [demoQus.pedagogyType, Validators.required],
                marks: demoQus.marks,
                answer: [demoQus.answer, Validators.required],
                maxCharLength: [demoQus.maxCharLength, Validators.required],
                optionalResource: this.fb.array([]),
                durationInHours: [remainingTimeInHours],
                durationInMinutes: [remainingTimeInMinutes],
                durationInSeconds: [remainingTimeInSeconds],
                // Sub-parts support
                hasSubParts: [demoQus.hasSubParts || false],
                subParts: this.fb.array([]),
                //TimeBound: 0,
            });
        }else if (demoQus.questionType === 'DESCRIPTIVE') {
            form = this.fb.group({
                questionTitle: [demoQus.questionTitle, Validators.required],
                questionType: demoQus.questionType,
                pedagogyType: [demoQus.pedagogyType, Validators.required],
                marks: demoQus.marks,
                answer: [demoQus.answer, Validators.required],
                maxCharLength: [demoQus.maxCharLength, Validators.required],
                optionalResource: this.fb.array([]),
                durationInHours: [remainingTimeInHours],
                durationInMinutes: [remainingTimeInMinutes],
                durationInSeconds: [remainingTimeInSeconds],
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
                durationInHours: [remainingTimeInHours],
                durationInMinutes: [remainingTimeInMinutes],
                durationInSeconds: [remainingTimeInSeconds],
                // Sub-parts support
                hasSubParts: [demoQus.hasSubParts || false],
                subParts: this.fb.array([]),
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
        if (
            demoQus.questionType === 'FILL_IN_THE_BLANKS' ||
            demoQus.questionType === 'RICH_BLANKS'
        ) {
            for (const [blankName, options] of Object.entries(demoQus.blanks)) {
                blankFg.addControl(blankName, this.fb.array([]));
                this.addToBlankUpdated(blankFg, blankName, options);
            }
        }

        // Load existing sub-parts if any
        const subPartsArr = form?.get('subParts') as FormArray;
        if (demoQus?.subParts && demoQus.subParts.length > 0) {
            demoQus.subParts.forEach((subPart) => {
                subPartsArr.push(this.newSubPart(subPart));
            });
        }

        return form;
    }

    // ===================== SUB-PARTS METHODS =====================

    /**
     * Creates a new sub-part FormGroup
     * Each sub-part is essentially a mini MCQ question with its own title, options, and marks
     */
    newSubPart(content?: any): FormGroup {
        const subPartGroup = this.fb.group({
            label: [content?.label || this.getNextSubPartLabel(0)],
            subPartTitle: [content?.subPartTitle || '', Validators.required],
            marks: [content?.marks || 1],
            oneCorrectOption: [content?.oneCorrectOption ?? true],
            options: this.fb.array([]),
        });

        // Load existing options for sub-part if any
        const optionsArr = subPartGroup.get('options') as FormArray;
        if (content?.options && content.options.length > 0) {
            content.options.forEach((opt: any) => {
                optionsArr.push(this.newOption(opt));
            });
        }

        return subPartGroup;
    }

    /**
     * Get sub-parts FormArray for a question
     */
    getSubParts(questionIndex: number): FormArray {
        return this.questions.at(questionIndex).get('subParts') as FormArray;
    }

    /**
     * Add a new sub-part to a question
     */
    addSubPart(questionIndex: number): void {
        const subParts = this.getSubParts(questionIndex);
        const nextLabel = this.getNextSubPartLabel(subParts.length);
        const newSubPart = this.newSubPart({ label: nextLabel });
        subParts.push(newSubPart);

        // Initialize active sub-part index if not set
        if (this.activeSubPartIndex[questionIndex] === undefined) {
            this.activeSubPartIndex[questionIndex] = 0;
        }
    }

    /**
     * Remove a sub-part from a question
     */
    removeSubPart(questionIndex: number, subPartIndex: number): void {
        const subParts = this.getSubParts(questionIndex);
        subParts.removeAt(subPartIndex);

        // Re-label remaining sub-parts
        for (let i = 0; i < subParts.length; i++) {
            subParts.at(i).patchValue({ label: this.getNextSubPartLabel(i) });
        }

        // Adjust active sub-part index if needed
        if (this.activeSubPartIndex[questionIndex] >= subParts.length) {
            this.activeSubPartIndex[questionIndex] = Math.max(0, subParts.length - 1);
        }

        // If no sub-parts left, disable hasSubParts
        if (subParts.length === 0) {
            this.questions.at(questionIndex).patchValue({ hasSubParts: false });
        }
    }

    /**
     * Get the next sub-part label (a, b, c, ...)
     */
    getNextSubPartLabel(index: number): string {
        return String.fromCharCode(97 + index); // 97 is 'a'
    }

    /**
     * Toggle hasSubParts for a question
     */
    toggleHasSubParts(questionIndex: number): void {
        const question = this.questions.at(questionIndex);
        const currentValue = question.get('hasSubParts').value;
        question.patchValue({ hasSubParts: !currentValue });

        // If enabling sub-parts and no sub-parts exist, add one
        if (!currentValue) {
            const subParts = this.getSubParts(questionIndex);
            if (subParts.length === 0) {
                this.addSubPart(questionIndex);
            }
            this.activeSubPartIndex[questionIndex] = 0;
        }
    }

    /**
     * Set active sub-part for navigation
     */
    setActiveSubPart(questionIndex: number, subPartIndex: number): void {
        this.activeSubPartIndex[questionIndex] = subPartIndex;
    }

    /**
     * Get options for a specific sub-part
     */
    getSubPartOptions(questionIndex: number, subPartIndex: number): FormArray {
        const subParts = this.getSubParts(questionIndex);
        return subParts.at(subPartIndex).get('options') as FormArray;
    }

    /**
     * Add option to a sub-part
     */
    addSubPartOption(questionIndex: number, subPartIndex: number): void {
        const options = this.getSubPartOptions(questionIndex, subPartIndex);
        options.push(this.newOption());
    }

    /**
     * Remove option from a sub-part
     */
    removeSubPartOption(questionIndex: number, subPartIndex: number, optionIndex: number): void {
        const options = this.getSubPartOptions(questionIndex, subPartIndex);
        options.removeAt(optionIndex);
    }

    /**
     * Toggle single/multi correct option for sub-part
     */
    toggleSubPartSingleCorrect(questionIndex: number, subPartIndex: number): void {
        const subParts = this.getSubParts(questionIndex);
        const subPart = subParts.at(subPartIndex);
        const currentValue = subPart.get('oneCorrectOption').value;
        subPart.patchValue({ oneCorrectOption: !currentValue });
    }

    /**
     * Set radio button for single correct option in sub-part
     */
    setSubPartRadioOption(questionIndex: number, subPartIndex: number, optionIndex: number): void {
        const options = this.getSubPartOptions(questionIndex, subPartIndex);
        const optionsArr = options.controls;
        optionsArr.forEach((opt, idx) => {
            opt.patchValue({ isCorrect: idx === optionIndex });
        });
    }

    /**
     * Check if question has sub-parts enabled
     */
    hasSubPartsEnabled(questionIndex: number): boolean {
        const question = this.questions.at(questionIndex);
        return question?.get('hasSubParts')?.value || false;
    }

    /**
     * Get total marks for all sub-parts
     */
    getTotalSubPartMarks(questionIndex: number): number {
        const subParts = this.getSubParts(questionIndex);
        let total = 0;
        for (let i = 0; i < subParts.length; i++) {
            total += subParts.at(i).get('marks').value || 0;
        }
        return total;
    }

    // ===================== END SUB-PARTS METHODS =====================

    addToBlankUpdated(formGroup, blankName, options) {
        options.forEach((opt) => {
            this.addOptionToBlankUpdated(formGroup, blankName, opt);
        });
    }

    addOptionToBlankUpdated(formGroup, blankName, option) {
        const control = formGroup.get(blankName) as FormArray;
        control.push(this.newOption(option));
    }

    removeQuestion(questionIndex: number) {
        this.questions.removeAt(questionIndex);
        if (this.questionsFormGroup.value.questions.length === 0) {
            this.checkQues = false;
        }
    }

    newResource(content?): FormGroup {
        return this.fb.group({
            resourceName: this.fb.control(content?.resourceName || '', [
                Validators.required,
            ]),
            type: this.fb.control(content?.type || '', [Validators.required]),
            resourcePath: this.fb.control(content?.resourcePath || '', [
                Validators.required,
            ]),
        });
    }

    getResources(questionIndex: number): FormArray {
        return this.questions
            .at(questionIndex)
            .get('optionalResource') as FormArray;
    }

    async addResource(questionIndex: number) {
        return await this.getResources(questionIndex).push(this.newResource());
    }

    removeResource(questionIndex: number, resourceIndex: number) {
        this.getResources(questionIndex).removeAt(resourceIndex);
    }

    newOption2(content?): FormGroup {
        return this.fb.group({
            name: this.fb.control(content?.name || '', [Validators.required]),
            isCorrect: this.fb.control(content?.isCorrect || false, [
                Validators.required,
            ]),
        });
    }

    getOptions(questionIndex: number, blankOptionIndex?: string): FormArray {
        if (this.questions.at(questionIndex).value.hasOwnProperty('blanks')) {
            return this.questions
                .at(questionIndex)
                .get(`blanks.${blankOptionIndex}`) as FormArray;
        }
        return this.questions.at(questionIndex).get('options') as FormArray;
    }

    addOption(questionIndex: number) {
        this.getOptions(questionIndex).push(this.newOption());
    }

    removeOption(
        questionIndex: number,
        optionIndex: number,
        blankOptionIndex?: string
    ) {
        this.getOptions(questionIndex, blankOptionIndex).removeAt(optionIndex);
    }

    mcqSingleCorrectOptionToggle(quesIndex, value) {
        (this.questionsFormGroup.controls.questions as FormArray)
            .at(quesIndex)
            .patchValue({
                oneCorrectOption: !value,
            });
    }

    getOneCorrectOption(quesIndex) {
        const statusValue = (
            this.questionsFormGroup.controls.questions as FormArray
        )
            .at(quesIndex)
            .get('oneCorrectOption');
        return statusValue.value;
    }

    singleCorrectOptionSetRadio(quesIndex, optionIndex) {
        const optionsArr = (
            this.questionsFormGroup.controls.questions as FormArray
        )
            .at(quesIndex)
            .get('options').value;
        optionsArr.map(d => (d.isCorrect = false));
        optionsArr[optionIndex].isCorrect = true;
    }

    getBlankCountQues(quesIndex) {
        const blanksObj = (
            this.questionsFormGroup.controls.questions as FormArray
        )
            .at(quesIndex)
            .get('blanks');
        const len = Object.keys(blanksObj?.value).length;
        let i = 0;
        const blankCounts =
            this.questionsFormGroup.value.questions[
                quesIndex
            ].questionTitle.split('<<blank>>').length - 1;
        for (i = 0; i < blankCounts; i++) {
            this.addBlank(quesIndex, i + 1);
        }
        /* Here Remove the blank object -> reduced the <<blank>>*/
        for (; i < len; i++) {
            (
                (this.questionsFormGroup.controls.questions as FormArray)
                    .at(quesIndex)
                    .get('blanks') as FormGroup
            ).removeControl('optionsBlank' + (i + 1));
        }
    }

    addBlank(index, blockNo = 1) {
        (
            (this.questionsFormGroup.controls.questions as FormArray)
                .at(index)
                .get('blanks') as FormGroup
        ).addControl(
            'optionsBlank' + blockNo,
            this.fb.array([this.newOption()])
        );
    }

    addOptionToBlank(quesIndex, blankName) {
        const blanksFormGroup = (
            this.questionsFormGroup.controls.questions as FormArray
        )
            .at(quesIndex)
            .get('blanks');
        const control = blanksFormGroup.get(blankName) as FormArray;
        control.push(this.newOption());
    }

    setRadioBtnDynamic(quesIndex, blankName, optionIndex, blankArr) {
        const blanksFormGroup = (
            this.questionsFormGroup.controls.questions as FormArray
        )
            .at(quesIndex)
            .get('blanks');
        const control = blanksFormGroup.get(blankName) as FormArray;
        for (let i = 0; i < blankArr.length; i++) {
            if (i === optionIndex) {
                control.at(optionIndex).patchValue({
                    isCorrect: true,
                });
            } else {
                control.at(i).patchValue({
                    isCorrect: false,
                });
            }
        }
        return true;
    }

    // updateRichBlack(form){
    //   const blanksObj = form.get('blanks').value  ;
    //   this.blankCount = Object.keys(blanksObj).length;
    //   const title = form.get('questionTitle').value;
    //   const idx = title.lastIndexOf("</");
    //   const ch = String.fromCharCode(97 + this.blankCount)
    //   const blankTxt = `<i>___(${ch})___</i>&nbsp`;
    //   const filler = title.charAt(idx - 1) == ' ' ? blankTxt : ' ' + blankTxt;
    //   const txt2 = title.slice(0, idx) + filler + title.slice(idx);
    //   form.get('questionTitle').setValue(txt2)
    //   form.get('blanks').addControl('blank ' + ch, this.fb.array([this.newOption()]));
    // }

    addRichBlank(index, blockNo = 1) {
        const blanksObj = (
            this.questionsFormGroup.controls.questions as FormArray
        )
            .at(index)
            .get('blanks').value;
        this.blankCount = Object.keys(blanksObj).length;
        const title = (this.questionsFormGroup.controls.questions as FormArray)
            .at(index)
            .get('questionTitle').value;
        const idx = title.lastIndexOf('</');
        const ch = String.fromCharCode(97 + this.blankCount);
        const blankTxt = `<i>___(${ch})___</i>&nbsp`;
        const filler = title.charAt(idx - 1) == ' ' ? blankTxt : ' ' + blankTxt;
        const txt2 = title.slice(0, idx) + filler + title.slice(idx);
        (this.questionsFormGroup.controls.questions as FormArray)
            .at(index)
            .get('questionTitle')
            .setValue(txt2);
        (
            (this.questionsFormGroup.controls.questions as FormArray)
                .at(index)
                .get('blanks') as FormGroup
        ).addControl('blank ' + ch, this.fb.array([this.newOption()]));
        this.blankCount++;
    }

    removeRichBlanks(questionIndex) {
        const blanksObj = (
            this.questionsFormGroup.controls.questions as FormArray
        )
            .at(questionIndex)
            .get('blanks').value;
        const blanksArr = Object.keys(blanksObj).sort();
        const blankCount = blanksArr.length;

        if (blankCount) {
            const lastBlank = blanksArr[blankCount - 1];
            (
                (this.questionsFormGroup.controls.questions as FormArray)
                    .at(questionIndex)
                    .get('blanks') as FormGroup
            ).removeControl(lastBlank);
            this.uiService.alertMessage(
                'Remove Blank',
                `Remove "${lastBlank}" Manually`,
                'warn'
            );
        }
    }

    onChooseFile(event, type, resourceIndex, questionIndex) {
        this.inputFileName = event.target.files[0].name;

        let isValid;
        if (type === 'PDF') {
            isValid = this.pdfFileTypeAndSizeCheck(event.target.files[0]);
        }

        if (type === 'IMAGE') {
            isValid = this.imageTypeAndSizeCheck(event.target.files[0]);
        }

        if (isValid) {
            this.upload(event, resourceIndex, questionIndex);
        }
    }

    async upload(event, resourceIndex, questionIndex) {
        this.loader = true;
        const bucketId = this.assignmentService.getRandomGeneratedId();
        const bucketPath =
            `${this.storageBucket}/${bucketId}.` +
            this.inputFileName.split('.').slice(-1).pop();
        const ref = this.afStorage.ref(bucketPath);
        //putting the file into storage with custom metadata
        const task = ref
            .put(event.target.files[0], {
                customMetadata: { original_name: this.inputFileName },
            })
            .snapshotChanges();

        await lastValueFrom(task).then((uploadedSnapshot) => {
            if (uploadedSnapshot.state === 'success') {
                this.updateResourcePath(
                    bucketPath,
                    resourceIndex,
                    questionIndex
                );
                this.uiService.alertMessage(
                    'successful',
                    ' File is uploaded successfully',
                    'success'
                );
                this.loader = false;
            }
        });
    }

    updateResourcePath(bucketPath, resourceIndex, questionIndex) {
        const arr = this.questions
            .at(questionIndex)
            .get('optionalResource') as FormArray;
        arr.at(resourceIndex).patchValue({
            resourcePath: bucketPath,
        });
    }

    pdfFileTypeAndSizeCheck(event) {
        const allowedExtensions = /(\.pdf)$/i;
        let isValid = false;
        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage(
                'Invalid file type',
                'Only allowed PDF file',
                'warn'
            );
            this.elementRef.nativeElement.value = '';
            isValid = false;
        } else if (event.size > 10485760) {
            this.uiService.alertMessage(
                'Invalid file type',
                'maximum image size should be 10mb',
                'warn'
            );
            this.elementRef.nativeElement.value = '';
            isValid = false;
        } else {
            isValid = true;
        }
        return isValid;
    }

    imageTypeAndSizeCheck(event: any) {
        const allowedExtensions = /(\.jpeg|\.png|\.jpg)$/i;
        let isValid = false;

        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage(
                'Invalid file type',
                'Only allowed \'.jpeg, .png, .jpg\' file types',
                'warn'
            );
            isValid = false;
        } else if (event.size > 3145728) {
            this.uiService.alertMessage(
                'Invalid file type',
                'maximum image size should be 3mb',
                'warn'
            );
            isValid = false;
        } else {
            isValid = true;
        }
        return isValid;
    }

    onClickNext() {
        console.error(this.questionsFormGroup.value);
        this.quizQusInfo.emit(this.questionsFormGroup.value);
        this.optionFiles.emit(this.uploadedOptionFiles);
    }

    // insertTextArea(event, qindex) {
    //     // console.log(qindex)
    //      console.log(this.quill)
    //      console.log(this.quill.editor.container.childNodes[0])

    //     let alleditors = document.querySelectorAll('.ql-editor');
    //    // let editorContent = document.querySelector('.ql-editor') as HTMLElement;
    //     let editorContent=this.quill.editor.container.childNodes[0]
    //     editorContent.addEventListener('click', this.showTextBox);
    //     setTimeout(() => {
    //         this.detectChangesInCustomTextareaBlot(qindex);
    //     }, 1000);
    // }

    // showTextBox(event) {
    //     let editorContent = event.target;
    //     console.log(editorContent)
    //     var p = document.createElement('textarea');
    //     p.textContent = 'New paragraph!';
    //     p.classList.add('ql-custom-textarea');
    //     p.style.position = 'absolute';
    //     p.style.left = event.clientX - 300 + 'px';
    //     p.style.top = event.clientY - 330 + 'px';
    //     editorContent.appendChild(p);
    //     editorContent.replaceWith(editorContent.cloneNode(true));
    // }

    // detectChangesInCustomTextareaBlot(qindex) {
    //     let value;
    //     let editorContent = document.querySelector('.ql-editor') as HTMLElement;
    //     editorContent.style.position = 'relative';
    //     setTimeout(() => {
    //         const customTextareaElem: any = document.querySelector(
    //             '.ql-custom-textarea'
    //         );

    //         customTextareaElem.addEventListener('change', (c: any) => {
    //             value = c.target.value;
    //             var height = customTextareaElem.clientHeight + 1 + 'px';
    //             var width = customTextareaElem.clientWidth + 1 + 'px';
    //             let editorContent1 = document.querySelector(
    //                 '.ql-editor'
    //             ) as HTMLElement;

    //             const newPTag = document.createElement('p');
    //             newPTag.innerText = value;
    //             // Apply margin-left of 30px to the paragraph element
    //             newPTag.style.position = 'relative';
    //             newPTag.style.left = customTextareaElem.style.left;
    //             newPTag.style.top = customTextareaElem.style.top;
    //             newPTag.style.width = customTextareaElem.clientWidth + 1 + 'px';
    //             newPTag.style.height =
    //                 customTextareaElem.clientHeight + 1 + 'px';
    //             editorContent1.appendChild(newPTag);
    //             customTextareaElem.remove();
    //         });
    //     }, 1000);
    // }

    created() {
    }

    focus() {
    }

    editrochange(event) {
        this.quill = event;
    }

    // new changes

    // newOption(content?): FormGroup {
    //     console.log('newOption', content);
    //     return this.fb.group({
    //         optionType: this.fb.control(content?.optionType || 'TEXT', [Validators.required]),
    //         name: this.fb.control(content?.name || '', []),
    //         imagePath: this.fb.control(content?.imagePath || '', []),
    //         isCorrect: this.fb.control(content?.isCorrect || false, [Validators.required]),
    //     });
    // }

    newOption(content?): FormGroup {
        const optionType = content?.optionType || 'TEXT';
        const name = optionType === 'IMAGE' ? '' : (content?.name || '');

        const group = this.fb.group({
            optionType: this.fb.control(optionType, [Validators.required]),
            name: this.fb.control(name, []),
            imagePath: this.fb.control(content?.imagePath || '', []),
            isCorrect: this.fb.control(content?.isCorrect || false, [Validators.required]),
        });

        // Listen for optionType changes and reset name if IMAGE
        group.get('optionType').valueChanges.subscribe(type => {
            if (type === 'IMAGE') {
                group.get('name').setValue('');
            }
        });

        return group;
    }

    async onOptionImageSelected2(event: any, questionIndex: number, optionIndex: number) {
        this.loader = true;
        const file = event.target.files[0];
        this.inputFileName = event.target.files[0].name;
        if (!file) return;
        const bucketId = this.assignmentService.getRandomGeneratedId();
        const filePath = `quizOptions/${Date.now()}_${file.name}`;
        const bucketPath = `${this.storageBucket}/${bucketId}.` +
            this.inputFileName.split('.').slice(-1).pop();
        // console.log('Uploading file to:', filePath);
        // const fileRef = this.afStorage.ref(filePath);
        // const task = this.afStorage.upload(filePath, file);
        const fileRef = this.afStorage.ref(bucketPath);
        const task = this.afStorage.upload(bucketPath, file);

        task.snapshotChanges().subscribe({
            complete: async () => {
                const downloadURL = await fileRef.getDownloadURL().toPromise();
                const optionArray = this.getOptions(questionIndex);
                const optionGroup = optionArray.at(optionIndex);
                // optionGroup.patchValue({ imagePath: downloadURL });
                optionGroup.patchValue({ imagePath: bucketPath });
                this.loader = false;
            },
            error: () => {
                this.loader = false;
            }

        });
    }


    hasImages(questionIndex: number): boolean {
        const options = this.getOptions(questionIndex).controls;
        return options.some(opt =>
            opt.get('optionType')?.value === 'IMAGE' && !!opt.get('imagePath')?.value
        );
    }


    showOptionImageInline(questionIndex: number, optionIndex: number) {
        // Find the preview for this option
        const previewObj = this.optionImagePreviews.find(
            p => p.questionIndex === questionIndex && p.optionIndex === optionIndex
        );
        // If not found in previews, fallback to the storage path
        if (previewObj) {
            this.viewedImageUrl = previewObj.url;
        } else {
            // fallback to storage path if needed
            const option = this.getOptions(questionIndex).at(optionIndex);
            this.viewedImageUrl = option?.value?.imagePath || null;
        }
    }

    async onOptionImageSelected(event: any, questionIndex: number, optionIndex: number) {
       this.loader = true;
        const files: FileList = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];
        const objectUrl = URL.createObjectURL(file);

        const optionArray = this.getOptions(questionIndex);
        const optionGroup = optionArray.at(optionIndex);

        // Temporarily patch blob URL for preview
        optionGroup.patchValue({ imagePath: objectUrl });

        // Store file locally for later upload
        this.uploadedOptionFiles.push({ questionIndex, optionIndex, file });
        this.optionImagePreviews.push({ questionIndex, optionIndex, url: objectUrl });
       
        this.loader = false;
    }

    catchOptionFiles(files) {
        this.uploadedOptionFiles = files;
    }
}
