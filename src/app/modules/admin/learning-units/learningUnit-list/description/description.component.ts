import { Component, OnInit, Input, ViewEncapsulation, ViewChild, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UiService } from 'app/shared/ui.service';
import { QuillEditorComponent } from 'ngx-quill';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';

@Component({
    selector: 'app-description',
    templateUrl: './description.component.html',
    styleUrls: ['./description.component.scss'],
    encapsulation: ViewEncapsulation.Emulated // or ViewEncapsulation.Native or ViewEncapsulation.None
})
export class DescriptionComponent implements OnInit {
    @Input('luDetailsInput') luDetails: any;
    @Input('trashUINotEditableInput') trashUINotEditable: any;

    @ViewChild('editor') editor!: QuillEditorComponent;
    @ViewChild('editor1') editor1!: QuillEditorComponent;
    @ViewChild('editor2') editor2!: QuillEditorComponent;
    @ViewChild('editor3') editor3!: QuillEditorComponent;
    @ViewChild('editor4') editor4!: QuillEditorComponent;

    descriptionForm?: FormGroup;
    selectedLearningUnit: any = {};
    error1 = false;
    error2 = false;
    error3 = false;
    error = false;
    error4 = false;
    enableForm = false;
    quillEditor1: any;
    quillEditor2: any;
    quillEditor3: any;
    quillEditor4: any;
    quillEditor5: any;
    innerWidth;
    window90width: boolean;
    window100width: boolean;
    longDescwordlt;
    Altlongdescwordlt;
    shortDescwordlt;
    AltShortDescwordlt;
    tinyDescwordlt;
    //1422
    //1280
    matTooltipMsg = 'This field isn\'t editable as this learning unit or version has been deleted. Please restore to edit this field';

