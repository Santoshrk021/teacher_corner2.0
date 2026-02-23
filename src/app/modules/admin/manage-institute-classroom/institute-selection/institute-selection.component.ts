import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectChange } from '@angular/material/select';
import { MatStepper } from '@angular/material/stepper';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { OneClickInstitution } from 'app/core/dbOperations/institutions/institution.type';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { MasterInstituteDoc } from 'app/core/dbOperations/master/master.types';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { SchoolCreateComponent } from 'app/modules/registration/school-create/school-create.component';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { serverTimestamp } from 'firebase/firestore';
import { BehaviorSubject, Subject, combineLatest, first, lastValueFrom, map, startWith, take, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
    selector: 'app-institute-selection',
    templateUrl: './institute-selection.component.html',
    styleUrls: ['./institute-selection.component.scss']
})
export class InstituteSelectionComponent implements OnInit, OnDestroy {
    @ViewChild('elementRefInstitute')
    elementRefInstitute: ElementRef;
    @Output() institutionCountry: EventEmitter<any> = new EventEmitter();
    @Input() stepper: MatStepper;
    @Input() instititutionSubRef: BehaviorSubject<any>;
    allProgramsTemplates = [];
    currentClsList: any[] = [];
    gradeList: any[] = Array.from({ length: 10 }).map((_, i) => i + 1);
    section: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NA'];
    gradeSectionObject: Record<number, { sections: string[]; exhaustedSection: string[] }> = {};
    classroomObj: Record<string, string[]> = {};
    sectionList: Array<string> = [];
    filteredSubjectListObj = {};
    filteredTemplateListObj = {};
    filteredTemplateListObjSet = {};
    isAddClassroomEnabled: boolean = false;
    classInfoArrayVisible: boolean = false;
    showSelectCsvBtn: boolean = false;
    isBulkUpload: boolean = false;
    loader: boolean = false;
    currentUser;
    boardList = [];
    currentcsvData;
    currentTeacher: any;
    currentselectedSubjectTemplate: any;
    instituteInputFile: any;
    institutionsJson: any;
    bulkInstituteBoardSel: boolean = false;
    searchBtnClick: boolean = false;
    institutions$;
    subjects = [];
    availableSubjects: any[] = [];
    institutionsTeacher$;
    // instiBulkBoard
    institutions;
    classrooms$: any;
    classCreate = this.fb.group({
        board: [{ value: null, disabled: true }, [Validators.required]],
        pincode: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
        institutionName: [{ value: '', disabled: true }, [Validators.required]],
        classInfo: this.fb.array([]),
        institutionId: [''],
        country: [''],
    });
    bulkUploadForm = this.fb.group({
        country: [''],
        board: [{ value: '', disabled: true }, [Validators.required]],
        // pincode: [{ value: '', disabled: true }, [Validators.required, Validators.pattern("^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$")]],
        // institutionName: [{ value: '', disabled: true }, [Validators.required]],
        // section: [{ value: 'A', disabled: true }, [Validators.required]],
        classInfoArray: this.fb.array([]),
        // country: [''],
    });
    exhaustedProgrametemplates: any = {};
    isWANotificationsDisabled: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    teacherCountryCode: string;
    countryBoard: Array<string>;
    countryCodes: any;
    isAddNewBoard: boolean = false;
    isLoaded: boolean = false;
    boardData: any;
    teacherCountry: string;
    storageUrl = environment.firebase.projectId;
    alltemplateshardCopy: any;
    storageTemplatePath = 'templates/Institution upload template.csv';
    isDataLoaded: boolean = false;
    boardExists: boolean = false;

