import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class ContestSubmissionsService {

  constructor(
    private afs: AngularFirestore,
  ) { }

  getContestSubmissions(studentId, contestId) {
    return this.afs.doc(`Students/${studentId}/Submissions/${studentId}-${contestId}`).get()
  }

  updateInContestSubmission(value, studentId, contestId) {
    return this.afs.doc(`Students/${studentId}/Submissions/${studentId}-${contestId}`).set(value, { merge: true })
  }

  getContestSubmValuChanges(studentId, contestId) {
    return this.afs.doc(`Students/${studentId}/Submissions/${studentId}-${contestId}`).valueChanges()
}
}
