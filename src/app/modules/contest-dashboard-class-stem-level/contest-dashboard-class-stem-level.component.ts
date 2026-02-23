import { Component, OnInit } from '@angular/core';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { ContestDashboardService } from '../contest-dashboard/contest-dashboard.service';
import { lastValueFrom, take } from 'rxjs';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { CustomAuthenticationService } from 'app/core/dbOperations/customAuthentication/customAuthentication.service';
import { MatDialog } from '@angular/material/dialog';
import { ContestReviewDialogComponent } from '../contest-review-dialog/contest-review-dialog.component';
import { environment } from 'environments/environment';
import { FormDisplayComponent } from 'app/shared/components/form-display/form-display.component';
import { ContestNominationsService } from 'app/core/dbOperations/contestNominations/contestNominations.service';

@Component({
  selector: 'app-contest-dashboard-class-stem-level',
  templateUrl: './contest-dashboard-class-stem-level.component.html',
  styleUrls: ['./contest-dashboard-class-stem-level.component.scss']
})
export class ContestDashboardClassStemLevelComponent implements OnInit {
  contestInfo: any;
  filteredSchool: any;
  allSchools: any;
  stageInfo;
  classroomTypes = ['Classroom', 'STEM-Club'];
  selectedClassroomType;
  studentsAllData;
  submissionColumns = [];
  selectedInstitution;
  areStudentsAvailable = false;
  contestSubmissions = [];
  selectedInstitutionId: any;
  studentsDataForFilter: any[];
  environment = environment;

  constructor(
    private drawerService: FuseDrawerService,
    private contestDashboardService: ContestDashboardService,
    private masterService: MasterService,
    private contestWorkflowService: ContestWorkflowService,
    private studentService: StudentsService,
    private customAuthService: CustomAuthenticationService,
    private dialog: MatDialog,
    private contestNominationService: ContestNominationsService
  ) { }

