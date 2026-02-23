import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class WorkflowCompletionService {
    constructor(protected afs: AngularFirestore) { }

    unlockedSteps = new BehaviorSubject(null);
    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    getAllResources(teacherId) {
        return this.afs.collection(`Teachers/${teacherId}/Completion`).get();
    }

    getTeacherCompletionById(teacherId: string, learningUnitId: string) {
        return this.afs.doc(`Teachers/${teacherId}/Completion/${learningUnitId}`).get();
    }

    getStudentCompletionById(studentId: string, learningUnitId: string) {
        return this.afs.doc(`Students/${studentId}/Completion/${learningUnitId}`).get();
    }

    update(value, completionObj) {
        return this.afs
            .doc(
                `Teachers/${completionObj.teacherId}/Completion/${completionObj.learningunitId}`
            )
            .set(value, { merge: true });
    }

    getResourceById(completionObj) {
        return this.afs.doc(`Teachers/${completionObj.teacherId}/Completion/${completionObj.learningunitId}`).get();
    }

    getResourceByIdStudent(completionObj) {
        return this.afs.doc(`Students/${completionObj.studentId}/Completion/${completionObj.learningunitId}`).get();
    }

}
