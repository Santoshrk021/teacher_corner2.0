import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { WorkflowsTemplateFirestore } from './workflow-template.firestore';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class WorkflowTemplateService {

  workFlowTemplatesSub = new BehaviorSubject<any>(null);

  constructor(private workflowTemplateFirestore: WorkflowsTemplateFirestore,
     private afs: AngularFirestore) { }
  

  getWorkFlowTemplates() {
    const query: QueryFn = (ref: CollectionReference) => ref.where('status', '==', 'LIVE').orderBy('createdAt', 'asc');
    return this.workflowTemplateFirestore.collection$(query).pipe(
      tap(workflows => this.workFlowTemplatesSub.next(workflows)));
  }

  getWorkFlowTemplateById(workflowId: string) {
    return this.workflowTemplateFirestore.doc$(workflowId);
  }


checkWorkflowTemplateType(docId: string){
  return this.afs.collection('WorkflowTemplates').doc(docId).get().pipe(
    map((docSnapshot) => {
      if (docSnapshot.exists) {
        const data: any = docSnapshot.data();
        return data.templateType;
      } else {
        console.warn(`No document found for ID: ${docId}`);
        return undefined;
      }
    })
  );
}


}