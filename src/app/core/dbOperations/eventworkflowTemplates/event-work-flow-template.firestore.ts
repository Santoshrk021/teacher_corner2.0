import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
  providedIn: 'root'
})
export class EventWorkFlowTemplateFirestore extends FirestoreService<any> {

  protected basePath: string = 'EventWorkflowTemplates';

}