    constructor(
        private fb: FormBuilder,
        private uiService: UiService,
        private learningUnitService: LearningUnitsService,
        private Config: ConfigurationService,
    ) {
    }

    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.innerWidth = window.innerWidth;
        if (this.innerWidth <= 1280) {
            this.window100width = true;
        }
        if (this.innerWidth >= 1422) {
            this.window90width = true;
        }
        //   this.innerWidth = window.innerWidth;
    }

    ngOnInit(): void {
        this.selectedLearningUnit = this.luDetails;

        this.setDescriptionInfo(this.selectedLearningUnit);

        const formdata = {
            longDescription: this.stripHTML(this.luDetails.longDescription) == 'null' ? '' : this.stripHTML(this.luDetails.longDescription),
            shortDescription: this.stripHTML(this.luDetails.shortDescription) == 'null' ? '' : this.stripHTML(this.luDetails.shortDescription),
            tinyDescription: this.stripHTML(this.luDetails.tinyDescription) == 'null' || 'undefined' ? '' : this.stripHTML(this.luDetails.tinyDescription),
            alternateLongDescription: this.stripHTML(this.luDetails.alternateLongDescription) == 'null' ? '' : this.stripHTML(this.luDetails.alternateLongDescription),
            alternateShortDescription: this.stripHTML(this.luDetails.alternateShortDescription) == 'null' ? '' : this.stripHTML(this.luDetails.alternateShortDescription)
        };

        this.descriptionForm.valueChanges.subscribe((data) => {
            const textdata = {
                longDescription: this.stripHTML(data.longDescription) == 'null' ? '' : this.stripHTML(data.longDescription),
                shortDescription: this.stripHTML(data.shortDescription) == 'null' ? '' : this.stripHTML(data.shortDescription),
                tinyDescription: this.stripHTML(data.tinyDescription) == 'null' ? '' : this.stripHTML(data.tinyDescription),
                alternateLongDescription: this.stripHTML(data.alternateLongDescription) == 'null' ? '' : this.stripHTML(data.alternateLongDescription),
                alternateShortDescription: this.stripHTML(data.alternateShortDescription) == 'null' ? '' : this.stripHTML(data.alternateShortDescription)
            };

            if (JSON.stringify(formdata) !== JSON.stringify(textdata)) {
                this.enableForm = true;
            } else {
                this.enableForm = false;
            }
        });

        this.Config.getDescriptionSizelimit().subscribe((d) => {
            this.Altlongdescwordlt = d.wordLimitforDesc.AlternatelongDesc;
            this.AltShortDescwordlt = d.wordLimitforDesc.AlternateshortDesc;
            this.shortDescwordlt = d.wordLimitforDesc.shortDescription;
            this.longDescwordlt = d.wordLimitforDesc.longDescription;
            this.tinyDescwordlt = d.wordLimitforDesc.tinyDescription;
        });
    }

    saveDescription(form) {
        this.descriptionForm.disable();
        const basicObj = form.value;
        if (basicObj.maturityDoc) {
            delete basicObj['maturityDoc'];
        }
        try {
            this.learningUnitService.updateLU(this.selectedLearningUnit.docId, basicObj);
            this.descriptionForm.enable();
            this.uiService.alertMessage('Saved', 'Successfully Updated', 'success');
            this.enableForm = false;
        } catch (error) {
            this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
        }
    }

    setDescriptionInfo(details) {
        this.descriptionForm = this.fb.group({
            longDescription: this.fb.control(details?.longDescription || '', [Validators.required]),
            shortDescription: this.fb.control(details?.shortDescription || '', []),
            tinyDescription: this.fb.control(details?.tinyDescription || '', []),
            alternateLongDescription: this.fb.control(details?.alternateLongDescription || '', []),
            alternateShortDescription: this.fb.control(details?.alternateShortDescription || '', []),
        });
        if (this.trashUINotEditable == true) {
            this.descriptionForm.disable();
        }
    }

    onEditorCreated(event) {
        this.quillEditor1 = event.editor;
    }

    onEditorCreated1(event) {
        this.quillEditor2 = event.editor;
    }

    onEditorCreated2(event) {
        this.quillEditor3 = event.editor;
    }

    onEditorCreated3(event) {
        this.quillEditor4 = event.editor;
    }

    onEditorCreated4(event) {
        this.quillEditor5 = event.editor;
    }

    limitCharacters(event: any) {
        const quillEditor = event.editor;
        if (this.longDescwordlt > 0) {
            if (event.editor.root.innerText.length > this.longDescwordlt) {
                const sliced = event.editor.root.innerText.substring(0, this.longDescwordlt);
                this.descriptionForm.get('shortDescription').setErrors({ invalid: true });
                event.editor.root.innerHTML = sliced;
                quillEditor.disable();
                this.error = true;
            } else {
                quillEditor.enable();
                this.error = false;
            }
        }
    }


    limitCharacters1(event: any) {
        const maxLength = 250; // Maximum allowed characters
        const quillEditor = event.editor;
        if (this.shortDescwordlt > 0) {
            if (event.editor.root.innerText.length > this.shortDescwordlt) {
                const sliced = event.editor.root.innerText.substring(0, this.shortDescwordlt);
                this.descriptionForm.get('shortDescription').setErrors({ invalid: true });
                event.editor.root.innerHTML = sliced;
                quillEditor.disable();
                this.error1 = true;
            } else {
                quillEditor.enable();
                this.error1 = false;
            }
        }
    }

    limitCharacters2(event) {
        const quillEditor = event.editor;
        if (this.Altlongdescwordlt > 0) {
            if (event.editor.root.innerText.length > this.Altlongdescwordlt) {
                const sliced = event.editor.root.innerText.substring(0, this.Altlongdescwordlt);
                this.descriptionForm.get('shortDescription').setErrors({ invalid: true });
                event.editor.root.innerHTML = sliced;
                quillEditor.disable();
                this.error4 = true;
            } else {
                quillEditor.enable();
                this.error4 = false;
            }
        }
    }

    limitCharacter3(event: any) {
        const maxLength = 250; // Maximum allowed characters
        if (this.AltShortDescwordlt > 0) {
            const quillEditor = event.editor;
            if (event.editor.root.innerText.length > this.AltShortDescwordlt) {
                const sliced = event.editor.root.innerText.substring(0, this.AltShortDescwordlt);
                this.descriptionForm.get('alternateShortDescription').setErrors({ invalid: true });
                event.editor.root.innerHTML = sliced;
                //quillEditor.setText(sliced);
                quillEditor.disable();
                this.error2 = true;
            } else {
                quillEditor.enable();
                this.error2 = false;
            }
        }
    }

    limitCharacter5(event: any) {
        const maxLength = 125; // Maximum allowed characters
        const quillEditor = event.editor;
        if (this.tinyDescwordlt > 0) {
            if (event.editor.root.innerText.length > this.tinyDescwordlt) {
                // Get the current content
                // let sliced= event.editor.root.innerText.split(' ').slice(0,125).join(' ')
                const sliced = event.editor.root.innerText.substring(0, this.tinyDescwordlt);
                this.descriptionForm.get('tinyDescription').setErrors({ invalid: true });
                event.editor.root.innerHTML = sliced;
                quillEditor.disable();
                this.error3 = true;
            } else {
                quillEditor.enable();
                this.error3 = false;
            }
        }
    }

    enableEditor(editor: QuillEditorComponent) {
        editor.quillEditor.enable();
    }

    convertHtmlToText(x) {
        for (const key in x) {
            const htmlContent = x[key];
            const textContent = htmlContent.innerText;
            x[key] = textContent;
        }

        return x;
    }

    stripHTML(html: string): string {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || '';
    }

}
