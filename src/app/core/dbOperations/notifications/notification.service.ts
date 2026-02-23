import { Injectable } from '@angular/core';
import { BehaviorSubject, ReplaySubject, lastValueFrom, take } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import * as aUser from 'firebase/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';

import { User } from '../user/user.types';
import { UserFirestore } from '../user/user.firestore';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { NotificationFirestore } from './notification.firestore';
import { MasterService } from '../master/master.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _user: ReplaySubject<User | null> = new ReplaySubject<User | null>(1);
  storedUserInfo = new BehaviorSubject<any>(null);
  authUser: aUser.User | undefined;
  approvalClassroomInfoSub = new BehaviorSubject<any>(null);
  userInfoSub = new ReplaySubject<any>(1);
  changeWhatsappIconPosition = new BehaviorSubject<boolean>(false);

  constructor(
    private _httpClient: HttpClient,
    private afAuth: AngularFireAuth,
    private userFirestore: UserFirestore,
    private afs: AngularFirestore,
    private notificationFirestore: NotificationFirestore,
    private masterService: MasterService
  ) { }

  /* ----------------------------- helpers ----------------------------- */

  private _deriveCategoryStrict(n: any): 'approvalRequest' | 'assignmentDueDate' {
    return n?.approvalRequest === true ? 'approvalRequest' : 'assignmentDueDate';
  }

  private _stripUndefined<T extends object>(obj: T): T {
    const out: any = Array.isArray(obj) ? [] : {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      if (v === undefined) return;
      if (v && typeof v === 'object' && !(v instanceof Date)) out[k] = this._stripUndefined(v as any);
      else out[k] = v;
    });
    return out as T;
  }

  private async _getDocByIdOnce(id: string): Promise<Notification | null> {
    const snap = await lastValueFrom(
      this.afs.doc<Notification>(`Notifications/${id}`).valueChanges({ idField: 'id' }).pipe(take(1))
    );
    return snap ?? null;
  }

  /* --------------------------- auth/user --------------------------- */

  async getLoggedInUser() { return await lastValueFrom(this.afAuth.authState.pipe(take(1))); }
  private async getUid(): Promise<string> { const usr: any = await lastValueFrom(this.afAuth.authState.pipe(take(1))); return usr?.uid; }

  private async getPhone(): Promise<{ countryCode: string; phoneNumber: string }> {
    const uid = await this.getUid();
    const user = await lastValueFrom(this.userFirestore.doc$(uid).pipe(take(1)));
    return { countryCode: user?.countryCode, phoneNumber: user?.phoneNumber };
  }

  private getUsersByQuery(query: QueryFn) { return this.userFirestore.collection$(query).pipe(take(1)); }
  async getUserById(docId: string) { return this.userFirestore.getCollectionDocument(docId); }
  async setUserByDocId(docId: string) { const obs = await this.getUserById(docId); obs.subscribe(u => this._user.next(u as User)); }
  async getAllUsersNotifications() { return this.streamAllNotifications(); }
  updateSelfRegUserApproval(value, uid) { return this.userFirestore.update(value, uid); }

  /* ------------------------------ create ------------------------------ */
  async createNotification(
    input: Omit<Notification, 'id' | 'time' | 'updatedAt'> & {
      userId: string;
      role: 'teacher' | 'student';
      time?: string | Date;
      updatedAt?: string | Date;
    }
  ): Promise<string> {
    const serverTS = firebase.firestore.FieldValue.serverTimestamp();
    const payload: Notification = {
      ...input,
      time: (input.time as any) ?? (serverTS as any),
      updatedAt: serverTS as any,
      read: (input as any)?.read ?? false,
      remove: (input as any)?.remove ?? false
    };

    // 1) write to Notifications
    const id = await this.notificationFirestore.create(payload as any);

    // 2) mirror full payload in Master (nested write)
    const category = this._deriveCategoryStrict(payload);
    const clean = this._stripUndefined({ ...payload, id });
    const masterDocId = await this.masterService.upsertNotificationInMaster(
      payload.userId, category, id, clean
    );

    // 3) attach masterDocId back to notification
    await this.afs.doc(`Notifications/${id}`).update({
      masterDocId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 4) log Notifications after write
    const after = await this._getDocByIdOnce(id);
   

    return id;
  }

  /* ------------------------------ update ------------------------------ */
  async updateNotification(notificationId: string, patch: Partial<Notification>) {
    const existing = await this._getDocByIdOnce(notificationId);
    if (!existing) return;

    const serverTS = firebase.firestore.FieldValue.serverTimestamp();

    // Update Notifications/<id>
    await this.notificationFirestore.update({ ...patch, updatedAt: serverTS as any }, notificationId);

    // Merge → full payload for master
    const merged = { ...existing, ...patch, id: notificationId };
    const oldCategory = this._deriveCategoryStrict(existing);
    const newCategory = this._deriveCategoryStrict(merged);
    const clean = this._stripUndefined(merged);

    // Read-back & log Notifications
    const afterNotif = await this._getDocByIdOnce(notificationId);
    //console.log('[NOTIFICATIONS UPDATE]', { id: notificationId, value: afterNotif });

    if (oldCategory !== newCategory) {
      // move leaf
      await this.masterService.deleteNotificationFromMaster(existing.userId as any, oldCategory, notificationId);
      const newMasterDocId = await this.masterService.upsertNotificationInMaster(
        (merged.userId as any) ?? existing.userId, newCategory, notificationId, clean
      );

      if (!existing.masterDocId || existing.masterDocId !== newMasterDocId) {
        await this.afs.doc(`Notifications/${notificationId}`).update({
          masterDocId: newMasterDocId,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const again = await this._getDocByIdOnce(notificationId);
       // console.log('[NOTIFICATIONS UPDATE masterDocId]', { id: notificationId, value: again });
      }
      // Master logs printed inside upsertNotificationInMaster
    } else {
      // in-place replace in the same master doc (nested write)
      const updated = await this.masterService.updateNotificationInMaster(
        (merged.userId as any) ?? existing.userId, newCategory, notificationId, clean
      );
      // echo concise log
    //  console.log('[MASTER UPDATE (echo)]', updated);
    }
  }

  /* ------------------------------ delete ------------------------------ */
  async deleteNotification(id: string) {
    const existing = await this._getDocByIdOnce(id);
    if (existing) {
      const category = this._deriveCategoryStrict(existing);
      await this.masterService.deleteNotificationFromMaster(existing.userId as any, category, id);
    }
    await this.afs.doc(`Notifications/${id}`).delete();
   // console.log('[NOTIFICATIONS DELETE]', { id, deleted: true });
  }

  /* ------------------------------ streams ------------------------------ */
  streamUserNotifications(userId: string, role?: 'teacher' | 'student') {
    return this.afs
      .collection<Notification>('Notifications', ref => ref.where('userId', '==', userId).where('role', '==', role))
      .valueChanges({ idField: 'id' });
  }

  streamApprovalRequestsForRep(schoolRepUid: string) {
    return this.afs
      .collection<Notification>('Notifications', ref => ref.where('approvalRequest', '==', true).where('schoolRepUid', '==', schoolRepUid))
      .valueChanges({ idField: 'id' });
  }

  streamAllNotifications() {
    return this.afs.collection<Notification>('Notifications').valueChanges({ idField: 'id' });
  }

  async updateSchoolRepNotification(updatedNotification: Notification, repUid: string) {
    const basePatch: Partial<Notification> = { ...updatedNotification, userId: repUid, role: 'teacher' };
    if (updatedNotification?.id) return this.updateNotification(updatedNotification.id, basePatch);
    else return this.createNotification(basePatch as any);
  }

  /* ----- (rest of your student/assignment helpers unchanged) ----- */

  private async patchStudentNotificationRemoveByAssignment(userId: string, assignmentId: string, remove: boolean) {
    const snap = await lastValueFrom(
      this.afs.collection<Notification>('Notifications', ref =>
        ref.where('userId', '==', userId).where('role', '==', 'student').where('assignmentId', '==', assignmentId)
      ).get()
    );
    const updates: Promise<any>[] = [];
    snap.forEach((doc) => updates.push(this.updateNotification(doc.id, { remove })));
    await Promise.all(updates);
  }

  getNotificationById$(id: string) {
    return this.afs.doc<Notification>(`Notifications/${id}`).valueChanges({ idField: 'id' });
  }

  async getAllNotificationsFromMaster(): Promise<Notification[]> {
    const out: Notification[] = [];
    const snap = await this.afs.collection('Master', ref => ref.where('type', '==', 'NOTIFICATION').orderBy('creationDate', 'desc')).get().toPromise();
    if (!snap || snap.empty) return out;

    snap.docs.forEach(doc => {
      const data: any = doc.data();
      const masterDocId = doc.id;
      const notifications = data?.notifications || {};
      Object.entries(notifications).forEach(([userId, byCatAny]) => {
        const byCat = byCatAny as Record<string, any>;
        Object.entries(byCat || {}).forEach(([category, byIdAny]) => {
          const byId = byIdAny as Record<string, any>;
          Object.entries(byId || {}).forEach(([notificationDocId, payloadAny]) => {
            const payload = payloadAny as any;
            out.push({ ...(payload || {}), id: notificationDocId, userId, category, masterDocId } as Notification);
          });
        });
      });
    });

    return out;
  }

  async updateUserStudentNotifications(oldWorkflowObj: any[] = [], updatedWorkflowOn: any[] = []) {
    const oldAssignmentIdsArr: string[] = [];
    const updatedAssignmentIdsArr: string[] = [];
    const idsToBeRemovedArr: string[] = [];

    oldWorkflowObj?.forEach((wf: any) => wf?.contents?.forEach((c: any) => { if (c?.contentCategory === 'assignment') oldAssignmentIdsArr.push(c.assignmentId); }));
    updatedWorkflowOn?.forEach((wf: any) => wf?.contents?.forEach((c: any) => { if (c?.contentCategory === 'assignment') updatedAssignmentIdsArr.push(c.assignmentId); }));
    oldAssignmentIdsArr.forEach((id) => { if (!updatedAssignmentIdsArr.includes(id)) idsToBeRemovedArr.push(id); });

    const { countryCode, phoneNumber } = await this.getPhone();
    const queryUser: QueryFn = (ref: CollectionReference) =>
      ref.where('countryCode', '==', countryCode).where('phoneNumber', '==', phoneNumber);

    this.getUsersByQuery(queryUser).subscribe(async (users: any[]) => {
      if (!users?.length) return;
      const uid = users[0]?.uid;

      for (const assignmentId of idsToBeRemovedArr) await this.patchStudentNotificationRemoveByAssignment(uid, assignmentId, true);
      for (const assignmentId of updatedAssignmentIdsArr) await this.patchStudentNotificationRemoveByAssignment(uid, assignmentId, false);
    });
  }

  async deleteNotificationCompat(id: string) { return this.deleteNotification(id); }
}
