import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { BehaviorSubject, first, Observable, pipe, ReplaySubject, take, tap } from 'rxjs';
import { RamanTeacherFirestore } from './ramanTeachers.firestore';
import { RamanTeacher2023Firestore } from './ramanTeachers2023.firestore';

@Injectable({
    providedIn: 'root'
})
export class RamanTeachersService {
    private _students: ReplaySubject<User> = new ReplaySubject<User>(1);
    currentStudent = new BehaviorSubject(null);
    currentStudentId = new BehaviorSubject(null);
    currentTeacherInfo = new BehaviorSubject(null);
    currentTeacherObj = new BehaviorSubject(null);
    // authUser: aUser.User
    /**
     * Constructor
     */
    constructor(
        private ramanTeacherFirestore: RamanTeacherFirestore,
        private ramanTeacher2023Firestore: RamanTeacher2023Firestore,
        public afAuth: AngularFireAuth,

    ) {
    }
    async getDocWithQuery(query: QueryFn): Promise<Observable<any>> {
        return this.ramanTeacherFirestore.collection$(query).pipe(take(1),
            tap(teacher => teacher));
    }

     getWithQuery(query: QueryFn): Observable<any>{
        return this.ramanTeacherFirestore.collection$(query).pipe(take(1));
    }


    create(value): Promise<any> {
        return this.ramanTeacherFirestore.create(value);
    }

    createWithId(value, id,collName): Promise<any> {
        if (collName =='RamanAward2024') {
            return this.ramanTeacherFirestore.createWithId(value, id);

           // return await lastValueFrom(this.ramanAwardService.getInstitutionDoc(institutionId, raman2024))

        }
        else {

            return this.ramanTeacher2023Firestore.createWithId(value, id);
          //  return await lastValueFrom(this.ramanAwardService.getInstitutionDoc(institutionId, raman2023))
        }
    }

    getWithId(id,collName) {

        if (collName =='RamanAward2024') {
            return this.ramanTeacherFirestore.doc$(id).pipe(take(1),
            tap(student => this.currentStudent.next(student)));
        }
        else {

            return this.ramanTeacher2023Firestore.doc$(id).pipe(take(1),
            tap(student => this.currentStudent.next(student)));
        }


    }


    async getWithIdusingDoc(id: string, collName: string) {
        let documentObservable;
        return new Promise(async (resolve,reject)=>{
            if (collName === 'RamanAward2024') {
                const  student =await this.ramanTeacherFirestore.getDocDataByDocId(id);
                  this.currentStudent.next(student);
                  resolve(student);
              } else {
                  documentObservable = await this.ramanTeacher2023Firestore.getDocDataByDocId(id);
                  this.currentStudent.next(documentObservable);
                  resolve(documentObservable);
              }
        });

        // return documentObservable.pipe(
        //     tap((student) => {
        //         if (student) {
        //             console.log('Student data retrieved:', student);
        //             this.currentStudent.next(student);
        //         } else {
        //             console.error('No student data found for ID:', id);
        //         }
        //     })
        // );
    }


    updateDoc(value, docId) {
       return this.ramanTeacherFirestore.update(value, docId);

    }


    delete(docId) {
        return this.ramanTeacherFirestore.delete(docId);
    }
}
