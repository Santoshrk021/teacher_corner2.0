import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { FuseNavigationItem } from '@fuse/components/navigation/navigation.types';
import { Navigation } from 'app/core/navigation/navigation.types';
import { BehaviorSubject, firstValueFrom, map, Observable } from 'rxjs';
import { ContestService } from '../dbOperations/contests/contest.service';
import { TeacherService } from '../dbOperations/teachers/teachers.service';
import { UserService } from '../dbOperations/user/user.service';
import { ClassroomsService } from '../dbOperations/classrooms/classrooms.service';
import { InstitutionsService } from '../dbOperations/institutions/institutions.service';
import { EventService } from '../dbOperations/events/event.service';
import { StudentsService } from '../dbOperations/students/students.service';

@Injectable({
    providedIn: 'root',
})
export class NavigationService {
    classroomNavSubject$ = new BehaviorSubject<Navigation>(null);
    submissionContestSubject$: any = new BehaviorSubject<Navigation>(null);
    additionalEvent: any[];
    isNavigationLoaded = false
    classroomNavSubject = new BehaviorSubject(null)

    constructor(
        private _httpClient: HttpClient,
        private userService: UserService,
        private contestService: ContestService,
        private teacherService: TeacherService,
        private eventService: EventService,
        private classroomService: ClassroomsService,
        private institutionService: InstitutionsService,
        private router: Router,
        private studentsService: StudentsService,
    ) { }

    get navigation$(): Observable<Navigation> {
        return this.classroomNavSubject$.asObservable();
    }

    getInstituteData(currentValue) {
        const instObj: FuseNavigationItem = {
            id: currentValue.institutionId,
            title: currentValue.institutionName,
            type: 'collapsable',
            icon: 'feather:institute2',
            link: '/dashboard',
            active: true,
        };
        return instObj;
    }

    getClassroomData(currentClassValue: any) {
        if (currentClassValue?.type !== 'STEM-CLUB') {
            const instObj: FuseNavigationItem = {
                id: currentClassValue['classroomId'],
                title: currentClassValue['classroomName'],
                type: 'basic',
                icon: 'feather:classroom2',
                // link: '/dashboard',
                active: false,
                link: `dashboard/${currentClassValue?.classroomId}`,
                queryParams: {
                    institutionId: currentClassValue?.institutionId,
                    classroomId: currentClassValue?.classroomId,
                    programmeId:
                        currentClassValue?.programmes?.[0]?.programmeId,
                },
                meta: {
                    id: 'classrooms',
                    title: 'Classrooms',
                    type: 'CLASSROOM',
                },
            };
            return instObj;
        }
    }

    getStemClubData(currentStemClubValue: any) {
        if (currentStemClubValue?.type !== 'CLASSROOM') {
            const instObj: FuseNavigationItem = {
                id: currentStemClubValue?.['classroomId'],
                title: currentStemClubValue?.['stemClubName'],
                type: 'basic',
                icon: 'feather:classroom2',
                // link: '/dashboard',
                active: false,
                link: `dashboard/${currentStemClubValue?.classroomId}`,
                queryParams: {
                    institutionId: currentStemClubValue?.institutionId,
                    classroomId: currentStemClubValue?.classroomId,
                    programmeId:
                        currentStemClubValue?.programmes?.[0]?.programmeId,
                },
                meta: {
                    id: 'stemclubs',
                    title: 'Stem Clubs',
                    type: 'STEM-CLUB',
                },
            };
            return instObj;
        }
    }

