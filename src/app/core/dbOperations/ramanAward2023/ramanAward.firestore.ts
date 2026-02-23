import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class RamanFirestore extends FirestoreService<any> {
    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'RamanAward2024';

}
