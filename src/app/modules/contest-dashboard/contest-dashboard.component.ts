import { Component, OnInit } from '@angular/core';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { first, lastValueFrom, take } from 'rxjs';
import { ContestDashboardService } from './contest-dashboard.service';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';
import { CustomAuthenticationService } from 'app/core/dbOperations/customAuthentication/customAuthentication.service';
import { MatDialog } from '@angular/material/dialog';
import { ContestReviewDialogComponent } from '../contest-review-dialog/contest-review-dialog.component';
import { ContestNominationsService } from 'app/core/dbOperations/contestNominations/contestNominations.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { FormDisplayComponent } from 'app/shared/components/form-display/form-display.component';

@Component({
    selector: 'app-contest-dashboard',
    templateUrl: './contest-dashboard.component.html',
    styleUrls: ['./contest-dashboard.component.scss'],
})
export class ContestDashboardComponent implements OnInit {
    contestInfo: any;
    filteredSchool: any;
    allSchools: any;
    stageInfo;
    selectedClassroomType;
    studentsAllData;
    submissionColumns = [];
    selectedInstitution;
    areStudentsAvailable = false;
    contestSubmissions = [];
    selectedInstitutionId: any;
    studentsDataForFilter: any[];
    isInstituteDisabled = false;
    currentUser;
    accessLevelNine = false;
    teacher;

    constructor(
        private drawerService: FuseDrawerService,
        public contestDashboardService: ContestDashboardService,
        private masterService: MasterService,
        private contestWorkflowService: ContestWorkflowService,
        private studentService: StudentsService,
        private customAuthService: CustomAuthenticationService,
        private dialog: MatDialog,
        private contestNominationsService: ContestNominationsService,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private teacherService: TeacherService
    ) { }

    async ngOnInit(): Promise<void> {
        this.drawerService.drawerOpenSubject.subscribe((res) => {
            if (res) {
                this.studentsDataForFilter = [];
                this.selectedInstitutionId = '';
                this.contestSubmissions = [];
                this.areStudentsAvailable = false;
                this.selectedInstitution = '';
                this.submissionColumns = [];
                this.selectedClassroomType = '';
                this.stageInfo = '';
                this.allSchools = '';
                this.filteredSchool = '';
                this.contestInfo = '';
                this.getContestData();
                this.getAllInstitutes();
                this.isInstituteDisabled = false;

                if (this.contestDashboardService.selectedInstitution) {
                    const school = this.contestDashboardService.selectedInstitution;
                    this.selectedInstitution = school.institutionName;
                    this.onSelectSchool(school);
                    this.isInstituteDisabled = true;
                }
            }
        });

        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
        const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
        this.currentUser = currentUser;
        if (this.currentUser.accessLevel <= 9) {
            this.accessLevelNine = true;
            // this.filteredSchool =
        }


        // Get teacher document by UID
        const teacherDoc = await lastValueFrom(this.teacherService.getWithId(user?.uid));
        this.teacher = teacherDoc;

    }

    drawerClose() {
        this.drawerService.drawerOpenSubject.next(false);
        this.contestDashboardService.isNominationDashBoard = false;
        this.contestDashboardService.selectedInstitution = '';
        this.contestDashboardService.isSpectatorIsATeacher = false;
        // this.isNominationDashBoard = false;
        // this.contestDashboardService.isNominationDashBoard = false;
    }

    getContestData() {
        this.contestInfo = this.contestDashboardService.contestInfo;
    }

    onSelectSchool(school) {
        this.selectedInstitutionId = school.docId;
        this.submissionColumns = [];
        this.contestSubmissions = [];
        this.contestNominationsService.setContestId(this.contestInfo.docId);
    }

    // getAllInstitutes() {
    //     this.masterService
    //         .getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames')
    //         .pipe(take(1))
    //         .subscribe((res) => {
    //             console.log(res);
    //             this.filteredSchool = res;
    //             this.allSchools = JSON.parse(
    //                 JSON.stringify(this.filteredSchool)
    //             );
    //         });


    // }