    async get() {
        let instituteClassroom;
        const currUserUid: string = await this.userService.getUid();
        const checkUserAccessLevel: any = await this.userService.getDocDataById(
            currUserUid
        );

        this.teacherService
            .getAllTeacherClassroom(currUserUid)
            .pipe(map((d) => d?.classrooms))
            .subscribe(async (teacherClassrooms) => {
                let navItemsTemp: FuseNavigationItem[] = [];

                if (checkUserAccessLevel?.accessLevel >= 9) {
                    if (checkUserAccessLevel?.accessLevel === 9) {
                        navItemsTemp = this.getAdminView1();
                        await this.getContestDocs();
                        const nominationArr: any = await this.nominationNav();
                        if (nominationArr.length) {
                            navItemsTemp.unshift(...nominationArr)
                        };
                    } else {
                        navItemsTemp = this.getAdminView();
                        const contestGroups = await this.getContestDocs();
                        const eventArr: any = await this.getAllevents(
                            checkUserAccessLevel?.accessLevel
                        );
                        const nominationArr: any = this.nominationNav();

                        if (nominationArr.length)
                            navItemsTemp.unshift(...nominationArr);
                        navItemsTemp.unshift(contestGroups[0]);
                        navItemsTemp.unshift(...eventArr);
                    }
                } else {
                    await this.getContestDocs();
                    const nominationArr: any = this.nominationNav();
                    const eventArr: any = await this.getAllevents(
                        checkUserAccessLevel?.accessLevel
                    );
                    if (nominationArr.length) {
                        navItemsTemp.unshift(...nominationArr);
                    }
                    navItemsTemp.unshift(...eventArr);
                }

                let insClsArr: any = Object?.values(teacherClassrooms || {});
                insClsArr = insClsArr.sort((a, b) =>
                    b?.institutionName?.localeCompare(a?.institutionName)
                );
                const groupedClassroomsByInstitution =
                    this.getGroupedClassroomsByInstitution(insClsArr);
                instituteClassroom = insClsArr.reduce(
                    (acc: any, currentValue: any, arr: any) => {
                        const index = acc?.findIndex(
                            (existsCls) =>
                                existsCls?.['id'] ===
                                currentValue?.['institutionId']
                        );
                        const instData = this.getInstituteData(currentValue);

                        const clsData = this.getClassroomData(currentValue);
                        const stemClubData = this.getStemClubData(currentValue);

                        if (index >= 0) {
                            const targetKey =
                                currentValue.type === 'CLASSROOM'
                                    ? 'classrooms'
                                    : 'stemclubs';
                            const targetChild = acc[index]?.children.find(
                                (child) => child.id === targetKey
                            )?.children;

                            const classroomsForCurrentInstitution =
                                groupedClassroomsByInstitution[
                                currentValue.institutionId
                                ];
                            const classroomTypesForCurrentInstitution =
                                classroomsForCurrentInstitution.map(
                                    (classroom: any) => classroom.type
                                );

                            if (
                                classroomTypesForCurrentInstitution.includes(
                                    'STEM-CLUB'
                                ) &&
                                classroomTypesForCurrentInstitution.includes(
                                    'CLASSROOM'
                                )
                            ) {
                                targetChild.unshift(
                                    currentValue.type === 'CLASSROOM'
                                        ? clsData
                                        : stemClubData
                                );
                            }
                            if (
                                !classroomTypesForCurrentInstitution.includes(
                                    'STEM-CLUB'
                                ) &&
                                classroomTypesForCurrentInstitution.includes(
                                    'CLASSROOM'
                                )
                            ) {
                                acc[index].children.unshift(clsData);
                            }
                            if (
                                classroomTypesForCurrentInstitution.includes(
                                    'STEM-CLUB'
                                ) &&
                                !classroomTypesForCurrentInstitution.includes(
                                    'CLASSROOM'
                                )
                            ) {
                                targetChild.unshift(stemClubData);
                            }
                        } else {
                            acc.unshift({
                                ...instData,
                                children: [],
                            });

                            const classroomsForCurrentInstitution =
                                groupedClassroomsByInstitution[
                                currentValue.institutionId
                                ];
                            const classroomTypesForCurrentInstitution =
                                classroomsForCurrentInstitution.map(
                                    (classroom: any) => classroom.type
                                );

                            if (
                                classroomTypesForCurrentInstitution.includes(
                                    'STEM-CLUB'
                                ) &&
                                classroomTypesForCurrentInstitution.includes(
                                    'CLASSROOM'
                                )
                            ) {
                                if (
                                    classroomTypesForCurrentInstitution.includes(
                                        'STEM-CLUB'
                                    )
                                ) {
                                    acc[0].children.unshift({
                                        id: 'stemclubs',
                                        title: 'STEM Clubs',
                                        type: 'collapsable',
                                        icon: 'feather:classroom2',
                                        active: true,
                                        children:
                                            currentValue.type === 'STEM-CLUB'
                                                ? [stemClubData]
                                                : [],
                                    });
                                    // acc.filter((classroom: any) => classroom.id === currentValue.institutionId).map((child: any) => child.children.unshift({
                                    //     id: "stemclubs",
                                    //     title: "STEM Clubs",
                                    //     type: "collapsable",
                                    //     icon: "feather:classroom2",
                                    //     // link: '/dashboard',
                                    //     active: true,
                                    //     children: currentValue.type === 'STEM-CLUB' ? [stemClubData] : []
                                    // }));
                                }
                                if (
                                    classroomTypesForCurrentInstitution.includes(
                                        'CLASSROOM'
                                    )
                                ) {
                                    acc[0].children.unshift({
                                        id: 'classrooms',
                                        title: 'Classrooms',
                                        type: 'collapsable',
                                        icon: 'feather:classroom2',
                                        active: true,
                                        children:
                                            currentValue.type === 'CLASSROOM'
                                                ? [clsData]
                                                : [],
                                    });
                                    // acc.filter((classroom: any) => classroom.id === currentValue.institutionId).map((child: any) => child.children.unshift({
                                    //     id: "classrooms",
                                    //     title: "Classrooms",
                                    //     type: "collapsable",
                                    //     icon: "feather:classroom2",
                                    //     // link: '/dashboard',
                                    //     active: true,
                                    //     children: currentValue.type === 'CLASSROOM' ? [clsData] : []
                                    // }));
                                }
                                // if either classrooms or stem clubs only then hide sub level
                            }
                            if (
                                !classroomTypesForCurrentInstitution.includes(
                                    'STEM-CLUB'
                                ) &&
                                classroomTypesForCurrentInstitution.includes(
                                    'CLASSROOM'
                                )
                            ) {
                                acc[0].children.unshift({ ...clsData });
                            }
                            if (
                                classroomTypesForCurrentInstitution.includes(
                                    'STEM-CLUB'
                                ) &&
                                !classroomTypesForCurrentInstitution.includes(
                                    'CLASSROOM'
                                )
                            ) {
                                acc[0].children.unshift({
                                    id: 'stemclubs',
                                    title: 'STEM Clubs',
                                    type: 'collapsable',
                                    icon: 'feather:classroom2',
                                    active: true,
                                    children:
                                        currentValue.type === 'STEM-CLUB'
                                            ? [stemClubData]
                                            : [],
                                });
                            }
                        }

                        return acc;
                    },
                    navItemsTemp.length == 2 ||
                        navItemsTemp.length == 3 ||
                        navItemsTemp.length == 4 ||
                        navItemsTemp.length == 5
                        ? navItemsTemp
                        : navItemsTemp.slice(-2)
                );
                const navObj: any = { default: instituteClassroom };
                const modified = this.changeOrder(navObj);
                this.classroomNavSubject$.next(navObj);
            });
    }

