import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { Observable, first, lastValueFrom, map, take } from 'rxjs';
import { SchoolCreateComponent } from 'app/modules/registration/school-create/school-create.component';
import { MatDialog } from '@angular/material/dialog';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { serverTimestamp } from 'firebase/firestore';
import { UiService } from 'app/shared/ui.service';
import { ProgramInfoComponent } from '../../programmes/program-info/program-info.component';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { MatSelectChange } from '@angular/material/select';

@Component({
    selector: 'app-classroom-create',
    templateUrl: './classroom-create.component.html',
    styleUrls: ['./classroom-create.component.scss']
})
export class ClassroomCreateComponent implements OnInit, OnDestroy {
    boardList: object[] = [];
    subcriptionRef: PushSubscription[] = [];
    searchBtnClick = false;
    selectedGradewithSec: any = [];
    selectGrade: boolean = true;
    selectSection: boolean = true;
    selectPrograms: boolean = true;
    institutions$: Observable<any>;
    orgData = [];
    sortedInstitutions$: Observable<any[]>;
    isLast: boolean = false;
    lastInResponse: import('@angular/fire/compat/firestore').QueryDocumentSnapshot<unknown>;
    fetchMore$: Observable<any>;
    currentUser: any = {};
    gradeList: any[] = Array.from({ length: 10 }).map((_, i) => i + 1);
    section: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NA'];
    docId = this.afs.createId();
    infoForm = this.fb.group({
        board: [{ value: null, disabled: true }, [Validators.required]],
        classroomCode: [''],
        classroomId: [this.docId],
        country: [''],
        creationDate: serverTimestamp(),
        docId: [this.docId],
        grade: [{ value: '', disabled: true }],
        institution: [{ value: '', disabled: true }, [Validators.required]],
        institutionId: [''],
        institutionName: [''],
        pincode: [{ value: '', disabled: true }, [Validators.required, Validators.pattern('^\\d{4,6}|[\\w\\d]+( )|( - )[\\w\\d]+$')]],
        programmeInfo: [[], [Validators.required]],
        section: [{ value: '', disabled: true }],
        stemClubName: [{ value: '', disabled: true }],
        studentCounter: [''],
        studentCredentialStoragePath: [''],
        type: [{ value: '' }, [Validators.required]],
    });
    languageList: any;
    progSub: any;
    programmesArr = [];
    teacherCountryCode: string;
    countryBoard: Array<string>;
    countryCodes: any;
    isAddNewBoard: boolean = false;
    isLoaded: boolean = false;
    boardData: any;
    teacherCountry: string;
    isStemClubUi = false;
    representativePhoneNumber: any;
    classroomCode: string | number;
    programmeType: string;
    filteredProgrammes: any[];

    constructor(
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private configurationService: ConfigurationService,
        private institutionsService: InstitutionsService,
        public dialog: MatDialog,
        private programmeService: ProgrammeService,
        private afs: AngularFirestore,
        private classroomService: ClassroomsService,
        private uiService: UiService,
        private masterService: MasterService,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private teacherService: TeacherService
    ) {
        const boardSub: any = this.configurationService.boardListSub.subscribe((d: any) => {
            this.boardList = d?.filter(e => e.code !== 'ICSE');
            if (!d) {
                this.configurationService.getBoardList('BoardListAll');
            }
        });
        this.subcriptionRef.push(boardSub);
        const lanSub: any = this.configurationService.languageListSub.subscribe((d: any) => {
            this.languageList = d;
            if (!d) {
                this.configurationService.getLanguageList('Languages');
            }
        });
    }

    ngOnDestroy(): void {
        this.progSub?.unsubscribe();
    }

    onSelectionChange(event) {
        this.isStemClubUi = event.value === 'STEM-CLUB';
        this.programmeType = event.value === 'CLASSROOM' ? 'REGULAR' : event.value === 'STEM-CLUB' ? 'STEM-CLUB' : '';
    }

