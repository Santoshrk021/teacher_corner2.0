import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { first, lastValueFrom, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-programme-template',
  templateUrl: './programme-template.component.html',
  styleUrls: ['./programme-template.component.scss']
})
export class ProgrammeTemplateComponent implements OnInit, OnDestroy {
  @Input() instituteInfo: any;
  @Output() programmeTemplateEmitter: EventEmitter<any> = new EventEmitter();
  @Input() stepper: any;

  gradeList: Array<number> = [];
  sectionList: Array<string> = [];
  gradeSectionObject: Record<number, { sections: string[]; exhaustedSection: string[] }> = {};
  templateForm = new FormGroup({
    classInfoArray: new FormArray([])
  });
  classroomObj: Record<string, string[]> = {};
  private _unsubscribeAll = new Subject<void>();
  disableAddButton: boolean = false;
  programmeTemplateArray: Array<any> = [];
  filteredSubjectListObj = {};
  filteredTemplateListObj = {};
  filteredTemplateListObjSet = {};
  isLoaded: boolean = false;

  constructor(
    private fb: FormBuilder,
    private configurationService: ConfigurationService,
    private masterService: MasterService,
    private fuseConfirmationService: FuseConfirmationService,
  ) { }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit(): Promise<void> {
    await lastValueFrom(this.configurationService.getProgrammeTemplateObject().pipe(first())).then(({ sectionList, gradeList }) => {
      [this.sectionList, this.gradeList,] = [sectionList, gradeList];
    });
    const programmeTemplates = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('PROGRAMME_TEMPLATE', 'programmeTemplates').pipe(first()));
    this.programmeTemplateArray = Object.values(programmeTemplates);
    this.isLoaded = true;
  }

  get classInfo(): FormArray {
    return this.templateForm.get('classInfoArray') as FormArray;
  }

  newClassInfo() {
    const fbGroup = this.fb.group({
      grade: [null, Validators.required],
      section: [{ value: '', disabled: true }],
      availableSections: [],
      subject: [{ value: '', disabled: true }],
      availableSubjects: [],
      programmeTemplate: [{ value: '', disabled: true }],
      availableProgrammes: [],
    });

    const watchList = ['grade', 'section', 'subject', 'programmeTemplate'];
    const unlockList = ['section', 'subject', 'programmeTemplate', ''];
    for (let i = 0; i < watchList.length; i++) {
      this.unlockFormSequentially(fbGroup, watchList[i], unlockList[i]);
    };

    return fbGroup;
  }

  removeClassInfo(index: number) {
    const classInfoItem = this.classInfo.at(index);
    const formValue = classInfoItem.getRawValue();
    const { grade, section, subject } = formValue;

    if (Object.values(formValue).every(value => value !== null)) {
      this.resetExhaustedSection(grade, section);
      this.resetSelectedSubject(grade, section, subject);
    };

    this.classInfo.removeAt(index);
    this.disableAddButton = false;
  }

  resetExhaustedSection(grade: number, section: string) {
    const exhaustedSections = this.gradeSectionObject[grade]?.exhaustedSection;
    if (exhaustedSections?.includes(section)) {
      exhaustedSections.splice(exhaustedSections.indexOf(section), 1);
      if (!this.gradeSectionObject[grade].sections.includes(section)) {
        this.gradeSectionObject[grade].sections.push(section);
        this.gradeSectionObject[grade].sections.sort();
      } else {
        console.error('Section already exists in the section list');
      };
    };
  }

  resetSelectedSubject(grade: number, section: string, subject: string) {
    const classroomKey = `${grade}-${section}`;
    const subjectList = this.classroomObj[classroomKey];
    if (subjectList) {
      const subjectIndex = subjectList.indexOf(subject);
      if (subjectIndex > -1) {
        subjectList.splice(subjectIndex, 1);
      }
    }
  }

  addClassInfo() {
    this.classInfo?.push(this.newClassInfo());
    this.disableAddButton = true;
  }

  onGradeChange(formInfo: FormGroup, index: number) {
    const grade = formInfo.get('grade').value;

    if (!this.gradeSectionObject.hasOwnProperty(grade)) {
      this.gradeSectionObject[grade] = { sections: [...this.sectionList], exhaustedSection: [] };
    };

    const exhaustedSections = this.gradeSectionObject[grade].exhaustedSection;
    if (exhaustedSections.length) {
      const lastExhaustedSection = exhaustedSections[exhaustedSections.length - 1];
      const sectionIndex = this.gradeSectionObject[grade].sections.indexOf(lastExhaustedSection);
      this.gradeSectionObject[grade].sections.splice(sectionIndex, 1);
    };


    this.classInfo?.at(index).patchValue({
      availableSections: this.sectionList.filter(section => !this.gradeSectionObject[grade].exhaustedSection.includes(section))
    });

    // formInfo.get('section').enable();
  }

  onSectionChange(formInfo: FormGroup) {
    const grade = formInfo.get('grade').value;
    const section = formInfo.get('section').value;
    const key = `${grade}-${section}`;

    this.filteredTemplateListObj[grade] = this.programmeTemplateArray
      .filter(element =>
        element.grade === grade &&
        element.board === this.instituteInfo?.board &&
        element.learningUnitsIds.some(id => id.trim() !== '')
      )
      .map(element => ({
        ...element,
        learningUnitsIds: element.learningUnitsIds.filter(id => id.trim() !== '') // Remove invalid entries
      }));

    this.filteredSubjectListObj[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map(element => element.subject))).sort();

    const availableSubjects = this.classroomObj.hasOwnProperty(key)
      ? this.filteredSubjectListObj[grade].filter(subject => !this.classroomObj[key].includes(subject))
      : this.filteredSubjectListObj[grade];

    formInfo.patchValue({ availableSubjects });

    // formInfo.get('subject').enable();
  }

  onSubjectChange(formInfo: FormGroup) {
    const grade = formInfo.get('grade').value;
    const section = formInfo.get('section').value;
    const subject = formInfo.get('subject').value;
    const key = `${grade}-${section}`;

    this.filteredTemplateListObj[grade] = this.programmeTemplateArray.filter(element => element.subject === subject && element.grade === grade && element.board === this.instituteInfo?.board && element.learningUnitsIds.length > 0);
    this.filteredTemplateListObjSet[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map(element => element.templateCategory))).sort();

    if (this.classroomObj.hasOwnProperty(key)) {
      this.classroomObj[key] = [subject, ...this.classroomObj[key]];

      if (this.classroomObj[key].length == this.filteredSubjectListObj[grade].length) {
        this.gradeSectionObject[grade].exhaustedSection.push(section);
      };
    }
    else {
      this.classroomObj[key] = [subject];
      if (this.classroomObj[key].length == this.filteredSubjectListObj[grade].length) {
        this.gradeSectionObject[grade].exhaustedSection.push(section);
      };
    };
    formInfo.patchValue({ availableProgrammes: this.filteredTemplateListObjSet[grade] });
  }

  onProgrammeTemplateChange(formInfo: FormGroup) {
    this.disableAddButton = false;
    formInfo.disable();
  }

  onSubmit(form) {
    const classroomInfoArray = form.get('classInfoArray').value;
    if (classroomInfoArray && classroomInfoArray.length) {
      this.programmeTemplateEmitter.emit(form.getRawValue());
      this.stepper.next();
    } else {
      const config = {
        title: 'Template Does not Exist for This Board',
        message: `There is no template available for the board "${this.instituteInfo?.board}". The CBSE template will be used to create this institution. Do you want to proceed?`,
        icon: {
          show: false
        }
      };
      const dialogRef = this.fuseConfirmationService.open(config);
      dialogRef.afterClosed().subscribe(async (result) => {
        if (result === 'confirmed') {
          this.programmeTemplateEmitter.emit(form.getRawValue());
          this.stepper.next();
        }
        else {
          this.programmeTemplateEmitter.emit(form.getRawValue());
          this.stepper.next();
        }
      });
    }
  }

  unlockFormSequentially(formGroup: FormGroup, watch: string, unlock: string) {
    switch (watch) {
      default:
        formGroup?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe((res) => {
          if (res) {
            formGroup?.get(unlock)?.enable();
          };
        });
        break;
    };
  }

}
