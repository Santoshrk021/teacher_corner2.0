import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { User } from 'app/core/dbOperations/user/user.types';
import { map, Observable, ReplaySubject, take, tap } from 'rxjs';
import { SyllabusFirestore } from './syllabus.firestore';

@Injectable({
    providedIn: 'root'
})
export class SyllabusService {
    private _syllabus: ReplaySubject<User> = new ReplaySubject<User>(1);
    /**
     * Constructor
     */
    constructor(private _httpClient: HttpClient, private syllabusFirestore: SyllabusFirestore) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set syllabus(value: User) {
        // Store the value
        this._syllabus.next(value);
    }

    get syllabus$(): Observable<User> {
        // this._syllabus.subscribe(a => {
        //     console.log(a);
        // })

        return this._syllabus.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in syllabus data
     */
    get(): Observable<any> {
        this.syllabusFirestore.classroomId = 'scuMOs8kyAdaqqFzCGlB';
        return this.syllabusFirestore.collection$().pipe(
            take(1),
            tap(syllabus => this._syllabus.next(syllabus)));
    }

}