    changeOrder(navObj) {
        navObj.default.forEach((d, index) => {
            const sorted = this.sortChildren(d);
            navObj.default[index] = sorted;
        });
    }

    // changeOrder(navObj){
    //     let arr=navObj.default
    //     arr.forEach((elm:any)=>{
    //         if(elm.title=='ThinkTac'){
    //             if(elm.children){
    //                 let arranged:any=[]
    //                 let remain:any=[]
    //                 let i
    //                 elm.children.forEach((e,index)=>{
    //                     if(e.title.includes('Pre-primary')){
    //                         i=index

    //                         arranged.push(e)
    //                     }
    //                     else{
    //                         remain.push(e)
    //                     }
    //                 })
    //                 arranged.sort((a:any,b:any)=>a.title.split(' ')[1]-b.title.split(' ')[1])
    //                 let combined=[...arranged,...remain]
    //                 elm.children=combined

    //             }
    //         }
    //     })
    // }

    sortChildren(data) {
        data?.children?.sort((a, b) => {
            const isPrePrimaryA = a?.title
                .toLowerCase()
                ?.includes('pre-primary');
            const isPrePrimaryB = b?.title
                .toLowerCase()
                ?.includes('pre-primary');

            if (isPrePrimaryA && isPrePrimaryB) {
                // Sort Pre-primary classes by the number (Pre-primary 1, 2, 3...)
                return (
                    this.getClassNumber(a?.title) -
                    this.getClassNumber(b?.title)
                );
            } else if (!isPrePrimaryA && !isPrePrimaryB) {
                // Sort standard classes by the number (1A, 2A, 3A...)
                return (
                    this.getClassNumber(a?.title) -
                    this.getClassNumber(b?.title)
                );
            } else {
                // Place Pre-primary classes before standard classes
                return isPrePrimaryA ? -1 : 1;
            }
        });
        return data;
    }

    getClassNumber(title: string): number {
        return parseInt(title.match(/\d+/)?.[0] || '0', 10);
    }

    getGroupedClassroomsByInstitution(inputArray) {
        // Initialize an empty object to hold groups
        const groupedByInstitutionId = {};
        // Iterate over each object in the input array
        for (let i = 0; i < inputArray.length; i++) {
            const obj = inputArray[i];
            // Check if the group for the current institutionId already exists
            if (!groupedByInstitutionId[obj.institutionId]) {
                // If not, create a new array for this institutionId
                groupedByInstitutionId[obj.institutionId] = [];
            }
            // Add the current object to the group
            groupedByInstitutionId[obj.institutionId].push(obj);
        }

        // Return the grouped object
        return groupedByInstitutionId;
    }

    /*
    // forEach loop is slower than classic for loop
    getGroupedClassroomsByInstitution(inputArray: Array<any>) {
        // Grouping objects by institutionId
        let groupedByInstitutionId = {};

        inputArray.forEach(obj => {
            if (!groupedByInstitutionId[obj.institutionId]) {
                groupedByInstitutionId[obj.institutionId] = [];
            }
            groupedByInstitutionId[obj.institutionId].push(obj);
        });

        return groupedByInstitutionId;
    }
    */

    sortInstitutionsAndClassrooms(data: Array<any>) {
        // sort the institutions by title
        // data.sort((a, b) => a.title.localeCompare(b.title));

        // sort the classrooms by title within each institution
        data.forEach((institution) => {
            if (institution.children) {
                institution.children.forEach((child) => {
                    if (child.children) {
                        child.children.sort((a, b) => {
                            const aClassroomParts = a.title.split(' ');
                            const bClassroomParts = b.title.split(' ');

                            const aClassNumber = parseInt(aClassroomParts[0]);
                            const bClassNumber = parseInt(bClassroomParts[0]);

                            if (aClassNumber !== bClassNumber) {
                                return aClassNumber - bClassNumber;
                            }

                            return aClassroomParts[1].localeCompare(
                                bClassroomParts[1]
                            );
                        });
                    }
                });
            }
        });

        return data;
    }

    // async get() {
    //     let instituteClassroom
    //     const currUserUid: string = await this.userService.getUid();
    //     const checkUserAccessLevel: any = await this.userService.getDocDataById(currUserUid);
    //     let navItemsTemp: FuseNavigationItem[] = []
    //     if (checkUserAccessLevel?.accessLevel == 10) {
    //         navItemsTemp = this.getAdminView()
    //         let contestArr: any = await this.getContestDocs()
    //         let nominationArr: any = this.nominationNav()
    //         navItemsTemp.unshift(...nominationArr)
    //         navItemsTemp.unshift(...contestArr)
    //     } else {
    //         let contestArr: any = await this.getContestDocs()
    //         let nominationArr: any = this.nominationNav()
    //         if (nominationArr.length) {
    //             navItemsTemp.unshift(...nominationArr)
    //         }
    //     }
    //     this.teacherService.getAllTeacherClassroom(currUserUid).pipe(map(d => d?.classrooms)).subscribe(classrooms => {
    //         let insClsArr: any = Object?.values(classrooms || {});
    //         insClsArr = insClsArr.sort((a, b) => (b.institutionName.localeCompare(a.institutionName)))
    //         instituteClassroom = insClsArr.reduce((acc: any, currentValue: any, arr: any) => {
    //             const index = acc.findIndex(existsCls => existsCls['id'] === currentValue['institutionId'])
    //             const instData = this.getInstituteData(currentValue);
    //             const clsData = this.getClassroomData(currentValue);
    //             // let isClassValid = await this.checkProgrammes(currentValue);
    //             // let isInstituteValid = await this.checkInstitute(currentValue);
    //             if (index >= 0) {
    //                 // if (isClassValid) {
    //                 acc[index].children.unshift(clsData)
    //                 // }
    //             } else {
    //                 // if (isInstituteValid) {
    //                 // if (isClassValid) {
    //                 acc.unshift({
    //                     ...instData,
    //                     children: [clsData]
    //                 })
    //                 // }
    //                 // }
    //             }
    //             return acc;
    //         }, navItemsTemp.length == 2 || navItemsTemp.length == 3 ? navItemsTemp : navItemsTemp.slice(-2));
    //         const navObj: any = { 'default':  instituteClassroom };
    //         this.classroomNavSubject$.next(navObj);
    //     })
    // }
    // async checkInstitute(classInfo) {
    //     const doc = await lastValueFrom(this.institutionService.getWithId(classInfo?.institutionId))
    //     if (doc) { return true }
    //     return false
    // }
    // async checkProgrammes(classInfo) {
    //     if (classInfo?.programmes?.length == 1) {
    //         const clsDoc = await lastValueFrom(this.classroomService.get(classInfo?.classroomId))
    //         const programExist = clsDoc ? clsDoc?.programmes?.hasOwnProperty(classInfo?.programmes[0].programmeId) : false
    //         return programExist
    //     }
    //     return true
    // }

