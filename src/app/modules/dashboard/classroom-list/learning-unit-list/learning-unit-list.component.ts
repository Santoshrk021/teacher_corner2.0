import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { Subject, firstValueFrom, takeUntil } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
export interface Course {
    id?: string;
    title?: string;
    slug?: string;

    description?: string;
    category?: string;
    duration?: number;
    steps?: {
        order?: number;
        title?: string;
        subtitle?: string;
        content?: string;
    }[];
    totalSteps?: number;
    updatedAt?: number;
    featured?: boolean;
    progress?: {
        currentStep?: number;
        completed?: number;
    };
}
@Component({
    selector: 'app-learning-unit-list',
    templateUrl: './learning-unit-list.component.html',
    styleUrls: ['./learning-unit-list.component.scss']
})
export class LearningUnitListComponent implements OnInit, OnChanges {
    @Input() learningType: any;
    @Input() programLUs: any;
    @Input() selecttype: any;
    @Input() searchSub: any;
    @Input() filterProgramme;
    @Input() teacherInfo;
    @Input() sequentiallyLocked: boolean;
    @Input() allTactivities: Array<any>;
    @Input() lusWithoutWorkflows: Array<string>;
    @Input() privilege: boolean;
    @Input() stepsUnlocked: Array<boolean>;
    @Input() dateLocked: Array<boolean>;
    @Input() lockUnlockDate: any;

    allLU;
    filteredValues;
    search;
    filtered;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    loading=false;

    course: Course = {
        'id': '694e4e5f-f25f-470b-bd0e-26b1d4f64028',
        'title': 'Resources',
        'slug': 'basics-of-angular',
        'description': 'Introductory course for Angular and framework basics',
        'category': 'web',
        'duration': 30,
        'totalSteps': 3,

        'featured': true,
        'progress': {
            'currentStep': 1,
            'completed': 1
        },
        'steps': [
            {
                'order': 0,
                'title': 'Learn And Make',
                'subtitle': 'subtitle',
            },
            {
                'order': 1,
                'title': 'Resources',
                'subtitle': 'subtitle',
            },
            {
                'order': 2,
                'title': 'Assignment',
                'subtitle': 'subtitle',
            },
            {
                'order': 3,
                'title': 'Quiz',
                'subtitle': 'subtitle',
            }


        ]
    };
    selectedLearningUnit: any = {};

    leanringUnitForm = this.fb.group({
        displayName: [''],
        type: [''],
        difficultiesLevel: [''],
        exploreTime: [''],
        learnTime: [''],
        totalTime: [''],
        learningUnitsPicPath: [''],
        associatedLearningUnits: [''],
        prerequisiteLearningUnits: [''],
        similarLearningUnits: ['']

    });