  ngOnInit(): void {
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
      }
    });
  }

  drawerClose() {
    this.drawerService.drawerOpenSubject.next(false);
    this.contestDashboardService.isNominationDashBoard = false;
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
  }

  onSelectType(type) {
    this.submissionColumns = [];
    this.contestSubmissions = [];
  }

  getAllInstitutes() {
    const contestData = this.contestDashboardService.contestInfo;
    const institutionIds = Object.keys(contestData.contestVisibilityToInstitutions);

    this.masterService
      .getAllMasterDocsMapAsArray('INSTITUTE', 'institutionNames')
      .pipe(take(1))
      .subscribe((res) => {
        this.filteredSchool = res;
        this.allSchools = JSON.parse(
          JSON.stringify(this.filteredSchool)
        );
        this.filteredSchool = this.filteredSchool.filter(school => institutionIds.includes(school.docId));
      });
  }

  institutionSearchInput(event) {
    this.filteredSchool = [];
    const searchTerm = event.target.value;
    if (searchTerm && searchTerm.trim() != '') {
      this.allSchools.forEach((school) => {
        if (
          school?.institutionName?.toLowerCase()?.includes(event.target.value.toLowerCase())
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
    this.submissionColumns = [];
    this.contestSubmissions = [];

    if (stageInfo.submissions.length) {
      this.submissionColumns = [];

      const subArray = [];
      await Promise.all(stageInfo.submissions.map(async (submission, index) => {
        const workflowId = submission.workflowId;
        if (workflowId) {
          const workflowData: any = await this.contestWorkflowService.getDocDataByDocId(workflowId);
          // const firstKey = Object.keys(workflowData.contestSteps)[0];
          // const columns = workflowData.contestSteps[firstKey].steps
          //   .filter((step: any) => step?.showStepInSubmissionDashboard === true)
          //   .flatMap((step: any) => {
          //     const filteredContents = (step.contents || [])
          //     return filteredContents.map((content: any, index: number) => ({
          //       isMoreThanOneContent: filteredContents.length > 1,
          //       assignmentId: content.assignmentId,
          //       contestStepName: filteredContents.length > 1
          //         ? `${step.contestStepName}-${index + 1}`
          //         : step.contestStepName,
          //     }));
          //   });

          // const subObj = {
          //   title: `${submission?.displayName}`,
          //   submissionId: submission.submissionId,
          //   columns: columns,
          // };

          // this.submissionColumns.push(subObj);


          const allKeys = Object.keys(workflowData.contestSteps);
          let columns = [];

          allKeys.forEach(key => {
            const stepsForKey = workflowData.contestSteps[key].steps
              .filter((step: any) => step?.showStepInSubmissionDashboard === true)
              .flatMap((step: any) => {
                const filteredContents = (step.contents || []);
                return filteredContents.map((content: any, idx: number) => ({
                  isMoreThanOneContent: filteredContents.length > 1,
                  assignmentId: content.assignmentId,
                  contestStepName: filteredContents.length > 1
                    ? `${step.contestStepName}-${idx + 1}`
                    : step.contestStepName,
                }));
              });
            columns = columns.concat(stepsForKey);
          });

          // Remove duplicates by contestStepName (keep first occurrence)
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

    const clsMap = {
      'Classroom': 'classroomName',
      'STEM-Club': 'stemClubName'
    };

    const institutionInfo = this.contestInfo.contestVisibilityToInstitutions[this.selectedInstitutionId];

    if (institutionInfo) {
      const classrooms = Object.values(institutionInfo.classrooms);
      const filteredClassrooms = classrooms.filter((cls) => {
        if (cls.hasOwnProperty(clsMap[this.selectedClassroomType])) {
          return cls;
        }
      });

      const allStudents = [];
      // 1) Fetch students across all filtered classrooms
      const studentsFromClassesArrays = await Promise.all(filteredClassrooms.map(async (cls: any) => {
        const query: QueryFn = (ref: CollectionReference) =>
          ref.where(`classrooms.${cls.classroomId}.classroomId`, '==', cls.classroomId);
        const res = await lastValueFrom(this.studentService.getWithQuery(query));
        return res || [];
      }));
      const studentsFromClasses = ([] as any[]).concat(...studentsFromClassesArrays);

      // 2) Fetch students via institution nominations (fallback). Include docId explicitly.
      const nominationsSnap: any = await lastValueFrom(
        this.contestNominationService
          .getQueryByFields(this.contestInfo.docId, 'studentMeta.institutionId', institutionInfo.institutionId)
          .pipe(take(1))
      );
      const studentsFromInstitution = nominationsSnap?.docs?.length
        ? await Promise.all(
          nominationsSnap.docs.map(async (doc: any) => {
            const studentSnap = await lastValueFrom(this.studentService.getStudentByIdOnce(doc.id));
            const data = studentSnap.data();
            const isObject = data && typeof data === 'object';
            return isObject ? { ...(data as Record<string, any>), docId: doc.id } : null;
          })
        )
        : [];

      // 3) Merge unique by docId
      const uniqueStudentsMap = new Map<string, any>();
      [...studentsFromClasses, ...studentsFromInstitution]
        .filter(Boolean)
        .forEach((stu: any) => {
          const id = stu?.docId;
          if (id && !uniqueStudentsMap.has(id)) {
            uniqueStudentsMap.set(id, stu);
          }
        });

      const uniqueStudents = Array.from(uniqueStudentsMap.values());

      // 4) Process each unique student once
      if (uniqueStudents.length) {
        await Promise.all(uniqueStudents.map(async (student: any) => {
          if (student?.contestSubmissions?.[contestIdRef]?.[stageIdRef]) {
            const contestData: any = await lastValueFrom(this.studentService.getContestDataOfStudent(student.docId, this.contestInfo.docId));

            const studentAuthInfo = await lastValueFrom(this.customAuthService.getByIdOnce(student.linkUid));

            const contestSubmissions = [] as any[];

            const submissionMeta = contestData.get('submissionMeta');
            const latestSubmission = submissionMeta?.reduce((latest, current) => {
              const latestTime = latest.submissionTime.seconds * 1e9 + latest.submissionTime.nanoseconds;
              const currentTime = current.submissionTime.seconds * 1e9 + current.submissionTime.nanoseconds;
              return currentTime > latestTime ? current : latest;
            });

            const stageRef = contestData.data()?.[`stageId-${stageInfo.stageId}`];
            const submissionObj: any = {};
            submissionInfo.map((submission: any) => {
              const subArr = [] as any[];
              submission.columns.map((sub: any) => {
                const { submissionId } = submission;
                const { assignmentId } = sub;
                const subObj: any = {};
                const data = stageRef?.[`submId-${submissionId}`]?.[`assignmentId-${assignmentId}`];
                // if (data) {
                //   if (data.hasOwnProperty('questions')) {
                //     subObj['submission'] = data;
                //     subObj['type'] = 'QUIZ';
                //     subObj['contestStepName'] = sub?.contestStepName;
                //   }
                //   if (JSON.stringify(data).includes('submissionPath')) {
                //     subObj['type'] = 'MEDIA';
                //     subObj['submission'] = Object.values(data);
                //     subObj['contestStepName'] = sub?.contestStepName;
                //   }
                //   if (data.hasOwnProperty('innovationVideoLink')) {
                //     subObj['type'] = 'VIDEO';
                //     subObj['submission'] = data;
                //     subObj['contestStepName'] = sub?.contestStepName;
                //   }
                //   // const formFieldNames = ['additionalLanguage', 'category', 'description', 'materialUsed', 'subject', 'title', 'topic'];
                //   const formFieldNames = ['lastAttemptTime', 'questions', 'submissionPath'];
                //   if (formFieldNames.every(fieldName => data.hasOwnProperty(fieldName)) || JSON.stringify(data).includes('prompt')) {
                //     subObj['type'] = 'FORM';
                //     subObj['submission'] = data;
                //     subObj['contestStepName'] = sub?.contestStepName;
                //     subObj['submissionId'] = submissionId;
                //     subObj['assignmentId'] = assignmentId;
                //   }
                // } else {
                //   console.error('No submission data found');
                // };

                // Fallback: Check for video under all video ID variants ONLY for video assignments
                let finalData = data;
                const videoIdVariants = ['junior_video_id', 'intermediate_video_id', 'senior_video_id'];
                const submIdData = stageRef?.[`submId-${submissionId}`];

                // Only search for video variants if this is a video assignment AND no data found
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
                }

                // Fallback: Check for quiz data if this is a quiz assignment and no data found
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
                  }
                  else if (finalData.hasOwnProperty('maxScore') && finalData.hasOwnProperty('studentScore')) {
                    // QUIZ - has maxScore and studentScore
                    subObj['submission'] = finalData;
                    subObj['type'] = 'QUIZ';
                    subObj['contestStepName'] = sub?.contestStepName;
                  }
                  else if (JSON.stringify(finalData).includes('submissionPath') && !finalData.hasOwnProperty('questions')) {
                    subObj['type'] = 'MEDIA';
                    subObj['submission'] = Object.values(finalData);
                    subObj['contestStepName'] = sub?.contestStepName;
                  } else {
                    const formFieldNames = ['lastAttemptTime', 'questions', 'submissionPath'];
                    if (formFieldNames.every(fieldName => finalData.hasOwnProperty(fieldName)) || JSON.stringify(finalData).includes('prompt')) {
                      subObj['type'] = 'FORM';
                      subObj['submission'] = finalData;
                      subObj['contestStepName'] = sub?.contestStepName;
                      subObj['submissionId'] = submissionId;
                      subObj['assignmentId'] = assignmentId;
                    }
                  }
                } else {
                  console.error('No submission data found');
                };

                contestSubmissions.push(subObj);
                subArr.push(subObj);
              });
              submissionObj[submission.submissionId] = subArr;
            });

            this.contestSubmissions.push({ ...student, contestSubmissions, authInfo: studentAuthInfo.data() ? studentAuthInfo.data() : {}, submissionMeta: latestSubmission, eachSubmissionData: submissionObj });
            this.studentsDataForFilter = this.contestSubmissions;
          }
        }));
      } else {
        console.error('No students found');
      }

    };
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
        eachSubmissionData: student?.eachSubmissionData,
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
