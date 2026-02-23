import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { tactivity } from 'app/core/dbOperations/learningUnits/learningUnits.types';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, Subject, first, firstValueFrom, lastValueFrom, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { SortingService } from 'app/shared/sorting.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { LearningUnitResourcesService } from 'app/core/dbOperations/learningUnitResources/learningUnitResources.service';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { arrayRemove } from '@angular/fire/firestore';
import { BoardGradeResourcesService } from 'app/core/dbOperations/boardGradeResources/boardGradeResources.service';
import { SharedService } from 'app/shared/shared.service';

@Component({
    selector: 'app-learning-unit-list',
    templateUrl: './learningunit-list.component.html',
    styleUrls: ['./learningunit-list.component.scss'],
})

export class LearningUnitlistComponent implements OnInit {
    @Input() allLearningunits: any;
    @Input() iChange: string;
    @Input() learningUnitSubject: any;
    @Input() sLang: string;
    @Input() sVer: string;
    @Output() changeLang1: EventEmitter<any> = new EventEmitter();
    @Output() changeVersion1: EventEmitter<any> = new EventEmitter();
    @Output() searchLearningUnitsOutput1: EventEmitter<any> = new EventEmitter();

    uncommonResource;
    tacResources;
    tacResourceCopy;
    maturityObj = {};
    mValue;
    filestobeDeleted = 0;
    workflowDeletion = false;
    resourcesLU: any = {};
    selectLUhardCopy: any;
    startLoading = false;
    cumulativeMaturities;
    selectedLang: string = '';
    allLearningUnits: tactivity[];
    selectedLUDel;
    selectedVersion: string = 'All Versions';
    inputChanged: string = '';
    learningUnitsCopy;
    selectedLearningUnit: any = {
    };
    searchTerm: string;
    isFirstTime: boolean = true;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    dataSource: MatTableDataSource<tactivity>;
    learingUnitBSub = new BehaviorSubject(null);
    selectedLuDetails: any;
    infinityScrollLocked: boolean = false;
    savedSortEvent: any;
    isScrollLoading: boolean = true;
    loadingMessage: string;
    totalCount: number;
    fileDeleting: boolean = false;
    learningUnitMaturity;
    allfiles: number = 0;

    constructor(
        private uiService: UiService,
        private learningUnitService: LearningUnitsService,
        private fuseConfirmationService: FuseConfirmationService,
        private masterService: MasterService,
        private http: HttpClient,
        private sortingService: SortingService,
        private drawerService: FuseDrawerService,
        private storage: AngularFireStorage,
        private programmeService: ProgrammeService,
        private classroomService: ClassroomsService,
        private workflowService: WorkflowsService,
        private configurationService: ConfigurationService,
        private LUresourcesService: LearningUnitResourcesService,
        private programmeTemplateService: ProgrammeTemplateService,
        private learningUnitResourceService: LearningUnitResourcesService,
        private boardGradeResourceService: BoardGradeResourcesService,
        private sharedService: SharedService,
    ) {
        this.dataSource = new MatTableDataSource([]);
    }

