import { Component, OnDestroy, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ActivatedRoute, Router } from '@angular/router';

import { FuseLoadingService } from '@fuse/services/loading';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { StudentsTeachersInfoComponent } from 'app/modules/students-teachers-info/students-teachers-info.component';
import { ProfileSelectionService } from 'app/shared/profile-selection.service';
import { ReadService } from 'app/shared/read.service';
import { BehaviorSubject, Subject, Subscription, firstValueFrom, lastValueFrom, map, take, takeUntil } from 'rxjs';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { MatDialog } from '@angular/material/dialog';
import { environment } from 'environments/environment';
import { SharedService } from 'app/shared/shared.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { DialogComponent } from 'app/layout/common/user/dialog/dialog.component';
import { StudentsTeachersInfoJigyaasaComponent } from 'app/modules/students-teachers-info-jigyaasa/students-teachers-info-jigyaasa.component';
import { KitSelectDialogComponent, KitSelectDialogResult } from 'app/modules/quiz/kit-select-dialog/kit-select-dialog.component';
import { KitService } from 'app/modules/admin/kit/kit.service';

@Component({
    selector: 'app-classroom-list',
    templateUrl: './classroom-list.component.html',
    styleUrls: ['./classroom-list.component.scss'],
})

export class ClassRoomListComponent implements OnInit, OnDestroy {
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    @ViewChild('productListcontainer', { read: ViewContainerRef })
    productListcontainer: ViewContainerRef;
    selectedGame = { code: 'All', name: 'All' };
    selectedTypeCode$ = new BehaviorSubject(null);
    filters: {
        categorySlug$: BehaviorSubject<string>;
        query$: BehaviorSubject<string>;
        hideCompleted$: BehaviorSubject<boolean>;
    } = {
            categorySlug$: new BehaviorSubject('all'),
            query$: new BehaviorSubject(''),
            hideCompleted$: new BehaviorSubject(false)
        };
    learingUnitsinProgram;
    filteredLearningUnitsinprogram;
    loadingdata = false;
    arrayofTabs = [];
    programme;
    workflowIds;
    tactivities;
    tacCategories;
    filtered;
    filteredClassroom;
    currentContest;
    searchTerm;
    currentQueryparams;
    selectedProgramme: any;
    programmeAssignments = [];
    assignmentInfoArr: any = [];
    TACList: any;
    ramanUI = false;
    siteLocale: string;
    siteLanguage: string = 'English';
    languageList = [
        { code: 'en', label: 'English' },
        { code: 'hi', label: 'हिंदी' },
    ];
    email: any;
    userName = ' ';
    profileImageURL: any;
    teacherInfo: any;
    subscriptions: Subscription[] = [];
    userDetails: any;
    childrenDetails: unknown;
    loaderFlag = true;
    docData: any;
    currentActiveContent: any;
    children: any = [];
    builtChild: any;
    childName: any;
    individualChildData: any;
    filterProgramme;
    testProgramme: any = [
        {
            workflowId: 'freemium',
            institution: 'Thinktac',
            subject: 'Science',
            className: 'Class-iv section b'
        }
    ];
    classInfo;
    listView: boolean = true;
    currentTeacherInfo: any;
    enabledSpinner = false;
    unsubscribe: any = [];
    isFirstTimeLanding: boolean = false;
    component;
    drawerOpened: any = false;
    isBannerClose: boolean = false;
    loadingClassroomData: boolean = false;
    queryParams: any;
    // settingBardisplayed: boolean = false
    workflowCompletionList = {};
    monitorProgress: boolean = true;
    teacherDocById: any;
    disableProgressToggle: boolean = false;
    selectedIndex: number;
    programmes: any;
    loadingContest: boolean = false;
    luType: any[];
    selectedElem: any;
    environment = environment;
    flattenedStages: any;
    // contestandClassrooms$ = new BehaviorSubject<any>(null);
    contestandClassrooms$ = [];
    sequentiallyLocked: boolean = false;
    learningUnitsWithoutWorkflow: Array<string> = [];
    privilege: boolean;
    stepsUnlockedArray: Array<boolean> = [];
    dateLockArray: Array<boolean> = [];
    lockUnlockDateArray: Array<any> = [];

