import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class UserFirestore extends FirestoreService<any> {

    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'Users';

    constructor(protected override afs: AngularFirestore) {
    super(afs);
    }
}