    async getAllevents(accessLevel: number) {
        const eventCollRef = await firstValueFrom(
            this.eventService.getAllEvents()
        );
        const coll = eventCollRef.sort((a, b) => {
            if (a.startDate.seconds === b.startDate.seconds) {
                return b.startDate.nanoseconds - a.startDate.nanoseconds;
            }
            return b.startDate.seconds - a.startDate.seconds;
        });

        let eventArr = [];
        let obj = null;
        // if (Number(accessLevel) == 10 || Number(accessLevel) == 11) {
        coll.forEach((event) => {
            if (
                event.eventAudience == 'Student' &&
                (Number(accessLevel) == 10 || Number(accessLevel) == 11)
            ) {
                obj = {
                    id: event.docId,
                    title: event.eventTitle,
                    type: 'collapsable',
                    icon: 'heroicons_outline:trophy',
                    link: `events-workflow/${event.docId}`,
                    children: event.batches.map((batch) => ({
                        submissionsLength: batch.submissions.length,
                        id: batch.batchId,
                        title: batch.batchName,
                        type: 'basic',
                        queryParams: {
                            eventId: event.docId,
                            batchId: batch.batchId,
                        },
                        icon: 'mat_solid:label_important',
                        link: 'events-config',
                    })),
                };
                eventArr.push(obj);
            } else if (event.eventAudience == 'Teacher') {
                obj = {
                    id: event.docId,
                    title: event.eventTitle,
                    type: 'collapsable',
                    icon: 'heroicons_outline:trophy',
                    link: `events-workflow/${event.docId}`,
                    children: event.batches.map((batch) => ({
                        submissionsLength: batch.submissions.length,
                        id: batch.batchId,
                        title: batch.batchName,
                        type: 'basic',
                        queryParams: {
                            eventId: event.docId,
                            batchId: batch.batchId,
                        },
                        icon: 'mat_solid:label_important',
                        link: 'events-config',
                    })),
                };
                eventArr.push(obj);
            } else {
                //
            }
        });
        // eventArr = eventCollRef.map((event) => (

        //     {

        //     id: event.docId,
        //     title: event.eventTitle,
        //     type: 'collapsable',
        //     icon: 'heroicons_outline:trophy',
        //     link: `events-workflow/${event.docId}`,
        //     children: event.batches.map(batch => ({
        //         submissionsLength: batch.submissions.length,
        //         id: batch.batchId,
        //         title: batch.batchName,
        //         type: 'basic',
        //         queryParams: {
        //             eventId: event.docId,
        //             batchId: batch.batchId,
        //         },
        //         icon: 'mat_solid:label_important',
        //         link: `events-config`,
        //     }
        // ))
        // }))
        //    }

        // if (Number(accessLevel) !== 10) {
        //     eventArr = eventCollRef
        //         .filter(event => event.batches.some(batch => batch.submissions.length > 0))
        //         .map(event => (
        //             {
        //                 id: event.docId,
        //                 title: event.eventTitle,
        //                 type: 'collapsable',
        //                 icon: 'heroicons_outline:trophy',
        //                 link: `events-workflow/${event.docId}`,
        //                 children: event.batches
        //                     .filter(batch => batch.submissions.length > 0)
        //                     .map(batch => ({
        //                         submissionsLength: batch.submissions.length,
        //                         id: batch.batchId,
        //                         title: batch.batchName,
        //                         type: 'basic',
        //                         queryParams: {
        //                             eventId: event.docId,
        //                             batchId: batch.batchId,
        //                         },
        //                         icon: 'mat_solid:label_important',
        //                         link: `events-config`,
        //                     })),
        //             }));
        // }

        const currentUserDetails =
            await this.userService.getCurrentUserDetails();

        const now = new Date();
        function timestampToDate(ts: {
            seconds: number;
            nanoseconds: number;
        }): Date {
            return new Date(ts.seconds * 1000 + ts.nanoseconds / 1e6);
        }
        const upcomingEvents = coll.filter(
            (item) => timestampToDate(item.endDate) > now
        );
        const pastEvents = coll.filter(
            (item) => timestampToDate(item.endDate) <= now
        );

        const { eventSubmissions } = currentUserDetails ?? {};

        if (!eventSubmissions) {
            console.error('No event submissions found for user.');
            this.additionalEvent = [];
        } else {
            const eventIds = Object.keys(eventSubmissions);

            if (!eventIds?.length) {
                this.additionalEvent = [];
            } else {

                const batchIds = Object.keys(eventSubmissions[eventIds[0]] ?? {});
                const submIds = Object.keys(
                    (eventSubmissions[eventIds[0]] ?? {})[batchIds[0]] ?? {}
                );

                if (!batchIds?.length || !submIds?.length) {
                    this.additionalEvent = [];
                } else {

            interface Submission {
                isSubmitted: boolean;
                // add other fields if needed
            }

            const eventKeyValue = eventIds[0].replace(/^eventId_/, '');
            const batchIdsValue = batchIds[0].replace(/^batchId_/, '');
            const submIdsValue = submIds[0].replace(/^submId_/, '');
            const submitted = Object.values(
                eventSubmissions[eventIds[0]][batchIds[0]]
            ) as Submission[];

            // const flag = submitted[0].isSubmitted;

            if (submitted?.[0]?.isSubmitted) {
                const matches = (pastEvents || [])
                    .filter((ev) => ev?.docId === eventKeyValue)
                    .map((ev) => ({
                        ...ev,
                        batches: (ev?.batches || []).filter(
                            (b) => String(b?.batchId) === String(batchIdsValue)
                        ),
                    }))
                    .filter((ev) => (ev.batches?.length ?? 0) > 0);

                this.additionalEvent = matches;
            } else {
                this.additionalEvent = [];
            }
                }
            }

            //             type Batch = { batchId: string | number; [k: string]: any };
            // type Event = { docId: string; batches?: Batch[]; [k: string]: any };

            // // inputs you have
            // const eventKeys: string[] = /* e.g. ['RUP15...', 'ABC12...'] */;
            // const batchIdsByEvent: Record<string, Array<string | number>> = {
            //   // e.g.
            //   // 'RUP15...': ['660ch', '6601ch'],
            //   // 'ABC12...': ['777a']
            // };

            // const result: Event[] = [];

            // for (const eventKeyValue of eventKeys) {
            //   const batchIds = new Set((batchIdsByEvent[eventKeyValue] ?? []).map(String));

            //   // filter events for this eventKeyValue and keep only matching batches
            //   const matchesForThisEvent = (pastEvents || [])
            //     .filter(ev => ev?.docId === eventKeyValue)
            //     .map(ev => ({
            //       ...ev,
            //       batches: (ev?.batches || []).filter(b => batchIds.has(String(b?.batchId))),
            //     }))
            //     .filter(ev => (ev.batches?.length ?? 0) > 0); // drop if no batch matched

            //   // push the outcome of this "parent round"
            //   result.push(...matchesForThisEvent);
            // }

            // this.additionalEvent = result;
        }

        const mergedUnique = [
            ...new Set([...this.additionalEvent, ...upcomingEvents]),
        ];

        eventArr = mergedUnique
            .filter((event) => {
                const isUpcoming = timestampToDate(event.endDate) > now;
                const hasSubmissions = event.batches.some((batch) => batch.submissions.length > 0);

                // For upcoming events with access level 10 or 11, show even without submissions
                if (isUpcoming && (Number(accessLevel) == 10 || Number(accessLevel) == 11)) {
                    return true;
                }

                // For all other cases, require submissions to be configured
                return hasSubmissions;
            })
            .map((event) => {
                let obj = {};
                const isUpcoming = timestampToDate(event.endDate) > now;
                const shouldShowAllBatches = isUpcoming && (Number(accessLevel) == 10 || Number(accessLevel) == 11);

                if (
                    event.eventAudience == 'Student' &&
                    (Number(accessLevel) == 10 || Number(accessLevel) == 11)
                ) {
                    obj = {
                        id: event.docId,
                        title: event.eventTitle,
                        type: 'collapsable',
                        icon: 'heroicons_outline:trophy',
                        link: `events-workflow/${event.docId}`,
                        children: event.batches
                            .filter((batch) => shouldShowAllBatches || batch.submissions.length > 0)
                            .map((batch) => ({
                                submissionsLength: batch.submissions.length,
                                id: batch.batchId,
                                title: batch.batchName,
                                type: 'basic',
                                queryParams: {
                                    eventId: event.docId,
                                    batchId: batch.batchId,
                                },
                                icon: 'mat_solid:label_important',
                                link: 'events-config',
                            })),
                    };
                    return obj;
                } else if (event.eventAudience == 'Teacher') {
                    obj = {
                        id: event.docId,
                        title: event.eventTitle,
                        type: 'collapsable',
                        icon: 'heroicons_outline:trophy',
                        link: `events-workflow/${event.docId}`,
                        children: event.batches
                            .filter((batch) => shouldShowAllBatches || batch.submissions.length > 0)
                            .map((batch) => ({
                                submissionsLength: batch.submissions.length,
                                id: batch.batchId,
                                title: batch.batchName,
                                type: 'basic',
                                queryParams: {
                                    eventId: event.docId,
                                    batchId: batch.batchId,
                                },
                                icon: 'mat_solid:label_important',
                                link: 'events-config',
                            })),
                    };
                    return obj;
                } else {
                }
            });
        const events = eventArr.filter(
            (item) => item !== null && item !== undefined
        );
        const navItemsTemp = [
            {
                id: 'contests',
                title: 'Events',
                type: 'group',
                icon: 'heroicons_outline:collection',
                children: events,
            },
        ];
        return events?.length ? navItemsTemp : [];
    }

