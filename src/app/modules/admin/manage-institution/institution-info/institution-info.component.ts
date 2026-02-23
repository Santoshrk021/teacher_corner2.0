import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, Inject, OnInit, Output } from '@angular/core';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { BehaviorSubject, Subject, first, lastValueFrom, map, take, takeUntil } from 'rxjs';
import { serverTimestamp } from '@angular/fire/firestore';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { environment } from 'environments/environment';
import phone from 'phone';
import { representativeEmailExistValidator, representativeEmailValidator, representativeNameExistValidator, representativeNameValidator, representativePhoneExistValidator, representativePhoneValidator } from 'app/modules/registration/school-create/custom-validators/representativeValidators.directive';
import { names } from 'app/modules/registration/school-create/school-create.component';
import { MasterService } from 'app/core/dbOperations/master/master.service';

@Component({
  selector: 'app-institution-info',
  templateUrl: './institution-info.component.html',
  styleUrls: ['./institution-info.component.scss']
})
export class InstitutionInfoComponent implements OnInit {
  @Output() instituteInfoEmitter: EventEmitter<any> = new EventEmitter();
  genderTypes = ['Boys', 'Girls', 'Co-ed'];
  typeofSchools;
  boardList: any;
  langList: any;
  schoolInfo: FormGroup;
  locationInfo: any;
  programmeBSub = new BehaviorSubject(null);
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  loginSpinner = false;
  invalidRepresentativePhoneMsg: string;
  representativePhoneExistErrorMsg: string;
  invalidRepresentativeNameMsg: string;
  representativeNameExistErrorMsg: string;
  invalidRepresentativeEmailMsg: string;
  representativeEmailExistErrorMsg: string;
  options: string[] = [];
  teacherCountry: string;
  teacherCountryCode: string;
  countryBoard: Array<string>;
  countryCodes: any;
  isAddNewBoard: boolean = false;
  isLoaded: boolean = false;
  boardData: any;
  institutionId: string;
  classroomId: string;
  programmeId: string;
  currentTeacherInfo: any;

  constructor(
    private fb: FormBuilder,
    private institutionService: InstitutionsService,
    private userService: UserService,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private configurationService: ConfigurationService,
    private httpClient: HttpClient,
    private teacherService: TeacherService,
    private afAuth: AngularFireAuth,
    private masterService: MasterService,
  ) {
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit(): Promise<void> {

    this.setForm();

    const keysToCheck = ['board', 'pin', 'country'];
    if (keysToCheck.every(key => this.data.hasOwnProperty(key))) {
      this.schoolInfo.get('board').patchValue(this.data.board);
      this.schoolInfo.get('institutionAddress').get('pincode').patchValue(this.data.pin);
      this.schoolInfo.get('institutionAddress').get('country').patchValue(this.data?.country);
    }
    // get country details (board, country code, country)
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));

    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    this.getTypeOfInstitutions();

