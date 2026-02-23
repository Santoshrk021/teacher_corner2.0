import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { DocumentData, QuerySnapshot, serverTimestamp } from '@angular/fire/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { BehaviorSubject, Observable, ReplaySubject, first, firstValueFrom, take, tap } from 'rxjs';
import { TeacherService } from '../teachers/teachers.service';
import { ClassroomsFirestore } from './classrooms.firestore';

@Injectable({
    providedIn: 'root'
})
export class ClassroomsService {
    private _classrooms: ReplaySubject<User> = new ReplaySubject<User>(1);
    classroomSub = new BehaviorSubject(null);
    private dataSubject = new BehaviorSubject<any[]>(null);
    data$ = this.dataSubject.asObservable();

    currentClassroomId = new BehaviorSubject(null);
    currentClassroomName = new BehaviorSubject(null);
    allClassroomByInstituteSub = new BehaviorSubject(null);
    selectedInstitution = new BehaviorSubject(null);
    /**
     * Constructor
     */
    constructor(
        private classroomFirestore: ClassroomsFirestore,
        private teachersService: TeacherService,
        public afAuth: AngularFireAuth,
        public afs: AngularFirestore
    ) {
    }

    updateClsProgrammes(value, id: string) {
        return this.afs.collection('Classrooms').doc(id).update({
            programmes: value.programmes
        });
    }

    updateClsProgrammeswithMerge(value, id: string) {
        return this.afs.collection('Classrooms').doc(id).set({
            programmes: value.programmes
        }, { merge: true });
    }

