import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddNewLearningUnitComponent } from '../add-new-learningUnit/add-new-learningunit.component';
import { ManageTrashLearningUnitsComponent } from '../../manage-trash-learning-units/manage-trash-learning-units.component';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { tactivity } from 'app/core/dbOperations/learningUnits/learningUnits.types';
import { SortingService } from 'app/shared/sorting.service';
import { lastValueFrom, Subject, take, takeUntil } from 'rxjs';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import * as XLSX from 'xlsx';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { last } from 'lodash';

export interface DialogData {
    docId: string;
    code: string;
    displayName: string;
    headlineImage: string;
    isoCode: string;
    status: string;
    tacArchitect: string;
    tacMentor: string;
    tacOwner: string;
    version: string;
}

@Component({
    selector: 'app-filter-learningunit-list',
    templateUrl: './filter-learning-unit.component.html',
    styleUrls: ['./filter-learning-unit.component.scss'],

})
export class FilterLearningUnitComponent implements OnInit, OnDestroy {
    @Output() changeLang: EventEmitter<any> = new EventEmitter();
    @Output() changeVersion: EventEmitter<any> = new EventEmitter();
    @Output() searchLearningUnitsOutput: EventEmitter<any> = new EventEmitter();
    @Output() updateSearch: EventEmitter<any> = new EventEmitter();

    @Input() allLearningunits: any;
    @Output() newLearningUnitAdded = new EventEmitter<boolean>();
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    allLUcopy: tactivity[];
    subjectTypes;
    domains;
    newlanguages: any;
    versions: string[] = ['All Versions', 'Latest Versions'];
    searchValue: string = '';
    component;
    drawerOpened: any = false;
    allLearningUnits: any;
    exportLoading = false;
    // "SL":index,
    // "T Code":data.learningUnitCode,
    // "Internal Tactivity Name":data.learningUnitName,
    // "TAC Cat":data.type,
    // "MUT Cat":"",
    // "TAC Level":data.Maturity,
    // "TAC Ver":data.version?Number(data.version.split(`V`)[1])/10:'',
    // "MUT Level":"",
    // "MUT Ver":"",
    // "Display Name":data.learningUnitDisplayName,
    headings_ws: string[] = ['SL', 'T Code', 'Internal Tactivity Name', 'TAC Cat', 'MUT Cat', 'TAC Level', 'TAC Ver', 'MUT Level', 'MUT Ver', 'Display Name']; // Replace with actual headings for ws
    headings_ws1: string[] = ['Column1', 'Column2', 'Column3']; // Replace with actual headings for ws1
    headings_ws2: string[] = ['Column1', 'Column2', 'Column3']; // Replace with actual headings for ws2
    constructor(
        private dialog: MatDialog,
        private drawerService: FuseDrawerService,
        private learningUnitService: LearningUnitsService,
        private sortingService: SortingService,
        private configurationService: ConfigurationService
    ) {
    }

    ngOnDestroy() {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    async ngOnInit() {
        this.getalllang();

        setTimeout(() => {
            this.drawerService.drawerOpenTrashLUSubject.pipe(takeUntil(this._unsubscribeAll)).pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
                this.drawerOpened = res;
            });
        }, 2000);

        this.configurationService.getlearningunitSubjecttypes().pipe(take(1)).pipe(takeUntil(this._unsubscribeAll)).subscribe((d) => {
            this.subjectTypes = d?.subjectTypes;
        });

