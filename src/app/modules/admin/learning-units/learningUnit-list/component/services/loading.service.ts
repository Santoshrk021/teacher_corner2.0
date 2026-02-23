import { Injectable } from '@angular/core';
import { BehaviorSubject, concat, Observable, of } from 'rxjs';
import { concatMap, finalize, tap } from 'rxjs/operators';

@Injectable()
export class LoadingService {
    loadingSubject = new BehaviorSubject<boolean>(false);
    loading$: Observable<boolean> = this.loadingSubject.asObservable();

    totalItems: any = [];

    showLoaderUntilCompleted<T>(obs$: Observable<T>): Observable<T> {
        return of(null).pipe(
            // null intial value we just take it
            tap(() => this.loadingOn()),
            concatMap(() => obs$), // concat get final value from input
            finalize(() => this.loadingOff())
        );
    }
    loadingOn(): void {
        this.loadingSubject.next(true);
    }
    loadingOff(): void {
        this.loadingSubject.next(false);
    }
}
