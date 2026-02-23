import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
import { ProgramInfoComponent } from '../program-info/program-info.component';
import { MatStepper } from '@angular/material/stepper';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { ManageTrashProgrammesComponent } from '../../manage-trash-programmes/manage-trash-programmes.component';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { Subject, first, lastValueFrom, take, takeUntil } from 'rxjs';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { UiService } from 'app/shared/ui.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { MatSort, Sort } from '@angular/material/sort';
import { SortingService } from 'app/shared/sorting.service';
import { arrayRemove, deleteField } from '@angular/fire/firestore';

@Component({
    selector: 'app-programme-list',
    templateUrl: './programme-list.component.html',
    styleUrls: ['./programme-list.component.scss']
})

export class ProgrammeListComponent implements OnInit, OnDestroy {
    @Input() searchTermInput;
    @Output() selectedProgrammeOutput: EventEmitter<any> = new EventEmitter();
    @ViewChild('stepper') stepper: MatStepper;
    @ViewChild(MatSort) _sort: MatSort;

    stepperdata = new BehaviorSubject<any>(null);
    programData: any[] = [];
    programDataCopy: any[] = [];
    gradesTobeDisplayed = [];
    docTobeDeleted: any = [];
    filteredPrograms: any[] = [];
    teacherSubTest = new BehaviorSubject<any>(null);
    institutionArr: any[] = [];
    selectedProgramId;
    gradesNos: any[] = [];
    masterClassroomsTest: any = [];
    masterDocs: any = [];
    unsubscribe: any[] = [];
    allteachersTest: any = [];
    allstudentsTest: any = [];
    show: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    tableHeader: any;
    selectedProgramDetails: any;
    selectedProgramme: any = {
    };
    deletingLoader = false;
    drawerOpened: any = false;
    component: any;
    allClassroomsTest: any = [];
    clsRef: any;
    classroomsSub = new BehaviorSubject(null);
    searchTerm: string;
    hasBeenEdited: boolean = false;
    savedSortEvent: any;
    loadingMessage: string;
    totalCount: number;
    programmes: any[] = [];
    programmesSub = new BehaviorSubject(null);
    isFirstTime: boolean = true;
    isScrollLoading: boolean = true;
    batchSize: number = 10;
    infinityScrollLocked: boolean = false;
    searchValue: string = '';

