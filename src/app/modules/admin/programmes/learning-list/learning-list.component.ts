import { Component, Input, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FormGroup } from '@angular/forms';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { Subscription } from 'rxjs/internal/Subscription';
import { MatStepper } from '@angular/material/stepper';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UiService } from 'app/shared/ui.service';
import { first, firstValueFrom, lastValueFrom } from 'rxjs';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
export interface TACtivity {
    tacName: string;
    tacCode: string;
    tacVersion: string;
    tacLanguage: string;
    headlineImage: string;
    longDescription: string;
    shortDescription: string;
    observationSheetUrl: string;
}

@Component({
    selector: 'app-learning-list',
    templateUrl: './learning-list.component.html',
    styleUrls: ['./learning-list.component.scss']
})

export class LearningListComponent implements OnInit {
    @Input() stepper: MatStepper;
    @Input() stepperData: BehaviorSubject<any>;
    @Input() addNewProgramFlag: string;
    @Input() programDetails: any;
    @Input() addNewProgramme: any;

    selectLearningListForm: FormGroup;
    programmeData: any;
    previousLearningunits: any;
    selectedLearningunits: any = []; // handling selected learning units
    filteredLearningunits: any = []; // storing the filtered data when search input is made
    learningunits: any; //storing all learning units
    learningunitsCopy: any; // storing the duplicate copy of learning units for search function
    subcriptionsRefArr: Subscription[] = [];
    filterOptions: any[] = ['UPLOAD', 'QUIZ'];
    newlanguages: any;
    selectedIsoCode: string = '';
    searchTerm: string = '';
    loading: boolean = false;
    isDataLoaded: boolean = false;

    constructor(
        private masterService: MasterService,
        private fb: FormBuilder,
        private programmeService: ProgrammeService,
        private uiService: UiService,
        private config: ConfigurationService
    ) {
        this.selectedLearningunits = [];
    }

    ngOnDestroy(): void {
        if (this.subcriptionsRefArr.length) {this.subcriptionsRefArr.map(d => d.unsubscribe());}
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.programDetails) {
            const programmeLuIds = this.programDetails?.learningUnitsIds;
        };
    }

    async ngOnInit() {
        const languageList = await lastValueFrom(this.config.getConfigurationDocumentOnce('Languages'));
        this.newlanguages = languageList?.get('langTypes');

        const allLearningUnits = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('LEARNINGUNIT', 'tacNames').pipe(first()));
        if (!allLearningUnits.length) {
            console.error('No learning units found');
        } else {
            const filteredLearningunits = allLearningUnits.filter(lu => lu.status === 'LIVE');
            const sortedLearningUnits = filteredLearningunits.sort((a, b) => b.creationDate - a.creationDate);
            this.getAct(sortedLearningUnits);
            this.isDataLoaded = true;
        };
    }

    async getAct(data: any) {
        this.learningunits = data;
        this.learningunitsCopy = data;
        let programmeLuIds: any;

        if (!this.addNewProgramFlag) {
            if (this.programDetails.hasOwnProperty('learningUnitsIds') && this.programDetails.learningUnitsIds.length > 0) {
                programmeLuIds = this.programDetails.learningUnitsIds;
            } else {
                const programDetails: any = await firstValueFrom(this.programmeService.getProgrammeDocDataById(this.programDetails.programmeId));
                this.programDetails = programDetails;
                programmeLuIds = programDetails?.learningUnitsIds;
            };
        }

        this.previousLearningunits = this.learningunits?.filter((data: any) => programmeLuIds?.includes(data?.docId));

        const luArr = programmeLuIds?.map((docId: string) => this.previousLearningunits.find((doc: any) => doc?.docId == docId));

        if (programmeLuIds?.length != 0) {
            this.learningunits = this.learningunits.filter((data: any) => !programmeLuIds?.includes(data?.docId));
        }

        if (typeof (luArr) !== 'undefined') {
            this.selectedLearningunits = luArr;
        }
        else {
            this.selectedLearningunits = [];
        }

        this.selectLearningListForm = this.fb.group({
            selectedLearningList: [this.selectedLearningunits || [], Validators.required],
        });
    }

    drop(event: CdkDragDrop<string[]>) {
        if (event?.previousContainer === event?.container) {
            moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
        } else {
            transferArrayItem(event.previousContainer?.data,
                event?.container.data,
                event?.previousIndex,
                event?.currentIndex);

            if (this.addNewProgramFlag) {
                this.stepperData?.subscribe((data) => {
                    this.programmeData = data;
                });
            }

            this.selectLearningListForm?.patchValue({
                selectedLearningList: this.selectedLearningunits,
            });

            if (this.addNewProgramFlag) {
                this.stepperData.next({
                    ...this.stepperData.value,
                    selectedLearninglist: this.selectLearningListForm.controls?.selectedLearningList?.value
                });
            }
        }
    }

    async onSubmit(form) {
        this.loading = true;
        if (this.addNewProgramFlag) {
        }
        else {
            const programmeId = this.programDetails.programmeId;
            const learningUnitsIds = form.controls.selectedLearningList.value.map((d: any) => d['docId']);
            const masterDocId = this.programDetails.masterDocId;

            try {
                await this.masterService.updateMasterDocField(masterDocId, programmeId, 'programmes', 'learningUnitsIds', learningUnitsIds);
                await this.programmeService.updateProgrammeSingleField(programmeId, 'learningUnitsIds', learningUnitsIds);
                this.uiService.alertMessage('Success', 'Learning Unit List Updated Successfully', 'success');
            } catch (error) {
                this.uiService.alertMessage('Error', 'Error Updating Learning Unit List', 'error');
                console.error('Error updating learning unit list: ', error);
            }
        };
        this.loading = false;
    }

    filterLearningunit(ev: any) {
        const val = ev.target.value;
        this.searchTerm = val;

        this.filteredLearningunits = this.learningunitsCopy.filter((item) => {
            const matchesSearch = (item.learningUnitDisplayName.toLowerCase().includes(val.toLowerCase())) ||
                (item.isoCode.toLowerCase().includes(val.toLowerCase())) ||
                (item.learningUnitCode.toLowerCase().includes(val.toLowerCase()));

            const matchesIsoCode = !this.selectedIsoCode || item.isoCode === this.selectedIsoCode;

            return matchesSearch && matchesIsoCode;
        });

        // Update the learningunits list based on the search and selected language
        this.learningunits = this.filteredLearningunits;
    }

    selectedLang(event: any) {
        this.selectedIsoCode = event.value;
        this.filteredLearningunits = this.learningunitsCopy.filter((e: any) => e.isoCode === this.selectedIsoCode);
        if (this.searchTerm.trim() !== '') {
            this.filteredLearningunits = this.filteredLearningunits.filter(item =>
                item.learningUnitDisplayName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                item.isoCode.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                item.learningUnitCode.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }

        this.learningunits = this.filteredLearningunits;
    }

}