    constructor(
        private configurationService: ConfigurationService,
        public dialog: MatDialog,
        private fb: FormBuilder,
        private uiService: UiService,
        private institutionService: InstitutionsService,
        private institutionsService: InstitutionsService,
        private classroomService: ClassroomsService,
        private masterService: MasterService,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private sharedService: SharedService,
        private teacherService: TeacherService,
        private fuseConfirmationService: FuseConfirmationService,
    ) { }

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    async ngOnInit(): Promise<void> {
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const teacher = this.teacherService.getTeacherByIdOnce(user.uid);
        const teacherdoc = await lastValueFrom(teacher);
        this.currentTeacher = teacherdoc.data();

        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        this.currentUser = currentUser;
        const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.classCreate, this.isLoaded);
        [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

        this.isDataLoaded = true;

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

        const watchlist = [
            'country',
            'pincode',
            'board'
        ];

        const unlockList = [
            'pincode',
            'board',
            'institutionName'
        ];

        for (let i = 0; i < watchlist.length; i++) {
            this.unlockFormSequentially(watchlist[i], unlockList[i]);
        };

        const watchListBulkUpload = [
            'country',
            'board',
        ];

        const unlockListBulkUpload = [
            'board',
            'classInfoArray'
        ];

        for (let i = 0; i < watchListBulkUpload.length; i++) {
            this.unlockBulkUploadFormSequentially(watchListBulkUpload[i], unlockListBulkUpload[i]);
        };

        await lastValueFrom(this.configurationService.getProgrammeTemplateObject().pipe(first())).then(({ sectionList, subjectList, gradeList, templateList }) => {
            [this.sectionList, this.gradeList,] = [sectionList, gradeList];
        });
    }

    getAllProgramTemplatesfromMaster() {
        this.masterService.getAllMasterDocsMapAsArray('PROGRAMME_TEMPLATE', 'programmeTemplates').pipe(take(1)).subscribe((programmeTemplate) => {
            this.alltemplateshardCopy = programmeTemplate;
            this.allProgramsTemplates = programmeTemplate;
        });
    }

