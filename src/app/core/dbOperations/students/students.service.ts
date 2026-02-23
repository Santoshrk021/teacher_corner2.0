import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
    AngularFirestore,
    CollectionReference,
    QueryFn,
} from '@angular/fire/compat/firestore';
import { AuthService } from 'app/core/auth/auth.service';
import { User } from 'app/core/dbOperations/user/user.types';
import { firstValueFrom } from 'rxjs';
import {
    BehaviorSubject,
    first,
    Observable,
    ReplaySubject,
    take,
    tap,
} from 'rxjs';
import { UserService } from '../user/user.service';
import { Student, StudentsPhone } from './student.types';
import { StudentsFirestore } from './students.firestore';

@Injectable({
    providedIn: 'root',
})
export class StudentsService {
    private _students: ReplaySubject<User> = new ReplaySubject<User>(1);
    currentStudent = new BehaviorSubject(null);
    currentStudentId = new BehaviorSubject(null);
    studentSubmissionAttempts: any;
    contestSubmissionMeta = new BehaviorSubject(null);
    submissionMeta = new BehaviorSubject(null);

    /**
     * Constructor
     */
    constructor(
        private studentFirestore: StudentsFirestore,
        public afAuth: AngularFireAuth,
        private userService: UserService,
        private authService: AuthService,
        private afs: AngularFirestore
    ) { }

