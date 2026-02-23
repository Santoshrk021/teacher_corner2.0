import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root'
})

export class RamanFirestore2023 extends FirestoreService<any> {
    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'RamanAward2023';

}
