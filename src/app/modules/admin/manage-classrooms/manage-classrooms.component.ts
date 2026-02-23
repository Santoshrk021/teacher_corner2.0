import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';

import { BehaviorSubject, lastValueFrom, Subject, take, takeUntil } from 'rxjs';

import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';

import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';

import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';

import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { SortingService } from 'app/shared/sorting.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UiService } from 'app/shared/ui.service';

import { ManageTrashClassroomsComponent } from '../manage-trash-classrooms/manage-trash-classrooms.component';
import { ClassroomCreateComponent } from './classroom-create/classroom-create.component';


@Component({
  selector: 'app-manage-classrooms',
  templateUrl: './manage-classrooms.component.html',
  styleUrls: ['./manage-classrooms.component.scss']
})
export class ManageClassroomsComponent implements OnInit, OnDestroy {

  @Input() searchTermInput;

  @ViewChild(MatSort) _sort: MatSort;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  classrooms: any[] = [];
  selectedclsSub = new BehaviorSubject(null);
  component: any;
  searchTermUpdated;
  classroomSearchResult;
  allProgrammes: any[] = [];
  drawerOpened: any = false;
  clsRef;
  classroomData;
  disableLoader: boolean = true;
  allClassrooms = [];
  classroomsSub = new BehaviorSubject(null);
  infinityScrollLocked: any;
  searchTerm: string;
  isFirstTime: boolean = true;
  isScrollLoading: boolean = true;
  lastObjectIdBeforeSort: string;
  savedSortEvent: any;
  isFirstTimeSorted: boolean = false;
  loadingMessage: string;
  totalCount: number;

  constructor(
    private classroomService: ClassroomsService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private drawerService: FuseDrawerService,
    public dialog: MatDialog,
    private programmeService: ProgrammeService,
    private teacherService: TeacherService,
    private studentService: StudentsService,
    private masterService: MasterService,
    private sortingService: SortingService
  ) {
    this.drawerService.drawerOpenTrashClsSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.drawerOpened = res;
      if (!res) {
        this.search(this.searchTerm);
      }
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.unsubscribe();
  }

  ngOnInit(): void {
    this.getAllClassrooms();
    /*
      // old code
      this.programmeService.getAllLiveProgrammes().pipe(take(1)).subscribe((data) => {
        this.allProgrammes = data
      })
    */
    this.masterService.getAllMasterDocsMapAsArray('PROGRAMME', 'programmes').pipe(take(1)).subscribe((masterProgrammes) => {
      this.allProgrammes = masterProgrammes.filter(programme => programme?.programmeStatus === 'LIVE');
    });
  }

