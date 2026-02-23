import { Injectable } from '@angular/core';
import { LearningUnitResourcesFirestore } from './learningUnitResources.firestore';
import { AngularFirestore, QueryFn } from '@angular/fire/compat/firestore';


@Injectable({
    providedIn: 'root'
})
export class LearningUnitResourcesService {

    constructor(
        private learningUnitResourcesFirestore: LearningUnitResourcesFirestore
    ) { }

    getDocId() {
        return this.learningUnitResourcesFirestore.getRandomGeneratedId();
    }

    getDocDataByDocId(docId: string) {
        return this.learningUnitResourcesFirestore.getDocDataByDocId(docId);
    }

    getDocDataByIdOnce(docId: string) {
        return this.learningUnitResourcesFirestore.getWithGet(docId);
    }

    getDocDataByLUId(learningUnitId: string) {
        const query: QueryFn = ref => ref.where('learningUnitDocId', '==', learningUnitId);
        return this.learningUnitResourcesFirestore.getQueryWithGet(query);
    }

    createDoc(docData: any, docId: string) {
        return this.learningUnitResourcesFirestore.createWithId(docData, docId);
    }

    updateDoc(docId: string, fieldName: string, fieldValue: string) {
        this.learningUnitResourcesFirestore.updateSingleField(fieldName, fieldValue, docId);
    }

    updateLUResources(val: any, docId: string) {
        return this.learningUnitResourcesFirestore.update(val, docId);
    }

    updateSingleResources(key, val, docId) {
        return this.learningUnitResourcesFirestore.updateSingleField(key, val, docId);
    }

    trashLearningUnitResource(learningUnitResource: any) {
        return this.learningUnitResourcesFirestore.trashDocument(learningUnitResource, learningUnitResource.docId, '--trash--', 'DeletedLearningUnitResources');
    }

    showAllLearningUnitResourceTrash() {
        return this.learningUnitResourcesFirestore.showAllTrashDocuments('--trash--', 'DeletedLearningUnitResources');
    }

    deleteLearningUnitResourceFromTrash(learningUnitResourceId: string) {
        return this.learningUnitResourcesFirestore.deleteDocumentFromTrashPermanently(learningUnitResourceId, '--trash--', 'DeletedLearningUnitResources');
    }

    deleteLearningUnitResourceById(learningUnitResourceId: string) {
        return this.learningUnitResourcesFirestore.delete(learningUnitResourceId);
    }

}
