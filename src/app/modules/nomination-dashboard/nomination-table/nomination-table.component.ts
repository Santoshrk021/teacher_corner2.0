import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NominationService } from '../nomination.service';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { AddNominationComponent } from '../add-nomination/add-nomination.component';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UiService } from 'app/shared/ui.service';
import { serverTimestamp } from '@angular/fire/firestore';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ContestNominationsService } from 'app/core/dbOperations/contestNominations/contestNominations.service';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';

@Component({
    selector: 'app-nomination-table',
    templateUrl: './nomination-table.component.html',
    styleUrls: ['./nomination-table.component.scss']
})
export class NominationTableComponent implements OnInit, OnDestroy {
    studentsInfoArr;
    subcriptionRef: PushSubscription[] = [];
    nominationStartDate;
    nominationEndDate;
    today = new Date();
    stageSubmissionId: string | null = null;


    currentContest;
    constructor(
        private router: Router,
        private nominationService: NominationService,
        public dialog: MatDialog,
        private fuseConfirmationService: FuseConfirmationService,
        private uiService: UiService,
        private contestService: ContestService,
        private contestNominationService: ContestNominationsService,
        private activateRoute: ActivatedRoute,
        private activatedRoute: ActivatedRoute,
        private contestWorkflowService: ContestWorkflowService,

    ) {
        if (!this.nominationService.nominationViewGrade.value) {
            this.router.navigate(['/']);
        }
    }

    ngOnDestroy(): void {
        if (this.subcriptionRef?.length) { this.subcriptionRef.map(d => d.unsubscribe()); }
    }


    async ngOnInit(): Promise<void> {
        this.currentContest = await this.getContest();
        this.contestNominationService.setContestId(this.currentContest.docId);


        const currentStage = this.currentContest.stagesNames.find((stage: any) => stage.stageId === this.activateRoute.snapshot.queryParams.stageId);
        const isNominationDatePresent = ['nominationStartDate','nominationEndDate'].every(key => currentStage.hasOwnProperty(key) && currentStage[key]);
        this.nominationStartDate = isNominationDatePresent ? new Date(currentStage.nominationStartDate.seconds * 1000) : new Date(this.currentContest?.contestStartDate?.seconds * 1000);
        this.nominationEndDate = isNominationDatePresent ? new Date(currentStage.nominationEndDate.seconds * 1000) : new Date(this.currentContest?.contestEndDate?.seconds * 1000);

        // Prefer first submission of current stage; fallback to first available in the contest
        this.stageSubmissionId =
            currentStage?.submissions?.[0]?.submissionId ??
            (this.currentContest?.stagesNames
                ?.flatMap((s: any) => s?.submissions ?? [])
                ?.find((sub: any) => !!sub?.submissionId)
                ?.submissionId ?? null);

        await this.getStudents();
    }

    getContest() {
        return new Promise((resolve) => {
            this.contestService.currentContest.subscribe((d) => {
                resolve(d);

            });
        });
    }

    goBack() {
        this.router.navigate(['nomination-dashboard', this.currentContest.docId], { queryParamsHandling: 'merge' });
    }

    async getStudents() {
        const grade = this.nominationService.nominationViewGrade.value;

        const institutionId = this.nominationService.institutionId.value;

        // const query: QueryFn = (ref: CollectionReference) => ref
        //     .where('nominateMeta.institutionId', '==', institutionId)
        //     .where('studentMeta.grade', '==', String(grade))

        // this.contestNominationService.getQueryWithGet(query).subscribe(res => {
        //     this.studentsInfoArr = res.docs.map(d => d.data())
        // })

        const query: QueryFn = (ref: CollectionReference) =>
            ref
                .where('nominateMeta.institutionId', '==', institutionId)
                .where('studentMeta.grade', 'in', [String(grade), Number(grade)]);

        this.contestNominationService.getQueryWithGet(query).subscribe((res) => {
            this.studentsInfoArr = res.docs.map(d => d.data());
        });


    }

    async onClickEdit(studentInfo) {
        if (this.today > this.nominationStartDate) {
            return;
        }
        await import('../add-nomination/add-nomination.module').then(() => {
            this.dialog.open(AddNominationComponent, {
                data: { newStudent: false, studentInfo: studentInfo }
            }).afterClosed().subscribe((res: any) => {

                this.studentsInfoArr;
                const i = this.studentsInfoArr.findIndex((doc => doc.docId == studentInfo.docId));
                this.studentsInfoArr[i].studentMeta.firstName = res.data.firstName;
                this.studentsInfoArr[i].studentMeta.lastName = res.data.lastName;
                this.studentsInfoArr[i].studentMeta.email = res.data.email;
                this.studentsInfoArr[i].studentMeta.gender = res.data.gender;
                this.studentsInfoArr[i].studentMeta.age = res.data.age;
            });

            // this.uiService.alertMessage('Successful','Info Updated Successfully','success')
        });
    }

