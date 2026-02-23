import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { QueryFn, CollectionReference, AngularFirestore } from '@angular/fire/compat/firestore';
import { deleteField, Timestamp } from '@angular/fire/firestore';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { fuseAnimations } from '@fuse/animations';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { BehaviorSubject, first, firstValueFrom, lastValueFrom, Subject, Subscription, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-add-stem-club-students',
  templateUrl: './add-stem-club-students.component.html',
  styleUrls: ['./add-stem-club-students.component.scss'],
  animations: fuseAnimations
})
export class AddStemClubStudentsComponent implements OnInit {
  @ViewChild('studentFileInputRef') studentFileInputRef: ElementRef;

  @Input() stepper: MatStepper;
  @Input() selectedClassroomsSub: BehaviorSubject<any>;
  @Input() instititutionSubRef: BehaviorSubject<any>;
  @Input() index: any;
  @Input() country: string;
  @Input() accessLevel: number | string;
  @Input() loggedInTeacher: any

  loading = false;
  isActive = false;
  classrooms: any = [];
  userForm: FormGroup;
  subscriptionRef: Subscription[] = [];
  isBulkUpload: boolean = false;
  filename: any;
  isActiveloader: boolean = false;
  selectCls;
  studentsJson;
  studentInputFile;
  isFormValid = false;
  allClasses: any;
  isCollapseActive = false;
  gradeList;
  currentGrade = {};
  uploading = false;
  studentDoc: {};
  infoLoaded = false;
  classClone = [];
  selectedGrade;
  selectedSection;
  deleteButtonIsActive = [];
  allClsRooms: any[] = [];
  registeredClsIds: string[] = [];
  selectedClsIds: string[] = [];
  studentArr: any;
  multipleStudents = false;
  isUserTobeCreated = false;
  showEmailDiv = false;
  isProfileAutoSelected = false;
  isClassButtonActive = false;
  isWANotificationsDisabled: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  countryCode: string;
  logfileDownload: boolean = false;
  usersLogArr: any[] = [];
  stemClubs = [];
  allStemclubs: any;
  selectedStemClubName: any;
  stemclubsClone: any;
  stemclubList: Array<string> = [];
  stemClubTobeFitlerd: any = [];
  allStemClubsClone = [];
  isLoaded: boolean = false;
  addButtonDisabled: boolean;
  removeAddbutton: boolean;
  genderList = [];
  generalContests = [];
  selectContest: any;
  isContestRegistrationRequired: boolean = true;
  Contest: any;
  finalContestsLst = [];
  classroomStemClubdependentContests = [];
  selectedContests: any[] = [];


