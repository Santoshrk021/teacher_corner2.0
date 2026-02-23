import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';
import { map } from 'rxjs';

@Injectable({
    providedIn: 'root'
})

export class ConfigurationsFirestore extends FirestoreService<any> {

    protected basePath: string = 'Configuration';

}
