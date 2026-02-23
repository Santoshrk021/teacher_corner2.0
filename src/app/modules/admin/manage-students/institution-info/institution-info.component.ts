import { HttpClient } from '@angular/common/http';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { serverTimestamp } from '@angular/fire/firestore';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, first, lastValueFrom, map, Subject, take, takeUntil } from 'rxjs';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { representativeEmailExistValidator, representativeEmailValidator, representativeNameExistValidator, representativeNameValidator, representativePhoneExistValidator, representativePhoneValidator } from 'app/modules/registration/school-create/custom-validators/representativeValidators.directive';
import { environment } from 'environments/environment';
import phone from 'phone';
import { MatStepper } from '@angular/material/stepper';
import { UiService } from 'app/shared/ui.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { MasterInstituteDoc } from 'app/core/dbOperations/master/master.types';
import { SchoolCreateComponent } from 'app/modules/registration/school-create/school-create.component';
import { MatSelectChange } from '@angular/material/select';

@Component({
  selector: 'app-institution-info',
  templateUrl: './institution-info.component.html',
  styleUrls: ['./institution-info.component.scss']
})
export class InstitutionInfoComponent implements OnInit {

  @ViewChild('elementRefInstitute')
  elementRefInstitute: ElementRef;
  @Output() institutionInfoEmitter: EventEmitter<any> = new EventEmitter();
  @Input() stepper: MatStepper;
  @Input() instititutionSubRef: BehaviorSubject<any>;
  @Input() showContinueButton = true;
  @Input() skipInstitutionCodeValidation = false;

  currentUser: any;
  boardList = [];
  institutions$;
  classrooms$: any;
  classCreate = this.fb.group({
    board: [{ value: null, disabled: true }, [Validators.required]],
    pincode: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
    institutionData: [{ value: '', disabled: true }, [Validators.required]],
    // classInfo: this.fb.array([]),
    classroomData: [''],
    institutionId: [''],
    institutionCode: [''],
    country: [''],
  });
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  teacherCountryCode: string;
  countryBoard: Array<string>;
  countryCodes: any;
  isAddNewBoard: boolean = false;
  isLoaded: boolean = false;
  boardData: any;
  teacherCountry: string;

