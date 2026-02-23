import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';
import { ContestChallengeTypeDialogComponent } from '../contest-challenge-type-dialog.component';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { first, firstValueFrom, lastValueFrom } from 'rxjs';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { deleteField, Timestamp } from '@angular/fire/firestore';
import { merge } from 'lodash';
import { HttpClient } from '@angular/common/http';
import { error } from 'pdf-lib';
@Component({
    selector: 'app-review-contest',
    templateUrl: './review-contest.component.html',
    styleUrls: ['./review-contest.component.scss'],
})
export class ReviewContestComponent implements OnInit {
    @Input() isContestGradeclassroomdependent: boolean;
    @Input() contestBasicInfo;
    @Input() contestCategoryInfo;
    @Input() contestStagesInfo;
    @Input() contestVisibiltyInfo;
    @Input() contestInfo;
    @Input() selectedInstitutions: any[] = [];
    @Input() isUpdate;
    @Input() contestDocInfo;

    isupdate: boolean = false;

    btnDisable: boolean = false;
    teacherObj: any;
    user: any;

    constructor(
        private uiService: UiService,
        private contestService: ContestService,
        private dialogRef: MatDialogRef<ContestChallengeTypeDialogComponent>,
        private classroomService: ClassroomsService,
        private http: HttpClient,
        private afs: AngularFirestore,
        private afAuth: AngularFireAuth,
        private teacherService: TeacherService,
        private studentsService: StudentsService
    ) {}

    async ngOnInit(): Promise<void> {
        this.user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        // const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        // console.log(currentUser, 'currentUser');
        this.teacherObj = await firstValueFrom(
            this.teacherService.getTeacherByDocId(this.user.uid)
        );
        this.showCards();
        this.contestVisibiltyInfo = [...this.selectedInstitutions];
    }

    showCards() {
        const visibilityData =
            this.contestInfo?.contestVisibilityToInstitutions || {};
        this.selectedInstitutions = Object.values(
            visibilityData as Record<string, any>
        )
            .filter(
                (entry: any) =>
                    entry.institutionName && entry.pincode && entry.board
            )
            .reduce((acc: any[], entry: any) => {
                const existingCard = acc.find(
                    (card) =>
                        card.pincode === entry.pincode &&
                        card.board === entry.board
                );
                if (existingCard) {
                    // Make sure institutions array exists before pushing to it
                    if (!existingCard.institutions) {
                        existingCard.institutions = [];
                    }
                    existingCard.institutions.push({
                        institutionName: entry.institutionName,
                        docId: entry.institutionId,
                        pincode: entry.pincode,
                        classrooms: this.getClasses(entry.classrooms),
                    });
                } else {
                    acc.push({
                        pincode: entry.pincode,
                        board: entry.board,
                        institutionName: entry.institutionName,
                        docId: entry.institutionId,
                        classrooms: this.getClasses(entry.classrooms),
                        // Initialize the institutions array
                        institutions: [
                            {
                                institutionName: entry.institutionName,
                                docId: entry.institutionId,
                                pincode: entry.pincode,
                                classrooms: this.getClasses(entry.classrooms),
                            },
                        ],
                    });
                }
                return acc;
            }, [] as any[]);
    }

    getClasses(classrooms) {
        const obj = Object.keys(classrooms).map((key) => classrooms[key]);
        return obj;
    }

    getInstitutionNames(institutions: { institutionName: string }[]): string {
        return institutions.map((inst) => inst.institutionName).join(', ');
    }

    getClassrooms(classroomMap) {
        return classroomMap
            .map((d) => d.classroomName || d.stemClubName)
            .join(',');
    }

