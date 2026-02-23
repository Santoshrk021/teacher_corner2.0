import { Injectable } from '@angular/core';
import { ContestFirestore } from './contest.firestore';
import {
    CollectionReference,
    QueryFn,
    AngularFirestore,
} from '@angular/fire/compat/firestore';
import {
    BehaviorSubject,
    Observable,
    map,
    of,
    switchMap,
    take,
    tap,
    throwError,
} from 'rxjs';
import {
    Category,
    FirstStageSubmType,
    firstStageAllCourses,
} from './contest.types';
import { HttpClient } from '@angular/common/http';
import { arrayUnion, serverTimestamp } from '@angular/fire/firestore';
import { NavigationService } from 'app/core/navigation/navigation.service';

@Injectable({
    providedIn: 'root',
})
export class ContestService {
    private _categories: BehaviorSubject<Category[] | null> = new BehaviorSubject(null);
    private _course: BehaviorSubject<FirstStageSubmType | null> = new BehaviorSubject(null);
    private _courses: BehaviorSubject<FirstStageSubmType[] | null> = new BehaviorSubject(null);
    currentcontestParams: BehaviorSubject<null> = new BehaviorSubject(null);
    currentContest: BehaviorSubject<any> = new BehaviorSubject(null);
    selectedStage: BehaviorSubject<any[] | null> = new BehaviorSubject(null);
    selectedContest: BehaviorSubject<any[] | null> = new BehaviorSubject(null);

    constructor(
        private contestFireStore: ContestFirestore,
        private afs: AngularFirestore,
        private _httpClient: HttpClient,
    ) { }

    get(docId: string) {
        return this.contestFireStore.doc$(docId);
    }

    getDocDataByDocId(docId: string) {
        return this.contestFireStore.getDocDataByDocId(docId);
    }

    getContestsByType(type: 'general' | 'classroomStemClubdependent') {
        return this.contestFireStore.getCollectionQuery('type', type);
    }

    updateContest(value, id): Promise<any> {
        return this.contestFireStore.update(value, id);
    }

    addContest(value): Promise<any> {
        return this.contestFireStore.create(value);
    }

    addContestwithId(value, id): Promise<any> {
        return this.contestFireStore.createWithId(value, id);
    }