    async getOBvalue(contestObservables) {
        return new Promise((resolve, reject) => {
            contestObservables.subscribe((v) => {
                const d = v.docs.map((k) => k.data());
                resolve(d);
            });
        });
    }

    async getNav(studentId) {
        this.isNavigationLoaded = true
        let instituteClassroom
        const navItemsTemp = []

        const studentInfo: any = await firstValueFrom(this.studentsService.getWithId(studentId))
        if (studentInfo) {
            const insClsArr = Object.values(studentInfo?.classrooms)
            const groupedClassroomsByInstitution = this.getGroupedClassroomsByInstitution(insClsArr);
            instituteClassroom = insClsArr.reduce((acc: any, currentValue: any, arr: any) => {
                const index = acc.findIndex(existsCls => existsCls['id'] === currentValue['institutionId'])
                const instData = this.getInstituteData(currentValue);
                const clsData = this.getClassroomData(currentValue);
                const stemClubData = this.getStemClubData(currentValue);

                if (index >= 0) {
                    // acc[index].children.unshift(clsData)

                    // for collapsing menu
                    const targetKey = currentValue.type === 'CLASSROOM' ? 'classrooms' : 'stemclubs';
                    const targetChild = acc[index]?.children.find(child => child.id === targetKey)?.children;

                    // if (targetChild) {
                    //     targetChild.unshift(currentValue.type === 'CLASSROOM' ? clsData : stemClubData);
                    // };
                    const classroomsForCurrentInstitution = groupedClassroomsByInstitution[currentValue.institutionId];
                    const classroomTypesForCurrentInstitution = classroomsForCurrentInstitution.map((classroom: any) => classroom.type);
                    if (classroomTypesForCurrentInstitution.includes('STEM-CLUB') && classroomTypesForCurrentInstitution.includes('CLASSROOM')) {

                        targetChild.unshift(currentValue.type === 'CLASSROOM' ? clsData : stemClubData);
                    }

                    if (!classroomTypesForCurrentInstitution.includes('STEM-CLUB') && classroomTypesForCurrentInstitution.includes('CLASSROOM')) {
                        acc[index].children.unshift(clsData)
                    }
                    if (classroomTypesForCurrentInstitution.includes('STEM-CLUB') && !classroomTypesForCurrentInstitution.includes('CLASSROOM')) {
                        targetChild.unshift(stemClubData);
                    }
                } else {
                    // acc.unshift({
                    //     ...instData,
                    //     children: [clsData]
                    // })

                    // for collapsing menu
                    acc.unshift({
                        ...instData,
                        children: []
                    });

                    const classroomsForCurrentInstitution = groupedClassroomsByInstitution[currentValue.institutionId];
                    const classroomTypesForCurrentInstitution = classroomsForCurrentInstitution.map((classroom: any) => classroom.type);
                    const classroomSet = Array.from(new Set(classroomTypesForCurrentInstitution));

                    // if both classrooms and stem clubs then show sub level
                    // if (classroomSet.length && classroomSet.length > 1) {
                    if (classroomTypesForCurrentInstitution.includes('STEM-CLUB') && classroomTypesForCurrentInstitution.includes('CLASSROOM')) {
                        if (classroomTypesForCurrentInstitution.includes('STEM-CLUB')) {
                            acc[0].children.unshift({
                                id: "stemclubs",
                                title: "STEM Clubs",
                                type: "collapsable",
                                icon: "feather:classroom2",
                                active: true,
                                children: currentValue.type === 'STEM-CLUB' ? [stemClubData] : []
                            });
                        };

                        if (classroomTypesForCurrentInstitution.includes('CLASSROOM')) {
                            acc[0].children.unshift({
                                id: "classrooms",
                                title: "Classrooms",
                                type: "collapsable",
                                icon: "feather:classroom2",
                                active: true,
                                children: currentValue.type === 'CLASSROOM' ? [clsData] : []
                            });
                        };
                    }
                    if (!classroomTypesForCurrentInstitution.includes('STEM-CLUB') && classroomTypesForCurrentInstitution.includes('CLASSROOM')) {
                        acc[0].children.unshift({ ...clsData });
                    }

                    if (classroomTypesForCurrentInstitution.includes('STEM-CLUB') && !classroomTypesForCurrentInstitution.includes('CLASSROOM')) {
                        acc[0].children.unshift({
                            id: "stemclubs",
                            title: "STEM Clubs",
                            type: "collapsable",
                            icon: "feather:classroom2",
                            active: true,
                            children: currentValue.type === 'STEM-CLUB' ? [stemClubData] : []
                        });
                    }
                    // else {
                    //     if (classroomSet[0] === 'CLASSROOM') {
                    //         acc[0].children.unshift({ ...clsData });
                    //     };

                    //     if (classroomSet[0] === 'STEM-CLUB') {
                    //         acc[0].children.unshift({ ...stemClubData });
                    //     };
                    // };
                }

                return acc;
            }, navItemsTemp)

            let contestArr: any = await this.getContestDocs()


            let currentYear = new Date().getFullYear().toString()
            // contestArr.forEach((contest) => {
            //     contest.children.forEach((child) => {
            //         if (child?.title) {
            //             if (!child?.title.includes(currentYear)) {
            //                 child?.children.forEach((child1) => {
            //                     delete child1.disabled
            //                 })
            //             }
            //         }
            //     })
            // })
            navItemsTemp.push(...contestArr)
            this.classroomNavSubject.next({ 'default': instituteClassroom })
        };

    }