    async onSave(docId?) {
    this.btnDisable = true;
    try {
        // ---- Build categories (preserving your grade-image mapping & sort) ----
        const categories = this.contestCategoryInfo.categories.map((d: any) => {
            const grades = d.grades.map((grade: any) => ({
                grade: grade.grade,
                thumbImagePath: grade?.image?.thumbImagePath || null,
            }));
            return {
                categoryName: d.categoryName,
                grades: grades.sort((a, b) => a.grade - b.grade),
            };
        });

        // NOTE: your original outer `grades` array was unused & empty; removed.

        // ---- Blur flag handling (unchanged) ----
        const docIdToUse = docId || this.contestBasicInfo?.docId;
        const shouldBlurImages = this.contestBasicInfo?.isContestSubmissionImageNeedsToBeBlurred;
        if (docIdToUse && shouldBlurImages) {
            await this.updateContestsToBlurConfig(docIdToUse, shouldBlurImages);
        } else {
            console.error('Skipping blur function — missing docId or blur flag is false.');
        }

        // ---- Build ONLY the contestVisibilityToInstitutions map when dependent ----
        const contestVisibilityToInstitutions: { [key: string]: any } = {};
        if (this.isContestGradeclassroomdependent && this.contestVisibiltyInfo) {
            this.contestVisibiltyInfo.forEach((visibility: any) => {
                const obj = {
                    institutionName: visibility.institutionName || '',
                    institutionId: visibility.docId,
                    pincode: visibility.pincode,
                    board: visibility.board,
                    classrooms: {},
                };

                if (Array.isArray(visibility.classrooms)) {
                    visibility.classrooms.forEach((classroom: any) => {
                        obj.classrooms[classroom.docId] = classroom.stemClubName
                            ? { stemClubName: classroom.stemClubName, classroomId: classroom.docId }
                            : { classroomName: classroom.classroomName, classroomId: classroom.docId };
                    });
                }

                contestVisibilityToInstitutions[visibility.docId] = obj;
            });
        }
        // If not dependent, the map remains empty (as requested)

        // ---- Build the contest document payload (unchanged fields preserved) ----
        const contestDoc: any = {
            contestTitle: this.contestBasicInfo.contestTitle,
            contestSubtitle: this.contestBasicInfo.contestSubtitle,
            contestDescription: this.contestBasicInfo.contestDescription,
            contestEndUrl: this.contestBasicInfo.contestEndUrl,
            domain: this.contestBasicInfo.domain,
            type: this.contestBasicInfo.type,
            contestFullUrl: this.contestBasicInfo.contestFullUrl,
            creatorName: this.contestBasicInfo.creatorName,
            contestStartDate: new Date(this.contestBasicInfo.contestStartDate),
            contestEndDate: new Date(this.contestBasicInfo.contestEndDate),
            RegistrationStartdate: new Date(this.contestBasicInfo.RegistrationStartdate),
            RegistrationEnddate: new Date(this.contestBasicInfo.RegistrationEnddate),
            participantType: this.contestBasicInfo.participantType,
            isContestStepsLocked: this.contestBasicInfo.isContestStepsLocked,
            urlLink: this.contestBasicInfo.contestUrlLink,
            awardScheduleUrl: this.contestBasicInfo.contestawardScheduleUrl,
            senderName: this.contestBasicInfo.contestsenderName,
            isContestSubmissionImageNeedsToBeBlurred: this.contestBasicInfo.isContestSubmissionImageNeedsToBeBlurred,
            isRysiPartnerContest: this.contestBasicInfo.isRysiPartnerContest,
            contestLogosPath: this.contestBasicInfo.contestLogosPathArr.map((logo) => logo.contestLogoPath),
            contestType: this.contestBasicInfo.contestType,
            categories,
            // keep as-is to match your original shape
            grades: [], 
            contestVisibilityToInstitutions,
            stagesNames: this.contestStagesInfo.stages.map((stage) => {
                const commonFields = {
                    stageName: stage.stageName,
                    stageNumber: stage.stageNumber,
                    startDate: new Date(stage.startDate),
                    endDate: new Date(stage.endDate),
                    isDependentOtherStage: stage.isDependentOtherStage,
                    numberOfAllowedSubmissions: stage.numberOfAllowedSubmissions,
                    numberOfMinFemaleCandidates: stage.numberOfMinFemaleCandidates, 
                    numberOfMinMaleCandidates: stage.numberOfMinMaleCandidates,
                    stageId: stage.stageId,
                    submissions: stage.submissions,
                    [`stage_${stage.stageId}_result_date`]: new Date(stage.resultAwardDate),
                    isAllStepsMandatory: stage.isAllStepsMandatory,
                    rubricsName: stage.rubricsName ?? stage.chosenRubric ?? 'default',
                    rubricsValue: stage.rubricsValue ?? stage.chosenRubric ?? 'default',
                };
                if (stage.isNominationAllowed) {
                    return {
                        ...commonFields,
                        isNominationAllowed: true,
                        maximumNomination: stage.maximumNomination,
                        nominationStartDate: new Date(stage.nominationStartDate),
                        nominationEndDate: new Date(stage.nominationEndDate),
                    };
                }
                return { ...commonFields, isNominationAllowed: !!stage.isNominationAllowed };
            }),
        };

        contestDoc['docId'] = docIdToUse;

        // ---- WRITE: Only the main contest doc. No touching Contest_${docId} except reserved docs on first add. ----
        if (this.isUpdate && docId !== undefined) {
            contestDoc['docId'] = this.contestDocInfo.docId;
            contestDoc['createdAt'] = this.contestInfo.createdAt || new Date();
            await this.contestService.updatewithoutMerge(contestDoc, this.contestDocInfo.docId);
            this.uiService.alertMessage('Successfully', 'Contest has been Updated', 'success');
        } else {
            contestDoc['docId'] = this.contestDocInfo.docId;
            await this.contestService.addContestwithId(contestDoc, contestDoc['docId']);

            // Allowed: create reserved docs only (no student docs, no deletions)
            await this.createAdditionalContestDocs(contestDoc['docId']);

            this.uiService.alertMessage('Successfully', 'Contest has been Added', 'success');
        }

        this.dialogRef.close();
    } catch (e) {
        console.error('onSave failed', e);
        this.uiService.alertMessage('Error', 'Something went wrong while saving the contest.', 'error');
    } finally {
        this.btnDisable = false;
    }
}


