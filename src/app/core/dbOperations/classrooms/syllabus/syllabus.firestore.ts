import { Injectable } from '@angular/core';
import { FirestoreService } from 'app/modules/firebase/firestore.service';

@Injectable({
    providedIn: 'root'
})

export class SyllabusFirestore extends FirestoreService<any> {
    classroomId: string = '';

    // protected basePath: string = 'Users/' + this.uid$ + '/Student';
    protected basePath: string = 'Classrooms/' + 'scuMOs8kyAdaqqFzCGlB' + '/Syllabus';

}
