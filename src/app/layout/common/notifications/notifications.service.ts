import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { NotificationService } from 'app/core/dbOperations/notifications/notification.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import {
  Observable,
  ReplaySubject,
  combineLatest,
  map,
  take,
  distinctUntilChanged,
  shareReplay,
} from 'rxjs';

type FSTs =
  | Date
  | string
  | { seconds?: number; nanoseconds?: number; _seconds?: number; _nanoseconds?: number }
  | undefined
  | null;

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  /** PANEL = what shows in the top-right notification panel (badge) */
  private _panelNotifications = new ReplaySubject<Notification[]>(1);
  /** PREVIOUS = what shows in the Previous Notifications page/component */
  private _previousNotifications = new ReplaySubject<Notification[]>(1);

  private _allRemoveNotification: Notification[] = [];

  allApprovalRequestNotificationSub = new ReplaySubject<Notification[]>(1);
  assignmentsNotificationsSub = new ReplaySubject<Notification[]>(1);

  constructor(
    private _httpClient: HttpClient,
    private assignmentService: AssignmentsService,
    private teacherService: TeacherService,
    private classroomService: ClassroomsService,
    private workflowService: WorkflowsService,
    private userService: UserService,
    private notificationService: NotificationService
  ) {}

  // ---------------- Accessors ----------------
  get notifications$(): Observable<Notification[]> {
    return this._panelNotifications.asObservable();
  }
  get previousNotifications$(): Observable<Notification[]> {
    return this._previousNotifications.asObservable();
  }

  // ---------------- Helpers ----------------
  getDateYYYYMMDD(timeStamp = new Date()) {
    const today = timeStamp;
    const year = today.getFullYear();
    const mm = today.getMonth() + 1;
    const dd = today.getDate();
    const date = dd < 10 ? '0' + dd : dd.toString();
    const month = mm < 10 ? '0' + mm : mm.toString();
    return Number(`${year}${month}${date}`);
  }

  /** Coerce “Firestore-ish” timestamps into millis */
  private toMillis(value: FSTs): number {
    if (!value) return 0;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string') {
      const d = new Date(value);
      return isNaN(d.getTime()) ? 0 : d.getTime();
    }
    const secs = (value as any)?.seconds ?? (value as any)?._seconds;
    const nanos = (value as any)?.nanoseconds ?? (value as any)?._nanoseconds;
    if (typeof secs === 'number') {
      return secs * 1000 + Math.floor((typeof nanos === 'number' ? nanos : 0) / 1_000_000);
    }
    return 0;
  }

  private toDate(value: any): Date | null {
    const ms = this.toMillis(value);
    return ms ? new Date(ms) : null;
  }

  private isAssignment(n: Notification): boolean { return Boolean((n as any)?.assignmentId); }
  private isApproval(n: Notification): boolean { return n?.approvalRequest === true; }

  /** Deterministic DESC sort by time, then updatedAt, then id */
  private sortByNewestDesc = (a: Notification, b: Notification) => {
    const ta = (a as any)._sortTime ?? this.toMillis(a?.time);
    const tb = (b as any)._sortTime ?? this.toMillis(b?.time);
    if (tb !== ta) return tb - ta;

    const ua = (a as any)._sortUpdatedAt ?? this.toMillis((a as any)?.updatedAt);
    const ub = (b as any)._sortUpdatedAt ?? this.toMillis((b as any)?.updatedAt);
    if (ub !== ua) return ub - ua;

    const ida = (a?.id || '');
    const idb = (b?.id || '');
    return idb.localeCompare(ida); // stable deterministic order
  };

  /** Collapse assignment fanout (keep only teacher copies) for admin view */
  private filterAssignmentsForPanel(list: Notification[]): Notification[] {
    return (list || []).filter(n => this.isAssignment(n) ? ((n as any).role === 'teacher') : true);
  }

  filterAssignmentDueDate(assignmentRemainder: any[]) {
    const todayDate = this.getDateYYYYMMDD();
    const remainderNotifications = assignmentRemainder?.map((data) => {
      const checkDueDate = this.getDateYYYYMMDD(new Date(data?.assignmentDueDate?.seconds * 1000));
      if ((todayDate + 1) >= checkDueDate && checkDueDate >= (todayDate)) {
        return ({
          remainingDays: 1,
          title: ' Assignment Due Date Approaching in 24 Hours',
          description: ` Your assignment ${data.assignmentName} is due in less than 24 hours`,
          icon: 'mat_outline:circle_notifications',
          id: data.assignmentId,
          read: false,
          remove: data?.remove || false,
          time: data.assignmentDueDate,
          updatedAt: '',
          assignmentId: data.assignmentId,
          learningUnitId: data.learningUnitId,
          classroomId: data.classroomId,
        } as Notification);
      }
    });
    return remainderNotifications
      ?.filter((d) => d != null)
      .sort((a: any, b: any) => this.toMillis(b?.time) - this.toMillis(a?.time));
  }

  // ---------------- Public methods ----------------

  /**
   * Streams notifications based on current user's role/accessLevel:
   * PANEL shows: Approval notifications (first) + Pending assignment due items
   * PREVIOUS shows: Overdue assignment items
   */
  async getAll() {
    return this.userService.userInfoSub.subscribe(async (userInfo: any) => {
      this.checkAssignmentsDueDate();

      const uid = userInfo?.uid;
      const accessLevel = userInfo?.accessLevel ?? 0;

      if (!uid && accessLevel < 10) {
        this._panelNotifications.next([]);
        this._previousNotifications.next([]);
        this.allApprovalRequestNotificationSub.next([]);
        return;
      }

      if (accessLevel >= 10) {
        this.notificationService.streamAllNotifications()
          .pipe(map(notifs => this.filterAssignmentsForPanel(notifs)))
          .subscribe(forPanel => this.splitPanelAndPrevious(forPanel));
        return;
      }

      // ---- STABLE TEACHER VIEW (accessLevel === 9) ----
      if (accessLevel === 9 && uid) {
        this.streamTeacherPanel(uid);
        return;
      }

      // Students
      if (uid) {
        this.notificationService.streamUserNotifications(uid, 'student')
          .subscribe(notifs => this.splitPanelAndPrevious(notifs));
      } else {
        this._panelNotifications.next([]);
        this._previousNotifications.next([]);
        this.allApprovalRequestNotificationSub.next([]);
      }
    });
  }

  /**
   * Legacy entry that now uses the same stable combineLatest strategy for accessLevel 9.
   */
  async getnotificationsAll(id: string) {
    this.userService.getUserByValueChanges(id).subscribe(async (userInfo) => {
      this.checkAssignmentsDueDate();

      const uid = userInfo?.uid;
      const role = userInfo?.role as ('teacher' | 'student' | 'admin' | undefined);
      const accessLevel = userInfo?.accessLevel ?? 0;

      if (accessLevel >= 10) {
        this.notificationService.streamAllNotifications()
          .pipe(map(notifs => this.filterAssignmentsForPanel(notifs)))
          .subscribe(forPanel => this.splitPanelAndPrevious(forPanel));
      } else if (accessLevel === 9 && uid) {
        this.streamTeacherPanel(uid);
      } else if (role === 'student' && uid) {
        this.notificationService.streamUserNotifications(uid, 'student')
          .subscribe(notifs => this.splitPanelAndPrevious(notifs));
      } else {
        this._panelNotifications.next([]);
        this._previousNotifications.next([]);
        this.allApprovalRequestNotificationSub.next([]);
      }
    });
  }

  /**
   * Persist teacher assignment due reminders (next 24h)
   * and publish the convenience "assignments" stream (unchanged).
   */
  checkAssignmentsDueDate() {
    this.teacherService.associatedClassroom.subscribe(async (teacherCLs) => {
      if (!teacherCLs) return;

      const classIdArr = Object.keys(teacherCLs);

      const clsArr: Promise<any>[] = [];
      classIdArr.forEach((clsId) => clsArr.push(this.classroomService.getWorkflowAssignments(clsId)));
      const classRoomsArr = (await Promise.all(clsArr)).filter((doc) => doc != undefined);

      const workflowIds =
        classRoomsArr?.length
          ? classRoomsArr.flatMap((cls) =>
              Object.keys(cls?.programmes)
                .flatMap((d) => cls?.programmes[d]?.['workflowIds'])
                .filter((wfId) => wfId?.hasOwnProperty('workflowId') && wfId.workflowId?.length)
                .map((w) => ({ ...w, classroomId: cls?.classroomId }))
            )
          : [];

      const workflowIdsDocRefArr: Promise<any>[] = [];
      workflowIds.forEach((wf) => workflowIdsDocRefArr.push(this.workflowService.getWorkflowDoc(wf['workflowId'])));
      const workFlowInfoArr: any[] = await Promise.all(workflowIdsDocRefArr);

      const allClsAssignments: any[] = [];
      workFlowInfoArr?.forEach((workflowInfo) => {
        workflowInfo?.workflowSteps?.forEach((wfStep) => {
          wfStep?.contents?.forEach((content) => {
            if (content?.contentType == 'assignment') {
              const index = workflowIds.findIndex((d) => d['workflowId'] == workflowInfo?.workflowId);
              const clsLUObj = workflowIds[index];
              allClsAssignments.push({
                ...content,
                workflowId: workflowInfo?.workflowId,
                ...clsLUObj
              });
            }
          });
        });
      });

      const filterAssignmentsData = this.filterAssignmentDueDate(allClsAssignments) || [];

      // Save teacher reminders as Notifications for the logged-in teacher
      const auth = await this.userService.getLoggedInUser();
      const uid = auth?.uid;
      if (uid && filterAssignmentsData.length) {
        for (const due of filterAssignmentsData) {
          await this.notificationService.createNotification({
            ...due,
            userId: uid,
            role: 'teacher',
            viewNotificationsAdmin: (due as any)?.viewNotificationsAdmin ?? false
          } as any);
        }
      }

      // UI stream for any component that shows only "assignments"
      this.assignmentsNotificationsSub.next(filterAssignmentsData);
    });
  }

  getFilterAssignments(assignments: any[] = []) {
    const assignmentData = assignments?.map((data) => ({
      title: data.assignmentName,
      description: data.contentName,
      icon: 'mat_outline:circle_notifications',
      id: data.docId,
      read: false,
      remove: false,
      time: data.assignmentDueDate,
      updatedAt: ''
    }));
    return assignmentData || [];
  }

  /** Stable teacher stream (accessLevel 9): approvals + personal teacher notifications */
  private streamTeacherPanel(uid: string) {
    const teacherPersonal$ = this.notificationService.streamUserNotifications(uid, 'teacher')
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));
    const teacherApprovals$ = this.notificationService.streamApprovalRequestsForRep(uid)
      .pipe(shareReplay({ bufferSize: 1, refCount: true }));

    combineLatest([teacherPersonal$, teacherApprovals$])
      .pipe(
        map(([a, b]) => [...(a || []), ...(b || [])]),
        // prevent flicker on structurally equal arrays
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      )
      .subscribe((combined) => this.splitPanelAndPrevious(combined));
  }

  /** Split into panel/past buckets and publish with strict ordering */
  private splitPanelAndPrevious(incoming: Notification[]) {
    const nowMs = Date.now();
    const normalized = this.parseNotifications(incoming);

    const approvals: Notification[] = [];
    const pendingAssignments: Notification[] = [];
    const overdueAssignments: Notification[] = [];

    for (const n of normalized) {
      const tMs = (n as any)._sortTime ?? this.toMillis(n.time);
      const isAssign = this.isAssignment(n);
      const isApr = this.isApproval(n);

      if (isApr) {
        approvals.push(n);
        continue;
      }
      if (isAssign) {
        if (tMs && tMs < nowMs) overdueAssignments.push(n);
        else pendingAssignments.push(n);
      }
    }

    // Order within sections by newest first
    approvals.sort(this.sortByNewestDesc);
    pendingAssignments.sort(this.sortByNewestDesc);
    overdueAssignments.sort(this.sortByNewestDesc);

    // PANEL: approvals first, then assignments (pending)
    const panel = [...approvals, ...pendingAssignments].filter(n => n?.remove !== true);

    // PREVIOUS: overdue assignments only
    const previous = overdueAssignments.filter(n => n?.remove !== true);

    // publish
    this.allApprovalRequestNotificationSub.next(approvals);
    this._panelNotifications.next(panel);
    this._previousNotifications.next(previous);
  }

  /** Normalize & attach hidden sort keys for deterministic ordering */
  private parseNotifications(teacherNotifications: Notification[]) {
    return (teacherNotifications || []).map((data) => {
      const _sortTime = this.toMillis(data?.time);
      const _sortUpdatedAt = this.toMillis((data as any)?.updatedAt);
      return {
        id: data?.id || '',
        icon: data?.icon || '',
        image: data?.image || '',
        title: data?.title || '',
        description: data?.description || '',
        time: data?.time || '',
        link: data?.link || '',
        read: data?.read || false,
        remove: data?.remove || false,
        approvalRequest: data?.approvalRequest || false,
        selfRegUserId: data?.selfRegUserId || '',
        classroomId: data?.classroomId || '',

        firstName: data?.firstName || '',
        lastName: data?.lastName || '',
        countryCode: data?.countryCode || '',
        phoneNumber: data?.phoneNumber || '',
        email: data?.email || '',
        instituteName: data?.instituteName || '',
        classroomName: data?.classroomName || '',
        subject: data?.subject || '',
        actionTakenBy: data?.actionTakenBy || '',
        actionDate: data?.actionDate || '',
        rejectionReason: (data as any)?.rejectionReason || '',
        schoolRepUid: (data as any)?.schoolRepUid || '',
        assignmentId: (data as any)?.assignmentId || '',
        learningUnitId: (data as any)?.learningUnitId || '',
        userId: (data as any)?.userId || '',
        role: (data as any)?.role || '',
        viewNotificationsAdmin: (data as any)?.viewNotificationsAdmin ?? false,

        // hidden keys used only for sorting
        _sortTime,
        _sortUpdatedAt
      } as any as Notification;
    }) as Notification[];
  }

  // --- passthrough mutations to DB service (unchanged) ---
  addNewNotification(newNotification: Notification) {
    return this.notifications$.pipe(
      take(1),
      map(() => {
        this.userService.getLoggedInUser().then(auth => {
          const userId = (newNotification as any).userId || auth?.uid;
          this.notificationService.createNotification({
            ...newNotification,
            userId,
            role: ((newNotification as any)?.role as ('teacher' | 'student')) || 'teacher'
          } as any);
        });
        return newNotification;
      })
    ) as any;
  }

  update(id: string, updatedNotification: Notification) {
    return this.notifications$.pipe(
      take(1),
      map(() => {
        this.notificationService.updateNotification(id, updatedNotification);
        return updatedNotification;
      })
    ) as any;
  }

  delete(id: string, updatedNotification: Notification) {
    return this.notifications$.pipe(
      take(1),
      map(() => {
        this.notificationService.updateNotification(id, updatedNotification);
        if ((updatedNotification as any)?.schoolRepUid) {
          this.notificationService.updateSchoolRepNotification(updatedNotification, (updatedNotification as any).schoolRepUid);
        }
        return updatedNotification;
      })
    ) as any;
  }

  markAllAsRead() {
    return this.notifications$.pipe(
      take(1),
      map(async (panelList) => {
        const updates = panelList.filter(n => n && n.id).map(n => this.notificationService.updateNotification(n.id!, { read: true }));
        await Promise.all(updates);
        const updated = panelList.map(n => ({ ...n, read: true }));
        this._panelNotifications.next(updated);
        return updated as any;
      })
    ) as any;
  }
}
