import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root',
})
export class WorkflowCompletionFirestoreService extends FirestoreService<any> {
    protected basePath: string = 'Teachers';
}
