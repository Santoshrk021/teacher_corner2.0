import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";

@Injectable({
    providedIn: 'root'
})

export class VisitListService {

    constructor(private afs: AngularFirestore){}


    getAllVisitsFromDB() {
        return this.afs.collection('Visits', ref => ref.where('docId', 'not-in', ['--schema--', '--trash--'])).get();
      }
    
}