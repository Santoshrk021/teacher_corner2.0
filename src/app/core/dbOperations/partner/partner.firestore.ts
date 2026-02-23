import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class partnerFirestore extends FirestoreService<any> {

    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'partners';
    // protected basePath: string = 'CopyOfMaster';

}
