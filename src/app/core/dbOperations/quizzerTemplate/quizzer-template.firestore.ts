import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root'
})

export class QuizzerTemplateFirestore extends FirestoreService<any> {
    protected basePath: string = 'QuizzerTemplates';

}
