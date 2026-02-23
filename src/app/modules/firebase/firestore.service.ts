import { Inject, Injectable } from '@angular/core';
import { AngularFirestore, QueryFn } from '@angular/fire/compat/firestore';
import { environment } from 'environments/environment';
import { deleteField, serverTimestamp } from 'firebase/firestore';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable()
export abstract class FirestoreService<T> {
    protected abstract basePath: string;
    uid$: Observable<string>;
    getAllQuery: QueryFn = (ref) => ref.where('docId', 'not-in', ['--archive--', '--schema--', '--trash--']);

    constructor(
        @Inject(AngularFirestore) protected afs: AngularFirestore,
    ) {
    }

    private get collection() {
        return this.afs.collection(`${this.basePath}`);
    }

    getBatchRef() {
        this.afs.firestore.batch();
    }

    queryByField(field: string, value: any) {
        const fieldQuery: QueryFn = (ref) => ref.where(field, '==', value);
        return fieldQuery;
    }

    getRandomDocId() {
        return this.afs.createId();
    }

    async getDocDataByDocId(docId: string) {
        return this.afs.doc(`${this.basePath}/${docId}`).get().toPromise().then(d => d.data());
    }

    getStreamingDocDataByDocId(docId: string) {
        return this.afs.doc(`${this.basePath}/${docId}`).valueChanges();
    }

    getRandomGeneratedId() {
        return this.afs.createId();
    }

