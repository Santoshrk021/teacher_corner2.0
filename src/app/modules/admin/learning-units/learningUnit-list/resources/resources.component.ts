import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { UiService } from 'app/shared/ui.service';
import { MatDialog } from '@angular/material/dialog';
import { ViewResourcesComponent } from '../external-resource/view-resources/view-resources.component';
import { EditResourcesComponent } from '../external-resource/edit-resources/edit-resources.component';
import { lastValueFrom } from 'rxjs';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';

@Component({
    selector: 'app-resources',
    templateUrl: './resources.component.html',
    styleUrls: ['./resources.component.scss']
})
export class ResourcesComponent implements OnInit {
    boardGradeOBj: any;
    goldobj;
    silverobj;
    diamondobj;
    otherobj;
    @Input('luDetailsInput') luDetails: any;
    @Input() luResources: any;
    @Input() key: any;
    // @Input('allResources') allResources: any;
    @Input() maturityObj: any;
    @Input() selectLUhardCopy: any;
    @Input() cumulativeMaturities: any;
    subScriptions = [];
    storageBucket = 'learningUnits';
    externalResourcedUpdate: any;
    videoInputs = [];
    multipleFiles = [];
    loading = {};
    cumulativematurities;
    boardGradeResource: any = {};

    externalResourceCopy: any;
    fileSelected = false;
    enableForm = false;
    gradeDependentSources = {};
    externalResourcePath = {
        guidePath: '',
        materialPath: '',
        observationPath: '',
        videoUrl: '',
        templatePath: '',
        topicGuidePath: '',
        topicVideoUrl: '',
        varVideoUrl: '',
        varGuidePath: '',
    };

    uploadProgress = {
        qrCode: 0,
        headlineImage: 0,
        templates: 0,
        dieTemplate: 0,
        tacGuidePrint: 0,
        tacGuideOnline: 0,
        label18Sticker: 0,
        tacIllustration: 0,
        Conversion3D: 0,
        packingPhoto: 0,
        varLabel: 0
    };
    loader = false;
    filename;
    bytesTransferred = {
    };
    matTooltipMsg = '';
    videoURL: any;
    mValue: string;
    divides = [];
    luConfig: any;
    resArr = [];
    gridClass: string;
    @ViewChild('elementRef', { static: false }) elementRef: ElementRef;
    urlValid: any = {};
    rowCount: number;
    width: number;
    maturities = ['Gold', "Silver", 'Platinum', 'Diamond'];
    maturities1 = [];
    maturitiesdropdown: any = [];
    selectedMaturity: string = '';
    hardCopyofLU: any;
    selectedTab: any;
    fileNameGenerator: any
    constructor(
        private uiService: UiService,
        private afStore: AngularFireStorage,
        private afStorage: AngularFireStorage,
        private dialog: MatDialog,
        private luResourceService: LearningUnitResourcesService,
        private configurationService: ConfigurationService,
        private Config: ConfigurationService,
        private learningUnitService: LearningUnitsService,
        private sharedService: SharedService,
    ) {
    }

    populateResArr() {
        for (let i = 0; i < this.luConfig.length; i += 3) {
            const row = this.luConfig.slice(i, i + 3);
            this.resArr.push(row);
        }
        return this.resArr;
    }

    calculateRowCount(rem, lulength): number {
        if (rem > 0 && lulength > 3) {
            this.rowCount += 1;
        }
        return this.rowCount;
    }

    // Method to update rowCount and width dynamically
    updateRowCountAndWidth(rem, lulength): void {
        if (rem > 0 && lulength > 3) {
            this.rowCount += 1;
        }
        if (this.rowCount == 2 || this.rowCount == 1) {
            this.width = 520;
        } else if (this.rowCount == 3) {
            this.width = 340;
        } else if (this.rowCount > 3) {
            this.width = 260;
        }
    }

    // Getter to bind to the template
    get gridStyle() {
        return {
            '--row-count': this.rowCount,
            '--width': this.width + 'px'  // Add 'px' to the width value
        };
    }

