import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, Subject, filter, lastValueFrom, take, takeUntil } from 'rxjs';
import { FuseMediaWatcherService } from '@fuse/services/media-watcher';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { Navigation } from 'app/core/navigation/navigation.types';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { User } from 'app/core/user/user.types';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { fuseAnimations } from '@fuse/animations';
import { ShopifyService } from 'app/shared/shopify.service';
import { MatDialog } from '@angular/material/dialog';
import { CheckoutCartComponent } from 'app/modules/checkout-cart/checkout-cart.component';
import { UiService } from 'app/shared/ui.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';

@Component({
    selector: 'classy-layout',
    templateUrl: './classy.component.html',
    styleUrls: ['./classy.component.scss'],
    encapsulation: ViewEncapsulation.None,
    animations: fuseAnimations,
})
export class ClassyLayoutComponent implements OnInit, OnDestroy {
    isScreenSmall: boolean;
    navigation: Navigation;
    user: User;
    isWorkFlowView = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    institute: any;
    programme: any;
    classroom: any;
    lu: any;
    teacherInfo: any;
    state = false;
    buynowOpen = true;
    classBs = new BehaviorSubject(null);
    buynowContainer: boolean = false;
    routingEvent: any;
    params: any;
    environment = environment;
    disableButtonClick: boolean = false;
    isQuizActive: boolean = false;

    // Contest breadcrumb properties
    contestTitle: string;
    stageName: string;
    submissionName: string;
    private cachedContestId: string;
    private cachedContestData: any;

    // Admin breadcrumb properties - dynamically built from navigation service
    adminRouteMap: { [key: string]: string } = {};

