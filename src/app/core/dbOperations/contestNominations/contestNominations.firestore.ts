import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root'
})
export class ContestNominationsFirestore extends FirestoreService<any> {
    private _basePath: string;

    set basePath(contestId: string) {
        this._basePath = `Contest_${contestId}`;
    }

    get basePath(): string {
        return this._basePath;
    }
}

