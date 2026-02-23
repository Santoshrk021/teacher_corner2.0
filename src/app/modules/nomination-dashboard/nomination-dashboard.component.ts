import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ActivatedRoute } from '@angular/router';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { RamanAwardService } from 'app/core/dbOperations/ramanAward2023/ramanAward.service';
import { RamanTeachersService } from 'app/core/dbOperations/ramanAwardTeachers/ramanTeachers.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { BehaviorSubject, Subject, firstValueFrom, lastValueFrom, takeUntil } from 'rxjs';
import { ContestDashboardComponent } from '../contest-dashboard/contest-dashboard.component';
import { ContestDashboardService } from '../contest-dashboard/contest-dashboard.service';
import { UserService } from 'app/shared/user.service';

@Component({
    selector: 'app-nomination-dashboard',
    templateUrl: './nomination-dashboard.component.html',
    styleUrls: ['./nomination-dashboard.component.scss']
})
export class NominationDashboardComponent implements OnInit, OnDestroy {
    infoForm = this.fb.group({
        institution: ['', [Validators.required]],
    });
    classroomArray: any;
    stageInfo: any;
    institutionInfo: any;

    spinner: boolean = false;
    isInstituteExist = true;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    listView: boolean = false;
    nominationListView = true;
    subcriptionRef: PushSubscription[] = [];
    nominatedObjSub = new BehaviorSubject(null);
    drawerOpened: any = false;
    component;
    contestInfo: any;
    gradeList;
    constructor(
        private teacherService: TeacherService,
        private fb: FormBuilder,
        private constestService: ContestService,
        private ramanAwardService: RamanAwardService,
        private institutionService: InstitutionsService,
        private drawerService: FuseDrawerService,
        private contestDashboardService: ContestDashboardService,
        private activatedRoute: ActivatedRoute,
    ) {
        this.drawerService.drawerOpenSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
            this.drawerOpened = res;
        });
    }

    async ngOnInit() {
        this.activatedRoute.queryParams.subscribe((res) => {
            this.geContestData(res.contestId, res.stageId);
        });
    }


    toggleList(change: MatSlideToggleChange) {
        this.listView = change.checked;
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    }

    noOfInstitutesOfTeacher() {
        const teacherDoc: any = this.teacherService.currentTeacher.value;
        const clsArr: any = Object.values(teacherDoc.classrooms);
        const check = clsArr.every((cls: any) => cls.institutionId === clsArr[0].institutionId);

        if (check) {
            this.nominationListView = true;
            this.setInContestTeacher(teacherDoc, clsArr[0]);
        }
        else {
            this.nominationListView = false;

            this.classroomArray = this.getInstitutionsInfo(clsArr);
        }
    }

    getInstitutionsInfo(classroomsArray: any[]): string[] {
        if (!Array.isArray(classroomsArray) || classroomsArray.length === 0) {
            console.warn('Invalid or empty classrooms array provided.');
            return [];
        }

        // Use a Set to automatically handle duplicates
        const institutionNames = new Set<string>();

        classroomsArray.forEach((cls) => {
            if (cls?.institutionName) { // Ensure institutionName exists
                institutionNames.add(cls.institutionName);
            }
        });

        // Convert the Set back to an array
        return Array.from(institutionNames);
    }

    async checkInContestCollection() {
        this.getNominationNumbersByGrade(this.contestInfo);
        const teacherDoc = this.teacherService?.currentTeacher.value;
        const contestId = this.contestInfo?.docId;

        const res: any = await this.constestService.getTeacherByCollectionAndDocId(teacherDoc?.docId, contestId);

        if (!res) {
            this.noOfInstitutesOfTeacher();
            return;
        }
        this.institutionService.currentInstitutionName.next(res?.institutionName);
        this.nominationListView = true;
        try {
            const nInstituteDoc: any = await this.getInstitutionDoc(res?.institutionId);

            if (nInstituteDoc) {
                // If the document exists
                this.nominatedObjSub.next(nInstituteDoc?.nominationsByClasses);
                await this.institutionDoc(res?.institutionId);
            } else {
                // If the document doesn't exist
                await this.createNominationDoc(res.institutionId, res.institutionName);
                const gradeNominationCounts = this.getNominationNumbersByGrade(this.contestInfo);

                this.nominatedObjSub.next(gradeNominationCounts.gradeNominationCounts);
                await this.institutionDoc(res.institutionId);
            }
        } catch (error) {
            console.error('Error processing institution document:', error);
        }
    }
    getNominationNumbersByGrade(contestInfo) {
        // Validate contestInfo and categories
        if (!contestInfo?.categories || contestInfo.categories.length === 0) {
            console.warn('No categories available in contestInfo.');
            return {};
        }

        // Flatten all grades and eliminate duplicates
        // const allGrades = [...new Set(
        //     contestInfo.categories.flatMap(category => category.grades || [])
        // )].sort((a: any, b: any) => a - b); // Sort numerically
        const allGrades  = contestInfo.categories
        .flatMap(category => category.grades || [])
        .sort((a, b) => a.grade - b.grade);

        // Create an object with grades as keys and initial value of 0
        const gradeNominationCounts = allGrades.reduce((result: any, grade: any) => {
            result[grade.grade] = 0;
            return result;
        }, {});

        return {gradeNominationCounts: gradeNominationCounts, allGrades: allGrades};
    }


    async institutionDoc(instituteId) {
        this.institutionInfo = await this.institutionService.getDocDataByDocId(instituteId);
    }

    async getInstitutionDoc(institutionId) {
        const contestId = this.contestInfo.docId;
        return this.constestService.getInstitutionDoc(institutionId, contestId);
    }

    async geContestData(contestId, stageId) {
        this.constestService.get(contestId).subscribe(async (contestInfo) => {
            this.contestInfo = contestInfo;
            this.gradeList = this.getNominationNumbersByGrade(contestInfo).allGrades;

            this.stageInfo = contestInfo?.stagesNames.find(st => st?.stageId == stageId);
            this.constestService.currentContest.next(contestInfo);
            await this.checkInContestCollection();
        });
    }

    async onSubmit(form) {
        if (!form.valid || !form.value) {
            return;
        }
        const teacherDoc = this.teacherService.currentTeacher.value;
        if (!teacherDoc) {
            console.warn('Teacher document is not available');
            return;
        }

        const clsArr: any = Object.values(teacherDoc.classrooms);
        const cls = clsArr.find(doc => doc.institutionName == form.value.institution);

        if (cls) {
            await this.setInContestTeacher(teacherDoc, cls);
            await this.checkInContestCollection();
        }
    }

    setInContestTeacher(teacherDoc, classroomDoc) {
        if (!teacherDoc || !teacherDoc.docId) {
            return;
        }
        const dbObj = {
            teacherMeta: teacherDoc?.teacherMeta,
            institutionName: classroomDoc?.institutionName,
            institutionId: classroomDoc?.institutionId
        };
        const contestId = this.contestInfo.docId;
        return this.constestService.createTeacherInTeacherAndLinkedInstitute(teacherDoc.docId, contestId, dbObj);
    }

    ngOnDestroy(): void {
        if (this.subcriptionRef?.length)
            {this.subcriptionRef.map(d => d.unsubscribe());}


        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();

    }

    getInstitutionNominationInfo(institutionId) {
        const contestColName = this.contestInfo.contestTitle.replace(
            /\s/g,
            ''
        );
        if (contestColName == 'RamanAward2024') {
            const raman2024 = 'RamanAward2024/--InstitutionNomination--/Institutions';
            this.ramanAwardService.getInstitutionDoc(institutionId, raman2024);

        }
        else {
            const raman2023 = 'RamanAward2023/InstitutionNomination/Institutions';
            this.ramanAwardService.getInstitutionDoc(institutionId, raman2023);

        }

    }

    async createNominationDoc(institutionId, institutionName) {
        const doc = {
            institutionId: institutionId,
            docId: institutionId,
            institutionName: institutionName,
            nominationsByClasses: this.getNominationNumbersByGrade(this.contestInfo).gradeNominationCounts

        };
        const contestId = this.contestInfo.docId;
        return await this.constestService.setInstitutionDoc(institutionId, contestId, doc);
    }

    async dashboardOpen() {
        await import('../contest-dashboard/contest-dashboard.module').then(() => {
            this.component = ContestDashboardComponent;
        });

        this.contestDashboardService.contestInfo = this.contestInfo;
        this.contestDashboardService.selectedInstitution = this.institutionInfo;
        this.contestDashboardService.isSpectatorIsATeacher = true;

        this.drawerService.drawerOpenSubject.next(true);
        this.contestDashboardService.isNominationDashBoard = true;
    }
}
