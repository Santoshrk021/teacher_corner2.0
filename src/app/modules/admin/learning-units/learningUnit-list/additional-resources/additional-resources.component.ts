import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { UiService } from 'app/shared/ui.service';
import getVideoId from 'get-video-id';
import { cloneDeep } from 'lodash';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';

@Component({
    selector: 'app-additional-resources',
    templateUrl: './additional-resources.component.html',
    styleUrls: ['./additional-resources.component.scss']
})
export class AdditionalResourcesComponent implements OnInit {
    @Input() maturityObj: any;
    @Input('luDetailsInput') luDetails: any;
    @Input('trashUINotEditableInput') trashUINotEditable: any;
    @Output() additionResUpdate = new EventEmitter<any>();

    boardGradeOBj;
    goldobj;
    silverobj;
    diamondobj;
    otherobj;
    storageBucket = 'learningUnits';
    fileTypeOptions: any[] = [{ value: 'UPLOAD', name: 'Upload PDF' }, { value: 'VIDEO', name: 'Youtube Link' }, { value: 'UPLOAD', name: 'Upload PPT' }];
    publishTypes = ['true', 'false'];
    additionalResourcesForm: FormGroup;
    resourceControls: any;
    extension: string = '';
    filename;
    resourceCopy: any;
    fileType: any = [];
    selectType = [];
    formLength: number;
    dataLoading = false;
    publishstates = [];
    selected = 'true';
    enableForm = false;
    files = [];
    newUrl: string = '';
    type: string = 'default';
    bytesTransferred;
    selectedPublishState: string = 'true'; // Set the default value here
    matTooltipMsg = 'This field isn\'t editable as this learning unit or version has been deleted. Please restore to edit this field';

    constructor(
        private fb: FormBuilder,
        private learningUnitService: LearningUnitsService,
        private luServiceResources: LearningUnitResourcesService,
        private configurationService: ConfigurationService,
        private uiService: UiService,
        private afStore: AngularFireStorage,
    ) {
        this.additionalResourcesForm = this.fb.group({
            resources: this.fb.array([])
        });
    }

    async ngOnInit() {
        this.formLength = this.luDetails?.additionalResources?.length;
        if (this.luDetails?.additionalResources?.length) {
            this.luDetails?.additionalResources.map((d, index) => {
                this.addResources(d, this.luDetails?.additionalResources?.length, index);
                this.files.push({
                    type: d.type,
                    path: d?.resourcePath,
                    fileExtension: d?.fileExtension
                });
                if (d.fileExtension == 'pdf') {
                    this.selectType.push('Upload PDF');
                }
                else if (d.fileExtension == 'video') {
                    this.selectType.push('Youtube Link');
                }
                else {
                    this.selectType.push('Upload PPT');
                }
                this.publishstates.push(d.publish.toString());

            });
            if (this.trashUINotEditable == true) {
                this.additionalResourcesForm.disable();
            }
        }

        const formsArray = this.additionalResourcesForm.get('resources') as FormArray;
        this.resourceCopy = cloneDeep(formsArray.value);
        formsArray.controls.forEach((formGroup, index) => {
            formGroup.valueChanges.subscribe((changes) => {
                if (JSON.stringify(changes) !== JSON.stringify(this.resourceCopy[index]) &&
                    (formsArray.controls.length == this.resourceCopy.length) &&
                    (formsArray.controls.length != 0)) {

                    this.enableForm = true;
                } else {
                    this.enableForm = false;
                }
                // Do whatever you want with the changes here
            });
        });

        const resources: any = await this.configurationService.getTactivitysiteResources();
        const resourcesConfig = resources.resourcesConfig;
        this.boardGradeOBj = resourcesConfig.boardGradeOBj;
        this.goldobj = resourcesConfig.goldobj;
        this.silverobj = resourcesConfig.silverobj;
        this.diamondobj = resourcesConfig.diamondobj;
        this.otherobj = resourcesConfig.otherobj;
    }

    get resource() {
        return this.additionalResourcesForm.get('resources') as FormArray;
    }

    public addResources(add?, length?, index?) {
        this.resource.push(this.newResources(add));
        if (this.resource.length != this.formLength) {
            this.enableForm = true;
        }
        else {
            this.enableForm = false;
        }
    }

    private newResources(add?): FormGroup {
        return this.fb.group({
            'title': new FormControl(add?.title || '', [Validators.required]),
            'type': new FormControl(add?.type || '', [Validators.required]),
            'fileExtension': new FormControl(add?.fileExtension || ''),
            'resourcePath': new FormControl(add?.resourcePath || '', [Validators.required]),
            'publish': new FormControl(add?.publish.toString() || 'false', [Validators.required]),
            'shortdescription': new FormControl(add?.shortdescription || ''),
            'uploadProgress': 0,
        });
    }

    public removeFormgroup(i: number) {
        this.resource.removeAt(i);
        if (this.resource.length != this.formLength) {
            this.enableForm = true;
        }
        else {
            this.enableForm = false;
        }
    }

    selectFileType(e: any, i) {
        if (e.value == 'Youtube Link') {
            (this.resource.at(i) as FormGroup).patchValue({
                type: 'VIDEO',
                resourcePath:/*  this.luDetails ? this.luDetails.additionalResources[i]?.resourcePath :  */'',
                fileExtension: 'video'
            });
        }
        else if (e.value == 'Upload PDF') {
            (this.resource.at(i) as FormGroup).patchValue({
                type: 'UPLOAD',
                resourcePath: /* this.luDetails ? this.luDetails.additionalResources[i]?.resourcePath : */ '',
                fileExtension: 'pdf'
            });
        }
        else {
            (this.resource.at(i) as FormGroup).patchValue({
                type: 'UPLOAD',
                resourcePath: /* this.luDetails ? this.luDetails.additionalResources[i]?.resourcePath : */ '',
                fileExtension: 'ppt'
            });
        }
    }