    constructor(
        public afAuth: AngularFireAuth,
        public profileSelection: ProfileSelectionService,
        private userService: UserService,
        public readService: ReadService,
        public afs: AngularFirestore,
        private router: Router,
        private workflowService: WorkflowsService,
        private assignmentService: AssignmentsService,
        private classroomService: ClassroomsService,
        private route: ActivatedRoute,
        private programmeService: ProgrammeService,
        private fuseLoaderService: FuseLoadingService,
        private luService: LearningUnitsService,
        private instituteService: InstitutionsService,
        private _navigationService: NavigationService,
        private teacherService: TeacherService,
        private drawerService: FuseDrawerService,
        private workFlowCompletionService: WorkflowCompletionService,
        private configurationService: ConfigurationService,
        private dialog: MatDialog,
        private sharedService: SharedService,
        private contestService: ContestService,
        private kitService: KitService
    ) {
        this.drawerService.drawerOpenSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
            this.drawerOpened = res;
        });

    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        // this.contestandClassrooms$=[];
        this.unsubscribe.forEach(e => e.unsubscribe());
    }

    async ngOnInit(): Promise<void> {
        this.enabledSpinner = true;
        this.dialog.closeAll();
        // this.contestandClassrooms$.next(null);
        this.userService.userInfoSub.pipe(takeUntil(this._unsubscribeAll)).subscribe((userInfo) => {
            this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
        });

        this.configurationService.getTeacherCornerConfigurations().pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
            this.disableProgressToggle = res?.disableLearningUnitProgressLevel;
        });

        await this.welcomeGreetingWANotificationFirstTimeLanding();

        await this.getCurrentTeacherInfo();

        if (this.route.queryParams) {
            this.route.queryParams.pipe(takeUntil(this._unsubscribeAll)).subscribe(async (res) => {
                this.filterProgramme = [];
                this.learingUnitsinProgram = [];
                this.filteredLearningUnitsinprogram = [];
                this.currentQueryparams = res;
                this.checkQueryParams(res);
            });
        }
        const j = [];
        const LutypeData = await firstValueFrom(this.configurationService.getLearningUnitTypes());
        Object.entries(LutypeData.Types).forEach((d) => {
            j.push(d[1]);
        });
        j.push({ code: 'All', name: 'All' });

        this.luType = j;
        this.fuseLoaderService.hide();
        // this.enabledSpinner=false

        this.checkLoginByName(this.teacherDocById?.docId);
    }

    /* Query Params handle here */
    async checkQueryParams(res: any) {
        this.queryParams = res;
        const { institutionId, classroomId, programmeId } = res;
        if (institutionId && classroomId && programmeId) {
            // alert(institutionId)
            // this.contestandClassrooms$.next(null);
            // all ids available in url params
            /*
            // check if classroom exists in classroom & master collection and remove from teacher if not
            const classroomCollection =  await this.classroomService.getClassroomDataById(classroomId);
            const classroomMaster = await this.masterService.getClassroomFromMaster(classroomId);
            if(!classroomCollection && !classroomMaster) {
              this.uiService.alertMessage("Classroom doesn't exist", "This classroom does not exist and will be removed from your account", "error")
              this.classroomService.removeClassroomFromTeacher(this.teacherDocById, classroomId);
            };
            */
            this.loadingdata = true;
            this.loadingClassroomData = true;

            await this.getClassroom(classroomId, programmeId);
            await this.getProgramme(programmeId);
            this.getInstitute(institutionId);
            this.setUsrInfo(res);
            this.assignmentInfoArr = await this.getAllAssignments(classroomId, programmeId);
            const index = this.contestandClassrooms$.findIndex(d => d.programmeId == programmeId);
            this.arrayofTabs = Array.from({ length: this.contestandClassrooms$.length }, i => false);
            this.currentActiveContent = index;
            this.arrayofTabs[index] = true;


            // alert(index)
            // const index = this.teacherDocById?.classrooms?.[this.queryParams.classroomId]?.programmes?.map(item => item?.programmeId).indexOf(programmeId);
            this.selectedIndex = 0;
            // alert("loading is over")
            this.loadingClassroomData = false;
            this.arrayofTabs = Array.from({ length: this.contestandClassrooms$.length }, i => false);

            // let modifiedarr=await this.getProgrammeLevelAss(programmeId)
        }
        else if (institutionId && classroomId && res.contestId && res.stageId) {
            this.loadingContest = true;
            if (this.contestandClassrooms$.length == 0) {
                await this.getClassroom(classroomId, programmeId);

            }
            this.arrayofTabs = Array.from({ length: this.contestandClassrooms$.length }, i => false);

            let index = 0;
            // this.selectedIndex=0
            this.contestandClassrooms$.forEach((d, i) => {
                if (d.contest) {
                    if (d.contest.docId) {
                        if (d.contest.docId == res.contestId && d.stageName.stageId == res.stageId) {
                            index = i;
                        }
                    }
                }
            });
            this.arrayofTabs[index] = true;
            // this.currentContest = this.contestandClassrooms$[index]
            this.currentContest = this.contestandClassrooms$[index];
            // alert(index)
            this.currentActiveContent = index;

            this.selectedIndex = index;
            // this.selectedIndex = index
            // alert(index)

            // this.selectedIndex = 1
            //await this.getProgramme(programmeId)
            this.getInstitute(institutionId);
            //this.setUsrInfo(res)
            this.assignmentInfoArr = [];
            this.loadingContest = false;
            this.arrayofTabs = Array.from({ length: this.contestandClassrooms$.length }, i => false);


        }
        if (!institutionId && !classroomId && !programmeId && !res.contestId && !res.stageId) {
            // no params
            this.router.navigate(['registration']);
        }
        if (!institutionId && classroomId && programmeId && !res.contestId && !res.stageId) {
            // no institutions
        }
        const classroomsList = this.teacherDocById?.hasOwnProperty('classrooms') ? Object.keys(this.teacherDocById?.classrooms) : [];
        if ((institutionId && !classroomId && !programmeId) || !classroomsList?.includes(classroomId)) {
            // no classrooms in institution
            // redirect to next classroom if classrooms else redirect to registration
            if (classroomsList?.length) {
                const nextClassroomId = classroomsList[0];
                const firstProgramId = this.teacherDocById?.classrooms?.[nextClassroomId]?.programmes?.[0]?.programmeId;
                this.router.navigate([`dashboard/${nextClassroomId}`], { queryParams: { institutionId: institutionId, classroomId: nextClassroomId, programmeId: firstProgramId } });
            } else {
                this.router.navigate(['registration']);
            }
        }
        const programmesList = this.teacherDocById?.classrooms?.[classroomId]?.programmes?.map(item => item?.programmeId);
        //let allAssignments = await this.getAssignmentFromPrograms(programDetails)
        if (!res.contestId && !res.stageId) {
            if ((institutionId && classroomId && !programmeId) || !programmesList?.includes(programmeId) && !res.contestId) {
                // no programmes in classroom
                // redirect to next programme
                // alert('runs')
                if (programmesList?.length) {
                    // const nextProgrammeId = programmesList?.[0]?.programmeId;
                    const nextProgrammeId = programmesList[0];
                    this.router.navigate([`dashboard/${classroomId}`], { queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: nextProgrammeId } });
                } else {
                }
            }
        }
        const languageList = await this.configurationService.getLanguageListForProgrammes();
        const learingUnitsinProgram = await this.getALLlu(this.filterProgramme);
        this.learingUnitsinProgram = learingUnitsinProgram.map((d) => {
            const language = languageList?.find(lang => lang?.code === d?.isoCode)?.name;
            return { ...d, language };
        });
        this.filtered = this.learingUnitsinProgram;

        this.selectedType({ code: 'All', name: 'All' });

        if (!this.selectedElem) {
            this.selectedElem = 'All';
            this.selectedType({ code: 'All', name: 'All' });

        }
        else if (this.selectedElem == 'All') {
            this.filteredLearningUnitsinprogram = this.learingUnitsinProgram;
            this.filtered = this.filteredLearningUnitsinprogram;
        }
        else {
            this.filteredLearningUnitsinprogram = this.learingUnitsinProgram.filter(d => d.typeCode == this.selectedElem);
            this.filtered = this.filteredLearningUnitsinprogram;
        }

        this.loadingdata = false;
    }

    // checkClassroomInTeacher(queryParams: any) {
    //   const classroomId = queryParams?.classroomId
    //   const programmeId = queryParams?.programmeId || ''
    //   if (this.teacherDoc.value) {
    //     const teacherDoc = this.teacherDoc.value
    //     const classKeys = Object.keys(teacherDoc?.classrooms)
    //     if (classKeys.includes(classroomId)) {
    //       const programmesArr = teacherDoc.classrooms[classroomId].programmes
    //       const filterProgrammeArr = programmesArr.map(item => {
    //         return item.programmeId
    //       })
    //       const programmesKeys = filterProgrammeArr
    //       if (programmesKeys.includes(programmeId)) {
    //       }
    //       else {
    //         if (programmesKeys.length == 1) {
    //           const pId = programmesKeys[0]
    //           this.router.navigate([`dashboard/${classroomId}`], { queryParams: { institutionId: queryParams.institutionId, classroomId: classroomId, programmeId: pId } });
    //         }
    //         else if (programmesKeys.length > 1) {
    //           const pId = programmesKeys[0] !== programmeId ? programmesKeys[0] : programmesKeys[1]
    //           this.router.navigate([`dashboard/${classroomId}`], { queryParams: { institutionId: queryParams.institutionId, classroomId: classroomId, programmeId: pId } });
    //         }
    //       }
    //     }
    //   }
    // }

    async welcomeGreetingWANotificationFirstTimeLanding() {
        const uid = await this.userService.getUid();

        this.teacherDocById = await this.teacherService.getDocDataById(uid);

        const teacherDoc: any = this.teacherDocById;
        this.teacherService.currentTeacherId.next(teacherDoc?.docId);
        const teacherInfo = teacherDoc?.teacherMeta;
        const userDoc: any = await this.userService.getDocDataById(uid);
        const isFirstTimeLanding = userDoc?.['currentTeacherInfo'] ? false : true;

        const teacher = {
            phone: `${teacherInfo?.countryCode}${teacherInfo?.phoneNumber}`,
            name: `${teacherInfo?.firstName} ${teacherInfo?.lastName}`
        };
        // if (userDoc?.accessLevel >= 10) {
        //     this.settingBardisplayed = true
        // }
        if (isFirstTimeLanding && teacherInfo) {
            const phoneNumber = teacher?.phone;
            const templateName = environment.whatsAppTemplates.firstTimeGreetingTeacherCorner.templateName;
            const headerImage = environment.whatsAppTemplates.firstTimeGreetingTeacherCorner.headerImage;
            const mediaType = 'image';
            const params = [
                teacher?.name
            ];
            const urlRoute = undefined;

            this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);
        }
    }

    checkTeacherClassroom() {
        this._navigationService.classroomNavSubject$.subscribe((teacherCls: any) => {
            if (!teacherCls.default.filter(d => d.link.includes('/dashboard')).length) {
                this.router.navigate(['registration']);
            }
        });
    }

    async getClassroom(classroomId: string, programmeId: string) {
        this.flattenedStages = [];
        const classroomdata: any = await this.classroomService.getClassroomDataById(classroomId);
        // classroom$.pipe(takeUntil(this._unsubscribeAll)).subscribe(async res => {
        if (classroomdata) {
            const res = classroomdata;
            this.classroomService.currentClassroomName.next(res.classroomName);
            this.programmes = res?.programmes;
            if (programmeId) {
                const currentProgramme = res?.programmes?.[programmeId];
                this.workflowIds = currentProgramme?.workflowIds;

                this.sequentiallyLocked = currentProgramme?.sequentiallyLocked || false;
            }
            else {
                this.workflowIds = [];
            }


            // Only include programs, exclude contests
            this.contestandClassrooms$ = [...(this.teacherDocById?.classrooms?.[this.queryParams.classroomId]?.programmes || [])];

        }
        else {
            // alert(classroomdata)
            this.contestandClassrooms$ = [];
        }
        // })
    }

    getInstitute(id) {
        const doc = this.instituteService.getWithId(id);
        doc.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
            if (res) {
                this.instituteService.currentInstitutionName.next(res?.institutionName);
            }
        });
    }

    async getProgramme(programmeId: string) {
        // const doc = await this.programmeService.get(programmeId);
        const programmmeRef = await lastValueFrom(this.programmeService.getProgrammeByIdOnce(programmeId));
        const programmme = programmmeRef.exists ? programmmeRef.data() : {};
        //  return new Promise((resolve,reject)=>{
        // doc.pipe(take(1)).subscribe(async (res) => {
        //     if (res) {
        //         this.selectedProgramme = res;
        //         this.programmeService.currentProgrammeName.next(res?.displayName);
        //         await this.getLearningUnits(res?.learningUnitsIds);
        //     }
        //     //      resolve('')
        //     //    })
        // });
        this.selectedProgramme = programmme;
        this.programmeService.currentProgrammeName.next(programmme?.displayName);
        await this.getLearningUnits(programmme?.learningUnitsIds);
    }

    async newLUdocs(data) {
        return await Promise.all(data.map(async d => new Promise((resolve) => {
            this.luService.getLUbyquery(d).subscribe((s: any) => {
                resolve(s.docs.map(d => d.data())[0]);
            });
        })));
    }

    async getLearningUnits(programmes) {
        // const ludocs = await this.newLUdocs(programmes)
        // let lumaps=ludocs.map(d=>d.docId)
        // programmes=lumaps
        const languageList = await this.configurationService.getLanguageListForProgrammes();
        this.filterProgramme = programmes?.map((res: any) => this.luService.get(res.trim()).pipe(map((d: any) => {
            const language = languageList.find((language: any) => language?.code === d?.isoCode)?.name;
            return { ...d, language };
        })));
        //this.filterProgramme=ludocs
    }

    filterByQuery(query: string): void {
        this.searchTerm = query;
        if (query !== '') {
            this.filteredLearningUnitsinprogram = this.filtered?.filter(data => (data?.learningUnitName?.toLowerCase().includes(query.toLowerCase()) ||
                data?.learningUnitDisplayName?.toLowerCase().includes(query.toLowerCase()) ||
                data?.docId?.toLowerCase().includes(query.toLowerCase()) ||
                (data?.learningUnitCode?.toLowerCase().includes(query.toLowerCase())) ||
                (data?.version?.toLowerCase().includes(query.toLowerCase()))
            ));
        }

        else {
            this.filteredLearningUnitsinprogram = this.filtered;
        }
        this.filters.query$.next(query);
    }

    trackByFn(index: number, item: any): any {
        return item?.id || index;
    }

    //     async onClickTab(program: MatTabChangeEvent) {
    // )
    //         // onClickTab(program: any) {
    //         // if (!loaded) {
    //             let data = this.contestandClassrooms$.value[program.index]
    //             const { institutionId, classroomId } = this.route.snapshot.queryParams;
    //             //const programmes = this.teacherDocById?.classrooms?.[classroomId]?.programmes
    //             if (program.index + 1 > this.contestandClassrooms$.value.length) {
    //                 return
    //             }
    //            // const currentProgrammeId = programmes?.[program.index]?.programmeId;
    //             if (data.contest.docId) {
    //                 this.router.navigate([`dashboard/${classroomId}`], { queryParams: { institutionId: institutionId, classroomId: classroomId, contestId: data.contest.docId } });
    //             }
    //             else {
    //                 alert('going to pragram')
    //                 this.router.navigate([`dashboard/${classroomId}`], { queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: data.programmeId } });
    //             }
    //         //}
    //         // else {
    //         // }
    //     }

    async onClickTab(program: MatTabChangeEvent, loading = true) {
        // Retrieve the selected tab's data
        if (!loading) {
            const data = this.contestandClassrooms$[program.index];
            // Extract institutionId and classroomId from query params
            const { institutionId, classroomId } = this.route.snapshot.queryParams;

            // Ensure the selected tab index is within bounds
            if (program.index + 1 > this.contestandClassrooms$.length) {
                return;
            }

            // Determine navigation based on whether it's a contest or programme
            if (data.contest?.docId) {
                this.router.navigate([`dashboard/${classroomId}`], {
                    queryParams: {
                        institutionId: institutionId,
                        classroomId: classroomId,
                        contestId: data.contest.docId,
                        stageId: data.stageName.stageId
                    },
                });
            } else if (data.programmeId) {
                //   alert('Navigating to Programme');
                // await this.getProgramme(data.programmeId);
                this.router.navigate([`dashboard/${classroomId}`], {
                    queryParams: {
                        institutionId: institutionId,
                        classroomId: classroomId,
                        programmeId: data.programmeId,
                    },
                });
            } else {
                console.error('Invalid data: Neither contest nor programme ID found');
            }
        }

    }

    onClickContestTab() {
        const { classroomId } = this.route.snapshot.queryParams;
        this.router.navigate([`dashboard/${classroomId}/class-contests`]);
    }

    toggleProgressMonitoring(change: MatSlideToggleChange): void {
        this.monitorProgress = change.checked;
    }

    toggleList(change: MatSlideToggleChange): void {
        //
        //   this.selectedGame = { code: 'All', name: 'All' }
        //   this.selectedType({ code: 'All', name: 'All' })
        if (!this.selectedElem) {
            this.selectedElem = 'All';
        }
        else if (this.selectedElem == 'All') {
            this.filteredLearningUnitsinprogram = this.learingUnitsinProgram;
        }
        else {
            this.filteredLearningUnitsinprogram = this.learingUnitsinProgram.filter(d => d.typeCode == this.selectedElem);
        }
        const currentTeacherInfo = {
            listView: null
        };
        this.userService.setTeacherInfo({ currentTeacherInfo });
        this.listView = change.checked;
        currentTeacherInfo.listView = change.checked;
        this.userService.setTeacherInfo({ currentTeacherInfo });
    }

    setUsrInfo(obj: any) {
        const currentTeacherInfo = {
            institutionId: obj?.institutionId || '',
            classroomId: obj?.classroomId || '',
            programmeId: obj?.programmeId || '',
        };

        this.userService.setTeacherInfo({ currentTeacherInfo });
    }

    async getCurrentTeacherInfo() {
        (await this.userService.getTeacherInfo()).pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
            this.currentTeacherInfo = res?.currentTeacherInfo;
            if (res?.currentTeacherInfo) {
                //  const index = this.teacherDocById?.classrooms?.[this.queryParams.classroomId]?.programmes?.map(item => item?.programmeId).indexOf(lastProgrammeId);
                //  alert(index)
                // this.selectedIndex = 0
            }
            this.listView = res?.currentTeacherInfo?.listView;
            this.workFlowCompletionService.getAllResources(res['docId']).pipe(take(1)).subscribe((response) => {
                if (response.docs.length > 0) {
                    for (let i = 0; i < response.docs.length; i++) {
                        this.workflowCompletionList[response.docs[i].data()['docId']] = response.docs[i].data();
                    }
                };
            });
        });
    }

    async openRemoteDialog() {
        const institutionId = this.queryParams?.institutionId;
        const classroomId = this.queryParams?.classroomId;

        if (!institutionId || !classroomId) {
            console.error('Missing institutionId or classroomId');
            return;
        }

        const kitDialogRef = this.dialog.open(KitSelectDialogComponent, {
            width: '720px',
            maxWidth: '95vw',
            panelClass: 'quiz-remote-setup-dialog',
            disableClose: true,
            data: {
                institutionId,
                classroomId
            }
        });

        const kitResult: KitSelectDialogResult = await firstValueFrom(kitDialogRef.afterClosed());

        if (!kitResult || !kitResult.selectedKit) {
            return;
        }

        // Mapping is auto-created in background from KitSelectDialog (Save)
        console.log('Kit selected and mapping saved');
    }

    async toggle() {
        if (environment.firebase.projectId == 'jigyasa-e3fbb') {
            await import('../../students-teachers-info-jigyaasa/students-teachers-info-jigyaasa.module').then(() => {
                this.component = StudentsTeachersInfoJigyaasaComponent;
            });
        }
        else {
            await import('../../students-teachers-info/students-teachers-info.module').then(() => {
                this.component = StudentsTeachersInfoComponent;
            });
        }

        const programmeLearningUnits = this.selectedProgramme?.learningUnitsIds;
        const programmeWorkflows = this.workflowIds?.filter(workflow => programmeLearningUnits?.includes(workflow?.learningUnitId));
        this.drawerService.drawerOpenSubject.next(true);
        this.drawerService.drawerOpenLearningUnitsSubject.next(this.filteredLearningUnitsinprogram);
        this.drawerService.drawerOpenWorkflowsSubject.next(programmeWorkflows);
    }

    async getAllAssignments(classroomId: string, programmeId: string) {
        const assignments = [];
        const classroom = await lastValueFrom(this.classroomService.getClassroomByIdOnce(classroomId));
        if (classroom.exists) {
            const programmes = classroom.get('programmes');
            const programKeys = Object.keys(programmes);
            const currentProgrammeId = programKeys.find(programme => programme === programmeId);
            const currentProgramme = programmes[currentProgrammeId];
            if (currentProgramme) {
                if (currentProgramme.hasOwnProperty('workflowIds')) {
                    // get workflow level assignments
                    /*
                    // old code
                    const workFlows = currentProgramme['workflowIds'].map(x => { return { wfId: x?.workflowId, luId: x?.learningUnitId } });
                    // await Promise.all(
                        workFlows.map(async (wf: any) => {
                            const workflow = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(wf?.wfId));
                            workflow.get('workflowSteps').map(async (workflowStep) => {
                                // await Promise.all(
                                    workflowStep.contents.map(async (content, index) => {
                                        return new Promise(async (resolve, reject) => {
                                            if (content.contentType === 'assignment') {
                                                const assignment = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(content?.['assignmentId']));
                                                if (assignment.exists) {
                                                    assignments.push({ ...assignment.data(), ...content, workflowId: wf?.wfId, learningUnitId: wf?.luId });
                                                };
                                            }
                                            // resolve('')
                                        })
                                    })
                                // )
                            })
                        })
                    // )
                    */
                    this.stepsUnlockedArray = currentProgramme['workflowIds'].map((x: any, index: number) => {
                        if (index === 0) {
                            return true;
                        } else {
                            return currentProgramme['workflowIds'][index - 1].isAllStepsCompleted ?? false;
                            // return currentProgramme['workflowIds'][index - 1].hasOwnProperty('isAllStepsCompleted') && currentProgramme['workflowIds'][index - 1].isAllStepsCompleted ? true : false;
                        };
                    });

                    this.dateLockArray = currentProgramme['workflowIds'].map((x) => {
                        const unlockAtSeconds = x?.unlockAt?.seconds;
                        const lockAtSeconds = x?.lockAt?.seconds;
                        const currentTime = new Date().getTime() / 1000;

                        return (unlockAtSeconds && lockAtSeconds)
                            ? currentTime < unlockAtSeconds || currentTime > lockAtSeconds
                            : false;
                    });

                    this.lockUnlockDateArray = currentProgramme['workflowIds'].map(x => ({ unlockAt: x?.unlockAt?.seconds, lockAt: x?.lockAt?.seconds }));

                    const workFlows = currentProgramme['workflowIds'].map(x => ({ wfId: x?.workflowId, luId: x?.learningUnitId }));

                    await Promise.all(workFlows.map(async (wf: any) => {
                        if (wf?.hasOwnProperty('wfId') && wf?.wfId?.length) {
                            const workflow = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(wf?.wfId));
                            if (workflow?.data()) {
                                await Promise.all(workflow.get('workflowSteps')?.flatMap(async workflowStep => await Promise.all(workflowStep.contents.map(async (content) => {
                                    if (content.contentType === 'assignment') {
                                        const assignmentSnap: any = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(content?.['assignmentId']));
                                        if (assignmentSnap?.exists) {
                                            const assignmentData = typeof assignmentSnap?.data === 'function' ? assignmentSnap.data() : assignmentSnap?.data;
                                            assignments.push({ ...assignmentData, ...content, workflowId: wf?.wfId, learningUnitId: wf?.luId });
                                        };
                                    };
                                }))));
                            }
                        } else {
                            // console.error(`learning unit ${wf?.luId} doesn't have a workflow`);
                            this.learningUnitsWithoutWorkflow.push(wf?.luId);
                        };
                    }));
                }
            }

            // get programme level assignments
            // const programme = await lastValueFrom(this.programmeService.getProgrammeDocByIdOnce(currentProgrammeId));
            // if (programme.exists) {
            //     programme.get('assignmentsIds').map(async (assignmentId: any, index: number) => {
            //         const assignment = (await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(assignmentId))).data();
            //         assignments.push(assignment);
            //     });
            // }

            if (this.selectedProgramme) {
                const workFlowlevelassigmentsdocs = assignments.filter(assi => assi.docId);
                const assignmentIds = this.selectedProgramme['assignmentIds'];
                // Fetch programme level assignments concurrently
                if (assignmentIds && Object.values(assignmentIds)?.length) {
                    let programmeAssignments = await Promise.all(Object.values(assignmentIds)?.map(async (assignmentInfo: any) => {
                        const assignmentSnap: any = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(assignmentInfo?.assignmentId));
                        const assignmentData = typeof assignmentSnap?.data === 'function' ? assignmentSnap.data() : assignmentSnap?.data;
                        return { ...assignmentData, belongsTo: 'programme', assignmentDueDate: assignmentInfo.assignmentDueDate };
                    }));
                    programmeAssignments = programmeAssignments.filter(prass => !workFlowlevelassigmentsdocs.includes(prass.docId));
                    programmeAssignments.forEach((assig) => {
                        assignments?.push(assig);
                    });
                    // Push programme assignments to assignments array
                } else {
                    console.error(`No assignments found for the programme ${this.selectedProgramme?.docId}`);
                }
            }
        }

        /*
        let assignMentDocs = assignments.sort((a, b) => {
            const dateA = new Date(a.assignmentDueDate.seconds * 1000);
            const dateB = new Date(b.assignmentDueDate.seconds * 1000);

            if (dateA > dateB) {
                return 1;
            } else if (dateA < dateB) {
                return -1;
            } else {
                return 0;
            }
        });

        this.assignmentService.assignmentList.next(assignMentDocs.flat())
        */

        const assignMentDocs = assignments.sort((a, b) => a.assignmentDueDate.seconds - b.assignmentDueDate.seconds);

        this.assignmentService.assignmentList.next(assignMentDocs);

        // this.assignment.assignments=assignments.flat()
        /*
        // old code
        // get workflow level assignments
        const c = (await this.classroomService.get(classroomId)).toPromise()
        const cls = await c
        if(cls) {
          let programKeys = Object.keys(cls.programmes)
          let programme = programKeys.find(e => e == programmeId)
          let prog = cls.programmes[programme]
          if (typeof (prog?.workflowIds)) {
            prog?.workflowIds?.map(wf => {
              wfIds.push({ wfId: wf?.workflowId, luId: wf?.learningUnitId })
            })
          }
        }

        wfIds.forEach(async wf => {
          this.workflowService.get(wf?.wfId).subscribe(w => {
            const wfInfo = w || []
            wfInfo?.workflowSteps?.forEach((wfStep: any) => {
              wfStep?.contents?.forEach(async c => {
                if (c?.contentType == 'assignment') {
                  const a = firstValueFrom(this.assignmentService.getWithId(c?.assignmentId))
                  if (a !== undefined) {
                    assignments.push({ ...await a, ...c, workflowId: wf?.wfId, learningUnitId: wf?.luId })
                  } else {
                    const prog: any = await this.programmeService.getProgrammeDocDataById(programmeId)
                    prog.assignmentsIds.map(async x => {
                      const a = firstValueFrom(this.assignmentService.getWithId(x));
                      assignments.push({ ... await a, ...c, workflowId: wf?.wfId, learningUnitId: wf?.luId });
                    })
                  }
                }
              })
            })
          })
        });
        */
        return assignments;
    }

    //     async getProgrammeLevelAss(programmeId){
    //         const currentProgrammeId = programKeys.find(programme => programme === programmeId);
    //         const currentProgramme = programmes[currentProgrammeId];
    // }

    async getProgramsAssignments(programmeAssignments) {
        return await Promise.all(
            programmeAssignments?.map(async d => new Promise((resolve) => {
                this.programmeService.getProgrammeDocDataById(d).subscribe((res) => {
                    resolve(res);
                });
            }))
        );
    }

    getAssignmentFromPrograms(programDetails) {
        const assignments = {};

        programDetails.forEach((d) => {
            if (!assignments[d.programmeId]) {
                assignments[d.programmeId] = [];
            }

            Object.keys(d.assignmentIds).forEach((assignmentId) => {
                assignments[d.programmeId].push(d.assignmentIds[assignmentId]);
            });
        });
        //  return assignments
        return Promise.all(
            Object.keys(assignments).map(async d => new Promise((resolve) => {
                // let assignmentsall=await Promise.all(())
                assignments[d].map(async (assignment) => {
                });

            }))
        );
    }

    selectedType(event) {
        if (event.value) {

            if (event.value == 'All') {
                this.selectedElem = 'All';
                this.filteredLearningUnitsinprogram = this.learingUnitsinProgram;
                this.filtered = this.filteredLearningUnitsinprogram;

            }
            else {
                this.filteredLearningUnitsinprogram = this.learingUnitsinProgram.filter(d => d.typeCode == (event.value));
                this.filtered = this.filteredLearningUnitsinprogram;

            }
            this.selectedElem = event.value;
            this.selectedTypeCode$.next(event.value);

        }
        else {
            this.selectedTypeCode$.next(event.code);
            if (event.code == 'All') {

                this.filteredLearningUnitsinprogram = this.learingUnitsinProgram;
                this.filtered = this.filteredLearningUnitsinprogram;
            }
            else {
                this.filteredLearningUnitsinprogram = this.learingUnitsinProgram.filter(d => d.typeCode == event.code);
            }
        }

    }

    async getALLlu(filterprogramme) {
        return Promise.all(
            filterprogramme.map(async m => firstValueFrom(m))
        );
    }

    // checkLoginByName(teacherId: any) {
    //     this.teacherService.getTeacherByIdOnce(teacherId).subscribe(async (res: any) => {
    //         if ( !res.data()?.teacherMeta?.firstName) {
    //             await import('../../../layout/common/user/dialog/dialog.module').then(m => {
    //                 this.dialog.open(
    //                    DialogComponent,
    //                     {
    //                         data: {
    //                             teacherId: teacherId,
    //                             teacherName: res.data()?.teacherMeta?.firstName
    //                         }
    //                     }
    //                 );
    //               });
    //         }
    //     })
    // }

    checkLoginByName(teacherId: any) {
        this.teacherService.getTeacherByIdOnce(teacherId).subscribe(async (res: any) => {
            if (!res.data()?.teacherMeta?.firstName) {
                // Dynamically import the module and open the dialog
                await import('../../../layout/common/user/dialog/dialog.module').then((m) => {
                    DialogComponent; // Get the DialogComponent from the module
                    this.dialog.open(DialogComponent, {
                        data: {
                            teacherId: teacherId,
                            teacherName: res.data()?.teacherMeta?.firstName,
                            currentUser: this.teacherDocById,
                            canClose: false,
                        },
                        disableClose: !res.data()?.teacherMeta?.firstName,
                    });
                });
            }
        });
    }

}