    getAllContest() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('docId', 'not-in', ['--schema--', '--trash--']);
        return this.contestFireStore.collection$(query);
    }

    trashContest(docId: string, value: any) {
        return this.contestFireStore.trashDocument(value, docId, '--trash--', 'DeletedContests');
    }

    trashContestSubmissions(contestId: string) {
        const submissionReviewCollection = `Contest_${contestId}`;
        console.log(submissionReviewCollection);
        // return this.contestFireStore.trashDocument(value, docId, '--trash--', 'DeletedContestSubmissions');
    }

    deleteContest(docId: string): Promise<any> {
        return this.contestFireStore.delete(docId);
    }

    getRandomId(): string {
        return this.contestFireStore.getRandomGeneratedId();
    }

    updatewithoutMerge(value, id): Promise<any> {
        return this.contestFireStore.updateWithoutMerge(value, id);
    }

    addNewSubmission(contestId, stagesSubmArr) {
        return this.afs
            .collection('Contests')
            .doc(contestId)
            .update({
                stagesNames: stagesSubmArr,
                updatedAt: serverTimestamp(),
            });
        // this.contestFireStore.update(contestId, submData)
    }

    getCategory(std) {
        let category = 'junior';
        if (std >= 8 && std <= 10) { category = 'senior'; }
        else if (std >= 5 && std <= 7) { category = 'intermediate'; }
        return category;
    }

    /**
     * Getter for categories
     */
    get categories$(): Observable<Category[]> {
        return this._categories.asObservable();
    }

    /**
     * Getter for courses
     */
    get courses$(): Observable<FirstStageSubmType[]> {
        return this._courses.asObservable();
    }

    /**
     * Getter for course
     */
    get course$(): Observable<FirstStageSubmType> {
        return this._course.asObservable();
    }

    /**
     * Get categories
     */
    getCategories(): Observable<Category[]> {
        return this._httpClient
            .get<Category[]>('api/apps/academy/categories')
            .pipe(
                tap((response: any) => {
                    this._categories.next(response);
                })
            );
    }

    /**
     * Get courses
     */
    getContestSubmissions(query: QueryFn, contestCollectionId) {
        return this.afs.collection(contestCollectionId, query).get();
    }

    getStages(stageArr, stageId) {
        const selectedStageInfo = stageArr.find(
            stage => stage.stageId == stageId
        );
        return selectedStageInfo;
    }

    checkWorkflowId(stagesArr, submId) {
        const submData = stagesArr
            ?.flatMap(stage => stage?.submissions || [])
            ?.find(subm => subm?.submissionId == submId);
        return submData;
    }

    addWFIdIntoStageSubm(stagesArr, submId, workflowId) {
        for (let i = 0; i < stagesArr.length; i++) {
            const obj = stagesArr[i];
            if (obj.submissionId === submId) {
                obj['workflowId'] = workflowId;
                return;
            }
            if (obj.submissions) {
                this.addWFIdIntoStageSubm(obj.submissions, submId, workflowId);
            }
        }
        return stagesArr;
    }

    getCourses(): Observable<FirstStageSubmType[]> {
        const allCourses: FirstStageSubmType[] = firstStageAllCourses;
        this._courses.next(allCourses);
        return of(firstStageAllCourses);
    }

    /* *
     *Get Selectted Contest data
     */
    getSelectedContest(docId: string): Observable<any> {
        return this.contestFireStore.doc$(docId);
    }

    /**
     * Get course by id
     */
    getCourseById(id: string): Observable<FirstStageSubmType> {
        return this.getCourses().pipe(
            take(1),
            map((courses: any) => {
                const contents = courses.find(course => course.id == id);
                // Update the course
                this._course.next(contents);
                // Return the course
                return contents;
            }),
            switchMap((course) => {
                if (!course) {
                    return throwError(
                        'Could not found course with id of ' + id + '!'
                    );
                }
                return of(course);
            })
        );
    }

    getAllContests() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('contestTitle', '!=', '');
        return this.contestFireStore.getQueryWithGet(query);
    }

    addSubmissionReviewDoc(contestId: string, studentId: string, reviewData: any) {
        const submissionReviewCollection = `Contest_${contestId}`;
        return this.afs.collection(submissionReviewCollection).doc(studentId).set(Object.assign({}, { docId: studentId, updatedAt: serverTimestamp() }, { reviewData }), { merge: true });
    }

    addSubmissionDoc(contestId: string, studentId: string, data: any) {
        const submissionReviewCollection = `Contest_${contestId}`;
        return this.afs.collection(submissionReviewCollection).doc(studentId).set(Object.assign({}, { docId: studentId, updatedAt: serverTimestamp() }, data), { merge: true });
    }

    getSubmissionReviewDocById(contestId: string, studentId: string) {
        const submissionReviewCollection = `Contest_${contestId}`;
        return this.afs.collection(submissionReviewCollection).doc(studentId).get().pipe(map(doc => doc.data()));
    }

    getStudentByContestAndDocId(docId: string, contestId: string) {
        const collectionName = `Contest_${contestId}`;
        return this.afs
            .collection(collectionName)
            .doc(docId)
            .get()
    }

    updateStudentFieldInContest(docId: string, contestId: string, key: string, value: any) {
        const collectionName = `Contest_${contestId}`;
        return this.afs
            .collection(collectionName)
            .doc(docId)
            .update({ [key]: value });
    }

    getTeacherByCollectionAndDocId(docId: string, contestId: string) {
        const teacherCollection = `Contest_${contestId}/--TeacherAndLinkedInstitute--/Teachers`;
        return this.afs
            .collection(teacherCollection)
            .doc(docId)
            .get()
            .toPromise()
            .then(d => d.data());
    }

    createTeacherInTeacherAndLinkedInstitute(
        teacherDocId: string,
        contestId: string,
        teacherInfo
    ) {
        const teacherCollection = `Contest_${contestId}/--TeacherAndLinkedInstitute--/Teachers`;
        return this.afs
            .collection(teacherCollection)
            .doc(teacherDocId)
            .set(
                Object.assign(
                    {},
                    { docId: teacherDocId, createdAt: serverTimestamp() },
                    teacherInfo
                )
            );
    }

    getInstitutionDoc(instituteId, contestId) {
        const institutionCollection = `Contest_${contestId}/--InstitutionNomination--/Institutions`;
        return this.afs
            .collection(institutionCollection)
            .doc(instituteId)
            .get()
            .toPromise()
            .then(d => d.data());
    }

    setInstitutionDoc(instituteId, contestId, institutionInfo) {
        const institutionCollection = `Contest_${contestId}/--InstitutionNomination--/Institutions`;
        return this.afs
            .collection(institutionCollection)
            .doc(instituteId)
            .set(
                Object.assign(
                    {},
                    { docId: instituteId, createdAt: serverTimestamp() },
                    institutionInfo
                )
            );
    }

    updateInstitutionDoc(instituteId, contestId, institutionInfo) {
        const institutionCollection = `Contest_${contestId}/--InstitutionNomination--/Institutions`;
        return this.afs
            .collection(institutionCollection)
            .doc(instituteId)
            .set(
                Object.assign(
                    {},
                    { docId: instituteId, updatedAt: serverTimestamp() },
                    institutionInfo
                ),
                { merge: true }
            );
    }

    getContestByIdOnce(contestId: string) {
        return this.contestFireStore.getWithGet(contestId);
    }

    getNominatedInstituion(contestDocId: string) {
        return this.afs
            .collection(
                `Contest_${contestDocId}/--InstitutionNomination--/Institutions`
            )
            .get();
    }

    getContestById(docId: string) {
        return this.afs.collection('Contests').doc(docId).get();
    }

    getInstitutionsCreatedAfterDate(contestStartDate: Date) {
        return this.afs
            .collection('Institutions', ref =>
                ref.where('creationDate', '>=', contestStartDate)
            )
            .get();
    }

    async isInstitutionNominated(instituteId: string, contestId: string): Promise<boolean> {
        const institutionCollection = `Contest_${contestId}/--InstitutionNomination--/Institutions`;
        const docRef = this.afs.collection(institutionCollection).doc(instituteId).ref;
        const doc = await docRef.get();
        return doc.exists;
    }

    // added for dialog interface in nomination pannel
    isContestEnd() {
        let endDate = this.selectedStage.value?.['endDate'].seconds;
        const oneDayInSeconds = 24 * 60 * 60;
        endDate += oneDayInSeconds
        const today = Date.now() / 1000;
        if (endDate < today) {
            return true
        }
        return false
    }

    isContestStart() {
        let startDate = this.selectedStage.value?.['startDate'].seconds;
        const oneDayInSeconds = 24 * 60 * 60;
        startDate -= oneDayInSeconds;
        // const start = new Date(startDate * 1000);
        // const adjustedStartDate = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        // console.log('Adjusted Start Date:', adjustedStartDate);
        const today = Date.now() / 1000;
        if (startDate >= today) {
            return true
        }
        return false
    }

    isInBetweenContest() {
        let startDate = this.selectedStage.value?.['startDate'].seconds;
        let endDate = this.selectedStage.value?.['endDate'].seconds;
        const oneDayInSeconds = 24 * 60 * 60;
        startDate -= oneDayInSeconds;
        // endDate += oneDayInSeconds;
        const today = Date.now() / 1000;
        // const endDate2 = new Date(endDate * 1000);
        // // Add 1 day (in ms) to include full end date
        // const adjustedEndDate = new Date(endDate2.getTime() + 24 * 60 * 60 * 1000);

        // const startDate2 = new Date(startDate * 1000);
        // const adjustedStartDate = new Date(startDate2.getTime() + 24 * 60 * 60 * 1000);

        if (startDate <= today && endDate >= today) {
            return true
        }
        return false
    }

    isStage2ContestEnd() {
        let endDate = this.selectedStage.value?.['endDate'].seconds
        const oneDayInSeconds = 24 * 60 * 60;
        endDate += oneDayInSeconds
        const today = Date.now() / 1000;
        if (endDate < today) {
            return true
        }
        return false

    }
}
