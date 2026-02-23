import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class LearningUnitsFirestore extends FirestoreService<any> {

    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'LearningUnits';

}