  constructor(
    private configurationService: ConfigurationService,
    public dialog: MatDialog,
    private fb: FormBuilder,
    private uiService: UiService,
    private institutionService: InstitutionsService,
    private institutionsService: InstitutionsService,
    private classroomService: ClassroomsService,
    private afAuth: AngularFireAuth,
    private userService: UserService,
  ) { }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit(): Promise<void> {
    let currentUser: any;
    currentUser = await lastValueFrom(this.userService.userInfoSub.pipe(first()));
    if (!currentUser) {
      const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
      currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    }
    this.currentUser = currentUser;
    const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.classCreate, this.isLoaded);
    [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

    this.configurationService.boardListSub.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      if (res == null) {
        this.configurationService.getBoardList('BoardListAll');
      } else {
        this.boardList = [...this.boardList, ...res]?.filter(e => e.code !== 'ICSE');
      }
    });

    const watchlist = [
      'country',
      'pincode',
      'board'
    ];

    const unlockList = [
      'pincode',
      'board',
      'institutionData'
    ];

    for (let i = 0; i < watchlist.length; i++) {
      this.unlockFormSequentially(watchlist[i], unlockList[i]);
    };
  }

  getInstitutions() {
    const query: QueryFn = (ref: CollectionReference) =>
      ref.where('board', '==', this.classCreate.get('board').value)
        .where('institutionAddress.pincode', '==', this.classCreate.get('pincode').value)
        .orderBy('institutionName', 'asc');

    this.institutions$ = this.institutionsService.getSnapshot(query).pipe(
      map((response: any) => {
        const b = [];
        if (this.currentUser.accessLevel < 11) {
          return response.filter(res => res.payload.doc.data().institutionName != 'ThinkTac');
        }
        else {
          return response;
        };
      })
    );
  }

  getAllClassrooms(school) {
    this.institutionService.selectedInstitution.next(school);
    this.classroomService.getAllClassroomByInstitute(school?.institutionId).pipe(take(1)).subscribe((cls) => {
      this.classrooms$ = cls;
    });
    this.classCreate.patchValue({
      'institutionId': school['institutionId']
    });
  }

  onclassCreateSubmit(classCreate) {
  }

  onContinue() {
    const institution: any = this.classCreate.get('institutionData').value;
    if (!institution) {
      this.uiService.alertMessage('Error', 'Please select an institution', 'error');
      return;
    }

    if (!this.skipInstitutionCodeValidation) {
      if (institution.hasOwnProperty('institutionCode')) {
        if (institution?.institutionCode?.toString()?.length) {
          this.classCreate.get('institutionCode').patchValue(institution?.institutionCode?.toString());
        } else {
          this.uiService.alertMessage('Error', `Institution Code not added for institution "${institution?.institutionName}"`, 'error');
          return;
        }
      } else {
        this.uiService.alertMessage('Error', `Institution Code for institution "${institution?.institutionName}" is blank`, 'error');
        return;
      }
    }

    if (this.instititutionSubRef) {
      this.instititutionSubRef.next(this.classCreate.value.institutionId);
    }
    this.institutionInfoEmitter.emit(this.classCreate.value);
    if (this.stepper) {
      this.stepper.next();
    }
  }

  async createSchool() {
    await import('../../../registration/school-create/school-create.module').then(() => {
      const dialogRef = this.dialog.open(SchoolCreateComponent, {
        data: {
          parent: 'institute-selection',
          country: this.classCreate.get('country').value,
          countryCode: this.teacherCountryCode,
          pin: this.classCreate.get('pincode').value,
          board: this.classCreate.get('board').value,
          createdSource:'student-manager'
          // lang: this.languageList
        }
      });
    });
  }

  onChangeInstitution(event: MatSelectChange) {
    this.getAllClassrooms(event?.value);

    // When reused in a dialog (like Outreach) and the internal Continue button is hidden,
    // emit immediately on selection so parent can enable Save.
    if (this.showContinueButton === false) {
      const institution: any = event?.value;
      if (institution) {
        if (!this.skipInstitutionCodeValidation) {
          if (institution.hasOwnProperty('institutionCode')) {
            if (institution?.institutionCode?.toString()?.length) {
              this.classCreate.get('institutionCode').patchValue(institution?.institutionCode?.toString());
            } else {
              this.uiService.alertMessage('Error', `Institution Code not added for institution "${institution?.institutionName}"`, 'error');
              return;
            }
          } else {
            this.uiService.alertMessage('Error', `Institution Code for institution "${institution?.institutionName}" is blank`, 'error');
            return;
          }
        }

        if (this.instititutionSubRef) {
          this.instititutionSubRef.next(this.classCreate.value.institutionId);
        }
        this.institutionInfoEmitter.emit(this.classCreate.value);
      }
    }
  }

  async saveNewBoard() {
    const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.classCreate, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
    [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
  }

  unlockFormSequentially(watch: string, unlock: string) {
    switch (watch) {
      case 'country':
        const countryName = this.classCreate?.get(watch)?.value;
        if (countryName) {
          const country = countryName?.includes(' ') ? countryName?.toLowerCase()?.replace(/\s/g, '-') : countryName?.toLowerCase();
          const internationalBoards = this.boardData?.boardsInternational;
          this.teacherCountry = country;
          this.teacherCountryCode = this.countryCodes?.[country]?.phone;
          this.countryBoard = internationalBoards?.[country];
          this.classCreate?.get(unlock)?.enable();
          this.isAddNewBoard = false;
        };
        this.classCreate?.get(watch)?.valueChanges?.subscribe((res) => {
          if (res) {
            const country = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
            const internationalBoards = this.boardData?.boardsInternational;
            this.teacherCountry = country;
            this.teacherCountryCode = this.countryCodes?.[country]?.phone;
            this.countryBoard = internationalBoards?.[country];
            this.isAddNewBoard = false;
            this.classCreate?.get(unlock)?.reset();
            this.classCreate?.get(unlock)?.enable();
            this.classCreate?.get('board')?.disable();
          };
        });
        break;

      case 'pincode':
        this.classCreate?.get(watch)?.valueChanges?.subscribe((res) => {
          if (/^\d{4,6}|[\w\d]+( )|( - )[\w\d]+$/.test(res?.toString())) {
            this.classCreate?.get(unlock)?.enable();
          };
        });
        break;

      case 'board':
        this.classCreate?.get(watch)?.valueChanges?.subscribe((res) => {
          if (res) {
            this.getInstitutions();
            this.classCreate?.get(unlock)?.enable();
          }
        });
        break;

      default:
        this.classCreate?.get(watch)?.valueChanges?.subscribe((res) => {
          if (res) {
            this.classCreate?.get(unlock)?.enable();
          }
        });
        break;
    }
  }

}
