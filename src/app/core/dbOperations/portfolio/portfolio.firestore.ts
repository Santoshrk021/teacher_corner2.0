import { Injectable } from "@angular/core";
import { FirestoreService } from "app/modules/firebase/firestore.service";

@Injectable({
    providedIn: 'root'
})

export class PortfolioFirestore extends FirestoreService<any> {

    protected basePath: string = 'Portfolio';

}