    async getLUdetails(doc) {
        return await this.luServiceResources.getDocDataByDocId(doc);
    }

    async saveAdditonalResources(form) {
        const resourcesArr = form.value.resources;
        resourcesArr.map(res => delete res['uploadProgress']);
        const addResources = {
            additionalResources: resourcesArr
        };
        await this.learningUnitService.updateLU(this.luDetails.docId, addResources);
        this.uiService.alertMessage('successful', 'The changes has been saved successfully', 'success');

        this.luDetails = await this.updateLearningUnit(this.luDetails.docId);
        const addedResources = this.luDetails.additionalResources;
        this.additionResUpdate.emit(addedResources);
        this.enableForm = false;
        let obj = {
            containsResources: false
        };
        const maturityResource: any = await this.getLUdetails(this.maturityObj[this.luDetails.Maturity.toLowerCase()]);

        const check = this.checkResources(this.luDetails, maturityResource.resources, this.luDetails.Maturity.toLowerCase());
        const check1 = this.checkResources(this.luDetails, maturityResource.resources, 'boardGrade');
        const check2 = this.checkAdditionalResources('additionalResources');

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
    }

    checkVideoUrl(event, i) {
        const result = getVideoId(event.target.value);
        if (result.service == 'youtube') {
            this.newUrl = event.target.value
                (this.resource.at(i) as FormGroup).patchValue({
                    type: 'VIDEO',
                    resourcePath: event.target.value,
                    fileExtension: 'video'
                });
        }
        else {
            (this.resource.at(i) as FormGroup).patchValue({
                type: 'ERROR',
                resourcePath: '',
                fileExtension: ''
            });

            this.uiService.alertMessage('Wrong URL', 'Please Enter the Youtube URL', 'warn');
        }
        (this.resource.at(i) as FormGroup).patchValue({
            fileExtension: this.files[i].fileExtension
        });
    }

    async selectFile(event, i) {
        this.filename = event.target.files[0].name;
        this.extension = this.filename.split('.').slice(-1).pop();
        const isValid = this.fileTypeAndSizeCheck(event.target.files[0], this.resource.at(i).get('fileExtension').value);

        if (isValid) {
            const bucketPath = `${this.storageBucket}/${this.luDetails.docId}/` + `add${i}` + '.' + this.filename.split('.').slice(-1).pop();
            const ref = this.afStore.ref(bucketPath);
            const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();
            task.subscribe(async (uploadedSnapshot) => {
                const bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
                (this.resource.at(i) as FormGroup).patchValue({
                    uploadProgress: bytesTransferred
                });
                if (uploadedSnapshot.state === 'success') {
                    await this.updateDB(bucketPath, i);
                }
            });
        }
    }

    updateDB(bucketPath, i) {
        if (this.extension == 'pdf') {
            (this.resource.at(i) as FormGroup).patchValue({
                type: 'UPLOAD',
                resourcePath: bucketPath,
                fileExtension: 'pdf'
            });
        }
        else {
            (this.resource.at(i) as FormGroup).patchValue({
                type: 'UPLOAD',
                resourcePath: bucketPath,
                fileExtension: this.extension
            });
        }
        this.resource.value[i].resourcePath = bucketPath;
        const resourcesArr = this.resource.value;
        resourcesArr.map(res => delete res['uploadProgress']);
        const obj = {
            additionalResources: resourcesArr
        };
        try {
            this.learningUnitService.updateLU(this.luDetails.docId, obj);
            this.uiService.alertMessage('Saved', 'The file has been uploaded successfully', 'success');
        } catch (error) {
            this.uiService.alertMessage('Oops', 'Try Again ...', 'info');
        }
    }

    async updateLearningUnit(docId) {
        return await this.learningUnitService.getLearningUnitData(docId);
    }

    fileTypeAndSizeCheck(event, type) {
        const allowedExtensions = /(\.pdf|\.ppt|\.pptx)$/i;
        let isValid = false;
        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage('Invalid File Type', 'Only allowed PDF, PPT and PNG or JPEG files', 'warn');
            isValid = false;
        }
        /* Max PPT File 100MB */
        else if (type == 'ppt' || type == 'pptx' && event.size <= 157286400) {
            isValid = true;
        }
        else if (type == 'ppt' || type == 'pptx' && event.size > 157286400) {
            this.uiService.alertMessage('File Size Exceeds', 'Maximum PPT file size should be 150MB', 'warn');
            isValid = false;
        }
        else if (event.size > 10485760) {
            this.uiService.alertMessage('File Size Exceeds', 'Maximum file size should be 10MB', 'warn');
            isValid = false;
        }
        else {
            isValid = true;
        }
        return isValid;
    }

    selectPublish(event, i) {
        const publishval = event.value === 'true' ? true : false;

        (this.resource.at(i) as FormGroup).patchValue({
            publish: publishval
        });
    }

    checkResources(Lu, res, type) {
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
        else if (type == 'gold') {
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
                    if (res?.[obj.res]?.[obj.subres] != '' && typeof (res?.[obj.res]?.[obj.subres]) !== 'undefined') {
                        return true;
                    }
                } else {
                    return false;
                }
            });
        }
    }

    checkAdditionalResources(type) {
        if (type == 'additionalResources') {
            return this.otherobj.some((obj) => {
                if (this.luDetails?.[obj.otherresources] && typeof (this.luDetails?.[obj.otherresources]) !== 'undefined') {
                    return this.luDetails[obj.otherresources].length != 0;
                } else {
                    return false;
                }
            });
        }
    }

}
