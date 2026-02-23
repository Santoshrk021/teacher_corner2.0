import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root'
})

export class SlackUsersFirestore extends FirestoreService<any> {
    protected basePath: string = 'SlackUsers';
}
