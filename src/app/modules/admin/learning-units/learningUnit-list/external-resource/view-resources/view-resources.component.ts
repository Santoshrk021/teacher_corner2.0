
import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage, AngularFireStorageReference } from '@angular/fire/compat/storage';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BoardGradeResourcesService } from 'app/core/dbOperations/boardGradeResources/boardGradeResources.service';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { HttpClient } from '@angular/common/http';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';

interface Grade {
    name: string;
    code: string;
}
@Component({
    selector: 'app-view-resources',
    templateUrl: './view-resources.component.html',
    styleUrls: ['./view-resources.component.scss']
})
export class ViewResourcesComponent implements OnInit {
    @ViewChild('elementRef', { static: false }) elementRef: ElementRef;
    @ViewChild('elementRef1', { static: false }) elementRef1: ElementRef;
    filename: string;
    storageBucket = 'learningUnits';
    boardGradeOBj;
    goldobj;
    silverobj;
    diamondobj;
    otherobj;

    filteredResourceInfo: any;
    boards;
    loading = false;
    resourceCategory: string = this.data.resourceCategory;
    resourceName: string = this.data.resourceName;
    maturityObj = {
        silver: 'silver',
        gold: 'gold',
        platinum: 'platinum',
        diamond: 'diamond',
    };
    resourceInfo;
    hardCopyLU;
    videoResourceObj = {};
    grades: Grade[] = [
        { name: 'Grade 1', code: 'grade_01' },
        { name: 'Grade 2', code: 'grade_02' },
        { name: 'Grade 3', code: 'grade_03' },
        { name: 'Grade 4', code: 'grade_04' },
        { name: 'Grade 5', code: 'grade_05' },
        { name: 'Grade 6', code: 'grade_06' },
        { name: 'Grade 7', code: 'grade_07' },
        { name: 'Grade 8', code: 'grade_08' },
        { name: 'Grade 9', code: 'grade_09' },
        { name: 'Grade 10', code: 'grade_10' }
    ];

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: any,
        private afStore: AngularFireStorage,
        private uiService: UiService,
        private learningUnitService: LearningUnitsService,
        private luServiceResources: LearningUnitResourcesService,
        private dialogRef: MatDialogRef<ViewResourcesComponent>,
        private boardGradeResourceService: BoardGradeResourcesService,
        private configurationService: ConfigurationService,
        private luService: LearningUnitsService,
        private http: HttpClient,
        private sharedService: SharedService,
    ) { }

    async ngOnInit() {
        await this.configurationService.getConfigBoardsForFilenames();
        this.hardCopyLU = JSON.parse(JSON.stringify(this.data?.luDetails));
        this.loading = true;
        await this.updateBoardGradeResources(this.data?.luDetails.resources[this.data.maturity][this.data.resourceCategory][this.data.resourceName], this.data);
        this.getLuResourcesInfo(this.data?.luDetails?.docId, this.data?.luDetails);
        this.loading = false;
        const resources: any = await this.configurationService.getTactivitysiteResources();
        const resourcesConfig = resources.resourcesConfig;
        this.boardGradeOBj = resourcesConfig.boardGradeOBj;
        this.goldobj = resourcesConfig.goldobj;
        this.silverobj = resourcesConfig.silverobj;
        this.diamondobj = resourcesConfig.diamondobj;
        this.otherobj = resourcesConfig.otherobj;
    }

    async updateBoardGradeResources(luDetails, data) {
        const promises = Object.entries(luDetails).map(s => new Promise(async (resolve) => {
            if (typeof (this.data.luDetails.resources[this.data.maturity][this.data.resourceCategory][this.data.resourceName][s[0]]) == 'string' && s[0] != 'universalGradeBoardResourcePath') {
                // let res = await lastValueFrom(await this.luServiceResources.getDocDataByDocId11(s[1]))
                const res: any = await this.boardGradeResourceService.getDocDataByDocId(s[1].toString());

                if (res) {
                    const ss: any = res;
                    this.data.luDetails.resources[this.data.maturity][this.data.resourceCategory][this.data.resourceName][s[0]] = ss.resources;
                }
                resolve(res);
            }
            else {
                resolve('');
            }
        }));
        await Promise.all(promises);
    }

    getLuResourcesInfo(luDocId, lu) {
        // this.learningUnitService.getLUByIdOnce(luDocId).subscribe(res => {
        //  let luInfo = res.data()
        const luInfo = lu;
        this.resourceInfo = luInfo?.['resources'][this.maturityObj[this.data.maturity]][this.resourceCategory][this.resourceName];
        this.filteredResourceInfo = { ...this.resourceInfo };
        delete this.filteredResourceInfo.universalGradeBoardResourcePath;
        // })
    }

    onInputModify(event: Event, selectedBoard, selectedGrade) {
        const videoUrl = (event.target as HTMLInputElement).value;
        const isValid = this.testURLValid(videoUrl);
        if (isValid) {
            this.storingToDb(videoUrl, selectedBoard, selectedGrade).then(async () => {
                const { Maturity: maturity, learningUnitName, learningUnitId } = this.hardCopyLU;
                const { resourceCategory: category, resourceName: subCategory } = this.data;
                const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
                const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
                const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
                const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
                const messageContent = `A new resource '${videoUrl}' has been uploaded for '${maturity}' maturity, '${category}' category, '${subCategory}' sub-category, '${selectedBoard}' board, '${selectedGrade}' grade in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
                await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
                this.uiService.alertMessage('successful', 'The video link is saved successfully', 'success');
            }).catch(() => {
                this.uiService.alertMessage('Error', 'Error in saving the link', 'error');
            });
        }
    }

    testURLValid(val) {
        if (val) {
            if (val.trim() !== '') {
                const urlPattern = /^(ftp|http|https):\/\/[^ "]+$/;
                return urlPattern.test(val) == false ? false : true;
            }
        }
    }

    async uploadFile(event: Event, selectedBoard, selectedGrade) {
        const eventFile = (event.target as HTMLInputElement).files[0];
        const isValid = this.pdfTypeAndSizeCheck(eventFile);
        this.filename = eventFile.name;
        const luId = this.data.luDetails.learningUnitId;
        const boardConfig = await this.configurationService.boardConfigforFilenames.value;
        const boardCodes = boardConfig.find(b => b.acronym === selectedBoard)?.code || null;
        const gradeNumberOnly = parseInt(selectedGrade.split('_')[1], 10); // Extract number
        if (!boardConfig) {
            console.error('Board configuration not loaded.');
            return;
        }

        const resourceCodeRaw = this.data.resourceCodes?.resourceCode ?? 'NA';
        const resourceCode = resourceCodeRaw.endsWith('x#')
            ? resourceCodeRaw.slice(0, 2)
            : resourceCodeRaw;
        this.filename = eventFile.name;
        const fileExtension = eventFile.name.split('.')[1];
        const filenames = `${luId.replace(/-/g, '').substring(0, 6)}${resourceCode}${boardCodes}${gradeNumberOnly}${luId.replace(/-/g, '').substring(6)} ${this.data.luDetails.learningUnitName}.${fileExtension}`;

        if (isValid) {
            const bucketPath = `${this.storageBucket}/${this.data.luDetails.docId}/GradeDependentResources/${filenames}`;
            await this.moveFileToStorageTrash(bucketPath);
            const fileRef = this.afStore.ref(bucketPath);
            const task = fileRef.put(eventFile, { customMetadata: { original_name: this.filename } }).snapshotChanges();
            await lastValueFrom(task).then((uploadedSnapshot) => {
                // this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100
                if (uploadedSnapshot.state === 'success') {
                    this.storingToDb(bucketPath, selectedBoard, selectedGrade).then(async () => {
                        const { Maturity: maturity, learningUnitName, learningUnitId } = this.hardCopyLU;
                        const { resourceCategory: category, resourceName: subCategory } = this.data;
                        const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
                        const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
                        const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
                        const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
                        const messageContent = `A new resource '${this.filename}' has been uploaded for '${maturity}' maturity, '${category}' category, '${subCategory}' sub-category, '${selectedBoard}' board, '${selectedGrade}' grade in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
                        await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
                        this.uiService.alertMessage('successful', 'The file is uploaded successfully', 'success');

                        this.filteredResourceInfo[selectedBoard] ??= {};
                        this.filteredResourceInfo[selectedBoard][selectedGrade] = bucketPath;
                        delete this.filteredResourceInfo.universalGradeBoardResourcePath;

                        // clear the input file to allow file re-upload
                        this.elementRef.nativeElement.value = '';
                    }).catch(() => {
                        this.uiService.alertMessage('Error', 'Error in Uploading the file', 'error');
                    });
                };
            });
        };
    }

    onInputModifyUniversalGradeBoardResource(event: Event) {
        const videoUrl = (event.target as HTMLInputElement).value;
        const isValid = this.testURLValid(videoUrl);
        if (isValid) {
            this.storingToDbForUBGResource(videoUrl).then(async () => {
                const { Maturity: maturity, learningUnitName, learningUnitId } = this.hardCopyLU;
                const { resourceCategory: category, resourceName: subCategory } = this.data;
                const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
                const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
                const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
                const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
                const messageContent = `A new resource '${videoUrl}' has been uploaded for '${maturity}' maturity, '${category}' category, '${subCategory}' sub-category, in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
                await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
                this.uiService.alertMessage('successful', 'The video link is saved successfully', 'success');
            }).catch(() => {
                this.uiService.alertMessage('Error', 'Error in saving the link', 'error');
            });
        }
    }

    async uploaduniversalGradeBoardResource(event: Event) {
        const eventFile = (event.target as HTMLInputElement).files[0];
        const isValid = this.pdfTypeAndSizeCheck(eventFile);
        this.filename = eventFile.name;
        const luId = this.data.luDetails.learningUnitId;
        const fileExtension = eventFile.name.split('.')[1];
        const newFileName = `${luId.replace(/-/g, '').substring(0, 6)}${this.data.resourceCodes.resourceCode}${luId.replace(/-/g, '').substring(6)} ${this.data.luDetails.learningUnitName}.${fileExtension}`;

        if (isValid) {
            const bucketPath = `${this.storageBucket}/${this.data.luDetails.docId}/UniversalGradeBoardResource/${newFileName}`;
            await this.moveFileToStorageTrash(bucketPath);
            const fileRef = this.afStore.ref(bucketPath);
            const task = fileRef.put(eventFile, { customMetadata: { original_name: this.filename } }).snapshotChanges();
            await lastValueFrom(task).then((uploadedSnapshot) => {
                // this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100
                if (uploadedSnapshot.state === 'success') {
                    this.storingToDbForUBGResource(bucketPath).then(async () => {
                        const { Maturity: maturity, learningUnitName, learningUnitId } = this.hardCopyLU;
                        const { resourceCategory: category, resourceName: subCategory } = this.data;
                        const channels = await this.sharedService.getSlackChannelDetails(environment.slackNotifications.luResourceManagement.slackChannels);
                        const slackBearerToken = environment.slackNotifications.luResourceManagement.slackBearerToken;
                        const { slackUsers, teacherName } = await this.sharedService.getCurrentUser();
                        const uploaderName = slackUsers?.length ? slackUsers?.[0]?.profile?.display_name : teacherName?.length ? teacherName : 'unknown';
                        const messageContent = `A new resource '${this.filename}' has been uploaded for '${maturity}' maturity, '${category}' category, '${subCategory}' sub-category in learning unit having name '${learningUnitName}' and ID '${learningUnitId}' in Firebase project '${environment.firebase.projectId}' by '${uploaderName}'.`;
                        await this.sharedService.sendSlackNotifications(slackBearerToken, slackUsers, channels, messageContent);
                        this.uiService.alertMessage('successful', 'The file is uploaded successfully', 'success');
                        this.learningUnitService.getLUByIdOnce(this.data.luDetails.docId).subscribe(() => {
                            this.resourceInfo = this.data.luDetails['resources'][this.maturityObj[this.data.maturity]][this.resourceCategory][this.resourceName];
                            this.elementRef1.nativeElement.value = '';
                        });
                    }).catch(() => {
                        this.uiService.alertMessage('Error', 'Error in Uploading the file', 'error');
                    });
                };
            });
        };
    }

    async moveFileToStorageTrash(sourcePath: string) {
        try {
            const ref = this.afStore.ref(sourcePath);
            const link: any = await lastValueFrom(ref.getDownloadURL());

            // Extract filename and prepare base trash path
            const fileName = sourcePath.split('/').pop(); // Includes .pdf
            const baseTrashPath = `learningUnits/${this.data.luDetails.docId}/GradeDependentResources-trash/`;

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

    // async getUniqueFileName(filePath: string) {
    //     // splits the file name and extension
    //     const lastDotIndex = filePath.lastIndexOf('.');
    //     const name = filePath.substring(0, lastDotIndex);
    //     const extension = filePath.substring(lastDotIndex + 1);
    //     let uniqueFilePath = filePath;
    //     let fileRef = this.afStore.ref(filePath);
    //     let exists = await this.checkFileExists(fileRef);
    //     let counter = 0;
    //     // while (exists) {
    //     //     // manages the file rename
    //     //     uniqueFilePath = counter === 0 ? `${name}.${extension}` : `${name}_${counter}.${extension}`;
    //     //     fileRefs = this.afStore.ref(uniqueFilePath);
    //     //     exists = await this.checkFileExists(fileRef);
    //     //     counter++;
    //     //
    //     // };
    //      const trashMoved = await this.moveFileToStorageTrash(filePath);
    //     return { filePath, fileRef };
    // }

    async checkFileExists(fileRef: AngularFireStorageReference) {
        try {
            await fileRef.getDownloadURL().toPromise();
            return true;
        } catch (error) {
            return false;
        };
    }

    async storingToDbForUBGResource(bucketPath: string) {
        return new Promise(async (resolve) => {
            const docId = this.data.luDetails.maturityDoc;
            const resr: any = await this.getLUdetails(docId);
            this.data.luDetails.resources[this.maturityObj[this.data.maturity]][this.resourceCategory][this.resourceName]['universalGradeBoardResourcePath'] = bucketPath;
            resr.resources[this.resourceCategory][this.resourceName]['universalGradeBoardResourcePath'] = bucketPath;
            this.hardCopyLU.resources[this.maturityObj[this.data.maturity]][this.resourceCategory][this.resourceName]['universalGradeBoardResourcePath'] = bucketPath;
            resolve(this.data.luDetails.resources[this.maturityObj[this.data.maturity]]);
            const doc = this.data.luDetails.maturityDoc;
            await this.luServiceResources.updateLUResources(resr, doc);
            let obj2 = {
                containsResources: true
            };
            const maturityResource: any = await this.getLUdetails(this.data.listedMaturties[this.data.luDetails.Maturity.toLowerCase()]);
            const currentLUAfterupdate = await this.learningUnitService.getLearningUnitData(this.data.luDetails.docId);
            const check = this.checkResources(maturityResource.resources, this.data.luDetails.Maturity.toLowerCase());
            const check1 = this.checkResources(maturityResource.resources, 'boardGrade');
            const check2 = this.checkAdditionalResources('additionalResources', currentLUAfterupdate);
            const mapped = [check, check1, check2];
            const result = mapped.some(d => d === true);
            if (result) {
                obj2 = {
                    containsResources: true
                };
            }
            else {
                obj2 = {
                    containsResources: false
                };

            }
            this.luService.updateLUwithDocId(obj2, this.data.luDetails.docId);

            //return this.learningUnitService.updateLU(this.data.luDetails.docId, obj)
        });
    }

    async getLUdetails(doc) {
        const reosurces = await this.luServiceResources.getDocDataByDocId(doc);
        return reosurces;
    }

    async storingToDb(path, selectedBoard, selectedGrade) {
        return new Promise(async (resolve) => {
            // let obj = {
            //     resources: {
            //         [this.maturityObj[this.data.luDetails?.['Maturity']]]: {
            //             [this.resourceCategory]: {
            //                 [this.resourceName]: {
            //                     [selectedBoard]: {
            //                         [selectedGrade]: path
            //                     }
            //                 }
            //             }
            //         }
            //     }
            // }
            this.data.luDetails.resources[this.maturityObj[this.data.maturity]][this.resourceCategory][this.resourceName][selectedBoard][selectedGrade] = path;
            const val = this.data.luDetails.resources[this.maturityObj[this.data.maturity]][this.resourceCategory][this.resourceName][selectedBoard];
            const docId = this.hardCopyLU.resources[this.maturityObj[this.data.maturity]][this.resourceCategory][this.resourceName][selectedBoard];
            const obj1 = { resources: val };
            await this.boardGradeResourceService.updateDocDataByDocId(docId, obj1);
            this.uiService.alertMessage('successful', ' saved', 'success');

            resolve(this.data.luDetails.resources);
        });

        ///  return this.learningUnitService.updateLU(this.data.luDetails.docId, obj)
    }

    pdfTypeAndSizeCheck(event) {
        // const allowedExtensions = /(\.png|\.jpeg|\.jpg|\.pdf)$/i;
        let isValid = false;
        // if (!allowedExtensions.exec(event.name)) {
        //   this.uiService.alertMessage('Invalid file type', 'Only allowed .png, .jpeg, .jpg, .pdf file types', 'warn');
        //   this.elementRef.nativeElement.value = "";
        //   this.filename = '';
        //   isValid = false;
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

    copyFileName(d, e) {
        const resource = this.data.configResources.find(d => d.key == this.data.resourceName);
        let boardCode = '';
        const boardFromConfig = this.data.boardForFilenames.find(d => d.acronym == e.key);
        if (boardFromConfig) {
            boardCode = boardFromConfig.code;
        }
        else {
            boardCode = 'Undefined';
            //boardCode= e.key.substring(0,1)
        }

        const {
            isoCode,
            learningUnitCode,
            learningUnitDisplayName,
            typeCode,
            version,
        } = this.data.luDetails;
        const code = resource?.resourceCode ? `${typeCode}${learningUnitCode}${resource.resourceCode.substring(0, 2)}${boardCode}${d.name.split('Grade')[1].replace(/\s+/g, '')}${isoCode}${version} ${learningUnitDisplayName}` : '';

        navigator.clipboard.writeText(code).then(() => {
            this.uiService.alertMessage('Copied', 'File name has been successfully copied', 'success');
        }).catch(() => {
            // console.error('Failed to copy:', error);
            this.uiService.alertMessage('Error', 'Some error has occured', 'error');
        });
    }

    close() {
        this.data.luDetails = this.hardCopyLU;
        this.dialogRef.close();
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
                if (this.data.luDetails?.[obj.otherresources] && typeof (this.data.luDetails?.[obj.otherresources]) !== 'undefined') {
                    return this.data.luDetails[obj.otherresources].length != 0;
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

