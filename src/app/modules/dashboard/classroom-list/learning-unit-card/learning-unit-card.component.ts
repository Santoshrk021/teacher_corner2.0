import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { take } from 'rxjs';

@Component({
    selector: 'app-learning-unit-card',
    templateUrl: './learning-unit-card.component.html',
    styleUrls: ['./learning-unit-card.component.scss']
})
export class LearningUnitCardComponent implements OnInit,OnChanges {

    @Input() tactivity;
    @Input() teacherInfo;
    @Input() workflowCompletion;
    @Input() workflowId;
    @Input() trackProgress;
    @Input() sequentiallyLocked: boolean;
    @Input() index: number;
    @Input() allTactivities: Array<any>;
    @Input() noWorkflow: boolean;
    @Input() privilege: boolean;
    @Input() stepsUnlocked: boolean;
    @Input() dateLocked: boolean;
    @Input() lockUnlockDate: any;

    totalSteps: number;
    completedSteps: number;
    filterProgramme;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private userService: UserService,
        private luService: LearningUnitsService,
        private workflowService: WorkflowsService,
    ) { }
    ngOnChanges(changes: SimpleChanges): void {
        const currentWorkflowId = this.workflowId?.workflowId;
        if (currentWorkflowId) {
            this.getWorkflowStepsById(currentWorkflowId);
            if (this.workflowCompletion) {
                this.completedSteps = this.workflowCompletion?.workflows?.[currentWorkflowId]?.completedSteps;
            } else {
                this.completedSteps = 0;
            };
        };

    }

    ngOnInit(): void {

    }

    getTooltipContent(number) {
        return `You have completed ${Math.round(number * 100)}% of this tactivity`;
    }

    getWorkflowStepsById(workflowId: string) {
        this.workflowService.get(workflowId).pipe(take(1)).subscribe((res) => {
            this.totalSteps = res?.workflowSteps?.length;
        });
    }

    shortenText(text, maxLength) {
        let ret = text;
        if (ret.length > maxLength) {
            ret = ret.slice(0, maxLength) + '...';
        }
        return ret;
    }

    trackByFn(index: number, item: any): any {
        return item.id || index;
    } 

    onClickContinue(tac) {
        this.route.queryParams.subscribe(async (res) => {
            const institutionId = res?.institutionId;
            const classroomId = res?.classroomId;
            const programmeId = res?.programmeId;
            this.router.navigate(['dashboard', classroomId, 'programme', tac.docId],
                {
                    state: tac,
                    queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: programmeId }
                },
            );
        });
        const currentTeacherInfo = {
            lastUsedLearningUnit: tac.docId,
            lastLearningUnitName: tac.learningUnitDisplayName
        };

        this.luService.currentLearningUnitsName.next(tac.learningUnitDisplayName);
        this.userService.setTeacherInfo({ currentTeacherInfo });
    }

}
