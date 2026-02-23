import { Injectable } from '@angular/core';
import { ScannedArtefactsFirestore } from './scanned-artefacts.firestore';
import { QueryFn } from '@angular/fire/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class ScannedArtefactsService {

  constructor(
    private scannedAssignmentsFirestore: ScannedArtefactsFirestore,
  ) { }

  getScannedArtefactsById(scannedArtefactId: string) {
    return this.scannedAssignmentsFirestore.getCollectionDocument(scannedArtefactId);
  }

  getScannedArtefactsInClassroom(institutionId: string, classroomId: string, programmeId: string) {
    const query: QueryFn = (ref) => ref.where('institutionId', '==', institutionId).where('classroomId', '==', classroomId).where('programmeId', '==', programmeId);
    return this.scannedAssignmentsFirestore.getQueryWithGet(query);
  }

  addNewScannedArtefact(scannedArtefact: any) {
    return this.scannedAssignmentsFirestore.create(scannedArtefact);
  }

  updateScannedArtefact(scannedArtefactId: string, data: any) {
    return this.scannedAssignmentsFirestore.updateWithMerge(scannedArtefactId, data);
  }

}
