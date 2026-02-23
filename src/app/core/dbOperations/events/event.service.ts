import { Injectable } from '@angular/core';
import { EventFirestoreService } from './event-firestore.service';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { serverTimestamp } from '@angular/fire/firestore';



@Injectable({
    providedIn: 'root'
})

export class EventService {
  eventType;
    constructor(
        private eventFirestoreService: EventFirestoreService,
        private afs: AngularFirestore
    ) {

    }

    currentEvent;
    addEvent(value): Promise<any> {
        return this.eventFirestoreService.create(value);
      }
    updateEvent(value, id): Promise<any> {
        return this.eventFirestoreService.update(value, id);
      }
    getEventByGet(eventWorkflowId) {
       return this.eventFirestoreService.getWithGet(eventWorkflowId);
    }

    getAllEvents() {
      const query: QueryFn = (ref: CollectionReference) => ref.where('docId', 'not-in', ['--schema--', '--trash--']);
      return this.eventFirestoreService.collection$(query);
    }

    addTrashEvent(docId, value): Promise<any> {
      return this.afs.collection('Events').doc('--trash--').collection('DeletedEvents').doc(docId).set(value);
    }
    deleteEvent(docId): Promise<any> {
      return this.eventFirestoreService.delete(docId);
    }

    getSelectedEvent(eventId: string): Observable<any> {
      return this.eventFirestoreService.doc$(eventId);
    }

    getBatchs(batchArr, batchId) {
      const selectedBatchInfo = batchArr.find(batch => batch.batchId == batchId);
      return selectedBatchInfo;
    }

    addNewSubmission(eventId, batchArr) {
      return this.afs.collection('Events').doc(eventId).update({ batches: batchArr, updatedAt: serverTimestamp() });
    }

    addWFIdIntoBatchSubm(batchArr, submId, workflowId) {
      for (let i = 0; i < batchArr.length; i++) {
        const obj = batchArr[i];
        if (obj.submissionId === submId) {
          obj['workflowId'] = workflowId;
          return;
        }
        if (obj.submissions) {
          this.addWFIdIntoBatchSubm(obj.submissions, submId, workflowId);
        }
      }
      return batchArr;
    }

    checkWorkflowId(batchArr, submId) {
      const submData = batchArr?.flatMap(batch => batch?.submissions || [])?.find(subm => subm?.submissionId == submId);
      return submData;
    }

    get(docId: string) {
      return this.eventFirestoreService.doc$(docId);
    }
    getWithGet(docId: string) {
      return this.eventFirestoreService.getWithGet(docId);
    }

}