  constructor(
    private classroomService: ClassroomsService,
    private httpClient: HttpClient,
    private uiService: UiService,
    private studentService: StudentsService,
    private fb: FormBuilder,
    private configurationService: ConfigurationService,
    private sharedService: SharedService,
    private afs: AngularFirestore,
    private teacherService: TeacherService,
    private contestService: ContestService,
    private afAuth: AngularFireAuth,
    private userService: UserService,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.index) {
      if (this.index == 4) {
        if (this.stemclubsInfo()) {
          this.stemclubsInfo().controls = [];
          this.stemClubTobeFitlerd = [];
          this.userForm.get('fName').markAsUntouched();
          this.userForm.get('fName').disable();
          this.userForm.get('email').markAsUntouched();
          this.userForm.get('email').disable();
          this.userForm.get('lName').markAsUntouched();
          this.userForm.get('lName').disable();
          this.userForm.get('age').markAsUntouched();
          this.userForm.get('age').disable();
          this.userForm.get('grade').markAsUntouched();
          this.userForm.get('grade').disable();
          this.userForm.controls['lName'].setValue('');
          this.userForm.controls['lName'].setErrors(null);
          this.userForm.controls['fName'].setValue('');
          this.userForm.controls['fName'].setErrors(null);
          this.userForm.controls['age'].setValue(0);
          this.userForm.controls['age'].setErrors(null);
          this.userForm.controls['grade'].setValue('');
          this.userForm.controls['grade'].setErrors(null);
          this.userForm.get('isEmailAutoField').setValue(false);
          this.userForm.get('isFNameAutoField').setValue(false);
          this.userForm.get('isLNameAutoField').setValue(false);
          this.userForm.get('isAgeAutoField').setValue(false);
          this.userForm.get('isGradeAutoField').setValue(false);
          for (const controlName in this.userForm?.controls) {
            const control = this.userForm.get(controlName);
            control.reset();
            control.setErrors(null);
          }
        }
      }
    }
    else {
      this.stemClubTobeFitlerd = [];
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptionRef.length) { this.subscriptionRef.map(d => d.unsubscribe()); }
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
    this.isProfileAutoSelected = false;
  }

  async ngOnInit(): Promise<void> {
    this.configurationService.getTeacherCornerConfigurations().pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.isWANotificationsDisabled = res?.disableWhatsAppNotifications;
    });

    this.generalContests = await lastValueFrom(this.contestService.getContestsByType('general'));

    this.classroomStemClubdependentContests = await lastValueFrom(
      this.contestService.getContestsByType('classroomStemClubdependent')
    );

    this.Contest = (this.classroomStemClubdependentContests || []).filter(
      (contest) => {
        const instId = this.instititutionSubRef?.value;
        const visibility =
          contest?.contestVisibilityToInstitutions?.[instId];
        return visibility?.institutionId === instId;
      }
    );

    this.finalContestsLst = [
      ...this.generalContests,
      ...this.Contest,
    ];

    this.finalContestsLst = this.sortContestsByStartDate(this.finalContestsLst);

    const genderListRef = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('genderList').pipe(first()));
    this.genderList = Object.values(genderListRef.get('genderList'));

    this.userForm = this.fb.group({
      fName: ['', [Validators.required]],
      lName: ['', [Validators.required]],
      phone: ['', [Validators.required]],
      email: ['', [Validators.email]],
      // age: [0, [Validators.required]],
      age: [0, [Validators.min(0)]],
      gender: ['', [Validators.required]],

      isEmailAutoField: [false],
      isFNameAutoField: [false],
      isLNameAutoField: [false],
      isAgeAutoField: [false],
      isGenderAutoField: [false],

      stemclubsinfo: new FormArray([]),
      profile: [''],
    });

    const clasSub = this.classroomService.allClassroomByInstituteSub.subscribe(async (cls) => {
      if (cls?.length) {
        const teacherClassroomIds = Object.keys(this.loggedInTeacher?.classrooms);
        const stemClubs = cls.filter((c: any) => c?.type === 'STEM-CLUB');
        this.stemClubs = Number(this.accessLevel) === 9 ?
          stemClubs.filter((cls: any) => teacherClassroomIds?.includes(cls?.docId)) :
          stemClubs;
        this.countryCode = (await this.getCountryCode(cls))?.countryCode;
        this.allStemclubs = this.getFilterStemClubs(stemClubs, false);
        this.allStemClubsClone = [...this.allStemclubs];
        this.stemclubList = this.allStemclubs.map(doc => doc.stemClubName);

        this.getStemClubs();
        this.isLoaded = true;
      }
    });
    this.subscriptionRef.push(clasSub);

    const selectedSub = this.selectedClassroomsSub.subscribe((res: any) => {
      if (res != null) {
        this.selectCls = res;
        const selectedClsRooms = this.getFilterStemClubs(res, false);
        this.userForm.patchValue({
          allSelectedClassroom: [...selectedClsRooms],
        });
        const classRoomIdsArr = selectedClsRooms.map(cls => cls['classroomId']);
        this.registeredClsIds = classRoomIdsArr;
        this.selectedClsIds = classRoomIdsArr;
      }
    });
    this.subscriptionRef.push(selectedSub);

    this.getStemClubs();

    const sub2 = this.userForm.get('phone').valueChanges.subscribe((res) => {
      if (res) {
        this.getStemClubs();
        this.getBasicStudentInfo(res);
      }
      else {
        this.userForm.patchValue({
          email: '',
          fName: '',
          lName: '',
          age: 0,
          gender: '',
        });
        this.clearFormArray();
        this.multipleStudents = false;
        this.showEmailDiv = false;
        this.isClassButtonActive = false;
        this.stemClubTobeFitlerd = [];
      };
    });
    this.subscriptionRef.push(sub2);
  }

  isArray(field: any): boolean {
    return Array.isArray(field);
  }

  // Determines if the Submit button should be enabled
  isSubmitReady(): boolean {
    if (!this.userForm) return false;
    const baseValid = this.userForm.valid;

    const fa = this.stemclubsInfo();
    const arr = fa ? fa.getRawValue() : [];
    const hasEntry = Array.isArray(arr) && arr.length > 0;

    const allComplete =
      hasEntry &&
      arr.every((r: any) => {
        const hasValidStemclub = !!r?.selectedStemclub;
        const hasValidProgrammes = Array.isArray(r?.selectedProgrammes) && r.selectedProgrammes.length > 0;

        // Contests are optional - no validation needed
        return hasValidStemclub && hasValidProgrammes;
      });

    const profileSelected = !!this.userForm.get('profile')?.value || this.isUserTobeCreated; // allow new profile path too

    return baseValid && allComplete && profileSelected;
  }



  addStemclubInfo(infoObj?, infoLoaded?) {
    if (!infoLoaded) {
      this.selectedStemClubName = 'undefined';
    }
    this.infoLoaded = infoLoaded || false;
    if (this.infoLoaded) {
      this.deleteButtonIsActive.push(true);
    }
    if (!this.infoLoaded) {
      this.deleteButtonIsActive.push(false);
      this.addButtonDisabled = true;
      const d = this.stemclubsInfo()?.length - 1;
      if (d != -1) {
        this.stemclubsInfo()?.at(this.stemclubsInfo()?.length - 1).disable();
      }
      else {
        console.error(`stemClubsInfo is empty`);
      }
    }
    if (typeof (infoObj) != 'undefined') {
      const index = this.allStemclubs.findIndex(elem => elem.stemClubName == infoObj.selectedStemclub);
      this.removeStemClub(index);
    }
    this.stemclubsInfo()?.push(this.newStemClubInfo(infoObj));
    if (this.stemclubsInfo()?.length > this.stemClubTobeFitlerd.length) {
      this.addButtonDisabled = true;
    }
    if (infoObj) {
      this.stemclubsInfo()?.at(this.stemclubsInfo()?.length - 1).disable();
    }
    if (this.stemclubsInfo()?.length > 2) {
      this.isCollapseActive = true;
    }
    if (this.allStemclubs.length == 0) {
      this.removeAddbutton = true;
      this.addButtonDisabled = true;
    }
  }

  newStemClubInfo(infoObj?): FormGroup {
    return this.fb.group({
      stemclubList: [infoObj?.stemclubList || this.stemclubList, Validators.required],
      selectedStemclub: [infoObj?.selectedStemclub || '', Validators.required],
      programmesList: [infoObj?.programmesList || [], [Validators.required]],
      selectedProgrammes: [infoObj?.selectedProgrammes || [], [Validators.required]],
      classObj: [infoObj?.classObj || {}],
      contestsList: [infoObj?.contestsList || this.finalContestsLst],
      selectedContests: [infoObj?.selectedContests || []]
    });
  }

  onSelectContest(event: any, index: number) {
    // Update the specific form control for this stem club
    this.stemclubsInfo().at(index).patchValue({
      selectedContests: event.value
    });
  }
  getStemClubs() {
    if (this.allStemclubs && this.allStemclubs.length > 0) {
      this.classrooms = [...this.allStemclubs]; // For bulk upload dropdown
    }
  }


  onSelectStemClub(event, index) {
    if (this.isBulkUpload) {
      // Handle bulk upload stem club selection
      return;
    }

    const cls = this.allStemclubs.find(doc => doc.stemClubName === event.value);

    // Extract contest IDs from the profile's contests object
    const contestsData = this.userForm.get('profile')?.value?.contests || {};
    const studentContestIds: string[] = [];

    // New structure: contests is an object where keys are contest IDs
    // Each contest has a 'classrooms' object containing classroom details
    studentContestIds.push(...Object.keys(contestsData));

    // Get the contests that are already registered for THIS specific stem club
    let registeredContests = [];

    if (cls?.classroomId) {
      // New structure: Loop through all contests and check if current classroom exists
      Object.keys(contestsData).forEach(contestId => {
        const contestClassrooms = contestsData[contestId]?.classrooms || {};
        // Check if this classroom ID exists in the contest's classrooms
        if (contestClassrooms[cls.classroomId]) {
          // Find the full contest object from finalContestsLst
          const contest = this.finalContestsLst.find(c => c.docId === contestId);
          if (contest) {
            registeredContests.push(contest);
          }
        }
      });
    }

    // Filter out contests that student is already registered for (excluding current classroom's contests)
    const availableContests = this.finalContestsLst.filter(contest => {
      const isRegisteredAnywhere = studentContestIds.includes(contest.docId);
      const isRegisteredInThisClassroom = cls?.classroomId && contestsData[contest.docId]?.classrooms?.[cls.classroomId];
      // Show if not registered anywhere OR if registered in this specific classroom
      return !isRegisteredAnywhere || isRegisteredInThisClassroom;
    });

    this.stemclubsInfo()?.at(index).patchValue({
      programmesList: Object.values(cls.programmes),
      classObj: cls,
      contestsList: availableContests, // Update available contests (includes registered for this classroom)
      selectedContests: registeredContests // Patch already registered contests
    });
    this.stemclubsInfo().at(this.stemclubsInfo().length - 1).get('selectedProgrammes').enable();
    this.selectedStemClubName = event.value;
  }

  onSelectProgramme(event, i) {
    // Disable stem club and programme fields, but keep contests enabled
    this.stemclubsInfo()?.at(i).get('selectedStemclub')?.disable();
    this.stemclubsInfo()?.at(i).get('selectedProgrammes')?.disable();

    const classIndex = this.allStemclubs.findIndex(doc => doc.stemClubName === this.selectedStemClubName);

    if (classIndex != -1) {
      this.removeStemClub(classIndex);
    }

    if (this.allStemclubs.length == 0) {
      this.removeAddbutton = true;
      this.addButtonDisabled = true;
    }
    else {
      this.addButtonDisabled = false;
    }
  }

  removeStemClub(index) {
    this.allStemclubs.splice(index, 1);
    this.stemclubList = [];
    this.allStemclubs.forEach((doc) => {
      if (typeof (doc.stemClubName) !== 'undefined') {
        this.stemclubList.push(doc.stemClubName);
      }
    });
  }

  addStemClub(stemClubName) {
    const cls = this.allStemClubsClone.find(doc => doc.stemClubName == stemClubName);
    this.allStemclubs.push(cls);
    this.stemclubList = [];
    this.allStemclubs.forEach((doc) => {
      if (typeof (doc.stemClubName) !== 'undefined') {
        this.stemclubList.push(doc.stemClubName);
      }
    });
  }

  removeStemClubInfo(empIndex: number, formValue) {
    this.infoLoaded = false;
    this.addButtonDisabled = false;
    this.removeAddbutton = false;
    const stemClubsToBeDeleted = this.stemclubsInfo()?.at(empIndex).get('selectedStemclub').value;
    this.stemclubsInfo().removeAt(empIndex);
    if (Object.keys(formValue.value.classObj).length !== 0) {
      this.allStemclubs.push(formValue.value.classObj);
    }
    this.stemclubList = [];
    this.allStemclubs.forEach((doc) => {
      if (typeof (doc.stemClubName) !== 'undefined') {
        this.stemclubList.push(doc.stemClubName);
      }
    });
    if (!this.infoLoaded) {
      this.stemclubsInfo().controls.forEach((control, index) => {
        if (!control.value.stemclubList.includes(stemClubsToBeDeleted)) {
          control.value.stemclubList.push(stemClubsToBeDeleted);
        }
        const d = control.value.stemclubList;
        this.stemclubsInfo().at(index).get('stemclubList').setValue(d);
      });
    }
    this.removeAddbutton = false;
  }

  updateStemClubDropdownOptionsForAll() {
    const selectedClubs = this.stemclubsInfo().controls.map(ctrl => ctrl.get('selectedStemclub')?.value);

    this.stemclubsInfo().controls.forEach((control, index) => {
      const currentSelected = control.get('selectedStemclub')?.value;
      const filteredList = this.allStemClubsClone
        .filter(club => !selectedClubs.includes(club.stemClubName) || club.stemClubName === currentSelected)
        .map(club => club.stemClubName);

      control.get('stemclubList')?.setValue(filteredList);
    });
  }

  checkRemainingStemClubs() {
    const allSelectedClubs = this.stemclubsInfo().controls.map(control =>
      control.get('selectedStemclub')?.value
    );

    const totalAvailableClubs = this.stemclubsInfo().at(0)?.get('stemclubList')?.value || [];
    const remainingClubs = totalAvailableClubs.filter(club => !allSelectedClubs.includes(club));
    this.isClassButtonActive = remainingClubs.length > 0;
  }

  getFilteredStemClubList(): string[] {
    const selected = this.stemclubsInfo().controls.map(ctrl => ctrl.get('selectedStemclub')?.value);
    return this.allStemClubsClone
      .filter(club => !selected.includes(club.stemClubName))
      .map(club => club.stemClubName);
  }

  onSelectCsvFile(event) {
    const check = this.csvValidation(event.target.files[0].name);
    this.studentInputFile = event.target.files[0].name;
    if (check) {
      this.chooseFile(event);
    }
    if (!check) {
      this.uiService.alertMessage('Invalid File Type', 'Only Accepts CSV File', 'error');
      this.studentInputFile.nativeElement.value = '';
      this.studentInputFile = '';
    }
  }

  csvValidation(el) {
    // let regex = new RegExp("(.*?)\.(csv)$");
    const regex = new RegExp('(.*?)\.(xlsx)$');
    let isCsv = false;
    if ((regex.test(el?.toLowerCase()))) {
      isCsv = true;
    }
    return isCsv;
  }

  async chooseFile(ev: any) {
    let workBook = null;
    let jsonData = null;
    const reader = new FileReader();
    const file = ev.target.files[0];
    reader.onload = () => {
      const data = reader.result;
      workBook = XLSX.read(data, { type: 'binary' });
      jsonData = workBook.SheetNames.reduce((initial, name) => {
        const sheet = workBook.Sheets[name];
        initial[name] = XLSX.utils.sheet_to_json(sheet);
        return initial[name];
      }, {});
      // remove the sample row
      const sampleIndex = jsonData.findIndex(item => item?.FirstName === 'John' && item?.LastName === 'Doe');
      jsonData.splice(sampleIndex, 1);
      // remove the blank rows
      jsonData = jsonData.filter((item) => {
        if (item?.FirstName === '' && item?.LastName === '' && item?.['Country Code'] === '' && item?.['Phone Number'] === '' && item?.['Email(optional)'] === '' && item?.['Programme Code'] === '') {
          return;
        } else {
          return item;
        }
      });
      this.studentsJson = jsonData;
      if (!jsonData.length) {
        this.uiService.alertMessage('Empty File', 'No Data Inside The File', 'warning');
        this.studentFileInputRef.nativeElement.value = '';
        this.studentInputFile = '';
      }
      this.studentFileInputRef.nativeElement.value = '';
    };
    reader.readAsBinaryString(file);
    this.logfileDownload = false;
  }

  stemclubsInfo(): FormArray {
    return this.userForm?.get('stemclubsinfo') as FormArray;
  }

  downloadTemplate() {
    const allProgrammes = Object.values(this.selectCls?.programmes).map((pObj: any) => ({ existCls: `${pObj?.programmeName}(${pObj?.programmeCode})` }));
    this.exportToExcel(allProgrammes, []);
  }

  async exportToExcel(existingProgrammes, teacherCls) {
    const { countryCode } = await this.getCountryCode(this.classrooms);
    const clsHeader = [[`List of Programmes in  ${this.selectCls.classroomName}`]];
    // let message = [[`Note: Please enter multiple programmes code separated by commas`]];
    const message = [['Notes:', '1. Please enter country code without phone number', '2. Please enter phone number without country code', '3. Please enter programme code only', '4. A sample has been provided for reference']];
    const messageTransposed = message[0].map((_, colIndex) => message.map(row => row[colIndex]));
    const Heading = [
      ['FirstName', 'LastName', 'Country Code', 'Phone Number', 'Email(optional)', 'Age', 'Gender', 'Programme Code'],
    ];
    // in case a sample is required
    const sample = [
      ['John', 'Doe', countryCode.toString(), '9876543210', 'john.doe@example.com', '10', 'Male', `${existingProgrammes?.[0]?.existCls?.match(/\(([\s\S\d]+)\)$/)?.[1]?.trim()}`],
    ];
    //Had to create a new workbook and then add the header
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, Heading);

    // add sample to sheet
    XLSX.utils.sheet_add_aoa(ws, sample, { origin: 'A2' });

    //Starting in the second row to avoid overriding and skipping headers
    XLSX.utils.sheet_add_json(ws, teacherCls || [], { origin: 'A2', skipHeader: true });

    XLSX.utils.sheet_add_aoa(ws, clsHeader, { origin: 'J1' });
    XLSX.utils.sheet_add_json(ws, existingProgrammes || [], {
      origin: 'J2',
      skipHeader: true,
    });
    // XLSX.utils.sheet_add_aoa(ws, message, {
    XLSX.utils.sheet_add_aoa(ws, messageTransposed, {
      origin: `J${existingProgrammes.length + 3}`
    });
    XLSX.utils.book_append_sheet(wb, ws, 'sampleWB');

    this.convertAllCellsToText(wb, ws);
    XLSX.writeFile(wb, 'students upload template.xlsx', { bookType: 'xlsx', bookSST: false, type: 'binary' });
  }

  convertAllCellsToText(wb: any, ws: any) {
    // format all cells as text
    const range = XLSX.utils.decode_range(ws['!ref']);
    // range.s.r + 1 means all except header
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellName = XLSX.utils.encode_cell({ c: c, r: r });
        if (!ws[cellName]) {
          ws[cellName] = { t: 's', v: '', z: '@' };
        }
        wb.Sheets['sampleWB'][cellName].z = '@';
      }
    }
  }


  async uploadCsvData() {
    this.isActiveloader = true;
    this.uploading = true;
    const filterCsvData = [];

    this.studentsJson.map((u) => {
      if (u['Country Code'] !== undefined && u['Phone Number'] !== undefined) {
        const user = {
          firstName: u?.['FirstName']?.toString()?.trim() || '',
          lastName: u?.['LastName']?.toString()?.trim() || '',
          fullNameLowerCase: `${(u?.['FirstName']?.toString()?.trim() || '')?.toLowerCase()?.replace(/ /g, '')}${(u?.['LastName']?.toString()?.trim() || '')?.toLowerCase().replace(/ /g, '')}`,
          countryCode: u?.['Country Code']?.toString().trim() || '',
          phoneNumber: u?.['Phone Number']?.toString()?.trim()?.replace(/ /g, '') || '',
          email: u?.['Email(optional)']?.toString()?.trim() || '',
          age: u?.['Age']?.toString()?.trim() || '',
          gender: u?.['Gender']?.toString()?.trim() || '',
          programmes: u?.['Programme Code']?.toString()?.trim()
        };
        filterCsvData.push(user);
      }
    });

    const usersArr = await this.getFilterUsers(filterCsvData);
    const invalidatedUsers = usersArr[1];
    const validatedUsers = usersArr[0];
    // Invalid Users
    const invalidUserLogArr = this.getUserLogWithCls(invalidatedUsers);
    this.usersLogArr.push(...invalidUserLogArr);

    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/users_add_into_classrooms_v2`;

    // Process users for multiple stem clubs (if multiselect stem clubs) or single stem club
    const processUsers = [];
    const stemClubsToProcess = Array.isArray(this.selectCls) ? this.selectCls : [this.selectCls];

    stemClubsToProcess.forEach((selectedStemClub) => {
      validatedUsers.forEach((u) => {
        processUsers.push({
          isTeacher: false,
          firstName: u.firstName.trim(),
          lastName: u.lastName.trim(),
          fullNameLowerCase: u.fullNameLowerCase.trim(),
          countryCode: u.countryCode,
          phoneNumber: u.phoneNumber,
          email: u.email,
          age: u.age,
          gender: u.gender,
          studentClassrooms: [
            {
              stemClubName: selectedStemClub.stemClubName,
              classroomId: selectedStemClub.classroomId,
              institutionName: selectedStemClub.institutionName,
              institutionId: selectedStemClub.institutionId,
              programmes: u.programmes
                .split(',')
                .map((pId) =>
                  Object.values(selectedStemClub.programmes).find(
                    (pInfo: any) => pInfo.programmeCode == pId
                  )
                ),
              type: selectedStemClub.type,
            },
          ],
        });
      });
    });

    // Get current teacher for nomination metadata
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    const currentTeacher = await lastValueFrom(this.teacherService.getWithId(currentUser?.id || currentUser?.docId));

    const formData = {
      usersJsonArr: processUsers,
      isTeacher: false,
      isBulkUpload: true,
      contestData: !this.selectedContests || this.selectedContests.length === 0 ? undefined : {
        contests: this.selectedContests.map(contest => ({
          ...contest,
          nominateMeta: {
            firstName: currentTeacher?.teacherMeta?.firstName,
            lastName: currentTeacher?.teacherMeta?.lastName,
            fullNameLowerCase: currentTeacher?.teacherMeta?.fullNameLowerCase,
            countryCode: currentTeacher?.teacherMeta?.countryCode,
            phoneNumber: currentTeacher?.teacherMeta?.phoneNumber,
            email: currentTeacher?.teacherMeta?.email,
            institutionId: stemClubsToProcess[0]?.institutionId,
            institutionName: stemClubsToProcess[0]?.institutionName,
            nominationAt: new Date(),
            linkUid: currentTeacher?.teacherMeta?.uid || '',
            confirm: false
          }
        })),
        board: stemClubsToProcess[0]?.board,
      }
    };


    const httpOption: any = {
      responseType: 'json',
    };

    try {
      const response: any = await lastValueFrom(
        this.httpClient
          .post<any>(endUrl, formData, httpOption)
          .pipe(first())
      );


      // Comprehensive response validation handling both success and failure
      let isSuccess = false;
      let responseUserArr = [];
      let errorMessage = '';

      if (response) {
        // Check for explicit success indicators
        if (
          // Success case 1: Has userArr with data (your case)
          (response.userArr && Array.isArray(response.userArr) && response.userArr.length > 0) ||
          // Success case 2: Response is array with data
          (Array.isArray(response) && response.length > 0) ||
          // Success case 3: Has success flag
          response.success === true ||
          // Success case 4: Has success status
          (response.status && (response.status === 'success' || response.status === 200)) ||
          // Success case 5: Has progressLogId (indicates processing started successfully)
          response.progressLogId
        ) {
          isSuccess = true;
          responseUserArr = response.userArr || response || [];
        }

        // Check for explicit failure indicators
        else if (
          // Failure case 1: Explicit success = false
          response.success === false ||
          // Failure case 2: Error status codes
          (response.status && (response.status === 'error' || response.status >= 400)) ||
          // Failure case 3: Has error field
          response.error ||
          // Failure case 4: Has message indicating failure
          (response.message && (
            response.message.toLowerCase().includes('error') ||
            response.message.toLowerCase().includes('failed') ||
            response.message.toLowerCase().includes('invalid')
          )) ||
          // Failure case 5: Empty userArr when expected
          (response.userArr && Array.isArray(response.userArr) && response.userArr.length === 0)
        ) {
          isSuccess = false;
          errorMessage = response.message || response.error || 'Upload failed';
        }

        // Fallback: If response has meaningful content, assume success
        else if (typeof response === 'object' && Object.keys(response).length > 0) {
          console.warn('Response validation: Assuming success for ambiguous response:', response);
          isSuccess = true;
          responseUserArr = response.userArr || response || [];
        } else {
          isSuccess = false;
          errorMessage = 'Empty or invalid response received';
        }
      } else {
        isSuccess = false;
        errorMessage = 'No response received from server';
      }


      if (isSuccess && invalidatedUsers.length == 0) {
        if (!this.isWANotificationsDisabled) {
          formData['usersJsonArr'].map((d) => {
            const studentInfo = {
              name: `${d['firstName']} ${d['lastName'] || ''}`,
              phone: d.countryCode + d.phoneNumber,
              institutionName: d.studentClassrooms[0].institutionName,
            };
            this.sendWaNotifications(studentInfo, d.studentClassrooms[0]);

            // Send contest notifications for each selected contest
            if (this.selectedContests && this.selectedContests.length > 0) {
              this.sendWaNotificationsContests(studentInfo, this.selectedContests);
            }
          });
        }

        const storedUserLogArr = this.getUserLogWithCls(
          validatedUsers,
          'Success'
        );
        this.usersLogArr.push(...storedUserLogArr);

        this.uiService.alertMessage(
          'Successful',
          'Students Added To STEM Clubs Successfully',
          'success'
        );
        this.isActiveloader = false;
        this.logfileDownload = true;
        this.selectCls = Array.isArray(this.selectCls) ? [] : '';
        this.selectedContests = []; // Reset selected contests
      } else if (isSuccess && invalidatedUsers.length > 0) {
        this.uiService.alertMessage(
          'Upload Failed',
          'Invalid users, please check the log file',
          'error'
        );
        this.isActiveloader = false;
        this.logfileDownload = true;
        this.selectCls = Array.isArray(this.selectCls) ? [] : '';
      }
      else {
        console.error('Upload failed - Response:', response);
        console.error('Error message:', errorMessage);

        this.uiService.alertMessage(
          'Oops',
          'Please try again',
          'error'
        );
        this.isActiveloader = false;
      }
    } catch (error) {
      console.error('Error Adding Students to STEM Club: ', error);
      this.uiService.alertMessage(
        'Error Adding Students to STEM Club',
        error,
        'error'
      );
      this.isActiveloader = false;
    }

    this.uploading = false;
  }

  async getFilterUsers(userData) {
    const validatedUsers = [];
    const inValidatedUsers = [];
    const allProgrammes = Object.values(this.selectCls?.programmes)?.map(
      (item: any) => item.programmeCode
    );
    const countryCode = (await this.getCountryCode(this.classrooms))
      .countryCode;
    userData?.map(async (user) => {
      if (user.countryCode !== countryCode) {
        user.status = 'Invalid country code';
        inValidatedUsers.push(user);
      } else if (!allProgrammes.includes(user.programmes)) {
        user.status = 'Invalid program code';
        inValidatedUsers.push(user);
      } else if (user.phoneValidator == false) {
        user.status = 'Invalid phone number';
        inValidatedUsers.push(user);
      } else if (user.email != '' && user.emailValidator == false) {
        user.status = 'Invalid email address';
        inValidatedUsers.push(user);
      } else if (user.age == '') {
        user.status = 'Invalid age';
        inValidatedUsers.push(user);
      } else if (user.gender == '') {
        user.status = 'Invalid gender';
        inValidatedUsers.push(user);
      } else if (user.firstName == '') {
        user.status = 'Invalid First Name ';
        inValidatedUsers.push(user);
      } else if (user.lastName == '') {
        user.status = 'Invalid Last Name';
        inValidatedUsers.push(user);
      } else {
        validatedUsers.push(user);
      }
    });

    const students = await this.studentService.getAllStudent();
    const validateFinalData: any[] = [];
    const seen = new Map();
    const validatedUser: typeof userData = [];
    const studentsPhone = students
      .map((s) => ({ phoneNumber: s.studentMeta?.phoneNumber }))
      .filter((p) => !!p.phoneNumber);


    for (const user of validatedUsers) {
      const key = `${user.firstName.toLowerCase()}-${user.lastName.toLowerCase()}-${user.phone
        }`;
      if (seen.has(key)) {
        user.status = 'duplicate data';
        inValidatedUsers.push(user);
      } else {
        seen.set(key, true);
        user.status = 'success';
        validatedUser.push(user);
      }
    }

    validatedUser.forEach((doc, index) => {
      const matchesone = studentsPhone.filter(
        (sp) => doc.phoneNumber === sp.phoneNumber
      );

      const matchestwo = validateFinalData.filter(
        (sp) => doc.phoneNumber === sp.phoneNumber
      );

      if (matchesone.length + matchestwo.length <= 2) {
        doc.status = 'success';
        validateFinalData.push(doc);
      } else {
        doc.status =
          'more than three people are registered with same number';
        inValidatedUsers.push(doc);
      }
    });

    return [validateFinalData, inValidatedUsers];
  }


  // async getFilterUsers(userData) {
  //   const validatedUsers = [];
  //   const inValidatedUsers = [];
  //   const allProgrammes = Object.values(this.selectCls?.programmes).map((item: any) => item.programmeCode);
  //   const countryCode = (await (this.getCountryCode(this.classrooms))).countryCode;
  //   userData?.map(async (user) => {
  //     if (user.countryCode !== countryCode) {
  //       user.status = 'Invalid country code';
  //       inValidatedUsers.push(user);
  //     }
  //     else if (!allProgrammes.includes(user.programmes)) {
  //       user.status = 'Invalid program code';
  //       inValidatedUsers.push(user);
  //     }
  //     else if (user.phoneValidator == false) {
  //       user.status = 'Invalid phone number';
  //       inValidatedUsers.push(user);
  //     }
  //     else if (user.email != '' && user.emailValidator == false) {
  //       user.status = 'Invalid email address';
  //       inValidatedUsers.push(user);
  //     }
  //     else if (user.age == '') {
  //       user.status = 'Invalid age';
  //       inValidatedUsers.push(user);
  //     }
  //     else if (user.gender == '') {
  //       user.status = 'Invalid gender';
  //       inValidatedUsers.push(user);
  //     }
  //     else if (user.firstName == '') {
  //       user.status = 'Invalid First Name ';
  //       inValidatedUsers.push(user);
  //     }
  //     else if (user.lastName == '') {
  //       user.status = 'Invalid Last Name';
  //       inValidatedUsers.push(user);
  //     }
  //     else {
  //       validatedUsers.push(user);
  //     }
  //   });
  //   return [validatedUsers, inValidatedUsers];
  // }

  getUserLogWithCls(usersArr: any, status?: string) {
    let userLogArr = [];
    userLogArr = usersArr.map((user: any) => ({
      'FirstName': user?.firstName || '',
      'LastName': user?.lastName || '',
      'Country Code': user?.countryCode || '',
      'Phone Number': user?.phoneNumber || '',
      'Email(optional)': user?.email || '',
      'Age': user?.age || '',
      'Gender': user?.gender || '',
      'Program Code': user?.programmes || '',
      'Status': user?.status || status || ''
    }));
    return userLogArr;
  }

  downloadLogFile() {
    const heading = [
      ['FirstName', 'LastName', 'Country Code', 'Phone Number', 'Email(optional)', 'Age', 'Gender', 'Program Code', 'Status'],
    ];
    //Had to create a new workbook and then add the header
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, heading);

    //Starting in the second row to avoid overriding and skipping headers
    XLSX.utils.sheet_add_json(ws, this.usersLogArr || [], { origin: 'A2', skipHeader: true });

    XLSX.utils.book_append_sheet(wb, ws, 'sampleWB');

    this.convertAllCellsToText(wb, ws);

    XLSX.writeFile(wb, 'LogFile.xlsx', { bookType: 'xlsx', bookSST: false, type: 'binary' });
  }

  addIntoNewStemClub(stemClubIdsArr) {
    const filterStemClub = this.filterNewSelectedStemClub(stemClubIdsArr);
    this.userForm.patchValue({
      classroom: [...filterStemClub],
    });
  }

  filterNewSelectedStemClub(allSelectedStemmClubIdsArr) {
    const newStemClubSelected = this.allStemclubs.filter(
      stemClub =>
        allSelectedStemmClubIdsArr.includes(stemClub.classroomId) &&
        stemClub.isRegistered != true
    );
    return newStemClubSelected;
  }

  async getAutoFieldsUserInfo(studentInfo, isAutocalled?) {
    if (!isAutocalled) {
      this.isProfileAutoSelected = true;
      this.isUserTobeCreated = false;
    }
    else {
      this.isUserTobeCreated = false;
    }
    this.showEmailDiv = true;
    this.isClassButtonActive = true;
    this.clearFormArray();
    const checkUserInfo = studentInfo;
    let stemClubArr = [];
    stemClubArr = Object.values(checkUserInfo.classrooms).filter((classroom: any) => classroom.type == 'STEM-CLUB');
    let userInfo;
    userInfo = checkUserInfo || {};
    this.userForm.patchValue({
      fName: userInfo?.studentMeta.firstName || '',
      lName: userInfo?.studentMeta.lastName || '',
      email: userInfo?.studentMeta.email || '',
      age: userInfo?.studentMeta.age || 0,
      gender: userInfo?.studentMeta.gender || '',
      isEmailAutoField: userInfo?.studentMeta.email && userInfo?.studentMeta.email !== '' ? true : false,
      isFNameAutoField: userInfo?.studentMeta.firstName && userInfo?.studentMeta.firstName !== '' ? true : false,
      isLNameAutoField: userInfo?.studentMeta.lastName && userInfo?.studentMeta.lastName !== '' ? true : false,
      isAgeAutoField: userInfo?.studentMeta.age > 0 ? true : false,
      isGradeAutoField: userInfo?.studentMeta.grade !== '' ? true : false,
    });
    this.userForm.get('fName').disable();
    this.userForm.get('lName').disable();
    this.userForm.get('age').disable();
    this.userForm.get('gender').disable();
    const hasAge = (userInfo?.studentMeta.age || 0) > 0;
    const hasGender = !!(userInfo?.studentMeta.gender && userInfo?.studentMeta.gender !== '');
    hasAge ? this.userForm.get('age').disable() : this.userForm.get('age').enable();
    hasGender ? this.userForm.get('gender').disable() : this.userForm.get('gender').enable();

    const userRegisteredCls: string[] = Object.keys(checkUserInfo?.classrooms || {}) || [];
    this.allStemclubs.filter((cls) => {
      if (userRegisteredCls.includes(cls.classroomId)) {
        cls.isRegistered = true;
      } else {
        cls.isRegistered = false;
      }
    });

    if (userRegisteredCls.length) {
      this.registeredClsIds = userRegisteredCls;
    } else {
      this.registeredClsIds = this.selectedClsIds;
      this.addIntoNewStemClub(this.registeredClsIds);
    }

    // Extract all contest IDs from the contests object
    const studentContestIds: string[] = [];
    const contestsData = checkUserInfo?.contests || {};

    // Loop through each classroom's contest data
    // Object.values(contestsData).forEach((classroomContests: any) => {
    //   if (classroomContests?.contestIds && Array.isArray(classroomContests.contestIds)) {
    //     studentContestIds.push(...classroomContests.contestIds);
    //   }
    // });

    // // New structure: contests is an object where keys are contest IDs
    // // Each contest has a 'classrooms' object containing classroom details
    studentContestIds.push(...Object.keys(contestsData));

    if (stemClubArr.length) {
      // this.setStemclubsFormArray(stemClubArr);
      this.setStemclubsFormArray(stemClubArr, studentContestIds);
    }
    if (this.allStemclubs.length === 0) {
      this.isClassButtonActive = false;
    } else {
      this.isClassButtonActive = true;
    }

  }


  setStemclubsFormArray(stemclubArray, studentContestIds: string[] = []) {
    if (stemclubArray.length) {
      for (const clsObj of stemclubArray) {
        if (clsObj?.programmes?.length) {
          let stemclubCls = this.allStemClubsClone.find(doc => doc.classroomId == clsObj.classroomId);

          if (!stemclubCls) {
            console.warn('⚠️ Stem club not found in allStemClubsClone for classroomId:', clsObj.classroomId);
            console.warn('⚠️ Using student classroom data as fallback');
            stemclubCls = clsObj;
          }
          if (stemclubCls) {
            // Get the contests that are already registered for THIS specific classroom
            const contestsData = this.userForm.get('profile')?.value?.contests || {};
            let registeredContests = [];

            // New structure: Loop through all contests and check if current classroom exists
            Object.keys(contestsData).forEach(contestId => {
              const contestClassrooms = contestsData[contestId]?.classrooms || {};
              // Check if this classroom ID exists in the contest's classrooms
              if (contestClassrooms[clsObj.classroomId]) {
                // Find the full contest object from finalContestsLst
                const contest = this.finalContestsLst.find(c => c.docId === contestId);
                if (contest) {
                  registeredContests.push(contest);
                }
              }
            });

            // Filter out contests that student is already registered for (excluding current classroom's contests)
            const availableContests = this.finalContestsLst.filter(contest => {
              const isRegisteredAnywhere = studentContestIds.includes(contest.docId);
              const isRegisteredInThisClassroom = contestsData[contest.docId]?.classrooms?.[clsObj.classroomId];
              // Show if not registered anywhere OR if registered in this specific classroom
              return !isRegisteredAnywhere || isRegisteredInThisClassroom;
            });

            const stemClubDisplayName = stemclubCls.stemClubName || clsObj.stemClubName || clsObj.classroomId;

            this.addNewStemClassInfo(
              stemclubCls,
              clsObj.programmes,
              true,
              availableContests,  // Pass contests list that includes both available and registered for this classroom
              registeredContests  // Pass registered contests to patch
            );
          }
        }
      }
    }
  }

  addNewStemClassInfo(classObj, programmesArray, infoLoaded?, availableContests?, registeredContests?) {
    const contestsList = availableContests || this.finalContestsLst;
    const selectedContests = registeredContests || []; // Patch existing contests

    const infoObj = {
      stemclubList: this.stemclubList,
      selectedStemclub: classObj.stemClubName,
      programmesList: Object.values(classObj.programmes),
      selectedProgrammes: programmesArray,
      classObj: classObj,
      contestsList: contestsList, // Use filtered list (available to select)
      selectedContests: selectedContests // Patch already registered contests
    };
    this.stemClubTobeFitlerd.push(infoObj);
    this.addStemclubInfo(infoObj, infoLoaded);
  }

  async onSubmit(form) {
    const formValue = form.getRawValue();
    this.stemClubTobeFitlerd = [];
    this.loading = true;

    // Process stem clubs and add user via cloud function
    this.processStemClubs(form.getRawValue());
  }

  getFilterStemClubs(clsArr, isRegistered) {
    const filterClsArr = clsArr?.map(classroom =>
      Object.assign(classroom, { 'isRegistered': isRegistered }));
    return filterClsArr;
  }


  processStemClubs(form) {
    const studentClassrooms = form.stemclubsinfo.map(c => ({
      institutionId: c.classObj.institutionId,
      institutionName: c.classObj.institutionName,
      classroomId: c.classObj.classroomId,
      stemClubName: c.classObj.stemClubName,
      type: c.classObj.type,
      board: c.classObj.board, // Add board
      programmes: c.selectedProgrammes.map((prog) => {
        const { workflowIds, ...rest } = prog;
        return rest;
      }),
      // Include contests for each stem club (same as classrooms)
      selectedContests: c.selectedContests || []
    }));

    const userDetailsWithClassroom = {
      isBulkUpload: false,
      isTeacher: false,
      firstName: form.fName.trim(),
      lastName: form.lName.trim(),
      fullNameLowerCase: `${form.fName.trim().toLowerCase().replace(/ /g, '')}${form.lName.trim().toLowerCase().replace(/ /g, '')}`,
      countryCode: this.countryCode,
      phoneNumber: form.phone,
      email: form.email,
      age: form.age,
      gender: form.gender,
      studentClassrooms: studentClassrooms,
      institutionName: studentClassrooms?.[0]?.institutionName
    };
    this.addUsers(userDetailsWithClassroom); // No second parameter, just like processClassrooms
  }

  async addUsers(userClassroom) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/users_add_into_classrooms_v2`;

    const formData: any = {
      userClassroomDetails: userClassroom
    };

    // Handle contest data from individual STEM clubs in form array
    try {
      const clubsWithContests = userClassroom.studentClassrooms.filter(
        club => club.selectedContests && club.selectedContests.length > 0
      );

      if (clubsWithContests.length > 0) {
        // Process contests with STEM club association
        const allContests = [];
        let board = null;

        // Get current teacher/nominator information
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        const currentTeacher = await lastValueFrom(this.teacherService.getWithId(currentUser?.id || currentUser?.docId));

        clubsWithContests.forEach(club => {
          if (club.selectedContests && club.selectedContests.length > 0) {
            // Set board from first club with contests if not already set
            if (!board && club.board) {
              board = club.board;
            }

            // Add STEM club association to each contest
            club.selectedContests.forEach(contest => {
              allContests.push({
                ...contest,
                classroomId: club.classroomId, // Associate contest with STEM club
                nominateMeta: {
                  firstName: currentTeacher.teacherMeta.firstName,
                  lastName: currentTeacher.teacherMeta.lastName,
                  fullNameLowerCase: currentTeacher.teacherMeta.fullNameLowerCase,
                  countryCode: currentTeacher.teacherMeta.countryCode,
                  phoneNumber: currentTeacher.teacherMeta.phoneNumber,
                  email: currentTeacher.teacherMeta.email,
                  institutionId: club.institutionId,
                  institutionName: club.institutionName,
                  nominationAt: Timestamp.now(),
                  linkUid: currentTeacher.teacherMeta.uid || '',
                  confirm: false
                }
              });
            });
          }
        });

        if (allContests.length > 0 && board) {
          formData.contestData = {
            contests: allContests,
            board: board,
          };
        }
      }
    } catch (e) {
    }

    const httpOption: any = {
      responseType: 'application/json'
    };

    try {
      const response = await lastValueFrom(
        this.httpClient
          .post<any>(endUrl, formData, httpOption)
          .pipe(first())
      );
      this.loading = false;

      if (response) {
        if (!this.isWANotificationsDisabled) {
          formData.userClassroomDetails.studentClassrooms.map((cls) => {
            this.sendWaNotifications(formData.userClassroomDetails, cls);
          });

          // Check if any STEM club has contests selected
          const hasContestRegistrations = userClassroom.studentClassrooms.some(
            club => club.selectedContests && club.selectedContests.length > 0
          );

          if (hasContestRegistrations) {
            this.sendWaNotificationsContests(formData.userClassroomDetails);
          }
        }
        this.uiService.alertMessage('Successful', 'Student Added To STEM Club Successfully', 'success');
        this.userForm.reset();
        this.userForm.enable();
      } else {
        this.loading = false;
        this.uiService.alertMessage('Oops', 'Please try again', 'error');
        this.userForm.enable();
      }
    } catch (error) {
      this.loading = false;
      console.error(error);
      this.uiService.alertMessage('Error', 'Error adding student to STEM club', 'error');
      this.userForm.enable();
    }
  }

  async sendWaNotifications(student, cls) {
    let formattedString = '';
    const userProgrammes = cls?.programmes;
    cls?.programmes?.map((p, index) => {
      if (typeof (p) != 'undefined') {
        if (userProgrammes.length > 1) {
          if (index < userProgrammes.length - 1) {
            formattedString = formattedString + ' ' + p.programmeName + ',';
          }
          else {
            formattedString = formattedString + ' ' + p.programmeName;
          }
        }
        else {
          formattedString = p.programmeName;
        }
      }
      else {
        formattedString = '';
      }
    });

    const phoneNumber = student?.countryCode + student?.phoneNumber;
    const templateName = environment.whatsAppTemplates.studentStemClubAddition.templateName;
    const imageHeaderUrl = environment.whatsAppTemplates.studentStemClubAddition.headerImage;
    const mediaType = 'image';
    const params = [
      `${student?.firstName} ${student?.lastName}`,
      cls?.institutionName,
      cls?.stemClubName,
      // cls?.grade,
      // cls?.section,
      formattedString
    ];
    const urlRoute = undefined;

    this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, imageHeaderUrl, mediaType, urlRoute);
  }

  bulkUploadEnable(value) {
    this.isBulkUpload = value.checked;
  }

  attributeDisplay(attribute1, attribute2) {
    if (attribute1.programmeId == attribute2.programmeId) {
      return attribute1.programmeName;
    } else {
      return '';
    }
  }

  async getCountryCode(classrooms: any) {
    const internationalBoards = this.configurationService.getInternationalBoardList().pipe(first());
    const selectedCountry = this.country;
    const countryName = selectedCountry?.[0]?.toUpperCase() + selectedCountry?.slice(1);
    const countryCodes = this.configurationService.getCountryCodesList().pipe(first());
    const codesList = await lastValueFrom(countryCodes);
    const countryCode = codesList?.countryCodes?.[selectedCountry]?.phone;
    return { countryCode, countryName };
  }

  async findMatchingCountry(boards: any, classroomBoard: string) {
    for (const key in boards) {
      if (boards[key].map(x => x.code).includes(classroomBoard)) {
        return key;
      };
    };
  }

  async getBasicStudentInfo(inputPhone: string) {
    this.userForm.get('email').reset();
    this.userForm.get('lName').reset();
    this.userForm.get('fName').reset();
    this.userForm.get('age').reset();
    this.userForm.get('gender').reset();
    this.userForm.get('stemclubsinfo').reset();

    this.showEmailDiv = false;
    if (this.userForm.get('phone').invalid) {
      this.isActive = false;
    }
    else {
      this.isActive = true;
    }

    const query: QueryFn = (ref: CollectionReference) => ref.where('studentMeta.phoneNumber', '==', inputPhone);
    this.studentArr = await lastValueFrom(await this.studentService.getDocWithQuery(query));
    if (this.studentArr.length == 1) {
      this.multipleStudents = true;
      this.showEmailDiv = false;
      this.isUserTobeCreated = false;
    }
    if (this.studentArr.length == 0) {
      this.multipleStudents = true;
    }
    if (this.studentArr.length > 1) {
      this.multipleStudents = true;
      this.showEmailDiv = false;
      this.isUserTobeCreated = false;
    }
  }

  clearFormArray() {
    const formArray = this.userForm?.get('stemclubsinfo') as FormArray;
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  createStemClub() {
    this.showEmailDiv = true;
    this.isClassButtonActive = true;
    this.multipleStudents = false;
    this.showEmailDiv = true;
    this.isProfileAutoSelected = true;

    this.isUserTobeCreated = true;
    this.userForm.get('fName').enable();
    this.userForm.get('lName').enable();
    this.userForm.patchValue({
      'email': '',
      'fName': '',
      'lName': '',
      'age': 0,
      'gender': '',
      'stemclubsinfo': [],
      'isEmailAutoField': false,
      'isFNameAutoField': false,
      'isLNameAutoField': false,
      'isAgeAutoField': false,
      'isGradeAutoField': false,
    });
    this.clearFormArray();
  }

  uploadFile(event) {
    this.filename = event.target.files[0].name;
  }

  // ...existing code...

  sortContestsByStartDate(contests: any[]): any[] {
    return contests.sort((a, b) => {
      const aStartDate = a.contestStartDate?.seconds || 0;
      const bStartDate = b.contestStartDate?.seconds || 0;
      return bStartDate - aStartDate;
    });
  }


  isAddClassroomEnabledSimple(): boolean {

    if (!this.userForm || !this.isClassButtonActive) {
      return false;
    }

    // Check if basic required personal fields are filled
    const fName = this.userForm.get('fName')?.value?.trim();
    const lName = this.userForm.get('lName')?.value?.trim();
    const phone = this.userForm.get('phone')?.value?.trim();
    // const age = this.userForm.get('age')?.value;
    const gender = this.userForm.get('gender')?.value;

    if (!fName || !lName || !phone || !gender) {
      return false;
    }

    const stemClubsArray = this.stemclubsInfo();
    if (!stemClubsArray) {
      return false;
    }

    // If no stem clubs added yet, allow adding the first one
    if (stemClubsArray.length === 0) {
      return true;
    }

    // Check if current stem clubs are properly filled
    for (const control of stemClubsArray.controls) {
      const selectedStemclub = control.get('selectedStemclub')?.value;
      const programmes = control.get('selectedProgrammes')?.value;

      // Only check stem club and programmes - contests are optional
      if (!selectedStemclub || !programmes || !programmes.length) {
        return false;
      }
    }

    return true;
  }


  async sendWaNotificationsContests(student: any, contests?: any[]) {
    const phone = student?.phone || (student?.countryCode + student?.phoneNumber);
    const templateName = environment.whatsAppTemplates.contestRegistrationConfirmationForStudent.templateName;
    const headerImage = environment.whatsAppTemplates.contestRegistrationConfirmationForStudent.headerImage;
    const mediaType = 'image';
    const fullName = student.name || `${student?.firstName} ${student?.lastName}`;

    // Get contests from parameter or form array
    let allContests = [];
    
    if (contests && contests.length > 0) {
        // Use passed contests (for bulk upload)
        allContests = contests;
    } else {
        // Get contests from form array (for single student add)
        const stemClubsArray = this.stemclubsInfo();
        for (let i = 0; i < stemClubsArray.length; i++) {
            const selectedContests = stemClubsArray.at(i).get('selectedContests')?.value;
            if (selectedContests && selectedContests.length > 0) {
                allContests.push(...selectedContests);
            }
        }
    }

    // Send notification for each unique contest
    const uniqueContests = allContests.filter((contest, index, self) =>
        index === self.findIndex(c => c.docId === contest.docId)
    );

    for (const contest of uniqueContests) {
        const contestName = contest.contestTitle;
        const stageName = contest.stagesNames[0].stageName;
        const site = new URL(contest.domain).host;
        const startDate = contest.stagesNames[0].startDate.toDate().toLocaleDateString('en-GB');
        const endDate = contest.stagesNames[0].endDate.toDate().toLocaleDateString('en-GB');
        const team = 'Raman Awards';

        const params = [
            fullName,
            contestName,
            stageName,
            contestName,
            stageName,
            'have opened',
            startDate,
            endDate,
            site,
            'begin',
            endDate,
            team,
        ];
        const urlRoute = undefined;

        await this.sharedService.sendWhatsAppNotification(
            phone,
            templateName,
            params,
            headerImage,
            mediaType,
            urlRoute
        );
    }
}
}