    async ngOnInit(): Promise<void> {
        this.infoForm?.get('programmeInfo')?.disable();
        this.infoForm?.get('country')?.disable();

        // get country details (board, country code, country)
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.infoForm, this.isLoaded);
        [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];

        const watchList = [
            'type',
            'country',
            'pincode',
            'institution',
            'institution',
            'grade',
            'section',
            'stemClubName',
        ];

        const unlockList = [
            'country',
            'pincode',
            'board',
            'grade',
            'stemClubName',
            'section',
            'programmeInfo',
            'programmeInfo',
        ];

        for (let i = 0; i < watchList.length; i++) {
            this.unlockFormSequentially(watchList[i], unlockList[i]);
        }
    }

    checknumber(val) {
        if (typeof (val) == 'number') {
            return true;
        }
        else {
            return false;
        }
    }

    async updateProgrammes(institutionId: string, fieldValue: any, fieldName: string) {
        const selectedProgrammes = await lastValueFrom(this.programmeService.getLiveProgrammesByInstituteIdAndType(institutionId, this.programmeType).pipe(first()));
        const filteredProgrammes = selectedProgrammes.sort((a, b) => {
            if (a.programmeName > b.programmeName) {
                return 1;
            }
            else {
                return -1;
            };
        });
        this.filteredProgrammes = fieldName === 'grade' ? filteredProgrammes.filter(e => e?.grades?.includes(fieldValue)) : filteredProgrammes;
    }

    async onSubmit(form) {
        const value = { ...form.value, programmes: {}, classroomName: '' };
        this.programmesArr.map((pr: any) => {
            value.programmes[pr.programmeId] = {
                'programmeId': pr.programmeId,
                'displayName': pr.displayName ? pr?.displayName : pr?.programmeName,
                'programmeName': pr?.programmeName,
                'programmeCode': pr?.programmeCode,
                'sequentiallyLocked': false,
            };
        });
        value.classroomName = typeof (value.grade) !== 'number' && value?.grade?.includes('Pre-primary') ? value.grade : `${value.grade} ${value.section}`;
        delete value.programmeInfo;
        delete value.pincode;
        value.classroomCode = (this.classroomCode).toString().padStart(3, '0');

        this.institutionsService.updateInstitutionField(value.institutionId, 'classroomCounter', this.classroomCode);
        value.studentCounter = 0;
        value.studentCredentialStoragePath = '';

        if (this.isStemClubUi) {
            delete value.section;
            delete value.grade;
            delete value.classroomName;
        }
        else {
            delete value.stemClubName;
        }
        delete value.institution;
        const masterClassroom = value;
        for (const programmeId in masterClassroom.programmes) {
            if (masterClassroom.programmes[programmeId].hasOwnProperty('workflowIds')) {
                delete masterClassroom.programmes[programmeId].workflowIds;
            }
            if (masterClassroom.programmes[programmeId].hasOwnProperty('sequentiallyLocked')) {
                delete masterClassroom.programmes[programmeId].sequentiallyLocked;
            }
        }
        try {
            const masterDocId = await this.masterService.addNewObjectToMasterMap('CLASSROOM', 'classrooms', masterClassroom);
            value.masterDocId = masterDocId;
            await this.classroomService.update(value, this.docId);
            this.addClassroomToSchoolRep(value);
            if (this.isStemClubUi) {
                this.uiService.alertMessage('Successful', `${value?.stemClubName} Stem Club Created Successfully`, 'success');
            }
            else {
                this.uiService.alertMessage('Successful', `${value?.classroomName} Classroom Created Successfully`, 'success');
            }
            this.dialog.closeAll();
        } catch (error) {
            this.uiService.alertMessage('Error', 'Error creating classroom', 'error');
            console.error('Error creating classroom', error);
        }
    }

    async onClickSearch() {
        this.infoForm?.get('institution')?.enable();
        this.loadScools();
    }

    loadScools() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('board', '==', this.infoForm.get('board').value)
                .where('institutionAddress.pincode', '==', this.infoForm.get('pincode').value);
        this.institutions$ = this.institutionsService.getSnapshot(query);
        this.sortedInstitutions$ = this.institutions$.pipe(
            map(institutions => institutions.sort((a, b) => {
                if (a.payload.doc.data().institutionName > b.payload.doc.data().institutionName) {
                    return 1;
                }
                else {
                    return -1;
                }

            }))
        );
        this.isLast = true;
    }

    /*
    // old code
    // loadItems() {
    //   const query: QueryFn = (ref: CollectionReference) =>
    //     ref.limit(5)
    //       .where('board', '==', this.infoForm.get('board').value)
    //       .where('institutionAddress.pincode', '==', this.infoForm.get('pincode').value)
    //   this.institutions$ = this.institutionsService.getSnapshot(query).pipe(tap((response: any) => {
    //     this.orgData = response.map(value => {
    //       return value.payload.doc.data()
    //     })
    //     if (response.length <= 5) {
    //       this.isLast = true
    //     }
    //     this.lastInResponse = response[response.length - 1]?.payload?.doc;
    //   }))
    //     , error => {
    //       console.error(error)
    //     };
    // }
    // async getNextBatch() {
    //   this.nextPage()
    // }
    // nextPage() {
    //   if (this.lastInResponse) {
    //     const query: QueryFn = (ref: CollectionReference) =>
    //       ref.limit(5)
    //         .where('board', '==', this.infoForm.get('board').value)
    //         .where('institutionAddress.pincode', '==', this.infoForm.get('pincode').value)
    //         .startAfter(this.lastInResponse)
    //     this.fetchMore$ = this.institutionsService.getSnapshot(query).pipe(tap((response: any) => {
    //       const data = response.map(value => {
    //         return value.payload.doc.data()
    //       })
    //       this.orgData = [...this.orgData, ...data]
    //       if (!response.length) {
    //         this.isLast = true;
    //       }
    //       if (response.length == 5) {
    //         this.lastInResponse = response[response.length - 1].payload.doc;
    //       }
    //       else {
    //         this.lastInResponse = null
    //       }
    //     }))
    //     this.institutions$ = merge(this.institutions$, this.fetchMore$).pipe(reduce((a, b) => a.concat(b)));
    //   }
    // }
    */

    async createSchool() {
        await import('app/modules/registration/school-create/school-create.module').then(() => {
            const dialogRef = this.dialog.open(SchoolCreateComponent, {
                data: {
                    parent: 'classroom-create',
                    country: this.infoForm.get('country').value,
                    countryCode: this.teacherCountryCode,
                    pin: this.infoForm.get('pincode').value,
                    board: this.infoForm.get('board').value,
                    lang: this.languageList,
                    createdSource: 'classroom-addition'
                }
            });
        });
    }

    /*
    // old code
    getAllLiveProgrammes() {
      this.progSub = this.programmeService.getAllLiveProgrammes().subscribe(res => {
        this.allProgrammes = res
        this.allProgrammes = this.allProgrammes.sort((a, b) => {
          if (a.programmeName > b.programmeName) {
            return 1
          }
          else {
            return -1
          }
        })
        this.allprogramsCopy = res
      });
    }
    */

    // getAllLiveProgrammesByType(type: string) {
    //     this.progSub = this.programmeService.getAllLiveProgrammesByType(type).subscribe(res => {
    //         this.allProgrammes = res
    //         this.allProgrammes = this.allProgrammes.sort((a, b) => {
    //             if (a.programmeName > b.programmeName) {
    //                 return 1;
    //             }
    //             else {
    //                 return -1;
    //             };
    //         })
    //         this.allprogramsCopy = res;
    //     });
    // }

    async createProgramme() {
        await import('../../programmes/programmes.module').then(() => {
            const dialogRef = this.dialog.open(ProgramInfoComponent, {
                data: {
                    addNewProgramFlag: true,
                    allPrograms: this.filteredProgrammes,
                    classroomDetails: this.infoForm.value,
                },
            });
            this.progSub = dialogRef.afterClosed().subscribe((result) => {
                this.filteredProgrammes.push(result);
                // this.infoForm.get('programmeInfo').patchValue([...this.infoForm.get('programmeInfo').value, result])
                // const index = this.allProgrammes.findIndex(pr => {
                // const index = this.filteredProgrammes.findIndex(pr => {
                //     return pr.programmeId == result.programmeId
                // })
                // this.infoForm.patchValue({
                //     // programmeInfo: [...this.infoForm.get('programmeInfo').value, this.allProgrammes[index].programmeId]
                //     programmeInfo: [...this.infoForm.get('programmeInfo').value, this.filteredProgrammes[index].programmeId]
                // })
            });
        });
    }

    /*
    // old code
    onClickSchool(schoolInfo) {
        this.gradeList = Array.from({ length: 10 }).map((_, i) => i + 1);
        this.gradeList.push('Pre-primary 1')
        this.gradeList.push('Pre-primary 2')
        this.gradeList.push('Pre-primary 3')

        this.section = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NA'];
        this.selectedGradewithSec = []
        this.infoForm.patchValue({
            institutionId: schoolInfo?.institutionId
        })
        let registeredClassrooms = this.data?.classroomsData?.filter(d => d?.institutionId == schoolInfo?.institutionId)
        this.gradeList.forEach((e, index) => {
            let sec = this.getSections(e, registeredClassrooms)
            if (sec.length == this.section.length) {
                this.gradeList.splice(index, 1)
            }
            else {
                sec = this.removeDuplicates(sec)
                this.selectedGradewithSec.push({
                    grade: e,
                    section: sec
                })
            }
        })
        this.representativePhoneNumber = schoolInfo?.representativePhoneNumber
        this.classroomCode = parseInt(schoolInfo?.classroomCounter) ?? 0 + 1;
    }
    */

    async onSelectionChangeInstitution(event: MatSelectChange) {
        const schoolInfo = event.value;
        this.gradeList = Array.from({ length: 10 }).map((_, i) => i + 1);
        this.gradeList.push('Pre-primary 1');
        this.gradeList.push('Pre-primary 2');
        this.gradeList.push('Pre-primary 3');

        this.section = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NA'];
        this.selectedGradewithSec = [];
        this.infoForm.patchValue({
            institutionId: schoolInfo.institutionId,
            institutionName: schoolInfo.institutionName,
        });
        const registeredClassrooms = this.data?.classroomsData?.filter(d => d?.institutionId == schoolInfo?.institutionId);
        this.gradeList.forEach((e, index) => {
            let sec = this.getSections(e, registeredClassrooms);
            if (sec.length == this.section.length) {
                this.gradeList.splice(index, 1);
            }
            else {
                sec = this.removeDuplicates(sec);
                this.selectedGradewithSec.push({
                    grade: e,
                    section: sec
                });
            }
        });
        this.representativePhoneNumber = schoolInfo.representativePhoneNumber;
        // this.classroomCode = parseInt(schoolInfo?.classroomCounter ?? 0) + 1;
         this.classroomCode = await this.getNextClassroomCode(schoolInfo?.institutionId);
    }

    addClassroomToSchoolRep(classInfo) {
        const classroomDetails = {
            activeStatus: true,
            classroomCode: classInfo.classroomCode,
            classroomId: classInfo.classroomId,
            createdAt: serverTimestamp(),
            institutionId: classInfo.institutionId,
            institutionName: classInfo.institutionName,
            programmes: Object.values(classInfo.programmes).map((programme: any) => {
                // Create a shallow copy of each programme object
                const { workflowIds, ...programmeWithoutWorkflowIds } = programme;
                return programmeWithoutWorkflowIds;
            }),
            type: classInfo.type,
            userRole: 'schoolTeacher'
        };

        classroomDetails[this.isStemClubUi ? 'stemClubName' : 'classroomName'] = this.isStemClubUi
            ? classInfo.stemClubName
            : classInfo.classroomName;
        const query: QueryFn = (ref: CollectionReference) => ref.where('teacherMeta.phoneNumber', '==', this.representativePhoneNumber);
        this.teacherService.getWithQuery(query).pipe(take(1)).subscribe(async (res) => {

            if (res.length) {
                const classObj = {
                    classrooms: {
                        [classInfo.classroomId]: classroomDetails
                    }
                };

                const repDocId = res[0].docId;
                await this.teacherService.updateTeacher(classObj, repDocId);
            }
        });
    }

    getSections(grade, institutionClses) {
        const institutionsec = [];
        institutionClses?.forEach((h) => {
            if (h.grade == grade) {
                institutionsec.push(h.section);
            }
        });
        const d = this.removeDuplicates(institutionsec);
        return institutionsec;
    }

    onSelectGrade(grade) {
        this.section = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NA'];
        const index = this.selectedGradewithSec.findIndex(e => e.grade == grade.value);
        this.selectedGradewithSec?.[index]?.section?.forEach((sec) => {
            if (this.section.includes(sec)) {
                this.section.splice(this.section.indexOf(sec), 1);
            }
        });
    }

    removeDuplicates(arr) {
        return arr.filter((value, index, self) => self.indexOf(value) === index);
    }

    onClickOption(programme) {
        const index = this.programmesArr.findIndex(pr => pr.programmeId == programme.programmeId);
        if (index == 1) {
            this.programmesArr.splice(index, 1);
        }
        else {
            this.programmesArr.push(programme);
        }
    }

    onsectionChange(e) {
    }

    onFocusoutName(controlName: string) {
        // trim spaces in form field
        const name: any = this.infoForm?.get(controlName)?.value;
        if (name && typeof (name) === 'string') {
            this.infoForm?.patchValue({
                [controlName]: name?.trim()
            });
            // if form patch value fails, then use set value
            // (this.schoolInfo?.get(controlName) as FormControl)?.setValue(name.trim());
        };
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
                    }
                });
                break;

            case 'pincode':
                this.infoForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (/^\d{4,6}|[\w\d]+( )|( - )[\w\d]+$/.test(res?.toString())) {
                        this.infoForm?.get(unlock)?.enable();
                        this.selectGrade = true;
                        this.selectSection = true;
                        this.selectPrograms = true;
                        this.searchBtnClick = false;
                        this.infoForm.get('grade').reset();
                        this.infoForm.get('section').reset();
                        this.infoForm.get('institutionName').reset();
                        this.infoForm.get('institutionId').reset();
                        this.infoForm.get('programmeInfo').reset();
                        this.infoForm.get('board').reset();
                    };
                });
                break;

            case 'grade':
                this.infoForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res) {
                        const institutionId = this.infoForm?.get('institutionId')?.value;
                        this.updateProgrammes(institutionId, res, watch);
                        this.infoForm?.get(unlock)?.enable();
                    };
                });
                break;

            case 'stemClubName':
                this.infoForm?.get(watch)?.valueChanges?.subscribe((res) => {
                    if (res) {
                        const institutionId = this.infoForm?.get('institutionId')?.value;
                        this.updateProgrammes(institutionId, res, watch);
                        this.infoForm?.get(unlock)?.enable();
                    };
                });
                break;

            default:
                this.infoForm?.get(watch)?.valueChanges?.subscribe(async (res) => {
                    if (res) {
                        this.infoForm?.get(unlock)?.enable();
                    };
                });
                break;
        }
    }


    async getNextClassroomCode(institutionId: string): Promise<number> {
    // Get all classrooms for this institution
    const classrooms = await lastValueFrom(
        this.classroomService.getClassroomByinstitutionID(institutionId)
    );
    
    if (!classrooms || classrooms.length === 0) {
        return 1; // First classroom
    }
    
    // Find the highest existing classroomCode
    const existingCodes = classrooms
        .map((c: any) => parseInt(c.classroomCode) || 0)
        .filter((code: number) => !isNaN(code));
    
    const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    
    return maxCode + 1;
}
}
