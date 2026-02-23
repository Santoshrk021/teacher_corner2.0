import { Injectable } from '@angular/core';
import { ProgrammeTemplate } from './programme-template.type';
import { ProgrammeTemplateFirestore } from './programme-template.firestore';
import { BehaviorSubject, tap } from 'rxjs';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { DomainService } from 'app/shared/domain.service';
import { MasterService } from '../master/master.service';

@Injectable({
  providedIn: 'root'
})
export class ProgrammeTemplateService {

  programmeTemplate: ProgrammeTemplate;
  currentProgrammeTemplateName = new BehaviorSubject<string>(null);
  allProgrammeTemplatesSub = new BehaviorSubject<ProgrammeTemplate[]>(null);
  template = [{
    workflowId: 'freemium',
    tacName: 'Body Joints - Ball Socket ',
    tacCode: 'BA02',
    tacVersion: 'EN-V10'
  }];
  templates = new BehaviorSubject<any>(this.template);
  disname = new BehaviorSubject<any>(this.template);

  constructor(
    private programmeTemplateFirestore: ProgrammeTemplateFirestore,
    private domainService: DomainService,
    private masterService: MasterService,
  ) { }

  getAllProgrammeTemplates() {
    const query: QueryFn = (ref: CollectionReference) =>
      ref.where('docId', 'not-in', ['--schema--', '--archive--', '--trash--']);

    return this.programmeTemplateFirestore.collection$(query).pipe(
      tap((data: Array<ProgrammeTemplate>) => {
        this.allProgrammeTemplatesSub.next(data);
      })
    );
  }

  getProgrammeTemplateById(templateId: string) {
    return this.programmeTemplateFirestore.doc$(templateId);
  }

  getTemplatesFromDetails(grade: number, board: string, subject: string, templateCategory: string) {
    const query: QueryFn = (ref: CollectionReference) => ref.where('grade', '==', grade).where('board', '==', board).where('subject', '==', subject).where('templateCategory', '==', templateCategory);
    return this.programmeTemplateFirestore.getQueryWithGet(query);
  }

  getProgrammeTemplatesByLearningUnitId(learningUnitId: string) {
    const query: QueryFn = (ref: CollectionReference) =>
      ref.where('learningUnitsIds', 'array-contains', learningUnitId);
    return this.programmeTemplateFirestore.collection$(query);
  }

  generateRandomDocId() {
    return this.programmeTemplateFirestore.getRandomGeneratedId();
  }

  toTrash(docId: string, templateObj: any) {
    return this.programmeTemplateFirestore.trashDocument(templateObj, docId, '--trash--', 'DeletedProgrammeTemplates');
  }

  delete(docId: string) {
    return this.programmeTemplateFirestore.delete(docId);
  }

  trashCollection() {
    return this.programmeTemplateFirestore.showAllTrashDocuments('--trash--', 'DeletedProgrammeTemplates');
  }

  addNewProgrammeTemplate(newTemplate: ProgrammeTemplate, templateId: string) {
    const templateObj = Object.assign(newTemplate, {
      templateId,
      isLocalHost: this.domainService.isLocalHost()
    });

    return this.programmeTemplateFirestore.createWithId(templateObj, templateId);
  }

  deleteInTrash(docId: string) {
    return this.programmeTemplateFirestore.deleteDocumentFromTrashPermanently(docId, '--trash--', 'DeletedProgrammeTemplates');
  }

  updateProgrammeTemplate(template: Partial<ProgrammeTemplate>) {
    return this.programmeTemplateFirestore.update(template, template.docId);
  }

  getTac() {
    this.masterService.learningList.subscribe((data) => {
      this.disname.next(data);
    });
  }

  updateProgrammeTemplateWithoutMerge(template: ProgrammeTemplate) {
    return this.programmeTemplateFirestore.updateWithoutMerge(template, template.templateId);
  }

  updateProgrammeTemplateSingleField(docId: string, field: string, value: any) {
    return this.programmeTemplateFirestore.updateSingleField(field, value, docId);
  }

}