    async bulkUploadEnable(value) {
        this.isBulkUpload = value.checked;
        if (this.isBulkUpload) {
            this.getAllProgramTemplatesfromMaster();
            // await this.getAllClassrooms()
            const country: any = Object.values(this.countryCodes).find((c: any) => c.phone == this.currentUser.countryCode);
            this.bulkUploadForm.get('country').patchValue(country.displayName.toLowerCase());
            this.classCreate.reset();
        }
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.classCreate, this.isLoaded);
        [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];
    }

    onSelectCsvFile(event) {
        const check = this.csvValidation(event.target.files[0].name);
        this.instituteInputFile = event.target.files[0].name;
        if (check) {
            this.chooseFile(event);
        }
        if (!check) {
            this.uiService.alertMessage('Invalid File Type', 'Only Accepts CSV File', 'error');
        }
    }

    getInstitutions() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('board', '==', this.classCreate.get('board').value)
                .where('institutionAddress.pincode', '==', this.classCreate.get('pincode').value)
                .orderBy('institutionName', 'asc');
        // c this.institutionsService.getSnapshot(query).pipe(tap(async (response: any) => {
        //     filter((d) => {
        //         return d.institutionName == 'ThinkTac'
        //     })
        // }))

        this.institutions$ = this.institutionsService.getSnapshot(query).pipe(
            map((response: any) => {
                const b = [];
                if (this.currentUser.accessLevel < 11) {
                    return response.filter(res => res.payload.doc.data().institutionName != 'ThinkTac');

                }
                else {
                    return response;
                }
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
        // this.processClassroom(form.value)
    }

    formatProgramTemplateArray(programmeTemplateArr) {
        const classInfoArray = programmeTemplateArr.map(
            (programmeTemplate, index) => {
                const { grade, displayName, subject, templateCategory } =
                    programmeTemplate;
                return {
                    grade,
                    section: 'A',
                    subject,
                    programmeTemplate: templateCategory,
                    classroomCode: (index + 1).toString().padStart(3, '0'),
                };
            }
        );
        return classInfoArray;
    }

    mapClasroomstoform(classrooms) {
        const mappedclassrooms = classrooms.map(c => this.alltemplateshardCopy.find(d => ((d.grade == c.grade) && (d.subject == c.subject) && (d.board == this.bulkUploadForm.get('board').value) && (d.templateCategory == c.programmetmplates))));
        return mappedclassrooms;
    }

    async onInstituteFileUpload(event: any) {
        const check = this.csvValidation(event?.target?.files[0]?.name);

        if (check) {
            this.instituteInputFile = event.target.files[0].name;
            const data: any = await this.chooseFile(event);
            this.currentcsvData = data;
        }
        else {
            this.currentcsvData = '';
            this.instituteInputFile = '';
            this.uiService.alertMessage('Invalid File Type', 'Only Accepts CSV File', 'error');
        }
    }

    csvValidation(el) {
        const regex = new RegExp('(.*?)\.(csv)$');
        let isCsv = false;
        if ((regex.test(el?.toLowerCase()))) {
            isCsv = true;
        }
        return isCsv;
    }

    async chooseFile(ev: any) {
        let workBook = null;
        let jsonData = null;
        return new Promise((resolve, reject) => {
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
                this.institutionsJson = jsonData;
                resolve(jsonData);
                if (!jsonData.length) {
                    this.uiService.alertMessage('Empty File', 'No Data Inside The File', 'warning');
                    this.elementRefInstitute.nativeElement.value = '';
                    this.instituteInputFile = '';
                    resolve('');
                }
            };
            reader.readAsBinaryString(file);
        });
    }

    async addInstitute() {
        alert('add institute');
        await import('../../../registration/school-create/school-create.module').then(() => {
        });
    }

    async onInstitutionUpload() {
        this.loader = true;

        const { board, classInfoArray } = this.bulkUploadForm.getRawValue();

        const config = {
            title: 'Template Does not Exist for This Board',
            message: `There is no template available for the board "${board}". The CBSE template will be used to create this institution. Do you want to proceed?`,
            icon: {
                show: false
            },
        };

        if (!classInfoArray.length) {
            const boardExists = this.alltemplateshardCopy.some((programmeTemplate: any) => programmeTemplate.board.includes(board));
            if (boardExists) {
                config.title = 'Template Not Selected for This Board';
                config.message = `There is no template selected for the board "${board}". All ten classrooms will be created for this institution. Do you want to proceed?`;
            };
            const dialogRef = this.fuseConfirmationService.open(config);
            const dialogResponse = await lastValueFrom(dialogRef.afterClosed().pipe(first()));
            if (dialogResponse === 'cancelled') {
                this.loader = false;
            } else if (dialogResponse === 'confirmed') {
                this.processInstitutionCreation(board, classInfoArray);
            };
        } else {
            await this.processInstitutionCreation(board, classInfoArray);
        };
    }

    async getCorrectInstitutionCounter(): Promise<string> {
        const institutionCounter = await lastValueFrom(this.configurationService.getInstitutionCounter());

        const masterInstitutionsCount = await lastValueFrom(this.masterService.getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames').pipe(
            first(),
            map((institutions: any) => institutions.map((institution: any) => parseInt(institution.institutionCode)))
        ));

        const masterInstitutionsMaxCount = Math.max(...masterInstitutionsCount);

        return institutionCounter < masterInstitutionsMaxCount ? `${await this.checkInstitutionCode(masterInstitutionsMaxCount)}` : `${institutionCounter}`;
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

    parseCSVData(data: any) {
        const fieldsToCheck = [
            'Gender',
            'City',
            'District',
            'Pincode',
            'State',
            'Street',
            'Sub District',
            'Village',
            'Institution Name',
            'Institution Type',
            'Medium of Instruction',
            'Registration Number',
            'Contact Person Country Code',
            'Contact Person Phone Number',
            'Contact Person First Name',
            'Contact Person Last Name',
            'Contact Person Email',
        ];

        if (!fieldsToCheck.every(field => Object.keys(data).includes(field))) {
            console.error(`"${Object.keys(data).join(', ')}" fields found in CSV data`);
            return null;
        } else {
            const docId = this.institutionService.getRandomGeneratedId();

            const {
                Gender: genderType,
                City: city,
                District: district,
                Pincode: pincode,
                State: state,
                Street: street,
                'Sub District': subDistrict,
                Village: village,
                'Institution Name': institutionName,
                'Institution Type': typeofSchool,
                'Medium of Instruction': medium,
                'Registration Number': registrationNumber,
                'Contact Person Country Code': representativeCountryCode,
                'Contact Person Phone Number': representativePhoneNumber,
                'Contact Person First Name': representativeFirstName,
                'Contact Person Last Name': representativeLastName,
                'Contact Person Email': representativeEmail,
            } = data;

            const institutionObject = {
                docId,
                genderType,
                institutionAddress: {
                    city,
                    district,
                    pincode: pincode.toString(),
                    state,
                    street,
                    subDistrict,
                    village,
                },
                institutionId: docId,
                institutionName,
                medium,
                registrationNumber,
                representativeCountryCode: representativeCountryCode.toString().includes('+') ? representativeCountryCode.toString() : `+${representativeCountryCode}`,
                representativeEmail,
                representativeFirstName,
                representativeLastName,
                representativePhoneNumber: representativePhoneNumber.toString(),
                typeofSchool,
            };

            return institutionObject;
        }
    }

    async processInstitutionCreation(board: any, classInfoArray: Array<any>) {
        const mappedProgrammeTemplates = this.mapClasroomstoform(classInfoArray);
        const classroomInfoArray = this.formatProgramTemplateArray(mappedProgrammeTemplates);
        const institutionCount = await this.getCorrectInstitutionCounter();
        const { firstName, lastName, phoneNumber, email, countryCode } = this.currentTeacher.teacherMeta;
        if (this.currentcsvData !== '') {
            const oneClickCreateInstitutionObject = (await Promise.all(this.currentcsvData.map(async (institution: any, index: number) => {
                const institutionData = await this.parseCSVData(institution);
                if (!institutionData) {
                    return null;
                } else {
                    return {
                        institution: {
                            ...institutionData,
                            board,
                            classroomCounter: classroomInfoArray.length,
                            creationDate: serverTimestamp(),
                            institutionCode: String(Number(institutionCount) + index + 1),
                            institutionCreatorCountryCode: countryCode,
                            institutionCreatorEmail: email,
                            institutionCreatorFirstName: firstName,
                            institutionCreatorLastName: lastName,
                            institutionCreatorName: `${firstName} ${lastName}`,
                            institutionCreatorPhoneNumber: phoneNumber,
                            institutiontype: 'school',
                        },
                        classrooms: { classInfoArray: classroomInfoArray },
                        defaultWorkflowTemplate: {},
                        programmeTemplates: mappedProgrammeTemplates,
                        createdSource: 'one-click-institution-classroom-programme-creation',
                        operation: 'create',
                    };
                };
            }))).filter((item: any) => item !== null);

            await this.createAllInstitutions(oneClickCreateInstitutionObject);
        } else {
            console.error('Empty CSV Data');
        };
    };

    async createAllInstitutions(institutions: Array<OneClickInstitution>) {
        const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/manage_one_click_institution`;
        // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/manage_one_click_institution`;

        for (let i = 0; i < institutions.length; i++) {
            const institution = institutions[i];
            try {
                const response = await this.sharedService.sendToCloudFunction(endUrl, institution);
                if (response?.status?.includes('Success')) {
                    this.uiService.alertMessage('Success', `Successfully Set Up Institution ${i + 1} of ${institutions.length}`, 'success');
                } else {
                    this.uiService.alertMessage('Error', `Error Setting Up Institution ${i + 1} of ${institutions.length}`, 'error');
                    console.error(response);
                };
            } catch (error) {
                this.uiService.alertMessage('Error', `Error Setting Up Institution ${i + 1} of ${institutions.length}`, 'error');
            }
        };

        this.uiService.alertMessage('Successful', 'Finished Setting Up All Institutions', 'success');
        this.loader = false;
    }

    async processInstitutionData(arr) {
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        for (const d of arr) {
            const institutionId = this.institutionService.getRandomGeneratedId();
            const obj = {
                board: this.classCreate?.get('board')?.value?.toString(),
                createdAt: serverTimestamp(),
                creationDate: serverTimestamp(),
                docId: institutionId,
                institutionAddress: {
                    street: d['Street Name'] || '',
                    city: d['City Name'] || '',
                    village: d['Locality Name'] || '',
                    state: d['State Name'] || '',
                    district: d['District Name'] || '',
                    subDistrict: d['Sub District Name'] || '',
                    pincode: d['Pincode'] || '',
                },
                institutionCreatorCountryCode: currentUser?.countryCode || '',
                institutionCreatorPhoneNumber: currentUser?.phoneNumber || '',
                institutionCreatorFirstName: currentUser?.teacherMeta?.firstName || '',
                institutionCreatorLastName: currentUser?.teacherMeta?.lastName || '',
                institutionId: institutionId,
                institutionName: d['Institute Name'] || '',
                institutiontype: 'school',
                medium: d['Medium of Instruction'] || '',
                registrationNumber: d['Institute Affiliation Number'] || '',
                representativeCountryCode: d['Contact Person Country Code'].includes('+') ? d['Contact Person Country Code'] : '+' + d['Contact Person Country Code'] || '',
                representativeEmail: d['Contact Person Email'] || '',
                representativeFirstName: d['Contact Person First Name'] || '',
                representativeLastName: d['Contact Person Last Name'] || '',
                representativePhoneNumber: d['Contact Person Phone Number'] || '',
                typeofSchool: d['Institution Type'] || '',
                verificationStatus: false,
            };

            const masterInstDoc: MasterInstituteDoc = {
                docId: obj.docId,
                board: obj.board, /* Board Code */
                institutionName: obj.institutionName,
                institutionCreatorCountryCode: obj.institutionCreatorCountryCode,
                institutionCreatorPhoneNumber: obj.institutionCreatorPhoneNumber,
                institutionCreatorName: `${obj.institutionCreatorFirstName} ${obj.institutionCreatorLastName}`.trim(),
                registrationNumber: obj.registrationNumber,
                representativeFirstName: obj.representativeFirstName,
                representativeLastName: obj.representativeLastName,
                representativeCountryCode: obj.representativeCountryCode,
                representativePhoneNumber: obj.representativePhoneNumber,
                creationDate: new Date(),
                pincode: obj.institutionAddress.pincode,
                typeofSchool: obj?.typeofSchool,
                verificationStatus: obj.verificationStatus,
            };

            const institutionMaster = await this.masterService.addNewObjectToMasterArray('INSTITUTE', 'institutionNames', masterInstDoc);
            obj['masterDocId'] = institutionMaster;
            await this.institutionService.update(obj, institutionId);
            if (!this.isWANotificationsDisabled) {
                this.sendWaNotifications(masterInstDoc);
            };
        }

        this.loader = false;
        // this.instiBulkBoard = ''
        this.uiService.alertMessage('Successful', 'Institute Successfully Added', 'success');
    }

    async sendWaNotifications(schInfo) {
        const phoneNumber = schInfo?.representativePhone;
        const templateName = environment.whatsAppTemplates.institutionCreation.templateName;
        const headerImage = environment.whatsAppTemplates.institutionCreation.headerImage;
        const mediaType = 'text';
        const params = [
            schInfo?.representativeFirstName + schInfo?.representativeLastName,
            schInfo?.institutionName,
        ];
        const urlRoute = undefined;

        this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);
    }

    onContinue() {
        this.instititutionSubRef.next(this.classCreate.value.institutionId);
        this.institutionCountry.emit(this.classCreate.get('country').value);
        this.stepper.next();
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
                    createdSource: 'set-up-wizard'
                    // lang: this.languageList
                }
            });
        });
    }

    onChangeInstitution(event: MatSelectChange) {
        this.getAllClassrooms(event?.value);
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

    classroomForm = new FormGroup({
        classInfoArray: new FormArray([])
    });

    get classInfo(): FormArray {
        return this.bulkUploadForm.get('classInfoArray') as FormArray;
    }

    unlockClassRoomFormSequentially(formGroup: FormGroup, watch: string, unlock: string) {
        switch (watch) {
            default:
                formGroup?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res) {
                        formGroup?.get(unlock)?.enable();
                    };
                });
                break;
        };
    }

    addClassInfo() {
        // this.classInfoArrayVisible = true;
        const newClassroom = this.fb.group({
            // grade: [{ value: '', disabled: false }, Validators.required],
            // section: [{ value: '', disabled: true }, Validators.required],
            // subject: [{ value: '', disabled: true }, Validators.required],

            // programmetmplates: [{ value: '', disabled: true }, Validators.required],
            // availableProgrammes: [[]]  // Store programme list per form group

            grade: [null, Validators.required],
            section: [{ value: '', disabled: true }],
            availableSections: [],
            subject: [{ value: '', disabled: true }],
            availableSubjects: [],
            programmetmplates: [{ value: '', disabled: true }],
            availableProgrammes: [],
        });

        const watchList = ['grade', 'section', 'subject', 'programmetmplates'];
        const unlockList = ['section', 'subject', 'programmetmplates'];
        for (let i = 0; i < watchList.length; i++) {
            this.unlockClassRoomFormSequentially(newClassroom, watchList[i], unlockList[i]);
        }

        this.classInfo.push(newClassroom);

        // this.onChangeClsAndSec();
        // this.onSubjectChange();
        // this.exhaustedProgrametemplates.push(this.clas)
        // this.updateAddClassroomButtonState();
        this.isAddClassroomEnabled = false;
    }

    onChangeClsAndSec() {
        this.classInfo.controls.forEach((classGroup, index) => {
            const gradeControl = classGroup.get('grade');
            const sectionControl = classGroup.get('section');
            const programmeControl = classGroup.get('programmetmplates');
            const availableProgrammesControl = classGroup.get('availableProgrammes');

            if (gradeControl && sectionControl && programmeControl && availableProgrammesControl) {
                combineLatest([
                    gradeControl.valueChanges.pipe(startWith(gradeControl.value)),
                    sectionControl.valueChanges.pipe(startWith(sectionControl.value))
                ]).subscribe(([grade, section]) => {
                    if (grade && section) {
                        const matchedClasses = this.allProgramsTemplates.filter(doc => doc.grade === grade && doc.section === section && doc.board === this.bulkUploadForm.get('board').value);

                        if (matchedClasses.length > 0) {
                            const programmes = matchedClasses.flatMap(cls => Object.values(cls.programmes));
                            availableProgrammesControl.setValue(programmes); // Store in formGroup instead of global variable
                            this.currentClsList = [
                                ...new Map([...(this.currentClsList || []), ...matchedClasses].map(cls => [cls.classroomId, cls])).values()
                            ];

                            programmeControl.enable();
                        }
                    }
                });
            } else {
                console.error(`Form controls missing for class group at index ${index}`);
            }
        });
    }

    updateAddClassroomButtonState() {
        if (this.classInfo.length === 0) {
            this.isAddClassroomEnabled = false;
            return;
        }

        const lastClassroomIndex = this.classInfo.length - 1;
        const lastClassroom = this.classInfo.at(lastClassroomIndex) as FormGroup;

        lastClassroom.valueChanges.subscribe(() => {
            const isComplete = lastClassroom.valid; // Check if all fields are valid
            this.isAddClassroomEnabled = isComplete;
        });

        // Initial check in case values were already filled
        this.isAddClassroomEnabled = lastClassroom.valid;
    }

    disableFilledClassInfoFields() {
        this.classInfo.controls.forEach((classGroup: AbstractControl) => {
            if (classGroup.get('grade')?.value) {
                classGroup.get('grade')?.disable();
            }
            if (classGroup.get('section')?.value) {
                classGroup.get('section')?.disable();
            }
            if (classGroup.get('subject')?.value) {
                classGroup.get('subject')?.disable();
            }
            if (classGroup.get('programmetmplates')?.value?.length > 0) {
                classGroup.get('programmetmplates')?.disable();
            }
        });
    }

    removeClassInfo(index: number) {
        const classInfoItem = this.classInfo.at(index);
        const formValue = classInfoItem.getRawValue();
        const { grade, section, subject } = formValue;

        if (Object.values(formValue).every(value => value !== null)) {
            this.resetExhaustedSection(grade, section);
            this.resetSelectedSubject(grade, section, subject);
        };

        this.classInfo.removeAt(index);
        this.isAddClassroomEnabled = true;
    }

    resetExhaustedSection(grade: number, section: string) {
        const exhaustedSections = this.gradeSectionObject[grade]?.exhaustedSection;
        if (exhaustedSections?.includes(section)) {
            exhaustedSections.splice(exhaustedSections.indexOf(section), 1);
            if (!this.gradeSectionObject[grade].sections.includes(section)) {
                this.gradeSectionObject[grade].sections.push(section);
                this.gradeSectionObject[grade].sections.sort();
            } else {
                console.error('Section already exists in the section list');
            };
        };
    }

    resetSelectedSubject(grade: number, section: string, subject: string) {
        const classroomKey = `${grade}-${section}`;
        const subjectList = this.classroomObj[classroomKey];
        if (subjectList) {
            const subjectIndex = subjectList.indexOf(subject);
            if (subjectIndex > -1) {
                subjectList.splice(subjectIndex, 1);
            }
        }
    }

    onBoardChange(event) {
        this.allProgramsTemplates = this.alltemplateshardCopy.filter(element => element.board === event.value);
        this.gradeList = [...new Set(this.allProgramsTemplates.map(c => c.grade).sort((a, b) => a - b))];
        this.classInfo.clear();
    }

    onGradeChange(formInfo: FormGroup, index: number) {
        const grade = formInfo.get('grade').value;

        if (!this.gradeSectionObject.hasOwnProperty(grade)) {
            this.gradeSectionObject[grade] = { sections: [...this.sectionList], exhaustedSection: [] };
        };

        const exhaustedSections = this.gradeSectionObject[grade].exhaustedSection;
        if (exhaustedSections.length) {
            const lastExhaustedSection = exhaustedSections[exhaustedSections.length - 1];
            const sectionIndex = this.gradeSectionObject[grade].sections.indexOf(lastExhaustedSection);
            this.gradeSectionObject[grade].sections.splice(sectionIndex, 1);
        };

        this.classInfo?.at(index).patchValue({
            availableSections: this.sectionList.filter(section => !this.gradeSectionObject[grade].exhaustedSection.includes(section))
        });

        // formInfo.get('section').enable();
    }

    onSectionChange(formInfo: FormGroup, index: number) {
        const grade = formInfo.get('grade').value;
        const section = formInfo.get('section').value;
        const key = `${grade}-${section}`;

        this.filteredTemplateListObj[grade] = this.allProgramsTemplates
            .filter(element =>
                element.grade === grade &&
                element.board === this.bulkUploadForm.get('board').value &&
                element.learningUnitsIds.some(id => id.trim() !== '')
            )
            .map(element => ({
                ...element,
                learningUnitsIds: element.learningUnitsIds.filter(id => id.trim() !== '') // Remove invalid entries
            }));

        this.filteredSubjectListObj[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map((element: any) => element.subject))).sort();
        const availableSubjects = this.classroomObj.hasOwnProperty(key)
            ? this.filteredSubjectListObj[grade].filter(subject => !this.classroomObj[key].includes(subject))
            : this.filteredSubjectListObj[grade];

        formInfo.patchValue({ availableSubjects });
        // formInfo.get('subject').enable();
    }

    onSubjectChange(formInfo: FormGroup, index: number) {
        const grade = formInfo.get('grade').value;
        const section = formInfo.get('section').value;
        const subject = formInfo.get('subject').value;
        const key = `${grade}-${section}`;

        this.filteredTemplateListObj[grade] = this.allProgramsTemplates.filter(element => element.subject === subject && element.grade === grade && element.board === this.bulkUploadForm.get('board').value && element.learningUnitsIds.length > 0);
        // this.filteredTemplateListObj[grade] = this.allProgramsTemplates.filter(element => element.subject === subject && element.grade === grade && element.board === this.bulkUploadForm.get('board').value);

        this.filteredTemplateListObjSet[grade] = Array.from(new Set(this.filteredTemplateListObj[grade].map(element => element.templateCategory))).sort();

        if (this.classroomObj.hasOwnProperty(key)) {
            this.classroomObj[key] = [subject, ...this.classroomObj[key]];
            if (this.classroomObj[key].length == this.filteredSubjectListObj[grade].length) {
                this.gradeSectionObject[grade].exhaustedSection.push(section);
            };

        }
        else {
            this.classroomObj[key] = [subject];
            if (this.classroomObj[key].length == this.filteredSubjectListObj[grade].length) {
                this.gradeSectionObject[grade].exhaustedSection.push(section);
            };
        };

        formInfo.patchValue({ availableProgrammes: this.filteredTemplateListObjSet[grade] });
    }

    onProgrammeTemplateChange(formInfo: FormGroup, index: number) {
        formInfo.disable();
        this.isAddClassroomEnabled = true;
    }

    //   onSubmit(form) {
    //     this.programmeTemplateEmitter.emit(form.getRawValue());
    //   }

    unlockBulkUploadFormSequentially(watch: string, unlock: string) {
        switch (watch) {
            case 'country':
                this.bulkUploadForm.get(watch)?.valueChanges?.subscribe(async (res) => {
                    if (res) {
                        this.bulkUploadForm.get(unlock)?.enable();
                        this.classInfoArrayVisible = false;
                        this.isAddClassroomEnabled = false;
                        this.showSelectCsvBtn = false;
                    };
                });
                break;

            case 'board':
                this.bulkUploadForm.get(watch)?.valueChanges?.subscribe(async (res) => {
                    if (res) {
                        this.bulkUploadForm.get(unlock)?.enable();
                        this.showSelectCsvBtn = true;
                        this.classInfoArrayVisible = true;
                        if (this.alltemplateshardCopy.map((element: any) => element.board).includes(res)) {
                            this.isAddClassroomEnabled = true;
                            this.boardExists = true;
                        } else {
                            this.isAddClassroomEnabled = false;
                            this.boardExists = false;
                        };
                    };
                });
                break;

            default:
                this.bulkUploadForm?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe((res) => {
                    if (res) {
                        this.bulkUploadForm?.get(unlock)?.enable();
                    };
                });
                break;
        };
    }

    getSelectedProgrammesTooltip(selection: AbstractControl): string {
        const selectedProgrammes = selection.get('programme')?.value || [];
        return selectedProgrammes.length > 0
            ? selectedProgrammes.map((pr: any) => pr.programmeName).join(', ')
            : 'Select Programme';
    }

}