    getAllInstitutes() {
        this.masterService
            .getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames')
            .pipe(take(1))
            .subscribe((res) => {
                if (this.currentUser && this.currentUser.accessLevel <= 9 && this.teacher?.classrooms) {
                    const classroomInstitutionIds = Object.values(this.teacher.classrooms)
                        .map((c: any) => c.institutionId)
                        .filter(Boolean);

                    // Remove duplicates
                    const uniqueInstitutionIds = Array.from(new Set(classroomInstitutionIds));

                    this.filteredSchool = res.filter(
                        (school: any) =>
                            uniqueInstitutionIds.includes(school.docId) ||
                            uniqueInstitutionIds.includes(school.institutionId)
                    );
                    this.allSchools = JSON.parse(JSON.stringify(this.filteredSchool));

                    // If only one institution, patch and disable
                    if (uniqueInstitutionIds.length === 1 && this.filteredSchool.length === 1) {
                        this.selectedInstitution = this.filteredSchool[0].institutionName;
                        this.onSelectSchool(this.filteredSchool[0]);
                        this.isInstituteDisabled = true;
                    } else {
                        this.isInstituteDisabled = false;
                    }
                } else {
                    this.filteredSchool = res;
                    this.allSchools = JSON.parse(JSON.stringify(this.filteredSchool));
                    this.isInstituteDisabled = false;
                }
            });
    }

    institutionSearchInput(event) {
        this.filteredSchool = [];
        const searchTerm = event.target.value;
        if (searchTerm && searchTerm.trim() != '') {
            this.allSchools.forEach((school) => {
                if (
                    school?.institutionName
                        ?.toLowerCase()
                        ?.includes(event.target.value.toLowerCase())
                ) {
                    this.filteredSchool.push(school);
                }
                event.target.value;
            });
        } else {
            this.filteredSchool = this.allSchools;
        }
    }

    async onStageSelect(stageInfo) {
        this.contestSubmissions = [];
        this.studentsDataForFilter = [];
        if (stageInfo.submissions.length) {
            this.submissionColumns = [];

            const subArray = [];
            await Promise.all(stageInfo.submissions.map(async (submission, index) => {
                const workflowId = submission.workflowId;

                // if (workflowId) {
                //     const workflowData: any = await this.contestWorkflowService.getDocDataByDocId(workflowId);
                //     const firstKey = Object.keys(workflowData.contestSteps)[0];

                //     const columns = workflowData.contestSteps[firstKey].steps
                //         .filter((step: any) => step.type === 'ASSIGNMENT' && step?.showStepInSubmissionDashboard === true) // Filter steps where type is 'ASSIGNMENT'
                //         .flatMap((step: any) =>
                //             step.contents
                //                 .filter((content: any) => content.contentType === 'ASSIGNMENT') // Filter contents where contentType is 'ASSIGNMENT'
                //                 .map((content: any, index: number) => ({
                //                     isMoreThanOneContent: step.contents.length > 1,
                //                     assignmentId: content.assignmentId,
                //                     contestStepName: step.contents.length > 1
                //                         ? `${step.contestStepName}-${index + 1}`
                //                         : step.contestStepName,
                //                 }))
                //         );

                //     const subObj = {
                //         title: `${submission?.displayName}`,
                //         submissionId: submission.submissionId,
                //         columns: columns,
                //     };

                //     this.submissionColumns.push(subObj);
                // }
                if (workflowId) {
                    const workflowData: any = await this.contestWorkflowService.getDocDataByDocId(workflowId);

                    const allKeys = Object.keys(workflowData.contestSteps);
                    let columns = [];

                    allKeys.forEach(key => {
                        const stepsForKey = workflowData.contestSteps[key].steps
                            .filter((step: any) => step.type === 'ASSIGNMENT' && step?.showStepInSubmissionDashboard === true)
                            .flatMap((step: any) =>
                                step.contents
                                    .filter((content: any) => content.contentType === 'ASSIGNMENT')
                                    .map((content: any, idx: number) => ({
                                        isMoreThanOneContent: step.contents.length > 1,
                                        assignmentId: content.assignmentId,
                                        contestStepName: step.contents.length > 1
                                            ? `${step.contestStepName}-${idx + 1}`
                                            : step.contestStepName,
                                    }))
                            );
                        columns = columns.concat(stepsForKey);
                    });

                    // Remove duplicates by contestStepName
                    columns = columns.filter((col, index, self) =>
                        index === self.findIndex((c) => c.contestStepName === col.contestStepName)
                    );

                    const subObj = {
                        title: `${submission?.displayName}`,
                        submissionId: submission.submissionId,
                        columns: columns,
                    };

                    this.submissionColumns.push(subObj);
                }
            }));

        }
        this.getAllStudents(this.submissionColumns, stageInfo);
    }

