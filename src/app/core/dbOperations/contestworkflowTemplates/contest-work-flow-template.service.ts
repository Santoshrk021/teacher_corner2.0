import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { ContestWorkFlowTemplateFirestore } from './contest-work-flow-template.firestore';

@Injectable({
  providedIn: 'root'
})
export class ContestWorkFlowTemplateService {
  contestworkFlowTemplatesSub = new BehaviorSubject<any>(null);

  constructor(private contestTemplateFirestore: ContestWorkFlowTemplateFirestore) {

  }
  getWorkFlowTemplates() {
    const query: QueryFn = (ref: CollectionReference) => ref.where('status', '==', 'LIVE').orderBy('createdAt', 'asc');
    return this.contestTemplateFirestore.collection$(query).pipe(
      tap(workflows => this.contestworkFlowTemplatesSub.next(workflows)));
  }
}
