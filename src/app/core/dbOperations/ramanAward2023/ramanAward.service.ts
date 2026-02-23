import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import {
    AngularFirestore,
    CollectionReference,
    QueryFn,
} from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import {
    BehaviorSubject,
    first,
    Observable,
    pipe,
    ReplaySubject,
    take,
    tap,
} from 'rxjs';
import { RamanFirestore } from './ramanAward.firestore';
import { RamanFirestore2023 } from './ramanAward2023.firestore';

@Injectable({
    providedIn: 'root',
})
export class RamanAwardService {
    private _students: ReplaySubject<User> = new ReplaySubject<User>(1);
    currentStudent = new BehaviorSubject(null);
    currentStudentId = new BehaviorSubject(null);
    contestDetails: any;
    // authUser: aUser.User
    /**
     * Constructor
     */
    constructor(
        private ramanFirestore: RamanFirestore,
        public afAuth: AngularFireAuth,
        private afs: AngularFirestore,
        private ramanFirestore2023: RamanFirestore2023
    ) {}
    async getDocWithQuery(query: QueryFn): Promise<Observable<any>> {
        return this.ramanFirestore.collection$(query).pipe(
            take(1),
            tap(teacher => teacher)
        );
    }

    getWithQuery(query: QueryFn, coll?) {
        if (coll == 'RamanAward2024') {
            coll = 'RamanAward2024';
            return this.ramanFirestore.collection$(query).pipe(take(1));
        } else {
            coll = 'RamanAward2023';
            return this.ramanFirestore2023.collection$(query).pipe(take(1));
        }
    }

    getQueryWithGet(query: QueryFn) {
        return this.ramanFirestore.getQueryWithGet(query);
    }

    create(value): Promise<any> {
        return this.ramanFirestore.create(value);
    }

    createWithId(value, id): Promise<any> {
        return this.ramanFirestore.createWithId(value, id);
    }

    getWithId(id, coll) {
        if (coll == 'RamanAward2024') {
            coll = 'RamanAward2024';
            return this.ramanFirestore.doc$(id).pipe(
                take(1),
                tap(student => this.currentStudent.next(student))
            );
        } else {
            coll = 'RamanAward2023';
            return this.ramanFirestore2023.doc$(id).pipe(
                take(1),
                tap(student => this.currentStudent.next(student))
            );
        }
    }

    updateDoc(value, docId, coll) {
        if (coll == 'RamanAward2024') {
            return this.ramanFirestore.update(value, docId);
        } else {
            return this.ramanFirestore2023.update(value, docId);
        }
    }

    delete(docId) {
        return this.ramanFirestore.delete(docId);
    }

    updateWidthoutMerge(docId, value, coll) {
        if (coll == 'RamanAward2024') {
            coll = 'RamanAward2024';
            return this.ramanFirestore.updateWithoutMerge(value, docId);
        } else {
            coll = 'RamanAward2023';
            return this.ramanFirestore2023.updateWithoutMerge(value, docId);
        }
    }
    getAllInstitutionsDoc() {
        return this.afs
            .collection('RamanAward2024/--InstitutionNomination--/Institutions')
            .get();
    }
    getInstitutionDoc(institutionId: string, ramancontest) {
        return this.afs.collection(ramancontest).doc(institutionId).get();
    }
    setInstitutionDoc(institutionId: string, value, ramancontest) {
        return this.afs
            .collection(ramancontest)
            .doc(institutionId)
            .set(value, { merge: true });
    }

    // getContestDoc() {
    //     return this.afs.collection(`Contest_${this.contestDetails.docId}/--InstitutionNomination--/Institutions`).get();

    // }

    //   getContestDoc() {
    //     const path = `Contest_BzlICVr2n7CCAPxMSjvv/--InstitutionNomination--/Institutions`;
    //     return this.afs
    //       .collection(path)
    //       .get()
    //       .toPromise()
    //       .then((snapshot) => {
    //         if (!snapshot.empty) {
    //           return snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as object) }));
    //         } else {
    //           console.warn('No documents found at the specified path:', path);
    //           return [];
    //         }
    //       })
    //       .catch((error) => {
    //         console.error('Error fetching documents:', error);
    //         throw error;
    //       });
    //   }


}
