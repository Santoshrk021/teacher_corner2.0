import {
    ChangeDetectorRef,
    Component,
    OnDestroy,
    OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import {
    BehaviorSubject,
    Subject,
    combineLatest,
    first,
    lastValueFrom,
    take,
    takeUntil,
} from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service'; // <-- ADD

@Component({
    selector: 'app-all-nominations-info',
    templateUrl: './all-nominations-info.component.html',
    styleUrls: ['./all-nominations-info.component.scss'],
})
export class AllNominationsInfoComponent implements OnInit, OnDestroy {
    private _unsubscribeAll: Subject<any> = new Subject();

    contestDetails: any = {};
    institutionsCreatedPostContestStart = 0;
    numberOfNominations = 0;

    instituteNominatedForContest: any[] = [];
    contestNominationInstitutesBsub = new BehaviorSubject<any[] | null>(null);
    nominatedClasses: string[] = [];

    loadingMessage = '';
    totalCount = 0;
    contestData: any;
    userAccessLevel: any;

    // NEW: teacher institutions derived from teacherClassrooms
    private teacherInstitutionIds = new Set<string>();
    private _baselineInstitutes: any[] = [];
    searchTerm = '';


    constructor(
        private contestService: ContestService,
        private institutionService: InstitutionsService,
        private drawerService: FuseDrawerService,
        private route: ActivatedRoute,
        private router: Router,
        private cd: ChangeDetectorRef,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private teacherService: TeacherService // <-- ADD
    ) { }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    async ngOnInit() {
        // if a query param exists for 'contestId', go back to list (your rule)
        const qpId = this.route.snapshot.queryParamMap.get('contestId');
        if (qpId) {
            this.router.navigate(['/contests'], { replaceUrl: true });
            return;
        }

        // Auth user
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const uid = user?.uid;

        // Load access level + teacher classrooms, then route params — all at once
        combineLatest([
            (await this.userService.getUserById(uid)).pipe(first()),
            this.teacherService.getTeacherByIdOnce(uid).pipe(first()),
            this.route.paramMap, // canonical /contests/:contestId
        ])
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(([userData, teacherDoc, paramMap]) => {
                // access level
                this.userAccessLevel = (userData as any)?.accessLevel;

                // derive teacher institution IDs from classrooms
                const teacherData =
                    typeof (teacherDoc as any)?.data === 'function'
                        ? (teacherDoc as any).data()
                        : (teacherDoc as any);
                const classrooms = teacherData?.classrooms ?? {};
                const ids = new Set<string>();
                for (const c of Object.values(classrooms) as any[]) {
                    const iid = c?.institutionId ?? c?.institutionID ?? c?.institution?.id;
                    if (iid) ids.add(iid);
                }
                this.teacherInstitutionIds = ids;

                // contest id
                const contestId = paramMap.get('contestId');
                if (!contestId) {
                    this.router.navigate(['/contests']);
                    return;
                }

                // Initialize data for this contest
                this.initializeForContest(contestId);
            });
    }

    /** Load contest details and nominations for a given contestId */
    private initializeForContest(contestId: string) {
        this.getContestDetailsById(contestId).then((contest: any) => {
            if (
                contest &&
                typeof contest === 'object' &&
                'contestStartDate' in contest &&
                'contestEndDate' in contest
            ) {
                // Load nominations + totals (will filter if accessLevel === 9)
                this.getInstitutionsCreatedPostContestStart(contestId);
            }
        });

        // Count institutions created after the contest start date (unchanged)
        this.fetchInstitutionsAfterContestStartDate(contestId);
    }

    private async getContestDetailsById(contestId: string) {
        return new Promise((resolve) => {
            this.contestService
                .get(contestId)
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe((res) => {
                    this.contestDetails = res;
                    resolve(res);
                });
        });
    }

    /** Load nominations list, compute classes & totals */
    private getInstitutionsCreatedPostContestStart(contestId: string) {
        let totalNominations = 0;

        this.contestService
            .getNominatedInstituion(contestId)
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(async (snap) => {
                // 1) Base list from snapshot
                let nominated: any[] = snap?.docs?.map((d: any) => ({ id: d.id, ...d.data() })) ?? [];

                // 2) Filter when accessLevel === 9 (teacher view)
                if (this.userAccessLevel === 9) {
                    const allowedIds = [...this.teacherInstitutionIds].filter(
                        (id) => id && id !== 'AydoKWQPcmUkw4127sm9'
                    );
                    if (allowedIds.length === 0) {
                        nominated = [];
                    } else {
                        const allowSet = new Set(allowedIds);
                        nominated = nominated.filter((inst: any) => allowSet.has(inst?.docId ?? inst?.id));
                    }
                }

                // Pre-search totals
                this.totalCount = nominated.length;
                this.loadingMessage = `Loaded ${nominated.length} of ${this.totalCount} entries`;

                // 3) Enrich + collect class keys
                this.instituteNominatedForContest = [];
                const allClassKeys = new Set<string>();

                const promises = nominated.map(async (institute: any, idx: number) => {
                    try {
                        const institutionId = institute?.docId ?? institute?.id;
                        if (!institutionId) {
                            console.warn('[AllNominationsInfo] Skipping institute with missing id/docId at index', idx, institute);
                            return;
                        }
                        const institutionData = await this.getInstitutionData(institutionId);
                        this.processInstituteData(institute, institutionData, allClassKeys);
                    } catch (err) {
                        console.error('[AllNominationsInfo] Error enriching institute at index', idx, institute, err);
                    }
                });
                await Promise.all(promises);

                // 4) De-duplicate by docId
                this.instituteNominatedForContest = [
                    ...new Map(
                        this.instituteNominatedForContest.map((item) => [item.docId ?? item.id, item])
                    ).values(),
                ];

                // 5) Sorted list of class keys (only for items shown)
                this.nominatedClasses = Array.from(allClassKeys).sort(
                    (a, b) => Number(a) - Number(b)
                );



                // 6) Compute grand total nominations across the visible list
                totalNominations = this.instituteNominatedForContest.reduce((sum, institute) => {
                    if (institute.nominationsByClasses) {
                        const add = Object.values(institute.nominationsByClasses).reduce(
                            (inner: number, count: unknown) => inner + (typeof count === 'number' ? count : Number(count) || 0),
                            0
                        );
                        return sum + add;
                    }
                    return sum;
                }, 0);
                this.numberOfNominations = totalNominations;

                // 7) Baseline for search + BehaviorSubject sync
                this._baselineInstitutes = [...this.instituteNominatedForContest];
                this.contestNominationInstitutesBsub.next([...this._baselineInstitutes]);

                // 8) If there’s already a search typed, reapply once (do NOT duplicate filters here)
                if (this.searchTerm?.trim()) {
                    this.onSearch(this.searchTerm);
                }

                this.cd.detectChanges();
            });
    }


    private async getInstitutionData(docId: string) {
        // keep your current implementation
        return await (await import('rxjs')).firstValueFrom(
            this.institutionService.getWithId(docId)
        );
    }

    private processInstituteData(
        institute: any,
        institutionData: any,
        allClassKeys: Set<string>
    ) {
        if (institute?.nominationsByClasses) {
            Object.keys(institute.nominationsByClasses).forEach((k) =>
                allClassKeys.add(k)
            );
        }
        this.instituteNominatedForContest.push({ ...institutionData, ...institute });
    }

    /** Count institutions created after the contest start date */
    private fetchInstitutionsAfterContestStartDate(contestId: string) {
        this.contestService
            .getContestById(contestId)
            .pipe(take(1))
            .subscribe((docSnapshot: any) => {
                const contest = docSnapshot.data();
                const singleContest = Array.isArray(contest) ? contest[0] : contest;

                const startSec = singleContest?.contestStartDate?.seconds;
                if (!startSec) return;

                const contestStartDate = new Date(startSec * 1000);
                this.contestService
                    .getInstitutionsCreatedAfterDate(contestStartDate)
                    .subscribe((querySnapshot) => {
                        const institutions = querySnapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...(doc.data() as object),
                        }));
                        this.institutionsCreatedPostContestStart = institutions.length;
                    });
            });
    }

    drawerClose() {
        this.drawerService.drawerOpenSubject.next(false);
        this.router.navigateByUrl('/contests');
    }

    /** Filter by institution name, rep full name, or phone; restores list when empty */
    onSearch(term: string) {
        this.searchTerm = (term ?? '').toLowerCase().trim();

        // Always filter against your immutable baseline, not the BehaviorSubject
        const baseline = this._baselineInstitutes.length
            ? this._baselineInstitutes
            : this.instituteNominatedForContest; // fallback if search happens very early

        if (!this.searchTerm) {
            this.instituteNominatedForContest = [...baseline];
            this.loadingMessage = `Loaded ${this.instituteNominatedForContest.length} of ${this.totalCount} entries`;
            this.cd.detectChanges(); // works for default & OnPush
            return;
        }

        const filtered = baseline.filter((item: any) => {
            const name = (item?.institutionName ?? '').toLowerCase();

            const repFirst = (item?.representativeFirstName ?? '').toLowerCase();
            const repLast = (item?.representativeLastName ?? '').toLowerCase();
            const repFull = `${repFirst} ${repLast}`.trim();

            // match either raw phone or cc+phone
            const rawPhone = (item?.representativePhone ?? item?.representativePhoneNumber ?? '')
                .toString()
                .toLowerCase();
            const ccPhone = (
                (item?.representativeCountryCode ?? '') +
                (item?.representativePhoneNumber ?? item?.representativePhone ?? '')
            ).toString().toLowerCase();

            return (
                name.includes(this.searchTerm) ||
                repFull.includes(this.searchTerm) ||
                rawPhone.includes(this.searchTerm) ||
                ccPhone.includes(this.searchTerm)
            );
        });

        this.instituteNominatedForContest = filtered;
        this.loadingMessage = `${filtered.length} match${filtered.length === 1 ? '' : 'es'} found`;
        this.cd.detectChanges();
    }


    /**
     * Check if a value is a number (for template use)
     */
    isNumber(value: any): boolean {
        return !isNaN(parseFloat(value)) && isFinite(value);
    }

}