    async ngOnInit() {
        const resourceNames = await firstValueFrom(this.configurationService.getConfigurationDocumentOnce('resourceNames'));
        this.tacResources = resourceNames.exists ? resourceNames.data() : {};
        this.learningUnitMaturity = await lastValueFrom(this.configurationService.getLearningUnitMaturity().pipe(first()));
        this.cumulativeMaturities = await this.getCumulativeMaturities();
        await this.getAllLearningUnits();
        this.drawerService.drawerOpenTrashLUSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
            if (!res) {
                this.getAllLearningUnits();
            }
        });
    }

    getResourcesForType(type) {
        let obj = {};
        if (typeof (this.tacResources['resources'][type]) !== 'undefined' && this.tacResources['resources'][type] !== null) {
            Object.keys(this.tacResources['resources'][type]).filter(e => e != 'resourceNames').forEach((key) => {
                const ob = {};
                Object.keys(this.tacResources['resources'][type][key]).forEach((k) => {
                    const res = {};
                    Object.keys(this.tacResources['resources'][type][key][k]).forEach((j) => {
                        res[j] = '';
                    });
                    ob[k] = res;
                });
                obj[key] = ob;
            });
        }
        else {
            obj = {};
        }

        return obj;
    }

    async getAllLearningUnits() {
        this.totalCount = await this.allLearningunits.length;
        const LUdata: any = await this.allLearningunits;

        this.learningUnitsCopy = [...this.allLearningunits];
        LUdata.sort((a: any, b: any) => (a.learningUnitDisplayName.localeCompare(b.learningUnitDisplayName)));
        this.allLearningUnits = LUdata;
        this.learningUnitService.updatedLUs.next(LUdata);
        this.learingUnitBSub.next(LUdata);
        if (this.isFirstTime) {
            this.allLearningUnits = this.allLearningunits.slice(0, 30);
            this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'learningUnitDisplayName', 'asc') as Sort);
            this.loadingMessage = `Loaded ${this.allLearningUnits.length} of ${this.totalCount} entries`;
        } else {
            this.search(this.searchTerm);
            this.loadingMessage = `${this.allLearningUnits.length} search results found`;
        }
        this.isScrollLoading = false;
    }

    async deleteLU(selectedLU) {
        this.selectedLUDel = selectedLU;
        const allVersions = this.allLearningunits.filter(d => d.learningUnitCode == selectedLU.learningUnitCode);
        const config = {
            title: 'Delete Learning Unit',
            message: 'Are you sure you want to delete this learning unit?',
            icon: {
                name: 'mat_outline:delete'
            }
        };
        if (allVersions?.length > 1) {
            config.title = 'Delete Version';
            config.message = 'Are you sure you want to delete this version?';
        }

        const dialogRef = this.fuseConfirmationService.open(config);
        let luDetails: any = await this.learningUnitService.getLearningUnitData(selectedLU['docId']);

        luDetails = Object.assign(luDetails, selectedLU);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                this.startLoading = true;
                try {
                    // this.allfiles = await this.getAllFilesfromLearningunit(`learningUnits/${selectedLU?.docId}`, 'learningUnits/--trash--')
                    await this.trashLearningUnitResourcesAndBoardGradeResources(luDetails.docId);
                    await this.learningUnitService.trashLU(luDetails.docId, luDetails);
                    await this.removeLuFromProgrammesClassroomsAndWorkflows(luDetails);
                    await this.masterService.deleteObjectFromMasterMap(luDetails.masterDocId, 'tacNames', luDetails.docId);
                    this.learningUnitService.deleteLU(luDetails.docId);
                    this.uiService.alertMessage('Deleted', `Successfully Deleted Learning Unit ${selectedLU.learningUnitName}`, 'warn');
                    this.isFirstTime = false;
                    const allLearningUnits = this.learingUnitBSub.value;
                    const updatedLearningUnits = allLearningUnits.filter((d: any) => d.docId != selectedLU.docId);
                    this.learingUnitBSub.next(updatedLearningUnits);
                    this.search(this.searchTerm);
                } catch (error) {
                    this.uiService.alertMessage('Error', `Error Deleting Learning Unit ${selectedLU.learningUnitName}`, 'error');
                    console.error('Error deleting learning unit:', error);
                } finally {
                    this.startLoading = false;
                };
            }
        });
    }

    async removeLuFromProgrammesClassroomsAndWorkflows(selectedLU: any) {
        this.fileDeleting = true;
        await this.moveLUResourcesToStorageTrash(`learningUnits/${selectedLU?.docId}`, 'learningUnits/--trash--');
        this.fileDeleting = false;
        this.workflowDeletion = true;
        const programmeTemplateData = await lastValueFrom(this.programmeTemplateService.getProgrammeTemplatesByLearningUnitId(selectedLU?.docId).pipe(first()));
        await Promise.all(programmeTemplateData.map(async (programmeTemplate) => {
            const { docId, masterDocId } = programmeTemplate;
            await this.masterService.updateMasterDocField(masterDocId, docId, 'programmeTemplates', 'learningUnitsIds', arrayRemove(selectedLU?.docId));
            await this.programmeTemplateService.updateProgrammeTemplateSingleField(docId, 'learningUnitsIds', arrayRemove(selectedLU?.docId));
        }));
        const programData = await lastValueFrom(this.programmeService.getProgrammesByLearningUnitId(selectedLU?.docId).pipe(first()));
        await Promise.all(programData.map(async (programme) => {
            const { masterDocId: programmeMasterDocId, docId: matchingProgrammeId } = programme;
            const classroomData = await lastValueFrom(this.classroomService.getClassroomsByProgrammeId(matchingProgrammeId).pipe(first()));
            classroomData.map(async (classroom) => {
                const { docId: classroomId, masterDocId: classroomMasterDocId } = classroom;
                for (const programmeId in classroom.programmes) {
                    const workflowIds = classroom.programmes[programmeId].workflowIds;
                    if (workflowIds.map((workflow: any) => workflow.learningUnitId).includes(selectedLU?.docId)) {
                        await this.masterService.updateMasterDocField(programmeMasterDocId, programmeId, 'programmes', 'learningUnitsIds', arrayRemove(selectedLU?.docId));
                        await this.programmeService.updateProgrammeSingleField(programmeId, 'learningUnitsIds', arrayRemove(selectedLU?.docId));
                        const workflowToBeRemoved = workflowIds.find((workflow: any) => workflow.learningUnitId === selectedLU?.docId);
                        const workflowIdToBeRemoved = workflowIds.find((workflow: any) => workflow.learningUnitId === selectedLU?.docId).workflowId;
                        if (workflowIdToBeRemoved && workflowIdToBeRemoved.length) {
                            const workflow = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(workflowIdToBeRemoved));
                            workflow.linkedLearningUnitId = selectedLU?.docId;
                            workflow.linkedProgrammeId = programme?.docId;
                            workflow.linkedClassroomId = classroom?.docId;
                            this.workflowService.moveToTrash(workflow);
                            await this.workflowService.delete(workflowIdToBeRemoved);
                            await this.moveResourcesToStorageTrash(`workflows/${classroomId}_${programmeId}`, 'workflows/--trash--');
                        } else {
                            console.error('No workflowId found for the learning unit in the classroom:', classroomId);
                        };
                        await this.classroomService.updateClassroomSingleField(classroomId, `programmes.${programmeId}.workflowIds`, arrayRemove(workflowToBeRemoved));
                    } else {
                        console.error('No workflowIds found for the learning unit in the classroom:', classroomId);
                    };
                };
            });
        }));
        this.workflowDeletion = false;
    }

    async trashLearningUnitResourcesAndBoardGradeResources(learningUnitId: string) {
        const learningUnitResources = await lastValueFrom(this.LUresourcesService.getDocDataByLUId(learningUnitId).pipe(first()));
        if (learningUnitResources.empty) {
            console.error(`No learning unit resources found for learning unit ${learningUnitId} to trash`);
        } else {
            await Promise.all(learningUnitResources.docs.map(async (res) => {
                const learningUnitResource = await this.sharedService.convertTimestamps(res.data());
                this.learningUnitResourceService.trashLearningUnitResource(learningUnitResource);
                await this.learningUnitResourceService.deleteLearningUnitResourceById(learningUnitResource.docId);
            }));
        };
        const boardGradeResources = await lastValueFrom(this.boardGradeResourceService.getDocDataByLuId(learningUnitId).pipe(first()));
        if (boardGradeResources.empty) {
            console.error(`No board grade resources found for learning unit ${learningUnitId} to trash`);
        } else {
            await Promise.all(boardGradeResources.docs.map(async (res) => {
                const boardGradeResource = await this.sharedService.convertTimestamps(res.data());
                this.boardGradeResourceService.trashBoardGradeResource(boardGradeResource);
                await this.boardGradeResourceService.deleteBoardGradeResourceById(boardGradeResource.docId);
            }));
        };
    }

    async getCumulativeMaturities() {
        const cumulativeMaturityRef = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('learningUnitMaturity'));
        const cumulativeMaturity: any = cumulativeMaturityRef?.get('maturity');
        return cumulativeMaturity;
    }

    async moveResourcesToStorageTrash(sourcePath: string, destinationPath: string) {
        const sourceRef = this.storage.ref(sourcePath);
        const folderRef = await lastValueFrom(sourceRef.listAll());
        if (folderRef.prefixes.length) {
            folderRef.prefixes.forEach(async (prefix) => {
                const subFolderName = prefix.name;
                const destinationFolder = sourcePath.includes('/') ? `${sourcePath.split('/')[1]}/${subFolderName}` : `${sourcePath}/${subFolderName}`;
                const subFolderRef = await prefix.listAll();
                for (let i = 0; i < subFolderRef.items.length; i++) {
                    const link = await subFolderRef.items[i].getDownloadURL();
                    const contentType = (await subFolderRef.items[i].getMetadata()).contentType;
                    const name = subFolderRef.items[i].name;
                    const destinationSubfolder = `${destinationFolder}/${name}`;
                    const destinationRef = this.storage.ref(`${destinationPath}/${destinationSubfolder}`);
                    const fileBytes = await lastValueFrom(this.http.get(link, { responseType: 'arraybuffer' }));
                    const task = destinationRef.put(fileBytes, { contentType });
                    // Handle the upload task
                    task.snapshotChanges().subscribe(() => {
                    }, (error) => {
                        console.error('Error uploading file to destination folder:', error);
                    });
                    task.percentageChanges().subscribe(res =>
                        console.log('uploading: ', res)
                    );
                    // Delete the folder from the source folder after successful upload
                    const deletePath = sourcePath.includes('/') ? `${sourcePath.split('/')[0]}/${destinationSubfolder}` : `${sourcePath}/${destinationSubfolder}`;
                    const deleteRef = this.storage.ref(deletePath);
                    deleteRef.delete().subscribe(() => {
                        console.log('Folder deleted successfully.');
                    }, (error) => {
                        console.error('Error deleting file from source folder:', error);
                    });
                };
            });
        } else {
            console.error('Folder empty');
        };
    }

    async moveLUResourcesToStorageTrash(sourcePath: string, destinationPath: string) {
        try {
            const sourceRef = this.storage.ref(sourcePath);
            const folderRef = await lastValueFrom(sourceRef.listAll());
            const destinationFolder1 = `${sourcePath.split('/')[1]}/`;
            folderRef.items.forEach(async (itemRef) => {
                // itemRef is a file

                const link = await itemRef.getDownloadURL();
                this.filestobeDeleted = this.filestobeDeleted + 1;

                //const link = await item.getDownloadURL();
                const contentType = (await itemRef.getMetadata()).contentType;
                const name = itemRef.name;
                const destinationSubfolder = `${destinationFolder1}/${name}`;
                const destinationRef = this.storage.ref(`${destinationPath}/${destinationSubfolder}`);

                // Get file bytes using HTTP request
                const fileBytes = await lastValueFrom(this.http.get(link, { responseType: 'arraybuffer' }));

                // Upload file to destination
                const task = destinationRef.put(fileBytes, { contentType });
                await new Promise<void>((resolve, reject) => {
                    task.snapshotChanges().subscribe({
                        next: () => { },
                        error: error => reject(`Error uploading file: ${error}`),
                        complete: () => resolve(),
                    });
                });

                // Log upload progress
                task.percentageChanges().subscribe(res =>
                    console.log('Uploading: ', res)
                );

                // Delete the folder from the source folder after successful upload
                const deletePath = sourcePath.includes('/')
                    ? `${sourcePath.split('/')[0]}/${destinationSubfolder}`
                    : `${sourcePath}/${destinationSubfolder}`;
                const deleteRef = this.storage.ref(deletePath);

                // Await deletion process
                await new Promise<void>((resolve, reject) => {
                    deleteRef.delete().subscribe({
                        next: () => resolve(),
                        error: error => reject(`Error deleting file from source folder: ${error}`),
                    });
                });
                console.log('file deleted successfully.');
            });
            for (const prefix of folderRef.prefixes) {
                const subFolderName = prefix.name;
                const destinationFolder = sourcePath.includes('/')
                    ? `${sourcePath.split('/')[1]}/${subFolderName}`
                    : `${sourcePath}/${subFolderName}`;
                const subFolderRef = await prefix.listAll();
                for (let i = 0; i < subFolderRef.items.length; i++) {
                    const item = subFolderRef.items[i];
                    const link = await item.getDownloadURL();
                    const contentType = (await item.getMetadata()).contentType;
                    const name = item.name;
                    const destinationSubfolder = `${destinationFolder}/${name}`;
                    const destinationRef = this.storage.ref(`${destinationPath}/${destinationSubfolder}`);
                    this.filestobeDeleted = this.filestobeDeleted + 1;


                    // Get file bytes using HTTP request
                    const fileBytes = await lastValueFrom(this.http.get(link, { responseType: 'arraybuffer' }));

                    // Upload file to destination
                    const task = destinationRef.put(fileBytes, { contentType });
                    await new Promise<void>((resolve, reject) => {
                        task.snapshotChanges().subscribe({
                            next: () => { },
                            error: error => reject(`Error uploading file: ${error}`),
                            complete: () => resolve(),
                        });
                    });

                    // Log upload progress
                    task.percentageChanges().subscribe(res =>
                        console.log('Uploading: ', res)
                    );

                    // Delete the folder from the source folder after successful upload
                    const deletePath = sourcePath.includes('/')
                        ? `${sourcePath.split('/')[0]}/${destinationSubfolder}`
                        : `${sourcePath}/${destinationSubfolder}`;
                    const deleteRef = this.storage.ref(deletePath);

                    // Await deletion process
                    await new Promise<void>((resolve, reject) => {
                        deleteRef.delete().subscribe({
                            next: () => resolve(),
                            error: error => reject(`Error deleting file from source folder: ${error}`),
                        });
                    });
                }
                console.log('Folder deleted successfully.');
            }
            console.error('Folder is empty');
        } catch (error) {
            console.error('Error during resource moving process:', error);
        }
    }

    async getAllFilesfromLearningunit(sourcePath: string) {
        try {
            const sourceRef = this.storage.ref(sourcePath);
            const folderRef = await lastValueFrom(sourceRef.listAll());
            this.allfiles = this.allfiles + folderRef.items.length;
            for (const prefix of folderRef.prefixes) {
                const subFolderRef = await prefix.listAll();
                this.allfiles = this.allfiles + subFolderRef.items.length;
            }
            return this.allfiles;
        } catch (error) {
            console.error('Error during resource moving process:', error);
            return null;
        }
    }

    updatedHeadlineImg(updatePath) {
        if (updatePath) {
            const index = this.allLearningUnits.findIndex(d => d.docId == this.selectedLuDetails.docId);
            this.allLearningUnits[index]['headlineImage'] = updatePath;
        }
    }

    search(changes: any) {
        const term = this.searchTerm = this.sortingService.checkType(changes);
        if (term && term.trim() != '' && typeof (this.allLearningUnits) != 'undefined') {
            this.infinityScrollLocked = true;
            this.allLearningUnits = this.learingUnitBSub?.value?.filter(data => (data?.learningUnitName?.toLowerCase().includes(term.toLowerCase()) ||
                data?.docId?.toLowerCase().includes(term.toLowerCase()) ||
                (data?.learningUnitCode?.toLowerCase().includes(term.toLowerCase())) ||
                (data?.version?.toLowerCase().includes(term.toLowerCase())) ||
                (data?.tacOwnerName?.toLowerCase().includes(term.toLowerCase()))
            ));
            this.loadingMessage = `${this.allLearningUnits.length} search results found`;
        }
        else {
            this.infinityScrollLocked = false;
            this.allLearningUnits = this.learingUnitBSub.value.slice(0, 10);
            this.loadingMessage = `Loaded ${this.allLearningUnits.length} of ${this.totalCount} entries`;
        }
    }

    getlatestVersion() {
        let sortedtags = [];
        const difftac = [];
        const uniquetacs = [];
        for (const item of this.allLearningUnits) {
            if (!uniquetacs.includes(item.version)) {
                uniquetacs.push(item.version);
            }
        }
        uniquetacs.map((tag) => {
            this.allLearningUnits.filter((item) => {
                if (item.version == tag) {
                    difftac.push(item);
                }
            });
        });
        sortedtags = difftac.sort((a, b) => {
            if (a.version.split('-V')[1] > b.version.split('-V')[1]) {
                return -1;
            }
            if (a.version.split('-V')[1] < b.version.split('-V')[1]) {
                return 1;
            }
            return 0;
        });
        this.allLearningUnits = sortedtags;
    }

    sortData(sort: Sort) {
        const labels = ['version', 'status', 'learningUnitCode', 'creationDate', 'tacOwnerName', 'learningUnitDisplayName', 'type', 'isoCode'];
        const defaultLabel = 'learningUnitName';
        this.allLearningUnits = this.sortingService.sortFunction(sort, labels, this.allLearningUnits, defaultLabel);
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    async compareConfigwithLU(mValue, selectedLuDetails, typeMod) {
        if (mValue == 'gold') {
            this.maturityObj['gold'] = selectedLuDetails.resources[this.mValue] || '';
            this.maturityObj['silver'] = selectedLuDetails.resources['silver'] || '';
            selectedLuDetails['maturityDoc'] = selectedLuDetails.resources[this.mValue] || '';
            const currentResources: any = await this.getLUdetails(selectedLuDetails.resources[mValue]);
            this.resourcesLU[this.mValue] = currentResources ? currentResources.resources : {};
            selectedLuDetails['resources'][mValue] = currentResources ? currentResources.resources : {};
        }
        else if (this.mValue == 'platinum') {
            this.maturityObj['gold'] = selectedLuDetails.resources['gold'] || '';
            this.maturityObj['platinum'] = selectedLuDetails.resources[this.mValue] || '';
            this.maturityObj['silver'] = selectedLuDetails.resources['silver'] || '';
            selectedLuDetails['maturityDoc'] = selectedLuDetails.resources[this.mValue] || '';
            const currentResources: any = await this.getLUdetails(selectedLuDetails.resources[this.mValue]);
            this.resourcesLU[this.mValue] = currentResources.resources;
            selectedLuDetails['resources'][mValue] = currentResources ? currentResources.resources : {};
        }
        else if (this.mValue == 'diamond') {
            this.maturityObj['gold'] = selectedLuDetails.resources['gold'] || '';
            this.maturityObj['platinum'] = selectedLuDetails.resources['platinum'] || '';
            this.maturityObj['diamond'] = selectedLuDetails.resources[this.mValue] || '';
            this.maturityObj['silver'] = selectedLuDetails.resources['silver'] || '';
            selectedLuDetails['maturityDoc'] = selectedLuDetails.resources[this.mValue] || '';
            const currentResources: any = await this.getLUdetails(selectedLuDetails.resources[this.mValue]);
            this.resourcesLU[this.mValue] = currentResources.resources;
            selectedLuDetails['resources'][mValue] = currentResources ? currentResources.resources : {};
        }
        else if (this.mValue == 'silver') {
            this.maturityObj['silver'] = selectedLuDetails.resources['silver'] || '';
            const currentResources: any = await this.getLUdetails(selectedLuDetails.resources[this.mValue]);
            selectedLuDetails['resources'][mValue] = currentResources ? currentResources.resources : {};
        }
        else {
            console.error('No maturity found');
        }

        return selectedLuDetails;
    }

    async getLUdetails(doc) {
        const resources = await this.LUresourcesService.getDocDataByDocId(doc);
        return resources;
    }

    async toggleDetails(selectedLU: any) {
        const learningUnitDoc = (await lastValueFrom(this.learningUnitService.getLUByIdOnce(selectedLU?.docId))).data();
        this.selectedLuDetails = learningUnitDoc;
        const mValue = (String(this.selectedLuDetails.Maturity)).toLowerCase();
        this.mValue = mValue;
        const luType = this.selectedLuDetails.type.replace(/\s+/g, '');
        const resourceNames = this.getResourcesForType(luType);
        this.tacResourceCopy = this.tacResources['resources'][luType];
        const arr = [];
        Object.entries(this.tacResources?.['resources']?.[luType]?.['resourceNames']).forEach((d: any) => {
            const obj = {};
            obj['key'] = d[0];
            obj['value'] = d[1];
            arr.push(obj);
        });

        this.uncommonResource = arr;
        if (typeof (this.selectedLuDetails.resources[`${mValue}`]) == 'undefined') {
            this.selectedLuDetails.resources[`${mValue}`] = resourceNames[`${mValue}`];
        };
        this.selectedLuDetails = await this.compareConfigwithLU(mValue, this.selectedLuDetails, luType);
        this.selectLUhardCopy = JSON.parse(JSON.stringify(this.selectedLuDetails));

        const id = selectedLU.docId;
        if (this.selectedLearningUnit?.docId === id) {
            this.selectedLearningUnit = '';
        }
        else {
            this.selectedLearningUnit = selectedLU;
        };
        this.selectedLuDetails.masterDocId = this.selectedLearningUnit.masterDocId;
    }

    onScroll() {
        if (!this.infinityScrollLocked) {
            this.isScrollLoading = true;
            this.learingUnitBSub.subscribe((res) => {
                this.allLearningUnits = res.slice(0, this.allLearningUnits.length + 10);
                this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'displayName', 'asc') as Sort);
                this.isScrollLoading = false;
                this.loadingMessage = `Loaded ${this.allLearningUnits.length} of ${this.totalCount} entries`;
            });
        }
    }

    async getTaData(d) {
        return new Promise((resolve) => {
            d.subscribe((m) => {
                resolve(m);
            });
        });
    }

    onlanguageChange(event: any) {
        this.selectedLang = event;
        this.changeLang1.emit(this.selectedLang);
    }

    onversionChange(event: any) {
        this.selectedVersion = event;
        this.changeVersion1.emit(this.selectedVersion);
    }

    onSearchChanged(event: Event | string) {
        this.inputChanged = this.sortingService.checkType(event);
        this.search(this.inputChanged);
        this.searchLearningUnitsOutput1.emit(this.inputChanged);
    }

    async collapseAfterEditLU(editedLU: any) {
        if (editedLU) {
            this.selectedLearningUnit = '';
            this.isFirstTime = false;
            this.search(this.searchTerm);
            await this.getAllLearningUnits();
        }
    }

    async updateSearch(event) {
        if (event) {
            await this.getAllLearningUnits();
            this.search(this.searchTerm);
        }
    }

    copyToClipboard(text: string | undefined): void {
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                console.info('Copied to clipboard:', text);
            }).catch((error) => {
                console.error('Failed to copy:', error);
            });
        }
    }

    copyToClipboardDate(d) {
        const dateInMilliseconds = d.seconds * 1000 + Math.floor(d.nanoseconds / 1e6);
        const formattedDate = new Date(dateInMilliseconds).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        navigator.clipboard.writeText(formattedDate).then(() => {
            console.info('Copied to clipboard:', formattedDate);
        }).catch((error) => {
            console.error('Failed to copy:', error);
        });
    }

    async addedNewLU(event: any) {
        if (event) {
            await this.getAllLearningUnits();
        }
    }

    getLUfromLUcollection() {
        return new Promise((resolve) => {
            this.learningUnitService.getAllLUFromLUcoll().subscribe((d) => {
                resolve(d.docs);
            });
        });
    }

    async deleteLUFiles(ludetails) {
        const allFilePaths: string[] = [];
        if (ludetails.additionalResources) {
            ludetails.additionalResources.forEach((files) => {
                if (files.resourcePath) {
                    allFilePaths.push(files.resourcePath);
                }
            });
        }

        if (ludetails.resources) {
            Object.values(ludetails.resources).forEach((e: string) => {
                if (e != '') {
                    allFilePaths.push(e);
                }
            });
        }

        allFilePaths.push(ludetails.headlineImage);
        allFilePaths.push(ludetails.learningUnitsPicPath);
        if (allFilePaths.length > 0) {
            await Promise.all(
                allFilePaths.map(async (d) => {
                    if (this.storage.ref(d)) {
                        this.storage.ref(d).delete().toPromise().then(async () => {
                            await new Promise((resolve) => {
                                resolve('');
                            });

                        }).catch((error) => {
                            console.log(error);

                        });
                    }
                    else {
                        console.error('not found');
                    }

                })
            );
        }
    }

    hasKeys(obj: any): boolean {
        return obj && Object.keys(obj).length > 0;
    }

}