        this.configurationService.getSubjectDomainstypes().pipe(take(1)).pipe(takeUntil(this._unsubscribeAll)).subscribe((d) => {
            this.domains = d?.domains;
        });
    }

    async getLUfromSubscription() {
        return new Promise((resolve, reject) => {
            this.learningUnitService.updatedLUs.pipe(takeUntil(this._unsubscribeAll)).subscribe((d) => {
                resolve(d);
            });
        });
    }

    language(event: any) {
        this.changeLang.emit(event.value);
    }

    version(event: any) {
        this.changeVersion.emit(event.value);
    }

    search(event: any) {
        const val = this.sortingService.checkType(event);
        this.searchLearningUnitsOutput.emit(val);
    }

    async openDialog() {

        await import('../add-new-learningUnit/add-new-learningunit.module').then(async () => {
            const dialogRef = this.dialog.open(AddNewLearningUnitComponent, {
                data: {
                    allTACS: await this.getLUfromSubscription(),
                    languages: this.newlanguages,
                    subjecTtypes: this.subjectTypes,
                    domains: this.domains
                },
            });
            dialogRef.afterClosed().pipe(takeUntil(this._unsubscribeAll)).subscribe((result) => {
                if (result) {

                    this.newLearningUnitAdded.emit(true);
                    this.updateSearch.emit(true);
                }
            });
        });
    }

    async viewTrashLU() {
        await import('../../manage-trash-learning-units/manage-trash-learning-units.module').then(() => {
            this.component = ManageTrashLearningUnitsComponent;
        });
        this.drawerService.drawerOpenTrashLUSubject.next(true);
    }

    getalllang() {
        this.learningUnitService.languagesSub.pipe(takeUntil(this._unsubscribeAll)).subscribe(async (data) => {

           const configLang= await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('Languages'));

            this.newlanguages = data?data:configLang?.get('langTypes');

        });
    }

    async exportLUjson() {
        this.exportLoading = true;
        const documents = await this.getAllLearningUnits();
        const docsdata = this.getDocsData(documents).filter(d => d.docId != '{code}-{en}-{v10}');
        this.getExcelFile(docsdata);
        this.exportLoading = false;
    }

    async getAllLearningUnits() {
        return new Promise((resolve, reject) => {
            this.learningUnitService.getAllLUFromLUcoll().pipe(takeUntil(this._unsubscribeAll)).subscribe((d) => {
                resolve(d.docs.map(m => m.data()));
            });
        });
    }

    getDocsData(documents) {
        const docs = [];
        documents.forEach((d) => {
            docs.push(d);
        });
        return docs;
    }

    getExcelFile(data) {
        let filteredData = [];
        let filteredData1 = [];
        let filteredData2 = [];

        filteredData = data.map((data, index) => ({
            'SL': index,
            'T Code': data.learningUnitCode,
            'Internal Tactivity Name': data.learningUnitName,
            'TAC Cat': data.type,
            'MUT Cat': '',
            'TAC Level': data.Maturity,
            'TAC Ver': data.version ? Number(data.version.split('V')[1]) / 10 : '',
            'MUT Level': '',
            'MUT Ver': '',
            'Display Name': data.learningUnitDisplayName,
        }));

        filteredData1 = data.map((data, index) => ({
            'SL': index,
            'T Code': data.learningUnitCode,
            'TACtivity Name': data.learningUnitName,
            'TAC Short Description': data.shortDescription,
            'TAC Description': data.longDescription,
            'MUT Description': '',
        }));

        filteredData2 = data.map((data, index) => ({
            'SL': index,
            'T Code': data.learningUnitCode,
            'TACtivity Name': data.learningUnitName,
            'Domain': data.domain,
            'Making Time(Mts)': data.makingTime,
            'Obs Time(Mts)': data.observationTime,
            'Samples': data.samples,
            'Tools': data.tools.length > 0 || data.tools != '' ? JSON.stringify(data.tools) : '',
            'Template(0-10)': '',
            'Tool TAC Code#1': '',
            'Tool TAC Code#2': '',
            'Replacement(if Obsolete)': data.replacementLearningUnits.length > 0 || data.replacementLearningUnits != '' ? JSON.stringify(data.replacementLearningUnits) : '',
            'Topic Count': '',
            'TAC Owner': data.tacOwnerName,
            'Multiuse Owner': '',
            'TAC URL(Permanent for Ver) English': '',
            'TAC Google Directory Link': '',
            'TTT Google Directory Link': ''
        }));

        // data[index].additionalResources = JSON.stringify(data[index].additionalResources)
        // data[index].associatedLearningUnits = JSON.stringify(data[index].associatedLearningUnits)
        // data[index].creationDate = new Date(
        //     data[index].creationDate.seconds * 1000 + data[index].creationDate.nanoseconds / 1e6
        // );
        // data[index].resources = JSON.stringify(data[index].resources)
        // data[index].similarLearningUnits = JSON.stringify(data[index].similarLearningUnits)
        // if (typeof (data[index]?.updatedAt) != 'undefined') {
        //     data[index].updatedAt = new Date(
        //         data[index]?.updatedAt?.seconds * 1000 + data[index]?.updatedAt?.nanoseconds / 1e6
        //     );
        // }
        // else {
        //     data[index].updatedAt = null
        // }
        // data[index].tags = JSON.stringify(data[index].tags)
        // data[index].associatedTACs = JSON.stringify(data[index].associatedTACs)
        // if (typeof (data[index]?.firstLiveDate) != 'undefined') {
        //     data[index].firstLiveDate =
        //         new Date(
        //             data[index].firstLiveDate = data[index]?.firstLiveDate?.seconds * 1000 + data[index]?.firstLiveDate?.nanoseconds / 1e6
        //         );
        // }
        // else {
        //     data[index].firstLiveDate = null
        // }
        // if (typeof (data[index]?.trashAt) != 'undefined') {
        //     data[index].trashAt =
        //         new Date(
        //             data[index].trashAt = data[index]?.trashAt?.seconds * 1000 + data[index]?.trashAt?.nanoseconds / 1e6
        //         );
        // }
        // else {
        //     data[index].trashAt = null
        // }
        // delete data[index].masterDocId;
        // delete data[index].name;
        //  })
        //--------------------------commented out------------------------
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredData);
        const ws1: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredData1);
        const ws2: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredData2);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'TAC Mastersheet');
        XLSX.utils.book_append_sheet(wb, ws1, 'TAC Description');
        XLSX.utils.book_append_sheet(wb, ws2, 'TAC Details');
        //    let headings_ws: string[] = ['SL', 'T Code', 'Internal Tactivity Name','TAC Cat','MUT Cat','TAC Level','TAC Ver','MUT Level','MUT Ver','Display Name']; // Replace with actual headings for ws
        //--------------------------------------------------------------------------------------
        // const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(
        //     filteredData
        //   );
        // Make first row bold
        // for(let i = 0; i < headings_ws.length; i++) {
        //     const cell = ws[XLSX.utils.encode_cell({r: 0, c: i})];
        //     // Create new style if cell doesnt have a style yet
        //     if(!cell.s) {cell.s = {};}
        //     if(!cell.s.font) {cell.s.font = {};}
        //     // Set bold
        //     cell.s.font.bold = true;
        // }
        // XLSX.utils.sheet_add_aoa(ws, [headings_ws], { origin: 'A1' });
        // XLSX.utils.book_append_sheet(wb, ws, 'TAC Mastersheet');
        // for(let i = 0; i < headings_ws.length; i++) {
        //     const cell = ws[XLSX.utils.encode_cell({r: 0, c: i})];
        //     // Create new style if cell doesnt have a style yet
        //     if(!cell.s) {cell.s = {};}
        //     if(!cell.s.font) {cell.s.font = {};}
        //     // Set bold
        //     console.log(cell.s.font)
        //     cell.s.font.bold = true;
        // }
        XLSX.writeFile(wb, 'LearningUnitData.xlsx');
    }

}
