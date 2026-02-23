import { HttpClient } from '@angular/common/http';
import { Injectable, Injector } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, DocumentChangeAction, QueryFn } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { serverTimestamp } from 'firebase/firestore';
import { BehaviorSubject, first, firstValueFrom, forkJoin, map, Observable, of, ReplaySubject, Subscription, take, tap } from 'rxjs';
import { UserService } from '../user/user.service';
import { TeachersFirestore } from './teacher.firestore';
import { Teacher } from './teacher.types';
import { arrayUnion } from '@angular/fire/firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
    providedIn: 'root'
})
export class TeacherService {
    private _teachers: ReplaySubject<User> = new ReplaySubject<User>(1);
    currentTeacher = new BehaviorSubject(null);
    currentTeacherId = new BehaviorSubject(null);
    unsub: any = [];
    allData: any = [];
    private teacherSubscriptions: Subscription[] = [];
    private teacherSubscription: Subscription[] = [];
    associatedClassroom = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private teacherFirestore: TeachersFirestore,
        public afAuth: AngularFireAuth,
        // private userService: UserService,
        private afs: AngularFirestore,
        private injector: Injector
    ) {
    }

    getDocWithQuery(query: QueryFn) {
        // const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
        // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', usr.uid)
        // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', 'fqawdKwpdTeUbyE5HJYPRroCypz2')
        return this.teacherFirestore.collection$(query).pipe(take(1),
            tap(teacher => teacher));
    }

    addTeachers(teacherData: any) {
        const newTeacherClassroom = {
            'classrooms': {
                [`${teacherData.classroomId}`]: {
                    institutionId: teacherData.institutionId,
                    institutionName: teacherData.institutionName,
                    classroomId: teacherData.classroomId,
                    classroomName: teacherData.classroomName,
                    grade: teacherData.grade,
                    section: teacherData.section,
                    createdAt: serverTimestamp(),
                    programmes: arrayUnion({
                        programmeId: teacherData?.programme?.programmeId,
                        programmeName: teacherData?.programme?.programmeName,
                        programmeCode: teacherData?.programme?.programmeCode ?? '',
                        displayName: teacherData?.programme?.displayName ?? '',
                    }),
                    type: 'CLASSROOM'
                }
            },
            'teacherMeta': {
                firstName: teacherData.firstName,
                lastName: teacherData.lastName,
                // fullNameLowerCase: `${teacherData.firstName.toLowerCase()}${teacherData.lastName.toLowerCase()}`,
                fullNameLowerCase: `${(teacherData.firstName || '').toLowerCase().replace(/ /g, '')}${(teacherData.lastName || '').toLowerCase().replace(/ /g, '')}`,
                countryCode: teacherData.countryCode,
                phoneNumber: teacherData.phoneNumber,
                email: teacherData.email,
                uid: teacherData.uid,
                updatedAt: serverTimestamp()
            },
        };

        this.teacherFirestore.update(newTeacherClassroom, teacherData.uid);
    }

    getAllTeacherClassroom(uid) {
        return this.teacherFirestore.doc$(uid).pipe(tap((docData: any) => {
            const classrooms = docData?.classrooms || {};
            return this.associatedClassroom.next(classrooms || {});
        }));
    }

    // addClassroom(formData) {
    //     let newClassroom={
    //         [`${formData}`]
    //     }
    //         this.teacherFirestore.addClassroom()
    // }
    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set teachers(value: User) {
        // Store the value
        this._teachers.next(value);
    }

    get teachers$(): Observable<User> {
        // this._students.subscribe(a => {
        // })

        return this._teachers.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in Teacher data
     */
    // async get(): Promise<Observable<any>> {
    //     const userId = await this.userService.user$.subscribe((user) => {
    //     });

    //     // let cc = [{
    //     //     institutionName: 'ThinkTAC',
    //     //     institutionId: 'plkjbxcvbjkrgnm',
    //     //     classroomName: 'ThinkTac Demo',
    //     //     classroomId: 'kX2C5lbkqvPxKyzvAP65',
    //     //     programmeName: 'Summer Programme',
    //     //     programmeId: 'kX2C5lbkqvPxKyzvAP65',
    //     // },
    //     // {
    //     //     institutionName: 'ThinkTAC',
    //     //     institutionId: 'plkjbxcvbjkrgnm',
    //     //     classroomName: 'CBE Demo',
    //     //     classroomId: 'pkhgfdefghjvb',
    //     //     programmeName: 'Premium Programme',
    //     //     programmeId: 'mhgrewsxcvbhjkkj',
    //     // }
    //     // ]

    //     const cc = [{
    //         id: 'Courses',
    //         title: 'ThinkTAC 1',
    //         type: 'collapsable',
    //         icon: 'heroicons_outline:library',
    //         link: '/dashboard',
    //         active: true,
    //         children: [
    //             {
    //                 id: 'programme1',
    //                 title: 'ThinkTAC Demo',
    //                 type: 'basic',
    //                 icon: 'feather:classroom',
    //                 link: ':classroomId',
    //                 // active: true,
    //             },
    //             {
    //                 id: 'programme2',
    //                 title: 'ThinkTAC Test',
    //                 type: 'basic',
    //                 icon: 'feather:classroom',
    //                 link: '/my-programmes',
    //             }
    //         ]
    //     }];
    //     return of(this.associatedClassroom.next(cc));

    //     // const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
    //     // const query: QueryFn = (ref: CollectionReference) => ref.where('teacherUid', '==', usr.uid)
    //     // // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', 'fqawdKwpdTeUbyE5HJYPRroCypz2')
    //     // return this.teacherFirestore.collection$(query).pipe(take(1),
    //     //     tap((teachers) => {
    //     //         return this._teachers.next(teachers);
    //     //     }))
    // }

    // TeacherService

    get(): Observable<any> {
        const cc = [{
            id: 'Courses',
            title: 'ThinkTAC 1',
            type: 'collapsable',
            icon: 'heroicons_outline:library',
            link: '/dashboard',
            active: true,
            children: [
                { id: 'programme1', title: 'ThinkTAC Demo', type: 'basic', icon: 'feather:classroom', link: ':classroomId' },
                { id: 'programme2', title: 'ThinkTAC Test', type: 'basic', icon: 'feather:classroom', link: '/my-programmes' }
            ]
        }];

        this.associatedClassroom.next(cc);
        // Return the stream that emits the value we just pushed
        return this.associatedClassroom.asObservable();
    }


    getWithQuery(query: QueryFn): Observable<any> {
        return this.teacherFirestore.collection$(query).pipe(
            tap(teachers => this._teachers.next(teachers)));
    }

    async updateUser() {
        const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
        const doc = this.getWithId(usr?.uid);
        doc.pipe(take(1)).subscribe((res) => {
            // Lazily resolve to avoid constructor-time cycle:
            const userService = this.injector.get(UserService);
            userService.updateUser(res);
        });
    }


    create(value: Teacher): Promise<any> {
        return this.teacherFirestore.create(value);
    }

    createWithId(value: Teacher, id): Promise<any> {
        return this.teacherFirestore.createWithId(value, id);
    }

    getWithId(id) {
        return this.teacherFirestore.doc$(id).pipe(take(1),
            tap(teacher => this.currentTeacher.next(teacher)));
    }

    getDocDataById(id) {
        return this.teacherFirestore.getDocDataByDocId(id);
    }

    getStreamingDocDataById(id) {
        return this.teacherFirestore.getStreamingDocDataByDocId(id);
    }

    getClassroomLists(id) {
        return this.teacherFirestore.doc$(id).pipe(take(1));
    }

    getQueryWithGet(query) {
        return this.teacherFirestore.getDocDataByDocId(query);
    }

    getTeacherByIdOnce(teacherId: string) {
        return this.teacherFirestore.getWithGet(teacherId);
    }

    async checkUid(studentId) {
        const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
        const doc = this.getWithId(studentId);
        let output: boolean;
        const promise = new Promise((resolve) => {
            doc.pipe(take(1)).subscribe((res) => {
                if (res.uid === usr.uid) {
                    output = true;
                }
                else {
                    output = false;
                }
                resolve(output);
            });
        });

        return promise;
    }

    /**
     * Update the students
     *
     * @param students
     */
    // update(students: User): Observable<any> {
    //     return this._httpClient.patch<User>('api/common/students', { students }).pipe(
    //         map((response) => {
    //             this._students.next(response);
    //         })
    //     );
    // }

    setTeacher(docId, value) {
        return this.teacherFirestore.updateUsingUpdate(docId, value);
    }

    updateTeacher(value, docId) {
        return this.teacherFirestore.update(value, docId);
    }

    delete(doc) {
        const classrooms = { classrooms: doc.classrooms };
        return this.teacherFirestore.updateCls(classrooms, doc.docId);
    }

    updateTeacherProgramme(id, value) {
        return this.teacherFirestore.update(value, id);
    }

    updateTeacherProgrammeWithoutMerge(id, value) {
        return this.teacherFirestore.updateWithoutMerge(value, id);
    }

    // async updateAllteacher(institutionId, classroomId, newInstitutionName, classrooms) {
    //     let updateD = []
    //     const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${classroomId}.institutionId`, '==', institutionId)
    //     const d = await this.teacherFirestore.collectionSnapshot(query).pipe(take(1))
    //     d.subscribe(data => {
    //         const teachers = data.map(doc => ({ id: doc.payload.doc.id, ...doc.payload.doc.data() }));
    //         if (teachers.length != 0) {
    //             teachers.forEach(teacher => {
    //                 classrooms.forEach((clas) => {
    //                     let d = Object.keys(teacher.classrooms)
    //                     let o = d.filter(e => e == clas)
    //                     if (teacher.classrooms[o[0]]) {
    //                         teacher.classrooms[o[0]].institutionName = newInstitutionName
    //                     }
    //                 })
    //                 const updatedT = {
    //                     docId: teacher?.docId || '',
    //                     classrooms: teacher?.classrooms,
    //                     teacherMeta: teacher?.teacherMeta,
    //                 }
    //                 updateD.push(updatedT)
    //                 this.allData.push(updatedT)
    //                 this.updateTeacher(updatedT, updatedT.docId)

    //             })
    //         }
    //     })
    //     this.unsub.push(d)
    //     this.unsubscribeAlldocs()
    // }

    async getTeacherDocsByInstitution(classroomIdArray: Array<string>, institutionId: string) {
        const allData = [];
        classroomIdArray.forEach(async (classroomId) => {
            const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${classroomId}.institutionId`, '==', institutionId);
            const d = await this.teacherFirestore.collectionSnapshot(query).pipe(take(1));
            allData.push(d);
        });
        return allData;
    }

    async getAllTeacherDocsByClassroom(classroomIdArray: Array<string>) {
        const docArr = [];
        await Promise.all(
            classroomIdArray.map(async (classroomId) => {
                const query = ref => ref.where(`classrooms.${classroomId}.classroomId`, '==', classroomId);
                const d = await this.teacherFirestore.collectionSnapshotOnce(query);
                const n = await firstValueFrom(d);
                docArr.push(...n.docs.map(m => m.data()));
            })
        );

        return docArr;
    }

    async getAllteacherdocs(updatedProgName, classrooms, pid) {
        const docArr = [];
        classrooms.forEach(async (clas) => {
            const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${clas}.classroomId`, '==', clas);
            const d = await this.teacherFirestore.collectionSnapshot(query);
            docArr.push(d);
        });
        return docArr;
    }

    getAlldoc(): Observable<DocumentChangeAction<unknown>[]> {
        return this.afs.collection('Teachers').snapshotChanges();
    }

    getTeacherNameByPhone(code: string, phone: string) {
        const query: QueryFn = (ref: CollectionReference) => ref.where('teacherMeta.countryCode', '==', code).where('teacherMeta.phoneNumber', '==', phone);
        return this.teacherFirestore.collectionSnapshotOnce(query);
        // return this.afs.firestore.collection('Teachers').where('teacherMeta.countryCode', '==', code).where('teacherMeta.phoneNumber', '==', phone).get();
    }

    getTeacherByEmail(email: string): Observable<any> {
        return this.afs
            .collection('Teachers', ref => ref.where('teacherMeta.email', '==', email))
            .get();
    }

    updateSingleFieldInTeacher(teacherId: string, key: string, value: any) {
        return this.teacherFirestore.updateSingleField(key, value, teacherId);
    }

    getTeacherByDocId(docId: string): Observable<any> {
        return this.afs
            .collection('Teachers')
            .doc(docId)
            .get()
            .pipe(
                map((doc) => {
                    if (doc.exists) {
                        return doc.data();
                    } else {
                        return null;
                    }
                })
            );
    }

    deleteTeacher(teacherId: string) {
        return this.teacherFirestore.delete(teacherId);
    }
}
