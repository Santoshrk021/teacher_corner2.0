import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Inject, OnInit } from '@angular/core';
import { AngularFireStorage, AngularFireStorageReference } from '@angular/fire/compat/storage';
import { serverTimestamp } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { BoardGradeResourcesService } from 'app/core/dbOperations/boardGradeResources/boardGradeResources.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { Observable, first, lastValueFrom, map, startWith } from 'rxjs';

@Component({
    selector: 'app-edit-resources',
    templateUrl: './edit-resources.component.html',
    styleUrls: ['./edit-resources.component.scss']
})
export class EditResourcesComponent implements OnInit {
    boards: Array<any>;
    filteredBoards: Observable<any>;
    selectedBoards: Array<any> = new Array<any>();
    elementRef: ElementRef;
    storageBucket = 'learningUnits';
    loader = false;
    bytesTransferred;
    fileTobeArchived = [];
    submitBtnActive = false;
    storedFilePath: string = '';
    filename: string = '';
    gradeDependentResources: any;
    tooltipMessage: string = '';
    reuploadBoolean = false;
    existingBoardObj = {};
    boardcollectionDocId: string;
    hardCopyofLU;
    boardGradeOBj;
    goldobj;
    silverobj;
    diamondobj;
    otherobj;
    fileNameGeneratedCode;

    constructor(
        private fb: FormBuilder,
        private configurationService: ConfigurationService,
        private afStore: AngularFireStorage,
        private uiService: UiService,
        private learningUnitService: LearningUnitsService,
        private http: HttpClient,
        private luServiceResources: LearningUnitResourcesService,
        private boardGradeResourceService: BoardGradeResourcesService,
        private luService: LearningUnitsService,
        private sharedService: SharedService,
        @Inject(MAT_DIALOG_DATA) public data,
    ) {
    }

    editResource = this.fb.group({
        boards: [[], Validators.required],
        grade: [{ value: [], disabled: true }, Validators.required],
        // storagePath: [{ value: '', disabled: true }],
        storagePath: [{ value: [], disabled: true }],

    });