    // toggleList(event, studentInfo) {
    //     let obj = {
    //         nominateMeta: {
    //             confirm: event.checked
    //         }
    //     }
    //     const contestColName = this.currentContest.contestTitle.replace(
    //         /\s/g,
    //         ''
    //     );
    //     if (contestColName == 'RamanAward2024') {
    //         this.ramanAwardService.updateDoc(obj, studentInfo.docId, contestColName).catch(err => {

    //         })
    //     }
    //     else {
    //         this.ramanAwardService.updateDoc(obj, studentInfo.docId, 'RamanAward2023').catch(err => {
    //         })

    //     }

    // }

    onDelete(studentInfo) {
        const stageVariables = this.currentContest.stagesNames.reduce((result, stage) => {
            result[`stage_${stage.stageId}_nominated`] = stage.stageId == this.activateRoute.snapshot.queryParams.stageId ? true : false;
            return result;
        }, {});
        const { firstName, lastName } = studentInfo?.studentMeta;
        const config = {
            title: 'Remove Nominee',
            message: `Are you sure you want to remove the nomination of the student "${firstName} ${lastName}?"`,
            icon: {
                name: 'mat_outline:delete'
            }
        };

        const dialogRef = this.fuseConfirmationService.open(config);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                const value = {
                    docId: studentInfo.docId,
                    id: studentInfo.docId,
                    updatedAt: serverTimestamp(),
                    studentMeta: {
                        ...studentInfo.studentMeta,
                        ...stageVariables,
                        updatedAt: serverTimestamp()
                    }
                };
                this.contestNominationService.updateWidthoutMerge(value, studentInfo.docId).catch((err) => {
                    console.error(err);
                }).then(async () => {
                    await this.updateNominationNumber(studentInfo.studentMeta.grade, studentInfo.nominateMeta.institutionId);
                    const i = this.studentsInfoArr.findIndex((doc => doc.docId == studentInfo.docId));
                    this.studentsInfoArr.splice(i, 1);
                    this.uiService.alertMessage('Successful', 'Nominee Deleted Successfully', 'success');
                });

            }
        });
    }

    updateNominationNumber(grade, institutionId) {

        const query: QueryFn = (ref: CollectionReference) => ref.where('nominateMeta.institutionId', '==', institutionId).where('studentMeta.grade', '==', Number(grade));

        this.contestNominationService.getWithQuery(query).subscribe((res) => {
            const doc = {
                nominationsByClasses: {
                    [grade]: Number(res.length)
                }
            };
            return this.contestService.updateInstitutionDoc(institutionId, this.currentContest.docId, doc);
        });
    }

    matTooltip(operation: string) {
        if (this.today > this.nominationEndDate) {
            const day = this.nominationEndDate.getDate();
            const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.nominationEndDate);
            const year = this.nominationEndDate.getFullYear();
            return `Nominations for this stage ended on the ${day}th of ${month}, ${year}; no ${operation} are possible at this time`;
                } else if (this.today < this.nominationStartDate) {
            const day = this.nominationStartDate.getDate();
            const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(this.nominationStartDate);
            const year = this.nominationStartDate.getFullYear();
            return `Nominations for this stage will start on the ${day}th of ${month}, ${year}; no ${operation} are possible at this time`;
        }
    }

    async openSubmissionStepDialog(st: any) {
        await import('app/modules/contest-interaction/contest-interaction.module');
        const { ContestInteractionComponent } = await import(
            'app/modules/contest-interaction/contest-interaction.component'
        );

        const qp = this.activatedRoute.snapshot.queryParams;

        this.dialog.open(ContestInteractionComponent, {
            panelClass: 'ci-dialog-pane',   // <— use this class name
            autoFocus: false,
            disableClose: true,
            width: '700px',
            maxWidth: '80vw',
            height: '20vh',
            data: {
                studentInfo: st,
                queryParams: {
                    contestId: qp['contestId'],
                    stageId: qp['stageId'],
                    submId: this.stageSubmissionId,
                    studentId: st?.docId
                }
            }
        });
    }

}
