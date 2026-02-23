import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import * as aUser from 'firebase/auth';
import { BehaviorSubject, first, firstValueFrom, lastValueFrom, map, Observable, ReplaySubject, take, tap } from 'rxjs';
import { UserFirestore } from './user.firestore';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { AuthService } from 'app/core/auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private _user: ReplaySubject<User> = new ReplaySubject<User>();
  storedUserInfo = new BehaviorSubject(null);
  authUser: aUser.User;
  approvalClassroomInfoSub = new BehaviorSubject(null);
  userInfoSub = new ReplaySubject(1);
  changeWhatsappIconPosition = new BehaviorSubject<boolean>(false);

  /**
   * Constructor
   */
  constructor(
    private _httpClient: HttpClient,
    private afAuth: AngularFireAuth,
    private userFirestore: UserFirestore,
     private authService: AuthService,
  ) {
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Accessors
  // -----------------------------------------------------------------------------------------------------

  /**
   * Setter & getter for user
   *
   * @param value
   */
  set user(value: User) {
    // Store the value
    this._user.next(value);
  }

  get user$(): Observable<User> {
    return this._user.asObservable();
  }

  // -----------------------------------------------------------------------------------------------------
  // @ Public methods
  // -----------------------------------------------------------------------------------------------------

  /**
   * Get the current logged in user data from authentication
   */
  async getLoggedInUser() {
    return await lastValueFrom(this.afAuth.authState.pipe(first()));
  }

  /**
   * Get the current logged in user data and return email or full name or uid
   */
  async getCurrentUserDetails() {
    const userData = await firstValueFrom(this.user$);
    return userData;
  }

  /**
   * Get randomly generated docId
   */
  getRandomDocId(): string {
    return this.userFirestore.getRandomDocId();
  }

  /**
   * Stream user by docId
   * @param docId
   * @returns
   */
  streamUserData(docId: string) {
    return this.userFirestore.streamCollectionDocument(docId);
  }

  /**
    * Get user by docId
    * @param docId
    */
  async getUserById(docId: string) {
    return this.userFirestore.getCollectionDocument(docId);
  }

  async getCurrentStudentInfo() {
    const uid = this.authService.getLogedInUid();
    return this.userFirestore.doc$(uid)
  }

  async getAllUsersNotifications() {
    return this.userFirestore.streamCollectionQuery('viewNotificationsAdmin', true);
  }

  /**
   * Get user and save as observable
   */
  async storeUserInfo() {
    const authUser: firebase.default.User = await this.getLoggedInUser();
    (await this.getUserById(authUser.uid)).subscribe((user: User) => {
      if (!user) {
        this._user.next(null);
        return;
      }
      this._user.next(user);
    });
  }

  /**
   * Update user by docId
   * @param user
   * @param docId
   */
  updateUserByDocId(docId: string, user: Partial<User>) {
    this.userFirestore.updateWithMerge(docId, user);
  }

  /**
   * Delete user by docId
   * @param docId
   */
  deleteUserByDocId(docId: string) {
    return this.userFirestore.delete(docId);
  }




  /**
   * old methods
   */
  async getUserInfo() {
    const uid = await this.getUid();
    this.userFirestore.doc$(uid).pipe(
      take(1),
      tap(userInfo => this.userInfoSub.next(userInfo))
    );
  }

  // async getAllUsersNotifications() {
  //   const query: QueryFn = (ref: CollectionReference) => ref.where('viewNotificationsAdmin', '==', true);
  //   return this.userFirestore.collection$(query).pipe(
  //     tap(users => users));
  // }

  async getUid() {
    const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
    return await usr.uid;
  }

  async getPhone() {
    const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
    const user = await lastValueFrom(this.getUser(usr.uid));
    return await { countryCode: user?.countryCode, phoneNumber: user?.phoneNumber };
  }

  async getDocDataById(id) {
    return await this.userFirestore.getDocDataByDocId(id);
  }

  /**
   * Get the current logged in user data
   */
  async get(): Promise<Observable<any>> {
    return this.userFirestore.doc$(await this.getUid())
      // return this.userFirestore.doc$(this.authUser.uid + '/Student' + '/' + 'jMQ6DTULY4LGhmTwyZSi')
      .pipe(take(1),
        tap((user) => {
          // this._user.next(user);
        })
      );
  }

  /**
   * Update the user
   *
   * @param user
   */
  update(user: User): Observable<any> {
    return this._httpClient.patch<User>('api/common/user', { user }).pipe(
      map((response) => {
        this._user.next(response);
      })
    );
  }

  getRandomId(): string {
    return this.userFirestore.getRandomGeneratedId();
  }

  getDocWithQuery(query: QueryFn): Observable<any> {
    // const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
    // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', usr.uid)
    // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', 'fqawdKwpdTeUbyE5HJYPRroCypz2')
    return this.userFirestore.collection$(query).pipe(take(1),
      tap(teachers => teachers));
  }

  updateUser(user) {
    this._user.next(user);
  }

  async updateSchoolRepNotification(updatedNotification: Notification, repUid) {
    const schoolRepDoc = await this.getDocDataById(repUid);
    const notificationArr = schoolRepDoc?.['teacherNotifications'] || [];
    const index = notificationArr.findIndex(data => data['id'] == updatedNotification.id);
    notificationArr[index] = updatedNotification;
    const value = {
      teacherNotifications: notificationArr
    };
    return await this.userFirestore.update(value, repUid);
  }

  async setTeacherInfo(value) {
    this.userFirestore.update(value, await this.getUid());
  }

  async getTeacherInfo() {
    const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
    return this.userFirestore.doc$(usr?.uid);
  }

  updateLoginUser(value, linkUid) {
    return this.userFirestore.update(value, linkUid);
  }

  updateSelfRegUserApproval(value, uid) {
    return this.userFirestore.update(value, uid);
  }

  getUser(id): Observable<any> {
    return this.userFirestore.doc$(id).pipe(take(1));
  }

  async updateUserStudentNotifications(oldWorkflowObj, updatedWorkflowOn) {
    const oldAssignmentIdsArr = [];
    const updatedAssignmentIdsArr = [];
    const idsToBeRemovedArr = [];
    oldWorkflowObj?.forEach((workflow) => {
      if (workflow.hasOwnProperty('contents')) {
        workflow.contents.forEach((content) => {
          if (content.contentType == 'assignment') {
            oldAssignmentIdsArr.push(content.assignmentId);
          }
        });

      }
    });

    updatedWorkflowOn.forEach((workflow) => {
      if (workflow.hasOwnProperty('contents')) {
        workflow.contents.forEach((content) => {
          if (content.contentType == 'assignment') {
            updatedAssignmentIdsArr.push(content.assignmentId);
          }
        });

      }
    });

    oldAssignmentIdsArr.forEach((id) => {
      if (!updatedAssignmentIdsArr.includes(id)) {
        idsToBeRemovedArr.push(id);
      }
    });

    const { countryCode, phoneNumber } = await this.getPhone();

    const query: QueryFn = (ref: CollectionReference) => ref.where('countryCode', '==', countryCode).where('phoneNumber', '==', phoneNumber);

    this.getDocWithQuery(query).subscribe((res) => {
      if (res.length) {
        const userDoc = res[0];
        if (userDoc.hasOwnProperty('studentNotifications')) {
          userDoc.studentNotifications.forEach((notificationObj, index, arrayRef) => {
            if (idsToBeRemovedArr.includes(notificationObj.id)) {
              arrayRef[index].remove = true;
            }
            if (updatedAssignmentIdsArr.includes(notificationObj.id)) {
              arrayRef[index].remove = false;
            }
          });
        }

        const updateObj = {
          studentNotifications: userDoc.studentNotifications
        };
        this.updateLoginUser(updateObj, userDoc.uid).catch((err) => { console.log(err); });
      }
    });
  }

  getUserByValueChanges(id) {
    return this.userFirestore.doc$(id);
  }

  getUserNameByPhone(countryCode: string, phoneNumber: string) {
    const query: QueryFn = (ref: CollectionReference) => ref.where('countryCode', '==', countryCode).where('phoneNumber', '==', phoneNumber);
    return this.userFirestore.collectionSnapshotOnce(query);
  }

  deleteUser(id) {
    return this.userFirestore.delete(id);
  }

  async setUserByDocId(docId: string) {
    // Fetch user by docId and update the user$ observable
    const userObservable = await this.getUserById(docId);
    userObservable.subscribe(user => {
      this._user.next(user);
    });
  }
}
