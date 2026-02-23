// src/app/core/notifications/notification.firestore.ts
import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { FirestoreService } from "app/modules/firebase/firestore.service";

@Injectable({ 
    providedIn: 'root' 

})


export class NotificationFirestore extends FirestoreService<any> {


  protected override basePath = 'Notifications';

}
