import { Injectable } from '@angular/core';
import { getFirestore, Firestore, collection, getDocs } from 'firebase/firestore';
import { visitFirebaseService } from './visit-firestore.service';
import { map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VisitServiceService {

  db=null;
  visitsCollection: any;

  constructor(private visitService: visitFirebaseService) {

    this.db = getFirestore(this.visitService.getActiveFirebaseApp());
    this.visitsCollection = collection(this.db, 'Visits');

   }

   getVisits(){
    return this.visitsCollection;

   }

   getVisitsWithIds(): Observable<any[]> {
    return this.visitsCollection.get().toPromise().then(querySnapshot => querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  }

  async getAllVisits(): Promise<any[]> {
    const visitsCollection = collection(this.db, 'Visits');
    const snapshot = await getDocs(visitsCollection);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getAllVisitsfrommaster() {
    const visitsCollection = collection(this.db, 'Master');
    const snapshot = await getDocs(visitsCollection);

     const s=snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const visitdocs=s.filter((item: any) => item?.type == 'VISITS');
    return visitdocs;

  }
}
