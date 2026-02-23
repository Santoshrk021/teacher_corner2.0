import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { EventWorkFlowTemplateFirestore } from './event-work-flow-template.firestore';

@Injectable({
  providedIn: 'root'
})
export class EventWorkFlowTemplateService {
  contestworkFlowTemplatesSub = new BehaviorSubject<any>(null);

  constructor(private eventTemplateFirestore: EventWorkFlowTemplateFirestore) {

  }
  getWorkFlowTemplates() {
    const query: QueryFn = (ref: CollectionReference) => ref.where('status', '==', 'LIVE').orderBy('createdAt', 'asc');
    return this.eventTemplateFirestore.collection$(query).pipe(
      tap(workflows => this.contestworkFlowTemplatesSub.next(workflows)));
  }
}
