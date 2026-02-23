import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
  providedIn: 'root'
})
export class EventFirestoreService extends FirestoreService<any> {

  protected basePath: string = 'Events';

}
