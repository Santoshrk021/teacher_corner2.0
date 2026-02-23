import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSort, Sort } from '@angular/material/sort';
import { MatStepper } from '@angular/material/stepper';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { SortingService } from 'app/shared/sorting.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, first, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { ProgrammeTemplate, ProgrammeTemplateMaster } from 'app/core/dbOperations/programmeTemplate/programme-template.type';
import { ProgrammeTemplateInfoComponent } from '../programme-template-info/programme-template-info.component';
import { ManageTrashProgrammeTemplatesComponent } from '../../manage-trash-programme-templates/manage-trash-programme-templates.component';

@Component({
  selector: 'app-programme-template-list',
  templateUrl: './programme-template-list.component.html',
  styleUrls: ['./programme-template-list.component.scss']
})
export class ProgrammeTemplateListComponent implements OnInit, OnDestroy {

  @Input() searchTermInput;
  @Output() selectedProgrammeOutput: EventEmitter<any> = new EventEmitter();
  @ViewChild('stepper') stepper: MatStepper;
  @ViewChild(MatSort) _sort: MatSort;

  stepperdata = new BehaviorSubject<any>(null);
  programmeTemplateData: Array<ProgrammeTemplate> = [];
  programmeTemplateDataCopy: Array<ProgrammeTemplate> = [];
  gradesTobeDisplayed: Array<number> = [];
  docTobeDeleted: Array<ProgrammeTemplate> = [];
  filteredPrograms: Array<ProgrammeTemplate> = [];
  teacherSubTest = new BehaviorSubject<any>(null);
  // institutionArr: any[] = [];
  selectedProgrammeTemplateId: string;
  gradesNos: Array<number> = [];
  masterClassroomsTest: any = [];
  masterDocs: any = [];
  unsubscribe: any[] = [];
  allteachersTest: any = [];
  allstudentsTest: any = [];
  show: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  tableHeader: any;
  selectedProgrammeTemplateDetails: ProgrammeTemplate;
  selectedProgrammeTemplate: any = {};
  deletingLoader: boolean = false;
  drawerOpened: boolean = false;
  component: any;
  allClassroomsTest: any = [];
  clsRef: any;
  classroomsSub = new BehaviorSubject(null);
  searchTerm: string;
  hasBeenEdited: boolean = false;
  savedSortEvent: any;
  loadingMessage: string;
  totalCount: number;
  searchValue: string = '';

  constructor(
    private dialog: MatDialog,
    private drawerService: FuseDrawerService,
    private fuseConfirmationService: FuseConfirmationService,
    private masterService: MasterService,
    private programmeTemplateService: ProgrammeTemplateService,
    private sortingService: SortingService,
    private uiService: UiService,
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

  ngOnInit(): void {
    this.getProgrammeTemplatesList();
  }

  async getProgrammeTemplatesList() {
    const programmeTemplates = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('PROGRAMME_TEMPLATE', 'programmeTemplates').pipe(first()));
    this.getProgramTemplateData(programmeTemplates);
  }

