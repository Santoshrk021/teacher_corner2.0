import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root'
})

export class WorkflowsTemplateFirestore extends FirestoreService<any> {

    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'WorkflowTemplates';

}