    streamCollection(): Observable<T[]> {
        return this.afs.collection<T>(`${this.basePath}`, this.getAllQuery).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    streamCollectionQuery(field: string, value: any): Observable<T[]> {
        return this.afs.collection<T>(`${this.basePath}`, this.queryByField(field, value)).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    /* older method (to be replaced by streamCollection) */
    collection$(queryFn?: QueryFn): Observable<T[]> {
        return this.afs.collection<T>(`${this.basePath}`, queryFn).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    /* older method (to be replaced by streamCollection) */
    collectionSnapshot(queryFn: QueryFn) {
        return this.afs.collection<T>(`${this.basePath}`, queryFn).snapshotChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    streamCollectionDocument(docId: string): Observable<T> {
        return this.afs.doc<T>(`${this.basePath}/${docId}`).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [doc$] ${docId}`);
                    console.log(r);
                    console.groupEnd();
                }
            }),
        );
    }

    getCollection() {
        return this.afs.collection<T>(`${this.basePath}`, this.getAllQuery).get().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Service [${this.basePath}] [collection]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
            map((r) => r.empty ? [] : r.docs.map(d => d.data())),
        );
    }

    getDocumentOnce(docId: string): Observable<T> {
        return this.afs.doc<T>(`${this.basePath}/${docId}`).get().pipe(
            map((r) => r.data() as T),
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [doc$] ${docId}`);
                    console.log(r);
                    console.groupEnd();
                }
            }),
        );
    }

    /* older method (to be replaced by streamCollectionDocument) */
    doc$(docId: string): Observable<T> {
        return this.afs.doc<T>(`${this.basePath}/${docId}`).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [doc$] ${docId}`);
                    console.log(r);
                    console.groupEnd();
                }
            }),
        );
    }

    getCollectionQuery(field: string, value: any) {
        return this.afs.collection<T>(`${this.basePath}`, this.queryByField(field, value)).get().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Service [${this.basePath}] [collection]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
            map((r) => r.empty ? [] : r.docs.map(d => d.data())),
        );
    }

    getCollectionDocument(docId: string) {
        return this.collection.doc(docId).get().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Service [${this.basePath}] [doc] ${docId}`);
                    console.log(r);
                    console.groupEnd();
                }
            }),
            map((r) => r.exists ? r.data() : {}),
        );
    }

    /* older method (to be replaced by getCollectionDocument) */
    collectionSnapshotOnce(queryFn: QueryFn) {
        return this.afs.collection<T>(`${this.basePath}`, queryFn).get().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    async create(value: T) {
        const docId = this.afs.createId();
        const _ = await this.collection.doc(docId).set(Object.assign({}, { docId, createdAt: serverTimestamp() }, value));
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
        return docId;
    }

    /* older method (to be replaced by ) */
    async createWithId(value: T, docId: string) {
        const _ = await this.collection.doc(docId).set(Object.assign({}, { docId, createdAt: serverTimestamp() }, value));
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
        return _;
    }

    async updateWithMerge(docId: string, value: T) {
        const _ = await this.collection.doc(docId).set(Object.assign({}, { docId, updatedAt: serverTimestamp() }, value), { merge: true });
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [update]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
    }

    /* older method (to be replaced by updateWithMerge) */
    async update(value: T, docId: string) {
        const _ = await this.collection.doc(docId).set(Object.assign({}, { docId, updatedAt: serverTimestamp() }, value), { merge: true });
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [update]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
    }

    async updateWithoutMerge(value: T, docId: string) {
        const _ = await this.collection.doc(docId).set(Object.assign({}, { docId, updatedAt: serverTimestamp() }, value));
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [update]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
    }

    async updateUsingUpdate(docId: string, value: T) {
        const _ = await this.collection.doc(docId).update(Object.assign({}, { docId, updatedAt: serverTimestamp() }, value));
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [update]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
    }

    async updateSingleField(key: string, value: T, docId: string) {
        const _ = await this.collection.doc(docId).update({ [key]: value, updatedAt: serverTimestamp() });
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [update]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
    }

    async updateCls(value: T, docId: string) {
        const _ = await this.collection.doc(docId).update(Object.assign({}, { docId, updatedAt: serverTimestamp() }, value));
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
    }

    async updateArrayUnion(value: T, docId: string) {
        const _ = await this.collection.doc(docId).set({ value }, { merge: true });
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [create]`);
            console.log('[docId]', docId, value);
            console.groupEnd();
        }
    }

    async delete(docId: string) {
        const _ = await this.collection.doc(docId).delete();
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [delete]`);
            console.log('[docId]', docId);
            console.groupEnd();
        }
    }

    async deleteSingleField(key: string, docId: string) {
        const _ = await this.collection.doc(docId).update({ [key]: deleteField(), updatedAt: serverTimestamp() });
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [delete]`);
            console.log('[docId]', docId);
            console.groupEnd();
        }
    }

    getQueryWithGet(queryFn?: QueryFn) {
        return this.afs.collection<T>(`${this.basePath}`, queryFn).get();
    }

    getWithGet(docId: string): Observable<any> {
        return this.collection.doc(docId).get();
    }

    streamTrashCollection(trashId: string, trashSubCollectionName: string) {
        return this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    streamTrashCollectionQuery(trashId: string, trashSubCollectionName: string, field: string, value: T) {
        return this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName, this.queryByField(field, value)).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [doc$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    getTrashCollection(trashId: string, trashSubCollectionName: string) {
        return this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).get().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Service [${this.basePath}] [trash] [collection]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
            map((r) => r.empty ? [] : r.docs.map(d => d.data())),
        );
    }

    getTrashCollectionQuery(trashId: string, trashSubCollectionName: string, field: string, value: T) {
        return this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName, this.queryByField(field, value)).get().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Service [${this.basePath}] [trash] [collection]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
            map((r) => r.empty ? [] : r.docs.map(d => d.data())),
        );
    }

    getTrashCollectionDocument(trashId: string, trashSubCollectionName: string, docId: string) {
        return this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).doc(docId).get().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Service [${this.basePath}] [trash] [doc]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
            map((r) => r.exists ? r.data() : {}),
        );
    }

    async createTrashDocument(docId: string, trashId: string, trashSubCollectionName: string, value: T) {
        const _ = this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).doc(docId).set({ ...value, trashedAt: serverTimestamp() });
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [trash] [create]`);
            console.log('[docId]', docId,);
            console.groupEnd();
        };
    }

    async deleteTrashDocument(docId: string, trashId: string, trashSubCollectionName: string) {
        const _ = await this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).doc(docId).delete();
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [trash] [delete]`);
            console.log('[docId]', docId);
            console.groupEnd();
        };
    }

    /* older method (to be replaced by createTrashDocument) */
    trashDocument(document: any, docId: string, trashId: string, trashSubCollectionName: string) {
        this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).doc(docId).set({ ...document, trashAt: serverTimestamp() }).then((_) => {
            if (!environment.production) {
                console.groupCollapsed(`Firestore Service [${this.basePath}] [trashed]`);
                console.log('[docId]', docId);
                console.groupEnd();
            };
        });
    }

    /* older method (to be replaced by streamTrashCollectionQuery) */
    showAllTrashDocuments(trashId: string, trashSubCollectionName: string) {
        return this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [collection$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    /* older method (to be replaced by getTrashCollectionQuery) */
    getTrashDocumentByField(trashId: string, trashSubCollectionName: string, field: string, value: any) {
        return this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName, ref => ref.where(field, '==', value)).valueChanges().pipe(
            tap((r) => {
                if (!environment.production) {
                    console.groupCollapsed(`Firestore Streaming [${this.basePath}] [doc$]`);
                    console.table(r);
                    console.groupEnd();
                }
            }),
        );
    }

    /* older method (to be replaced by deleteTrashDocument) */
    async deleteDocumentFromTrashPermanently(docId: string, trashId: string, trashSubCollectionName: string) {
        const _ = await this.afs.collection(this.basePath).doc(trashId).collection(trashSubCollectionName).doc(docId).delete();
        if (!environment.production) {
            console.groupCollapsed(`Firestore Service [${this.basePath}] [trash deleted]`);
            console.log('[docId]', docId);
            console.groupEnd();
        };
    }

    /**
     * Checks if any key in the object contains dot notation (nested path).
     * Useful for determining whether to use Firestore update() vs set() with merge.
     * @param obj - The object to check for dot-notation keys
     * @returns true if any key contains a dot, false otherwise
     */
    hasDotNotation(obj: Record<string, any>): boolean {
        return Object.keys(obj).some(key => key.includes('.'));
    }

    /**
     * Smart update that handles both dot-notation keys and regular nested objects.
     * Uses update() for dot-notation keys (interprets dots as nested paths).
     * Uses set() with merge for regular nested objects.
     * @param docPath - Full document path (e.g., 'Students/{id}/Submissions/{docId}')
     * @param value - The object containing fields to update
     */
    async updateWithDotNotation(docPath: string, value: Record<string, any>) {
        const docRef = this.afs.doc(docPath);
        if (this.hasDotNotation(value)) {
            const doc = await docRef.ref.get();
            if (doc.exists) {
                return docRef.update(value);
            } else {
                await docRef.set({});
                return docRef.update(value);
            }
        } else {
            return docRef.set(value, { merge: true });
        }
    }

}
