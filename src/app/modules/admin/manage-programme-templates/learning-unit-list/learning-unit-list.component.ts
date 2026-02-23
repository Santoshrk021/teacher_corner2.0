import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, Input, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, first, lastValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-learning-unit-list',
  templateUrl: './learning-unit-list.component.html',
  styleUrls: ['./learning-unit-list.component.scss']
})
export class LearningUnitListComponent implements OnInit, OnDestroy {
  @Input() stepper: MatStepper;
  @Input() stepperData: BehaviorSubject<any>;
  @Input() addNewTemplateFlag: string;
  @Input() templateDetails: any;
  @Input() addNewTemplate: any;

  selectLearningListForm: FormGroup;
  templateData: any;
  selectedLearningunits: any = [];  // handling selected learningunits
  filteredLearningunits: any = [];  // storing the filtered data when search input is made
  previousLearningunits: any;
  learningunits: any;                // storing all learning units
  learningunitsCopy: any;            // storing the duplicate copy of learning units for search function
  subcriptionsRefArr: Subscription[] = [];
  filterOptions: any[] = ['UPLOAD', 'QUIZ'];
  newlanguages: any;
  isDataLoaded: boolean = false;

  constructor(
    public templateService: ProgrammeTemplateService,
    private masterService: MasterService,
    private fb: FormBuilder,
    private uiService: UiService,
    private config: ConfigurationService,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.templateDetails) {
      const programmeLuIds = this.templateDetails?.learningUnitsIds;
    };
  }

  ngOnDestroy(): void {
    if (this.subcriptionsRefArr.length) { this.subcriptionsRefArr.map(d => d.unsubscribe()); }
  };

  async ngOnInit(): Promise<void> {
    this.newlanguages = await this.config.getLanguageListForProgrammes();
    const allLearningUnits = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('LEARNINGUNIT', 'tacNames').pipe(first()));
    if (!allLearningUnits.length) {
      console.error('No learning units found');
    } else {
      const filteredLearningunits = allLearningUnits.filter(lu => lu.status === 'LIVE');
      const allLUData: any[] = filteredLearningunits.sort((x, y) => y.creationDate - x.creationDate);
      if (typeof (allLUData) !== 'undefined') {
        this.getAct(allLUData);
      };
      this.isDataLoaded = true;
    }
  }

  async getAct(data) {
    this.learningunits = data;
    this.learningunitsCopy = data;
    let templateLuIds;
    if (!this.addNewTemplateFlag) {
      const templateDetails: any = await lastValueFrom(this.templateService.getProgrammeTemplateById(this.templateDetails.templateId).pipe(first()));
      this.templateDetails = templateDetails;
      templateLuIds = templateDetails?.learningUnitsIds;
    };

    this.previousLearningunits = this.learningunits?.filter(data => templateLuIds?.includes(data.docId));

    const luArr = templateLuIds?.map(docId => this.previousLearningunits.find((doc: any) => doc.docId == docId));

    if (templateLuIds?.length != 0) {
      this.learningunits = this.learningunits.filter(data => !templateLuIds?.includes(data.docId));
    };

    if (typeof (luArr) !== 'undefined') {
      this.selectedLearningunits = luArr;
    }
    else {
      this.selectedLearningunits = [];
    };

    this.selectLearningListForm = this.fb.group({
      selectedLearningList: [this.selectedLearningunits || [], [Validators.required]],
    });
  }

  templateInfo(data) {
    this.templateData = data;
  }

  drop(event: CdkDragDrop<string[]>) {
    if (event?.previousContainer === event?.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer?.data,
        event?.container.data,
        event?.previousIndex,
        event?.currentIndex
      );

      if (this.addNewTemplateFlag) {
        this.stepperData?.subscribe((data) => {
          this.templateInfo(data);
        });
      };

      this.selectLearningListForm.patchValue({
        selectedLearningList: this.selectedLearningunits,
      });

      if (this.addNewTemplateFlag) {
        this.stepperData.next({
          ...this.stepperData.value,
          selectedLearninglist: this.selectLearningListForm.controls?.selectedLearningList?.value
        });
      };
    };
  }

  async onSubmit(form: FormGroup) {
    if (this.addNewTemplateFlag) {
      console.error('nothing to be done here');
    }
    else {
      const { docId, masterDocId } = this.templateDetails;
      const updatedLearningUnitsIds = form.get('selectedLearningList').value.map((d: any) => d['docId']);

      try {
        await this.masterService.updateMasterDocField(masterDocId, docId, 'programmeTemplates', 'learningUnitsIds', updatedLearningUnitsIds);
        await this.templateService.updateProgrammeTemplateSingleField(docId, 'learningUnitsIds', updatedLearningUnitsIds);
        this.updateLearningUnits();
        this.uiService.alertMessage('Successful', 'Programme Template Updated Successfully', 'success');
      } catch (error) {
        this.uiService.alertMessage('Error', 'Error Updating Programme Template', 'error');
        console.error('Error Updating Programme Template:', error);
      }
    };
  }

  updateLearningUnits() {
    this.masterService.getAllMasterDocsMapAsArray('LEARNINGUNIT', 'tacNames').pipe(first()).subscribe((res) => {
      const allLUData: any[] = res.sort((x, y) => y.creationDate - x.creationDate);
    });
  }

  getdata(data) {
    setTimeout(() => {
      this.learningunits = data;
      this.learningunitsCopy = data;

      const templateLuIds = this.templateDetails?.learningUnitsIds;
      this.previousLearningunits = this.learningunits?.filter(data => templateLuIds?.includes(data.docId));

      const luArr = templateLuIds?.map(docId => this.previousLearningunits.find((doc: any) => doc.docId == docId));

      if (templateLuIds?.length != 0) {
        this.learningunits = this.learningunits.filter(data => !templateLuIds?.includes(data.docId));
      };

      if (typeof (luArr) !== 'undefined') {
        this.selectedLearningunits = luArr;
      }
      else {
        this.selectedLearningunits = [];
      };

      this.selectLearningListForm = this.fb.group({
        selectedLearningList: [this.selectedLearningunits || [], [Validators.required]],
      });
    }, 5000);
  }

  filterLearningunit(ev: any) {
    const val = ev.target.value;
    if (val && val.trim() != '') {
      this.filteredLearningunits = this.learningunitsCopy.filter(item => ((item.learningUnitDisplayName.toLowerCase().includes(val.toLowerCase())) ||
        (item.isoCode.toLowerCase().includes(val.toLowerCase())) || (item.learningUnitCode.toLowerCase().includes(val.toLowerCase()))));
      this.learningunits = this.filteredLearningunits;
    }
    else {
      this.learningunits = this.learningunitsCopy;
    };
  }

  async getalllang() {
    return new Promise((resolve, reject) => {
      // this.config.languagesSub.subscribe((data) => {
      //     resolve(data)
      // })
      this.config.getLanguageListForProgrammes().then((d) => {
      });
    });
  }

  selectedLang(event) {
    this.learningunits = this.learningunitsCopy;
    this.learningunits = this.learningunits.filter(e => e.isoCode == event.value);
  }

}