    const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.schoolInfo, this.isLoaded, this.data);
    [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

    if (this.data?.pin) {
      this.locationInfo = await this.getInfoFromPin(this.data?.pin);
    }

    this.configurationService.languageListSub.pipe(first()).subscribe((d) => {
      if (d == null) {
        this.configurationService.getLanguageList('Languages');
      }
      this.langList = d;
    });

    this.getValidationDataAndSet();

    const currentUserId = currentUser?.uid ?? currentUser?.docId ?? currentUser?.id;
    const teacher = await lastValueFrom(this.teacherService.getTeacherByIdOnce(currentUserId));

    if (teacher.exists) {
      const { firstName, lastName, email } = teacher.get('teacherMeta');

      this.schoolInfo.patchValue({
        institutionCreatorCountryCode: currentUser?.countryCode,
        institutionCreatorPhoneNumber: currentUser?.phoneNumber,
        institutionCreatorFirstName: firstName,
        institutionCreatorLastName: lastName,
        institutionCreatorEmail: email
      });
    } else {
      console.error('Teacher not found');
    };

    const watchList = [
      'institutionAddress.country',
      'board',
      'registrationNumber',
      'institutionName',
      'medium',
      'typeofSchool',
      'genderType',
      'institutionAddress.pincode',
      'institutionAddress.street',
      'institutionAddress.village',
      'institutionAddress.landmark',
      'institutionAddress.city',
      'institutionAddress.subDistrict',
      'institutionAddress.district',
      'institutionAddress.state',
      'representativePhoneNumber',
      'representativeFirstName',
      'representativeLastName'
    ];

    const unlockList = [
      'board',
      'registrationNumber',
      'institutionName',
      'medium',
      'typeofSchool',
      'genderType',
      'institutionAddress.pincode',
      'institutionAddress.street',
      'institutionAddress.village',
      'institutionAddress.landmark',
      'institutionAddress.city',
      'institutionAddress.subDistrict',
      'institutionAddress.district',
      'institutionAddress.state',
      'representativePhoneNumber',
      'representativeFirstName',
      'representativeLastName',
      'representativeEmail'
    ];

    for (let i = 0; i < watchList.length; i++) {
      this.unlockFormSequentially(watchList[i], unlockList[i]);
    }

    // validate representativeEmail
    this.schoolInfo.get('representativeEmail').valueChanges.subscribe(async (res) => {
      if (res) {
        if (this.data?.parent !== 'registration') {
          // cannot enter own name as rep name
          const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
          // const userEmail = await lastValueFrom(this.userService.getUser(user.uid));
          const userEmail = await lastValueFrom(this.teacherService.getWithId(user.uid));
          this.schoolInfo?.get('representativeEmail')?.addValidators(representativeEmailValidator(userEmail.teacherMeta.email));
          this.schoolInfo?.get('representativeEmail')?.updateValueAndValidity({ emitEvent: false });
          this.invalidRepresentativeEmailMsg = 'Enter the email of the school representative, not your own email';
        } else {
          // cannot enter existing rep phone number
          const query: QueryFn = (ref: CollectionReference) => ref.where('representativeEmail', '==', res);
          const institutionEmails = await lastValueFrom(this.institutionService.getWithQuery(query).pipe(first()));
          this.schoolInfo?.get('representativeEmail')?.addValidators(representativeEmailExistValidator(institutionEmails?.[0]?.representativeEmail));
          this.schoolInfo?.get('representativeEmail')?.updateValueAndValidity({ emitEvent: false });
          this.representativeEmailExistErrorMsg = `This email, ${res} is already registered to the school representative “${institutionEmails?.[0]?.representativeFullName}” of the school “${institutionEmails?.[0]?.institutionName}” with PIN code ${institutionEmails?.[0]?.institutionAddress?.pincode}`;
        }
      };
    });

    this.teacherService.currentTeacher.pipe(first()).subscribe((res) => {
      this.currentTeacherInfo = res;
    });

    this.applyConditionalValidation();
  }

  async setForm() {
    this.schoolInfo = this.fb.group({
      registrationNumber: [{ value: null, disabled: true },
      [Validators.required, Validators.minLength(4),
      Validators.pattern('^(?=.*[0-9])[0-9a-zA-Z]*$')]],
      institutionName: [{ value: '', disabled: true }, [Validators.required]],
      representativeEmail: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')]],
      representativeFirstName: [{ value: null, disabled: true }, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
      representativeLastName: [{ value: null, disabled: true }, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
      representativeCountryCode: [''],
      representativePhoneNumber: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      institutiontype: 'school',
      institutionId: this.institutionService.generateRandomDocId(),
      institutionAddress: this.fb.group({
        street: [{ value: '', disabled: true }, Validators.required],
        village: [{ value: '', disabled: true }, Validators.required],
        landmark: [{ value: '', disabled: true }, Validators.required],
        // city: [{ value: this.locationInfo?.Block || "", disabled: true }, Validators.required],
        // subDistrict: [{ value: this.locationInfo?.Block || "", disabled: true }, Validators.required],
        // district: [{ value: this.locationInfo?.District || "", disabled: true }, Validators.required],
        // state: [{ value: this.locationInfo?.State || "", disabled: true }, Validators.required],
        // country: [this.data?.country ? this.data?.country : ""],
        city: [{ value: '', disabled: true }, Validators.required],
        subDistrict: [{ value: '', disabled: true }, Validators.required],
        district: [{ value: '', disabled: true }, Validators.required],
        state: [{ value: '', disabled: true }, Validators.required],
        country: [''],
        // pincode: [{ value: this.data?.pin ? this.data?.pin : "", disabled: true }, [Validators.required, Validators.pattern("^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$")]],
        pincode: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
      }),
      creationDate: serverTimestamp(),
      lastUsedDate: serverTimestamp(),
      // board: [{ value: this.data?.board ? this.data?.board : '', disabled: this.data?.board ? true : null }, Validators.required],
      board: ['', Validators.required],
      medium: [{ value: null, disabled: true }, [Validators.required]],
      genderType: [{ value: '', disabled: true }, Validators.required],
      typeofSchool: [{ value: '', disabled: true }, Validators.required],
      institutionCreatorFirstName: [''],
      institutionCreatorLastName: [''],
      institutionCreatorEmail: [''],
      institutionCreatorCountryCode: [''],
      institutionCreatorPhoneNumber: [''],
    });

  }

  // email validation for jigyaasa and backup-collection
  applyConditionalValidation(): void {
    const emailControl = this.schoolInfo.get('representativeEmail');

    if (environment.validationException.includes('createInstitutionRepresentativeEmail')) {
      // Remove email validation for jigyaasa
      emailControl.clearValidators();
    } else {
      // Apply email validation
      emailControl.setValidators([
        Validators.required,
        Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$')
      ]);
    }

    // Update the validity after changing validators
    emailControl.updateValueAndValidity();
  }

  getValidationDataAndSet() {
    this.configurationService.getFormValidation().pipe(
      take(1)
    ).subscribe((docSnapshot) => {
      const data = docSnapshot.data();
      const dynamicPattern = `^[A-Za-z ]*(?:[0-9][A-Za-z ]*){0,${data.institutionNameNumberLimit}}(?:[^A-Za-z0-9 ][A-Za-z0-9 ]*){0,${data.institutionNameSpecialCharacterLimit}}$`;

      this.schoolInfo.controls['institutionName'].setValidators([
        Validators.required,
        Validators.pattern(dynamicPattern)
      ]);
      this.schoolInfo.controls['institutionName'].updateValueAndValidity();
    });
  }

  getTypeOfInstitutions() {
    this.configurationService.getTypeOfInstitutionsByGet().pipe(first()).subscribe((res) => {
      this.typeofSchools = res.get('names');
    });
  }

  deconstructName(): names {
    const firstName = this.schoolInfo?.get('representativeFirstName')?.value?.toString()?.trim();
    const lastName = this.schoolInfo?.get('representativeLastName')?.value?.toString()?.trim();
    const fullNameLowerCase = (firstName + lastName).toLowerCase().replace(/ /g, '');
    return {
      firstName: firstName, lastName: lastName, fullNameLowerCase: fullNameLowerCase
    };
  }

  async onSubmit(form: FormGroup) {
    const institutionCounter = await this.getCorrectInstitutionCounter();
    const schoolObj = form.getRawValue();
    schoolObj.institutionCode = `${institutionCounter}`;
    this.configurationService.incrementInstitutionCounter(institutionCounter);
    schoolObj.classroomCounter = 0;
    schoolObj.verificationStatus = false;
    // this.institutionService.currentSelectedBoard.next(null);

    this.institutionService.updateboardData(this.schoolInfo.get('board').value);
    this.instituteInfoEmitter.emit(schoolObj);
  }

  async getCorrectInstitutionCounter(): Promise<string> {
    const institutionCounter = await lastValueFrom(this.configurationService.getInstitutionCounter());

    const masterInstitutionsCount = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames').pipe(
      first(),
      map((institutions: any) => institutions.map((institution: any) => parseInt(institution.institutionCode)))
    ));

    const masterInstitutionsMaxCount = Math.max(...masterInstitutionsCount);

    return institutionCounter < masterInstitutionsMaxCount ? `${await this.checkInstitutionCode(masterInstitutionsMaxCount) + 1}` : `${institutionCounter + 1}`;
  }

  async checkInstitutionCode(masterInstitutionMaxCount: any): Promise<number> {
    const queryResult = await lastValueFrom(
      this.institutionService.getInstitutionByInstitutionCode((parseInt(masterInstitutionMaxCount) + 1).toString())
    );

    if (queryResult.empty) {
      return masterInstitutionMaxCount;
    } else {
      console.error('Institution code already exists. Adding one to code and checking again');
      return await this.checkInstitutionCode(masterInstitutionMaxCount + 1);
    };
  }

  async getInfoFromPin(pin) {
    const doc = this.httpClient.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${pin}&key=${environment.gmapApiKey}`);
    const ref = lastValueFrom(doc);
    const value: any = await ref;
    const options = value?.results?.[0]?.postcode_localities || value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('route') || item?.types?.includes('sublocality'))?.[0]?.long_name;
    this.options = typeof (options) === 'string' ? [options] : options;
    let country: string;
    if (this.data?.country) {
      country = this.data?.country;
    } else {
      country = this.schoolInfo?.get('institutionAddress.country')?.value;
    };
    const pinCountry = value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('country'))?.[0]?.long_name.toLowerCase();
    let addressObj: any;
    if (country === pinCountry) {
      addressObj = {
        Block: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('locality') || item?.types?.includes('postal_town'))?.[0]?.long_name,
        District: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('administrative_area_level_2') || item?.types?.includes('administrative_area_level_3') || item?.types?.includes('postal_town'))?.[0]?.long_name,
        State: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('administrative_area_level_1'))?.[0]?.long_name,
        Country: value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('country'))?.[0]?.long_name,
      };
    } else {
      addressObj = {
        Block: '',
        District: '',
        State: '',
        Country: '',
      };
    }
    return addressObj;
  }

  async onFocusoutName(controlName: string) {
    // trim spaces in form field
    const name: any = this.schoolInfo?.get(controlName)?.value;
    if (name && typeof (name) === 'string') {
      this.schoolInfo?.patchValue({
        [controlName]: name?.trim()
      });
      // if form patch value fails, then use set value
      // (this.schoolInfo?.get(controlName) as FormControl)?.setValue(name.trim());
    };
    // check if representative name matches current user
    if (name && controlName === 'representativeLastName') {
      const fullNameLowerCase = (this.schoolInfo?.get('representativeFirstName')?.value + name).toLowerCase().replace(/ /g, '');
      if (this.currentTeacherInfo?.teacherMeta?.fullNameLowerCase == fullNameLowerCase) {
        this.schoolInfo?.get(controlName).setErrors({ 'duplicateNameError': true });
      }
      else {
        this.schoolInfo?.get(controlName).setErrors({ 'duplicateNameError': null });
        this.schoolInfo?.get(controlName).updateValueAndValidity({ emitEvent: false });
      }
    };
    // check if representative phone number valid
    if (name && controlName === 'representativePhoneNumber') {
      const inputValue = this.schoolInfo?.get(controlName)?.value;
      const ph = this.teacherCountryCode + inputValue;
      const isValid = phone(ph).isValid;
      if (!isValid && inputValue) {
        this.schoolInfo?.get(controlName)?.setErrors({ 'notMobileNo': true });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      } else {
        this.schoolInfo?.get(controlName)?.setErrors({ 'notMobileNo': null });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      };
    };
    // check if representative email matches current user
    if (name && controlName === 'representativeEmail') {
      const email = this.schoolInfo?.get(controlName)?.value;
      if (this.currentTeacherInfo?.teacherMeta?.email === email) {
        this.schoolInfo?.get(controlName)?.setErrors({ 'duplicateEmailError': true });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      }
      else {
        this.schoolInfo?.get(controlName)?.setErrors({ 'duplicateEmailError': null });
        this.schoolInfo?.get(controlName)?.updateValueAndValidity({ emitEvent: false });
      };
    };
  }

  async saveNewBoard() {
    const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.schoolInfo, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
    [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
  }

  async unlockFormSequentially(watch: string, unlock: string) {
    switch (watch) {
      case 'institutionAddress.country':
        const countryName = this.schoolInfo?.get(watch)?.value;
        if (countryName) {
          const internationalBoards = this.boardData?.boardsInternational;
          const country = countryName?.includes(' ') ? countryName?.toLowerCase()?.replace(/\s/g, '-') : countryName?.toLowerCase();
          this.teacherCountry = country;
          this.teacherCountryCode = this.countryCodes?.[country]?.phone;
          this.schoolInfo?.get('representativeCountryCode')?.setValue(this.teacherCountryCode);
          this.countryBoard = internationalBoards?.[country];
          this.isAddNewBoard = false;
        };
        if (this.data?.parent !== 'institutions-list') {
          this.schoolInfo?.get(watch)?.disable();
          this.schoolInfo?.get(unlock)?.disable();
          this.schoolInfo?.get('registrationNumber')?.enable();
        } else {
          this.schoolInfo?.get(watch)?.valueChanges?.subscribe(async (res) => {
            if (res) {
              const internationalBoards = this.boardData?.boardsInternational;
              const country = this.teacherCountry = res?.includes(' ') ? res?.toLowerCase()?.replace(/\s/g, '-') : res?.toLowerCase();
              this.teacherCountryCode = this.countryCodes?.[res]?.phone;
              this.teacherCountry = country;
              this.schoolInfo?.get('representativeCountryCode')?.setValue(this.teacherCountryCode);
              this.countryBoard = internationalBoards?.[country];
              this.isAddNewBoard = false;
            }
          });
        };
        break;

      case 'institutionAddress.pincode':
        this.schoolInfo?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe(async (res) => {
          if (res) {
            this.locationInfo = await this.getInfoFromPin(res);
            this.schoolInfo.get('institutionAddress').patchValue({
              village: this.locationInfo?.Name || '',
              city: this.locationInfo?.Block || '',
              subDistrict: this.locationInfo?.Block || '',
              district: this.locationInfo?.District || '',
              state: this.locationInfo?.State || '',
              // country: this.teacherCountry || '',
            });
            this.schoolInfo?.get(unlock)?.enable();
          };
        });
        break;

      case 'representativePhoneNumber':
        // this.schoolInfo?.get('representativeCountryCode')?.setValue(this.teacherCountryCode);
        const countryCode = this.schoolInfo?.get('representativeCountryCode')?.value;
        if (this.data?.parent !== 'registration') {
          // cannot enter own number as rep phone number
          const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
          const userPhone = await lastValueFrom(this.userService.getUser(user.uid));
          this.schoolInfo?.get(watch)?.addValidators(representativePhoneValidator(userPhone.phoneNumber));
          this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
          this.invalidRepresentativePhoneMsg = 'Enter the number of the school representative, not your own number';
          this.schoolInfo?.get(unlock)?.enable();
        } else {
          // cannot enter existing rep phone number
          this.schoolInfo.get(watch).valueChanges.subscribe(async (res) => {
            if (res) {
              const query: QueryFn = (ref: CollectionReference) => ref.where('representativeCountryCode', '==', countryCode).where(watch, '==', res);
              const institutionPhones = await lastValueFrom(this.institutionService.getWithQuery(query).pipe(first()));
              this.schoolInfo?.get(watch)?.addValidators(representativePhoneExistValidator(institutionPhones?.[0]?.representativePhoneNumber));
              this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
              this.representativePhoneExistErrorMsg = `This number, ${countryCode + res} already belongs to the representative ${institutionPhones?.[0]?.representativeName}, of the school “${institutionPhones?.[0]?.institutionName}” with PIN code ${institutionPhones?.[0]?.institutionAddress?.pincode}`;
              this.schoolInfo?.get(unlock)?.enable();
            }
          });
        };
        break;

      case 'representativeLastName':
        this.schoolInfo.get(watch).valueChanges.subscribe(async (res) => {
          if (res) {
            if (this.data?.parent !== 'registration') {
              // cannot enter own name as rep name
              const repFirstName = this.schoolInfo?.get('representativeFirstName')?.value;
              const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
              const userName = await lastValueFrom(this.teacherService.getWithId(user.uid));
              const userFullName = userName.teacherMeta.firstName + ' ' + userName.teacherMeta.lastName;
              this.schoolInfo?.get(watch)?.addValidators(representativeNameValidator(repFirstName, userFullName));
              this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
              this.invalidRepresentativeNameMsg = 'Enter the name of the school representative, not your own name';
              this.schoolInfo?.get(unlock)?.enable();
            } else {
              // cannot enter existing rep phone number
              const repFirstName = this.schoolInfo?.get('representativeFirstName')?.value;
              const query: QueryFn = (ref: CollectionReference) => ref.where('representativeFirstName', '==', repFirstName).where(watch, '==', res);
              const institutionPhones = await lastValueFrom(this.institutionService.getWithQuery(query).pipe(first()));
              this.schoolInfo?.get(watch)?.addValidators(representativeNameExistValidator(repFirstName, institutionPhones?.[0]?.representativeFullName));
              this.schoolInfo?.get(watch)?.updateValueAndValidity({ emitEvent: false });
              this.representativeNameExistErrorMsg = `This name, ${repFirstName + ' ' + res} is already registered with the school “${institutionPhones?.[0]?.institutionName}” with PIN code ${institutionPhones?.[0]?.institutionAddress?.pincode}`;
              this.schoolInfo?.get(unlock)?.enable();
            }
          }
        });
        break;

      default:
        this.schoolInfo?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe((res) => {
          if (res) {
            this.schoolInfo?.get(unlock)?.enable();
          };
        });
        break;
    }
  }
}