    constructor(
        private programmeService: ProgrammeService,
        private dialog: MatDialog,
        private drawerService: FuseDrawerService,
        private fuseConfirmationService: FuseConfirmationService,
        private classroomService: ClassroomsService,
        private uiService: UiService,
        private teacherService: TeacherService,
        private studentService: StudentsService,
        private masterService: MasterService,
        private sortingService: SortingService,
    ) {
        this.drawerService.drawerOpenTrashProgrammesSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
            this.drawerOpened = res;
            if (!res) {
                this.search(this.searchTerm);
            }
        });
    }

    ngOnDestroy(): void {
        this.unsubscribe.forEach((e) => {
            e.unsubscribe();
        });
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    ngOnInit() {
        this.getAllProgrammes();
    }

    sortData(sort: Sort) {
        const labels = ['displayName', 'programmeName', 'programmeId', 'programmeStatus', 'programmeInstitution', 'updatedAt', 'createdAt', 'programmeGrades', 'programmeCode'];
        const defaultLabel = 'createdAt';
        this.savedSortEvent = sort;
        this.programmes = this.sortingService.sortFunction(sort, labels, this.programmes, defaultLabel);
        this.show = true;
    }

    async getAllProgrammes(): Promise<void> {
        const allProgrammes = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('PROGRAMME', 'programmes').pipe(first()));
        if (allProgrammes || allProgrammes?.length) {
            this.totalCount = allProgrammes.length;
            this.programmes = allProgrammes;
            this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'createdAt', 'desc') as Sort);
            this.programData = this.programmes;
            this.programmesSub.next(this.programmes);
            if (this.isFirstTime) {
                this.programmes = this.programmes.slice(0, 10);
                this.loadingMessage = `Loaded ${this.programmes.length} of ${this.totalCount} entries`;
            } else {
                this.search(this.searchTerm);
                this.loadingMessage = `${this.programmes.length} search results found`;
            }
            this.isScrollLoading = false;
        } else {
            console.error('No programmes found');
        };
    }

    search(event: Event | string): void {
        const val = (this.searchTerm = this.sortingService.checkType(event));
        if (val !== undefined && val != '') {
            if (val && val.trim() !== '') {
                this.infinityScrollLocked = true;
                this.programmes = this.programmesSub?.value?.filter((item: any) => ((item?.programmeName?.toLowerCase()?.includes(val?.toLowerCase()) || '')
                        || (item?.programmeId?.toLowerCase()?.includes(val?.toLowerCase()) || '')
                        || (item?.displayName?.toLowerCase()?.includes(val?.toLowerCase()) || '')
                    ));
            }
            this.loadingMessage = `${this.programmes?.length} search results found`;
        }
        else {
            if (this.isFirstTime) {
                this.infinityScrollLocked = false;
                this.programmes = this.programmesSub?.value?.slice(0, 10);
            }
            this.loadingMessage = `Loaded ${this.programmes?.length} of ${this.totalCount} entries`;
        }
    }

    async toggleDetails(selectedProgramme: any) {
        this.selectedProgramDetails = selectedProgramme;
        const id = selectedProgramme.programmeId;
        if (this.selectedProgramme?.programmeId === id) {
            this.selectedProgramme = '';
        }
        else {
            this.selectedProgramme = selectedProgramme;
        }
    }

    async addNewProgramme() {
        await import('../program-info/program-info.component').then(() => {
            const dialogRef = this.dialog.open(ProgramInfoComponent, {
                data: {
                    addNewProgramFlag: true,
                    allPrograms: this.programData
                },
            });
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    this.hasBeenEdited = true;
                    // add the programme to list and update search filter
                    // this.getAllProgrammes();
                    const allProgrammes = this.programmesSub.value;
                    const updatedProgrammes = [...allProgrammes, result];
                    this.programmesSub.next(updatedProgrammes);
                    this.search(this.searchTerm);
                };
            });
        });
    }

    async deleteProgram(program: any) {
        this.docTobeDeleted = [];
        const programmeId = program?.programmeId;
        const name = program?.programmeName;
        const config = {
            title: 'Delete Programme',
            message: name.length > 13
                ? `<br><p class="">Are you sure you want to delete "${name.slice(0, 13)}..."?</p><br>
         <p class=" text-justify">On deleting this programme, all teachers, students, and classrooms to which this programme is assigned will be removed and lost forever.</p><br>
         <p> These assignments will have to be set manually in case the programme is restored.</p>`
                : `<p>Are you sure you want to delete "${name}"?</p><br>
         <p class=" text-justify"> On deleting this programme, all teachers, students, and classrooms to which this programme is assigned will be removed and lost forever.</p><br>
         <p> These assignments will have to be set manually in case the programme is restored.</p>`,
            icon: {
                name: 'mat_outline:delete'
            }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                this.deletingLoader = true;
                const masterClassrooms = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('CLASSROOM', 'classrooms').pipe(first()));
                const masterClassroomsWithMatchingProgramme = masterClassrooms.filter((doc: any) => doc.programmes && doc.programmes.hasOwnProperty(programmeId));
                const matchingClassroomIds = masterClassroomsWithMatchingProgramme.map((classroom: any) => classroom.docId);
                const teachersWithMatchingClassrooms = await this.teacherService.getAllTeacherDocsByClassroom(matchingClassroomIds);
                const studentsWithMatchingClassrooms = await this.studentService.getAllStudentDocsByClassroom(matchingClassroomIds);

                this.classroomsSub.next(masterClassrooms);

                try {
                    await this.removeProgrammeFromClassroomsAndClassroomMaster(masterClassroomsWithMatchingProgramme, programmeId);
                    await this.removeProgrammeFromStudentsAndTeachers(teachersWithMatchingClassrooms, matchingClassroomIds, programmeId, 'Teacher');
                    await this.removeProgrammeFromStudentsAndTeachers(studentsWithMatchingClassrooms, matchingClassroomIds, programmeId, 'Student');
                    await this.trashProgrammeAndRemoveProgrammeFromProgrammesAndProgrammeMaster(program);
                    // delete the programme from list and update search filter
                    const allProgrammes = this.programmesSub.value;
                    const updatedProgrammes = allProgrammes.filter((res: any) => res.programmeId !== programmeId);
                    this.programmesSub.next(updatedProgrammes);
                    this.search(this.searchTerm);
                    this.deletingLoader = false;
                    this.uiService.alertMessage('Deleted', `Programe "${name}" deleted successfully`, 'error');
                } catch (error) {
                    this.uiService.alertMessage('Error', `Error deleting programme "${name}"`, 'error');
                    console.error('Error deleting programme: ', error);
                };
            }
        });
    }

    async removeProgrammeFromClassroomsAndClassroomMaster(classrooms: Array<any>, programmeIdToRemove: string) {
        await Promise.all(classrooms.map(async (classroom) => {
            const { docId, programmes, masterDocId } = classroom;
            for (const programmeId in programmes) {
                if (programmeId === programmeIdToRemove) {
                    await this.classroomService.updateClassroomSingleField(docId, `programmes.${programmeId}`, deleteField());
                    await this.masterService.deleteObjectFromMasterMap(masterDocId, `classrooms.${docId}.programmes`, programmeId);
                } else {
                    console.error(`No matching programme found in classroom ${docId} to be removed : `, programmeIdToRemove);
                };
            }
        }));
    }

    async removeProgrammeFromStudentsAndTeachers(arrayToUpdate: Array<any>, matchingClassroomIds: Array<any>, programmeId: string, role: string) {
        await Promise.all(arrayToUpdate.map(async (document) => {
            const { docId, classrooms } = document;
            for (const classroomId in classrooms) {
                if (matchingClassroomIds.includes(classroomId)) {
                    const { programmes } = classrooms[classroomId];
                    const programmeToRemove = programmes.find((programme: any) => programme.programmeId === programmeId);
                    const leftOverProgrammes = programmes.filter((programme: any) => programme.programmeId !== programmeId);
                    if (programmeToRemove) {
                        if (leftOverProgrammes.length > 0) {
                            await this[`${role.toLowerCase()}Service`][`updateSingleFieldIn${role}`](docId, `classrooms.${classroomId}.programmes`, arrayRemove(programmeToRemove));
                        } else {
                            await this[`${role.toLowerCase()}Service`][`updateSingleFieldIn${role}`](docId, `classrooms.${classroomId}`, deleteField());
                        };
                    } else {
                        console.error(`There are no matching programmes to remove from classroom ${classroomId} of ${role} document ${docId}`);
                    };
                } else {
                    console.error(`Classroom ${classroomId} doesn't have programme ${programmeId} and doesn't need to be removed from ${role} document ${docId}`);
                };
            }
        }));
    }

    async trashProgrammeAndRemoveProgrammeFromProgrammesAndProgrammeMaster(programme: any) {
        const { programmeId, masterDocId } = programme;
        await this.programmeService.toTrash(programmeId, programme);
        await this.programmeService.delete(programmeId);
        await this.masterService.deleteObjectFromMasterMap(masterDocId, 'programmes', programmeId);
    }

    removeDuplicates(arr) {
        return arr.filter((value, index, self) => self.indexOf(value) === index);
    }

    async goToTrash() {
        await import('../../manage-trash-programmes/manage-trash-programmes.module').then(() => {
            this.component = ManageTrashProgrammesComponent;
            this.drawerService.drawerOpenTrashProgrammesSubject.next(true);
        });
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

    isNotString(item: any): boolean {
        return typeof item !== 'string';
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

    onSearchTermReceived(term: string) {
        if (term) {
            this.hasBeenEdited = true;
            this.selectedProgramme = null;
            this.search(term);
        }
    }

    async onScroll(event: any) {
        if (!this.infinityScrollLocked) {
            this.isScrollLoading = true;

            this.programmesSub.subscribe((res) => {
                this.programmes = res.slice(0, this.programmes.length + 10);
                this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'createdAt', 'desc') as Sort);
                this.isScrollLoading = false;
                this.loadingMessage = `Loaded ${this.programmes.length} of ${this.totalCount} entries`;
            });
        }
    }

}
