import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class ContestFirestore extends FirestoreService<any> {

    // protected basePath: string = 'Users/' + this.uid$ + '/Institution';
    protected basePath: string = 'Contests';

}
