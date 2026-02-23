import { Injectable } from '@angular/core';
import { FirestoreService } from './firestore.service';


@Injectable({
    providedIn: 'root'
})
export class EmployeeFirestore extends FirestoreService<any> {

    protected basePath: string = 'Test';

}
