import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
@Injectable({
    providedIn: 'root'
})

export class CustomAuthenticationFirestore extends FirestoreService<any> {
    // protected basePath: string = 'Users/' + this.uid$ + '/Institution';
    protected basePath: string = 'CustomAuthentication';
}
