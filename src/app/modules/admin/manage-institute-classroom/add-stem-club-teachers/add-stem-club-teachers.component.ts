import { HttpClient } from '@angular/common/http';
import { Component, ElementRef, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, Subject, Subscription, first, lastValueFrom, take, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';
import { fuseAnimations } from '@fuse/animations';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import phone from 'phone';
import { environment } from 'environments/environment';
import { SharedService } from 'app/shared/shared.service';

@Component({
  selector: 'app-add-stem-club-teachers',
  templateUrl: './add-stem-club-teachers.component.html',
  styleUrls: ['./add-stem-club-teachers.component.scss'],
  animations: fuseAnimations
})
export class AddStemClubTeachersComponent implements OnInit {
  @Input() stepper: MatStepper;
  @Input() selectedClassroomsSub: BehaviorSubject<any>;
  @Input() instititutionSubRef: BehaviorSubject<any>;
  @Input() index: any;
  @Input() country: string;

  userForm: FormGroup;
  classClone = [];
  addButtonDisabled: boolean = true;
  classrooms: any[] = [];
  subscriptionRef: Subscription[] = [];
  isBulkUpload: boolean = false;
  isActiveloader: boolean = false;
  selectCls;
  teachersJson: any = [];
  gradeList;
  selectedProgram: any;
  currentUser;
  stemClubTobeFitlerd: any = [];
  programmesTosend: any = [];
  registeredClsIds: string[] = [];
  allClsRooms: any[] = [];
  selectedClsIds: string[] = [];
  @ViewChild('teachersFileInputRef', { static: false }) teachersFileInput?: ElementRef;
  teacherInputFile: any;
  usersLogArr = [];
  logfileDownload: boolean = false;
  filteredGradelist: any = [];
  isCollapseActive = false;
  collapse = false;
  deleteButtonIsActive = [];
  currentGrade = {};
  allClasses: any;
  duplicateElem: any = [];
  selectedStemClubName: string;
  selectedGrade;
  selectedSection;
  removeAddbutton: boolean = false;
  allStemClubsClone = [];
  teacherDoc: {};
  uploading = false;
  infoLoaded = false;
  isWANotificationsDisabled: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  countryCode: string;
  stemclubList = [];
  stemclubsClone: any;
  allStemclubs: any;
  teacherRoles: Array<any>;
  stemClubs: any;
  isLoaded: boolean = false;

  constructor(
    private httpClient: HttpClient,
    private uiService: UiService,
    private classroomService: ClassroomsService,
    private teacherService: TeacherService,
    private fb: FormBuilder,
    private configurationService: ConfigurationService,
    private sharedService: SharedService,
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.index) {
      const inputPhone = this.userForm?.get('phone')?.value;
      if (this.index === 2) {
        if (this.stemclubsInfo()) {
          this.stemclubsInfo().controls = [];
          this.stemClubTobeFitlerd = [];
          this.userForm.get('fName').markAsUntouched();
          this.userForm.get('fName').disable();
          this.userForm.get('email').markAsUntouched();
          this.userForm.get('email').disable();
          this.userForm.get('lName').markAsUntouched();
          this.userForm.get('lName').disable();
          this.userForm.get('userRole').patchValue('schoolTeacher');
          this.userForm.get('userRole').disable();
          this.userForm.controls['lName'].setValue('');
          this.userForm.controls['lName'].setErrors(null);
          this.userForm.controls['fName'].setValue('');
          this.userForm.controls['fName'].setErrors(null);
          this.userForm.get('isEmailAutoField').setValue(false);
          this.userForm.get('isFNameAutoField').setValue(false);
          this.userForm.get('isLNameAutoField').setValue(false);
          for (const controlName in this.userForm.controls) {
            const control = this.userForm.get(controlName);
            control.reset();
            control.setErrors(null);
          }
        }
        this.addButtonDisabled = true;
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
  }

  public noWhitespaceValidator(control: FormControl) {
    return (control.value || '').trim().length ? null : { 'whitespace': true };
  }

  async ngOnInit(): Promise<void> {
    this.configurationService.getTeacherCornerConfigurations().pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.isWANotificationsDisabled = res?.disableWhatsAppNotifications;
    });

    this.configurationService.getTeacherConfig().pipe(first()).subscribe((res) => {
      this.teacherRoles = res?.['teacherRoles'];
    });

    this.userForm = this.fb.group({
      fName: [{ value: '', disabled: true }, [Validators.required, this.noWhitespaceValidator]],
      lName: [{ value: '', disabled: true }, [Validators.required, this.noWhitespaceValidator]],
      phone: ['', [Validators.required]],
      email: [{ value: '', disabled: true }, [Validators.email]],
      isEmailAutoField: [false],
      isFNameAutoField: [false],
      isLNameAutoField: [false],
      stemclubsinfo: new FormArray([]),
      userRole: [{ value: 'schoolTeacher', disabled: true }],
    });

    const watchList = [
      'phone',
      'email',
      'fName',
      'lName',
      'userRole',
    ];

    const unlocklist = [
      'email',
      'fName',
      'lName',
      'userRole',
      '',
    ];

    for (let i = 0; i < watchList.length; i++) {
      this.unlockFormSequentially(watchList[i], unlocklist[i]);
    }

    const allCls = this.classroomService.allClassroomByInstituteSub.subscribe(async (cls) => {
      if (cls.length) {
        const stemClubs = cls.filter(classroom => classroom.type === 'STEM-CLUB');
        this.stemClubs = stemClubs;
        this.countryCode = (await this.getCountryCode(cls)).countryCode;
        this.allStemclubs = this.getFilterStemClub(stemClubs, false);
        this.isLoaded = true;
      };
    });
    this.subscriptionRef.push(allCls);

    const selectedCls = this.selectedClassroomsSub.subscribe((res) => {
      if (res != null) {
        this.selectCls = res;
        const selectedClsRooms = this.getFilterStemClub(res, false);
        this.userForm.patchValue({
          allSelectedClassroom: [...selectedClsRooms],
        });
        const classRoomIdsArr = selectedClsRooms.map(cls => cls['classroomId']);
        this.registeredClsIds = classRoomIdsArr;
        this.selectedClsIds = classRoomIdsArr;
      }
    });
    this.subscriptionRef.push(selectedCls);

    this.getStemclubs();
  }

  stemclubsInfo(): FormArray {
    return this.userForm?.get('stemclubsinfo') as FormArray;
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
        //
      }
    }
    if (typeof (infoObj) != 'undefined') {
      const index = this.allStemclubs.findIndex(elem => elem.stemClubName == infoObj.selectedStemclub);
      this.removeStemclub(index);
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

  newStemClubInfo(infoObj) {
    return this.fb.group({
      stemclubList: [infoObj?.stemclubList || this.stemclubList, Validators.required],
      selectedStemclub: [infoObj?.selectedStemclub || '', Validators.required],
      programmesList: [infoObj?.programmesList || [], [Validators.required]],
      selectedProgrammes: [infoObj?.selectedProgrammes || [], [Validators.required]],
      classObj: [infoObj?.classObj || {}]
    });
  }

  getStemclubs() {
    this.instititutionSubRef.subscribe((instituteId) => {
      const query: QueryFn = (ref: CollectionReference) => ref.where('institutionId', '==', instituteId).where('type', '==', 'STEM-CLUB');
      this.classroomService.getWithQuery(query).pipe(take(1)).subscribe((res) => {
        this.stemclubsClone = res;
        this.allStemclubs = res;
        this.allStemClubsClone = JSON.parse(JSON.stringify(res));

        res.forEach((doc) => {
          if (!this.stemclubList?.includes(doc?.stemClubName)) {
            this.stemclubList?.push(doc?.stemClubName);
          }
        });
      });
    });
  }

  onSelectStemClub(event, index) {
    const cls = this.allStemclubs.find(doc => doc.stemClubName === event.value);
    this.stemclubsInfo()?.at(index).patchValue({
      programmesList: Object.values(cls.programmes),
      classObj: cls
    });
    this.stemclubsInfo().at(this.stemclubsInfo().length - 1).get('selectedProgrammes').enable();
    this.selectedStemClubName = event.value;
  }

  onSelectProgramme(event, i) {
    this.stemclubsInfo()?.at(i).disable();
    const classIndex = this.allStemclubs.findIndex(doc => doc.stemClubName === this.selectedStemClubName);

    if (classIndex != -1) {
      this.removeStemclub(classIndex);
    }

    if (this.allStemclubs.length == 0) {
      this.removeAddbutton = true;
      this.addButtonDisabled = true;
    }
    else {
      this.addButtonDisabled = false;
    }
  }

  removeStemclub(index) {
    this.allStemclubs.splice(index, 1);
    this.stemclubList = [];
    this.allStemclubs.forEach((doc) => {
      this.stemclubList.push(doc.stemClubName);
    });
  }

  addStemClub(stemClubName) {
    const stemClubs = this.allStemClubsClone.find(doc => doc.stemClubName === stemClubName);
    this.allStemclubs.push(stemClubs);
    this.stemclubList = [];
    this.allStemclubs.forEach((doc) => {
      this.stemclubList.push(doc.stemClubName);
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

  onSelectCsvFile(event) {
    const check = this.csvValidation(event.target.files[0].name);
    this.teacherInputFile = event.target.files[0].name;
    if (check) {
      this.chooseFile(event);
    }
    if (!check) {
      this.uiService.alertMessage('Invalid File Type', 'Only Accepts CSV File', 'error');
      this.teachersFileInput.nativeElement.value = '';
      this.teacherInputFile = '';
    }
  }

  csvValidation(el) {
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
    reader.onload = (event) => {
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
        if (item?.FirstName === '' && item?.LastName === '' && item?.['Country Code'] === '' && item?.['Phone Number'] === '' && item?.['Email(optional)'] === '' && item?.['Classroom Name'] === '' && item?.['Programme Code'] === '') {
          return;
        } else {
          return item;
        }
      });
      this.teachersJson = jsonData;
      if (!jsonData.length) {
        this.uiService.alertMessage('Empty File', 'No Data Inside The File', 'warning');
        this.teachersFileInput.nativeElement.value = '';
        this.teacherInputFile = '';
      }
      this.teachersFileInput.nativeElement.value = '';
    };
    reader.readAsBinaryString(file);
    this.logfileDownload = false;
  }

  getClsParse(clsName: string, programmes) {
    const programmesArr = Object.values(programmes);
    const splitCls = clsName?.split(' ');
    if (splitCls?.length == 2 && splitCls[1] == 'A') {
      programmesArr.forEach((p: any, i) => {
        if (i == 0) {
          clsName = `'${clsName} - ${p?.programmeName} (${p?.programmeCode})`;
        }
        else {
          clsName = `${clsName}, ${p?.programmeName} (${p?.programmeCode})`;
        }
      });
    } else {
      programmesArr.forEach((p: any, i) => {
        if (i == 0) {
          clsName = `${clsName} - ${p?.programmeName} (${p?.programmeCode})`;
        }
        else {
          clsName = `${clsName}, ${p?.programmeName} (${p?.programmeCode})`;
        }
      });
    }
    return clsName;
  }

  async downloadTemplate() {
    const allCls = this.stemClubs?.map(cls => ({ existCls: this.getClsParse(cls?.classroomName, cls?.programmes) }));
    this.exportToExcel(allCls, []);
  }

  async exportToExcel(existingClsRooms, teacherCls) {
    const { countryCode, countryName } = await this.getCountryCode(this.stemClubs);

    const clsHeader = [['List of Classrooms-Programmes']];
    const message = [['Notes:', '1. Please enter country code without phone number', '2. Please enter phone number without country code', '3. Please enter programme code only', '4. A sample has been provided for reference']];
    const messageTransposed = message[0].map((_, colIndex) => message.map(row => row[colIndex]));
    const Heading = [
      ['FirstName', 'LastName', 'Country Code', 'Phone Number', 'Email(optional)', 'Classroom Name', 'Programme Code'],
    ];
    // in case a sample is required
    const sample = [
      ['John', 'Doe', countryCode.toString(), '9876543210', 'john.doe@example.com', `${existingClsRooms?.[0]?.existCls?.match(/^\'([\s\S\d]+)\-/)?.[1]?.trim()}`, `${existingClsRooms?.[0]?.existCls?.match(/\(([\s\S\d]+)\)$/)?.[1]?.trim()}`],
    ];
    //Had to create a new workbook and then add the header
    const wb = XLSX.utils.book_new();
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.sheet_add_aoa(ws, Heading);

    XLSX.utils.sheet_add_aoa(ws, sample, { origin: 'A2' }); // add sample to sheet

    //Starting in the second row to avoid overriding and skipping headers
    XLSX.utils.sheet_add_json(ws, teacherCls || [], { origin: 'A2', skipHeader: true });

    XLSX.utils.sheet_add_aoa(ws, clsHeader, { origin: 'I1' });

    XLSX.utils.sheet_add_json(ws, existingClsRooms || [], {
      origin: 'I2',
      skipHeader: true,
    });

    XLSX.utils.sheet_add_aoa(ws, messageTransposed, {
      origin: `I${existingClsRooms?.length + 3}`,
    });

    XLSX.utils.book_append_sheet(wb, ws, 'sampleWB');

    this.convertAllCellsToText(wb, ws);

    XLSX.writeFile(wb, 'teachers upload template.xlsx', { bookType: 'xlsx', bookSST: false, type: 'binary' });
  }

  convertAllCellsToText(wb: any, ws: any) {
    // format all cells as text
    const range = XLSX.utils.decode_range(ws['!ref']);
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
    const regex = new RegExp('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$');
    this.isActiveloader = true;
    const filterCsvData = [];
    this.teachersJson.map((u) => {
      if (u['Country Code'] !== undefined && u['Phone Number'] !== undefined) {
        const user = {
          firstName: u['FirstName'].trim() || '',
          lastName: u['LastName'].trim() || '',
          fullNameLowerCase: `${(u['FirstName'].trim() || '').toLowerCase().replace(/ /g, '')}${(u['LastName'].trim() || '').toLowerCase().replace(/ /g, '')}`,
          countryCode: u['Country Code'].trim() || '',
          phoneNumber: (u['Phone Number']).toString().trim().replace(/ /g, ''),
          email: u['Email(optional)'] ? u['Email(optional)'].toLowerCase().replace(/ /g, '') : '',
          classroomName: u['Classroom Name'].trim() || '',
          emailValidator: u['Email(optional)'] != '' && u['Email(optional)'] != undefined ? regex.test(u['Email(optional)'].toLowerCase().replace(/ /g, '')) : '',
          phoneValidator: phone(u['Country Code'] + (u['Phone Number']).toString().replace(/ /g, '')).isValid ? true : false,
          status: '',
          programmes: u['Programme Code'].trim()
        };
        filterCsvData.push(user);
      }
    });

    await this.addBulkUpload(filterCsvData);
  }

  async addBulkUpload(filterTeacherData) {
    /* Classwise users */
    const clsWiseUsersObj = this.getClsWiseUsers(filterTeacherData, 'classroomName');

    /* Classwise adding Teachers */
    this.usersLogArr = [];
    for (const [key, valueUsers] of Object.entries(clsWiseUsersObj)) {
      const clsInfo = this.stemClubs?.find(cls => cls?.stemClubName == key.trim());
      const allUsersCls: any = valueUsers;
      const usersArr = await this.getFilterUsers(allUsersCls);
      const invalidatedUsers = usersArr[1];
      const validatedUsers = usersArr[0];

      if (clsInfo !== undefined) {
        const processUsers = validatedUsers?.map(u => ({
          isTeacher: true,
          firstName: u.firstName.trim(),
          lastName: u.lastName.trim(),
          fullNameLowerCase: u.fullNameLowerCase.trim(),
          countryCode: u.countryCode.trim(),
          phoneNumber: u.phoneNumber.trim(),
          email: u.email.trim(),
          teacherClassrooms: [
            {
              classroomName: clsInfo.classroomName,
              classroomId: clsInfo.classroomId,
              institutionName: clsInfo.institutionName,
              institutionId: clsInfo.institutionId,
              grade: clsInfo.grade,
              section: clsInfo.section,
              programmes: u.programmes.split(',').map(pId => Object.values(clsInfo.programmes).find((pInfo: any) => pInfo.programmeCode == pId)),
              type: clsInfo.type,
            }
          ]
        }));

        const formData = {
          usersJsonArr: processUsers,
          isTeacher: true,
          isBulkUpload: true,
        };

        // Invalid Users
        const invalidUserLogArr = this.getUserLogWithCls(invalidatedUsers, key);
        this.usersLogArr.push(...invalidUserLogArr);

        /* Add Users Into a Clsssroom */
        const userRes = await this.addTeacherIntoCls(formData);
        if (userRes?.length) {
          /* Send Whatsapp Notification After Added Cls */
          for (const user of userRes) {
            if (user?.status == 'Success') {
              if (!this.isWANotificationsDisabled) {
                try {
                  this.sendWaNotifications(user, formData['classroomInfo']);
                } catch (error) { console.error(error); };
              }
            }
          }
          // const storedUserLogArr = this.getUserLogWithCls(userRes, key);
          const storedUserLogArr = this.getUserLogWithCls(processUsers, key, 'Success');
          this.usersLogArr.push(...storedUserLogArr);
        }
      }
      /* Classroom Not Yet Created */
      else {
        const userLogArr = allUsersCls.map(existsU => ({
          'FirstName': existsU['firstName'] || '',
          'LastName': existsU['lastName'] || '',
          'Country Code': existsU['countryCode'] || '',
          'Phone Number': existsU['phoneNumber'] || '',
          'Email(optional)': existsU['email'] || '',
          'Classroom Name': key,
          'Status': 'Invalid classroom name'
        }));
        this.usersLogArr.push(...userLogArr);
      }
    }
    this.isActiveloader = false;
    this.logfileDownload = true;
    this.uiService.alertMessage('Successful', 'Uploaded Successfully', 'success');
  }

  async getFilterUsers(userData) {
    const validatedUsers = [];
    const inValidatedUsers = [];
    const countryCode = (await this.getCountryCode(this.stemClubs)).countryCode;
    userData?.map(async (user) => {
      if (user.countryCode !== countryCode) {
        user.status = 'Invalid country code';
        inValidatedUsers.push(user);
      }
      else if (user.phoneValidator === false) {
        user.status = 'Invalid phone number';
        inValidatedUsers.push(user);
      }
      else if (user.email !== '' && user.emailValidator === false) {
        user.status = 'Invalid email address';
        inValidatedUsers.push(user);
      }
      else if (user.firstName === '') {
        user.status = 'Invalid First Name ';
        inValidatedUsers.push(user);
      }
      else if (user.lastName === '') {
        user.status = 'Invalid Last Name';
        inValidatedUsers.push(user);
      }
      else {
        validatedUsers.push(user);
      }
    });
    return [validatedUsers, inValidatedUsers];
  }

  getUserLogWithCls(usersArr, classRoomName, status?) {
    let userLogArr = [];
    userLogArr = usersArr?.map((user: any) => ({
      'FirstName': user?.[0]?.firstName || user?.firstName || '',
      'LastName': user?.[0]?.lastName || user?.lastName || '',
      'CountryCode': user?.[0]?.countryCode || user?.countryCode || '',
      'PhoneNumber': user?.[0]?.phoneNumber || user?.phoneNumber || '',
      'Email(optional)': user?.[0]?.email || user?.email || '',
      'Classroom Name': classRoomName || '',
      'Status': user?.[0]?.status || user?.status || status || '',
    }));
    return userLogArr;
  }

  downloadLogFile() {
    const heading = [
      ['FirstName', 'LastName', 'Country Code', 'Phone Number', 'Email(optional)', 'Classroom Name', 'Status'],
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

  async addTeacherIntoCls(formData) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
    // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/users_add_into_classrooms_v2`;

    const httpOption: any = {
      responseType: 'application/json'
    };

    return await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise().then((res: any) => {
      const response = JSON.parse(res);
      if (response?.length) {
        formData['usersJsonArr'].map((teacher) => {
          if (!this.isWANotificationsDisabled) {
            this.sendWaNotifications(teacher, teacher['teacherClassrooms'][0]);
          }
          this.selectCls = '';
        });
        this.uiService.alertMessage('Successful', 'Teacher Added To Stem Club Successfully', 'success');
        return response;
      } else {
        return [];
      }
    }).catch(error =>
      error
      // console.error(error)
      // this.uiService.alertMessage('Error', error, 'error')
      // this.isActiveloader = false;
    );
  }

  getClsWiseUsers(arr, property) {
    return arr.reduce((memo, x) => {
      if (!memo[x[property]]) {
        memo[x[property]] = [];
      }
      memo[x[property]].push(x);
      return memo;
    }, {});
  }

  addIntoNewStemClub(stemClubIdsArr) {
    const filterStemClub = this.filterNewSelectedStemClub(stemClubIdsArr);

    this.userForm.patchValue({
      classroom: [...filterStemClub],
    });
  }

  filterNewSelectedStemClub(allSelectedStemCLubIdsArr) {
    const newStemClubSelected = this.allStemclubs.filter(
      stemClub =>
        allSelectedStemCLubIdsArr.includes(stemClub.classroomId) &&
        stemClub.isRegistered != true
    );
    return newStemClubSelected;
  }

  async checkUserInfo(countryCode, phoneNumber) {
    let userInfo = {};
    const query: QueryFn = (ref: CollectionReference) => ref.where('teacherMeta.countryCode', '==', countryCode).where('teacherMeta.phoneNumber', '==', phoneNumber);
    const docRef = lastValueFrom(await this.teacherService.getDocWithQuery(query));
    const userDocData: any = await docRef;
    userInfo = userDocData[0] || {};
    this.teacherDoc = userInfo;
    return userInfo;
  }

  async getAutoFieldsUserInfo(countryCode, phoneNumber) {
    const checkUserInfo: any = await this.checkUserInfo(countryCode, phoneNumber);

    if (checkUserInfo && Object.keys(checkUserInfo).length > 1) {
      const stemclubsArr = Object.values(checkUserInfo?.classrooms).filter((cls: any) => cls.type === 'STEM-CLUB');
      const userInfo: any = checkUserInfo?.teacherMeta || {};

      // get the user role for selected institution's stem clubs
      const stemClubsForSelectedInstitution = stemclubsArr.filter((classroom: any) => classroom.institutionId === this.instititutionSubRef.value);
      const userRoleForSelectedInstitution = Array.from(new Set(stemClubsForSelectedInstitution.map((classroom: any) => classroom.userRole).filter(classroom => classroom !== undefined)));
      if (userRoleForSelectedInstitution.length > 1) {
        console.error('more than one userRole for institution stem clubs', userRoleForSelectedInstitution);
      } else {
        this.userForm.patchValue({
          fName: userInfo?.firstName || '',
          lName: userInfo?.lastName || '',
          email: userInfo?.email || '',
          userRole: userRoleForSelectedInstitution[0] || 'schoolTeacher',
          isEmailAutoField: userInfo?.email && userInfo?.email !== '' ? true : false,
          isFNameAutoField: userInfo?.lastName && userInfo?.lastName !== '' ? true : false,
          isLNameAutoField: userInfo?.firstName && userInfo?.firstName !== '' ? true : false,
        });
      };

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
      };

      this.setStemclubsFormArray(stemclubsArr);
    }
  }

  isSubmitReady(): boolean {
    if (!this.userForm) return false;
    const baseValid = this.userForm.valid;
  
    const fa = this.stemclubsInfo();
    const arr = fa ? fa.getRawValue() : [];
    const hasEntry = Array.isArray(arr) && arr.length > 0;
  
    const allComplete =
      baseValid &&
      hasEntry ;
    return allComplete;
  }

  setStemclubsFormArray(stemclubArray) {
    if (stemclubArray.length) {
      for (const clsObj of stemclubArray) {
        if (clsObj?.programmes?.length) {
          const stemclubCls = this.stemclubsClone.find(doc => doc.classroomId == clsObj.classroomId);
          if (stemclubCls) {
            this.addNewStemClassInfo(stemclubCls, clsObj.programmes, true);
          }
        }
      }
    }
  }

  addNewStemClassInfo(classObj, programmesArray, infoLoaded?) {
    const infoObj = {
      stemclubList: this.stemclubList,
      selectedStemclub: classObj.stemClubName,
      programmesList: Object.values(classObj.programmes),
      selectedProgrammes: programmesArray,
      classObj: classObj
    };
    this.stemClubTobeFitlerd.push(infoObj);
    this.addStemclubInfo(infoObj, infoLoaded);
  }

  getFilterStemClub(stemClubArr, isRegistered) {
    const filterStemArr = stemClubArr?.map(stemClub =>
      Object.assign(stemClub, { 'isRegistered': isRegistered }));
    return filterStemArr;
  }

  onSubmit(form?) {
    this.stemClubTobeFitlerd = [];
    this.duplicateElem = [];
    this.processStemClubs(form.getRawValue());
  }

  processStemClubs(form) {
    this.uploading = true;

    const teacherStemClubs = form.stemclubsinfo.map(c => ({
      institutionId: c.classObj.institutionId,
      institutionName: c.classObj.institutionName,
      classroomId: c.classObj.classroomId,
      stemClubName: c.classObj.stemClubName,
      type: c.classObj.type,
      userRole: this.userForm.get('userRole').value,
      programmes: c.selectedProgrammes.map((prog) => {
        const { workflowIds, ...rest } = prog;
        return rest;
      })
    }));

    const teacherClassrooms = teacherStemClubs.filter(c => c.programmes.length != 0);

    const userDetailsWithClassroom = {
      isBulkUpload: false,
      isTeacher: true,
      firstName: form.fName.trim(),
      lastName: form.lName.trim(),
      fullNameLowerCase: `${form.fName.trim().toLowerCase().replace(/ /g, '')}${form.lName.trim().toLowerCase().replace(/ /g, '')}`,
      countryCode: this.countryCode,
      phoneNumber: form.phone,
      email: form.email,
      teacherClassrooms: teacherClassrooms,
    };

    this.addUsers(userDetailsWithClassroom);
  }

   async addUsers(userClassroom) {
    const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/users_add_into_classrooms_v2`;
    const formData = {
      userClassroomDetails: userClassroom
    };
    const httpOption: any = {
      responseType: 'application/json'
    };
    try {
      const response: any = await lastValueFrom(this.httpClient.post<any>(endUrl, formData, httpOption).pipe(first()));
      if (response) {
        if (!this.isWANotificationsDisabled) {
          formData.userClassroomDetails.teacherClassrooms.map((cls) => {
            this.sendWaNotifications(formData.userClassroomDetails, cls);
          });
        }
        this.uiService.alertMessage('Successful', 'Teacher Added To Classroom Successfully', 'success');
        this.userForm.reset();
       this.stemclubsInfo()?.clear();
        this.uploading = false;
        this.getStemclubs();
      } else {
        this.uiService.alertMessage('Oops', 'Please try again', 'error');
        this.stemclubsInfo()?.clear();
        this.uploading = false;
      }
    } catch (error) {
      console.error('HTTP Error:', error);
      this.uiService.alertMessage('Error', error?.message || 'Network error', 'error');
      this.uploading = false;
    }
  }

  async sendWaNotifications(teacher, cls) {
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
    }
    );

    const phoneNumber = teacher?.countryCode + teacher?.phoneNumber;
    const templateName = environment.whatsAppTemplates.teacherStemClubAddition.templateName;
    const headerImage = environment.whatsAppTemplates.teacherStemClubAddition.headerImage;
    const mediaType = 'image';
    const params = [
      `${teacher?.firstName} ${teacher?.lastName}`,
      cls?.institutionName,
      cls?.stemClubName,
      formattedString
    ];
    const urlRoute = undefined;

    this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);

    this.programmesTosend = [];
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
    const boardList = await lastValueFrom(internationalBoards);
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

  // Computed disabled state for Submit button
get isSubmitDisabled(): boolean {
  // If the form isn’t ready yet, keep disabled
  if (!this.userForm) {
    return true;
  }

  // Base form validity
  const formInvalid = this.userForm.invalid;

  // Require at least one STEM club added
  const stemclubsArray = this.stemclubsInfo();
  const noStemClubsAdded = !stemclubsArray || stemclubsArray.length === 0;

  // Require at least one programme selected in any added stem club
  const hasProgrammeSelected = !!stemclubsArray?.controls?.some(ctrl => {
    const programs = ctrl.get('selectedProgrammes')?.value;
    return Array.isArray(programs) && programs.length > 0;
  });

  // Disable if form invalid, none added, or no programme chosen
  return formInvalid || noStemClubsAdded || !hasProgrammeSelected;
}

  unlockFormSequentially(watch: string, unlock: string) {
    switch (watch) {
      case 'phone':
        this.userForm?.get(watch)?.valueChanges?.subscribe(async (inputPhone) => {
          if (inputPhone?.toString()?.length == 10) {
            this.getStemclubs();
            this.deleteButtonIsActive = [];
            this.removeAddbutton = false;
            setTimeout(() => {
              const phone = this.countryCode + inputPhone;
              this.currentUser = phone;
              this.getAutoFieldsUserInfo(this.countryCode, inputPhone);
            }, 700);
            if (this.userForm?.get('isEmailAutoField').value === false) {
              this.userForm?.get('email')?.enable();
            }
            if (this.userForm?.get('isFNameAutoField').value === false) {
              this.userForm?.get('fName')?.enable();
            };
            if (this.userForm?.get('isLNameAutoField').value === false) {
              this.userForm?.get('lName')?.enable();
            };
          }
          else {
            this.stemClubTobeFitlerd = [];
            this.userForm.patchValue({
              fName: '',
              lName: '',
              email: '',
              isEmailAutoField: false,
              isFNameAutoField: false,
              isLNameAutoField: false,
            });
            this.userForm?.get('email')?.disable();
            this.userForm?.get('fName')?.disable();
            this.userForm?.get('lName')?.disable();
            this.userForm?.get('userRole')?.disable();
            this.stemclubsInfo().controls = [];
          }
        });
        break;

      case 'userRole':
        this.userForm.get(watch).valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
          if (res) {
            this.addButtonDisabled = false;
          };
        });
        break;

      default:
        this.userForm?.get(watch)?.valueChanges?.subscribe((res) => {
          if (res) {
            this.userForm?.get(unlock).enable();
          }
        });
        break;
    }
  }

}