    luType = [
        { name: 'TACtivity', code: 'TAC' },
        { name: 'Keep @ Home', code: 'KAH' },
        { name: 'Multiuse TACtivity', code: 'MUT' },
        { name: 'Multiuse TACtivity @ Home', code: 'MAH' },
        { name: 'NISTA (FLN) TAC', code: 'NAC' },
        { name: 'Group Activity', code: 'GRO' },
        { name: 'Online Games', code: 'ONG' },
        { name: 'CBE Theme', code: 'CBE' },
    ];
    difficultiesLevel = [
        { name: 1, code: 1 },
        { name: 2, code: 2 },
        { name: 3, code: 3 },
        { name: 4, code: 4 },
        { name: 5, code: 5 },
    ];
    workFlowStepsDoc: any;
    noWorkflow: boolean;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private userService: UserService,
        private luService: LearningUnitsService,
        private fb: FormBuilder,
        private workflowService: WorkflowsService,
        private Config: ConfigurationService,
        public dialog: MatDialog,
    ) { }

    async ngOnInit() {
        this.route.queryParams.pipe(takeUntil(this._unsubscribeAll)).subscribe(async (res) => {
            this.allLU = [];
        });

        this.filteredValues = this.programLUs;
        this.searchSub.subscribe(async (d) => {
            this.search = d;
            if (d.trim()!=='') {
                this.filteredValues = this.filtered?.filter(data => (data?.learningUnitName?.toLowerCase().includes(d.toLowerCase()) ||
                        data?.docId?.toLowerCase().includes(d.toLowerCase()) ||
                        (data?.learningUnitCode?.toLowerCase().includes(d.toLowerCase())) ||
                        (data?.version?.toLowerCase().includes(d.toLowerCase()))
                    ));
            }
            else{
                this.filteredValues=this.filtered;

            }
        });

        // this.learningType.subscribe(async(type) => {
        // })

        // let combinedObservables$ = forkJoin(this.filterProgramme);
        // combinedObservables$.pipe(
        //     // filter(student => student.data()?.contestSubmissions?.contestId.isSubmitted==true),
        //     tap(d=>{
        //     })
        //     );
    }

    async ngOnChanges(changes: SimpleChanges) {

        if (typeof (this.allLU) == 'undefined' || this.allLU.length == 0) {
            this.loading=true;
            this.allLU = await this.getALLlu();
            this.loading=false;
            this.filteredValues = this.allLU.filter(d => d.typeCode == this.selecttype);
            this.filtered=this.filteredValues;
        }
        else if(this.selecttype == 'All') {
            this.filteredValues = this.allLU;
            this.filtered=this.filteredValues;

        }
        else{

        }

        if (changes.selecttype) {
            if (this.selecttype == 'All') {

                this.filteredValues = this.allLU;
                this.filtered=this.filteredValues;

            }
            else {

                this.filteredValues = this.allLU.filter(d => d.typeCode == this.selecttype);
                this.filtered=this.filteredValues;

            }
        }
        // else {
        //     this.filteredValues = this.allLU.filter(d => d.typeCode == 'TA')
        // }
    }

    async toggleDetails(selectedLU: any) {
        const id = selectedLU.docId;
        if (this.selectedLearningUnit.docId === id) {
            this.selectedLearningUnit = {};
        }
        else {
            this.selectedLearningUnit = selectedLU;
            const associatedLearningUnits = await this.getLinkedLUList(this.selectedLearningUnit?.associatedLearningUnits || []);
            const prerequisiteLearningUnits = await this.getLinkedLUList(this.selectedLearningUnit?.prerequisiteLearningUnits || []);
            const similarLearningUnits = await this.getLinkedLUList(this.selectedLearningUnit?.similarLearningUnits || []);

            this.leanringUnitForm.patchValue({
                displayName: this.selectedLearningUnit.displayName,
                type: this.selectedLearningUnit.type,
                difficultiesLevel: this.selectedLearningUnit?.difficultiesLevel || 1,
                exploreTime: this.selectedLearningUnit?.exploreTime || 0,
                learnTime: this.selectedLearningUnit?.learnTime || 0,
                totalTime: this.selectedLearningUnit?.totalTime || 0,
                associatedLearningUnits: associatedLearningUnits,
                prerequisiteLearningUnits: prerequisiteLearningUnits,
                similarLearningUnits: similarLearningUnits
            });
        }

        const LutypeData = await firstValueFrom(this.Config.getLearningUnitTypes());
    }

    async getLinkedLUList(luIdsArr) {
        if (!luIdsArr.length) {return [];}
        const arr = [];
        luIdsArr.map(d => arr.push(this.luService.getLearningUnitData(d)));
        const luDetailsArr: any = await Promise.all(arr).then(data => data.map(d => ({ displayName: d['displayName'], docId: d['docId'] })));
        return luDetailsArr;
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

    luSubmit(form) {
    }

    /* async getWorkFlowContents(workFlowId: string) {
      const uid = await this.userService.getUid()
      this.workflowService.get(workFlowId).pipe(take(1)).subscribe((res: any) => {
        this.workFlowStepsDoc = res
        this.privilege = res?.privilegeTable?.find(v => v['uid'] == uid) ? true : false;
        this.setWorkFlowStep(this.workFlowStepsDoc.workflowSteps)
      })
    }
    setWorkFlowStep(workflowSteps: any) {
      workflowSteps.forEach((v: any, i: number) => {
        this.addStep(v, i)
      })
    } */

    /* onSubmit(form) {
    } */


    /* async learingUnitDialog() {
      await import('./learning-unit-dialog/learning-unit-dialog.module');
      this.dialog.open(LearningUnitDialogComponent, {
        data: {
        }
      })
    } */

    async getALLlu() {
        return Promise.all(
            this.filterProgramme.map(async m => firstValueFrom(m))
        );
    }

    ngOnDestroy(): void {
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
        // this.unsubscribe.forEach((e) => e.unsubscribe())
    }
}
