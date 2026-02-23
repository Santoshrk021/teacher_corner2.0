import { MatDialog } from '@angular/material/dialog';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ContestChallengeTypeDialogComponent } from '../contest-challenge-type-dialog/contest-challenge-type-dialog.component';
import { UiService } from 'app/shared/ui.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { combineLatest, first, firstValueFrom, from, lastValueFrom, map, Observable, of, Subject, switchMap, takeUntil } from 'rxjs';
import { Router } from '@angular/router';
import { ContestDashboardService } from 'app/modules/contest-dashboard/contest-dashboard.service';
import { ContestDashboardComponent } from 'app/modules/contest-dashboard/contest-dashboard.component';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ContestDashboardClassStemLevelComponent } from 'app/modules/contest-dashboard-class-stem-level/contest-dashboard-class-stem-level.component';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';

@Component({
  selector: 'app-all-contests-table',
  templateUrl: './all-contests-table.component.html',
  styleUrls: ['./all-contests-table.component.scss']
})
export class AllContestsTableComponent implements OnInit, OnDestroy {
  selectedContestId: string | null = null;
  allContests: any;
  component;
  contestTobeDeleted: any;
  drawerOpened: any = false;
  private _unsubscribeAll: Subject<any> = new Subject();
  deleting: boolean = false;
  currentUser;
  @Input() isLevel9 = true;
  private readonly RESTRICTED_INSTITUTION_ID = 'AydoKWQPcmUkw4127sm9';
  private teacherClassrooms: Record<string, any> = {};
  private hasOnlyRestrictedInstitution = false; // computed once after load



  teacher;