    async getContestDocs(): Promise<FuseNavigationItem[]> {
        const contests: any = await this.getOBvalue(
            this.contestService.getAllContests()
        );
        contests.sort((a, b) => {
            const yearA = parseInt(a.contestTitle.match(/\d{4}$/)?.[0]);
            const yearB = parseInt(b.contestTitle.match(/\d{4}$/)?.[0]);
            return yearB - yearA;
        });
        // Determine user access level and institution linkage for filtering
        const currUserUid: string = await this.userService.getUid();
        const userDoc: any = await this.userService.getDocDataById(currUserUid);
        const accessLevel: number = Number(userDoc?.accessLevel ?? 0);

        // Gather user's institutionIds from their Teacher document (classrooms grouped under institutions)
        const teacherDoc: any = await firstValueFrom(this.teacherService.getTeacherByDocId(currUserUid));
        const userInstitutionIds = new Set(
            Object.values(teacherDoc?.classrooms || {}).map((c: any) => c?.institutionId).filter(Boolean)
        );

        // Filter contests based on rules
        let filteredContestDocs = contests.filter((contest: any) => {
            const type = contest?.type;
            if (type === 'general') return true;
            if (type === 'classroomStemClubdependent') {
                if (accessLevel === 11) return true; // show all dependent contests
                if (accessLevel < 11) {
                    const vis = contest?.contestVisibilityToInstitutions || {};
                    const linkedInstIds = Object.keys(vis);
                    return linkedInstIds.some((id) => userInstitutionIds.has(id));
                }
                // For any other access levels (e.g., > 11), default to show
                return true;
            }
            return false;
        });

        // Update subject with user-specific filtered list
        this.submissionContestSubject$.next(filteredContestDocs);

        const contestArr: FuseNavigationItem[] = filteredContestDocs.map(
            (contest) => ({
                id: contest.docId,
                title: contest.contestTitle,
                type: 'collapsable',
                icon: 'heroicons_outline:trophy',
                link: `contests-workflow/${contest.docId}`,
                children: contest.stagesNames.map((stage) => ({
                    id: stage.stageId,
                    title: stage.stageName,
                    type: 'basic',
                    queryParams: {
                        contestId: contest.docId,
                        stageId: stage.stageId,
                        // stageNum: stage.stageNumber,
                    },
                    // icon: 'heroicons_outline:academic-cap',
                    icon: 'mat_solid:label_important',
                    link: `contests-config/${contest.docId}`,
                })),
            })
        );
        const navItemsTemp: FuseNavigationItem[] = [
            {
                id: 'contests',
                title: 'Contests and Challenges',
                type: 'group',
                icon: 'heroicons_outline:collection',
                children: contestArr,
            },
        ];
        return contestArr?.length ? navItemsTemp : [];
    }