  async getAllClassrooms() {
    const masterClassrooms = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('CLASSROOM', 'classrooms').pipe(take(1)));
    const masterClassroomsWithProgrammes = masterClassrooms.map((classroom) => {
      if (typeof classroom === 'object' && classroom !== null) {
        return { ...classroom, viewProgrammes: this.getProgrammeNames(classroom) };
      }
      return classroom;
    });
    this.totalCount = masterClassroomsWithProgrammes.length;
    this.classrooms = masterClassroomsWithProgrammes;
    this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'creationDate', 'desc') as Sort);
    this.classroomData = this.classrooms;
    this.classroomsSub.next(this.classrooms);
    if (this.isFirstTime) {
      this.classrooms = this.classrooms.slice(0, 30);
      this.loadingMessage = `Loaded ${this.classrooms.length} of ${this.totalCount} entries`;
    } else {
      this.search(this.searchTerm);
      this.loadingMessage = `${this.classrooms.length} search results found`;
    }
    this.isScrollLoading = false;
  }

  onEditCls(isEdited: any) {
    if (isEdited) {
      this.isFirstTime = false;
      const preSelectedCls: any = this.selectedclsSub?.value;
      if (preSelectedCls?.docId === isEdited.docId) {
        const updatedClsIndex = this.classrooms.findIndex(cls => cls.classroomId == isEdited.docId);
        this.classrooms[updatedClsIndex] = { ...isEdited, viewProgrammes: this.getProgrammeNames(this.selectedclsSub?.value) };
      }
    }
  }

  getProgrammeNames(cls: any) {
    if (cls?.programmes) {
      return Object.values(cls.programmes).map((prog: any) => prog.programmeName).join(', ');
    } else {
      console.error(`Classroom "${cls?.docId ?? cls?.id}" does not have programmes`);
      return '';
    }
  }

  toggleDetails(cls) {
    const preSelectedCls: any = this.selectedclsSub?.value;
    if (preSelectedCls?.docId === cls.docId) {
      this.selectedclsSub.next(null);
    }
    else {
      this.selectedclsSub.next(cls);
    }
  }

  updateclssOnEdit(docId: string, newValue: any) {
    const index = this.classrooms.findIndex(d => d.docId == docId);
    this.classrooms[index] = newValue;
  }

  updateclssOnDelete(docId: string) {
    const index = this.classrooms.findIndex(d => d.docId == docId);
    this.classrooms.splice(index, 1);
  }

  onDeletecls(clsInfo: any) {
    const name = clsInfo.classroomName;
    const config = {
      title: 'Delete classroom',
      message: `Are you sure you want to delete "${name}" ?`,
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        if (!clsInfo || !clsInfo.hasOwnProperty('masterDocId')) {
          console.error('masterDocId not found in clsInfo', clsInfo);
          this.uiService.alertMessage('Error', `Error deleting classroom "${name}"`, 'error');
        } else {
          const { docId: classroomId, masterDocId } = clsInfo;
          try {
            await this.deleteMasterDoc(masterDocId, classroomId);
            await this.updateTeacherStudentCollection(classroomId);
            const classroom: any = await this.classroomService.getClassroomDataById(classroomId);
            this.classroomService.toTrash(classroomId, classroom);
            await this.classroomService.delete(classroomId);
            const updatedMasterClassrooms = this.classroomsSub.value.filter((cls: any) => cls?.docId != classroomId);
            this.classroomsSub.next(updatedMasterClassrooms);
            this.isFirstTime = false;
            this.search(this.searchTerm);
            this.uiService.alertMessage('Deleted', `classroom "${name}" deleted successfully`, 'error');
          } catch (error) {
            console.error('Error deleting classroom', error);
            this.uiService.alertMessage('Error', `Error deleting classroom "${name}"`, 'error');
          }
        }
      }
    });
  }

  // loader = true

  deleteMasterDoc(masterDocId: string, classroomId: string) {
    this.masterService.deleteObjectFromMasterMap(masterDocId, 'classrooms', classroomId);
  }

  async updateTeacherStudentCollection(classroomDocId: string) {
    const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${classroomDocId}.classroomId`, '==', classroomDocId);
    const doc = this.teacherService.getWithQuery(query);
    doc.pipe(take(1)).subscribe((res) => {
      if (res.length) {
        for (const teacherDoc of res) {
          delete teacherDoc?.classrooms[classroomDocId];
          this.teacherService.setTeacher(teacherDoc.docId, teacherDoc);
        }
      }
    });

    const studentDoc = this.studentService.getWithQuery(query);
    studentDoc.pipe(take(1)).subscribe((res) => {
      if (res.length) {
        res.forEach((studentdoc) => {
          delete studentdoc?.classrooms[classroomDocId];
          this.studentService.setStudent(studentdoc.docId, studentdoc);
        });
      }
    });
  }

  async addClassroom() {
    const dialogConfig: MatDialogConfig = {
      data: {
        classroomsData: this.classroomData,
      },
    };

    await import('./classroom-create/classroom-create.module').then(() => {
      const dialogRef = this.dialog.open(ClassroomCreateComponent, dialogConfig);
    });
  }

  search(event: Event | string) {
    const val = this.searchTerm = this.sortingService.checkType(event);
    this.classrooms = [];
    this.searchTermUpdated = this.sortingService.checkType(event);
    if (val && val.trim() != '') {
      this.infinityScrollLocked = true;
      this.classrooms = this.classroomsSub.value.filter(item => (item?.institutionName?.toLowerCase()?.includes(val?.toLowerCase()) ||
          item?.classroomId?.includes(val) ||
          item.classroomName?.toLowerCase()?.includes(val?.toLowerCase())));
      this.classroomSearchResult = this.classrooms;
      if (this.classroomSearchResult > 0) {
        this.disableLoader = true;
      }
      else {
        this.disableLoader = false;
      }
      this.isFirstTime = false;
      this.loadingMessage = `${this.classrooms.length} search results found`;
    }
    else {
      this.infinityScrollLocked = false;
      this.classrooms = this.classroomsSub?.value?.slice(0, 10);
      this.classroomSearchResult = this.classrooms;
      this.loadingMessage = `Loaded ${this.classrooms?.length} of ${this.totalCount} entries`;
    }
  }

  async goToTrash() {
    await import('../manage-trash-classrooms/manage-trash-classrooms.module').then(() => {
      this.component = ManageTrashClassroomsComponent;
      this.drawerService.drawerOpenTrashClsSubject.next(true);
    });
  }

  sortData(sort: Sort) {
    const labels = ['classroomName', 'subject', 'grade', 'institutionName', 'viewProgrammes', 'creationDate'];
    const defaultLabel = 'creationDate';
    this.savedSortEvent = sort;
    this.classrooms = this.sortingService.sortFunction(sort, labels, this.classrooms, defaultLabel);
  }

  onScroll() {
    if (!this.infinityScrollLocked) {
      this.isScrollLoading = true;
      this.lastObjectIdBeforeSort = this.classrooms[this.classrooms.length - 1].docId;

      this.classroomsSub.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
        this.classrooms = res.slice(0, this.classrooms.length + 10);
        this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'creationDate', 'desc') as Sort);
        this.isScrollLoading = false;
        this.loadingMessage = `Loaded ${this.classrooms.length} of ${this.totalCount} entries`;
      });
    }
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

  // Copy date to clipboard
  copyToClipboardDate(d: any): void {
    const dateInMilliseconds = d.seconds * 1000 + Math.floor(d.nanoseconds / 1e6);
    const formattedDate = new Date(dateInMilliseconds).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    navigator.clipboard.writeText(formattedDate).then(() => {
      console.info('Copied to clipboard:', formattedDate);
    }).catch((error) => {
      console.error('Failed to copy:', error);
    });
  }

}
