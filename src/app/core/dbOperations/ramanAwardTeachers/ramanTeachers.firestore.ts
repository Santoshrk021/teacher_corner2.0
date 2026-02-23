import { Injectable } from '@angular/core';
import { AngularFirestore, QueryFn } from '@angular/fire/compat/firestore';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { environment } from 'environments/environment';
import { serverTimestamp } from 'firebase/firestore';
import { Observable, map, tap } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class RamanTeacherFirestore {
    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'RamanAward2024/--TeacherAndLinkedInstitute--/Teachers';
    constructor(
        private RaAfs: AngularFirestore
    ) { }
    async getDocDataByDocId(docId: string) {
        return this.RaAfs.doc(`${this.basePath}/${docId}`).get().toPromise().then(d => d.data());
    }
    getRandomGeneratedId() {
        return this.RaAfs.createId();
    }
    doc$(docId: string): Observable<any> {


        return this.RaAfs.doc<any>(`${this.basePath}/${docId}`).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [doc$] ${docId}`);
                    console.log(r);
                    console.groupEnd();
                }
            }),
        );
    }

    collection$(queryFn?: QueryFn): Observable<any[]> {

        return this.RaAfs.collection<any>(`${this.basePath}`, queryFn).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    collectionSnapshot(queryFn: QueryFn) {
        return this.RaAfs.collection<any>(`${this.basePath}`, queryFn).snapshotChanges().pipe(
            tap((r) => {

                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    create(value: any) {
        const docId = this.RaAfs.createId();
        return this.collection.doc(docId).set(Object.assign({}, { docId, createdAt: serverTimestamp() }, value)).then((_) => {
            if (!environment.production) {
                console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
                console.log('[docId]', docId, value);
                console.groupEnd();
            }
            return _;
        });
    }
    createWithId(value: any, docId) {
        return this.collection.doc(docId).set(Object.assign({}, { docId, createdAt: serverTimestamp() }, value)).then((_) => {
            if (!environment.production) {
                console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
                console.log('[docId]', docId, value);
                console.groupEnd();
            }
            return _;
        });
    }
    addClassroom(value: any, docId) {
        return this.collection.doc(docId).set(Object.assign({}, { docId, createdAt: serverTimestamp() }, value)).then((_) => {
            if (!environment.production) {
                console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
                console.log('[docId]', docId, value);
                console.groupEnd();
            }
            return _;
        });
    }
    update(value: any, docId: string) {
        return this.collection.doc(docId).set(Object.assign({}, { docId, updatedAt: serverTimestamp() }, value,), { merge: true }).then((_) => {
            if (!environment.production) {
                console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
                console.log('[docId]', docId, value);
                console.groupEnd();
            }
        });
    }
    updateArrayUnion(value: any, docId: string) {
        return this.collection.doc(docId).set({ value }, { merge: true }).then((_) => {
            if (!environment.production) {
                console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
                console.log('[docId]', docId, value);
                console.groupEnd();
            }
        });
    }

    delete(docId: string) {
        return this.collection.doc(docId).delete().then((_) => {
            if (!environment.production) {
                console.groupCollapsed(`Firestore Service [${this.basePath}] [delete]`);
                console.log('[docId]', docId);
                console.groupEnd();
            }
        });
    }

    getBatchRef() {
        this.RaAfs.firestore.batch();
    }
    private get collection() {
        return this.RaAfs.collection(`${this.basePath}`);
    }
    collectionData() {
        return this.RaAfs.collection(`${this.basePath}`);
    }
    getDocuments(idArr, type) {
        // return this.collection.
    }
    getWithdocId(docId){
        return this.RaAfs.collection('RamanAward2024/--TeacherAndLinkedInstitute--/Teachers').doc(docId).get();
    }

}
