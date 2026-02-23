import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UiService } from 'app/shared/ui.service';
import { QuillEditorComponent } from 'ngx-quill';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';

@Component({
  selector: 'app-version-changes',
  templateUrl: './version-changes.component.html',
  styleUrls: ['./version-changes.component.scss']
})
export class VersionChangesComponent implements OnInit {
  @Input() luDetailsInput: any;
  @Input() allLUList: any;
  @Input('trashUINotEditableInput') trashUINotEditable: any;
  @ViewChild('editor') editor!: QuillEditorComponent;

  options: string[] = ['DEVELOPMENT', 'REVIEW', 'LIVE', 'ARCHIVE'];
  selectedLearningUnit: any = {};
  initialValue: any;
  matTooltipMsg = 'This field isn\'t editable as this learning unit or version has been deleted. Please restore to edit this field';
  enableForm = false;
  versionChangeForm: FormGroup;
  quillEditor1: any;

  constructor(
    private fb: FormBuilder,
    private uiService: UiService,
    private learningUnitService: LearningUnitsService,
  ) {
  }

  ngOnInit(): void {
    this.selectedLearningUnit = this.luDetailsInput;
    this.setVersionChange(this.selectedLearningUnit);
    this.initialValue = JSON.parse(JSON.stringify(this.selectedLearningUnit));
    this.versionChangeForm.valueChanges.subscribe((d) => {
      const m = {
        versionNotes: this.stripHTML(d.versionNotes) != 'undefined' ? this.stripHTML(d.versionNotes) : '',
        status: d.status
      };
      const modVer = {
        versionNotes: this.stripHTML(this.initialValue.versionNotes) != 'undefined' ? this.stripHTML(this.initialValue.versionNotes) : '',
        status: this.initialValue.status
      };
      if (m.versionNotes == 'null') {
        m.versionNotes = '';
      }
      if (modVer.versionNotes == 'null') {
        modVer.versionNotes = '';
      }
      if (JSON.stringify(modVer) == JSON.stringify(m)) {
        this.enableForm = false;
      }
      else {
        this.enableForm = true;
      }
    });

  }

  onEditorCreated(event) {
    this.quillEditor1 = event.editor;
  }

  setVersionChange(details) {
    this.versionChangeForm = this.fb.group({
      versionNotes: this.fb.control(details?.versionNotes || '', [Validators.required]),
      status: this.fb.control(details?.status || '', [Validators.required])
    });

    if (this.trashUINotEditable == true) {
      this.versionChangeForm.disable();
    }
  }

  async saveVersionChange(form: FormGroup) {
    const { versionNotes } = form.value;

    try {
      await this.learningUnitService.updateSingleField(this.selectedLearningUnit.docId, 'versionNotes', versionNotes);
      const index = this.allLUList.findIndex(d => d.docId == this.luDetailsInput.docId);
      this.allLUList[index]['status'] = form.value.status;
      this.uiService.alertMessage('Update', 'Updated Successfully', 'success');
      this.enableForm = false;
    }
    catch (error) {
      this.uiService.alertMessage('Update', 'Error Occured', 'error');
    }
  }

  stripHTML(html: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  }

}