    async ngOnInit() {
        const resources: any = await this.configurationService.getTactivitysiteResources();
        const resourcesConfig = resources.resourcesConfig;
        this.boardGradeOBj = resourcesConfig.boardGradeOBj;
        this.goldobj = resourcesConfig.goldobj;
        this.silverobj = resourcesConfig.silverobj;
        this.diamondobj = resourcesConfig.diamondobj;
        this.otherobj = resourcesConfig.otherobj;
        this.Config.getConfigBoardsForFilenames();
        await this.changeMaturity(this.luDetails.Maturity);
        const selectedSet = this.cumulativeMaturities[this.luDetails.Maturity.toLowerCase()].cumulativeMaturity;
        // const selectedSet = new Set(this.maturities1); 
        //  console.log('selectedSet', selectedSet);  
        //  console.log('selectedSet', this.maturities);  

         const selectedSet1 = new Set(selectedSet);
         const result = this.maturities.map(m => ({ value: m, status: selectedSet1.has(m) }));
        //  console.log('result', result); 
         this.maturitiesdropdown = result;


        // const result = this.maturities.map(m => ({ value: m, status: selectedSet.has(m) }));
        // console.log('result', result);  

        // this.maturities = this.cumulativeMaturities[this.luDetails.Maturity.toLowerCase()].cumulativeMaturity;
        // console.log('result', result);  
        this.selectedMaturity = this.luDetails.Maturity; 
    }
 
    onInputModify(event, resourceKey) { 
        this.externalResourcePath[this.mValue][this.key][resourceKey] = event.target.value;
        this.luDetails.resources[this.mValue][this.key][resourceKey] = event.target.value;
        this.urlValid[resourceKey] = this.testURLValid(this.externalResourcePath[this.mValue][this.key][resourceKey]);
        const values = [];
        Object.keys(this.urlValid).forEach((key) => {
            if (this.externalResourcePath[this.mValue][this.key][key] != '') {
                values.push(this.testURLValid(this.externalResourcePath[this.mValue][this.key][key]));
            }
        });

        if ((this.externalResourceCopy[resourceKey] !== event.target.value) && (!values.includes(false))) {
            this.enableForm = true;
        }
        else {
            this.enableForm = false;
        }
    }

