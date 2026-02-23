import { Injectable } from '@angular/core';
import { VendorFirestore } from './vendor.firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { serverTimestamp } from '@angular/fire/firestore';
@Injectable({
  providedIn: 'root'
})
export class VendorService {


  constructor(
    private afs: AngularFirestore,
    private vendorFirestore: VendorFirestore
  ) {
  }

  getAllPartners(query){

    return this.vendorFirestore.getQueryWithGet(query);
  }

  getVendorDataById(partnerId: string) {
    return this.vendorFirestore.getDocDataByDocId(partnerId);
}

async saveinVendorColl(data) {
    this.afs.collection('Vendors').doc(data.docId).set(data, { merge: true });
}

toTrash(docId, partnerDetails) {
    this.afs.collection('Vendors').doc('--trash--').collection('DeletedVendors').doc(docId).set({ ...partnerDetails, trashAt: serverTimestamp() });
}

trashCollection() {
    return this.afs.collection('Vendors').doc('--trash--').collection('DeletedVendors').valueChanges();
}

deleteInTrash(docId) {
    return this.afs.collection('Vendors').doc('--trash--').collection('DeletedVendors').doc(docId).delete();
}

createWithId(value, id): Promise<any> {
    return this.vendorFirestore.createWithId(value, id);
}

delete(docId) {
    return this.vendorFirestore.delete(docId);
}

deleteComponentById(docId, partnerDetails) {
    this.afs.collection('Vendors').doc('--trash--').collection('DeletedVendors').doc(docId).set({ ...partnerDetails, trashAt: serverTimestamp() });
}

deleteComponent(docId) {
    return this.afs.collection('Vendors').doc(docId).delete();
    
}

}
