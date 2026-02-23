import { Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { SchoolCreateComponent } from 'app/modules/registration/school-create/school-create.component';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { BehaviorSubject, Observable, Subject, first, lastValueFrom, map, takeUntil } from 'rxjs';

@Component({
  selector: 'app-contest-visibility',
  templateUrl: './contest-visibility.component.html',
  styleUrls: ['./contest-visibility.component.scss']
})
export class ContestVisibilityComponent implements OnInit {
  @Output() contestVisibiltyInfo: EventEmitter<any> = new EventEmitter();
  @Input() contestInfo;
  @Input() contestCategories;
  @Input() allinst;
  @Output() institutionCountry: EventEmitter<any> = new EventEmitter();
  @Input() stepper: MatStepper;
  @Input() instititutionSubRef: BehaviorSubject<any>;
  @Input() isUpdate;
  @ViewChild('elementRefInstitute')

  catagoriesGrades;
  institutionClassrooms;
  buttondisabled = false;
  elementRefInstitute: ElementRef;
  isBulkUpload: boolean = false;
  loader: boolean = false;
  currentUser;
  boardList = [];
  allInst: any[] = [];
  InstituteInputFile: any;
  institutionsJson: any;
  bulkInstituteBoardSel = false;
  searchBtnClick = false;
  institutions$: Observable<any[]> = new Observable<any[]>();
  currentInstitutionSelected;
  institutionsTeacher$;
  institutions;
  classrooms$: any;
  isWANotificationsDisabled: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  teacherCountryCode: string;
  countryBoard: Array<string>;
  countryCodes: any;
  isAddNewBoard: boolean = false;
  isLoaded: boolean = false;
  boardData: any;
  deleteLoader: boolean = false;
  existingDatelength: number = 0;
  teacherCountry: string;
  storageUrl = environment.firebase.projectId;
  selectedCountryCode: string | null = null;
  schools: string[] = [];
  boards: string[] = [];
  contestCreate$: any;
  institutionsExist: boolean = false;
  selectedInstitutions: any[] = [];
  instClassrooms: any[] = [];
  isUpdateContest: boolean = false;
  nextButtonDisabled: boolean = true;
  usedInstitutionIds: any[] = [];
  existingInstIds: any = [];
  contestCreate = this.fb.group({
    // institutionName: [[]],
    // classrooms:[[]],
    institutions: this.fb.array([]),
    country: [''],
  });
  schoolsSelected: boolean = false;
  allInstitutions: any[] = [];

  constructor(
    private configurationService: ConfigurationService,
    public dialog: MatDialog,
    private fb: FormBuilder,
    private uiService: UiService,
    private institutionsService: InstitutionsService,
    private classroomService: ClassroomsService,
    private afAuth: AngularFireAuth,
    private userService: UserService,
  ) {
    this.buttondisabled = false;
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit() {
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    this.currentUser = currentUser;
    const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.contestCreate, this.isLoaded);
    [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

    this.configurationService.boardListSub.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      if (res == null) {
        this.configurationService.getBoardList('BoardListAll');
      } else {
        this.boardList = [...this.boardList, ...res]?.filter(e => e.code !== 'ICSE');
      }
    });

    this.configurationService.getTeacherCornerConfigurations().pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.isWANotificationsDisabled = res?.disableWhatsAppNotifications;
    });

    const watchlist = ['country', 'pincode', 'board', 'institutionName'];
    const unlockList = ['pincode', 'board', 'institutionName'];

    for (let i = 0; i < watchlist.length; i++) {
      this.unlockFormSequentially(watchlist[i], unlockList[i]);
    }

    this.contestCreate.valueChanges.subscribe(() => {
      this.checkNextButtonStatus();
    });

    this.isUpdateContest = !!this.contestInfo;

    if (this.isUpdateContest && this.contestInfo?.contestVisibilityToInstitutions) {
      this.buttondisabled = false;
      // this.contestCreate.get('institutionName').setValue(selectedInstitutions);
      Object.keys(this.contestInfo.contestVisibilityToInstitutions).forEach(async (k, index) => {
        await this.assignInstitutionsdata(this.contestInfo.contestVisibilityToInstitutions[k], index);
        const classrooms = this.contestInfo.contestVisibilityToInstitutions[k].classrooms;
        this.contestInfo.contestVisibilityToInstitutions[k].classrooms = this.getClasses(classrooms);
      });

      const institutionIds = Object.keys(this.contestInfo.contestVisibilityToInstitutions);
      this.existingInstIds = institutionIds;
      this.existingDatelength = institutionIds.length;

      await this.getInstitutionClassrooms(institutionIds);
      Object.keys(this.contestInfo.contestVisibilityToInstitutions).forEach((k) => {
        this.assignExistingInstitutions(this.contestInfo.contestVisibilityToInstitutions[k]);
      });
    }

    this.classrooms.value.forEach((val, index) => {
      if (index < this.existingDatelength) {
        this.classrooms.at(index).disable();
      }
    });

    this.checkNextButtonStatus();
  }

  get classrooms() {
    return this.contestCreate.get('institutions') as FormArray;
  }

  getFormGroup(categ?): FormGroup {
    return this.fb.group<any>({
      institutionName: [''],
      institutionId: ['', [Validators.required]],
      board: ['', [Validators.required]],
      pincode: ['', [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
      classroomArr: [[], [Validators.required]], // Will now contain objects with {grade: number, image: any}
    });
  }

  async addNewInstitutionToContest() {
    this.instClassrooms[this.classrooms.length] = { docId: '', classrooms: '' };
    const newInstitutions = this.getFormGroup({ institutionName: '', pincode: '', board: '', classroomArr: '', institutionId: '' });
    this.classrooms.push(newInstitutions);
    this.buttondisabled = !this.checkAddButton();
    this.classrooms.value.forEach((value) => {
      if (value.institutionId !== '') {
        this.usedInstitutionIds.push(value.institutionId);
      }
    });
  }

  async removeInstitution(index) {
    const formArr: FormArray = this.classrooms;
    const instid = this.classrooms.at(index).get('institutionId').value;
    const classIds = this.classrooms.at(index).get('classroomArr').value;
    formArr.removeAt(index);
    this.allInstitutions.splice(index, 1);
    this.instClassrooms.splice(index, 1);
    this.buttondisabled = !this.checkAddButton();
    if (this.classrooms.length == 0) { this.buttondisabled = false; }
    this.usedInstitutionIds.filter(d => d != instid);
    if (index < this.existingInstIds.length && this.isUpdate == true) {
      this.existingInstIds = this.existingInstIds.filter(d => d !== instid);
      this.existingDatelength = this.existingInstIds.length;
      this.deleteLoader = true;
      await this.deletecontestIdsFromInstitutionClassrooms(classIds);
      this.deleteLoader = false;
      this.uiService.alertMessage('Successful', 'contests are unassigned from the classrooms', 'success');
    }
  }

  async deletecontestIdsFromInstitutionClassrooms(classids) {
    const classroomPromiseArr: any = await Promise.all(classids.map(d => this.classroomService.getClassroomDataById(d)));
    const promises = classroomPromiseArr.map(classroom => new Promise((resolve) => {
      delete classroom.linkedContestId[this.contestInfo.docId];
      resolve(this.classroomService.updateWithoutMerge(classroom, classroom.docId));
    }));
    await Promise.all(promises);
  }

  async changeStatusofInstitutionClassrooms(classIds) {
    const promises = classIds.map(id => new Promise(async (resolve) => {
      const obj = {
        linkedContestId: {
          [this.contestInfo.docId]: {
            docId: this.contestInfo.docId,
            contestTitle: this.contestInfo.contestTitle,
            status: 'inactive'
          }
        }
      };
      resolve(this.classroomService.update(obj, id));
    }));
    await promises;
  }

  async assignInstitutionsdata(data, index) {
    const board = data.board;
    const pincode = data.pincode;
    this.allInstitutions[index] = await this.getInstitututionswithQuery(board, pincode);
  }

  async getInstitutionClassrooms(instIds) {
    const promises = Promise.all(instIds.map((id, index) => new Promise(async (resolve) => {
      const classrooms = await this.getClassrooms(id);
      this.instClassrooms[index] = { docId: id, classrooms: classrooms };
      resolve(classrooms);
    }))
    );
    await promises;
  }

  async boardChange(event, index) {
    this.classrooms.at(index).get('board').patchValue(event.value);
    let allinstitutions: any = await this.getInstitututionswithQuery(event.value, this.classrooms.at(index).get('pincode').value);

    if (this.isUpdate && this.existingInstIds) {
      allinstitutions = allinstitutions.filter(d => !this.existingInstIds.includes(d.institutionId));
    }

    this.allInstitutions[index] = allinstitutions.filter(d => !this.usedInstitutionIds.includes(d.institutionId));
  }

  pincodeChange(event, index) {
    this.classrooms.at(index).get('pincode').patchValue(event.target.value);
    this.classrooms.at(index).get('board').reset();
    this.classrooms.at(index).get('institutionId').reset();
    this.classrooms.at(index).get('institutionName').reset();
  }

  assignExistingInstitutions(institutioinData) {
    this.addNewInstitutionClassrooms(institutioinData);
  }

  async addNewInstitutionClassrooms(institutioinData) {
    const mappedClassrooms = institutioinData.classrooms.map(d => d.classroomId);

    const fbgroup = this.fb.group<any>({
      institutionName: [institutioinData.institutionName || '', Validators.required],
      institutionId: [institutioinData.institutionId || ''],
      pincode: [institutioinData.pincode || ''],
      board: [institutioinData.board || ''],
      classroomArr: [mappedClassrooms || []], // Will now contain objects with {grade: number, image: any}
    });

    this.classrooms.push(fbgroup);
  }

  getClasses(classrooms) {
    const obj = Object.keys(classrooms).map(key => classrooms[key]);

    return obj;
  }

  checkNextButtonStatus() {
    if (this.isUpdateContest) {
      this.enableNextButton();
    } else {
      if (this.isFormValid()) {
        this.enableNextButton();
      } else {
        this.disableNextButton();
      }
    }
  }

  enableNextButton() {
    this.nextButtonDisabled = false;
  }

  disableNextButton() {
    this.nextButtonDisabled = true;
  }

  isFormValid(): boolean {
    return this.contestCreate.valid;
  }

  patchFormValue(contest: any): void {
    if (contest?.contestVisibilityToInstitutions) {
      //   this.contestCreate.patchValue({
      //     institutionName: institutionIds,
      //   });
      // } else {
      // }
    }
  }

  async getInstitutions() {
    // Only proceed with query if both board and pincode have values
    this.instClassrooms[0] = { docId: '', classrooms: '' };
    // this.allInstitutions[this.classrooms.length-1] = await this.getInstitututionswithQuery()
  }

  async addInstitute() {
    await import('app/modules/registration/school-create/school-create.component').then(() => {
    });
  }

  async onInstitutionUpload(event) {
    // this.loader = true
    // await this.processInstitutionData(this.institutionsJson)
    // this.bulkInstituteBoardSel = false
    // this.elementRefInstitute.nativeElement.value = ''
    // this.InstituteInputFile = ''
  }

  // async processInstitutionData(arr) {
  //   const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
  //   const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
  //   for (let d of arr) {
  //     let representativeCountryCode = d['Contact Person Country Code']
  //     let representativePhoneNumber = (d['Contact Person Number'] || '').toString().trim()
  //     let pincode = d['Institute Pincode'].toString().trim()
  //     const id = this.institutionService.getRandomGeneratedId()
  //     const obj = {
  //       docId: id,
  //       createdAt: serverTimestamp(),
  //       medium: d['Medium of Instruction'] || '',
  //       institutiontype: 'school',
  //       // board: this.instiBulkBoard,
  //       board: this.contestCreate?.get('board')?.value?.toString(),
  //       institutionName: d['Institute Name'] || '',
  //       institutionAddress: {
  //         street: d['Street Name'] || '',
  //         city: d['City Name'] || '',
  //         village: d['Locality Name'] || '',
  //         state: d['State Name'] || '',
  //         district: d['District Name'] || '',
  //         subDistrict: d['Sub District Name'] || '',
  //         pincode: pincode || '',
  //       },
  //       institutionCreatorCountryCode: currentUser?.countryCode || '',
  //       institutionCreatorPhoneNumber: currentUser?.phoneNumber || '',
  //       representativeFirstName: d['Contact Person First Name'] || '',
  //       representativeLastName: d['Contact Person Last Name'] || '',
  //       representativeEmail: d['Contact Person Email'] || '',
  //       representativeCountryCode: representativeCountryCode,
  //       representativePhoneNumber: representativePhoneNumber,
  //       registrationNumber: d['Institute Affiliation Number'] || '',
  //       typeofSchool: d['typeofSchool'] || '',
  //       creationDate: serverTimestamp(),
  //       institutionId: id,
  //       verificationStatus: false,
  //     }
  //     let masterInstDoc: MasterInstituteDoc = {
  //       docId: obj.docId,
  //       board: obj.board, /* Board Code */
  //       institutionName: obj.institutionName,
  //       institutionCreatorCountryCode: obj.institutionCreatorCountryCode,
  //       institutionCreatorPhoneNumber: obj.institutionCreatorPhoneNumber,
  //       registrationNumber: obj.registrationNumber,
  //       representativeFirstName: obj.representativeFirstName,
  //       representativeLastName: obj.representativeLastName,
  //       representativeCountryCode: obj.representativeCountryCode,
  //       representativePhoneNumber: obj.representativePhoneNumber,
  //       creationDate: new Date(),
  //       pincode: obj.institutionAddress.pincode,
  //       typeofSchool: obj?.typeofSchool,
  //       verificationStatus: obj.verificationStatus,
  //     }
  //     await this.institutionService.update(obj, id);
  //     await this.masterService.addInstitution(masterInstDoc);
  //   }
  //   this.loader = false
  //   // this.instiBulkBoard = ''
  //   this.uiService.alertMessage('Successful', 'Institute Successfully Added', 'success')
  // }

  async getInstitututionswithQuery(board, pincode): Promise<any[]> {
    return new Promise((resolve) => {
      // this.classrooms.valueChanges.subscribe((values) => {
      // });
      // this.classrooms.controls.forEach((group, index) => {
      //   group.valueChanges.subscribe((groupValues) => {
      //   });
      // });
      const boardValue = board;

      const pincodeValue = pincode;

      if (boardValue && pincodeValue) {
        const query: QueryFn = (ref: CollectionReference) =>
          ref.where('board', '==', boardValue)
            .where('institutionAddress.pincode', '==', pincodeValue)
            .orderBy('institutionName', 'asc');
        this.institutionsService.getWithQuery(query).pipe(
          map((response: any) => {
            if (this.currentUser?.accessLevel < 11) {
              return response.filter(res => res.institutionName != 'ThinkTac');
            }
            return response;
          })
        ).subscribe((res) => {
          // this.allInstitutions = res
          resolve(res);
        });
      }
    });
  }


  async getClassrooms(institutionId: string) {
    const institutiionsClassrooms = await lastValueFrom(this.classroomService.getAllClassroomByInstitute(institutionId));
    return institutiionsClassrooms.filter(classroom => classroom);
  }

  async getExistingClassroomdata(id, index) {
    this.institutionClassrooms = await this.getClassrooms(id);
    this.instClassrooms[index] = { docId: id, classrooms: this.institutionClassrooms };
  }


  async onSchoolSelection(selectedDocId: string, index: number) {
    // Find the full school object from the allInstitutions array
    const selectedSchool = this.allInstitutions[index].find(school => school.docId === selectedDocId);
    if (selectedSchool) {
      // Perform any action with the selected school object
      // For example, patching a FormArray:
      const formArray = this.contestCreate.get('institutions') as FormArray;
      if (formArray.at(index)) {
        formArray.at(index).patchValue({
          institutionName: selectedSchool.institutionName,
          // board: selectedSchool.docId,
          // pincode: selectedSchool.institutionAddress.pincode,
          classroomArr: []
        });
      }
    }
    this.institutionClassrooms = await this.getClassrooms(selectedSchool.docId);
    this.instClassrooms[index] = { docId: selectedDocId, classrooms: this.institutionClassrooms };
    // this.currentInstitutionSelected = w.data()
  }

  onClassroomSelection(event, i) {
    this.classrooms.at(i).get('classroomArr').patchValue(event.value);
    //this.classrooms.at(i).disable()
    this.buttondisabled = !this.checkAddButton();
  }

  onClassroomSelectionCompleted() {
    // this.buttondisabled=this.checkAddButton()
  }

  checkAddButton() {
    if (this.isUpdate) {
      const filteredControls = this.classrooms.controls.filter((group, index) => index > this.existingInstIds.length);
      // Use `every` to check if all filtered controls are valid
      const allFilteredControlsValid = filteredControls.every(group => group.valid);
      return allFilteredControlsValid;
    }
    else {
      return this.classrooms.controls.every(group => group.valid);
    }
  }

  // onClassroomSelection(event: MatSelectChange) {
  //  // this.contestCreate.get('classrooms').setValue(event.value)
  // }

  async onContinue() {
    const formValues = this.contestCreate.getRawValue();
    // const board = formValues.board;
    // const pincode = formValues.pincode;
    // this.institutions$.subscribe(async(institutions) => {
    // const institutionsMap = new Map(
    //   institutions.map((school) => [
    //     school.payload.doc.id,
    //     school.payload.doc.data().institutionName,
    //   ])
    // );

    const newInstitutions1 = formValues.institutions
      .map((institution: any, index) => {
        const classroomids = institution.classroomArr;
        const obj = {
          pincode: institution.pincode,
          board: institution.board,
          institutionName: institution.institutionName,
          docId: institution.institutionId,
          classrooms: this.instClassrooms[index].classrooms
            .filter(classroomObj => classroomids.includes(classroomObj.docId))
            .map(classroom =>
              classroom.type !== 'STEM-CLUB'
                ? { classroomName: classroom.classroomName, docId: classroom.docId }
                : { stemClubName: classroom.stemClubName, docId: classroom.docId }
            )
        };
        return obj;
      });
    const result: any = newInstitutions1;

    const cards = [];
    if (result.length > 0) {
      result.forEach((r) => {
        const newCard = {
          pincode: r.pincode,
          board: r.board,
          docId: r.docId,
          institutionName: r.institutionName,
          classrooms: r.classrooms
        };
        cards.push(newCard);
      });

      // const existingCard = this.selectedInstitutions.find(
      //   (card) => card.pincode === pincode && card.board === board
      // );
      // if (existingCard) {
      //   result.forEach((newInstitution: any) => {
      //     const institutionExists = existingCard.institutions.some(
      //       (inst) => inst.docId === newInstitution.docId
      //     );
      //     if (!institutionExists) {
      //       existingCard.institutions.push(newInstitution);
      //     }
      //   });
      // } else {
      this.selectedInstitutions = cards;
    }
    // }

    // const mergedData = this.mergeExistingAndNewData(
    //   this.contestInfo?.contestVisibilityToInstitutions || {},
    //   this.selectedInstitutions
    // );
    this.contestVisibiltyInfo.emit(this.selectedInstitutions);
    //  });
  }

  // async createSchool() {
  //   await import('app/modules/registration/school-create/school-create.component').then(() => {
  //   });
  // }

  async createSchool(index: number) {
    const institutionsArray = this.contestCreate.get('institutions') as FormArray;
    const institutionGroup = institutionsArray.at(index);
    const pin = institutionGroup?.get('pincode')?.value;
    const board = institutionGroup?.get('board')?.value;
    await import('app/modules/registration/school-create/school-create.component').then(() => {
      const dialogRef = this.dialog.open(SchoolCreateComponent, {
        data: {
          parent: "contest-visibility",
          pin: pin,
          board: board,
          createdSource: 'contest-visibility',
          country: this.teacherCountry,
          countryCode: this.teacherCountryCode,
        },
      });

      dialogRef.afterClosed().subscribe((createdInstitution) => {
        if (createdInstitution) {
          this.loadInstitutes(pin, board);
          this.institutions$.pipe(first()).subscribe((schools) => {
            const matchedSchool = schools.find(school => {
              const data = school.payload.doc.data();
              const schoolId = data.institutionId || data.docId || data.id;
              const createdId = createdInstitution.institutionId || createdInstitution.docId || createdInstitution.id;
              return schoolId === createdId;
            });

            // if (matchedSchool) {
            //   const matchedData = matchedSchool.payload.doc.data();
            //   // (this.contestCreate.get('institutions') as FormArray).push(this.fb.group(matchedData));
            //   const fbgroup = this.fb.group({
            //     // institutionName: [matchedData.institutionName || '', Validators.required],
            //     institutionId: [matchedData.institutionId || matchedData.docId || '', Validators.required],
            //     board: [matchedData.board || '', Validators.required],
            //     pincode: [
            //       matchedData.pincode ||
            //       matchedData.institutionAddress?.pincode ||
            //       '', [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]
            //     ],
            //     classroomArr: [[], Validators.required]
            //   });
            //   (this.contestCreate.get('institutions') as FormArray).push(fbgroup);
            // }

            if (matchedSchool) {
              const matchedData = matchedSchool.payload.doc.data();
              const formArray = this.contestCreate.get('institutions') as FormArray;
              if (formArray.at(index)) {
                formArray.at(index).patchValue({
                  institutionName: matchedData.institutionName || '',
                  institutionId: matchedData.institutionId || matchedData.docId || '',
                  board: matchedData.board || '',
                  pincode: matchedData.pincode || matchedData.institutionAddress?.pincode || '',
                  classroomArr: []
                });
                // Update classrooms for this institution
                this.getExistingClassroomdata(matchedData.institutionId || matchedData.docId, index);

                // Fetch and update the dropdown options for this index
                this.getInstitututionswithQuery(matchedData.board, matchedData.pincode || matchedData.institutionAddress?.pincode)
                  .then((institutions) => {
                    this.allInstitutions[index] = institutions;
                  });
              }
            }
          });
        }
      });
    });
  }

  async saveNewBoard() {
    const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.contestCreate, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
    [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
  }

  unlockFormSequentially(watch: string, unlock: string) {
    switch (watch) {
      case 'country':
        const countryName = this.contestCreate?.get(watch)?.value;
        if (countryName) {
          const country = countryName?.includes(' ') ? countryName?.toLowerCase()?.replace(/\s/g, '-') : countryName?.toLowerCase();
          const internationalBoards = this.boardData?.boardsInternational;
          this.teacherCountry = country;
          this.teacherCountryCode = this.countryCodes?.[country]?.phone;
          this.countryBoard = internationalBoards?.[country];
          this.contestCreate?.get(unlock)?.enable();
          this.isAddNewBoard = false;
        };
        this.contestCreate?.get(watch)?.valueChanges?.subscribe((res) => {
          if (res) {
            const country = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
            const internationalBoards = this.boardData?.boardsInternational;
            this.teacherCountry = country;
            this.teacherCountryCode = this.countryCodes?.[country]?.phone;
            this.countryBoard = internationalBoards?.[country];
            this.isAddNewBoard = false;
            this.contestCreate?.get(unlock)?.reset();
            this.contestCreate?.get(unlock)?.enable();
            //this.contestCreate?.get('board')?.disable();
          };
        });
        break;

      case 'pincode':
        // this.contestCreate?.get(watch)?.valueChanges?.subscribe(res => {
        //   if (/^\d{4,6}|[\w\d]+( )|( - )[\w\d]+$/.test(res?.toString())) {
        //     this.classrooms.clear()
        //   //  this.contestCreate.get('board').reset()
        //     this.contestCreate?.get(unlock)?.enable();
        //   };
        // });
        break;

      case 'board':
        // this.contestCreate?.get(watch)?.valueChanges?.subscribe(res => {
        //   if (res && res !== null) {
        //     this.getInstitutions();
        //     this.buttondisabled = false
        //     this.contestCreate?.get(unlock)?.enable();
        //   }
        //   else {
        //     this.buttondisabled = true
        //   }
        // });
        break;

      case 'institutionName':
        // this.contestCreate?.get(watch)?.valueChanges?.subscribe(res => {
        //   if (res) {
        //     //   this.getInstitutions();
        //     this.contestCreate?.get(unlock)?.enable();
        //   }
        // });
        break;

      default:
        this.contestCreate?.get(watch)?.valueChanges?.subscribe((res) => {
          if (res) {
            this.contestCreate?.get(unlock)?.enable();
          }
        });
        break;
    }
  }


  loadInstitutes(pin: any, board: any) {
    const query: QueryFn = (ref: CollectionReference) =>
      ref
        .where('board', '==', board)
        .where(
          'institutionAddress.pincode',
          '==',
          pin
        )
        .orderBy('institutionName', 'asc');

    this.institutions$ = this.institutionsService.getSnapshot(query);
  }
}