  constructor(
    private contestService: ContestService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService,
    private dialog: MatDialog,
    private drawerService: FuseDrawerService,
    private router: Router,
    private contestDashboardService: ContestDashboardService,
    private classroomService: ClassroomsService,
    private afAuth: AngularFireAuth,
    private userService: UserService,
    private teacherService: TeacherService
  ) {
    this.drawerService.drawerOpenSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.drawerOpened = res;
    });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  //old code to get only general contests and contest for which the teacher's institution is linked
  // ngOnInit(): void {
  //     const user$ = this.afAuth.authState.pipe(
  //       first(),
  //       switchMap(user =>
  //         combineLatest([
  //           this.userService.getUser(user?.uid),
  //           this.teacherService.getWithId(user?.uid),
  //           this.teacherService.getTeacherByIdOnce(user?.uid).pipe(first())
  //         ]).pipe(
  //           map(([currentUser, teacher, teacherDoc]) => {
  //             const teacherData = typeof teacherDoc?.data === 'function' ? teacherDoc.data() : teacherDoc;
  //             this.teacherClassrooms = teacherData?.classrooms ?? {};

  //             // 🔎 collect unique institutionIds from classrooms
  //             const uniqueInstIds = new Set<string>();
  //             for (const c of Object.values(this.teacherClassrooms)) {
  //               const iid = (c as any)?.institutionId ?? (c as any)?.institutionID ?? (c as any)?.institution?.id;
  //               if (iid) uniqueInstIds.add(iid);
  //             }

  //             // ✅ disable only when the ONLY institution is the restricted one
  //             this.hasOnlyRestrictedInstitution =
  //               uniqueInstIds.size === 1 && uniqueInstIds.has(this.RESTRICTED_INSTITUTION_ID);

  //             return { currentUser, teacher };
  //           })
  //         )
  //       )
  //     );

  //     const contests$ = this.contestService.getAllContest();
  //     console.log('contests$', firstValueFrom(contests$)  );

  //     this.allContests = combineLatest([user$, contests$]).pipe(
  //       switchMap(async ([{ currentUser, teacher }, contests]) => {
  //         this.currentUser = currentUser;
  //         this.teacher = teacher;

  //         // Admins or no classrooms → show all
  //         if (Number(currentUser.accessLevel) > 9 || !teacher?.classrooms) {
  //           return contests.sort((a, b) => {
  //             const yearA = parseInt(a.contestTitle.match(/\d{4}$/)?.[0]);
  //             const yearB = parseInt(b.contestTitle.match(/\d{4}$/)?.[0]);
  //             return yearB - yearA;
  //           });
  //         }

  //         // Restricted case: only nominated contests
  //         const classroomInstitutionIds = Object.values(teacher.classrooms)
  //           .map((c: any) => c.institutionId);

  //         const generalContests = contests.filter(c => c.type === 'general');
  //         const checks = await Promise.all(
  //           generalContests.map(async contest => {
  //             const results = await Promise.all(
  //               classroomInstitutionIds.map(instId =>
  //                 this.contestService.isInstitutionNominated(instId, contest.docId)
  //               )
  //             );
  //             return results.some(r => r) ? contest : null;
  //           })
  //         );

  //         return checks
  //           .filter((c): c is any => c !== null)
  //           .sort((a, b) => {
  //             const yearA = parseInt(a.contestTitle.match(/\d{4}$/)?.[0]);
  //             const yearB = parseInt(b.contestTitle.match(/\d{4}$/)?.[0]);
  //             return yearB - yearA;
  //           });
  //       })
  //     );
  //   }

  ngOnInit(): void {
    const user$ = this.afAuth.authState.pipe(
      first(),
      switchMap(user =>
        combineLatest([
          this.userService.getUser(user?.uid),
          this.teacherService.getWithId(user?.uid),
          this.teacherService.getTeacherByIdOnce(user?.uid).pipe(first())
        ]).pipe(
          map(([currentUser, teacher, teacherDoc]) => {
            const teacherData = typeof teacherDoc?.data === 'function' ? teacherDoc.data() : teacherDoc;
            this.teacherClassrooms = teacherData?.classrooms ?? {}; // { classroomId: { institutionId, ... } }

            // 🔎 collect unique institutionIds from classrooms
            const uniqueInstIds = new Set<string>();
            for (const c of Object.values(this.teacherClassrooms)) {
              const iid = (c as any)?.institutionId ?? (c as any)?.institutionID ?? (c as any)?.institution?.id;
              if (iid) uniqueInstIds.add(iid);
            }

            // ✅ disable only when the ONLY institution is the restricted one
            this.hasOnlyRestrictedInstitution =
              uniqueInstIds.size === 1 && uniqueInstIds.has(this.RESTRICTED_INSTITUTION_ID);

            return { currentUser, teacher };
          })
        )
      )
    );

    const contests$ = this.contestService.getAllContest();

    this.allContests = combineLatest([user$, contests$]).pipe(
      map(([{ currentUser, teacher }, contests]) => {
        this.currentUser = currentUser;
        this.teacher = teacher;

        // Admins → return all contests sorted
        if (Number(currentUser.accessLevel) > 9) {
          return contests.sort((a, b) => {
            const yearA = parseInt(a.contestTitle.match(/\d{4}$/)?.[0]);
            const yearB = parseInt(b.contestTitle.match(/\d{4}$/)?.[0]);
            return yearB - yearA;
          });
        }

        // Teachers (<=9)
        const teacherClassroomIds = Object.keys(this.teacherClassrooms ?? {}); // just the IDs

        // 1. always include general contests
        const generalContests = contests.filter(c => c.type === 'general');

        // 2. filter classroomStemClubdependent contests by classroomId existence
        const dependentContests = contests.filter(c => c.type === 'classroomStemClubdependent');
        const visibleDependent = dependentContests.filter(contest => {
          const visibilityMap = contest.contestVisibilityToInstitutions ?? {};
          for (const [instId, instData] of Object.entries<any>(visibilityMap)) {
            const classroomMap = instData?.classrooms ?? {};
            for (const classId of teacherClassroomIds) {
              if (classroomMap[classId]) {
                return true; // teacher's classroomId is allowed
              }
            }
          }
          return false;
        });

        return [...generalContests, ...visibleDependent].sort((a, b) => {
          const yearA = parseInt(a.contestTitle.match(/\d{4}$/)?.[0]);
          const yearB = parseInt(b.contestTitle.match(/\d{4}$/)?.[0]);
          return yearB - yearA;
        });
      })
    );
  }


  clipBoardCopy() {
    this.uiService.showSnackbar('Copied', null, 1000);
  }

  async onClickEdit(contestInfo) {
    if (contestInfo.contestType == 'CONTEST') {
      await import('../contest-challenge-type-dialog/contest-challenge-type-dialog.module');
      this.dialog.open(ContestChallengeTypeDialogComponent, {
        data: {
          contestInfo,
          isupdate: true
        }
      });
    }

    if (contestInfo.contestType == 'CHALLENGE') {
      // await import('./contest-challenge-type-dialog/contest-challenge-type-dialog.module');
      // await this.dialog.open(ContestChallengeTypeDialogComponent, {
      //     data: {
      //     }
      // })
    }
  }

  onDelete(contest) {
    const name = contest.contestTitle;
    const config = {
      title: 'Delete Contest',
      message: `Are you sure you want to delete "${name}" ?`,
      icon: {
        name: 'mat_outline:delete'
      }
    };
    this.contestTobeDeleted = contest;

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        this.deleting = true;
        await this.deleteClassroomslinkedwithcontest(contest);
        await this.contestService.trashContest(contest.docId, contest);
        await this.contestService.deleteContest(contest.docId);
        this.uiService.alertMessage('Deleted', `The "${name}" has been deleted`, 'warning');
        this.deleting = false;
      }
    });
  }

  async deleteClassroomslinkedwithcontest(contest) {
    const classroomArrayofArr = Object.keys(contest.contestVisibilityToInstitutions).map(instid => contest.contestVisibilityToInstitutions[instid].classrooms);
    let allContestClassroomids = [];
    classroomArrayofArr.map(async (classArr) => {
      allContestClassroomids = [...allContestClassroomids, Object.keys(classArr)];
    });
    const classids = allContestClassroomids.flat();
    const classroomPromiseArr: any = await Promise.all(classids.map(d => this.classroomService.getClassroomDataById(d)));
    const promises = classroomPromiseArr.map((classroom, index) => {
      if (classroom && classroom.hasOwnProperty('linkedContestId') && classroom.linkedContestId) {
        return new Promise((resolve, reject) => {
          delete classroom.linkedContestId[contest.docId];
          resolve(this.classroomService.updateWithoutMerge(classroom, classroom.docId));
        });
      }
    });
    await Promise.all(promises);

  }

  copyToClipboard(text: string | undefined): void {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        console.info('Copied to clipboard:', text);
      }).catch((error) => {
        console.error('Failed to copy:', error);
      });
    }
  }

  copyToClipboardDate(d) {
    const dateInMilliseconds = d.seconds * 1000 + Math.floor(d.nanoseconds / 1e6);
    const formattedDate = new Date(dateInMilliseconds).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    navigator.clipboard.writeText(formattedDate).then(() => {
      console.info('Copied to clipboard:', formattedDate);
    }).catch((error) => {
      console.error('Failed to copy:', error);
    });
  }

  async viewNominationsDashboard(contestId: string) {
    this.selectedContestId = contestId;
    this.contestService.getNominatedInstituion(contestId);
    this.contestService.getContestById(contestId);
    // this.router.navigate([`contests/${contestId}`], { queryParams: { contestId: contestId } });
    this.router.navigate(['contests', contestId]); // -> /contests/:contestId


  }

  async dashboardOpen(contestInfo) {
    this.component = '';
    if (contestInfo.type === 'classroomStemClubdependent') {
      await import('app/modules/contest-dashboard-class-stem-level/contest-dashboard-class-stem-level.module').then(() => {
        this.component = ContestDashboardClassStemLevelComponent;
      });
    }
    else {
      await import('app/modules/contest-dashboard//contest-dashboard.module').then(() => {
        this.component = ContestDashboardComponent;
      });
    }

    this.contestDashboardService.contestInfo = contestInfo;
    this.contestDashboardService.selectedInstitution = '';
    this.drawerService.drawerOpenSubject.next(true);
  }

  shouldDisableView(_: string): boolean {
    // ignore the param; we already computed the condition once
    return this.hasOnlyRestrictedInstitution;
  }




  getAllowedGeneralContestIds(
    contests$: Observable<any[]>,
    teacher: any,
    currentUser: any
  ): Observable<string[]> {
    if (!(currentUser && currentUser.accessLevel <= 9 && teacher?.classrooms)) {
      return of([]);
    }

    const classroomInstitutionIds = Object.values(teacher.classrooms).map(
      (c: any) => c.institutionId
    );

    return contests$.pipe(
      switchMap(contests => {
        const generalContestIds = contests
          .filter(c => c.type === 'classroomStemClubdependent')
          .map(c => c.docId);

        const checks$ = generalContestIds.map(contestId =>
          combineLatest(
            classroomInstitutionIds.map(instId =>
              from(this.contestService.isInstitutionNominated(instId, contestId))
            )
          ).pipe(
            map(results => (results.some(r => r) ? contestId : null))
          )
        );

        return checks$.length
          ? combineLatest(checks$).pipe(
            map(results => results.filter((id): id is string => id !== null))
          )
          : of([]);
      })
    );
  }


}
