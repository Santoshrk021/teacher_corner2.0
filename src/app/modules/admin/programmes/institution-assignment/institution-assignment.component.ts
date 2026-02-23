import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UiService } from 'app/shared/ui.service';
import { first, lastValueFrom, map, Observable, startWith } from 'rxjs';

@Component({
  selector: 'app-institution-assignment',
  templateUrl: './institution-assignment.component.html',
  styleUrls: ['./institution-assignment.component.scss']
})
export class InstitutionAssignmentComponent implements OnInit {
  @Input() programDetails: any;

  institutions: any[] = [];
  addInstitution = this.fb.group({
    institution: [[], [Validators.required]]
  });
  isProgrammeNameHasInstitution: boolean = false;
  filteredOptionsInstitutions: Observable<Array<any>>;
  countryBoard: any;
  isDataLoaded: boolean = false;

  constructor(
    private institutionService: InstitutionsService,
    private masterService: MasterService,
    private fb: FormBuilder,
    private programmeService: ProgrammeService,
    private uiService: UiService,
  ) { }

  ngOnInit(): void {
    this.checkForInstitution();

    this.isDataLoaded = true;

    this.filteredOptionsInstitutions = this.addInstitution.get('institution').valueChanges.pipe(
      startWith(''),
      map(value => this._filter(value)),
    );
  }

  private _filter(value: any): Array<any> {
    const filterValue = !value.length ? '' : value?.toLowerCase();
    return this.institutions?.filter(option => option?.institutionName?.toLowerCase()?.includes(filterValue));
  }

  displayInstitution = (institution: any): string =>
    // Use arrow function to ensure "this" context is preserved
     institution.institutionName
  ;

  getInstitutionName(programmeName) {
    const wordsArr = programmeName.split(' ');
    const filteredB = wordsArr.filter(d => !['Physics', 'Chemistry', 'Mathematics', 'Math', 'Maths', 'Biology', 'Grade', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].includes(d));
    const institutionName = filteredB.join(' ');
    return institutionName;
  }

  removeLastWord(spaceSeparatedString) {
    const arrayOfWords = spaceSeparatedString.split(' ');
    arrayOfWords.pop();
    const updatedSpaceSeparatedString = arrayOfWords.join(' ');
    return updatedSpaceSeparatedString;
  }

  async checkForInstitution() {
    const programmeName = this.programDetails?.programmeName;
    let probableInstitutionName = this.getInstitutionName(programmeName);

    const masterInstitutionArray = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames').pipe(first()));
    let institutionMasterArr = masterInstitutionArray.filter(doc => doc.institutionName.includes(probableInstitutionName));

    if (!institutionMasterArr.length) {
      probableInstitutionName = this.removeLastWord(probableInstitutionName);
      if (probableInstitutionName?.length) {
        institutionMasterArr = masterInstitutionArray.filter((doc) => {
          if (doc.institutionName.includes(probableInstitutionName)) {
            return doc;
          }
        });

        if (!institutionMasterArr.length) {
          this.institutions = masterInstitutionArray;
          this.isProgrammeNameHasInstitution = false;
        } else {
          this.isProgrammeNameHasInstitution = true;
        };
      }
    }

    if (institutionMasterArr?.length) {
      institutionMasterArr.forEach(async (doc) => {
        const getIDoc = await lastValueFrom(this.institutionService.getWithId(doc?.docId));
        if (getIDoc) {
          this.institutions.push(getIDoc);
        }
      });
    }
  }

  searchInstitution(event: any) {
    const searchValue = event.target.value.toLowerCase();
    if (searchValue) {
      this.institutions = this.institutions.filter(institution => institution.institutionName.toLowerCase().includes(searchValue));
    } else {
      this.checkForInstitution();
    }
  }

  extractGrade(string) {
    const result = string.replace(/[^0-9]/g, '');
    return Number(result);
  }

  async onSubmit(form) {
    const institution = form.value.institution;
    const gradeArr = [];
    gradeArr.push(this.extractGrade(this.programDetails?.programmeName));

    const programmeObj = {
      institutionId: institution.institutionId ?? institution.docId,
      institutionName: institution.institutionName,
      // grades: gradeArr,
      programmeId: this.programDetails?.programmeId,
      masterDocId: this.programDetails?.masterDocId,
    };

    try {
      await Promise.all(Object.entries(programmeObj).map(async ([key, value]) => {
        if (value) {
          await this.masterService.updateMasterDocField(programmeObj.masterDocId, programmeObj.programmeId, 'programmes', key, value);
          await this.programmeService.updateProgrammeSingleField(programmeObj.programmeId, key, value);
        }
      }));
      this.uiService.alertMessage('Success', 'Institution Added Successfully for Programme', 'success');
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error while adding institution to programme', 'error');
      console.error('Error while adding institution to programme', error);
    };
  }
}