  getProgramTemplateData(data: Array<ProgrammeTemplate>) {
    this.programmeTemplateData = data.sort((x: any, y: any) => {
      if (y?.updatedAt === x?.updatedAt) {
        return y?.createdAt - x?.createdAt;
      }
      return y?.updatedAt - x?.updatedAt;
    });

    this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'updatedAt', 'desc') as Sort);

    this.programmeTemplateData.forEach(() => {
    });

    if (!this.hasBeenEdited) {
      this.programmeTemplateDataCopy = data;
      this.totalCount = data.length;
      this.loadingMessage = `Loaded ${this.programmeTemplateDataCopy.length} of ${this.totalCount} entries`;
    } else {
      this.programmeTemplateDataCopy = data;
      this.search(this.searchTerm);
    };
  }

  sortData(sort: Sort) {
    const labels = ['displayName', 'programmeName', 'programmeId', 'programmeStatus', 'programmeInstitution', 'updatedAt', 'createdAt', 'programmeGrades', 'programmeCode'];
    const defaultLabel = 'updatedAt';
    this.programmeTemplateData = this.sortingService.sortFunction(sort, labels, this.programmeTemplateData, defaultLabel);
    this.show = true;
  }

  search(event: Event | string) {
    const val = this.searchTerm = this.sortingService.checkType(event);
    if (val && val.trim() != '') {
      this.filteredPrograms = this.programmeTemplateDataCopy.filter(item => ((item?.templateName?.toLowerCase().includes(val.toLowerCase())) ||
          (item?.templateId?.toLowerCase().includes(val.toLowerCase())) ||
          (item?.displayName?.toLowerCase().includes(val.toLowerCase()))));
      this.programmeTemplateData = this.filteredPrograms;
      this.loadingMessage = `${this.filteredPrograms.length} search results found`;
    }
    else {
      this.programmeTemplateData = this.programmeTemplateDataCopy;
      this.loadingMessage = `Loaded ${this.programmeTemplateDataCopy.length} of ${this.totalCount} entries`;
    }
  }

  editProgramme(programmmeTemplate: ProgrammeTemplate) {
    this.selectedProgrammeOutput.emit(programmmeTemplate);
  }

  getGradeList() {
    this.programmeTemplateData.forEach((elm) => {
      if (elm.grade !== undefined) {
        elm['grade'] = elm.grade;
      }
    });
  }

  async toggleDetails(selectedProgrammeTemplate: any) {
    this.selectedProgrammeTemplateDetails = selectedProgrammeTemplate;
    const id = selectedProgrammeTemplate.templateId;
    if (this.selectedProgrammeTemplate?.templateId === id) {
      this.selectedProgrammeTemplate = '';
    }
    else {
      this.selectedProgrammeTemplate = selectedProgrammeTemplate;
    }
  }

  async openDialog() {
    await import('../programme-template-info/programme-template-info.component').then(() => {
      const dialogRef = this.dialog.open(ProgrammeTemplateInfoComponent, {
        data: {
          addNewTemplateFlag: true,
          allProgrammeTemplates: this.programmeTemplateData
        },
      });
      dialogRef.afterClosed().subscribe(() => {
        this.hasBeenEdited = true;
        this.search(this.searchTerm);
      });
    });
  }

  async deleteProgrammeTemplate(programmeTemplate: ProgrammeTemplate) {
    this.docTobeDeleted = [];
    this.selectedProgrammeTemplateId = programmeTemplate.templateId;
    const name = programmeTemplate?.templateName;
    const config = {
      title: 'Delete Programme Template',
      message: name.length > 13
        ? `<br><p class="">Are you sure you want to delete "${name.slice(0, 13)}..."?</p><br>
            <p class=" text-justify">On deleting this programme template, all teachers, students, and classrooms to which this programme template is assigned will be removed and lost forever.</p><br>
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
      if (result === 'confirmed') {
        this.deletingLoader = true;
        try {
          await this.masterService.deleteObjectFromMasterMap(programmeTemplate.masterDocId, 'programmeTemplates', programmeTemplate.templateId);
          await this.programmeTemplateService.toTrash(programmeTemplate.templateId, programmeTemplate);
          await this.programmeTemplateService.delete(programmeTemplate.templateId);
        } catch (error) {
          console.error('Error deleting programme templates: ', error);
        }
        // delete the programme from list and update search filter
        const index = this.programmeTemplateData.findIndex(res => res.docId === programmeTemplate.templateId);
        this.programmeTemplateData.splice(index, 1);
        this.search(this.searchTerm);
        this.deletingLoader = false;
        this.uiService.alertMessage('Deleted', `Programe Template "${name}" deleted successfully`, 'error');
      };
    });
  }

  async goToTrash() {
    await import('../../manage-trash-programme-templates/manage-trash-programme-templates.module').then(() => {
      this.component = ManageTrashProgrammeTemplatesComponent;
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
      this.selectedProgrammeTemplate = null;
      this.search(term);
    }
  }

}
