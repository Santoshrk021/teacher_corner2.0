import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { Subject, first, lastValueFrom, take, takeUntil } from 'rxjs';
import { LearningUnit, LearningUnitMaster, tactivity } from 'app/core/dbOperations/learningUnits/learningUnits.types';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InsertLearningunittypeComponent } from '../insert-learningunittype/insert-learningunittype.component';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { LearningUnitResource } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.types';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { Timestamp } from 'firebase/firestore';
@Component({
    selector: 'add-new-learningunit',
    templateUrl: './add-new-learningunit.component.html',
    styleUrls: ['./add-new-learningunit.component.scss']
})

export class AddNewLearningUnitComponent implements OnInit {
    subjectNames = [];
    domainCodes = [];
    subjects = [];
    subjectCodes = [];
    subjectCopy;
    codeValid = true;
    domainNames = [];
    subdomainNames = [];
    filteredSubdomains: any = [];
    domainData = [];
    domainCopy;
    filteredTactivities: any;
    mytactivities: any;
    allTacts: any;
    splitVersion: any;
    allLUFromColl: any;
    latestVersion: any;
    options: tactivity[];
    userAccessLevel;
    tacOnOption = '';
    selectedLUinForm;
    defaultMaturities = ['Gold', 'Silver', 'Diamond', 'Platinum'];
    learningUnitAdded = false;
    enableEditnewTag = false;
    showFulllength = false;
    enableEditnewVesion = false;
    displayNameEdit = true;
    optionsDisplayname: any[];
    allTacsFordisplay: any;
    startLoading = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    user;
    tacForm = this.form.group({
        learningunitCode: this.form.control({ value: '', disabled: true }, [Validators.required]),
        learningUnitName: ['', [Validators.required, Validators.maxLength(60)]],
        versionName: this.form.control({ value: '', disabled: true }, [Validators.required]),
        language: this.form.control({ value: '', disabled: true }, [Validators.required]),
        type: this.form.control({ value: '', disabled: true }, [Validators.required]),
        Maturity: this.form.control({ value: '', disabled: true }, Validators.required),
        subjectCode: this.form.control({ value: '', disabled: true }, Validators.required),
        subjectName: this.form.control({ value: '', disabled: true }, Validators.required),
        domainCode: this.form.control({ value: '', disabled: true }, Validators.required),
        domainName: this.form.control({ value: '', disabled: true }, Validators.required),
        subDomainCode: this.form.control({ value: '', disabled: true }, Validators.required),
        subDomainName: this.form.control({ value: '', disabled: true }, Validators.required),
        compositeCode: this.form.control({ value: '', disabled: true }, Validators.required),
        isTrashLU: this.form.control(false),
        trashLU: this.form.control(''),
        learningUnitDisplayName: this.form.control({ value: '', disabled: true }, [Validators.required])
    });
    languages: { name: string; code: string }[];
    isLUautoSelected = false;
    isSelectedTAC = false;
    trashVersions: any[] = [];
    luType: any[] = [];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private configurationService: ConfigurationService,
        private form: FormBuilder,
        private learningUnitResourceService: LearningUnitResourcesService,
        private learningUnitService: LearningUnitsService,
        private masterService: MasterService,
        private uiService: UiService,
        private userService: UserService,
        public dialog: MatDialog,
        public dialogRef: MatDialogRef<AddNewLearningUnitComponent>,
    ) {
        this.mytactivities = data['allTACS'];
        this.options = data['allTACS'].filter((d => d.learningUnitName != '')).filter(d => typeof (d.learningUnitName) == 'string');
        this.allTacts = data['allTACS'].filter((d => d.learningUnitName != '')).filter(d => typeof (d.learningUnitName) == 'string');
        const p = data['allTACS'].filter(d => typeof (d.learningUnitName) !== 'string');
        this.optionsDisplayname = data['allTACS'].filter((d => d.learningUnitName != '')).filter(d => typeof (d.learningUnitName) == 'string');
        this.languages = data['languages'];
    }

    getUser(docId) {
        this.userService.getDocDataById(docId).then((ds: any) => {
            this.userAccessLevel = ds.accessLevel;
            if (ds.accessLevel == 11) {
                this.enableEditnewVesion = true;
                // this.enableEditnewTag=true
            }
            else {
                this.enableEditnewVesion = false;
                // this.enableEditnewTag=false
            }
        });
    }

    async ngOnInit() {
        this.userService.user$
            .pipe((takeUntil(this._unsubscribeAll)))
            .subscribe((user: any) => {
                this.user = user?.teacherMeta;
                this.getUser(user.docId);
            });

        this.domainData = this.data.domains;
        this.subjectNames = this.data.subjecTtypes;
        const watchList = [
            'learningUnitName',
            'learningUnitDisplayName',
            'type',
            'language',
            'versionName',
            'Maturity',
        ];

        const unlocklist = [
            'learningUnitDisplayName',
            'type',
            'language',
            'versionName',
            'Maturity',
        ];

        for (let i = 0; i < watchList?.length; i++) {
            this.unlockFormSequentially(watchList[i], unlocklist[i]);
        };

        const luTypeRef = await lastValueFrom(this.configurationService.getLearningUnitTypes().pipe(first()));
        this.luType = Object.values(luTypeRef.Types);

        const allLUdata = await this.getLUFromSubscription();
        this.allLUFromColl = allLUdata;

        this.tacForm?.get('subjectCode')?.valueChanges?.subscribe((res) => {
            this.subjectNames = this.subjectCopy;
        });

        this.tacForm?.get('domainCode')?.valueChanges?.subscribe((res) => {
            this.domainNames = this.domainCopy;
            if (res !== '') {
                const domainValue = this.domainNames.find(d => d.code == res);
                this.domainNames = this.domainNames.filter(d => d.code == res);
                if (domainValue) {
                    this.tacForm.patchValue({
                        domainName: domainValue.name
                    });
                }
                else {
                    this.tacForm.patchValue({
                        domainName: ''
                    });
                }
            }
        });

        this.tacForm?.get('subDomainCode')?.valueChanges?.subscribe((res) => {
            if (res !== '') {
                const subdomain: any = this.domainData.filter(d => d.subDomainCode == res).map(m => m.subdomainName);
                if (subdomain) {
                    this.filteredSubdomains = subdomain;
                }
            }
        });

        this.tacForm?.get('learningunitCode')?.valueChanges?.subscribe((res) => {
            if (this.tacForm?.get('learningunitCode').valid) {
                this.tacForm?.get('Maturity').enable();
            }
            else {
                this.tacForm?.get('Maturity').disable();
            }
        });

        this.subdomainNames = Object.entries(
            this.domainData.reduce((acc, val) => {
                (acc[val.subDomainCode] ||= []).push(val.subdomainName);
                return acc;
            }, {})
        ).map(([code, names]) => ({ code, names }));

        this.domainNames = Object.entries(
            this.domainData.reduce((acc, val) => {
                acc[val.domainCode] ||= val.domainName;
                return acc;
            }, {})
        ).map(([code, name]) => ({ code, name }));

        this.domainCopy = [...this.domainNames];
        this.domainCodes = this.domainNames.map(d => d.code);
        this.subjectCodes = this.subjectNames.map(d => d.code);
        this.subjectCopy = [...this.subjectNames];
        this.subjects = this.subjectNames.map(d => d.name);
    }

    updateValue(event) {
        if (event.target.value.length == 4) {
            const code = event.target.value.slice(0, 2);
            const domain1 = code.split('')[0];
            const domain2 = code.split('')[1];
            const findval = this.domainData.find(d => ((d.domainCode == domain1) && (d.subDomainCode == domain2)));
            const subjectcode = findval?.subjectCode;
            const subject = findval?.subjectName;
            if (findval && subject && subjectcode) {
                this.tacForm.patchValue({
                    subjectCode: subjectcode,
                    subjectName: subject,
                    domainCode: findval.domainCode,
                    domainName: findval.domainName,
                    subDomainCode: findval.subDomainCode,
                    subDomainName: findval.subdomainName,
                    compositeCode: String(findval.domainCode) + String(findval.subDomainCode)
                });
                this.codeValid = true;

            } else {
                this.tacForm.controls['subjectCode'].reset();
                this.tacForm.controls['subjectName'].reset();
                this.tacForm.controls['domainCode'].reset();
                this.tacForm.controls['domainName'].reset();
                this.tacForm.controls['subDomainCode'].reset();
                this.tacForm.controls['subDomainName'].reset();
                this.tacForm.controls['compositeCode'].reset();
                this.codeValid = false;
            }
        }
    }

    async getLUFromSubscription() {
        return new Promise((resolve, reject) => {
            this.learningUnitService.allLUdataFromcoll.pipe(take(1)).subscribe((d: any) => {
                resolve(d);
            });
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

    async submitForm() {
        this.startLoading = true;
        const maturityLowerCase = (String(this.tacForm?.get('Maturity').value.trim())).toLowerCase();
        const maturityTitleCase = this.tacForm.get('Maturity').value;
        const type = this.tacForm.get('type').value;
        const cumulativeMaturityRef = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('learningUnitMaturity'));
        const cumulativeMaturityArray: Array<string> = cumulativeMaturityRef.get('maturity')?.[maturityLowerCase]?.cumulativeMaturity;

        // first create a lu resource document then get id for each maturity then reduce array into a map
        const maturityIds: Record<string, string> = await Promise.all(
            cumulativeMaturityArray.map(async (maturity: string) => {
                const learningUnitResourceId = await this.createLearningUnitResource(
                    type,
                    maturity,
                    maturityTitleCase
                );
                return { maturity: maturity?.toLowerCase(), id: learningUnitResourceId };
            })
        ).then(results =>
            results.reduce((acc: Record<string, string>, { maturity, id }) => {
                acc[maturity] = id;
                return acc;
            }, {})
        );

        if (Object.values(maturityIds).some(item => item.includes('Error'))) {
            console.error(Object.values(maturityIds));
            this.uiService.alertMessage('Error', 'There was an error creating this learning unit. Please try again', 'error');
            this.startLoading = false;
            return;
        }

        const doc = this.learningUnitService.getDocId();
        const luCollectionData: LearningUnit = {
            additionalResources: [],
            alternateLongDescription: '',
            alternateShortDescription: '',
            associatedLearningUnits: [],
            learningUnitCode: this.tacForm?.get('learningunitCode').value.trim(),
            difficultyLevel: 0,
            creationDate: Timestamp.now(),
            domain: '',
            exploreTime: 0,
            firstLiveDate: '',
            isoCode: this.tacForm.value.language,
            learningUnitDisplayName: this.tacForm?.get('learningUnitDisplayName').value.trim(),
            learningUnitImage: '',
            learningUnitPreviewImage: '',
            learnTime: 0,
            learningUnitName: this.tacForm?.get('learningUnitName').value.trim(),
            longDescription: '',
            makingTime: 0,
            masterDocId: '',
            Maturity: this.tacForm?.get('Maturity').value.trim(),
            numberOfTemplates: '',
            observationTime: 0,
            prerequisiteLearningUnits: [],
            replacementLearningUnits: [],
            resources: {
                guidePath: '',
                materialPath: '',
                observationPath: '',
                otherImagePath: '',
                qrCodeImagePath: '',
                templatePath: '',
                topicGuidePath: '',
                topicVideoUrl: '',
                varGuidePath: '',
                varVideoUrl: '',
                videoUrl: '',
                ...maturityIds,
            },
            samples: '',
            shortDescription: '',
            similarLearningUnits: [],
            status: 'DEVELOPMENT',
            tacArchitectName: '',
            tacArchitectCountryCode: '',
            tacArchitectPhoneNumber: '',
            tacMentorName: '',
            tacMentorCountryCode: '',
            tacMentorPhoneNumber: '',
            tacOwnerName: `${this.user?.firstName || ''} ${this.user?.lastName || ''}`,
            tacOwnerCountryCode: this.user?.countryCode,
            tacOwnerPhoneNumber: this.user?.phoneNumber,
            tags: [],
            tools: '',
            topicCodes: '',
            totalTime: 45,
            totalViews: 0,
            type: this.tacForm.get('type').value,
            typeCode: this.updateType(this.tacForm.get('type').value)?.code,
            userFeedback: '',
            version: this.tacForm?.get('versionName').value.split('-')[1].trim(),
            versionNotes: '',
            learningUnitId: this.updateType(this.tacForm.get('type').value)?.code + '-' + this.tacForm?.get('learningunitCode').value.trim() + '-' + this.tacForm?.get('versionName').value.trim(),
            docId: doc,
            subjectCode: this.tacForm?.get('subjectCode').value,
            subjectName: this.tacForm?.get('subjectName').value,
            domainCode: this.tacForm?.get('domainCode').value,
            domainName: this.tacForm?.get('domainName').value,
            subDomainCode: this.tacForm?.get('subDomainCode').value,
            subDomainName: this.tacForm?.get('subDomainName').value,
            compositeCode: this.tacForm?.get('compositeCode').value,
            containsResources: false
        };

        const luMasterData: LearningUnitMaster = {
            creationDate: Timestamp.now(),
            learningUnitCode: this.tacForm?.get('learningunitCode').value.trim(),
            difficultyLevel: 0,
            learningUnitId: this.updateType(this.tacForm.get('type').value)?.code + '-' + this.tacForm?.get('learningunitCode').value.trim() + '-' + this.tacForm?.get('versionName').value.trim(),
            exploreTime: 0,
            docId: doc,
            learningUnitPreviewImage: '',
            isoCode: this.tacForm.value.language,
            learningUnitDisplayName: this.tacForm?.get('learningUnitDisplayName').value.trim(),
            makingTime: 0,
            Maturity: this.tacForm?.get('Maturity').value.trim(),
            observationTime: 0,
            learningUnitName: this.tacForm?.get('learningUnitName').value.trim(),
            status: 'DEVELOPMENT',
            tacArchitectCountryCode: '',
            tacArchitectName: '',
            tacArchitectPhoneNumber: '',
            tacMentorCountryCode: '',
            tacMentorName: '',
            tacMentorPhoneNumber: '',
            tacOwnerCountryCode: this.user?.countryCode,
            tacOwnerName: `${this.user?.firstName || ''} ${this.user?.lastName || ''}`,
            tacOwnerPhoneNumber: this.user?.phoneNumber,
            totalTime: 45,
            type: this.tacForm.get('type').value,
            typeCode: this.updateType(this.tacForm.get('type').value)?.code,
            version: this.tacForm?.get('versionName').value.split('-')[1].trim(),
            subjectCode: this.tacForm?.get('subjectCode').value,
            subjectName: this.tacForm?.get('subjectName').value,
            domainCode: this.tacForm?.get('domainCode').value,
            domainName: this.tacForm?.get('domainName').value,
            subDomainCode: this.tacForm?.get('subDomainCode').value,
            subDomainName: this.tacForm?.get('subDomainName').value,
            compositeCode: this.tacForm?.get('compositeCode').value,
            containsResources: false
        };

        try {
            for (const maturity in maturityIds) {
                this.learningUnitResourceService.updateDoc(maturityIds[maturity], 'learningUnitDocId', doc);
                this.learningUnitResourceService.updateDoc(maturityIds[maturity], 'learningUnitId', luCollectionData.learningUnitId);
            };

            if (this.tacForm.value.isTrashLU) {
                await this.createNewLearningUnitAndLuMaster(this.tacForm.value.trashLU, luMasterData);
                await this.learningUnitService.deleteFromTrashLU(luMasterData.docId);
            } else {
                await this.createNewLearningUnitAndLuMaster(luCollectionData, luMasterData);
            };
        } catch (error) {
            console.error(error);
            this.uiService.alertMessage('Error', 'There was an error creating this learning unit. Please try again', 'error');
            this.startLoading = false;
            return;
        }

        this.learningUnitAdded = true;
        this.uiService.alertMessage('Successful', 'Created learning unit successfully', 'success');
        this.startLoading = false;
        this.close();
    }

    async createNewLearningUnitAndLuMaster(luCollectionData: any, luMasterData: LearningUnitMaster) {
        const masterDocId = await this.masterService.addNewObjectToMasterMap('LEARNINGUNIT', 'tacNames', luMasterData);
        luCollectionData['masterDocId'] = masterDocId;
        await this.learningUnitService.addNewLU(luCollectionData);
    }

    async createLearningUnitResource(type: string, maturity: string, maturityTitleCase: string) {
        const learningUnitResourceSchema = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('learningUnitResourceSchema'));
        const maturitySchema = learningUnitResourceSchema.get('resources')?.[type.replace(/\s+/g, '')]?.[maturity.toLowerCase()];
        const learningUnitResourceId = this.learningUnitResourceService.getDocId();
        const learningUnitResourceData: LearningUnitResource = {
            docId: learningUnitResourceId,
            learningUnitDocId: '',
            learningUnitId: '',
            maturity,
            resources: maturitySchema,
            type,
        };
        try {
            await this.learningUnitResourceService.createDoc(learningUnitResourceData, learningUnitResourceId);
            console.log('Learning unit resource created successfully');
            return learningUnitResourceId;
        } catch (error) {
            console.error('Error creating learning unit resource.', error);
            return `Error creating learning unit resource for ${maturity} : ${error}`;
        };
    }

    tactivitySearchInput(event: any) {
        this.isSelectedTAC = false;
        const activities = [];
        const alltacs = [];

        this.options.forEach((elem) => {
            if (elem.learningUnitName.toLowerCase().includes(event.target.value.toLowerCase()) ||
                elem.learningUnitCode?.toString().toLowerCase().includes(event.target.value.toLowerCase())) {
                activities.push(elem.learningUnitName);
                alltacs.push(elem);
            }
        });
        this.isLUautoSelected = false;

        this.allTacts = alltacs;

        if (this.tacForm.get('learningUnitDisplayName').value == null || this.tacForm.get('learningUnitDisplayName').value == '') {
            this.tacForm.get('type').disable();
        }
        else {
            this.tacForm.get('type').enable();
        }
    }

    async getLU(lu) {
        return new Promise((resolve, reject) => {
            this.learningUnitService.getLUByIdOnce(lu.docId).subscribe((s) => {
                resolve(s);
            });
        });
    }

    async selectedLU(event: any) {
        this.isSelectedTAC = true;
        this.isLUautoSelected = true;
        this.selectedLUinForm = event;
        this.tacForm.patchValue({
            learningUnitName: event.learningUnitName,
            learningunitCode: event.learningUnitCode,
            learningUnitDisplayName: event.learningUnitDisplayName,
            type: event.type,
            subjectName: event.subjectName || '',
            subjectCode: event.subjectCode || '',
            domainCode: event.domainCode || '',
            domainName: event.domainName || '',
            subDomainCode: event.subDomainCode || '',
            subDomainName: event.subDomainName || '',
            compositeCode: event.compositeCode || '',
        });

        if (this.tacForm.get('type').value) {
            this.tacForm.controls['language'].enable();
            this.tacForm.controls['subjectCode'].disable();
            this.tacForm.controls['subjectName'].disable();
            this.tacForm.controls['domainCode'].disable();
            this.tacForm.controls['domainName'].disable();
            this.tacForm.controls['subDomainCode'].disable();
            this.tacForm.controls['subDomainName'].disable();
            this.tacForm.controls['compositeCode'].disable();
        }
        else {
            this.tacForm.controls['language'].disable();
        }
        this.isSelectedTAC = true;
    }

    async languageSelected(event: any) {
        if (!this.isLUautoSelected) {
            this.tacForm?.get('learningunitCode')?.enable();
        }
        this.filteredTactivities = this.mytactivities.filter(elem => ((elem.learningUnitCode === this.tacForm.get('learningunitCode').value) && (elem.isoCode == event.value) && (elem.typeCode == this.updateType(this.tacForm.get('type').value).code)));
        this.getTrashVersions(this.tacForm.get('learningunitCode').value).then(() => {

        }).catch((error) => {
            console.log(error);
        });

        if (this.filteredTactivities.length != 0) {
            this.splitVersion = this.filteredTactivities.reduce((prev, current) => (parseInt(prev.version.split('V')[1]) > parseInt(current.version.split('V')[1]) ? prev : current));

            const part2 = String(parseInt(this.splitVersion.version.split('V')[1]) + 1);
            this.latestVersion = `${event.value}-V${part2}`;
            this.tacForm.patchValue({
                versionName: `${event.value}-V${part2}`
            });
        }
        else {
            this.tacForm.patchValue({
                versionName: `${event.value}-V10`
            });

            this.latestVersion = `${event.value}-V10`;
            const isoCode = (this.tacForm?.get('versionName')?.value?.trim()).split('-')[0];

            this.getLatestTrashVersion(this.trashVersions, isoCode);
        }

        if (this.tacForm.get('versionName').value && this.isLUautoSelected) {
            this.tacForm?.get('Maturity')?.enable();

        }
        else {
            this.tacForm?.get('Maturity')?.disable();
        }

        const isoCode = (this.tacForm?.get('versionName')?.value.trim()).split('-')[0];
        this.getLatestTrashVersion(this.trashVersions, isoCode);
    }

    /* Check All Trash Versions with TAC CODE */
    async getTrashVersions(luCode) {
        this.trashVersions = (await this.learningUnitService.getTrashLU(luCode)).flatMap(doc => doc?.data() || []) || [];
        console.log(this.trashVersions);
    }

    getLatestTrashVersion(trashverionArr, isoCode) {
        const filterTrashLUIsoCode = trashverionArr?.filter((lu) => {
            const currLUIsoCode = lu.isoCode;
            if (isoCode == currLUIsoCode) {
                return lu;
            }
        });

        if (filterTrashLUIsoCode.length == 0) {
            this.tacForm.patchValue({
                isTrashLU: false,
            });
            return;
        }

        const filterLatestOne = filterTrashLUIsoCode?.reduce((prev, current) => (parseInt(prev.version.split('V')[1]) > parseInt(current.version.split('V')[1]) ? prev : current));

        const versionNum = this.tacForm.value.versionName.split('V')[1];
        const trashVersionNum = filterLatestOne?.docId?.split('V')[1];
        const isGreather = trashVersionNum >= versionNum ? true : false;
        if (filterTrashLUIsoCode.length != 0 && isGreather) {
            const versionName = `${isoCode}-V${filterLatestOne.docId.split('V')[1]}`;

            this.tacForm.patchValue({
                versionName: versionName,
                isTrashLU: true,
                trashLU: filterLatestOne,
            });
            this.latestVersion = versionName;
        } else {
            this.tacForm.patchValue({
                isTrashLU: false,
            });
        }
    }

    close() {
        this.displayNameEdit = false;
        this.dialogRef.close(this.learningUnitAdded);
    }

    unlockFormSequentially(watch: string, unlock: string) {
        switch (watch) {
            case 'learningUnitName':
                this.tacForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    this.tacForm.get('type').disable();
                    this.tacForm.get('type').reset();
                    this.tacForm.controls['language'].reset();
                    this.tacForm.controls['language'].disable();
                    this.tacForm.get('versionName').reset();
                    this.tacForm.get('versionName')?.disable();
                    this.tacForm.get('learningunitCode')?.reset();
                    this.tacForm.get('learningunitCode')?.disable();

                    if (res && this.tacForm?.get(watch)?.enabled) {
                        if (this.isSelectedTAC) {
                            this.tacForm.controls['learningUnitDisplayName'].reset();
                            this.tacForm.get('type').reset();
                            this.tacForm.get('versionName').reset();
                            this.tacForm.get('versionName')?.disable();
                            this.tacForm.get('learningunitCode')?.reset();
                            this.tacForm.get('learningunitCode')?.disable();
                            this.tacForm?.get(unlock)?.enable();
                        }
                        else {
                            this.tacForm?.get(unlock)?.enable();
                        };
                    };

                    if (res == '') {
                        this.isSelectedTAC = false;
                        this.enableEditnewTag = false;
                        this.tacForm.get('learningunitCode')?.disable();
                        this.tacForm.get('learningUnitDisplayName').disable();
                    }
                    else {
                        this.isSelectedTAC = true;
                        this.enableEditnewTag = true;
                        this.tacForm.get('learningUnitDisplayName').enable();
                    };

                    if (this.isLUautoSelected) {
                        if (this.displayNameEdit) {
                            this.tacForm.get('learningUnitDisplayName').disable();
                        }
                        else {
                            this.tacForm.get('learningUnitDisplayName').enable();
                        };
                    };
                });
                break;

            case 'learningUnitDisplayName':
                this.tacForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    this.tacForm?.get(unlock)?.enable();
                    if (res == '') {
                        this.tacForm.get('type').disable();
                    }
                    else {
                        this.tacForm.get('type').enable();
                    }

                    if (this.allTacts.map(d => d?.learningUnitName.toLowerCase().includes(this.tacForm.get('learningUnitName').value))) {
                        this.isSelectedTAC = true;
                    }
                    else {
                        this.isSelectedTAC = false;
                    }
                });
                break;

            case 'versionName':
                this.tacForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res && this.tacForm?.get(watch)?.enabled) {
                        this.tacForm?.get(unlock)?.enable();
                    }
                });
                break;

            case 'learningunitCode':
                this.tacForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (this.tacForm?.get(watch).valid) {
                        this.tacForm?.get('Maturity').enable();
                    }
                    else {
                        this.tacForm?.get('Maturity').disable();
                    }

                    if (res && this.tacForm?.get(watch)?.enabled) {
                        if (this.isSelectedTAC) {
                            this.tacForm?.get(unlock)?.disable();
                        }
                        else {
                            this.tacForm?.get(unlock)?.enable();
                        }
                    }
                });
                break;

            case 'language':
                this.tacForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res && this.tacForm?.get(watch)?.enabled) {
                        if (this.isSelectedTAC) {
                            this.tacForm?.get(unlock)?.disable();
                            this.tacForm?.get('versionName')?.disable();
                        }

                        else {
                            this.tacForm?.get(unlock)?.enable();
                        }
                    }
                });
                break;

            case 'Maturity':
                this.tacForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    this.tacForm?.get(unlock)?.disable();
                });

            default:
                this.tacForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res) {
                        this.tacForm?.get(unlock)?.enable();
                    };
                });
                break;
        };
    }

    extractLanguage(docId: string): string {
        // Split the docId by '-' and extract the second part
        const parts = docId.split('-');
        return parts.length > 1 ? parts[1] : '';
    }

    getallLUtypesCount() {
        const totalItems = this.luType.map(d => d.name);
        const duplicateGroups = this.allLUFromColl.reduce((acc, item) => {
            const key = `${item.type}`;

            const existingGroupIndex = acc.findIndex(group => group.key === key);
            if (existingGroupIndex !== -1) {
                const existingGroup = acc[existingGroupIndex];
                existingGroup.count++;

            } else {
                acc.push({ key, count: 1 });
            }

            return acc;
        }, []);

        const filteredTypes = duplicateGroups.filter(e => totalItems.includes(e.key)).map(j => ({ key: j.key, count: j.count }));
        const present = filteredTypes.map(k => k.key);
        this.luType.forEach((type) => {
            if (!present.includes(type.name)) {
                filteredTypes.push({ key: type.name, count: 0 });
            }
        });
        return filteredTypes;
    }

    tactivitySearchDisplayName(event) {
        const activities = [];
        const alltacs = [];
        this.optionsDisplayname.forEach((elem) => {
            if (elem.learningUnitDisplayName.toLowerCase().includes(event.target.value.toLowerCase()) ||
                elem.learningUnitCode.toString().toLowerCase().includes(event.target.value.toLowerCase())) {
                activities.push(elem.learningUnitDisplayName);
                alltacs.push(elem);
            }
        });
        this.allTacsFordisplay = alltacs;
    }

    selectedDisplayname(event) {
        this.tacForm.patchValue({
            learningUnitDisplayName: event.learningUnitDisplayName
        });
    }

    EnableDisplayEdit() {
        if (this.isSelectedTAC && this.enableEditnewTag) {
            this.tacForm.get('learningUnitDisplayName').enable();
            this.displayNameEdit = false;
        }
        else {
            this.displayNameEdit = true;
            this.tacForm.get('learningUnitDisplayName').disable();
        }
    }

    async addnewLUtype() {
        await import('../insert-learningunittype/insert-learningunittype.module').then(async () => {
            const dialogRef = this.dialog.open(InsertLearningunittypeComponent, {
                data: {
                    allTypes: this.luType,
                },
            });
            dialogRef.afterClosed().subscribe((result) => {
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

    changeTacType(event) {
        if (this.isLUautoSelected && this.tacForm.get('language').value) {
            this.tacForm.patchValue({
                versionName: '',
                language: ''
            });
        }
    }

    EnableVersionEdit() {
        if (this.userAccessLevel == 11) {
            this.tacForm.get('versionName').enable();
        }
        else {
            this.tacForm.get('versionName').disable();
        }
    }

    getoptionLength(option) {
        const optionData = `${option.learningUnitCode} - ${option.learningUnitName} - ${option.typeCode}  - ${option.isoCode} - ${option.version} - ${option.Maturity}`;
        if (optionData.length > 50) {
            this.showFulllength = true;
            this.tacOnOption = optionData;
        }
        else {
            this.showFulllength = false;
            this.tacOnOption = '';
        }
    }

}
