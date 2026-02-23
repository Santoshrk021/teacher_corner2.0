import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { serverTimestamp } from 'firebase/firestore';
import { BehaviorSubject, Observable, ReplaySubject, take, tap } from 'rxjs';
import { LearningUnitsFirestore } from './learningUnits.firestore';

@Injectable({
    providedIn: 'root'
})
export class LearningUnitsService {
    private _learningUnits = new ReplaySubject(1);
    currentLearningUnitsName = new BehaviorSubject(null);
    currentLearningUnitinLockinginterface = new BehaviorSubject(null);
    isassociatedContentChanged = new BehaviorSubject(null);
    allLUdataFromcoll = new BehaviorSubject(null);
    languagesSub = new BehaviorSubject<any>(null);
    updatedLUs = new BehaviorSubject<any>(null);
    collectionName = 'LearningUnits';

    /**
     * Constructor
     */
    constructor(
        private afs: AngularFirestore,
        private learningUnitsFirestore: LearningUnitsFirestore,
    ) {
    }

    updateLU(docId, value) {
        return this.learningUnitsFirestore.update(value, docId);
    }

    async addNewLU(luCollObj) {
        return this.afs.collection(this.collectionName).doc(luCollObj.docId).set({ ...luCollObj, creationDate: serverTimestamp(), updatedAt: serverTimestamp() }, { merge: true });
    }

    deleteLU(docId: string) {
        return this.learningUnitsFirestore.delete(docId);
    }

    trashLU(docId: string, luDetails: any) {
        return this.learningUnitsFirestore.trashDocument(luDetails, docId, '--trash--', 'DeletedLearningUnits');
    }

    deleteFromTrashLU(docId: string) {
        return this.learningUnitsFirestore.deleteDocumentFromTrashPermanently(docId, '--trash--', 'DeletedLearningUnits');
    }

    async getTrashLU(luCode: string) {
        return await this.afs.collection(this.collectionName).doc('--trash--').collection('DeletedLearningUnits', ref => ref.where('code', '==', luCode)).get().toPromise().then(doc => doc?.docs || []);
    }

    async getAllTrashLU() {
        return this.learningUnitsFirestore.showAllTrashDocuments('--trash--', 'DeletedLearningUnits');
    }

    async updateLUwithDocId(value, docId) {
        return this.afs.collection(this.collectionName).doc(docId).set(value, { merge: true });
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */

    set learningUnitss(value: User) {
        // Store the value
        this._learningUnits.next(value);
    }

    get learningUnitss$(): Observable<User> {
        this._learningUnits.subscribe((a) => {
        });

        return this._learningUnits.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in learningUnits data
     */
    get(id): Observable<any> {
        return this.learningUnitsFirestore.doc$(id).pipe(take(1),
            tap(learningUnits => this._learningUnits.next(learningUnits)));
    }

    getDocId() {
        return this.learningUnitsFirestore.getRandomGeneratedId();
    }

    async getLearningUnitData(id) {
        return this.learningUnitsFirestore.getDocDataByDocId(id);
    }

    getAllLUFromLUcoll() {
        return this.afs.collection('LearningUnits', ref => ref.where('docId', 'not-in', ['--schema--', '--trash--'])).get();
    }

    getLUbyquery(id) {
        return this.afs.collection('LearningUnits', ref => ref.where('learningUnitId', '==', id)).get();
    }

    getLUByIdOnce(docId: string) {
        return this.learningUnitsFirestore.getWithGet(docId);
    }

    updateSingleField(docId: string, key: string, value: any) {
        return this.learningUnitsFirestore.updateSingleField(key, value, docId);
    }

}
