import { Injectable } from "@angular/core";
import { AngularFirestore } from "@angular/fire/compat/firestore";
import { documentId, serverTimestamp } from "@angular/fire/firestore";
import { BehaviorSubject } from "rxjs";

@Injectable({
    providedIn: 'root'
})

export class WorkflowTemplatesService {

    private storagePathSubject = new BehaviorSubject<string | null>(null);
    storagePath$ = this.storagePathSubject.asObservable();


    // private _templateMode = new BehaviorSubject<string>('default');
    private templateModeSubject = new BehaviorSubject<string | null>(null);

    templateMode$ = this.templateModeSubject.asObservable();

    constructor(private afs: AngularFirestore) {
    }

    getWorkflowTemplate(docId: string) {
        return this.afs.collection('WorkflowTemplates').doc(docId);
    }
    getTemplates() {
        return this.afs.collection('WorkflowTemplates')
    }
    toTrash(docId, templateInfo) {
        this.afs.collection('WorkflowTemplates').doc('--trash--').collection('DeletedWorkflowTemplates').doc(docId).set({ ...templateInfo, trashAt: serverTimestamp() })
    }
    deleteInTrash(docId) {
        return this.afs.collection('WorkflowTemplates').doc('--trash--').collection('DeletedWorkflowTemplates').doc(docId).delete()
    }
    deleteInWorkflowTemplate(docId) {
        return this.afs.collection('WorkflowTemplates').doc(docId).delete();
    }
    restore(docId, templateInfo) {
        this.afs.collection('WorkflowTemplates').doc(docId).set({ ...templateInfo })
        this.afs.collection('WorkflowTemplates').doc('--trash--').collection('DeletedWorkflowTemplates').doc(docId).delete()
    }
    emptyTrash(docId) {
        this.afs.collection('WorkflowTemplates').doc('--trash--').collection('DeletedWorkflowTemplates').doc(docId).delete();
    }
    getDeletedTemplates() {
        return this.afs.collection('WorkflowTemplates').doc('--trash--').collection('DeletedWorkflowTemplates')
    }
    getDeletedTemplate(docId) {

        return this.afs.collection('WorkflowTemplates').doc('--trash--').collection('DeletedWorkflowTemplates').doc(docId)
    }


    setStoragePath(path: string) {
        this.storagePathSubject.next(path);
    }

    getStoragePathValue(): string | null {
        return this.storagePathSubject.getValue();
    }


    setTemplateMode(mode: string) {
        this.templateModeSubject.next(mode);
    }

    get currentTemplateMode() {
        return this.templateModeSubject.value;
    }
}  