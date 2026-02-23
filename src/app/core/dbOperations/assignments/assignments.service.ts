import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { BehaviorSubject, first, lastValueFrom, map, Observable, of, pipe, ReplaySubject, take, tap, timer } from 'rxjs';
import { AssignmentsFirestore } from './assignments.firestore';
import { serverTimestamp } from '@angular/fire/firestore';

@Injectable({
    providedIn: 'root'
})
export class AssignmentsService {
    private _assignments: ReplaySubject<User> = new ReplaySubject<User>(1);
    currentassignment = new ReplaySubject<User>(1);
    currentassignmentId = new BehaviorSubject(null);
    getAllLiveAssignmentsSub = new BehaviorSubject(null);
    assignmentList = new BehaviorSubject(null);
    assignmentsSub = new BehaviorSubject(null);
    allAssignmentSelectedClassroomSub = new BehaviorSubject(null);
    allAssignmentSel = new BehaviorSubject(null);
    isAssignmentTab = new BehaviorSubject(false);

    existingAssignment: any;

    // authUser: aUser.User
    /**
     * Constructor
     */
    constructor(
        private assignmentFirestore: AssignmentsFirestore,
        public afAuth: AngularFireAuth,
        protected afs: AngularFirestore,
        private http: HttpClient,
    ) {
    }

    getAllLiveAssignments() {
        const query: QueryFn = (ref: CollectionReference) => ref.where('status', '==', 'LIVE');
        return this.assignmentFirestore.collection$(query).pipe(take(1), map((assignments: any) => assignments.map(d => ({ displayName: d.displayName, docId: d.docId, type: d.type }))),
            tap(assignments => this.getAllLiveAssignmentsSub.next(assignments)));
        // return this.assignmentFirestore.collection$(query).pipe(map((assignments: any) => assignments.map(d => ({ displayName: d.displayName, docId: d.docId, type: d.type }))))
    }

