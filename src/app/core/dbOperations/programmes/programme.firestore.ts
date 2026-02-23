import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class ProgrammeFirestore extends FirestoreService<any> {

    protected basePath: string = 'Programmes';

}