    grades: string[] = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];

    async updateBoardGradeResources(luDetails, data) {
        const promises = Object.entries(luDetails).map(s => new Promise(async (resolve, reject) => {
            if (typeof (this.data.learningUnitDetails.resources[this.data.maturity][this.data.componentName][this.data.parentName][s[0]]) == 'string' && s[0] != 'universalGradeBoardResourcePath') {
                //  let res:any = await lastValueFrom(await this.luServiceResources.getDocDataByDocId11(s[1]))
                const res: any = await this.boardGradeResourceService.getDocDataByDocId(s[1].toString());
                if (res) {
                    const ss: any = res;
                    this.data.learningUnitDetails.resources[this.data.maturity][this.data.componentName][this.data.parentName][s[0]] = ss.resources;
                }
                resolve(res);
            }
            else {
                resolve('');
            }

        }));
        await Promise.all(promises);
    }

    async ngOnInit(): Promise<void> {
        this.hardCopyofLU = this.data.hardCopyLU;
        const res: any = await this.getLUdetails(this.data.learningUnitDetails['maturityDoc']);
        this.hardCopyofLU.resources[this.data.maturity] = res.resources;
        this.boardcollectionDocId = this.data?.learningUnitDetails.resources[this.data.maturity][this.data.componentName][this.data.parentName];
        await this.updateBoardGradeResources(this.data?.learningUnitDetails.resources[this.data.maturity][this.data.componentName][this.data.parentName], this.data);
        const boards = await lastValueFrom(this.configurationService.getInternationalBoardList().pipe(first()));
        this.boards = boards.boards.map(board => ({
            ...board,
            selected: false
        }));

        // display saved data from db in fields
        if (this.data && this.data.learningUnitDetails.resources.hasOwnProperty(this.data.maturity.toLowerCase())) {
            let sampleLink: any;
            const resourceName = '';
            switch (this.data.maturity.toLowerCase()) {
                case 'gold':
                    // sampleLink = this.data.learningUnitDetails.resources[this.data.learningUnitDetails.Maturity.toLowerCase()]['tacDev']['observationWorksheetDev'];
                    sampleLink = this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName];
                    break;

                case 'diamond':
                    // sampleLink = this.data.learningUnitDetails.resources[this.data.learningUnitDetails.Maturity.toLowerCase()]['tacDev']['explorationPathway'];
                    sampleLink = this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName];
                    break;

                case 'platinum':
                    // sampleLink = this.data.learningUnitDetails.resources[this.data.learningUnitDetails.Maturity.toLowerCase()]['tacDev']['tacFaDev'];
                    sampleLink = this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName];
                    break;

                default:
                    sampleLink = this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName];
                    // sampleLink = {};
                    break;
            };
            if (Object.keys(sampleLink).length) {
                this.builingExistingBoardObj(sampleLink);
                const boardGradeLinks: any = {};
                boardGradeLinks.boards = Object.keys(sampleLink);
                boardGradeLinks.grade = Object.keys(sampleLink[boardGradeLinks.boards[0]]);
                boardGradeLinks.storagePath = sampleLink[boardGradeLinks.boards[0]][boardGradeLinks.grade[0]];
                const { boards, grade, storagePath } = boardGradeLinks;
                // let gradeUpdated={
                //     value:[],
                //     disabled:true
                // }
                // let boardUpdated=[]
                //  const gradeUpdated = grade.map(g => `${g.split(" ")[0][0].toUpperCase()}${g.split("_")[0].slice(1).toLowerCase()} ${g.split("_")[1][0] === '0' ? g.split("_")[1][1] : g.split("_")[1]}`);
                const boardUpdated = boards.map((item, index) => index !== 0 ? ` ${item}` : item);
                this.editResource.patchValue({ storagePath });

                // if (boardUpdated) {
                //     this.editResource.controls['boards'].setErrors(null);
                //     this.editResource.controls['grade'].disable();

                // }
                // if (gradeUpdated.length > 0) {
                //     this.editResource.controls['grade'].clearValidators()

                // }
                this.boards.map(board => boards.includes(board.code) ? board.selected = false : board);
                // this.boards.map(board => boards.includes(board.code) ? board.selected = true : board);
                const boardsControl = this.editResource.get('boards');
                if (boardsControl?.valid && (boardsControl?.value as any[])?.length != 0) {
                    this.editResource.get('grade')?.enable();
                };
                if (this.editResource.get('grade').valid) {
                    this.editResource.get('storagePath').enable();
                };
                if (this.editResource.get('storagePath').value) {

                };
            };
        };
        // const filePath = 'learningUnits/keg57ntCXbGoEK6Ywtfb/GradeDependentResources/consolidatedBoM_cbse_grade_02.pdf';
        // this.moveResourcesToStorageTrash(filePath)

        this.filteredBoards = this.editResource.get('boards').valueChanges.pipe(
            startWith(''),
            map(value => typeof value === 'string' ? value : ''),
            map(val => this.filter(val || '')),

        );

        const watchList = [
            'boards',
            'grade'
        ];

        const unlocklist = [
            'grade',
            'storagePath'
        ];

        for (let i = 0; i < watchList?.length; i++) {
            this.unlockFormSequentially(watchList[i], unlocklist[i]);
        }
        const resources: any = await this.configurationService.getTactivitysiteResources();
        const resourcesConfig = resources.resourcesConfig;
        this.boardGradeOBj = resourcesConfig.boardGradeOBj;
        this.goldobj = resourcesConfig.goldobj;
        this.silverobj = resourcesConfig.silverobj;
        this.diamondobj = resourcesConfig.diamondobj;
        this.otherobj = resourcesConfig.otherobj;

    }

    builingExistingBoardObj(resources: any) {
        const BoardKeys = Object.keys(resources);
        BoardKeys.forEach((boardCode) => {
            this.existingBoardObj[boardCode] = Object.keys(resources[boardCode]);
        });
    }

    filter(value: any) {
        return this.boards?.filter(board => board?.code?.toLowerCase()?.includes(value?.toLowerCase()));
    }

    optionClicked(event: Event, board: any) {
        event.stopPropagation();
        this.toggleSelection(board);
    }

    toggleSelection(board: any) {
        board.selected = !board.selected;
        if (board.selected) {
            this.selectedBoards.push(board);

        } else {
            const index = this.selectedBoards.findIndex(value => value.code);
            this.selectedBoards.splice(index, 1);
        };
        const selectedBoards = this.selectedBoards.map(board => board.code);
        const set2 = new Set(Object.keys(this.existingBoardObj));
        const commonBoards = selectedBoards.filter(element => set2.has(element));
        if (commonBoards.length) {
            this.reuploadBoolean = true;
            const CommonBoardObj = {};
            commonBoards.forEach((board) => {
                CommonBoardObj[board] = this.existingBoardObj[board];
            });
            this.tooltipMessage = this.generateUploadMessage(CommonBoardObj);
        }
        else {
            this.reuploadBoolean = false;
        }
        const boardUpdated = selectedBoards.map((item, index) => index !== 0 ? ` ${item}` : item);
        this.editResource.get('boards')?.patchValue(boardUpdated as any);
    }

    formatGrade(gradeString) {
        const parts = gradeString.split('_');
        const formattedParts = parts.map(part => part.charAt(0).toUpperCase() + part.slice(1));
        const formattedString = formattedParts.join(' ');
        return formattedString.replace(/ 0(\d)/, ' $1');
    }

    formatGradesInObject(data) {
        const formattedData = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                formattedData[key] = data[key].map(grade => this.formatGrade(grade));
            }
        }
        return formattedData;
    }

    generateUploadMessage(data) {
        const formattedData = this.formatGradesInObject(data);
        const parts = [];

        for (const board in formattedData) {
            if (formattedData.hasOwnProperty(board)) {
                const grades = formattedData[board].join(',');
                parts.push(`${board}(${grades})`);
            }
        }

        const message = `A resource has already been uploaded to the following boards and grades: ${parts.join(',')}. Do you want to proceed with the upload?`;
        return message;
    }

    onInputModify(event: Event) {
        const videoUrl = (event.target as HTMLInputElement).value;
        // this.loader = true;
        const boards = this.editResource.get('boards').value as unknown as Array<string>;
        const boardsUpdated = boards.map(board => board.trim());
        const grades = this.editResource.get('grade').value as unknown as Array<string>;
        const gradesUpdated = grades.map(grade => `${grade.split(' ')[0].toLowerCase()}_${grade.split(' ')[1].padStart(2, '0')}`.trim());
        const isValid = this.testURLValid(videoUrl);
        const boardGradeLinks: any = {};
        if (isValid) {
            for (let i = 0; i < boardsUpdated.length; i++) {
                for (let j = 0; j < gradesUpdated.length; j++) {
                    boardGradeLinks[boardsUpdated[i]] ??= {};
                    boardGradeLinks[boardsUpdated[i]][gradesUpdated[j]] = videoUrl;
                    this.gradeDependentResources = boardGradeLinks;
                    this.submitBtnActive = true;
                    // this.loader = false;
                    // this.uiService.alertMessage('successful', 'The video link is saved successfully', 'success');
                };
            };
        };
    }

    testURLValid(val) {
        if (val) {
            if (val.trim() !== '') {
                const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
                return urlPattern.test(val) == false ? false : true;
            }
        }
    }

    async uploadFile(event: Event) {
        const eventFile = (event.target as HTMLInputElement).files[0];
        this.loader = true;
        this.filename = eventFile.name;
        const boards = this.editResource.get('boards').value as unknown as Array<string>;
        const boardsUpdated = boards.map(board => board.trim());
        const luId = this.data.learningUnitDetails.learningUnitId;
        const boardConfig = this.configurationService.boardConfigforFilenames.value;
        if (!boardConfig) {
            console.error('Board configuration not loaded.');
            return;
        }

        const grades = this.editResource.get('grade').value as unknown as Array<string>;
        const gradesUpdated = grades.map(grade => `${grade.split(' ')[0].toLowerCase()}_${grade.split(' ')[1].padStart(2, '0')}`.trim());
        const extension = eventFile?.name?.split('.')?.[1];
        this.filename = eventFile?.name;
        const isValid = this.pdfTypeAndSizeCheck(eventFile);
        const gradeObj = {};
        const boardGradeLinks: any = {};
        this.fileTobeArchived = [];
        const successLog = [];
        const currentCount = 0;
        if (isValid) {
            for (let i = 0; i < boardsUpdated.length; i++) {
                let s;
                // Map each selected boards acronym to its corresponding code
                const boardCodes = boardConfig.find((b: any) => b.acronym === boardsUpdated[i])?.code || null;

                for (let j = 0; j < gradesUpdated.length; j++) {
                    const gradeNumberOnly = parseInt(gradesUpdated[j].split('_')[1], 10); // Extract number
                    const filenames = `${luId.replace(/-/g, '').substring(0, 6)}${this.data.resourceCodes.resourceCode}${boardCodes}${gradeNumberOnly}${luId.replace(/-/g, '').substring(6)} ${this.data.learningUnitDetails.learningUnitName}.${extension}`;
                    const bucketPath = `${this.storageBucket}/${this.data.learningUnitDetails.docId}/GradeDependentResources/${filenames}`;
                    await this.moveFileToStorageTrash(bucketPath);

                    // putting the file into storage with custom metadata
                    const fileRef = this.afStore.ref(bucketPath);
                    const task = fileRef.put(eventFile, { customMetadata: { original_name: this.filename } }).snapshotChanges();
                    await lastValueFrom(task).then(async (uploadedSnapshot) => {
                        this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100;
                        if (uploadedSnapshot.state === 'success') {
                            successLog.push(uploadedSnapshot.state);
                            const { Maturity: maturity, learningUnitName, learningUnitId } = this.hardCopyofLU;
                            const { componentName: category, parentName: subCategory } = this.data;
                            const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
                            const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
                            const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
                            const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
                            const messageContent = `A new resource '${this.filename}' has been uploaded for '${maturity}' maturity, '${category}' category, '${subCategory}' sub-category, '${boardsUpdated[i]}' board, '${gradeNumberOnly}' grade in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
                            await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
                            this.uiService.alertMessage('successful', 'The pdf files is uploaded successfully', 'success');
                            this.loader = false;
                        };
                    });

                    //  this.data.learningUnitDetails.resources[this.data.learningUnitDetails.Maturity.toLowerCase()][this.data.componentName][this.data.parentName][boardsUpdated.at(i)][gradesUpdated.at(j)]=bucketPath

                    boardGradeLinks[boardsUpdated[i]] ??= {};
                    boardGradeLinks[boardsUpdated[i]][gradesUpdated[j]] = bucketPath;
                }
            }
        }

        if (successLog.every(state => state === 'success')) {
            this.uiService.alertMessage('successful', 'The pdf files is uploaded successfully', 'success');

            this.loader = false;
            this.submitBtnActive = true;
        } else {
            console.error('Error uploading one of the files');
        };
        const catObj = boardGradeLinks;
        this.gradeDependentResources = catObj;
        const gradeUpdated = grades.map(g => `${g.split(" ")[0][0].toUpperCase()}${g.split(" ")[0].slice(1).toLowerCase()} ${g.split(" ")[1][0] === '0' ? g.split(" ")[1][1] : g.split(" ")[1]}`).map((g, i) => i !== 0 ? ` ${g}` : g);
        this.tooltipMessage = `A resource has already been uploaded for the following boards and grades: ${boards.map(board => board.trim() + ' (' + gradeUpdated + ')')}. Do you want to proceed with the upload?`;
    }

    pdfTypeAndSizeCheck(event) {
        // const allowedExtensions = /(\.png|\.jpeg|\.jpg|\.pdf)$/i;
        let isValid = false;
        // if (!allowedExtensions.exec(event.name)) {
        //     this.uiService.alertMessage('Invalid file type', 'Only allowed .png, .jpeg, .jpg, .pdf file types', 'warn');
        //     this.elementRef.nativeElement.value = "";
        //     this.filename = '';
        //     isValid = false;
        // }
        if (event.size > 1073741824) {
            this.uiService.alertMessage('Invalid file type', 'maximum image size should be 1gb', 'warn');
            this.elementRef.nativeElement.value = '';
            this.filename = '';
            isValid = false;
        }
        else {
            isValid = true;
        };
        return isValid;
    }

    async assignmentObj(bucketPath) {
        const boards = this.selectedBoards.map(board => board.code) as Array<string>;
        const grades = this.editResource.get('grade').value as unknown as Array<string>;
        const gradeObj = {};
        grades.forEach(grade => gradeObj[`${grade.split(' ')[0].toLowerCase()}_${grade.split(' ')[1].padStart(2, '0')}`] = bucketPath);
        const boardGradeLinks = {};
        boards.forEach(board => boardGradeLinks[board] = gradeObj);
        const catObj = this.data.catObject;
        catObj[this.data.parentName] = { ...boardGradeLinks };
        this.gradeDependentResources = catObj;
        this.storedFilePath = bucketPath;
        this.editResource.get('storagePath').patchValue(bucketPath);
        const boardUpdated = this.editResource.get('boards').value as Array<String>;
        // const gradeUpdated = grades.map(g => `${g.split(" ")[0][0].toUpperCase()}${g.split(" ")[0].slice(1).toLowerCase()} ${g.split(" ")[1][0] === '0' ? g.split(" ")[1][1] : g.split(" ")[1]}`).map((g, i) => i !== 0 ? ` ${g}` : g);
        // this.tooltipMessage = `A resource has already been uploaded for the following boards and grades: ${boardUpdated.map(board => board + ' (' + gradeUpdated + ')')}. Do you want to proceed with the upload?`;
    }

    async onSave(form: FormGroup) {
        // const currentLearningUnit = (await lastValueFrom(this.learningUnitService.getLUByIdOnce(this.data.learningUnitDetails.docId))).data();
        //    this.data.learningUnitDetails.resources = {
        //         ...this.data.learningUnitDetails.resources,
        //         [this.data.learningUnitDetails.Maturity.toLowerCase()]: {
        //             [this.data.componentName]: {
        //                 [this.data.parentName]: this.gradeDependentResources
        //             }
        //         }
        //     };
        const doc = this.data.learningUnitDetails.maturityDoc;
        const resr: any = await this.getLUdetails(doc);
        const currentBoards = Object.keys(this.gradeDependentResources);
        const res = this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName];
        if (!resr.resources[this.data.componentName].hasOwnProperty(this.data.parentName)) {
            resr.resources[this.data.componentName][this.data.parentName] = {};
        };
        if (!this.hardCopyofLU.resources[this.data.maturity.toLowerCase()][this.data.componentName].hasOwnProperty(this.data.parentName)) {
            this.hardCopyofLU.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName] = {};
        };
        const existingBoards = Object.keys(resr.resources[this.data.componentName][this.data.parentName]).filter(d => d !== 'universalGradeBoardResourcePath');
        currentBoards.forEach((board) => {
            if (existingBoards.includes(board) && resr.resources[this.data.componentName][this.data.parentName] !== '') {
                Object.entries(this.gradeDependentResources[board]).forEach((entry) => {
                    this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName][board][entry[0]] = entry[1];
                    // resr.resources[this.data.componentName][this.data.parentName][board][entry[0]]=entry[1]
                });
                const docId = this.hardCopyofLU.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName][board];
                const res = this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName][board];

                const obj = { resources: res };
                this.boardGradeResourceService.updateDocDataByDocId(docId, obj);
            }
            else {
                const docID = this.luServiceResources.getDocId();
                if (this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName] == '') {
                    this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName] = {};
                }

                if (this.hardCopyofLU.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName] == '') {
                    this.hardCopyofLU.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName] = {};
                }

                if (resr.resources[this.data.componentName][this.data.parentName] == '') {
                    resr.resources[this.data.componentName][this.data.parentName] = {};
                }

                resr.resources[this.data.componentName][this.data.parentName][board] = docID;

                this.data.learningUnitDetails.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName][board] = this.gradeDependentResources[board];

                this.hardCopyofLU.resources[this.data.maturity.toLowerCase()][this.data.componentName][this.data.parentName][board] = docID;

                const data = {
                    docId: docID,
                    board: board,
                    resources: this.gradeDependentResources[board],
                    category: this.data.componentName,
                    subCategory: this.data.parentName,
                    learningUnitId: this.data.learningUnitDetails.learningUnitId,
                    learningUnitDocId: this.data.learningUnitDetails.docId,
                    createdAt: serverTimestamp(),
                    maturity: this.data.maturity.charAt(0).toUpperCase() + this.data.maturity.slice(1),
                    type: this.data.learningUnitDetails.type
                };
                this.boardGradeResourceService.updateDocDataByDocId(docID, data);
                this.uiService.alertMessage('successful', 'The resources are saved successfully', 'success');
            }
        });

        const mainres = this.hardCopyofLU.resources[this.data.maturity.toLowerCase()];
        // let obj={resources:resr}
        await this.luServiceResources.updateLUResources(resr, doc);
        let obj1 = {
            containsResources: true

        };
        //const maturityResource:any=await this.getLUdetails( this.maturityObj[this.data.luDetails.Maturity.toLowerCase()])
        const maturityResource: any = await this.getLUdetails(this.data.listedMaturties[this.data.learningUnitDetails.Maturity.toLowerCase()]);
        const currentLUAfterupdate = await this.learningUnitService.getLearningUnitData(this.data.learningUnitDetails.docId);
        const check = this.checkResources(maturityResource.resources, this.data.learningUnitDetails.Maturity.toLowerCase());
        const check1 = this.checkResources(maturityResource.resources, 'boardGrade');
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
        this.luService.updateLUwithDocId(obj1, this.data.learningUnitDetails.docId);
        this.data.learningUnitDetails = this.hardCopyofLU;
        // this.learningUnitService.updateLU(currentLearningUnit.docId, currentLearningUnit);
        this.uiService.alertMessage('successful', 'The resources are saved successfully', 'success');
        // this.editResource.reset();
        // this.editResource.get('grade').disable();
        // this.editResource.get('storagePath').disable();
        // this.tooltipMessage = '';
    }

    async getLUdetails(doc) {
        const reosurces = await this.luServiceResources.getDocDataByDocId(doc);
        return reosurces;
    }

    unlockFormSequentially(watch: string, unlock: string) {
        switch (watch) {
            case 'boards':
                this.editResource?.get(watch)?.valueChanges?.subscribe((res) => {
                    // if (res && res.length) {
                    this.editResource?.get(unlock)?.enable();
                    // };
                });
                break;
            default:
                this.editResource?.get(watch)?.valueChanges?.subscribe((res) => {

                    if (res && res.length) {
                        this.editResource?.get(unlock)?.enable();
                    };
                });
                break;
        }
    }

    async checkFileExists(fileRef: AngularFireStorageReference) {
        try {
            await fileRef.getDownloadURL().toPromise();
            return true;
        } catch (error) {
            return false;
        };
    }

    async moveFileToStorageTrash(sourcePath: string) {
        try {
            const ref = this.afStore.ref(sourcePath);
            const link: any = await lastValueFrom(ref.getDownloadURL());

            // Extract filename and prepare base trash path
            const fileName = sourcePath.split('/').pop(); // Includes .pdf
            const baseTrashPath = `learningUnits/${this.data.learningUnitDetails.docId}/GradeDependentResources-trash/`;

            // Ensure versioning in trash to avoid overwrites
            let destinationPath = `${baseTrashPath}${fileName}`;
            let destinationRef = this.afStore.ref(destinationPath);
            let exists = await this.checkFileExists(destinationRef);

            let counter = 1;
            while (exists) {
                const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
                const ext = fileName.substring(fileName.lastIndexOf('.') + 1);
                const newName = `${nameWithoutExt}_v${counter}.${ext}`;
                destinationPath = `${baseTrashPath}${newName}`;
                destinationRef = this.afStore.ref(destinationPath);
                exists = await this.checkFileExists(destinationRef);
                counter++;
            }

            // Get file content and metadata
            const fileBytes = await lastValueFrom(this.http.get(link, { responseType: 'arraybuffer' }));
            const metadata = await lastValueFrom(ref.getMetadata());
            const mimeType = metadata.contentType;

            // Upload to versioned trash path
            const task = destinationRef.put(fileBytes, { contentType: mimeType });
            await lastValueFrom(task.snapshotChanges());

            // Delete from original location
            await lastValueFrom(ref.delete());
        } catch (error) {
            console.error('❌ Error transferring file to trash:', error);
        }
    }

    checkResources(res, type) {
        if (type == 'boardGrade') {
            return this.boardGradeOBj.some((obj) => {

                if (res?.[obj.res]?.[obj.subres]?.['universalGradeBoardResourcePath'] != '' && typeof (res?.[obj.res]?.[obj.subres]?.['universalGradeBoardResourcePath']) !== 'undefined') {
                    return true;
                }
                else {
                    if (res?.[obj.res]?.[obj.subres]?.[obj.board] != '' && typeof (res?.[obj.res]?.[obj.subres]?.[obj.board]) !== 'undefined') {
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
                    return res[obj.res][obj.subres] != '';
                } else {
                    return false;
                }
            });
        }

        else if (type == 'additionalResources') {
            return this.otherobj.some((obj) => {
                if (this.data.learningUnitDetails?.[obj.otherresources] && typeof (this.data.learningUnitDetails?.[obj.otherresources]) !== 'undefined') {
                    // console.log(res?.[obj.otherresources])
                    return this.data.learningUnitDetails[obj.otherresources].length != 0;
                } else {
                    return false;
                }
            });

        }


    }

    checkAdditionalResources(type, currentLUAfterupdate) {
        if (type == 'additionalResources') {
            return this.otherobj.some((obj) => {
                if (currentLUAfterupdate?.[obj.otherresources] && typeof (currentLUAfterupdate?.[obj.otherresources]) !== 'undefined') {
                    return currentLUAfterupdate[obj.otherresources].length != 0;
                } else {
                    return false;
                }
            });

        }
    }

}



