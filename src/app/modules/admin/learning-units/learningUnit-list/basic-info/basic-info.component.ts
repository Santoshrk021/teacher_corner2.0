import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UiService } from 'app/shared/ui.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MatDialog } from '@angular/material/dialog';
import { InsertLearningunittypeComponent } from '../../insert-learningunittype/insert-learningunittype.component';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { SharedService } from 'app/shared/shared.service';
@Component({
    selector: 'app-basic-info',
    templateUrl: './basic-info.component.html',
    styleUrls: ['./basic-info.component.scss'],
})
export class BasicInfoComponent implements OnInit {
    @Input('luDetailsInput') luDetails: any;
    @Input() allLUList: any;
    @Output() closeAfterEditLU = new EventEmitter<boolean>();
    @Input('trashUINotEditableInput') trashUINotEditable: any;
    @Input() allLUdata: any;
    @Input() maturityDetails: any;

    matTooltipMsg = 'This field isn\'t editable as this learning unit or version has been deleted. Please restore to edit this field';
    options: string[] = ['DEVELOPMENT', 'REVIEW', 'LIVE', 'ARCHIVE'];
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    basicInfoForm?: FormGroup;
    enableForm: boolean = false;
    startLoading: boolean = false;
    maturityValues = [];
    luType = [];
    difficultiesLevel = [
        { name: 0, code: 0 },
        { name: 1, code: 1 },
        { name: 2, code: 2 },
        { name: 3, code: 3 },
        { name: 4, code: 4 },
        { name: 5, code: 5 },
    ];
    user: any;
    userAccessLevel: any;
    checkSpecificKeys = [];
    constructor(
        private configurationService: ConfigurationService,
        private dialog: MatDialog,
        private fb: FormBuilder,
        private learningUnitResourceService: LearningUnitResourcesService,
        private learningUnitService: LearningUnitsService,
        private masterService: MasterService,
        private sharedService: SharedService,
        private uiService: UiService,
        private userService: UserService,
    ) { }

    async ngOnInit() {
        const maturity = this.luDetails?.Maturity?.toLowerCase();
        this.maturityValues = this.maturityDetails?.maturity?.[maturity]?.availableUpgrades;
        this.setBasicInfo(this.luDetails);

        // this.basicInfoForm.valueChanges.subscribe((data) => {
        //     Object.entries(data).forEach(([key, value]) => {
        //         if (value !== this.luDetails[key]) {
        //             this.enableForm = true;
        //         } else {
        //             this.enableForm = false;
        //         };
        //     });
        // });

        const LutypeData = await firstValueFrom(this.configurationService.getLearningUnitTypes());
        const j = [];
        Object.entries(LutypeData.Types).forEach((d) => {
            j.push(d[1]);
        });
        this.luType = j;

        this.userService.user$
            .pipe((takeUntil(this._unsubscribeAll)))
            .subscribe((user: any) => {
                this.user = user?.teacherMeta;
                this.getUser(user.docId);
            });




        this.setupFormValueChangeHandler();
    }

    getUser(docId) {
        this.userService.getDocDataById(docId).then((ds: any) => {
            this.userAccessLevel = ds.accessLevel;
        });
    }

    getRespectiveCode(name) {
        let codeForTACtivity;
        this.luType.forEach((item: any) => {
            if (item.name == name) {
                codeForTACtivity = item.code;
            }
        });
        return codeForTACtivity;
    }

    updateResource(ludataStructure) {
        Object.keys(ludataStructure).filter(m => m !== 'resourceNames').forEach((mValue) => {
            Object.keys(ludataStructure[mValue]).forEach((key) => {
                Object.keys(ludataStructure[mValue][key]).forEach((k) => {
                    ludataStructure[mValue][key][k] = '';
                });
            });
        });
        return ludataStructure;
    }

