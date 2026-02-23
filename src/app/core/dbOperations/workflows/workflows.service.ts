import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { DomainService } from 'app/shared/domain.service';
import { BehaviorSubject, first, lastValueFrom, Observable, ReplaySubject, tap } from 'rxjs';
import { WorkflowsFirestore } from './workflows.firestore';
import { WorkFlowStep } from './workflows.types';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { ConfigurationService } from '../configuration/configuration.service';
import { LearningUnitResourcesService } from '../learningUnitResources/learningUnitResources.service';
import { BoardGradeResourcesService } from '../boardGradeResources/boardGradeResources.service';

@Injectable({
    providedIn: 'root'
})
export class WorkflowsService {
    private _workflows = new ReplaySubject(1);
    currentLearningUnitsName = new BehaviorSubject(null);

    workFlowSteps = new BehaviorSubject<WorkFlowStep>(null);

    currentWorkFlowId = new BehaviorSubject<string>(null);
    currentWorkFlowInfo = new BehaviorSubject<string>(null);

    constructor(
        private _httpClient: HttpClient,
        private workflowsFirestore: WorkflowsFirestore,
        private domainService: DomainService,
        private configurationService: ConfigurationService,
        private luResourcesService: LearningUnitResourcesService,
        private boardGradeResourcesService: BoardGradeResourcesService
    ) {
    }

    /**
     * Setter & getter for user
     *
     * @param value
     */
    getWorkflowDoc(id) {
        return this.workflowsFirestore.getDocDataByDocId(id);
    }

    getWorkflowDocByIdOnce(id: string) {
        return this.workflowsFirestore.getWithGet(id);
    }

    set workflows(value) {
        // Store the value
        this._workflows.next(value);
    }

    get workflows$(): Observable<any> {
        this._workflows.subscribe((a) => {
        });

        return this._workflows.asObservable();
    }

    get(id): Observable<any> {
        return this.workflowsFirestore.doc$(id).pipe(
            tap(workflows => this._workflows.next(workflows)));
    }

    getTrialBySnapshot(id): Observable<any> {
        return this.workflowsFirestore.doc$(id);
    }

    addNewWorkFlowTemplate(workFlowTempate: any): string {
        const workFlowId = this.workflowsFirestore.getRandomGeneratedId();
        workFlowTempate = Object.assign(workFlowTempate, { 'workflowId': workFlowId, 'isLocalHost': this.domainService.isLocalHost() });
        this.workflowsFirestore.createWithId(workFlowTempate, workFlowId);
        return workFlowId;
    }

    updateWorkFlowTemplate(workFlowTempate: any, oldWorkFlowId: string) {
        this.workflowsFirestore.update(workFlowTempate, oldWorkFlowId);
    }

    // update(workflows): Observable<any> {
    //     return this._httpClient.patch<User>('api/common/workflowss', { workflows }).pipe(
    //         map((response) => {
    //             this._workflows.next(response);
    //         })
    //     );
    // }

    updateWorkflowSingleField(docId: string, key: string, value: any) {
        return this.workflowsFirestore.updateSingleField(key, value, docId);
    }

    update(value, id: string) {
        return this.workflowsFirestore.update(value, id);
    }

    delete(id: string) {
        return this.workflowsFirestore.delete(id);
    }

    generateCustomId() {
        return this.workflowsFirestore.getRandomGeneratedId();
    }

