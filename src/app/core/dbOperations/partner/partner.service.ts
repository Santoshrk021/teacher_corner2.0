import { Injectable } from '@angular/core';
import { partnerFirestore } from './partner.firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { serverTimestamp } from '@angular/fire/firestore';
@Injectable({
  providedIn: 'root'
})
export class PartnerService {

  constructor(
    private afs: AngularFirestore,
    private partnerFirestore: partnerFirestore
  ) {
  }

  getAllPartners(query){

    return this.partnerFirestore.getQueryWithGet(query);
  }

  getPartnerDataById(partnerId: string) {
    return this.partnerFirestore.getDocDataByDocId(partnerId);
}

async saveinPartnerColl(data,docId) {
  this.partnerFirestore.createWithId(data,docId);
    this.afs.collection('Partners').doc(data.docId).set(data, { merge: true });
}

toTrash(docId, partnerDetails) {
    this.afs.collection('Partners').doc('--trash--').collection('DeletedPartners').doc(docId).set({ ...partnerDetails, trashAt: serverTimestamp() });
}

trashCollection() {
    return this.afs.collection('Partners').doc('--trash--').collection('DeletedPartners').valueChanges();
}

deleteInTrash(docId) {
    return this.afs.collection('Partners').doc('--trash--').collection('DeletedPartners').doc(docId).delete();
}

createWithId(value, id): Promise<any> {
    return this.partnerFirestore.createWithId(value, id);
}

delete(docId) {
    return this.afs.collection('Partners').doc(docId).delete();
}
}