    async saveBasicInfo(form) {
        this.basicInfoForm.disable();
        const basicObj = form.value;

        const updatedMaturity = basicObj.Maturity;

        // if maturity is changed and resources not added for that maturity
        if ((updatedMaturity !== this.luDetails.Maturity) && !this.luDetails.resources.hasOwnProperty(updatedMaturity.toLowerCase())) {
            const resourceSchema = await firstValueFrom(this.configurationService.getConfigurationDocumentOnce('learningUnitResourceSchema'));
            const { docId: learningUnitDocId, creationDate, learningUnitId, type } = this.luDetails;
            const maturityResourceObject = resourceSchema.get('resources')[type][updatedMaturity.toLowerCase()];
            const docId = this.learningUnitResourceService.getDocId();
            const learningUnitResourceObject = this.sharedService.convertTimestamps({
                createdAt: creationDate,
                docId,
                learningUnitDocId,
                learningUnitId,
                maturity: updatedMaturity,
                resources: maturityResourceObject,
                type,
            });
            try {
                await this.learningUnitResourceService.updateLUResources(learningUnitResourceObject, docId);
                await this.learningUnitService.updateSingleField(learningUnitDocId, `resources.${updatedMaturity.toLowerCase()}`, docId);
                console.info(`Successfully created learning unit resource document for ${updatedMaturity} maturity`);
            } catch (error) {
                console.error(`Error creating learning unit document for ${updatedMaturity}`, error);
            }
        }

        if (basicObj.maturityDoc) {
            delete basicObj['maturityDoc'];
        }

        try {
            this.startLoading = true;
            await Promise.all(Object.entries(this.basicInfoForm.value).map(async ([key, value]) => {
                if (value !== this.luDetails[key]) {
                    const { docId, masterDocId } = this.luDetails;
                    await this.masterService.updateMasterDocField(masterDocId, docId, 'tacNames', key, value);
                    await this.learningUnitService.updateSingleField(docId, key, value);
                } else {
                    console.error(`The value of ${key} is unchanged and hence not updated in learning unit and master`);
                };
            }));

            this.uiService.alertMessage('Saved', 'Successfully Updated Learning Unit Details', 'success');
            this.basicInfoForm.enable();
            this.closeAfterEditLU.emit(true);
        } catch (error) {
            this.uiService.alertMessage('Error', 'Error Updating Learning UnitDetails', 'error');
            console.error('Error updating learning unit details: ', error);
        } finally {
            this.startLoading = false;
        };
    }

    async updateMasterDoc(selectedLU, allMasterLU) {
        const masterDocId = selectedLU.masterDocId;
        const filterMasterData = {
            learningUnitCode: allMasterLU?.learningUnitCode || '',
            creationDate: allMasterLU?.creationDate || '',
            difficultyLevel: allMasterLU?.difficultyLevel || 0,
            learningUnitId: allMasterLU?.learningUnitId,
            exploreTime: allMasterLU?.exploreTime || 0,
            docId: allMasterLU?.docId || '',
            learningUnitPreviewImage: allMasterLU?.learningUnitPreviewImage || '',
            learningUnitName: allMasterLU?.learningUnitName || '',
            isoCode: allMasterLU?.isoCode || '',
            learningUnitDisplayName: allMasterLU?.learningUnitDisplayName || '',
            makingTime: allMasterLU?.makingTime || '',
            Maturity: allMasterLU?.Maturity || '',
            observationTime: allMasterLU?.observationTime || '',
            status: allMasterLU?.status || '',
            tacArchitectCountryCode: allMasterLU?.tacArchitectCountryCode || '',
            tacArchitectName: allMasterLU?.tacArchitectName || '',
            tacArchitectPhoneNumber: allMasterLU?.tacArchitectPhoneNumber || '',
            tacMentorCountryCode: allMasterLU?.tacMentorCountryCode || '',
            tacMentorName: allMasterLU?.tacMentorName || '',
            tacMentorPhoneNumber: allMasterLU?.tacMentorPhoneNumber || '',
            tacOwnerCountryCode: allMasterLU?.tacOwnerCountryCode || '',
            tacOwnerName: allMasterLU?.tacOwnerName || '',
            tacOwnerPhoneNumber: allMasterLU?.tacOwnerPhoneNumber || '',
            totalTime: allMasterLU?.totalTime || 45,
            type: allMasterLU?.type || '',
            typeCode: allMasterLU?.typeCode || '',
            version: allMasterLU?.version || '',
            subjectCode: allMasterLU?.subjectCode || '',
            subjectName: allMasterLU?.subjectName || '',
            domainCode: allMasterLU?.domainCode || '',
            domainName: allMasterLU?.domainName || '',
            subDomainCode: allMasterLU?.subDomainCode || '',
            subDomainName: allMasterLU?.subDomainName || '',
            compositeCode: allMasterLU?.compositeCode || '',
            containsResources: allMasterLU?.containsResources || false,
        };

        await this.masterService.updateMasterDoc('tacNames', masterDocId, { [allMasterLU?.docId]: filterMasterData });
    }

