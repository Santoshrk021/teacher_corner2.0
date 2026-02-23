import { Component, Input, OnInit, AfterViewInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { LearningunitdialogComponent } from '../../learningunitdialog/learningunitdialog.component';
import { MatDialog } from '@angular/material/dialog';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { UiService } from 'app/shared/ui.service';
import { tactivity } from 'app/core/dbOperations/learningUnits/learningUnits.types';

@Component({
    selector: 'app-associated-lu',
    templateUrl: './associated-lu.component.html',
    styleUrls: ['./associated-lu.component.scss']
})
export class AssociatedLUComponent implements OnInit, AfterViewInit {
    @Input('luDetailsInput') luDetails: any;
    @Input() allLUList: any;
    associatedLuForm: FormGroup;
    associatedLu: tactivity[] = [];
    prerequisiteLu: any[] = [];
    similarLu: tactivity[] = [];
    selectedLUList: tactivity[];
    selectedLUCopy: any[];
    enableForm = false;
    selectedLearningUnit: any = {
        associatedLearningUnits: [],
        prerequisiteLearningUnits: [],
        similarLearningUnits: [],
    };

    @Input('trashUINotEditableInput') trashUINotEditable: any;
    matTooltipMsg = 'This field isn\'t editable as this learning unit or version has been deleted. Please restore to edit this field';

    constructor(
        private dialog: MatDialog,
        private uiService: UiService,
        private luService: LearningUnitsService
    ) { }

    ngOnInit(): void {
    }

    async ngAfterViewInit(): Promise<void> {
        this.associatedLu = await this.getLinkedLUList(this.luDetails['associatedLearningUnits'] || []);
        this.prerequisiteLu = await this.getLinkedLUList(this.luDetails['prerequisiteLearningUnits'] || []);
        this.similarLu = await this.getLinkedLUList(this.luDetails['similarLearningUnits'] || []);
        this.selectedLUCopy = JSON.parse(JSON.stringify({
            associatedtags: this.associatedLu,
            prerequisitetag: this.prerequisiteLu,
            similartags: this.similarLu
        }));
    }

    async learingUnitDialog(lutype: string, selectedLUList) {
        await import('../../learningunitdialog/learningunitdialog.component').then(() => {
            const dialogRef = this.dialog.open(LearningunitdialogComponent, {
                data: {
                    allLUList: this.allLUList,
                    selectedLUList: selectedLUList,
                    luType: lutype
                }
            });
            dialogRef.backdropClick().subscribe(async () => {
                // Handle the event here
                const d: any = await this.getDataFromdialog();
                const action=d?.action;
                const changedLUs: any = {
                    associatedtags: this.associatedLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version })),
                    prerequisitetag: this.prerequisiteLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version })),
                    similartags: this.similarLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version }))
                };
                changedLUs[d?.type] = d?.selectedLU;
                const luModified = JSON.stringify(changedLUs);
                const OldData = JSON.stringify(this.selectedLUCopy);
                if (OldData != luModified) {
                    this.enableForm = true;
                }
                else {
                    this.enableForm = false;
                }
            });
            dialogRef.afterClosed().subscribe(async (result: any) => {
                if(typeof(result)!=='undefined'){
                    if (result?.event == 'add') {
                        this.addtactivity(result.data, lutype);
                    }
                    else {
                        this.remove(result?.data, lutype);
                    }
                }
                else{
                    const d: any = await this.getDataFromdialog();
                    const action=d?.action;
                    if (action == 'add') {
                        this.addtactivity(d.selectedLU, d.type);
                    }
                    else {
                        d.removeLUs.forEach((e,index)=>{
                            this.remove(e, d.type);
                        });
                    }
                }
                const changedLUs = JSON.stringify({
                    associatedtags: this.associatedLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version })),
                    prerequisitetag: this.prerequisiteLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version })),
                    similartags: this.similarLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version }))
                });
                const OldData = JSON.stringify(this.selectedLUCopy);
                if (OldData != changedLUs) {
                    this.enableForm = true;
                }
                else {
                    this.enableForm = false;
                }
            });
        });
    }

    async getDataFromdialog() {
        return new Promise((resolve, reject) => {
            this.luService.isassociatedContentChanged.subscribe((d: any) => {
                resolve(d);
            });
        });
    }

    addtactivity(data, lutype) {
        const arr = [];
        data.forEach(function(elem) {
            arr.push(elem);
        });
        if (lutype == 'associatedtags') {
            this.associatedLu = arr;
        }
        else if (lutype == 'prerequisitetag') {
            this.prerequisiteLu = arr;
        }
        else {
            this.similarLu = arr;
        }
    }

    remove(item, message) {
        if (message == 'associatedtags') {
            console.log();
            this.associatedLu = this.associatedLu.filter(function(data) {
                if (data.docId == item.docId) {
                    return false;
                }
                else {
                    return true;
                }
            });
        }
        else if (message == 'prerequisitetag') {
            this.prerequisiteLu = this.prerequisiteLu.filter(function(data) {
                if (data.docId == item.docId) {
                    return false;
                }
                else {
                    return true;
                }
            });
        }
        else {
            this.similarLu = this.similarLu.filter(function(data) {
                if (data.docId == item.docId) {
                    return false;
                }
                else {
                    return true;
                }
            });
        }
        const changedLUs = JSON.stringify({
            associatedtags: this.associatedLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version })),
            prerequisitetag: this.prerequisiteLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version })),
            similartags: this.similarLu.map(d => ({ learningUnitName: d.learningUnitName, docId: d.docId, version: d.version }))
        });
        const OldData = JSON.stringify(this.selectedLUCopy);
        console.log(OldData == changedLUs);
        if (OldData != changedLUs) {
            this.enableForm = true;
        }
        else {
            this.enableForm = false;
        }
    }

    saveDB() {
        this.selectedLearningUnit = {
            associatedLearningUnits: this.associatedLu.map(d => d['docId']),
            prerequisiteLearningUnits: this.prerequisiteLu.map(d => d['docId']),
            similarLearningUnits: this.similarLu.map(d => d['docId'])
        };
        try {
            this.luService.updateLU(this.luDetails.docId, this.selectedLearningUnit);
            this.uiService.alertMessage('Saved', 'Successfully Updated', 'success');
            this.enableForm=false;
        } catch (error) {
            this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
        }
    }

    async getLinkedLUList(luIdsArr) {
        if (!luIdsArr.length) {return [];}
        const arr = [];
        luIdsArr.map(d => arr.push(this.luService.getLearningUnitData(d)));
        const luDetailsArr: any = await Promise.all(arr).then(data => data.map(d => ({
            learningUnitName: d['learningUnitName'],
            docId: d['docId'],
            version: `${d['version']}`
        })));
        return luDetailsArr;
    }

}