    async parseWorkflowTemplate(workFlowInfo: any, luDetails: any, isSaved: boolean, boardGradeKeys: any, unlockedSteps: any) {

        const [luAndResourceKeyMap, resourceNames] = await Promise.all([
            this.configurationService.getLearningUnitAndResourceKeyMap() as Promise<{ map: any }>,
            this.configurationService.getResourceNamesPromise() as Promise<{ resources: any }>
        ]).then(([luMap, resources]) => [luMap?.map, resources?.resources]);

        const luType = luAndResourceKeyMap?.[luDetails?.typeCode]?.resourceKey;
        const maturity = luDetails.Maturity?.toLowerCase();
        const resourceConfig = resourceNames[luType]?.[maturity] || {};

        const board = boardGradeKeys?.board;
        const grade = `grade_${boardGradeKeys?.grade?.toString()?.padStart(2, '0')}`;


        const resourceDocid = luDetails?.resources?.[maturity];
        const resourceData: any = await this.luResourcesService.getDocDataByDocId(resourceDocid);

        // const luResourcesAtMaturity = luDetails?.resources?.[maturity] || {};
        const luResourcesAtMaturity = resourceData?.resources || {};

        const result = {
            templateId: workFlowInfo?.templateId || '',
            workflowId: workFlowInfo?.workflowId || '',
            templateName: workFlowInfo?.templateName || '',
            workflowSteps: [],
            totalSteps: workFlowInfo?.workflowSteps?.length || 0,
        };


        // if (Array.isArray(workFlowInfo?.workflowSteps)) {
        //     result.workflowSteps = workFlowInfo.workflowSteps.map((workflowStep) => {
        //         const { contents = [] } = workflowStep;

        //         const mappedContents = contents.map(async (content) => {
        //             const { contentCategory, contentSubCategory } = content;

        //             const contentConfig = resourceConfig?.[contentCategory]?.[contentSubCategory] || {};

        //             // if (contentConfig.isGradeDependent) {
        //             //     content.resourcePath =
        //             //         content.resourcePath ?
        //             //             content.resourcePath :
        //             //             luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.[board]?.[grade] ?
        //             //                 luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.[board]?.[grade] :
        //             //                 luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.universalGradeBoardResourcePath ?
        //             //                     luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.universalGradeBoardResourcePath : ''


        //             // } else {
        //             //     console.log(contentConfig);
        //             //     content.resourcePath =
        //             //         content.resourcePath ?
        //             //             content.resourcePath :
        //             //             luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory] ?
        //             //                 luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory] : ''

        //             // }

        //             if (contentConfig?.isGradeDependent) {
        //                 console.log(luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.[board]);
        //                 let bdResourceId=luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.[board]
        //                 let bdData:any= await this.boardGradeResourcesService.getDocDataByDocId(bdResourceId)
        //                 console.log(bdData);
        //                 luResourcesAtMaturity[contentCategory][contentSubCategory][board]=bdData.resources
        //                 console.log(grade);

        //                 content.resourcePath = content.resourcePath
        //                     || luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.[board]?.[grade]
        //                     || luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.universalGradeBoardResourcePath
        //                     || '';
        //             } else {
        //                 content.resourcePath = content.resourcePath
        //                     || luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]
        //                     || '';
        //             }
        //             console.log(content);

        //             return content;
        //         });

        //         return {
        //             ...workflowStep,
        //             contents: mappedContents
        //         };
        //     });
        // }

        if (Array.isArray(workFlowInfo?.workflowSteps)) {
            result.workflowSteps = await Promise.all(workFlowInfo.workflowSteps.map(async (workflowStep, index) => {
                const { contents = [] } = workflowStep;

                if (index < unlockedSteps || index == 0) {
                    workflowStep.isStepUnlocked = true;
                }
                else {
                    workflowStep.isStepUnlocked = false;
                }
                const mappedContents = await Promise.all(contents.map(async (content) => {
                    const { contentCategory, contentSubCategory } = content;

                    const contentConfig = resourceConfig?.[contentCategory]?.[contentSubCategory] || {};

                    if (contentConfig?.isGradeDependent) {

                        const bdResourceId = luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.[board];
                        if (bdResourceId) {
                            const bdData: any = await this.boardGradeResourcesService.getDocDataByDocId(bdResourceId);
                            luResourcesAtMaturity[contentCategory][contentSubCategory][board] = bdData.resources;
                        }


                        content.resourcePath = content.resourcePath
                            || luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.[board]?.[grade]
                            || luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]?.universalGradeBoardResourcePath
                            || '';
                    } else {
                        content.resourcePath = content.resourcePath
                            || luResourcesAtMaturity?.[contentCategory]?.[contentSubCategory]
                            || '';
                    }

                    return content;
                }));

                return {
                    ...workflowStep,
                    contents: mappedContents,
                };
            }));
        }

        return result;
    }

    parseWorkflow(workFlowInfo) {
        const obj: WorkFlowStep = {
            workflowId: workFlowInfo?.workflowId || '',
            selectedStepView: {
                workflowStepId: '',
                workflowStepName: '',
                workflowStepDescription: '',
                workflowStepDuration: 0,
            },
            workflowSteps: [],
            totalSteps: 0,

            // updatedAt: null,
            // featured: null,
            progress: {
                currentStep: null,
                completed: null,
            }
        };

        const d = workFlowInfo.workflowSteps;
        obj.totalSteps = workFlowInfo?.workflowSteps?.length;
        for (const w in workFlowInfo.workflowSteps) {
            obj.workflowSteps.push(d[w]);

        }
        this.workFlowSteps.next(obj);
        return obj;

    }

    async getWorkflowsWithAssignmentId(assignmentId: string) {
        const query: QueryFn = (ref: CollectionReference) => ref.where('docId', '!=', '');
        const workflow = await lastValueFrom(this.workflowsFirestore.collection$(query).pipe(first()));
        return workflow.filter(x => JSON.stringify(x).includes(assignmentId));
    }

    async deleteAssignmentFromWorkflow(assignmentId: string) {
        // get workflows with assignmentId
        const workFlowWithAssignmentId = await this.getWorkflowsWithAssignmentId(assignmentId);
        // get the length of contents with assignmentId within workflow steps
        workFlowWithAssignmentId.map((x) => {
            const contentWithAssignmentId = x.workflowSteps.filter(y => JSON.stringify(y).includes(assignmentId))[0].contents;
            // if there are multiple contents with assignmentId, then remove contents with assignmentId, else remove the workflowSteps
            if (contentWithAssignmentId.length > 1) {
                const workflowWithAssignmentIdRemoved = { ...x, workflowSteps: x.workflowSteps.map(y => ({ ...y, contents: y.contents.filter(x => x.assignmentId !== assignmentId) })).filter(y => y.contents.length > 0) };
                this.updateWorkFlowTemplate(workflowWithAssignmentIdRemoved, workflowWithAssignmentIdRemoved.docId);
            } else {
                const workflowWithAssignmentIdRemoved = { ...x, workflowSteps: x.workflowSteps.filter(y => !JSON.stringify(y).includes(assignmentId)).map((x, i) => ({ ...x, sequenceNumber: i + 1 })) };
                this.updateWorkFlowTemplate(workflowWithAssignmentIdRemoved, workflowWithAssignmentIdRemoved.docId);
            }
        });
    }

    moveToTrash(workflow: any) {
        this.workflowsFirestore.trashDocument(workflow, workflow?.docId, '--trash--', 'DeletedWorkflows');
    }

    addNewWorkflow(val, docId) {
        this.workflowsFirestore.createWithId(val, docId);

    }

}