    nominationNav() {
        const contestCollRef = this.submissionContestSubject$.value;
        const nominationArr: FuseNavigationItem[] = [];
        contestCollRef?.forEach((contest) => {
            const nArr = [];
            contest.stagesNames.filter((stage) => {
                if (stage?.isNominationAllowed) {
                    nArr.push({
                        id: stage.stageId,
                        title: stage.stageName,
                        type: 'basic',
                        queryParams: {
                            contestId: contest.docId,
                            stageId: stage.stageId,
                            // stageNum: stage.stageNumber,
                        },
                        // icon: 'heroicons_outline:academic-cap',
                        // icon: 'mat_solid:label_important',
                        icon: 'mat_solid:label_important',
                        link: `nomination-dashboard/${contest.docId}`,
                        disabled: this.checkDate(stage?.nominationStartDate),
                    });
                }
            });

            if (nArr.length) {
                nominationArr.push({
                    id: contest.docId,
                    title: contest.contestTitle,
                    type: 'collapsable',
                    // icon: 'heroicons_outline:trophy',
                    icon: 'feather:nomination',
                    // link: `contests-workflow/${contest.docId}`,
                    children: nArr,
                });
            }
        });

        const navItemsTemp: FuseNavigationItem[] = [
            {
                id: 'nomination',
                title: 'Nominations',
                type: 'group',
                icon: 'heroicons_outline:collection',
                children: nominationArr,
            },
        ];

        return nominationArr?.length ? navItemsTemp : [];
    }

    getStemClubs(teacherClassrooms: Array<any>, userAccessLevel: number) {
        let stemClubsArray: any = Object?.values(
            teacherClassrooms || {}
        ).filter(
            (classroom: any) =>
                classroom.hasOwnProperty('type') &&
                classroom.type === 'STEM-CLUB'
        );
        stemClubsArray = stemClubsArray.sort((a, b) =>
            b.institutionName.localeCompare(a.institutionName)
        );
        // Grouping objects by institutionId
        const groupedByInstitutionId = {};

        stemClubsArray.forEach((obj) => {
            if (!groupedByInstitutionId[obj.institutionId]) {
                groupedByInstitutionId[obj.institutionId] = [];
            }
            groupedByInstitutionId[obj.institutionId].push(obj);
        });

        // Convert the grouped result
        for (const key in groupedByInstitutionId) {
            const stemClubsArr = [
                {
                    id: key,
                    title: groupedByInstitutionId[key][0].institutionName,
                    type: 'collapsable',
                    icon: 'heroicons_outline:trophy',
                    // link: ``,
                    children: groupedByInstitutionId[key]
                        .sort()
                        .map((stemClub) => ({
                            id: stemClub.classroomId,
                            title: stemClub.stemClubName,
                            type: 'basic',
                            // icon: 'mat_solid:label_important',
                            icon: 'feather:classroom2',
                            active: false,
                            link: `dashboard/${stemClub.classroomId}`,
                            queryParams: {
                                institutionId: stemClub.institutionId,
                                classroomId: stemClub.classroomId,
                                programmeId: stemClub.programmes[0].programmeId,
                            },
                        })),
                },
            ];

            const navItemsTemp = [
                {
                    id: 'stemclubs',
                    title: 'Stem Clubs',
                    type: 'group',
                    icon: 'heroicons_outline:collection',
                    children: stemClubsArr,
                },
            ];

            return stemClubsArr?.length ? navItemsTemp : [];
        }
    }

