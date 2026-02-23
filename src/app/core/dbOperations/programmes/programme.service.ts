import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { DomainService } from 'app/shared/domain.service';
import { BehaviorSubject, first, lastValueFrom, map, Observable, ReplaySubject, take, tap } from 'rxjs';
import { ProgrammeFirestore } from './programme.firestore';
import { serverTimestamp } from '@angular/fire/firestore';
import { ConfigurationService } from '../configuration/configuration.service';
import { AngularFireFunctions } from '@angular/fire/compat/functions';

@Injectable({
    providedIn: 'root'
})
export class ProgrammeService {
    private _programmes: ReplaySubject<User> = new ReplaySubject<User>(1);
    currentProgrammeName = new BehaviorSubject(null);
    allProgrammesSub = new BehaviorSubject<any>(null);
    activities = new BehaviorSubject<any>(null);
    disname = new BehaviorSubject<any>(null);

    constructor(
        private _httpClient: HttpClient,
        private domainService: DomainService,
        private programmeFirestore: ProgrammeFirestore,
        private afs: AngularFirestore,
        private configService: ConfigurationService,
        private functions: AngularFireFunctions
    ) {
    }

    set programmes(value: User) {
        this._programmes.next(value);
    }

    async addNewProgramme(newProGramme: any) {
        const programmeId = this.programmeFirestore.getRandomGeneratedId();
        const programObj = Object.assign(newProGramme, {
            programmeId: programmeId,
            isLocalHost: this.domainService.isLocalHost()
        });
        await this.programmeFirestore.createWithId(programObj, programmeId);
        return programmeId;
    }

    get programmes$(): Observable<User> {
        this._programmes.subscribe((a) => {
        });

        return this._programmes.asObservable();
    }

    getAllProgrammes(): Observable<any> {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('docId', 'not-in', ['--schema--', '--trash--']);
        return this.programmeFirestore.collection$(query).pipe(tap(data =>
            this.allProgrammesSub.next(data)
        ));
    }

    getProgrammesDoc(): Observable<any> {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('docId', 'not-in', ['--schema--', '--trash--']);

        return this.programmeFirestore.collection$(query).pipe(
            tap(data =>
                 data // Log the document count
            )
        );
    }

    getAllLiveProgrammes() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('programmeStatus', '==', 'LIVE');
        return this.programmeFirestore.collection$(query);
    }

    getAllLiveProgrammesByType(type: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('programmeStatus', '==', 'LIVE').where('type', '==', type);
        return this.programmeFirestore.collection$(query);
    }

    getLiveProgrammesByInstituteIdAndType(instituteId: string, type: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('institutionId', '==', instituteId).where('programmeStatus', '==', 'LIVE').where('type', '==', type);
        return this.programmeFirestore.collection$(query);
    }

    get(id): Observable<any> {
        return this.programmeFirestore.doc$(id).pipe(take(1),
            tap(programme => this._programmes.next(programme)));
    }

    getProgrammeDocDataById(docId: string) {
        return this.programmeFirestore.doc$(docId);
    }

    getProgrammeDocByIdOnce(docId: string) {
        return this.programmeFirestore.getWithGet(docId);
    }

    // async getAllProgrammes() {
    //     return this.programmeFirestore.collection$().pipe(map(d => {
    //         return this.allProgrammesSub.next(d)
    //     }))
    // }

    update(programmes: User): Observable<any> {
        return this._httpClient.patch<User>('api/common/programmes', { programmes }).pipe(
            map((response) => {
                this._programmes.next(response);
            })
        );
    }

    updateProgramme(programmes: any) {
        return this.programmeFirestore.update(programmes, programmes.programmeId);
    }

    updateProgrammeWithoutMerge(programmes: any) {
        return this.programmeFirestore.updateWithoutMerge(programmes, programmes.programmeId);
    }

    updateProgrammeSingleField(programmeId: string, field: string, value: any) {
        return this.programmeFirestore.updateSingleField(field, value, programmeId);
    }

    addNewProgram(newProGramme: any, programId) {
        const programmeId = programId;
        const programObj = Object.assign(newProGramme, {
            programmeId: programmeId,
            isLocalHost: this.domainService.isLocalHost()
        });
        return this.programmeFirestore.createWithId(programObj, programmeId);
    }

    toTrash(docId, programObj) {
        return this.afs.collection('Programmes').doc('--trash--').collection('DeletedProgrammes').doc(docId).set({ ...programObj, trashAt: serverTimestamp() });
    }

    delete(docId) {
        return this.programmeFirestore.delete(docId);
    }

    deleteProgrammeSingleField(programmeId: string, field: string) {
        return this.programmeFirestore.deleteSingleField(field, programmeId);
    }

    trashCollection() {
        return this.afs.collection('Programmes').doc('--trash--').collection('DeletedProgrammes').valueChanges();
    }

    deleteInTrash(docId) {
        return this.afs.collection('Programmes').doc('--trash--').collection('DeletedProgrammes').doc(docId).delete();
    }

    getProgrammesByInsitituteId(InstituteId) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('institutionId', '==', InstituteId);
        return this.programmeFirestore.collection$(query);
    }

    async deleteAssignmentIdFromProgrammes(assignmentId: string) {
        const programmesWithAssignmentId = await lastValueFrom(this.getAllProgrammes().pipe(first()));
        programmesWithAssignmentId.map((programme) => {
            if (programme.hasOwnProperty('assignmentIds') && programme.assignmentIds.hasOwnProperty(assignmentId)) {
                delete programme.assignmentIds[assignmentId];
                this.updateProgramme(programme);
            };
        });
    }

    getProgrammeByIdOnce(programmeId: string) {
        return this.programmeFirestore.getWithGet(programmeId);
    }

    getProgrammesByLearningUnitId(learningUnitId: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('learningUnitsIds', 'array-contains', learningUnitId);
        return this.programmeFirestore.collection$(query);
    }

    async getProgrammeCode() {
        const counters = await lastValueFrom(this.configService.getCounters().pipe(first()));
        const pCode = this.addOne(counters?.programmeCode);
        return pCode;
        /*
        this.configService.getCounters().pipe(take(1)).subscribe(res => {
            const pCode = this.addOne(res.programmeCode)
            this.declareForm('', pCode)
        })
        */
    }

    addOne(s) {
        let newNumber = '';
        let continueAdding = true;
        for (let i = s.length - 1; i >= 0; i--) {
            if (continueAdding) {
                const num = parseInt(s[i], 10) + 1;
                if (num < 10) {
                    newNumber += num;
                    continueAdding = false;
                } else {
                    newNumber += '0';
                }
            } else {
                newNumber += s[i];
            }
        }
        return newNumber.split('').reverse().join('');
    }

}
