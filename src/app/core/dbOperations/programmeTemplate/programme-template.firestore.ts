import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root'
})

export class ProgrammeTemplateFirestore extends FirestoreService<any> {

    protected basePath: string = 'ProgrammeTemplates';

}