    /**
     * Constructor
     */
    constructor(
        private _activatedRoute: ActivatedRoute,
        private _navigationService: NavigationService,
        private _userService: UserService,
        private _fuseMediaWatcherService: FuseMediaWatcherService,
        private _fuseNavigationService: FuseNavigationService,
        public router: Router,
        private programmeService: ProgrammeService,
        private instituteService: InstitutionsService,
        private classroomService: ClassroomsService,
        private userService: UserService,
        private luService: LearningUnitsService,
        private shopifyService: ShopifyService,
        public dialog: MatDialog,
        private uiService: UiService,
        public sharedService: SharedService,
        private drawerService: FuseDrawerService,
        private contestService: ContestService,
    ) {
        this.checkUrlForInstituteId();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Getter for current year
     */
    get currentYear(): number {
        return new Date().getFullYear();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    async ngOnInit(): Promise<void> {
        // Build adminRouteMap dynamically from navigation service
        this.buildAdminRouteMap();

        this.drawerService.drawerCloseQuizSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((isQuizActive) => {
            this.isQuizActive = isQuizActive
        });

        // Subscribe to navigation events to update params on route changes
        this.router.events
            .pipe(
                filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                takeUntil(this._unsubscribeAll)
            )
            .subscribe(() => {
                this.updateParamsFromUrl();
                this.updateContestBreadcrumbs();
            });

        // Get initial params
        this.updateParamsFromUrl();
        this.updateContestBreadcrumbs();

        this.shopifyService.getAllActiveProducts().subscribe(res => res);

        this._navigationService.classroomNavSubject$.subscribe((res) => {
            res?.default.forEach((ob) => {
                const isStemClubExist = ob?.children[0]?.id === 'stemclubs' || ob?.children[0]?.id === 'classrooms';
                if (isStemClubExist) {
                    this.sortChildrenByTitle(ob);
                } else {
                    ob?.children?.sort((a, b) => parseFloat(a?.title?.split(' ')[0]) - parseFloat(b?.title?.split(' ')[0]));
                }
            });
            this.navigation = res;
        });

        // Subscribe to the user service
        this._userService.user$
            .pipe((takeUntil(this._unsubscribeAll)))
            .subscribe((user: any) => {
                this.user = user?.teacherMeta;
            });

        // Subscribe to media changes
        this._fuseMediaWatcherService.onMediaChange$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe(({ matchingAliases }) => {
                // Check if the screen is small
                this.isScreenSmall = !matchingAliases.includes('md');
            });

        this.instituteService.currentInstitutionName.subscribe(async (res) => {
            if (res !== null) {
                this.institute = res;
            } else {
                this.institute = (await lastValueFrom(this.instituteService.getInstitutionByIdOnce(this.params.institutionId))).get('institutionName');
            };
        });

        this.programmeService.currentProgrammeName.subscribe(async (res) => {
            if (res !== null) {
                this.programme = res;
            } else {
                this.programme = (await lastValueFrom(this.programmeService.getProgrammeDocByIdOnce(this.params.programmeId))).get('displayName');
            };
        });

        this.classroomService.currentClassroomName.subscribe(async (res) => {
            if (res !== null) {
                this.classroom = res;
            }
            if (res === null || res === undefined) {
                const classroomData: any = (await lastValueFrom(this.classroomService.getClassroomByIdOnce(this.params.classroomId))).data();
                if (classroomData?.type === 'STEM-CLUB') {
                    this.classroom = classroomData.stemClubName;
                } else if (classroomData?.type === 'CLASSROOM') {
                    this.classroom = classroomData.classroomName;
                }
            }
            if (res?.includes('2') || res?.includes('1')) {
                this.buynowContainer = false;
            }
            this.classBs.next(res);
            if (!res) {
                this.getTeacherInfo();
            }
        });

        this.luService.currentLearningUnitsName.subscribe(async (res) => {
            if (res !== null) {
                this.lu = res;
            } else {
                const luid = this._activatedRoute.firstChild.snapshot.params.tacDocId;
                this.lu = (await lastValueFrom(this.luService.getLUByIdOnce(luid))).get('learningUnitDisplayName');
            };
        });

        this.checkBuynowState();

        this.userService.changeWhatsappIconPosition.subscribe((d) => {
            this.isWorkFlowView = d;
        });
    }

    // Function to split numeric and alphabetic parts of a title
    splitNumericAlpha = (title) => {
        const numericPart = title?.match(/\d+/);
        const alphaPart = title?.replace(/\d+/g, '').trim();
        return [numericPart ? parseInt(numericPart[0]) : null, alphaPart];
    };

    // Function to sort children by numeric and alphabetical order
    sortChildrenByTitle = (data) => {
        data.children.forEach((parent) => {
            if (parent.id === 'classrooms' || parent.id === 'stemclubs') {
                parent.children.sort((a, b) => {
                    const [aNum, aAlpha] = this.splitNumericAlpha(a.title);
                    const [bNum, bAlpha] = this.splitNumericAlpha(b.title);

                    if (aNum !== null && bNum !== null) {
                        if (aNum !== bNum) {
                            return aNum - bNum;
                        }
                        return aAlpha?.localeCompare(bAlpha);
                    } else if (aNum !== null) {
                        return -1;
                    } else if (bNum !== null) {
                        return 1;
                    } else {
                        return aAlpha?.localeCompare(bAlpha);
                    }
                });
            }
        });
    };

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Build adminRouteMap dynamically from navigation service admin items
     */
    private buildAdminRouteMap(): void {
        const adminNavItems = this._navigationService.getAdminView();
        const adminGroup = adminNavItems.find(item => item.id === 'user-interface');

        if (adminGroup?.children) {
            adminGroup.children.forEach(child => {
                if (child.link) {
                    // Extract route path without leading slash
                    const routePath = child.link.replace(/^\//, '');
                    this.adminRouteMap[routePath] = child.title;
                }
            });
        }

        // Also include items from getAdminView1 for access level 9 users
        const adminNavItems1 = this._navigationService.getAdminView1();
        const adminGroup1 = adminNavItems1.find(item => item.id === 'user-interface');

        if (adminGroup1?.children) {
            adminGroup1.children.forEach(child => {
                if (child.link && !this.adminRouteMap[child.link.replace(/^\//, '')]) {
                    const routePath = child.link.replace(/^\//, '');
                    this.adminRouteMap[routePath] = child.title;
                }
            });
        }

        // Add quizzer route which may not be in admin navigation
        if (!this.adminRouteMap['quizzer']) {
            this.adminRouteMap['quizzer'] = 'Quizzer';
        }
    }

    /**
     * Toggle navigation
     */
    toggleNavigation(name: string): void {
        const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>(name);
        if (navigation) {
            navigation.toggle();
        }
    }

    async getTeacherInfo() {
        (await this.userService.getTeacherInfo()).pipe(take(1)).subscribe((res) => {
            this.userService.userInfoSub.next(res);
            this.teacherInfo = res.currentTeacherInfo;
            this.classBs.next(res?.lastClassroomName);
        }
        );
    }

    /**
     * Check if current route is a programme submission route
     */
    checkSubmissionRoute(value: string): boolean {
        return value.includes('/programme/');
    }

        // ------------------------------
    // Breadcrumb navigation helpers
    // ------------------------------

    /**
     * Parse and update params from the current URL (both query params and route params)
     */
    private updateParamsFromUrl(): void {
        const url = this.router.url;
        const [path, queryString] = url.split('?');

        // Parse query params
        let queryParams: Record<string, string | undefined> = {};
        if (queryString) {
            const urlParams = new URLSearchParams(queryString);
            queryParams = {
                institutionId: urlParams.get('institutionId') || undefined,
                classroomId: urlParams.get('classroomId') || undefined,
                programmeId: urlParams.get('programmeId') || undefined,
                assignmentId: urlParams.get('assignmentId') || undefined,
                workflowId: urlParams.get('workflowId') || undefined,
                contestId: urlParams.get('contestId') || undefined,
                stageId: urlParams.get('stageId') || undefined,
                submId: urlParams.get('submId') || undefined,
            };
        }

        // Extract route params from path
        // Pattern: /dashboard/:classroomId/programme/:tacDocId
        const pathSegments = path.split('/').filter(s => s);
        let routeParams: Record<string, string | undefined> = {};

        if (pathSegments[0] === 'dashboard') {
            // /dashboard/:classroomId/...
            if (pathSegments[1] && pathSegments[1] !== 'programme') {
                routeParams.classroomIdFromPath = pathSegments[1];
            }
            // /dashboard/:classroomId/programme/:tacDocId
            if (pathSegments[2] === 'programme' && pathSegments[3]) {
                routeParams.tacDocId = pathSegments[3];
            }
        }

        this.params = { ...queryParams, ...routeParams };
    }

    private getInstitutionId(): string | undefined {
        return this.params?.institutionId || this.teacherInfo?.lastInstitutionId;
    }

    private getClassroomId(): string | undefined {
        return this.params?.classroomId || this.teacherInfo?.lastClassroomId;
    }

    private getProgrammeId(): string | undefined {
        return this.params?.programmeId || this.teacherInfo?.lastProgrammeId;
    }

    private getLearningUnitId(): string | undefined {
        // From URL path (parsed in updateParamsFromUrl) or fallback to teacherInfo
        return this.params?.tacDocId || this.teacherInfo?.lastLearningUnitId;
    }

    navigateToInstitution(): void {
        const institutionId = this.getInstitutionId();
        if (!institutionId) { return; }

        this.router.navigate(
            ['/dashboard'],
            { queryParams: { institutionId } }
        );
    }

    navigateToClassroom(): void {
        const institutionId = this.getInstitutionId();
        const classroomId = this.getClassroomId();
        if (!institutionId || !classroomId) { return; }

        this.router.navigate(
            ['/dashboard', classroomId],
            { queryParams: { institutionId, classroomId } }
        );
    }

     navigateToProgramme(): void {
        const institutionId = this.getInstitutionId();
        const classroomId   = this.getClassroomId();
        const programmeId   = this.getProgrammeId();

        if (!institutionId || !classroomId || !programmeId) {
            return;
        }

        // 🔹 Go to the same route you normally use for the programme view:
        // /dashboard/:classroomId?institutionId=...&classroomId=...&programmeId=...
        this.router.navigate(
            ['/dashboard', classroomId],
            {
                queryParams: {
                    institutionId,
                    classroomId,
                    programmeId
                }
            }
        );
    }

    navigateToLearningUnit(): void {
        const institutionId = this.getInstitutionId();
        const classroomId = this.getClassroomId();
        const programmeId = this.getProgrammeId();
        const luid = this.getLearningUnitId();
        if (!institutionId || !classroomId || !programmeId || !luid) { return; }

        // Route: /dashboard/:classroomId/programme/:tacDocId
        this.router.navigate(
            ['/dashboard', classroomId, 'programme', luid],
            { queryParams: { institutionId, classroomId, programmeId } }
        );
    }


    /**
     * Check if standard breadcrumbs should be shown for the current route
     */
    checkRoute(value: string): boolean {
        // Exclude contest and nomination routes (they have their own breadcrumbs)
        if (value.includes('contests-config') || value.includes('nomination-dashboard') || value.includes('/nominations')) {
            return false;
        }

        // Exclude admin routes (they have their own breadcrumbs)
        if (this.isAdminRoute()) {
            return false;
        }

        // Check against routes without breadcrumbs
        return !environment.routesWithoutBreadcrumbs.some(route => value === `/${route}`);
    }

    /**
     * Check if current route is a contest config route
     */
    isContestRoute(): boolean {
        return this.router.url.includes('contests-config');
    }

    /**
     * Check if current route is a nomination dashboard route
     */
    isNominationRoute(): boolean {
        return this.router.url.includes('nomination-dashboard');
    }

    /**
     * Check if current route is a nominations (view nominations) route
     */
    isNominationsRoute(): boolean {
        // Match /nominations but not /nomination-dashboard
        return this.router.url.includes('/nominations') && !this.router.url.includes('nomination-dashboard');
    }

    /**
     * Check if current route is an admin route that should show admin breadcrumbs
     */
    isAdminRoute(): boolean {
        const url = this.router.url;
        // Check if we're on any of the admin routes
        return Object.keys(this.adminRouteMap).some(route => url === `/${route}` || url.startsWith(`/${route}?`));
    }

    /**
     * Get the admin page title based on current route
     */
    getAdminPageTitle(): string {
        const url = this.router.url;
        for (const route of Object.keys(this.adminRouteMap)) {
            if (url === `/${route}` || url.startsWith(`/${route}?`)) {
                return this.adminRouteMap[route];
            }
        }
        return '';
    }

    /**
     * Get the current admin route path
     */
    private getCurrentAdminRoute(): string | null {
        const url = this.router.url;
        for (const route of Object.keys(this.adminRouteMap)) {
            if (url === `/${route}` || url.startsWith(`/${route}?`)) {
                return route;
            }
        }
        return null;
    }

    /**
     * Navigate to the current admin page (reload if already on same page)
     */
    navigateToAdminPage(): void {
        const route = this.getCurrentAdminRoute();
        if (!route) return;

        // Force Angular to reload the component by navigating away and back
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
            this.router.navigate([`/${route}`]);
        });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Contest & Nomination Breadcrumb Methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update contest/nomination breadcrumbs based on URL params
     * Uses caching to avoid redundant Firestore calls for the same contest
     */
    private updateContestBreadcrumbs(): void {
        // Handle contest-config, nomination-dashboard, and nominations routes
        if (!this.isContestRoute() && !this.isNominationRoute() && !this.isNominationsRoute()) {
            this.resetContestBreadcrumbs();
            return;
        }

        const { contestId, stageId, submId } = this.params || {};

        if (!contestId) {
            return;
        }

        // Use cached data if available for the same contest
        if (this.cachedContestId === contestId && this.cachedContestData) {
            this.processContestData(this.cachedContestData, stageId, submId);
            return;
        }

        // Fetch contest data from Firestore
        this.contestService.getContestByIdOnce(contestId)
            .pipe(take(1))
            .subscribe((doc: any) => {
                if (!doc?.exists) {
                    return;
                }

                const contestData = doc.data();

                // Cache the contest data
                this.cachedContestId = contestId;
                this.cachedContestData = contestData;

                this.processContestData(contestData, stageId, submId);
            });
    }

    /**
     * Process contest data and extract breadcrumb values
     */
    private processContestData(contestData: any, stageId: string, submId: string): void {
        this.contestTitle = contestData?.contestTitle;

        if (!stageId) {
            this.stageName = null;
            this.submissionName = null;
            return;
        }

        const stage = contestData?.stagesNames?.find((s: any) => s.stageId === stageId);

        if (!stage) {
            this.stageName = null;
            this.submissionName = null;
            return;
        }

        this.stageName = stage.stageName;
        this.submissionName = submId
            ? stage.submissions?.find((sub: any) => sub.submissionId === submId)?.displayName || null
            : null;
    }

    /**
     * Reset all contest breadcrumb values
     */
    private resetContestBreadcrumbs(): void {
        this.contestTitle = null;
        this.stageName = null;
        this.submissionName = null;
    }

    /**
     * Navigate with reload - reloads page if already on same route
     * O(1) time complexity for path check
     */
    private navigateWithReload(path: string[], queryParams: Record<string, string>): void {
        const basePath = path.join('/');
        const isOnSamePath = this.router.url.includes(basePath);

        if (isOnSamePath) {
            // Force reload by navigating with replaceUrl and refreshing state
            this.router.navigate(path, { queryParams, replaceUrl: true }).then(() => {
                this.updateParamsFromUrl();
                this.updateContestBreadcrumbs();
            });
        } else {
            this.router.navigate(path, { queryParams });
        }
    }

    /**
     * Navigate to contest main page (stage level - keeps stageId)
     */
    navigateToContest(): void {
        const { contestId, stageId } = this.params || {};
        if (!contestId) return;

        const queryParams = stageId ? { contestId, stageId } : { contestId };
        this.navigateWithReload(['/contests-config', contestId], queryParams);
    }

    /**
     * Navigate to contest stage page
     */
    navigateToContestStage(): void {
        const { contestId, stageId } = this.params || {};
        if (!contestId || !stageId) return;

        this.navigateWithReload(['/contests-config', contestId], { contestId, stageId });
    }

    /**
     * Navigate to contest submission workflow page
     */
    navigateToContestSubmission(): void {
        const { contestId, stageId, submId } = this.params || {};
        if (!contestId || !stageId || !submId) return;

        this.navigateWithReload(['/contests-config', contestId, 'workflow'], { contestId, stageId, submId });
    }

    /**
     * Navigate to nomination dashboard main page (keeps stageId if present)
     */
    navigateToNominationContest(): void {
        const { contestId, stageId } = this.params || {};
        if (!contestId) return;

        const queryParams = stageId ? { contestId, stageId } : { contestId };
        this.navigateWithReload(['/nomination-dashboard', contestId], queryParams);
    }

    /**
     * Navigate to nomination dashboard stage page
     */
    navigateToNominationStage(): void {
        const { contestId, stageId } = this.params || {};
        if (!contestId || !stageId) return;

        this.navigateWithReload(['/nomination-dashboard', contestId], { contestId, stageId });
    }

    /**
     * Navigate from nominations page to nomination-dashboard (contest level)
     */
    navigateToNominationsContest(): void {
        const { contestId, stageId } = this.params || {};
        if (!contestId) return;

        // Navigate to nomination-dashboard instead of staying on nominations
        const queryParams = stageId ? { contestId, stageId } : { contestId };
        this.router.navigate(['/nomination-dashboard', contestId], { queryParams });
    }

    /**
     * Navigate from nominations page to nomination-dashboard (stage level)
     */
    navigateToNominationsStage(): void {
        const { contestId, stageId } = this.params || {};
        if (!contestId || !stageId) return;

        // Navigate to nomination-dashboard instead of staying on nominations
        this.router.navigate(['/nomination-dashboard', contestId], { queryParams: { contestId, stageId } });
    }

    /**
     * Check if current route is a quiz or upload submissions route
     */
    checkSubmissionsRoute(value: string): boolean {
        return value.includes('/quiz-submissions') || value.includes('/upload-submissions');
    }

    bannerExpand() {
        this.state = true;
    }

    buyNowCloseBtn() {
        this.buynowOpen = false;
        localStorage.setItem('isBuynowDivClose', 'true');
    }

    checkBuynowState(): void {
        if (localStorage.getItem('isBuynowDivClose') === 'true') {
            this.buynowOpen = false;
        }
    }

    goToShopify(): void {
        this.classBs.pipe(take(1)).subscribe(async (res) => {
            const cls = res[0];
            this.shopifyService.getAllActiveProducts().pipe(take(1)).subscribe(async (products: any) => {
                const product = products.products.filter((pr: any) => pr.handle.includes(`-${this.convertToRoman(cls)}-`));
                if (product?.length) {
                    await import('app/modules/checkout-cart/checkout-cart.module').then(() => {
                        this.dialog.open(CheckoutCartComponent, {
                            data: product[0],
                            panelClass: 'custom-dialog-container'
                        });
                    });
                } else {
                    this.uiService.alertMessage('NO Product', 'no product available for this classroom', 'error');
                }
            });
        });
    }

    convertToRoman(num) {
        const roman = {
            M: 1000,
            CM: 900,
            D: 500,
            CD: 400,
            C: 100,
            XC: 90,
            L: 50,
            xl: 40,
            x: 10,
            ix: 9,
            v: 5,
            iv: 4,
            i: 1
        };
        let str = '';

        for (const i of Object.keys(roman)) {
            const q = Math.floor(num / roman[i]);
            num -= q * roman[i];
            str += i.repeat(q);
        }

        return str;
    }

    checkUrlForInstituteId(): void {
        const excludedProgrammeIds = environment.defaultAnnualsProgrammeIds || [];

        const shouldHideBuynow = (url: string): boolean => {
            return excludedProgrammeIds.some(id => url.includes(id)) || url.includes('dashboard/programme');
        };

        if (this.router.url.includes(environment.defaultInstitutionId)) {
            this.buynowContainer = !shouldHideBuynow(this.router.url);
        }

        this.routingEvent = this.router.events.subscribe((event: any) => {
            if (event instanceof NavigationEnd) {
                if (event.url.includes(environment.defaultInstitutionId)) {
                    this.buynowContainer = !shouldHideBuynow(event.url);
                } else {
                    this.buynowContainer = false;
                }
            }
        });
    }

    closeWhatsappChat(): void {
        this.sharedService.isWhatsappBtnVisible = false;
    }

    onDragStarted(): void {
        this.disableButtonClick = true;
    }

    onDragEnded(): void {
        // Delay resetting dragging to false to allow the link's click event to pass without triggering.
        setTimeout(() => {
            this.disableButtonClick = false;
        });
    }

    onLinkClick(event: MouseEvent): void {
        if (this.disableButtonClick) {
            event.preventDefault(); // Prevent link activation if a drag just occurred.
        }
    }

}