    setBasicInfo(details) {
        this.basicInfoForm = this.fb.group({
            learningUnitName: this.fb.control(details?.learningUnitName || '', [Validators.required, Validators.maxLength(60)]),
            type: this.fb.control(details?.type || '', [Validators.required]),
            difficultiesLevel: this.fb.control(details.difficultiesLevel || 0, [Validators.required]),
            status: this.fb.control(details?.status || '', [Validators.required]),
            Maturity: this.fb.control({ value: details?.Maturity || '', disabled: !this.maturityDetails?.maturity?.[details?.Maturity?.toLowerCase()]?.upgradeable }, [Validators.required]),
            exploreTime: this.fb.control(details?.exploreTime || 0, [Validators.required]),
            learnTime: this.fb.control(details?.learnTime || 0, [Validators.required]),
            totalTime: this.fb.control(details?.totalTime || 0, [Validators.required]),
            learningUnitPreviewImage: this.fb.control(details?.learningUnitPreviewImage || ''),
            learningUnitDisplayName: this.fb.control(details?.learningUnitDisplayName || '', [Validators.required]),
        });

        if (this.trashUINotEditable == true) {
            this.basicInfoForm.disable();
        };
    }


    copyToClipboard(text: string | undefined): void {
        if (text) {
            // Copy the 'text' to clipboard here (you can use document.execCommand('copy') or Clipboard API)
            // For simplicity, I'll use the Clipboard API here:
            navigator.clipboard.writeText(text).then(() => {
                console.info('Copied to clipboard:', text);
            }).catch((error) => {
                console.error('Failed to copy:', error);
            });
        }
    }

    async addnewLUtype() {
        await import('../../insert-learningunittype/insert-learningunittype.module').then(() => {
            const dialogRef = this.dialog.open(InsertLearningunittypeComponent, {
                data: {
                    allTypes: this.luType,
                },
            });
            dialogRef.afterClosed().subscribe(async (result) => {
                if (result.isupdated) {
                    this.luType.push(result.data);
                }
                else {
                }
            });
        });
    }

    updateType(type) {
        return this.luType.find(d => d.name == type);
    }

    setupFormValueChangeHandler() {
        this.checkSpecificKeys = []; // Reset the keys array

        this.basicInfoForm.valueChanges.subscribe(() => {
            const formData = this.basicInfoForm.getRawValue(); // Get all form values

            // Extract only relevant keys from luDetails
            Object.keys(formData).forEach((key) => {
                if (this.luDetails.hasOwnProperty(key)) {
                    this.checkSpecificKeys.push(key);
                }
            });

            const isMatching = this.areValuesMatching(formData, this.luDetails); // Compare only necessary fields

            if (isMatching) {
                this.basicInfoForm.markAsPristine();
                this.basicInfoForm.markAsUntouched();
            } else {
                this.basicInfoForm.markAsDirty();
            }
        });
    }

    areValuesMatching(formData: any, dbData: any): boolean {
        // Compare only keys from checkSpecificKeys
        return this.checkSpecificKeys.every(key => formData[key] === dbData[key]);
    }

}