    async getDocWithQuery(query: QueryFn): Promise<Observable<any>> {
        return this.studentFirestore.collection$(query).pipe(
            take(1),
            tap((teacher) => teacher)
        );
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set students(value: User) {
        // Store the value
        this._students.next(value);
    }

    get students$(): Observable<User> {
        // this._students.subscribe(a => {
        //     console.log(a);
        // })

        return this._students.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in students data
     */
    async get(): Promise<Observable<any>> {
        // const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
        const uid = this.authService.getLogedInUid();
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('linkUid', '==', uid);
        // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', 'fqawdKwpdTeUbyE5HJYPRroCypz2')

        return this.studentFirestore.collection$(query).pipe(
            take(1),
            tap((students) => this._students.next(students))
        );
    }

    getWithQuery(query: QueryFn): Observable<any> {
        return this.studentFirestore.collection$(query).pipe(
            take(1),
            tap((students) => this._students.next(students))
        );
    }

    create(value: Student): Promise<any> {
        return this.studentFirestore.create(value);
    }

    createWithId(value: any, id): Promise<any> {
        return this.studentFirestore.createWithId(value, id);
    }

    getWithId(id) {
        return this.studentFirestore.doc$(id).pipe(
            take(1),
            tap((student) => this.currentStudent.next(student))
        );
    }

    getClassroomLists(id) {
        return this.studentFirestore.doc$(id).pipe(take(1));
    }

    updateUser(id) {
        const doc = this.getWithId(id);
        doc.pipe(take(1)).subscribe((res) => {
            this.userService.updateUser(res?.studentMeta);
        });
    }

    async checkUid(studentId) {
        const usr: any = await this.afAuth.authState.pipe(first()).toPromise();

        const doc = this.getWithId(studentId);
        let output: boolean;
        const promise = new Promise((resolve) => {
            doc.pipe(take(1)).subscribe((res) => {
                if (res?.linkUid === usr?.uid) {
                    output = true;
                } else {
                    output = false;
                }
                resolve(output);
            });
        });

        return promise;
    }

    getStudentInfo(studentId) {
        const doc = this.getWithId(studentId);
        const studentInfo = new Promise((resolve) => {
            doc.pipe(take(1)).subscribe((res) => {
                resolve(res);
            });
        });
        return studentInfo;
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

    async checkDocUpdateStudentMeta(value, docId) {
        const checkDoc = await this.studentFirestore.getDocDataByDocId(docId);
        if (checkDoc != undefined) {
            this.studentFirestore.update(value, docId);
        }
    }

    async updateStudent(value, docId) {
        try {
            await this.studentFirestore.update(value, docId);
        } catch (error) {
            console.error('Error updating student:', error);
            throw error; // Re-throw the error to be handled by the calling function if needed
        }
    }

    setStudent(docId, value) {
        return this.studentFirestore.updateUsingUpdate(docId, value);
    }

    delete(doc) {
        const classrooms = { classrooms: doc.classrooms };
        return this.studentFirestore.updateCls(classrooms, doc.docId);
    }

    async getAllStudentDocsByInstitution(
        classroomIds: string[],
        institutionId: string
    ) {
        if (!Array.isArray(classroomIds)) {
            throw new TypeError(`classroomIds must be an array. Got: ${typeof classroomIds}`);
        }

        const resultsPerClassroom = await Promise.all(
            classroomIds.map(async (classroomId) => {
                const query: QueryFn = (ref: any) =>
                    ref.where(`classrooms.${classroomId}.institutionId`, '==', institutionId);

                // This returns [{type, payload}, ...]
                const changes = await firstValueFrom(
                    this.studentFirestore.collectionSnapshot(query).pipe(take(1))
                );

                // Convert changes -> actual student objects
                return (changes || []).map((c: any) => {
                    const doc = c?.payload?.doc;
                    return {
                        docId: doc?.id,
                        ...(doc?.data?.() ?? {}),
                    };
                });
            })
        );

        // flatten: [[...],[...]] -> [...]
        return resultsPerClassroom.flat();
    }


    async getAllStudentDocsByClassroom(classroomIdArray: Array<string>) {
        const docArr = [];
        await Promise.all(
            classroomIdArray.map(async (classroomId) => {
                const query = (ref) =>
                    ref.where(
                        `classrooms.${classroomId}.classroomId`,
                        '==',
                        classroomId
                    );
                const d = await this.studentFirestore.collectionSnapshotOnce(
                    query
                );
                const n = await firstValueFrom(d);
                docArr.push(...n.docs.map((m) => m.data()));
            })
        );

        return docArr;
    }

    async getAlldoc() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('studentMeta.phoneNumber', '!=', '');
        return await this.studentFirestore.collectionSnapshot(query);
    }

    getContestDataOfStudent(studentId: string, contestId: string) {
        return this.afs
            .doc(`Students/${studentId}/Submissions/${studentId}-${contestId}`)
            .get();
    }

    getStudentWithIds(ids) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('contestSubmissions', '!=', '');
        return this.studentFirestore.collectionSnapshot(query);
    }

    getAttemptedAssignmentsByAssignmentId(assignmentId: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('attemptedAssignments', 'array-contains', assignmentId);
        return this.studentFirestore.collection$(query);
    }

    getStudentSubmissionByIdOnce(
        studentId: string,
        classroomId: string,
        programmeId: string
    ) {
        return this.afs
            .collection('Students')
            .doc(studentId)
            .collection('Submissions')
            .doc(`${classroomId}-${programmeId}`)
            .get();
    }

    getStudentByIdOnce(studentId: string) {
        return this.afs.collection('Students').doc(studentId).get();
    }

    generateRandomDocId() {
        return this.studentFirestore.getRandomGeneratedId();
    }

    getStudentNamesByPhone(countryCode: string, phoneNumber: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref
                .where('studentMeta.countryCode', '==', countryCode)
                .where('studentMeta.phoneNumber', '==', phoneNumber);
        return this.studentFirestore.collectionSnapshotOnce(query);
    }

    getStudentByEmail(email: string): Observable<any> {
        return this.afs
            .collection('Students', (ref) =>
                ref.where('studentMeta.email', '==', email)
            )
            .get();
    }

    getStudentByLinkUid(uid: string): Observable<any> {
        return this.afs
            .collection('Students', (ref) =>
                ref.where('studentMeta.linkUid', '==', uid)
            )
            .get();
    }

    updateSingleFieldInStudent(studentId: string, key: string, value: any) {
        return this.studentFirestore.updateSingleField(key, value, studentId);
    }

    async getAllStudent(): Promise<(StudentsPhone & { id: string })[]> {
        const snap = await firstValueFrom(
            this.afs.collection<Student>('Students').get()
        );
        return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Student) }));
    }
}
