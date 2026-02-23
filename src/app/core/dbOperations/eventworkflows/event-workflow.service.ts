import { Injectable } from '@angular/core';
import { EventWorkflowFirestoreService } from './event-workflow-firestore.service';
import { DomainService } from 'app/shared/domain.service';



@Injectable({
    providedIn: 'root'
})

export class EventWorkflowService {
    constructor(
        private eventWorkflowFirestoreService: EventWorkflowFirestoreService,
        private domainService: DomainService
    ) {

    }

    get(docId: string) {
        return this.eventWorkflowFirestoreService.doc$(docId);
      }
    getEventWorkflowByGet(eventWorkflowId) {
        return this.eventWorkflowFirestoreService.getWithGet(eventWorkflowId);
    }

    parseContestTemplate(contestInfo, isSaved, selectedCategory?) {
        let obj: any;
        if (isSaved) {
            obj = {
                templateId: contestInfo?.templateId || '',
                templateName: contestInfo?.templateName || '',
                docId: contestInfo?.docId || '',
                contestSteps: [],
                totalSteps: 0,
            };
            const d = contestInfo?.contestSteps;
            // obj.totalSteps = contestInfo?.contestSteps?.length;
            for (const x in contestInfo?.totalSteps) {
                obj.totalSteps = d?.length;
            }

            for (const w in contestInfo?.contestSteps) {
                obj?.contestSteps?.steps?.push(d[w]);
            }
        } else {
            // console.log(contestInfo?.contestSteps?.[selectedCategory]?.code)
            obj = {
                templateId: contestInfo?.templateId || '',
                templateName: contestInfo?.templateName || '',
                docId: contestInfo?.docId || '',
                contestSteps: [],
                totalSteps:  0,
            };
        }
        return obj;
    }


    updateWorkFlowTemplate(workFlowTempate: any, oldWorkFlowId: string) {
        this.eventWorkflowFirestoreService.update(workFlowTempate, oldWorkFlowId);
      }
      addNewWorkFlowTemplate(workFlowTempate: any): string {
        const workflowId = this.eventWorkflowFirestoreService.getRandomGeneratedId();
        workFlowTempate = Object.assign(workFlowTempate, { 'workflowId': workflowId, 'docId': workflowId, 'isLocalHost': this.domainService.isLocalHost() });
        this.eventWorkflowFirestoreService.createWithId(workFlowTempate, workflowId);
        return workflowId;
      }
}
