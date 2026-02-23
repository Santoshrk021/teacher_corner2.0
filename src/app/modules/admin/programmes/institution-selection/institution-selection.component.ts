import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { SchoolCreateComponent } from 'app/modules/registration/school-create/school-create.component';
import { BehaviorSubject, Observable, filter, first, lastValueFrom, map, of, startWith, tap } from 'rxjs';

@Component({
  selector: 'app-institution-selection',
  templateUrl: './institution-selection.component.html',
  styleUrls: ['./institution-selection.component.scss']
})
export class InstitutionSelectionComponent implements OnInit, OnDestroy {
  @Input() stepper: MatStepper;
  @Input() stepperData: BehaviorSubject<any>;
  @Input() addNewProgramFlag?: boolean;

  boardList: any;
  searchBtnClick = false;
  languageList: any;
  subcriptionRef: PushSubscription[] = [];
  teacherCountryCode: string;
  countryBoard: Array<string>;
  countryCodes: any;
  isAddNewBoard: boolean = false;
  isLoaded: boolean = false;
  teacherCountry: string;
  boardData: any;

  constructor(
    private fb: FormBuilder,
    private institutionsService: InstitutionsService,
    private configurationService: ConfigurationService,
    public dialog: MatDialog,
    public afAuth: AngularFireAuth,
    private userService: UserService,
    private cdRef: ChangeDetectorRef,
  ) {
    const boardSub: any = this.configurationService.boardListSub.subscribe((d: any) => {
      this.boardList = d?.filter(e => e.code !== 'ICSE');
      if (d == null) {
        this.configurationService.getBoardList('BoardListAll');
      }
    });
    this.subcriptionRef.push(boardSub);

    const lanSub: any = this.configurationService.languageListSub.subscribe((d: any) => {
      this.languageList = d;
    });
    this.subcriptionRef.push(lanSub);
  }

  institutions$: Observable<any>;

  async ngOnInit(): Promise<void> {
    // get country details (board, country code, country)
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.infoForm, this.isLoaded);
    [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

    if (!!this.stepperData.value) {
      const stepperData = this.stepperData.value;
      const { board, institution, grade } = stepperData?.classroomDetails;
      const institutionName = institution?.institutionName;
      const institutionId = institution?.institutionId;
      const pincode = institution?.institutionAddress?.pincode;

      this.infoForm.patchValue({
        board,
        pincode,
        institution
      });

      this.infoForm.get('pincode').enable();
      this.infoForm.get('board').enable();
      this.infoForm.get('institution').enable();

      // this.loadInstitutes();

      const query: QueryFn = (ref: CollectionReference) =>
        ref.where('docId', '==', institutionId);
      this.institutions$ = this.institutionsService.getSnapshot(query);

      this.institutions$.subscribe((institutions) => {
        const matchedInstitution = institutions.find(
          (institution: any) => institution.payload.doc.data().institutionId === institutionId
        );
        if (matchedInstitution) {
          this.infoForm.patchValue({
            institution: matchedInstitution.payload.doc.data()
          });
        }
      });

      this.stepperData.next({institutionName, institutionId, grade});
      // this.stepper.next(); // continue to next step
    };

    const watchList = [
      'country',
      'pincode',
    ];

    const unlockList = [
      'pincode',
      'board',
    ];

    for (let i = 0; i < watchList.length; i++) {
      this.unlockFormSequentially(watchList[i], unlockList[i]);
    };

    this.infoForm?.get('board').valueChanges.subscribe((res) => {
      if (res) {
        this.searchBtnClick = true;
      }
    });

  }

  compareInstitutions(institution1: any, institution2: any): boolean {
    return institution1 && institution2 ? institution1.institutionId === institution2.institutionId : institution1 === institution2;
  }

  ngOnDestroy(): void {
    this.subcriptionRef.forEach((obs) => {
      obs.unsubscribe();
    });
  }

  infoForm = this.fb.group({
    board: [{ value: null, disabled: true }, [Validators.required]],
    // pincode: [null, [Validators.required, Validators.pattern("^[0-9]{6}")]],
    pincode: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
    institution: [{ value: '', disabled: true }, [Validators.required]],
    country: [''],
  });

  async onClickSearch() {
    this.infoForm?.get('institution')?.enable();
    this.loadInstitutes();
    // this.loadItems()
  }

  loadInstitutes() {
    const query: QueryFn = (ref: CollectionReference) =>
      ref.where('board', '==', this.infoForm.get('board').value)
        .where('institutionAddress.pincode', '==', this.infoForm.get('pincode').value)
        .orderBy('institutionName', 'asc');
    this.institutions$ = this.institutionsService.getSnapshot(query);
  }

  async createSchool() {
    await import('app/modules/registration/school-create/school-create.component').then(() => {
      const dialogRef = this.dialog.open(SchoolCreateComponent, {
        data: {
          parent: 'institution-selection',
          country: this.infoForm.get('country').value,
          countryCode: this.teacherCountryCode,
          pin: this.infoForm.get('pincode').value,
          board: this.infoForm.get('board').value,
          lang: this.languageList,
          createdSource: 'programme-addition'
        }
      });
    });
  }

  onSubmit(form: any) {
    const obj: any = {
      institutionName: form?.value?.institution?.institutionName,
      institutionId: form?.value?.institution?.institutionId,
    };

    if (!!this.stepperData.value) {
      const stepperData = this.stepperData.value;
      obj.grade = stepperData?.grade;
    };

    this.stepperData.next(obj);
  }

  async saveNewBoard() {
    const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.infoForm, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
    [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
  }

  unlockFormSequentially(watch: string, unlock: string) {
    switch (watch) {
      case 'country':
        const countryName = this.infoForm?.get(watch)?.value;
        if (countryName) {
          const internationalBoards = this.boardData?.boardsInternational;
          const country = countryName?.includes(' ') ? countryName?.toLowerCase()?.replace(/\s/g, '-') : countryName?.toLowerCase();
          this.teacherCountry = country;
          this.teacherCountryCode = this.countryCodes?.[country]?.phone;
          // this.infoForm?.get('representativeCountryCode')?.setValue(this.teacherCountryCode);
          this.infoForm?.get(unlock)?.enable();
          this.countryBoard = internationalBoards?.[country];
          this.isAddNewBoard = false;
        };
        this.infoForm?.get(watch)?.valueChanges?.subscribe(async (res) => {
          if (res) {
            const internationalBoards = this.boardData?.boardsInternational;
            const country = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
            this.teacherCountry = country;
            this.teacherCountryCode = this.countryCodes?.[country]?.phone;
            this.countryBoard = internationalBoards?.[country];
            this.isAddNewBoard = false;
            this.infoForm?.get(unlock)?.reset();
            this.infoForm?.get(unlock)?.enable();
            this.infoForm?.get('board')?.disable();
          };
        });
        break;

      case 'pincode':
        this.infoForm?.get(watch)?.valueChanges?.subscribe(async (res) => {
          if (/^\d{4,6}|[\w\d]+( )|( - )[\w\d]+$/.test(res.toString())) {
            this.infoForm.get(unlock).enable();
          };
        });
        break;

      default:
        this.infoForm?.get(watch)?.valueChanges?.subscribe(async (res) => {
          if (res) {
            this.infoForm?.get(unlock)?.enable();
          }
        });
        break;
    }
  }

}
