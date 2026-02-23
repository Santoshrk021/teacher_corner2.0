import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { MasterInstituteDoc } from 'app/core/dbOperations/master/master.types';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, Subject, first, lastValueFrom, take, takeUntil } from 'rxjs';
import { ManageTrashInstitutesComponent } from '../manage-trash-institutes/manage-trash-institutes.component';
import { Sort } from '@angular/material/sort';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { SortingService } from 'app/shared/sorting.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { ManageInstitutionComponent } from '../manage-institution/manage-institution.component';
import { environment } from 'environments/environment';
import { SharedService } from 'app/shared/shared.service';
import { Institution } from 'app/core/models/institution';
import { OneClickInstitution } from 'app/core/dbOperations/institutions/institution.type';

export interface finalObject {
  institution: Institution;
  operation: 'create' | 'update' | 'delete';
}

@Component({
  selector: 'app-institutions-list',
  templateUrl: './institutions-list.component.html',
  styleUrls: ['./institutions-list.component.scss']
})
export class InstitutionsListComponent implements OnInit, OnDestroy {
  filteredMasterData: any = [];
  allTeacherDocs;
  testProgrammes: any = [];
  programmesToTrash: any = [];
  startLoading: boolean = false;
  institutionTobeDeleted;
  institutions: any[];
  selectedInstitute: any;
  deleteLoader: boolean = false;
  genderTypes = ['Boys', 'Girls', 'Co-ed'];
  boardList;
  sampleInstitutions: any = [];
  typeofSchools: any = [];
  // typeofSchools = [
  //   'Private School', 'Private Residential School', 'Government School'
  //   , 'Government Aided School'
  //   , 'Government Residential School'];
  allStudents: any = [];
  instituteForm = this.fb.group({
    institutionName: ['', [Validators.required, Validators.pattern('[A-Za-z "\'\,]+[0-9]{0,2}')]],
    genderType: ['', Validators.required],
    board: [''],
    typeofSchool: [''],
    isCustomer: [false],
    medium: [null, [Validators.required]],
    // lastUsedDate: [''],
    registrationNumber: [null,
      [
        Validators.required, Validators.minLength(4),
        Validators.pattern('[A-Za-z0-9_-]+[0-9]{0,10}')
      ]
    ],
    institutionCreatorCountryCode: [''],
    institutionCreatorPhoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    representativeEmail: ['', [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
    representativeFirstName: [null, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
    representativeLastName: [null, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
    representativeCountryCode: [''],
    representativePhoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
    institutionAddress: this.fb.group({
      street: ['', Validators.required],
      city: ['', Validators.required],
      district: ['', Validators.required],
      state: ['', Validators.required],
      // pincode: ['', [Validators.required, Validators.pattern("^[0-9]{6}")]],
      pincode: ['', [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
      village: [''],
      subDistrict: [''],
      country: [''],
    }),

    docId: [''],
    isPartofChain: [false],
    chainName: ['', [Validators.required]],
    masterDocId: [''],
    verificationStatus: []
  });

  langList: any;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  unsubcription: any = [];
  initialValue: any;
  saveBtnDisable: boolean = true;
  component: any;
  drawerOpened: any = false;
  classroomsTotrash: any = [];
  isChainContainerActive: boolean = false;
  allChainInfo: any;
  createChainContainer: boolean = false;
  institutionsChainForm;
  show: boolean = false;
  screenWidth;
  screenHeight;
  allClassrooms: any = [];
  masterDocs = [];
  allMasterData;
  instituteId;
  selectedInstMasterFieldsValues: MasterInstituteDoc;
  instituteBsub = new BehaviorSubject(null);
  infinityScrollLocked: boolean = false;
  allInstMasterData: any[] = [];
  classroomsOfInst: any;
  masterClassrooms: any;
  programmesOfInst: any = [];
  searchTerm: string;
  isFirstTime: boolean = true;
  allTeachers: any = [];
  institutionProgrammes;
  savedSortEvent: any;
  isFirstTimeSorted: boolean = false;
  isScrollLoading: boolean = true;
  loadingMessage: string;
  totalCount: number;
  institutionDetails;
  teacherCountryCode: string;
  countryBoard: Array<any>;
  isAddNewBoard: boolean = false;
  internationalBoards: any;
  countryCodes: any;
  isLoaded: boolean = false;
  boardData: any;
  teacherCountry: string;
  searchValue: string = '';

  constructor(
    private institutionsService: InstitutionsService,
    private fb: FormBuilder,
    private configurationService: ConfigurationService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private drawerService: FuseDrawerService,
    public dialog: MatDialog,
    private masterService: MasterService,
    private httpClient: HttpClient,
    private afs: AngularFirestore,
    private _changeDetectorRef: ChangeDetectorRef,
    private classroomService: ClassroomsService,
    private programmeService: ProgrammeService,
    private teacherService: TeacherService,
    private studentService: StudentsService,
    private sortingService: SortingService,
    private afAuth: AngularFireAuth,
    private userService: UserService,
    private sharedService: SharedService,

  ) {
    this.drawerService.drawerOpenTrashInstitutesSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.drawerOpened = res;
      if (!res) {
        // this.isFirstTime = false;
        this.search(this.searchTerm);
      }
    });
  }

  ngOnDestroy(): void {
    this.unsubcription.forEach(e => e.unsubscribe());
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit() {
    this.getTypeOfInstitutions();
    this.getAllBoards();

    // get country details (board, country code, country)
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.instituteForm, this.isLoaded);
    [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

    this.instituteForm.get('institutionAddress.country').valueChanges.subscribe(async (res) => {
      if (res) {
        const internationalBoards = this.boardData?.boardsInternational;
        const country = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
        this.teacherCountry = country;
        this.countryBoard = internationalBoards?.[country];
        this.isAddNewBoard = false;
      }
    });

    this.getAllInstitutes();
    this.getInstituteMasterClassrooms('');

    this.configurationService.languageListSub.subscribe((d) => {
      if (d == null) {
        this.configurationService.getLanguageList('Languages');
      }
      this.langList = d;
    });

    this.configurationService.boardListSub.subscribe((res) => {
      this.boardList = res?.filter(e => e.code !== 'ICSE');
      if (res == null) {
        this.configurationService.getBoardList('BoardListAll');
      }
    });
    this.show = true;
  }



  getTypeOfInstitutions() {
    this.configurationService.getTypeOfInstitutionsByGet().subscribe((res) => {
      this.typeofSchools = res.data().names;
    });
  }

  @HostListener('window:resize', ['$event'])
  getScreenSize(event?: Event) {
    this.screenWidth = window.innerWidth;
    this.screenHeight = window.innerHeight;
  }

  async getInstituteProgrammes(docId) {
    if (docId) {
      return new Promise((resolve, reject) => {
        const sub = this.programmeService.getProgrammesByInsitituteId(docId).subscribe((data) => {
          this.programmesOfInst = data;
          resolve(data);
        });
        this.unsubcription.push(sub);
      });
    }
  }

  async getInstituteClassrooms(docId) {
    const query: QueryFn = (ref: CollectionReference) =>
      ref.where('institutionId', '==', docId);
    const sub = this.classroomService.getWithQuery(query).subscribe((data) => {
      this.classroomsOfInst = data;
    });
    this.unsubcription.push(sub);
  }

  async getInstituteMasterClassrooms(docId: any) {
    const sub = this.masterService.getAllMasterDocsMapAsArray('CLASSROOM', 'classrooms').pipe(take(1)).subscribe((res) => {
      this.masterDocs = res.map(e => e.docId);
      const allClassrooms = res.map((classroom) => {
        if (typeof classroom === 'object' && classroom !== null) {
          return { ...classroom, viewProgrammes: this.getProgrammeNames(classroom) };
        }
        return classroom;
      });
      this.masterClassrooms = allClassrooms.sort((x, y) => y.creationDate - x.creationDate);
    });
    this.unsubcription.push(sub);
  }

  getProgrammeNames(cls: any) {
    if (cls?.programmes) {
      return Object.values(cls.programmes).map((prog: any) => prog.programmeName).join(', ');
    } else {
      console.error(`Classroom "${cls?.docId ?? cls?.id}" in "${cls?.masterDocId}" does not have programmes`);
      return '';
    }
  }

  async removeProgrammeWorkflowIds(programmes: any) {
    for (const programmeId in programmes) {
      if (programmes[programmeId].hasOwnProperty('workflowIds')) {
        delete programmes[programmeId].workflowIds;
        delete programmes[programmeId].sequentiallyLocked;
      }
    }
    return programmes;
  }

  removeDuplicates(arr) {
    return arr.filter((value, index, self) => self.indexOf(value) === index);
  }

  async getAllInstitutes() {
    this.masterService.getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames').pipe(take(1)).subscribe(async (res) => {
      const allSchools = res;
      this.totalCount = allSchools.length;
      this.allInstMasterData = allSchools;
      this.institutions = allSchools;
      this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'creationDate', 'desc') as Sort);
      this.instituteBsub.next(this.institutions);
      if (this.isFirstTime) {
        this.institutions = this.institutions.slice(0, 30);
        this.loadingMessage = `Loaded ${this.institutions?.length} of ${this.totalCount} entries`;
      } else {
        this.search(this.searchTerm);
        this.loadingMessage = `${this.institutions?.length} search results found`;
      }
      this.isScrollLoading = false;
    });
  }

  async toggleDetails(institute) {
    const countryCode = institute?.representativeCountryCode;
    const countryName = this.configurationService.getCountryNameFromCode(countryCode).pipe(first());
    const country = await lastValueFrom(countryName);
    let typeofSc = '';
    const instituteDetails: any = await this.institutionsService.getClassroomDataById(institute.docId);
    this.institutionDetails = instituteDetails;
    institute = Object.assign(instituteDetails, institute);
    const id = institute.docId;
    this.instituteId = id;

    this.institutionProgrammes = await this.getInstituteProgrammes(id);
    this.getInstituteClassrooms(id);
    if (this.selectedInstitute?.docId === id) {
      this.selectedInstitute = '';
    }
    else {
      this.selectedInstitute = institute;
      if (institute.typeofSchool) {
        typeofSc = institute.typeofSchool;
      }

      const isCustomerValue = typeof institute?.isCustomer === 'boolean' ? institute.isCustomer : false;
      this.instituteForm.patchValue({
        institutionName: institute?.institutionName || '',
        genderType: institute?.genderType || '',
        medium: institute?.medium || '',
        board: institute?.board || '',
        typeofSchool: typeofSc,
        isCustomer: isCustomerValue,
        registrationNumber: institute?.registrationNumber || '',
        representativeEmail: institute?.representativeEmail || '',
        representativeFirstName: institute?.representativeFirstName || '',
        representativeLastName: institute?.representativeLastName || '',
        representativeCountryCode: institute?.representativeCountryCode || '',
        representativePhoneNumber: institute?.representativePhoneNumber || '',
        docId: institute?.docId,
        isPartofChain: institute.isPartofChain || false,
        chainName: institute.chainName || '',
        verificationStatus: institute?.verificationStatus,
        masterDocId: institute.masterDocId
      });

      this.instituteForm.get('institutionAddress').patchValue({
        city: institute?.institutionAddress?.city || '',
        district: institute?.institutionAddress?.district || '',
        pincode: institute?.institutionAddress?.pincode || '',
        state: institute?.institutionAddress?.state || '',
        street: institute?.institutionAddress?.street || '',
        village: institute?.institutionAddress?.village || '',
        subDistrict: institute?.institutionAddress?.subDistrict || '',
        country: country || '',
      });

      this.initialValue = this.instituteForm.value;
      if (institute.isPartofChain) {
        this.isChainContainerActive = true;
        this.getAllChainInfo();
      }

      /* Master inst fields */
      this.selectedInstMasterFieldsValues = this.getMasterInstFiledsVaules(institute);
    }
  }

  async getClasses(clas) {

  }

  async formSubmit(form) {
    const formData: any = form.value;
    formData['institutionAddress']['pincode'] = formData['institutionAddress']['pincode'].toString().trim();

    try {
      const changesInstDetails = this.getMasterInstFiledsVaules(formData);
      /* Update into Master Inst doc */
      if (JSON.stringify(changesInstDetails) != JSON.stringify(this.selectedInstMasterFieldsValues)) {
        const masterInstituteDoc = this.allInstMasterData;//.filter(x => delete x.institutionCreator)
        const indexNum = masterInstituteDoc.findIndex(instDoc => instDoc.docId == formData.docId);
        if (masterInstituteDoc[indexNum]) {
          masterInstituteDoc[indexNum] = Object.assign({}, masterInstituteDoc[indexNum], changesInstDetails);
        }

        this.startLoading = true;
        this.updateInstituteClassrooms(formData.institutionName);
        this.updateInstituteProgrammes(formData.institutionName);
        // this.updateInstituteMasterClassrooms(formData.institutionName)
        this.getInstituteClassrooms(this.instituteId);
        this.getInstituteProgrammes(this.instituteId);
        this.getInstituteMasterClassrooms(this.instituteId);
        this.updateMasterInstitution(formData);

        this.isFirstTime = false;
        this.filteredMasterData = [];
      }

      await this.institutionsService.update(formData, formData.docId);
      this.uiService.alertMessage('Successful', 'Institution information updated successfully', 'success');
      this.saveBtnDisable = true;
      this.initialValue = formData;
      // this.selectedInstitute = null;
      this.search(this.searchTerm);
      this.startLoading = false;
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error updating information', 'error');
      console.error('Error updating information: ', error);
    }
  }

  async updateInstituteProgrammes(d: string) {
    this.programmesOfInst = this.programmesOfInst.forEach((programme: any) => {
      const updatedProgrammeName = programme.programmeName.replace(programme.institutionName, d);
      const updatedDisplayName = programme.displayName.replace(programme.institutionName, d);
      programme.programmeName = updatedProgrammeName;
      programme.displayName = updatedDisplayName;
      programme.institutionName = d;
      this.programmeService.updateProgramme(programme);
      this.masterService.updateMasterDocField(programme.masterDocId, programme.docId, 'programmes', 'institutionName', programme.institutionName);
      this.masterService.updateMasterDocField(programme.masterDocId, programme.docId, 'programmes', 'programmeName', programme.programmeName);
      this.masterService.updateMasterDocField(programme.masterDocId, programme.docId, 'programmes', 'displayName', programme.displayName);
    });
  }

  async updateInstituteClassrooms(d: string) {
    this.classroomsOfInst = this.classroomsOfInst.forEach((classroom: any) => {
      for (const programmeId in classroom.programmes) {
        const programme = classroom.programmes[programmeId];
        const updatedProgrammeName = programme.programmeName.replace(classroom.institutionName, d);
        this.masterService.updateMasterDocField(classroom.masterDocId, classroom.docId, 'classrooms', `programmes.${programmeId}.programmeName`, updatedProgrammeName);
        programme.programmeName = updatedProgrammeName;
        const updatedDisplayName = programme.displayName.replace(classroom.institutionName, d);
        this.masterService.updateMasterDocField(classroom.masterDocId, classroom.docId, 'classrooms', `programmes.${programmeId}.displayName`, updatedDisplayName);
        programme.displayName = updatedDisplayName;
      }
      classroom.institutionName = d;
      this.classroomService.update(classroom, classroom.docId);
      this.masterService.updateMasterDocField(classroom.masterDocId, classroom.docId, 'classrooms', 'institutionName', classroom.institutionName);
      this.updateTeacherInstitutions(this.classroomsOfInst, classroom.institutionName);
    });
  }

  /*
  async updateInstituteMasterClassrooms(d) {
    let docTobeUpdated = []
    const masterdoc = this.masterClassrooms
    const filterData = masterdoc.filter((el) => el.institutionId == this.instituteId).map(cls => ({ ...cls, institutionName: d }))
    this.filteredMasterData = filterData
    filterData.forEach((elm) => {
      const indexNum = masterdoc.findIndex(doc => doc.docId == elm.docId);
      masterdoc[indexNum] = Object.assign(masterdoc[indexNum], elm);
      docTobeUpdated.push(masterdoc[indexNum].masterDocId);
    })
    let finalDocTobeUpdated = this.removeDuplicates(docTobeUpdated)
    finalDocTobeUpdated.forEach((masterDoc) => {
      const filterMasterData = masterdoc.filter(doc => doc.masterDocId == masterDoc && (doc.type === 'CLASSROOM' || doc.type === 'STEM-CLUB'))
        .map(cls => ({
          docId: cls?.docId || '',
          classroomId: cls.classroomId,
          institutionId: cls?.institutionId,
          institutionName: cls?.institutionName,
          creationDate: cls?.creationDate || cls?.createdAt,
          programmes: cls?.programmes || {},
          updatedAt: cls.updatedAt || cls?.creationDate || cls?.createdAt,
          board: cls.board,
          type: cls.type,
          ...(cls.type === 'CLASSROOM' ? {
            classroomName: cls.classroomName,
            grade: cls?.grade,
            section: cls.section
          } : {
            stemClubName: cls.stemClubName
          })
        }));
      this.masterService.updateMasterDoc('classrooms', masterDoc, filterMasterData)
    })
    this.updateTeacherInstitute(this.filteredMasterData, d)
    this.filteredMasterData = []
  }
  */

  async updateTeacherInstitutions(fitlerdClassrooms: any, updatedInstitutionName: string) {
    const classrms = fitlerdClassrooms.map((classroom: any) => classroom.classroomId);
    const teacherTobeUpdated = [];
    const docArr = this.teacherService.getTeacherDocsByInstitution(classrms, this.instituteId);
    (await docArr).forEach((teacherDoc) => {
      teacherDoc.pipe(takeUntil(this._unsubscribeAll)).subscribe((te) => {
        const teachers = te.map(doc => ({ id: doc.payload.doc.id, ...doc.payload.doc.data() }));
        teachers.forEach((teacher) => {
          if (!teacherTobeUpdated.includes(teacher.id)) {
            teacherTobeUpdated.push(teacher.id);
            classrms.forEach((clas) => {
              const claskeys = Object.keys(teacher.classrooms);
              const matchingKeys = claskeys.filter(e => e == clas);
              if (teacher.classrooms[matchingKeys[0]]) {
                for (const programme of teacher.classrooms[matchingKeys[0]].programmes) {
                  const updatedProgrammeName = programme.programmeName.replace(teacher.classrooms[matchingKeys[0]].institutionName, updatedInstitutionName);
                  programme.programmeName = updatedProgrammeName;
                  const updatedDisplayName = programme.displayName.replace(teacher.classrooms[matchingKeys[0]].institutionName, updatedInstitutionName);
                  programme.displayName = updatedDisplayName;
                };
                teacher.classrooms[matchingKeys[0]].institutionName = updatedInstitutionName;
              }
            });
            const updatedT = {
              docId: teacher?.docId || '',
              classrooms: teacher?.classrooms,
              teacherMeta: teacher?.teacherMeta,
            };
            this.teacherService.updateTeacher(updatedT, updatedT.docId);
          }
        });
      });
    });

    this.updateStudentInstitutions(fitlerdClassrooms, updatedInstitutionName);
  }

  async updateStudentInstitutions(filteredData: any, updatedInstituteValue: string) {
    const classrms = filteredData.map(classrms => classrms.classroomId);
    const studentsTobeUpdated = [];
    const docArr = this.studentService.getAllStudentDocsByInstitution(classrms, this.instituteId);
    (await docArr).forEach((studentDoc) => {
      studentDoc.pipe(takeUntil(this._unsubscribeAll)).subscribe((te) => {
        const students = te.map(doc => ({ id: doc.payload.doc.id, ...doc.payload.doc.data() }));
        students.forEach((student) => {
          if (!studentsTobeUpdated.includes(student.id)) {
            studentsTobeUpdated.push(student.id);
            classrms.forEach((clas) => {
              const claskeys = Object.keys(student.classrooms);
              const matchingKeys = claskeys.filter(e => e == clas);
              if (student.classrooms[matchingKeys[0]]) {
                for (const programme of student.classrooms[matchingKeys[0]].programmes) {
                  const updatedProgrammeName = programme.programmeName.replace(student.classrooms[matchingKeys[0]].institutionName, updatedInstituteValue);
                  programme.programmeName = updatedProgrammeName;
                  const updatedDisplayName = programme.displayName.replace(student.classrooms[matchingKeys[0]].institutionName, updatedInstituteValue);
                  programme.displayName = updatedDisplayName;
                };
                student.classrooms[matchingKeys[0]].institutionName = updatedInstituteValue;
              }
            });
            const updatedT = {
              docId: student?.docId || '',
              classrooms: student?.classrooms,
              linkUid: student?.linkUid,
              studentMeta: student?.studentMeta,
            };
            this.studentService.updateStudent(updatedT, updatedT.docId);
          }
        });
      });
    });
  }

  async updateMasterInstitution(selectedInstitute: any) {
    const {
      board,
      docId,
      institutionName,
      masterDocId,
      registrationNumber,
      representativeCountryCode,
      representativeEmail,
      representativeFirstName,
      representativeLastName,
      representativePhoneNumber,
      typeofSchool,
      isCustomer,
    } = selectedInstitute;
    const pincode = selectedInstitute.institutionAddress.pincode;
    const representativeName = `${representativeFirstName} ${representativeLastName}`;

    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'board', board);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'institutionName', institutionName);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'pincode', pincode);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'registrationNumber', registrationNumber);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'representativeCountryCode', representativeCountryCode);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'representativeEmail', representativeEmail);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'representativeName', representativeName);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'representativePhoneNumber', representativePhoneNumber);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'typeofSchool', typeofSchool);
    this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'isCustomer', !!isCustomer);
    const matchingInstitutionIndex = this.institutions.findIndex(inst => inst.docId === docId);
    this.institutions[matchingInstitutionIndex].board = board;
    this.institutions[matchingInstitutionIndex].institutionName = institutionName;
    this.institutions[matchingInstitutionIndex].pincode = pincode;
    this.institutions[matchingInstitutionIndex].registrationNumber = registrationNumber;
    this.institutions[matchingInstitutionIndex].representativeCountryCode = representativeCountryCode;
    this.institutions[matchingInstitutionIndex].representativeEmail = representativeEmail;
    this.institutions[matchingInstitutionIndex].representativeName = representativeName;
    this.institutions[matchingInstitutionIndex].representativePhoneNumber = representativePhoneNumber;
    this.institutions[matchingInstitutionIndex].typeofSchool = typeofSchool;
    this.institutions[matchingInstitutionIndex].isCustomer = !!isCustomer;
  }

  async verificationToggle(e: MatSlideToggleChange, selectedInstitute) {
    const masterInstituteDoc = this.allInstMasterData;
    const indexNum = masterInstituteDoc.findIndex(instDoc => instDoc.docId == selectedInstitute.docId);
    const { docId, masterDocId } = selectedInstitute;
    try {
      await this.institutionsService.update({ verificationStatus: e.checked }, docId);
      await this.masterService.updateMasterDocField(masterDocId, docId, 'institutionNames', 'verificationStatus', e.checked);
      this.uiService.alertMessage('Successful', 'Verification status updated successfully', 'success');
    } catch (error) {
      console.error('Error updating verification status: ', error);
      this.uiService.alertMessage('Error', 'Error updating verification status', 'error');
    };
  }

  getMasterInstFiledsVaules(institute) {
    const masterDoc = {
      docId: institute?.docId,
      board: institute?.board || '', /* Board Code */
      institutionName: institute?.institutionName || '',
      institutionCreatorCountryCode: institute?.institutionCreatorCountryCode || '',
      institutionCreatorPhoneNumber: institute?.institutionCreatorPhoneNumber || '',
      institutionCreatorName: institute?.institutionCreatorName || '',
      institutionCreatorEmail: institute?.institutionCreatorEmail || '',
      registrationNumber: institute?.registrationNumber || '',
      representativeFirstName: institute?.representativeFirstName || '',
      representativeLastName: institute?.representativeLastName || '',
      representativeCountryCode: institute?.representativeCountryCode || '',
      representativePhoneNumber: institute?.representativePhoneNumber || '',
      representativeEmail: institute?.representativeEmail || '',
      pincode: institute?.institutionAddress?.pincode || 0,
      verificationStatus: institute?.verificationStatus || false,
      typeofSchool: institute?.typeofSchool || '',
      isCustomer: typeof institute?.isCustomer === 'boolean' ? institute.isCustomer : false,
    };
    return masterDoc;
  }

  updateInstitutesOnEdit(docId, newValue) {
    const index = this.institutions.findIndex(d => d.docId == docId);
    this.institutions[index] = newValue;
  }

  async onDeleteInstitute(instituteInfo) {
    this.institutionTobeDeleted = instituteInfo;
    const name = instituteInfo.institutionName.slice(0, 10);
    const config = {
      title: 'Delete Institute',
      message: `Are you sure you want to delete "${name}..." ?`,
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    const instituteDetails = await this.institutionsService.getClassroomDataById(instituteInfo.docId);
    instituteInfo = instituteDetails ? Object.assign(instituteDetails, instituteInfo) : instituteInfo;
    this.getInstituteProgrammes(instituteInfo.institutionId);

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        this.deleteLoader = true;
        // const finalObject: finalObject = {
        //   institution: instituteInfo,
        //   operation: "delete",
        // };
        const finalObject: OneClickInstitution = {
          institution: instituteInfo,
          operation: 'delete',
          classrooms: {
            classInfoArray: []
          },
          defaultWorkflowTemplate: undefined,
          programmeTemplates: [],
          createdSource: 'one-click-institution-classroom-programme-creation',
          component: 'InstitutionsListComponent'
        };

        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/manage_one_click_institution`;
        // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/manage_one_click_institution`;

        try {
          await this.sharedService.sendToCloudFunction(endUrl, finalObject);
          this.uiService.alertMessage('Successful', 'Institution deletion successfully complete', 'success');
          this.institutions = this.institutions.filter(institution => institution.docId !== instituteInfo.docId);
          this.loadingMessage = `${this.institutions?.length} search results found`;
        } catch (error) {
          console.error('manage_one_click_institution - delete error: ', error);
          this.uiService.alertMessage('Deleted', 'Error deleting institution', 'error');
        } finally {
          this.deleteLoader = false;
        };
      }
    });
  }

  async deleteinstfromTeacher(id) {
    const query: QueryFn = (ref: CollectionReference) => ref.where('institutionId', '==', id);
    const queriedClassroomsPromise = lastValueFrom(this.classroomService.getWithQuery(query));
    const queriedClassrooms = await queriedClassroomsPromise;
    const classroomsTobeupdated = queriedClassrooms.map(d => d.classroomId);
    const allteachersTobeupdated = this.teacherService.getAllteacherdocs('', classroomsTobeupdated, '');
    const teacherTobeUpdated = [];
    (await allteachersTobeupdated).forEach((teacherDoc) => {
      teacherDoc.pipe(takeUntil(this._unsubscribeAll)).subscribe((te) => {
        const teachers = te.map(doc => ({ id: doc.payload.doc.id, ...doc.payload.doc.data() }));
        teachers.forEach((teacher) => {
          if (!teacherTobeUpdated.includes(teacher.id)) {
            teacherTobeUpdated.push(teacher.id);
            classroomsTobeupdated.forEach((clas) => {
              const claskeys = Object.keys(teacher.classrooms);
              const matchingKeys = claskeys.filter(e => e == clas);
              if (teacher.classrooms[matchingKeys[0]]) {
                // teacher.classrooms[matchingKeys[0]].institutionName ='deleted'
                delete teacher?.classrooms[matchingKeys[0]];
              }
            });
            const updatedT = {
              docId: teacher?.docId || '',
              classrooms: teacher?.classrooms,
              teacherMeta: teacher?.teacherMeta,
            };
            this.teacherService.setTeacher(updatedT.docId, updatedT);
          }
        });
      });
    });
  }

  async deleteinstfromstudentcoll(id) {
    const query: QueryFn = (ref: CollectionReference) => ref.where('institutionId', '==', id);
    const queriedClassroomsPromise = lastValueFrom(this.classroomService.getWithQuery(query));
    const queriedClassrooms = await queriedClassroomsPromise;
    const classroomsTobeupdated = queriedClassrooms.map(d => d.classroomId);
    const allstudentsTobeupdated = this.studentService.getAllStudentDocsByClassroom(classroomsTobeupdated);
    const studentTobeUpdated = [];
    (await allstudentsTobeupdated).forEach((studentDoc) => {
      studentDoc.pipe(takeUntil(this._unsubscribeAll)).subscribe((te) => {
        const students = te.map(doc => ({ id: doc.payload.doc.id, ...doc.payload.doc.data() }));
        students.forEach((student) => {
          if (!studentTobeUpdated.includes(student.id)) {
            studentTobeUpdated.push(student.id);
            classroomsTobeupdated.forEach((clas) => {
              const claskeys = Object.keys(student.classrooms);
              const matchingKeys = claskeys.filter(e => e == clas);
              if (student.classrooms[matchingKeys[0]]) {
                // student.classrooms[matchingKeys[0]].institutionName ='deleted'
                delete student?.classrooms[matchingKeys[0]];
              }
            });
            const updatedT = {
              docId: student?.docId || '',
              classrooms: student?.classrooms,
              linkUid: student?.linkUid,
              studentMeta: student?.studentMeta,
            };
            this.studentService.setStudent(updatedT.docId, updatedT);
          }
        });
      });
    });
  }

  async deleteInstitutioninClassroom(institutionId) {
    const query: QueryFn = (ref: CollectionReference) => ref.where('institutionId', '==', institutionId);
    const queriedClassroomsPromise = lastValueFrom(this.classroomService.getWithQuery(query));
    const queriedClassrooms = await queriedClassroomsPromise;

    if (queriedClassrooms.length) {
      queriedClassrooms.forEach(async (cls) => {
        this.classroomService.delete(cls.docId);
      });
    }
  }

  async deleteProgramsLinkedwithInst(id) {
    const prIdsTobedel = this.programmesOfInst.map(e => e.programmeId);
    this.programmesToTrash = this.programmesOfInst;
    prIdsTobedel.forEach((prid) => {
      this.programmeService.delete(prid);
    });
  }

  sendClassroomsTotrash() {
    this.classroomsTotrash.forEach((cls) => {
      this.classroomService.toTrash(cls.docId, cls);
    });
  }

  sendProgrammesToTrash() {
    this.programmesToTrash.forEach((pr) => {
      this.programmeService.toTrash(pr.docId, pr);
    });
  }

  async updateTeacherStudentInfo(institutionId) {
    const query: QueryFn = (ref: CollectionReference) => ref.where('institutionId', '==', institutionId);
    const queriedClassroomsPromise = lastValueFrom(this.classroomService.getWithQuery(query));
    const queriedClassrooms = await queriedClassroomsPromise;
    if (queriedClassrooms.length) {
      queriedClassrooms.forEach(async (cls) => {
        const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${cls.docId}.institutionId`, '==', institutionId);
        const doc = await this.teacherService.getWithQuery(query);
        doc.pipe(take(1)).subscribe((res) => {
          if (res.length) {
            res.forEach((teacherDoc) => {
              delete teacherDoc?.classrooms[cls.docId];
              this.teacherService.setTeacher(teacherDoc.docId, teacherDoc);

            });
          }

        });

        const studentDoc = await this.studentService.getWithQuery(query);
        studentDoc.pipe(take(1)).subscribe((res) => {
          if (res) {
            res.forEach((studentDoc) => {
              delete studentDoc?.classrooms[cls.docId];
              this.studentService.setStudent(studentDoc.docId, studentDoc);
            });
          }
        });
      });
    }
  }

  async goToTrash() {
    await import('../manage-trash-institutes/manage-trash-institutes.module').then(() => {
      this.component = ManageTrashInstitutesComponent;
      this.drawerService.drawerOpenTrashInstitutesSubject.next(true);
    });
  }

  async addInstitute() {
    await import('../manage-institution/manage-institution.module').then(() => {
      const dialogRef = this.dialog.open(ManageInstitutionComponent, {
        data: {
          parent: 'institutions-list',
        }
      });

    });
  }

  toggleChain(event) {
    if (event.checked) {
      this.isChainContainerActive = true;
      this.getAllChainInfo();
      this.instituteForm.patchValue({
        isPartofChain: true
      });
    }
    else {
      this.isChainContainerActive = false;
      this.instituteForm.patchValue({
        isPartofChain: false
      });
    }
  }

  getAllChainInfo() {
    this.configurationService.chainSub.subscribe((res) => {
      if (res == null) {
        this.configurationService.getInstitutesChainInfo();
      }
      else {
        this.allChainInfo = res;
      }
    });
  }

  createChain() {
    this.createChainContainer = true;
    this.institutionsChainForm = this.fb.group({
      chainName: ['', [Validators.required]],
      chainAbbreviation: ['', [Validators.required]],
      headOfficePhone: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      headOfficeEmail: ['', [Validators.email]],
      headOfficeAddress: this.fb.group({
        street: [''],
        city: [''],
        district: [''],
        state: [''],
        // pincode: ['', [Validators.required, Validators.pattern("^[0-9]{6}")]],
        pincode: ['', [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
        village: [''],
        subDistrict: ['']
      }),
    });
  }

  institutionsFormSubmit(form) {
    const arr: any[] = this.allChainInfo.push(form.value);
    const value = {
      chainsInfo: this.allChainInfo
    };
    this.configurationService.setInstitutesChainInfo(value).then(() => {
      this.uiService.alertMessage('Successful', 'Chain Created Successfully', 'success');
      this.institutionsChainForm.reset();
      this.createChainContainer = false;
    });
  }

  async chaninPinCodeChange() {
    const value = this.institutionsChainForm.get('headOfficeAddress.pincode').value;
    if (value > 99999) {
      const locationInfo = await this.getInfoFromPin(value);
      this.institutionsChainForm.get('headOfficeAddress').patchValue({
        village: locationInfo?.Name || '',
        city: locationInfo?.Block || '',
        subDistrict: locationInfo?.Block || '',
        district: locationInfo?.District || '',
        state: locationInfo?.State || '',
      });
    }
  }

  async getInfoFromPin(pin) {
    const doc = this.httpClient.get(`https://api.postalpincode.in/pincode/${pin}`);
    const ref = lastValueFrom(doc);
    const value = await ref;
    return value[0].PostOffice[0];
  }

  async onScroll(event: any) {
    if (!this.infinityScrollLocked) {
      this.isScrollLoading = true;
      this.instituteBsub.subscribe((res) => {
        this.institutions = res.slice(0, this.institutions.length + 10);
        const rows = document.getElementsByClassName('inventory-grid grid items-center text-secondary gap-4 py-3 px-10 md:px-8 border-b border-gray-400 ng-star-inserted');
        const firstId = rows[0].getAttribute('id');
        const lastId = rows[rows.length - 1].getAttribute('id');
        this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'creationDate', 'desc') as Sort);
        this.isScrollLoading = false;
        this.loadingMessage = `Loaded ${this.institutions.length} of ${this.totalCount} entries`;
      });
    }
  }

  search(event: Event | string) {
    const val = this.searchTerm = this.sortingService.checkType(event);
    if (val !== undefined && val != '') {
      if (val && val.trim() != '') {
        this.infinityScrollLocked = true;
        this.institutions = this.instituteBsub?.value?.filter(item => ((item?.institutionName?.length >= 1 && item?.institutionName?.toLowerCase()?.includes(val?.toLowerCase())
          || (item?.registrationNumber?.length >= 1 && item?.registrationNumber?.toString()?.toLowerCase()?.includes(val?.toLowerCase()))
          || (item?.representativeFirstName?.length >= 1 && item?.representativeLastName?.length >= 1 && (item?.representativeFirstName?.toLowerCase() + ' ' + item?.representativeLastName?.toLowerCase())?.includes(val?.toLowerCase()))
          || ((item?.representativeCountryCode + item?.representativePhoneNumber) && (item?.representativeCountryCode + item?.representativePhoneNumber)?.includes(val?.toLowerCase()))
          || (item?.docId?.length >= 1 && item?.docId?.toLowerCase()?.includes(val?.toLowerCase()))
        )));
      }
      this.loadingMessage = `${this.institutions?.length} search results found`;
    }
    else {
      if (this.isFirstTime) {
        this.infinityScrollLocked = false;
        this.institutions = this.instituteBsub.value?.slice(0, 10);
      }
      this.loadingMessage = `Loaded ${this.institutions?.length} of ${this.totalCount} entries`;
    }
  }

  sortData(sort: Sort) {
    const labels = ['institutionName', 'typeofSchool', 'registrationNumber', 'representativeName', 'representativePhoneNumber', 'institutionCreatorName', 'board', 'pincode', 'creationDate', 'verificationStatus'];
    const defaultLabel = 'creationDate';
    this.savedSortEvent = sort;
    this.institutions = this.sortingService.sortFunction(sort, labels, this.institutions, defaultLabel);
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

  copyToClipboardDate(d) {
    const dateInMilliseconds = d.seconds * 1000 + Math.floor(d.nanoseconds / 1e6);
    const formattedDate = new Date(dateInMilliseconds).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    navigator.clipboard.writeText(formattedDate).then(() => {
      console.info('Copied to clipboard:', formattedDate);
    }).catch((error) => {
      console.error('Failed to copy:', error);
    });
  }

  async getCountryCodesList() {
    const configCodes = this.configurationService.getTeacherCornerConfigurations().pipe(first());
    const getCountryCodesList = await lastValueFrom(configCodes);
    const countryCodes = this.countryCodes = getCountryCodesList?.countryCodes;
    return countryCodes;
  }

  getBoardNameFromCode(boardCode: string) {
    return Object?.values(this.internationalBoards)?.flat(Infinity)?.filter((x: any) => x?.code === boardCode)?.[0]?.['name'];
  }

  async getAllBoards() {
    // get international boards list
    const configBoards = this.configurationService.getInternationalBoardList().pipe(first());
    const boards = await lastValueFrom(configBoards);
    this.internationalBoards = boards?.boardsInternational;
  }

  disableSaveTabForm(fields: Array<string>, formName: 'basic' | 'address' | 'chain' | 'nochain' | 'board') {
    let form: any;
    let selectedField: any;
    switch (formName) {
      case 'basic':
        form = this.instituteForm;
        selectedField = this.initialValue;
        break;
      case 'address':
        form = this.instituteForm.controls.institutionAddress;
        selectedField = this.initialValue?.institutionAddress;
        break;
      case 'chain':
        form = this.institutionsChainForm;
        selectedField = selectedField;
        break;
      case 'nochain':
        form = this.instituteForm;
        selectedField = this.initialValue;
        break;
      case 'board':
        form = this.instituteForm;
        selectedField = this.initialValue;
      default:
        break;
    }
    // disables the save button until all the fields in the form are valid
    const statusInvalid = fields?.some(control => form?.get(control)?.invalid);
    // disabled the save button until a field value is changed (comparing with initial value)
    const statusChanged = fields?.every(field => {
      const formValue = form.get(field)?.value;
      const initialValue = selectedField?.[field];

      if (field === 'representativePhone') {
        return initialValue?.slice(-10) === formValue;
      }
      if (field === 'isCustomer') {
        // Handle boolean comparison properly
        const formBool = formValue === true;
        const initialBool = initialValue === true;
        return formBool === initialBool;
      }
      return initialValue === formValue;
    });
    return statusInvalid || statusChanged;
  }

  async saveNewBoard() {
    const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.instituteForm, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
    [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
  }

  getRepresentativeName(institute: any): string {
    if (institute?.representativeName?.length) {
      return institute.representativeName;
    }
    if (institute?.representativeFirstName?.length) {
      return `${institute.representativeFirstName} ${institute.representativeLastName || ''}`.trim();
    }
    return 'Not Available';
  }

  getRepresentativePhone(institute: any): string {
    if (institute?.representativePhoneNumber?.length) {
      return `${institute.representativeCountryCode || ''}${institute.representativePhoneNumber}`;
    }
    return institute?.representativePhone?.length ? institute.representativePhone : 'Not Available';
  }

  getInstitutionCreatorName(institute: any): string {
    if (!institute?.institutionCreatorName) {
      return 'Not Available';
    }
    if (institute.institutionCreatorName === ' ') {
      return 'Imported';
    }
    return institute.institutionCreatorName;
  }

  isNotAvailable(value: string): boolean {
    return value === 'Not Available';
  }

  isImported(value: string): boolean {
    return value === 'Imported';
  }

}
