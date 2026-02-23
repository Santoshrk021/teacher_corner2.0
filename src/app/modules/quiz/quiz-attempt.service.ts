import { Injectable } from '@angular/core';
import { BehaviorSubject, filter, Observable } from 'rxjs';
import { IDBLite } from 'app/shared/idb-lite';

export interface QuizAttempt {
    version: 1;
    attemptId: string;        // `${userId}|${workflowId}|${quizId}`
    userId: string;
    workflowId: string;
    classroomId: string;
    quizId: string;
    startedAt: number;
    updatedAt: number;
    currentIndex: number;
    isSubmitted: boolean;
    answers: Record<string, {
        type: 'MCQ_SINGLE' | 'MCQ_MULTI' | 'FILL' | 'RICH_BLANKS' | 'TEXT';
        selectedOptionIndexes?: number[];   // for single/multi
        blanks?: Record<string, string>;     // blankKey -> selected value
        textAnswer?: string;                // for TEXT
        subPartAnswers?: Array<{            // for questions with sub-parts
            selectedOptionIndexes: number[];
        }>;
    }>;
    remainingSeconds?: number;            // timer/grace display
    remoteQuestionResponses?: { [qIndex: number]: { [mac: string]: number[] } };
    studentAnswers?: { [mac: string]: { [qIndex: number]: number[] } };
    remoteSubPartResponses?: { [qIndex: number]: { [subPartIndex: number]: { [mac: string]: number[] } } };
}

@Injectable({ providedIn: 'root' })
export class QuizAttemptService {
    private idb = new IDBLite();
    private state$ = new BehaviorSubject<QuizAttempt | null>(null);
    attempt$ = this.state$.asObservable().pipe(filter(Boolean)) as Observable<QuizAttempt>;

    private key(id: string) { return `attempt:${id}`; }

    async loadOrStart(ctx: { userId: string; workflowId: string; classroomId: string; quizId: string }) {
        const attemptId = `${ctx.userId}|${ctx.workflowId}|${ctx.quizId}`;
        const existing = await this.idb.get<QuizAttempt>(this.key(attemptId));
        if (existing && !existing.isSubmitted) {
            this.state$.next(existing);
            return existing;
        }
        const fresh: QuizAttempt = {
            version: 1,
            attemptId,
            ...ctx,
            startedAt: Date.now(),
            updatedAt: Date.now(),
            currentIndex: 0,
            isSubmitted: false,
            answers: {},
        };
        await this.idb.set(this.key(attemptId), fresh);
        this.state$.next(fresh);
        return fresh;
    }

    async savePartial(patch: Partial<QuizAttempt>) {
        const cur = this.state$.value!;
        const next: QuizAttempt = { ...cur, ...patch, updatedAt: Date.now() };
        await this.idb.set(this.key(next.attemptId), next);
        this.state$.next(next);
    }

    async recordAnswer(questionId: string, answer: QuizAttempt['answers'][string]) {
        const cur = this.state$.value!;
        const answers = { ...cur.answers, [questionId]: answer };
        await this.savePartial({ answers });
    }

    async jumpTo(index: number) {
        await this.savePartial({ currentIndex: index });
    }

    async tickTimer(remainingSeconds: number) {
        await this.savePartial({ remainingSeconds });
    }

    async markSubmitted() {
        await this.savePartial({ isSubmitted: true });
    }

    async clear() {
        const cur = this.state$.value;
        if (!cur) return;
        await this.idb.delete(this.key(cur.attemptId));
        this.state$.next(null);
    }
}