    async createAdditionalContestDocs(docId: string) {
        const contestCollectionPath = `Contest_${docId}`;

        try {
            await Promise.all([
                this.afs
                    .collection(contestCollectionPath)
                    .doc('--InstitutionNomination--')
                    .set({}),
                this.afs
                    .collection(contestCollectionPath)
                    .doc('--TeacherAndLinkedInstitute--')
                    .set({}),
                this.afs
                    .collection(contestCollectionPath)
                    .doc('-Config-')
                    .set({}),
                this.afs
                    .collection(contestCollectionPath)
                    .doc('--trash--')
                    .set({docId: '--trash--'}),
            ]);
        } catch (err) {
            console.error('Failed to create docs ❌', err);
        }
    }

    async saveDocIdsToclassroom(
        docId,
        contestVisibilityToInstitutions,
        contestDoc
    ) {
        const classroompromises = Object.keys(
            contestVisibilityToInstitutions
        ).map((key) => {
            const classrooms = contestVisibilityToInstitutions[key].classrooms;
            Object.keys(classrooms).map((keyr) =>
                new Promise((resolve, reject) => {
                    const obj = {
                        linkedContestId: {
                            [docId]: {
                                docId: contestDoc.docId,
                                contestTitle: contestDoc.contestTitle,
                                status: 'active',
                            },
                        },
                    };

                    resolve(
                        this.classroomService.update(
                            obj,
                            classrooms[keyr].classroomId
                        )
                    );
                }).catch((err) => {
                    console.error(err);
                })
            );
        });
        await Promise.all(classroompromises).then((data) => {});
    }

    async updateContestsToBlurConfig(
        contestId: string,
        shouldBlur: boolean
    ): Promise<void> {
        if (!contestId || !shouldBlur) return;

        try {
            await this.afs
                .collection('Configuration')
                .doc('contestsToBlur')
                .set(
                    {
                        [contestId]: {
                            contestId,
                            shouldBlur: true,
                            updatedAt: new Date(),
                        },
                    },
                    { merge: true }
                );
        } catch (error) {
            console.error(
                `❌ Error updating contestsToBlur for ${contestId}`,
                error
            );
        }
    }
}