    async getAllStudents(submissionInfo, stageInfo) {
        const contestIdRef = `contestId_${this.contestInfo.docId}`;
        const stageIdRef = `stageId_${stageInfo.stageId}`;
        const participantesQuery: QueryFn = (ref: CollectionReference) =>
            ref.where('studentMeta.institutionId', '==', this.selectedInstitutionId);

        const participants = await lastValueFrom(this.contestNominationsService.getWithQuery(participantesQuery));
        participants.forEach(async (student) => {
            const studentsInfo = await lastValueFrom(this.studentService.getWithId(student.docId));
            if (studentsInfo?.contestSubmissions?.[contestIdRef]?.[stageIdRef]) {
                const contestData: any = await lastValueFrom(this.studentService.getContestDataOfStudent(student.docId, this.contestInfo.docId));
                const studentAuthInfo = await lastValueFrom(this.customAuthService.getByIdOnce(student.docId));

                const contestSubmissions = [];

                const submissionMeta = contestData.get('submissionMeta');
                const latestSubmission = submissionMeta.reduce((latest, current) => {
                    const latestTime = latest.submissionTime.seconds * 1e9 + latest.submissionTime.nanoseconds;
                    const currentTime = current.submissionTime.seconds * 1e9 + current.submissionTime.nanoseconds;
                    return currentTime > latestTime ? current : latest;
                });

                const stageRef = contestData.data()?.[`stageId-${stageInfo.stageId}`];
                const submissionObj = {};

                submissionInfo.forEach((submission: any) => {
                    const subArr = [];
                    submission.columns.forEach((sub: any) => {
                        const { submissionId } = submission;
                        const { assignmentId } = sub;
                        const subObj = {};
                        const data = stageRef?.[`submId-${submissionId}`]?.[`assignmentId-${assignmentId}`];

                        // if (data?.hasOwnProperty('questions') || data?.hasOwnProperty('questionsData')) {
                        //     subObj['submission'] = data;
                        //     subObj['type'] = 'QUIZ';
                        //     subObj['contestStepName'] = sub?.contestStepName;
                        // }
                        // else {
                        //     subObj['type'] = 'MEDIA';
                        //     subObj['submission'] = data ? Object.values(data) : [];
                        //     subObj['contestStepName'] = sub?.contestStepName;
                        // }
                        // if (data?.hasOwnProperty('innovationVideoLink')) {
                        //     subObj['type'] = 'VIDEO';
                        //     subObj['submission'] = data;
                        //     subObj['contestStepName'] = sub?.contestStepName;
                        // }
                        // // const formFieldNames = ['additionalLanguage', 'category', 'description', 'materialUsed', 'subject', 'title', 'topic'];
                        // const formFieldNames = ['instructions', 'questions'];
                        // if (formFieldNames.every(fieldName => data?.hasOwnProperty(fieldName))) {
                        //     subObj['type'] = 'FORM';
                        //     subObj['submission'] = data;
                        //     subObj['contestStepName'] = sub?.contestStepName;
                        //     subObj['submissionId'] = submissionId;
                        //     subObj['assignmentId'] = assignmentId;
                        // }

                        // Fallback: Check for video under all video ID variants ONLY for video assignments
                        let finalData = data;
                        const videoIdVariants = ['junior_video_id', 'intermediate_video_id', 'senior_video_id'];
                        const submIdData = stageRef?.[`submId-${submissionId}`];

                        const isVideoAssignment = sub.contestStepName?.toLowerCase().includes('video') ||
                            videoIdVariants.includes(assignmentId);

                        if (isVideoAssignment && submIdData && !data?.hasOwnProperty('innovationVideoLink')) {
                            for (const videoId of videoIdVariants) {
                                const videoData = submIdData[`assignmentId-${videoId}`];
                                if (videoData?.hasOwnProperty('innovationVideoLink')) {
                                    finalData = videoData;
                                    break;
                                }
                            }
                        }// Fallback: Check for quiz data if this is a quiz assignment and no data found
                        const isQuizAssignment = sub.contestStepName?.toLowerCase().includes('quiz');
                        if (isQuizAssignment && submIdData && !finalData?.hasOwnProperty('maxScore')) {
                            // Search through all assignmentIds for quiz data
                            const allAssignmentKeys = Object.keys(submIdData);
                            for (const key of allAssignmentKeys) {
                                const potentialQuizData = submIdData[key];
                                if (potentialQuizData?.hasOwnProperty('maxScore') && potentialQuizData?.hasOwnProperty('studentScore')) {
                                    finalData = potentialQuizData;
                                    break;
                                }
                            }
                        }

                        if (finalData) {
                            if (finalData.hasOwnProperty('innovationVideoLink')) {
                                subObj['type'] = 'VIDEO';
                                subObj['submission'] = finalData;
                                subObj['contestStepName'] = sub?.contestStepName;
                            } else if (finalData.hasOwnProperty('maxScore') && finalData.hasOwnProperty('studentScore')) {
                                subObj['submission'] = finalData;
                                subObj['type'] = 'QUIZ';
                                subObj['contestStepName'] = sub?.contestStepName;
                            } else if (JSON.stringify(finalData).includes('submissionPath') && !finalData.hasOwnProperty('instructions')) {
                                subObj['type'] = 'MEDIA';
                                subObj['submission'] = Object.values(finalData);
                                subObj['contestStepName'] = sub?.contestStepName;
                            } else if (finalData.hasOwnProperty('instructions') && finalData.hasOwnProperty('questions')) {
                                subObj['type'] = 'FORM';
                                subObj['submission'] = finalData;
                                subObj['contestStepName'] = sub?.contestStepName;
                                subObj['submissionId'] = submissionId;
                                subObj['assignmentId'] = assignmentId;
                            }
                        }
                        contestSubmissions.push(subObj);
                        subArr.push(subObj);
                    });
                    submissionObj[submission.submissionId] = subArr;
                });
                this.contestSubmissions.push({ ...student, contestSubmissions, authInfo: studentAuthInfo.data() ? studentAuthInfo.data() : {}, submissionMeta: latestSubmission, eachSubmissionData: submissionObj });
                this.studentsDataForFilter = this.contestSubmissions;
            }
        });
        this.areStudentsAvailable = true;
    }

