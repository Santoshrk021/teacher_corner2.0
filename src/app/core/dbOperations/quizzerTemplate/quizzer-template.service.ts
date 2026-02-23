import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { QuizzerTemplateFirestore } from './quizzer-template.firestore';

@Injectable({
    providedIn: 'root'
})
export class QuizzerTemplateService {
    quizzerTemplatesSub = new BehaviorSubject<any>(null);

    constructor(private quizzerTemplateFirestore: QuizzerTemplateFirestore) {

    }
    getQuizzerTemplates() {
        return this.quizzerTemplateFirestore.collection$().pipe(
            tap(quizzers => this.quizzerTemplatesSub.next(quizzers)));
    }
}
