import { Injectable } from '@angular/core';
import { BoardGradeResourcesFirestore } from './boardGradeResources.firestore';
import { QueryFn } from '@angular/fire/compat/firestore';


@Injectable({
    providedIn: 'root'
})
export class BoardGradeResourcesService {

    constructor(
        private boardGradeResourcesFirestore: BoardGradeResourcesFirestore
    ) { }

    getDocDataByDocId(docId: string) {
        return this.boardGradeResourcesFirestore.getDocDataByDocId(docId);
    }

    getDocDataByDocIdOnce(docId: string) {
        return this.boardGradeResourcesFirestore.getWithGet(docId);
    }

    getDocDataByLuId(learningUnitId: string) {
        const query: QueryFn = ref => ref.where('learningUnitDocId', '==', learningUnitId);
        return this.boardGradeResourcesFirestore.getQueryWithGet(query);
    }

    updateDocDataByDocId(docId: string, value: any) {
        return this.boardGradeResourcesFirestore.update(value,docId);
    }

    trashBoardGradeResource(boardGradeResource: any) {
        return this.boardGradeResourcesFirestore.trashDocument(boardGradeResource, boardGradeResource.docId, '--trash--', 'DeletedLearningUnitResources');
    }

    showAllBoardGradeResourceTrash() {
        return this.boardGradeResourcesFirestore.showAllTrashDocuments('--trash--', 'DeletedLearningUnitResources');
    }

    deleteBoardGradeResourceFromTrash(boardGradeResourceId: string) {
        return this.boardGradeResourcesFirestore.deleteDocumentFromTrashPermanently(boardGradeResourceId, '--trash--', 'DeletedLearningUnitResources');
    }

    deleteBoardGradeResourceById(boardGradeResourceId: string) {
        return this.boardGradeResourcesFirestore.delete(boardGradeResourceId);
    }

}
