import { AngularFirestore, QueryFn } from '@angular/fire/compat/firestore';
import { Injectable } from '@angular/core';
import { CustomAuthenticationFirestore } from './customAuthentication.firestore';
import { customAuthentication } from './customAuthentication.type';

@Injectable({
    providedIn: 'root'
})
export class CustomAuthenticationService {
    constructor(
        protected afs: AngularFirestore,
        private cunstomAuthenticationFirestore: CustomAuthenticationFirestore,
    ) { }


    get(docId: string) {
        return this.cunstomAuthenticationFirestore.doc$(docId);
    }

    getByIdOnce(studentId: string) {
        return this.cunstomAuthenticationFirestore.getWithGet(studentId);
    }

    getByAccessCodeOnce(accessCode: string) {
        return this.cunstomAuthenticationFirestore.getCollectionQuery('accessCode', accessCode);
    }

    updateUsingUpdate(value: Partial<customAuthentication>, id: string) {
        return this.cunstomAuthenticationFirestore.updateUsingUpdate(id, value);
    }

    getWithQuery(query: QueryFn) {
        return this.cunstomAuthenticationFirestore.collection$(query);
    }

}