    selectFile(event: any, type: string, resource: any) {
        const {
            isoCode,
            learningUnitCode,
            learningUnitDisplayName,
            typeCode,
            version,
        } = this.luDetails;

        const code = `${typeCode}${learningUnitCode}${resource.resourceCode}${isoCode}${version} ${learningUnitDisplayName}`;
        this.fileSelected = true;
        this.loader = true;
        this.filename = event.target.files[0].name;
        const isValid = this.pdfTypeAndSizeCheck(event.target.files[0]);
        if (isValid) {
            const bucketPath = `${this.storageBucket}/${this.luDetails.docId}/${code}.` + this.filename.split('.').slice(-1).pop();
            const ref = this.afStore.ref(bucketPath);
            const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();
            task.subscribe(async (uploadedSnapshot) => {
                this.bytesTransferred[type] = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
                if (uploadedSnapshot.state === 'success') {
                    this.externalResourcePath[this.mValue][this.key][type] = bucketPath;
                    await this.updateDB(bucketPath, type, true);
                    const { Maturity: maturity, learningUnitName, learningUnitId } = this.luDetails;
                    const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
                    const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
                    const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
                    const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
                    const messageContent = `A new resource '${this.filename}' has been uploaded for '${this.key}' category, '${type}' sub-category, '${maturity}' maturity in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
                    await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
                    this.uiService.alertMessage('successful', 'Uploaded successfully', 'success');
                    this.loader = false;
                }
            });
        }
    }

    async editView(parentName: string, resourceCodes: string,) {
        await import('../external-resource/edit-resources/edit-resources.module');
        const dialogRef = this.dialog.open(EditResourcesComponent, {
            data: {
                learningUnitDetails: this.luDetails,
                parentName,
                catObject: this.luDetails?.resources?.[`${this.mValue}`]?.[this.key],
                componentName: this.key,
                maturity: this.mValue,
                hardCopyLU: this.selectLUhardCopy,
                componentDetails: this.luConfig.find(config => config.key === parentName),
                listedMaturties: this.maturityObj,
                resourceCodes,
            },
            disableClose: true,
        });

        dialogRef.afterClosed().subscribe((d) => {
            if (typeof (d) == 'object') {
                const modifiedkeys = Object.keys(this.luDetails?.resources?.[`${this.mValue}`]?.[this.key]?.[parentName]);
                Object.keys(d).forEach((k) => {
                    if (modifiedkeys.includes(k)) {
                        this.luDetails.resources[`${this.mValue}`][this.key][parentName][k] = { ...this.luDetails.resources[`${this.mValue}`][this.key][parentName][k], ...d[k] };
                    }
                    else {
                        if (typeof (this.luDetails.resources[`${this.mValue}`][this.key][parentName]) !== 'object') {
                            this.luDetails.resources[`${this.mValue}`][this.key][parentName] = {
                                [k]: d[k]
                            };
                        }
                        else {
                            this.luDetails.resources[`${this.mValue}`][this.key][parentName][k] = d[k];
                        }
                    }
                });
                this.gradeDependentSources[parentName] = true;
            }
        });
    }

    async updateDB(bucketPath?, type?, fileselected: boolean = false) {
        this.externalResourcePath[this.mValue][this.key][type] = bucketPath;
        this.luDetails.resources[this.mValue][this.key][type] = bucketPath;
        this.selectLUhardCopy.resources[this.mValue][this.key][type] = bucketPath;
        const docId = this.luDetails.maturityDoc;
        if (type) {
            try {
                const updateData = {
                    resources: {
                        [this.key]: {
                            [type]: bucketPath

                        }

                    }
                };

                await this.luResourceService.updateLUResources(updateData, docId);
                this.uiService.alertMessage('Saved', 'Successfully Updated', 'success');
                let obj = {
                    containsResources: true
                };
                const currentMaturityResource: any = await this.getLUdetails(this.maturityObj[this.luDetails.Maturity.toLowerCase()]);
                const currentLUAfterupdate = await this.learningUnitService.getLearningUnitData(this.luDetails.docId);
                const check = this.checkResources(currentMaturityResource.resources, this.luDetails.Maturity.toLowerCase(), this.luDetails);
                const check1 = this.checkResources(currentMaturityResource.resources, 'boardGrade', this.luDetails);
                const check2 = this.checkAdditionalResources('additionalResources', currentLUAfterupdate);
                const mapped = [check, check1, check2];
                const result = mapped.some(d => d === true);
                if (result) {
                    obj = {
                        containsResources: true
                    };
                }
                else {
                    obj = {
                        containsResources: false
                    };
                }
                this.learningUnitService.updateLUwithDocId(obj, this.luDetails.docId);
            } catch (error) {
                this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
            }
        }
        else {
            this.uiService.alertMessage('Error', 'Resource is not defined', 'error');
        }
    }

    async getLUdetails(doc) {
        const reosurces = await this.luResourceService.getDocDataByDocId(doc);
        return reosurces;
    }

    pdfTypeAndSizeCheck(event) {
        let isValid = false;
        // if (!allowedExtensions.exec(event.name)) {
        //     this.uiService.alertMessage('Invalid file type', 'Only allowed .pdf file type', 'warn')
        //     this.filename = ''
        //     isValid = false
        // }

        // if (event.size > 3145728) {
        if (event.size > 1073741824) {
            this.uiService.alertMessage('Invalid file type', 'maximum image size should be 1gb', 'warn');
            this.filename = '';
            isValid = false;
        }
        else {
            isValid = true;
        }
        return isValid;
    }

    async changeMaturity(mvalue) {
        this.resArr = [];
        this.selectedMaturity = mvalue.value;
        this.mValue = typeof (mvalue) == 'object' ? mvalue.value.toLowerCase() : mvalue.toLowerCase();
        if (this.luDetails.resources[this.mValue]) {
            //----Handling other lu types----------------------//
            this.luConfig = this.luResources;
            this.luConfig = this.luConfig[this.mValue][this.key];
            this.luDetails.resources[this.mValue] = {};            //  }
            // this.luDetails.resources[this.mValue][this.key] = this.allResources[this.mValue][this.key]
            // this.selectLUhardCopy.resources[this.mValue] = this.allResources[this.mValue]
            const matutityResource: any = await this.getLUdetails(this.maturityObj[this.mValue]);
            // this.luDetails.resources[this.mValue][this.key] = this.allResources[this.mValue][this.key]
            this.luDetails.resources[this.mValue][this.key] = matutityResource?.resources[this.key];
            this.selectedTab = Object.keys(this.luDetails.resources[this.mValue])[0];

            // this.selectLUhardCopy.resources[this.mValue] = this.allResources[this.mValue]
            this.selectLUhardCopy.resources[this.mValue] = matutityResource?.resources;

            // if (
            //     typeof this.luDetails.resources[this.mValue][this.key] === 'object' &&
            //     this.luDetails.resources[this.mValue][this.key] !== null &&
            //     Object.keys(this.luDetails.resources[this.mValue][this.key]).length === 0
            // ) {
            //     console.error('This specific resource is empty');
            // }


            this.luDetails['maturityDoc'] = this.maturityObj[this.mValue];
            const boardListRef = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('BoardListAll'));
            const boardList = Object.values(boardListRef.get('boardsInternational')).flat().map((board: any) => board?.code);

            Object.keys(this.luConfig).forEach((resourcekey) => {
                this.luConfig[resourcekey]['key'] = resourcekey;
                this.uploadProgress[resourcekey] = 0;
                if (this.luConfig[resourcekey].type == 'video' && this.luConfig[resourcekey].allowedExtensions == 'video' && this.luConfig[resourcekey].isGradeDependent == false) {
                    this.urlValid[resourcekey] = this.testURLValid(this.luDetails.resources?.[`${this.mValue}`]?.[this.key]?.[resourcekey]);
                    this.videoInputs.push(resourcekey);
                }
                if (this.luConfig[resourcekey].type == 'files') {
                    this.loading[resourcekey] = false;
                    this.multipleFiles.push(resourcekey);
                }
                if (this.luConfig[resourcekey].isGradeDependent == true) {
                    const contentCategory = this.luDetails.resources?.[`${this.mValue}`]?.[this.key];
                    if (contentCategory?.hasOwnProperty(resourcekey)) {
                        // this.gradeDependentSources[resourcekey] = Object.keys(resource?.filter(e => e != 'universalGradeBoardResourcePath')?.length > 0 ? true : false;
                        const hasUniversalGradeBoardResourcePath = Boolean(contentCategory[resourcekey]?.hasOwnProperty('universalGradeBoardResourcePath') && contentCategory[resourcekey]?.universalGradeBoardResourcePath?.length);
                        const hasBoardGradeResourceId = boardList.some(board => contentCategory[resourcekey].hasOwnProperty(board) && contentCategory[resourcekey]?.[board].length);
                        this.gradeDependentSources[resourcekey] = (hasUniversalGradeBoardResourcePath || hasBoardGradeResourceId);// ? true : false;
                    }
                }
            });

            const keyincurrentResource = [];
            for (const k in this.luConfig) {
                if (this.luConfig[k].hasOwnProperty('isDisplayedOnFrontend') && !!this.luConfig[k].isDisplayedOnFrontend) {
                    keyincurrentResource.push(this.luConfig[k]);
                }
            }

            this.luConfig = keyincurrentResource;
            this.luConfig = this.luConfig.sort((a: any, b: any) => {
                if (a.display > b.display) {
                    return 1;
                } else if (a.display < b.display) {
                    return -1;
                } else {
                    return 0;
                }
            });

            this.rowCount = Math.floor(this.luConfig.length / 3);
            const remainderElem = this.luConfig.length % 3;
            if (this.luConfig.length >= 1 && this.luConfig.length <= 3) {
                if (this.luConfig[0].length == 0) {

                    this.resArr[0] = this.resArr[1];
                    this.resArr[1] = [];
                }
                this.rowCount = 2;
            }
            this.updateRowCountAndWidth(remainderElem, this.luConfig.length);
            this.populateResArr();
            this.externalResourcePath = {
                guidePath: this.luDetails.resources?.guidePath || '',
                materialPath: this.luDetails.resources?.materialPath || '',
                observationPath: this.luDetails.resources?.observationPath || '',
                videoUrl: this.luDetails.resources?.videoUrl || '',
                templatePath: this.luDetails.resources?.templatePath || '',
                topicVideoUrl: this.luDetails.resources?.topicVideoUrl || '',
                topicGuidePath: this.luDetails.resources?.topicGuidePath || '',
                varVideoUrl: this.luDetails.resources?.varVideoUrl || '',
                varGuidePath: this.luDetails.resources?.varGuidePath || '',
                [this.mValue]: this.luDetails.resources?.[`${this.mValue}`]
            };

            const configKeys = keyincurrentResource.map((k => k.key));
            configKeys.forEach((key) => {
                if (!Object.keys(this.luDetails?.resources?.[this.mValue]?.[this.key])?.includes(key)) {
                    this.luDetails.resources[this.mValue][this.key][key] = '';
                }
            });

            Object.keys(this.externalResourcePath?.[this.mValue]?.[this.key]).forEach((e) => {
                this.bytesTransferred[e] = 0;
            });
        }
        else {
            alert('Maturity is not allowed');
        }
        this.externalResourcedUpdate = JSON.parse(JSON.stringify(this.externalResourcePath[this.mValue][this.key]));
        this.externalResourceCopy = JSON.parse(JSON.stringify(this.externalResourcePath[this.mValue][this.key]));
    }

    /*
    // old code
    disableView(keyName: string) {
        const object = this.luDetails?.resources?.[`${this.mValue}`]?.[this.key]?.[keyName];
        if (object) {
            return Object.keys(object)?.filter(e => e != 'universalGradeBoardResourcePath')?.length > 0 ? false : true;
        }
        else {
            return true;
        }
    }
    */

    async resourceView(resourceName, resourceCodes: string) {
        await import('../external-resource/view-resources/view-resoureces.module');
        this.dialog.open(ViewResourcesComponent, {
            data: {
                luDetails: this.luDetails,
                resourceCategory: this.key,
                resourceName: resourceName,
                maturity: this.mValue,
                configResources: this.luConfig,
                boardForFilenames: this.Config.boardConfigforFilenames.value,
                componentDetails: this.luConfig.find(config => config.key === resourceName),
                listedMaturties: this.maturityObj,
                resourceCodes
            }
        });
    }

    testURLValid(val) {
        if (val) {
            if (val.trim() !== '') {
                const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
                return urlPattern.test(val) == false ? false : true;
            }
        }
    }

    // testURLValid(val) {
    //     if (val !== null && val !== undefined) {
    //         if (val.trim() !== '') {
    //             const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
    //             return urlPattern.test(val) == false ? false : true
    //         }
    //         else {
    //             return false
    //         }
    //     }
    //     else {
    //         return false
    //     }
    // }

    onInputFile(event: Event, videoKey: string, resource: any) {
        this.loader = true;
        const file = (event.target as HTMLInputElement).files[0];
        let isValid: boolean;
        isValid = this.videoFileTypeAndSizeCheck(file);
        if (isValid) {
            this.handleVideoFile(file, videoKey, resource);
        } else {
            console.error('file is invalid');
        };
    }

    videoFileTypeAndSizeCheck(event) {
        /*
        // file extension check - add logic later
        const allowedExtensions = /(\.mp4)$/i;
        let isValid = false;
        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage(
                'Invalid file type',
                'Only allowed mp4 file',
                'warn'
            );
            this.elementRef.nativeElement.value = '';
            isValid = false;
        }
        */
        let isValid = true;
        if (event.size > 1073741824) {
            this.uiService.alertMessage(
                'Invalid file type',
                'maximum video size should be 1gb',
                'warn'
            );
            this.elementRef.nativeElement.value = '';
            isValid = false;
        } else {
            isValid = true;
        }
        return isValid;
    }

    async handleVideoFile(file: any, videoKey: string, resource: any) {

        const {
            isoCode,
            learningUnitCode,
            learningUnitDisplayName,
            typeCode,
            version,
        } = this.luDetails;

        this.filename = file.name;
        const code = `${typeCode}${learningUnitCode}${resource.resourceCode}${isoCode}${version} ${learningUnitDisplayName}`;
        const bucketPath = `${this.storageBucket}/${this.luDetails.docId}/${code}.${file.name.split('.').slice(-1).pop()}`;
        const ref = this.afStorage.ref(bucketPath);
        //putting the file into storage with custom metadata
        const task = ref
            .put(file, {
                customMetadata: { original_name: file.name },
            })
            .snapshotChanges();

        task.subscribe(async (uploadedSnapshot) => {
            this.bytesTransferred[videoKey] = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
            if (uploadedSnapshot.state === 'success') {

                await this.updateResourcePath(
                    bucketPath,
                    videoKey
                );
                this.uiService.alertMessage(
                    'successful',
                    ' File is uploaded successfully',
                    'success'
                );
                this.loader = false;
            } else {
                console.error('Error uploading the file');
            };
        });
    }

    async updateResourcePath(resourcePath: string, videoKey: string) {
        this.externalResourcePath[this.mValue][this.key][videoKey] = resourcePath;
        await this.updateDB(resourcePath, videoKey);
        const { Maturity: maturity, learningUnitName, learningUnitId } = this.luDetails;
        const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
        const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
        const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
        const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
        const messageContent = `A new resource '${this.filename}' has been uploaded for '${this.key}' category, '${videoKey}' sub-category, '${maturity}' maturity in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
        await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
    }

    async updateInputs(fileselected: boolean = false) {
        const docId = this.luDetails.maturityDoc;

        const res: any = await this.getLUdetails(docId);

        this.videoInputs.forEach(async (key) => {
            this.luDetails['resources'][this.mValue][this.key][key] = this.externalResourcePath[this.mValue][this.key][key];
            res.resources[this.key][key] = this.externalResourcePath[this.mValue][this.key][key];
            const { Maturity: maturity, learningUnitName, learningUnitId } = this.luDetails;
            const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
            const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
            const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
            const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
            const messageContent = `A new resource link '${this.externalResourcePath[this.mValue][this.key][key]}' has been saved for '${this.key}' category, '${key}' sub-category, '${maturity}' maturity in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
            await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
        });

        this.multipleFiles.forEach((f) => {
            this.luDetails['resources'][this.mValue][this.key][f] = this.externalResourcePath[this.mValue][this.key][f];
            res.resources[this.key][f] = this.externalResourcePath[this.mValue][this.key][f];
        });

        try {
            try {
                if (Object.keys(this.luDetails.resources[this.mValue]).includes('undefined')) {
                    delete this.luDetails.resources[this.mValue]['undefined'];
                }
                const obj = { resources: res.resources };
                const docId = this.luDetails.maturityDoc;
                await this.luResourceService.updateLUResources(obj, docId);
                let obj1 = {
                    containsResources: false

                };
                const currentMaturityresource: any = await this.getLUdetails(this.maturityObj[this.luDetails.Maturity.toLowerCase()]);
                const currentLUAfterupdate = await this.learningUnitService.getLearningUnitData(this.luDetails.docId);
                const check = this.checkResources(currentMaturityresource.resources, this.luDetails.Maturity.toLowerCase(), this.luDetails);
                const check1 = this.checkResources(currentMaturityresource.resources, 'boardGrade', this.luDetails);
                const check2 = this.checkAdditionalResources('additionalResources', currentLUAfterupdate);

                const mapped = [check, check1, check2];
                const result = mapped.some(d => d === true);

                if (result) {
                    obj1 = {
                        containsResources: true
                    };
                }
                else {
                    obj1 = {
                        containsResources: false
                    };

                }

                await this.learningUnitService.updateLUwithDocId(obj1, this.luDetails.docId);

                this.uiService.alertMessage('Saved', 'Successfully Updated', 'success');
            } catch (error) {
                this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
            }
            this.enableForm = false;
        } catch (error) {
            this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
        }
    }

    async onMultipleInputFile(event, key) {
        this.loading[key] = true;
        let allFiles = [];
        const allTasks = [];
        let initialCount = 0;

        if (this.externalResourcePath[this.mValue][this.key][key] == '') {
            initialCount = 0;
            allFiles = [];
        } else {
            initialCount = this.externalResourcePath[this.mValue][this.key][key].length;
            allFiles = this.externalResourcePath[this.mValue][this.key][key];
        }

        for (let i = 0; i < event.target.files.length; i++) {
            this.filename = event.target.files[i].name;
            const bucketPath = `${this.storageBucket}/${this.luDetails.docId}/${key}/${key}_${i + initialCount}.` + this.filename.split('.').slice(-1).pop();
            const ref = this.afStorage.ref(bucketPath);
            const task: any = ref.put(event.target.files[i], { customMetadata: { original_name: this.filename } });
            allFiles.push(bucketPath);
            allTasks.push(lastValueFrom(task.snapshotChanges()));
            const { Maturity: maturity, learningUnitName, learningUnitId } = this.luDetails;
            const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
            const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
            const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
            const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
            const messageContent = `A new resource '${this.filename}' has been uploaded for '${this.key}' category, '${key}' sub-category, '${maturity}' maturity in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
            await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
        }

        this.externalResourcePath[this.mValue][this.key][key] = allFiles;
        this.luDetails.resources[this.mValue][this.key][key] = allFiles;
        await Promise.all(allTasks);
        this.enableForm = true;
        this.loading[key] = false;
    }

    async showFiles(key) {
        await import('../external-resource/edit-resource-files/editresource-files.module');
    }

    cleanObject(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                // If the value is an empty string or undefined, delete the key
                if (value === undefined) {
                    delete obj[key];
                }
                else if (typeof value === 'object' && value !== null) {
                    // Recursively clean objects
                    this.cleanObject(value);
                }
            }
        }
        return obj;
    }

    copyFileName(resource: any) {
        const {
            isoCode,
            learningUnitCode,
            learningUnitDisplayName,
            typeCode,
            version,
        } = this.luDetails;
        const code = `${typeCode}${learningUnitCode}${resource.resourceCode}${isoCode}${version} ${learningUnitDisplayName}`;
        if (code) {
            navigator.clipboard.writeText(code).then(() => {
                this.uiService.alertMessage('Copied', 'File name has been successfully copied', 'success');
            }).catch((error) => {
                console.error('Failed to copy:', error);
                this.uiService.alertMessage('Error', 'Some error has occured', 'error');
            });
        }
    }

    checkResources(res, type, Lu) {
        if (type == 'boardGrade') {
            return this.boardGradeOBj.some((obj) => {

                if (res?.[obj.res]?.[obj.subres]['universalGradeBoardResourcePath'] != '' && typeof (res?.[obj.res]?.[obj.subres]['universalGradeBoardResourcePath']) !== 'undefined') {
                    return true;
                }
                else {
                    if (res?.[obj.res]?.[obj.subres][obj.board] != '' && typeof (res?.[obj.res]?.[obj.subres][obj.board]) !== 'undefined') {
                        return true;

                    }
                    else {
                        return false;
                    }
                }

            });
        }
        if (type == 'gold') {
            return this.goldobj.some((obj) => {
                if (res?.[obj.res]?.[obj.subres] != '' && typeof (res?.[obj.res]?.[obj.subres]) !== 'undefined') {

                    return true;
                } else {
                    return false;
                }
            });
        }
        else if (type == 'silver') {
            return this.silverobj.some((obj) => {
                if (res?.[obj.res]?.[obj.subres] != '' && typeof (res?.[obj.res]?.[obj.subres]) !== 'undefined') {
                    return true;
                }
                else {
                    return false;
                }
            });
        }
        else if (type == 'diamond') {
            return this.diamondobj.some((obj) => {
                if (res?.[obj.res]) {
                    return res[obj.res][obj.subres] != '';
                } else {
                    return false;
                }
            });
        }
        else if (type == 'additionalResources') {
            return this.otherobj.some((obj) => {
                if (Lu?.[obj.otherresources] && typeof (Lu?.[obj.otherresources]) !== 'undefined') {
                    return Lu[obj.otherresources].length != 0;
                } else {
                    return false;
                }
            });
        }
    }

    checkAdditionalResources(type, Luafterupdate) {
        if (type == 'additionalResources') {
            return this.otherobj.some((obj) => {
                if (Luafterupdate?.[obj.otherresources] && typeof (Luafterupdate?.[obj.otherresources]) !== 'undefined') {
                    return Luafterupdate[obj.otherresources].length != 0;
                } else {
                    return false;
                }
            });

        }
    }

}
