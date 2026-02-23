import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';

@Component({
  selector: 'app-subject-form',
  templateUrl: './subject-form.component.html',
  styleUrls: ['./subject-form.component.scss']
})
export class SubjectFormComponent implements OnInit {
  @Input() contentInfo;
  @Input() workflowId;

  allRYSICategories: any = {};
  selectedSubjectArr = [];
  selectedCategoryArr = [];
  selectedTopicArr = [];
  selectedLangArr = [];
  formGroup: FormGroup;

  constructor(private configurationService: ConfigurationService, private fb: FormBuilder) { }
  ngOnInit(): void {
    this.formGroup = this.fb.group({
      subject: ['', Validators.required],
      category: [{ value: '', disabled: true }, Validators.required],
      topic: [{ value: '', disabled: true }, Validators.required],
      title: ['', Validators.required],
      description: ['', Validators.required],
      materialUsed: ['', Validators.required],
      additionalLanguage: ['', Validators.required],
    });

    this.configurationService.getRYSICategories().subscribe((categories) => {
      this.allRYSICategories = categories;
      this.selectedLangArr = categories.Languages;
    });
  }
  subjectChange(selectedName) {
    this.selectedCategoryArr = this.allRYSICategories[selectedName];
    this.formGroup.get('category').enable();
  }
  categoryChange(selectedName) {
    this.selectedTopicArr = this.selectedCategoryArr[selectedName];
    this.formGroup.get('topic').enable();
  }
  topicChange(selectedName) {
  }
  languageChange(selectedLang) { }

  getObjectArrWithKey(key) {
  }
}
