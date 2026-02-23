import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore, CollectionReference, DocumentChangeAction, QueryFn } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { BehaviorSubject, first, Observable, pipe, ReplaySubject, take, tap } from 'rxjs';
import { InstitutionsFirestore } from './institutions.firestore';
import { serverTimestamp } from 'firebase/firestore';

@Injectable({
    providedIn: 'root'
})
export class InstitutionsService {
    private _institutions: ReplaySubject<User> = new ReplaySubject<User>(1);
    currentInstitution = new ReplaySubject<User>(1);
    currentInstitutionId = new BehaviorSubject(null);
    storedIntitute = new BehaviorSubject(null);
    currentInstitutionName = new BehaviorSubject(null);
    selectedInstitution = new BehaviorSubject(null);
    currentSelectedBoard = new BehaviorSubject(null);

    currentboarddata$ = this.currentSelectedBoard.asObservable();


    // authUser: aUser.User

    /**
     * Constructor
     */
    constructor(
        private institutionFirestore: InstitutionsFirestore,
        public afAuth: AngularFireAuth,
        private afs: AngularFirestore,
    ) {
    }

    getInstituteWiseClassroom(teacherData) {

    }

    async getDocDataByDocId(docId: string) {
        return this.institutionFirestore.getDocDataByDocId(docId);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set institutions(value: User) {
        // Store the value
        this._institutions.next(value);
    }

    get institutions$(): Observable<User> {
        // this._institutions.subscribe(a => {
        //     console.log(a);
        // })

        return this._institutions.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in institutions data
     */
    async get(): Promise<Observable<any>> {
        const usr: any = await this.afAuth.authState.pipe(first()).toPromise();

        const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', usr.uid);
        // const query: QueryFn = (ref: CollectionReference) => ref.where('uid', '==', 'fqawdKwpdTeUbyE5HJYPRroCypz2')

        return this.institutionFirestore.collection$(query).pipe(take(1),
            tap(institutions => this._institutions.next(institutions)));
    }

    create(value): Promise<any> {
        return this.institutionFirestore.create(value);
    }

    createWithId(value, id): Promise<any> {
        return this.institutionFirestore.createWithId(value, id);
    }

    getWithId(id) {
        return this.institutionFirestore.doc$(id).pipe(take(1),
            tap(institution => this.currentInstitution.next(institution)));
    }

    generateRandomDocId() {
        return this.institutionFirestore.getRandomGeneratedId();
    }

    getWithIdWithGetMethod(id) {
        return this.institutionFirestore.getWithGet(id);
    }

    getClassroomLists(id) {
        return this.institutionFirestore.doc$(id).pipe(take(1));
    }

    getSnapshot(query: QueryFn): Observable<any> {
        return this.institutionFirestore.collectionSnapshot(query).pipe(/* take(1), */
            tap(institution => this._institutions.next(institution)));
    }

    getWithQuery(query: QueryFn): Observable<any> {
        return this.institutionFirestore.collection$(query).pipe(take(1));
    }

    bulkUploadCsv(csvDataArr = [], boardName) {
        for (const d of csvDataArr) {
            const id = this.institutionFirestore.getRandomGeneratedId();
            const obj = {
                docId: id,
                createdAt: serverTimestamp(),
                medium: d['Institute Name'] || '',
                board: boardName,
                institutionName: d['Institute Name'] || '',
                institutionAddress: {
                    street1: d['Street Name'] || '',
                    city: d['Locality Name'] || '',
                    state: d['State Name'] || '',
                    district: d['District Name'] || '',
                    pincode: d['Institute Pincode'] || 0,
                },
                representativeFirstName: d['Contact Person First Name'] || '',
                representativeLastName: d['Contact Person Last Name'] || '',
                representativeEmail: d['Contact Person Email'] || '',
                representativePhone: d['Contact Person Number'] || '',
                registrationNumber: d['Institute Affiliation Number'] || '',
                creationDate: serverTimestamp(),
                institutionId: id,

                // genderType: '',
                // institutionCreatorFirstName: d.institutionCreatorFirstName,
                // institutionCreatorLastName: d.institutionCreatorLastName,
                // institutionCreatorEmail: d.institutionCreatorEmail,
                // institutiontype: d.institutiontype,
            };
        }
    }

    update(value, id: string) {
        return this.institutionFirestore.update(value, id);
    }

    getRandomGeneratedId() {
        return this.institutionFirestore.getRandomGeneratedId();
    }

    getClassroomDataById(instituteId: string) {
        return this.institutionFirestore.getDocDataByDocId(instituteId);
    }

    /**
     * Update the institutions
     *
     * @param institutions
     */
    // update(institutions: User): Observable<any> {
    //     return this._httpClient.patch<User>('api/common/institutions', { institutions }).pipe(
    //         map((response) => {
    //             this._institutions.next(response);
    //         })
    //     );
    // }

    getAllInstitutions() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('docId', 'not-in', ['--schema--', '--trash--']);
        return this.institutionFirestore.collection$(query);
    }

    toTrash(docId, instituteDetails) {
        this.afs.collection('Institutions').doc('--trash--').collection('DeletedInstitutes').doc(docId).set({ ...instituteDetails, trashAt: serverTimestamp() });
    }

    trashCollection() {
        return this.afs.collection('Institutions').doc('--trash--').collection('DeletedInstitutes').valueChanges();
    }

    deleteInTrash(docId) {
        return this.afs.collection('Institutions').doc('--trash--').collection('DeletedInstitutes').doc(docId).delete();
    }

    delete(docId) {
        return this.institutionFirestore.delete(docId);
    }

    getAllInstitutionupdated() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('docId', 'not-in', ['--schema--', '--trash--']);
        return this.institutionFirestore.collection$(query);
    }

    getInstitutionByIdOnce(docId: string) {
        return this.institutionFirestore.getWithGet(docId);
    }

    updateInstitutionField(docId: string, field: string, value: any) {
        return this.institutionFirestore.updateSingleField(field, value, docId);
    }

    getInstitutionByInstitutionCode(institutionCode: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('institutionCode', '==', institutionCode);
        return this.institutionFirestore.collectionSnapshotOnce(query);
    }

    updateboardData(value: string) {
        this.currentSelectedBoard.next(value);
    }

}
