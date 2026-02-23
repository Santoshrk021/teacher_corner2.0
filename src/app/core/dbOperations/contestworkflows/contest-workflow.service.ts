import { Injectable } from '@angular/core';
import { DomainService } from 'app/shared/domain.service';
import { BehaviorSubject } from 'rxjs';
import { ContestWorkflowFirestoreService } from '../contestworkflows/contest-workflow-firestore.service';
import { ContestStep } from '../contestworkflows/contest-workflow.types';

@Injectable({
  providedIn: 'root'
})
export class ContestWorkflowService {
  contestSteps = new BehaviorSubject<ContestStep>(null);
  constructor(private contestcontestFirestoreService: ContestWorkflowFirestoreService,
    private domainService: DomainService) {

  }

  isGoBackVisible = true;
  async getDocDataByDocId(docId: string) {
    return this.contestcontestFirestoreService.getDocDataByDocId(docId);
  }
  get(docId: string) {
    return this.contestcontestFirestoreService.doc$(docId);
  }
  addNewContestTemplate(contestTempate: any): string {
    const contestId = this.contestcontestFirestoreService.getRandomGeneratedId();
    contestTempate = Object.assign(contestTempate, { 'docId': contestId, 'isLocalHost': this.domainService.isLocalHost() });
    this.contestcontestFirestoreService.createWithId(contestTempate, contestId);
    return contestId;
  }
  updateWorkFlowTemplate(workFlowTempate: any, oldWorkFlowId: string) {
    this.contestcontestFirestoreService.update(workFlowTempate, oldWorkFlowId);
  }
  addNewWorkFlowTemplate(workFlowTempate: any): string {
    const workflowId = this.contestcontestFirestoreService.getRandomGeneratedId();
    workFlowTempate = Object.assign(workFlowTempate, { 'workflowId': workflowId, 'docId': workflowId, 'isLocalHost': this.domainService.isLocalHost() });
    this.contestcontestFirestoreService.createWithId(workFlowTempate, workflowId);
    return workflowId;
  }
  updateContestTemplate(contestTempate: any, oldcontestId: string) {
    this.contestcontestFirestoreService.update(contestTempate, oldcontestId);
  }

  update(value, id: string) {
    return this.contestcontestFirestoreService.update(value, id);
  }

  generateCustomId() {
    return this.contestcontestFirestoreService.getRandomGeneratedId();
  }

  parseContestTemplate(workflowTemplateInfo, contestInfo, isSaved, selectedCategory?) {
    let workflowObj: any;
    if (isSaved) {
      workflowObj = {
        templateId: workflowTemplateInfo?.templateId || '',
        templateName: workflowTemplateInfo?.templateName || '',
        docId: workflowTemplateInfo?.docId || '',
        contestSteps: selectedCategory ? { [selectedCategory]: { steps: [] } } : [],
        totalSteps: selectedCategory ? { [selectedCategory]: 0 } : 0,
      };
      const d = workflowTemplateInfo?.contestSteps;
      // obj.totalSteps = contestInfo?.contestSteps?.length;
      for (const x in workflowTemplateInfo?.totalSteps) {
        selectedCategory ? workflowObj.totalSteps[x] = d?.[x]?.length : workflowObj.totalSteps = d?.length;
      }

      for (const w in workflowTemplateInfo?.contestSteps) {

        selectedCategory ? workflowObj.contestSteps = d : workflowObj?.contestSteps?.steps?.push(d[w]);
      }
    }
    else {
      workflowObj = {
        templateId: workflowTemplateInfo?.templateId || '',
        templateName: workflowTemplateInfo?.templateName || '',
        docId: workflowTemplateInfo?.docId || '',
        contestSteps: selectedCategory ?
          {
            [selectedCategory]: {
              steps: workflowTemplateInfo?.contestSteps?.categoryMap?.steps,
            }
          } : [],
        totalSteps: selectedCategory ?
          {
            [selectedCategory]: workflowTemplateInfo?.contestSteps?.categoryMap?.steps?.length
          } : 0,

      };
      // if (contestInfo.type == 'classroomStemClubdependent') {
      //   workflowObj = {
      //     templateId: workflowTemplateInfo?.templateId || '',
      //     templateName: workflowTemplateInfo?.templateName || '',
      //     docId: workflowTemplateInfo?.docId || '',
      //     contestSteps: selectedCategory ?
      //       {
      //         [selectedCategory]: {
      //           steps: workflowTemplateInfo?.contestSteps?.categoryMap?.steps,
      //         }
      //       } : [],
      //     totalSteps: selectedCategory ?
      //       {
      //         [selectedCategory]: workflowTemplateInfo?.contestSteps?.categoryMap?.steps?.length
      //       } : 0,
      //   }
      // }

    }

    return workflowObj;
  }

  parseContest(contestInfo, selectedCategory?) {
    // let obj: ContestStep = {
    const obj: any = {
      contestId: contestInfo?.contestId || '',
      selectedStepView: {
        contestStepId: '',
        contestStepName: '',
        contestStepDescription: '',
        contestStepDuration: 0,
      },
      // contestSteps: [],
      // totalSteps: 0,

      // updatedAt: null,
      // featured: null,
      progress: {
        currentStep: null,
        completed: null,
      }
    };

    if (selectedCategory) {
      obj.contestSteps = { [selectedCategory]: { steps: [] } };
      obj.totalSteps = { [selectedCategory]: 0 };
    } else {
      obj.contestSteps = [];
      obj.totalSteps = 0;
    }

    const d = contestInfo.contestSteps;
    // obj.totalSteps = selectedCategory ? contestInfo?.contestSteps?.[selectedCategory]?.length : contestInfo?.contestSteps?.length
    for (const x in contestInfo.totalSteps) {
      selectedCategory ? obj.totalSteps = d.length : obj.totalSteps = contestInfo?.contestSteps?.length;
    }
    for (const w in contestInfo.contestSteps) {
      // obj.contestSteps.push(d[w])
      // selectedCategory ? obj.contestSteps = d : obj.contestSteps.push(d[w])
      selectedCategory ? obj.contestSteps = d : obj?.contestSteps?.steps?.push(d[w]);
    }
    this.contestSteps.next(obj);
    return obj;

  }
}