    getClassroomId(institutionId, grade, section) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('institutionId', '==', institutionId)
                .where('grade', '==', grade)
                .where('section', '==', section);
        return this.classroomFirestore.collection$(query).pipe(take(1),
            tap((classroom: any) => {
                if (classroom.length) { return classroom; }
                else { return false; }
            }));
    }

    getClassroomByIdOnce(id: string) {
        return this.classroomFirestore.getWithGet(id);
    }

    updateWorkFlowIdClassroom(ValueObject: any, classroomId: string) {
        this.classroomFirestore.update(ValueObject, classroomId);
    }

    getClassroomDataById(clsId: string) {
        return this.classroomFirestore.getDocDataByDocId(clsId);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set classrooms(value: User) {
        // Store the value
        this._classrooms.next(value);
    }

    get classrooms$(): Observable<User> {
        this._classrooms.subscribe(() => {
        });

        return this._classrooms.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in classrooms data
     */

    getAllClassrooms() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('docId', 'not-in', ['--schema--', '--trash--']);
        return this.classroomFirestore.collection$(query);
    }

    getWorkflowAssignments(id: string) {
        return this.classroomFirestore.getDocDataByDocId(id);
    }

    get(id: string): Observable<any> {
        return this.classroomFirestore.doc$(id).pipe(take(1),
            tap(classroom => this._classrooms.next(classroom)));
    }

    async getAllClassroom(id: string) {
        const list = [];
        const clsPromise = new Promise((resolve) => {
            this.teachersService.getClassroomLists(id).pipe(take(1)).subscribe((res) => {
                resolve(res?.classroomId);
            });
        });

        const classroomInfo: any = await clsPromise;

        for (const d in classroomInfo) {
            this.get(classroomInfo[d]).pipe(take(1)).subscribe((res) => {
                list.push(res);
            });
        }
        this.classroomSub.next(list);
        return list;
    }

    /**
     * Update the classrooms
     *
     * @param classrooms
     */

    // update(classrooms: User): Observable<any> {
    //     return this._httpClient.patch<User>('api/common/classrooms', { classrooms }).pipe(
    //         map((response) => {
    //             this._classrooms.next(response);
    //         })
    //     );
    // }

    update(value, id: string) {
        return this.classroomFirestore.update(value, id);
    }

    updateWithoutMerge(value, id: string) {
        return this.classroomFirestore.updateWithoutMerge(value, id);
    }

    async checkClasroom(studentId, clsId) {
        let room;
        const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
        const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', usr.uid).where('id', '==', studentId);

        const doc = this.teachersService.getWithQuery(query);

        const classPromise = new Promise(async (resolve) => {
            (await doc).pipe(take(1)).subscribe((res) => {
                if (res.length == 0) {
                    room = '';
                }
                else {
                    if (res[0].classroomId == clsId) {
                        room = clsId;
                    }
                    else {
                        room = res[0].classroomId;
                    }
                }
                resolve(room);
            });
        });
        return classPromise;
    }

    getFirstClassroom(studentId) {
        const doc = this.teachersService.getWithId(studentId);
        const studentInfo = new Promise((resolve) => {
            doc.pipe(take(1)).subscribe((res) => {
                resolve(res);
            });
        });
        return studentInfo;
    }

    getRandomGeneratedId() {
        return this.classroomFirestore.getRandomGeneratedId();
    }

    getAllClassroomByInstitute(instituteId: string): Observable<any> {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('institutionId', '==', instituteId);
        return this.classroomFirestore.collection$(query).pipe(take(1),
            tap((classrooms) => {
                this.allClassroomByInstituteSub.next(classrooms || []);
                return this._classrooms.next(classrooms || []);
            }));
    }

    getClassroomByinstitutionID(instId) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('institutionId', '==', instId);
        return this.classroomFirestore.collection$(query).pipe(take(1));
    }

    getSnapshot(query: QueryFn): Observable<any> {
        return this.classroomFirestore.collectionSnapshot(query).pipe(take(1),
            tap(classroom => this._classrooms.next(classroom)));
    }

    getWithQuery(query: QueryFn): Observable<any> {
        return this.classroomFirestore.collection$(query).pipe(take(1),
            tap(classroom => this._classrooms.next(classroom)));
    }

    async getWithQueryOnce(query: QueryFn) {
        return await this.classroomFirestore.collectionSnapshotOnce(query);
    }

    toTrash(docId, classInfo) {
        this.afs.collection('Classrooms').doc('--trash--').collection('DeletedClassrooms').doc(docId).set({ ...classInfo, trashAt: serverTimestamp() });
    }

    delete(docId) {
        return this.classroomFirestore.delete(docId);
    }

    trashCollection() {
        return this.afs.collection('Classrooms').doc('--trash--').collection('DeletedClassrooms').valueChanges();
    }

    deleteInTrash(docId) {
        return this.afs.collection('Classrooms').doc('--trash--').collection('DeletedClassrooms').doc(docId).delete();
    }

    updateClassroomUsingUpdate(docId, value) {
        return this.classroomFirestore.updateUsingUpdate(docId, value);
    }

    updateClassroomSingleField(docId: string, field: string, value: any) {
        return this.classroomFirestore.updateSingleField(field, value, docId);
    }

    async getAllclassroomdocs(updatedProgName, classrooms, pid) {
        const docArr = [];
        classrooms.forEach(async (clas) => {
            const query: QueryFn = (ref: CollectionReference) => ref.where('classroomId', '==', clas);
            const d = await this.classroomFirestore.collectionSnapshot(query);
            docArr.push(d);
        });
        return docArr;
    }

    async removeClassroomFromTeacher(teacherDoc: any, classroomId: string) {
        const teacher = teacherDoc;
        delete teacher.classrooms[classroomId];
        this.teachersService.updateTeacherProgrammeWithoutMerge(teacher.docId, teacher);
    }

    getClassroomsByProgrammeId(programmeId: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where(`programmes.${programmeId}.programmeId`, '==', programmeId);
        return this.classroomFirestore.collection$(query);
    }

    async getDocDataByDocId(docId: string) {
        return this.classroomFirestore.getDocDataByDocId(docId);
    }

    addNewClassroomwithId(classroomValue, id) {
        classroomValue.classroomId = id;
        classroomValue.docId = id;
        this.classroomFirestore.createWithId(classroomValue, id);
        // this.masterService.addNewClassroom(classroomValue)
        return classroomValue;
    }

    async getClassroomIdAndProgrammeIdByInstitutionAndName(
        institutionId: string,
        classroomName: string
    ): Promise<{ classroomId: string, programmeId: string | null } | null> {
        const queryFn: QueryFn = (ref: CollectionReference) =>
            ref.where('institutionId', '==', institutionId)
                .where('classroomName', '==', classroomName);
        let querySnapshot: any;
        try {
            querySnapshot = await firstValueFrom(this.classroomFirestore.collectionSnapshot(queryFn));
        } catch (err) {
            console.error('❌ Firestore query error:', err);
            return null;
        }

        if (Array.isArray(querySnapshot) && querySnapshot.length > 0) {
            const classroomDoc = querySnapshot[0];
            // Extract data and id from AngularFire DocumentChangeAction structure
            const data = classroomDoc.payload.doc.data();
            const classroomId = classroomDoc.payload.doc.id;
            const programmeIds = data?.programmes ? Object.keys(data.programmes) : [];
            const programmeId = programmeIds.length > 0 ? programmeIds[0] : null;
            return { classroomId, programmeId };
        }

        console.warn(`⚠️ No classroom found for institutionId="${institutionId}" and classroomName="${classroomName}".`);
        return null;
    }
}