    async displayForm(submission: any, student: any) {
        await import("../../shared/shared.module");
        this.dialog.open(FormDisplayComponent, { data: { contestId: this.contestInfo.docId, stageId: this.stageInfo.stageId, studentId: student.docId, submId: submission.submissionId, assignmentId: submission.assignmentId, ...submission }, disableClose: true, maxHeight: "80vh", maxWidth: "50vw" });
    }

    search(event) {
        this.contestSubmissions = [];
        const searchTerm = event.target.value;
        if (searchTerm && searchTerm.trim() != '') {
            this.contestSubmissions = this.studentsDataForFilter.filter(
                student => (
                    student.studentMeta.firstName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    student.studentMeta.lastName
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase()) ||
                    (student.studentMeta.countryCode + student.studentMeta.phoneNumber)
                        .toString()
                        .toLowerCase()
                        .includes(searchTerm)
                )
            );
        } else {
            this.contestSubmissions = this.studentsDataForFilter;
        }

    }

    reviewSubmission(student: any) {
        import('../contest-review-dialog/contest-review-dialog.module').then(m => m.ContestReviewDialogModule);
        this.dialog.open(ContestReviewDialogComponent, {
            data: {
                studentSubmission: student?.contestSubmissions,
                contestDetails: this.contestInfo,
                submissionDetails: this.submissionColumns,
                selectedStageData: this.stageInfo,
                submissionMeta: student?.submissionMeta,
                studentId: student?.docId,
                eachSubmissionData: student?.eachSubmissionData
            },
            disableClose: true,
        });
    }

    onReview() {
        const randomNumber = Math.floor(Math.random() * (this.contestSubmissions.length - 1));
        const student = this.contestSubmissions[randomNumber];
        this.reviewSubmission(student);
    }

}