    // events() {
    //     const navItemsTemp: FuseNavigationItem[] = [
    //         {
    //             id: 'events',
    //             title: 'Event Doon',
    //             type: 'group',
    //             icon: 'mat_solid:event',
    //             children: [
    //                 {
    //                     id: 'doon',
    //                     title: 'Doon Workshop',
    //                     type: 'collapsable',
    //                     // icon: 'mat_solid:update',
    //                     icon: 'mat_solid:event',
    //                     children: [{
    //                         id: 'doonWorkshop1',
    //                         title: '1st & 2nd December',
    //                         type: 'basic',
    //                         icon: 'mat_solid:label_important',
    //                         link: 'events',
    //                         queryParams: {
    //                             eventId: 'RUP15rPmasOWdIEVRVJA',
    //                             batchId: '660ch',
    //                             submId: 'q1eEp8ePk1rLV8F6o3ir',
    //                             workflowId: 'NHEab2SPZe5DyKiiGXZu',
    //                         },
    //                     },
    //                     {
    //                         id: 'doonWorkshop2',
    //                         title: '4th December',
    //                         type: 'basic',
    //                         icon: 'mat_solid:label_important',
    //                         link: 'events',
    //                         queryParams: {
    //                             eventId: 'RUP15rPmasOWdIEVRVJA',
    //                             batchId: '661ch',
    //                             submId: '0SLGy4EzC3sPMZ8vIfBl',
    //                             workflowId: 'PyxgrhSPZe5DyKii4h7x',
    //                         },
    //                     }
    //                     ]
    //                 }
    //             ]
    //         },
    //     ]
    //     return navItemsTemp
    // }

    getAdminView(): FuseNavigationItem[] {
        const navItemsTemp: FuseNavigationItem[] = [
            {
                id: 'user-interface',
                title: 'Admin',
                type: 'group',
                icon: 'heroicons_outline:collection',
                children: [
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Set Up Wizard',
                        type: 'basic',
                        icon: 'mat_solid:settings',
                        link: '/manage',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Institutions',
                        type: 'basic',
                        // icon: 'mat_outline:app_registration',
                        icon: 'feather:institute2',
                        link: '/institutions-list',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Classrooms',
                        type: 'basic',
                        // icon: 'mat_outline:app_registration',
                        icon: 'feather:classroom2',
                        link: '/classrooms',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Programme',
                        type: 'basic',
                        icon: 'heroicons_outline:presentation-chart-bar',
                        link: '/programmes',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Programme Templates',
                        type: 'basic',
                        icon: 'heroicons_outline:clipboard',
                        link: '/programme-templates',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Learning Units',
                        type: 'basic',
                        icon: 'heroicons_outline:chart-square-bar',
                        link: '/learning-units',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Components',
                        type: 'basic',
                        icon: 'heroicons_outline:scissors',
                        link: '/components',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Student Manager',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group',
                        link: '/student-manager',
                    },
                    // {
                    //     id: 'user-interface.advanced-search',
                    //     title: 'Stem Clubs',
                    //     type: 'basic',
                    //     icon: 'heroicons_outline:chart-square-bar',
                    //     link: '/stem-clubs'
                    // },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Assignments',
                        type: 'basic',
                        icon: 'heroicons_outline:academic-cap',
                        link: '/assignments',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Contests and Challenges',
                        type: 'basic',
                        icon: 'heroicons_outline:trophy',
                        link: '/contests',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Events',
                        type: 'basic',
                        icon: 'mat_solid:event',
                        link: '/events-admin',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Partners',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group',
                        link: '/partner-list',
                    },

                    {
                        id: 'user-interface.advanced-search',
                        title: 'Vendors',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group',
                        link: '/vendor-list',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Visits',
                        type: 'basic',
                        icon: 'heroicons_outline:user-group',
                        link: '/visit-list',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Workflow Templates',
                        type: 'basic',
                        icon: 'heroicons_outline:clipboard',
                        link: '/workflow-templates',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Clicker',
                        type: 'basic',
                        icon: 'heroicons_outline:device-phone-mobile',
                        link: '/remote-pannel'
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Master Manager',
                        type: 'basic',
                        icon: 'heroicons_outline:document-text',
                        link: '/master-manager'
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'WhatsApp Manager',
                        type: 'basic',
                        icon: 'heroicons_outline:phone',
                        link: '/whatsapp-manager'
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Kit Manager',
                        type: 'basic',
                        icon: 'heroicons_outline:cube',
                        link: '/kit-manager'
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Outreach',
                        type: 'basic',
                        icon: 'heroicons_outline:qrcode',
                        link: '/outreach'
                    }

                ],
            },
        ];
        return navItemsTemp;
    }
    getAdminView1(): FuseNavigationItem[] {
        const navItemsTemp: FuseNavigationItem[] = [
            {
                id: 'user-interface',
                title: 'Admin',
                type: 'group',
                icon: 'heroicons_outline:collection',
                children: [
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Set Up Wizard',
                        type: 'basic',
                        icon: 'mat_solid:settings',
                        link: '/manage',
                    },
                    {
                        id: 'user-interface.advanced-search',
                        title: 'Contests and Challenges',
                        type: 'basic',
                        icon: 'heroicons_outline:trophy',
                        link: '/contests',
                    },
                ],
            },
        ];
        return navItemsTemp;
    }

    checkDate(startDateInSec) {
        const startDate = startDateInSec?.seconds;
        const today = Date.now() / 1000;
        if (today < startDate) {
            return true;
        }
        return false;
    }
}