    async getAssignmentNameWithType(assignmentIdsArr, type) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('docId', 'in', assignmentIdsArr)
                .where('type', '==', type);
        return this.assignmentFirestore.collection$(query);/*.pipe(take(1) ,
            map(async (assignments: any) => {
                if (assignments.length) {
                    console.log(await assignments);

                    return await assignments.map(async d => await d.displayName)
                }
                else return false
            }) )*/
    }
    subscriptionArr = [];

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set assignments(value: User) {
        // Store the value
        this._assignments.next(value);
    }

    get assignments$(): Observable<User> {
        // this._assignments.subscribe(a => {
        //     console.log(a);
        // })

        return this._assignments.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in assignments data
     */
    async get(): Promise<Observable<any>> {
        const usr: any = await this.afAuth.authState.pipe(first()).toPromise();
        const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', usr.uid);
        // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', 'fqawdKwpdTeUbyE5HJYPRroCypz2')

        return this.assignmentFirestore.collection$(query).pipe(take(1),
            tap(assignments => this._assignments.next(assignments)));
    }

    getResources(id, studentObj) {
        return this.afs.doc(`Students/${id}/Submissions/${studentObj.classroomId}-${studentObj.programmeId}`).get();
    }

    create(value): Promise<any> {
        return this.assignmentFirestore.create(value);
    }

    createWithId(value, id): Promise<any> {
        return this.assignmentFirestore.createWithId(value, id);
    }

    update(value, id): Promise<any> {
        return this.assignmentFirestore.update(value, id);
    }

    delete(id: string) {
        return this.assignmentFirestore.delete(id);
    }

    updateInSubmission(value: any, studentId: string, classroomId: string, programmeId: string) {
        return this.assignmentFirestore.updateWithDotNotation(
            `Students/${studentId}/Submissions/${classroomId}-${programmeId}`,
            value
        );
    }

    getWithId(id) {
        return this.assignmentFirestore.doc$(id).pipe(take(1),
            tap(assignment => this.currentassignment.next(assignment)));
    }

    getAssignmentByIdOnce(id) {
        return this.assignmentFirestore.getWithGet(id);
    }

    getClassroomLists(id) {
        return this.assignmentFirestore.doc$(id).pipe(take(1));
    }

    getAssignments(tacCode, version) {
        const today = Math.floor(Date.now() / 1000);

        const query: QueryFn = (ref: CollectionReference) => ref
            .where('DripDate._seconds', '<=', today)
            .where('TAC_Code', '==', tacCode)
            .where('Version', '==', version)
            .orderBy('DripDate._seconds', 'desc');

        return this.assignmentFirestore.collection$(query).pipe(take(1));
    }

    /**
     * Update the assignments
     *
     * @param assignments
     */
    // update(assignments: User): Observable<any> {
    //     return this._httpClient.patch<User>('api/common/assignments', { assignments }).pipe(
    //         map((response) => {
    //             this._assignments.next(response);
    //         })
    //     );
    // }

    getRandomGeneratedId() {
        return this.assignmentFirestore.getRandomGeneratedId();
    }

    getAllQuiz() {
        const query: QueryFn = (ref: CollectionReference) => ref.where('type', '==', 'QUIZ');
        return this.assignmentFirestore.collection$(query);
    }

    getAllAssignments() {
        const query: QueryFn = (ref: CollectionReference) => ref.where('docId', 'not-in', ['---quizzer_schema---', '--default_assignments--']);
        return this.assignmentFirestore.collection$(query);
    }

    getTeachersResources(TeacherObj) {
        return this.afs.doc(`Teachers/${TeacherObj.docId}/submissions/${TeacherObj.classroomId}-${TeacherObj.programmeId}`).get();
    }

    updateTeachersSubmission(value, TeachersObj) {
        return this.afs.doc(`Teachers/${TeachersObj.docId}/submissions/${TeachersObj.classroomId}-${TeachersObj.programmeId}`).set(value, { merge: true });
    }

    updateRemoteStudentsSubmission(value, StudentsObj) {
        return this.afs.doc(`Students/${StudentsObj.docId}/remoteSubmissions/${StudentsObj.classroomId}-${StudentsObj.programmeId}`).set(value, { merge: true });
    }

    private bytesOf(obj: any): number {
        try { return new TextEncoder().encode(JSON.stringify(obj)).length; }
        catch { return 0; }
    }

    async saveSubmissionFullPayload({
        rootCollection,
        ownerId,
        summarySubcollection,
        summaryDocId,
        finalAttemptPayload,
        meta,
        summaryExtras = {},
        maxAttempts,
    }: {
        rootCollection: string;
        ownerId: string;
        summarySubcollection: string;
        summaryDocId: string;
        finalAttemptPayload: any;
        meta: { clientIp: string; submissionTime: Date };
        summaryExtras?: Record<string, any>;
        maxAttempts?: number;
    }): Promise<{ attemptId: string; attemptNumber: number }> {

        const summaryRef = this.afs
            .collection(rootCollection).doc(ownerId)
            .collection(summarySubcollection).doc(summaryDocId);

        return this.afs.firestore.runTransaction(async tx => {
            const snap = await tx.get(summaryRef.ref);
            const prevCount = (snap.exists ? (snap.data()?.attemptsCount ?? 0) : 0) as number;

            if (typeof maxAttempts === 'number' && prevCount >= maxAttempts) {
                throw new Error('MAX_ATTEMPTS_REACHED');
            }

            const attemptNo = prevCount + 1;
            const attemptId = `attempt${attemptNo}`;

            // --------- Build SMALL snapshot (always safe) ----------
            const score =
                finalAttemptPayload?.studentScore ??
                finalAttemptPayload?.marksObj?.studentScore ??
                null;

            const maxScore =
                finalAttemptPayload?.maxScore ??
                finalAttemptPayload?.marksObj?.maxScore ??
                null;

            const pct =
                (typeof score === 'number' && typeof maxScore === 'number' && maxScore > 0)
                    ? Math.round((score / maxScore) * 100)
                    : null;

            const latestAttemptSnapshot = {
                attemptId,
                attemptNumber: attemptNo,
                lastAttemptTime: serverTimestamp(),
                score,
                maxScore,
                percentage: pct,

                quizId: summaryExtras?.quizId ?? finalAttemptPayload?.id ?? null,
                workflowId: summaryExtras?.workflowId ?? null,
                classroomId: summaryExtras?.classroomId ?? null,
                displayName: summaryExtras?.displayName ?? finalAttemptPayload?.displayName ?? null,
                totalQuestions: summaryExtras?.totalQuestions ?? finalAttemptPayload?.totalQuestions ?? null,
            };

            // --------- Try FULL latestAttempt if small ----------
            // IMPORTANT: Avoid including heavy questions in summary.
            // We'll try full attempt but strip questions to reduce size risk.
            // If you *really* want including questions too, remove destructuring,
            // but it will fail often for large quizzes.
            const { questions, ...attemptPayloadWithoutQuestions } = (finalAttemptPayload || {});

            const fullLatestAttemptCandidate = {
                attemptId,
                attemptNumber: attemptNo,
                lastAttemptTime: serverTimestamp(),
                ...attemptPayloadWithoutQuestions,
            };

            // Choose a conservative limit for embedding into summary doc
            // (summary doc has other fields + overhead; keep headroom under 1MB).
            const EMBED_LIMIT_BYTES = 200_000;

            const latestAttemptToStore =
                this.bytesOf(fullLatestAttemptCandidate) <= EMBED_LIMIT_BYTES
                    ? fullLatestAttemptCandidate          // ✅ store "full" (minus questions)
                    : latestAttemptSnapshot;              // ✅ fallback snapshot

            // 1) Summary doc
            const summaryData = {
                ...summaryExtras,
                attemptsCount: attemptNo,
                latestAttemptId: attemptId,
                latestAttempt: latestAttemptToStore,
                lastAttemptTime: serverTimestamp(),
            };

            tx.set(summaryRef.ref, summaryData, { merge: true });

            // 2) Attempts subcollection doc (auto-split if needed)
            const attemptRef = summaryRef.collection('attempts').doc(attemptId);

            const attemptData = {
                attemptId,
                attemptNumber: attemptNo,
                lastAttemptTime: serverTimestamp(),
                ...finalAttemptPayload,
            };

            if (this.bytesOf(attemptData) > 900_000) {
                const { questions: qArr, ...rest } = attemptData;
                tx.set(attemptRef.ref, rest, { merge: true });

                const parts: any[] = [];
                let buf: any[] = [];
                let bufSize = this.bytesOf([]);
                for (const q of (qArr || [])) {
                    const qSize = this.bytesOf(q);
                    if (bufSize + qSize > 200_000 && buf.length) {
                        parts.push(buf);
                        buf = [];
                        bufSize = this.bytesOf([]);
                    }
                    buf.push(q);
                    bufSize += qSize;
                }
                if (buf.length) parts.push(buf);

                parts.forEach((chunk, idx) => {
                    const partRef = attemptRef.collection('parts').doc(String(idx));
                    tx.set(partRef.ref, { index: idx, questions: chunk });
                });
            } else {
                tx.set(attemptRef.ref, attemptData, { merge: true });
            }

            // 3) Meta doc
            const metaRef = summaryRef.collection('submissionMeta').doc();
            tx.set(metaRef.ref, {
                clientIp: meta.clientIp ?? '',
                submissionTime: meta.submissionTime ?? new Date(),
                createdAt: serverTimestamp(),
                attemptId,
            });

            return { attemptId, attemptNumber: attemptNo };
        });
    }



    /**
     * Read attemptsCount from the summary doc
     */
    async getAttemptsCountFor({
        rootCollection,
        ownerId,
        summarySubcollection,
        summaryDocId,
    }: {
        rootCollection: string;
        ownerId: string;
        summarySubcollection: string;
        summaryDocId: string;
    }): Promise<number> {
        const ref = this.afs
            .collection(rootCollection).doc(ownerId)
            .collection(summarySubcollection).doc(summaryDocId);

        const snap = await ref.get().toPromise();
        return snap?.exists ? (snap.data() as any)?.attemptsCount ?? 0 : 0;
    }

    updateEventSubmission(eventId, teacherId, value) {
        return this.afs.doc(`Teachers/${teacherId}/submissions/${teacherId}-${eventId}`).set(value, { merge: true });
    }

    getEventSubmission(eventId, teacherId) {
        return this.afs.doc(`Teachers/${teacherId}/submissions/${teacherId}-${eventId}`).get();
    }

    trashCollection() {
        return this.afs.collection('Assignments').doc('--trash--').collection('DeletedAssignments').valueChanges();
    }

    deleteInTrash(docId) {
        return this.afs.collection('Assignments').doc('--trash--').collection('DeletedAssignments').doc(docId).delete();
    }

    toTrash(docId, classInfo) {
        this.afs.collection('Assignments').doc('--trash--').collection('DeletedAssignments').doc(docId).set({ ...classInfo, trashAt: serverTimestamp() });
    }

    updateInContestSubmission(value: any, studentId: string, contestId: string) {
        return this.afs.doc(`Students/${studentId}/Submissions/${studentId}-${contestId}`).set(value, { merge: true });
    }

    updateKeyInContestSubmission(key: string, value: any, studentId: string, contestId: string) {
        return this.afs.doc(`Students/${studentId}/Submissions/${studentId}-${contestId}`).update({ [key]: value });
    }

    getContestSubmissions(studentId, contestId) {
        return this.afs.doc(`Students/${studentId}/Submissions/${studentId}-${contestId}`).get();
    }

}
