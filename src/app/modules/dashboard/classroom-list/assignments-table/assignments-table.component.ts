import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { Timestamp } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { QuizReplayComponent } from 'app/modules/assignments-quiz/quiz-replay/quiz-replay.component';
import { UploadReplayComponent } from 'app/modules/assignments-upload/upload-replay/upload-replay.component';
import { QuizComponent } from 'app/modules/quiz/quiz.component';
import { ApexChart, ApexLegend, ApexNonAxisChartSeries, ApexResponsive } from 'ng-apexcharts';
import { first, firstValueFrom, lastValueFrom } from 'rxjs';


export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  responsive: ApexResponsive[];
  labels: any;
  legend: ApexLegend;
  colors;
  dataLabels;
};
@Component({
  selector: 'app-assignments-table',
  templateUrl: './assignments-table.component.html',
  styleUrls: ['./assignments-table.component.scss']
})
export class AssignmentsTableComponent implements OnInit, OnDestroy {
  @Input() currentTeacherInfo;
  @Input() assignmentData;

  public chartOptions: Partial<ChartOptions>;
  assignmentInfoArr = [];
  params: any;
  unsubscribe: any = [];
  assignmentObject: any;
  currentDate;
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    public dialog: MatDialog,
    private assignmentService: AssignmentsService,
    private luService: LearningUnitsService,
    private programmeService: ProgrammeService,
    private studentService: StudentsService,
    private userService: UserService,
  ) {
    this.chartOptions = {
      series: [33, 77],
      chart: {
        width: 80,
        type: 'pie'
      },
      legend: {
        show: false
      },
      labels: ['Submitted', 'Not Submitted'],
      colors: ['#179AD7', '#7fcdf1'],
      dataLabels: {
        enabled: false,
      },
      //   responsive: [
      //   {
      //     breakpoint: 480,
      //     options: {
      //       dataLabels: {
      //         enabled: true,
      //       }
      //     }
      //   }
      // ]
    };
  }

  ngOnDestroy(): void {
    this.unsubscribe.forEach(e => e.unsubscribe());
  }

  async ngOnInit(): Promise<void> {
    this.currentDate = Timestamp.fromDate(new Date());

    this.assignmentService.assignmentList.subscribe(async (res) => {
      if (res) {
        // this.assignmentObject.assignments = res
        this.assignmentInfoArr = res;
        this.assignmentInfoArr.map((d: any) => {
          d['assignmentExpired'] = this.currentDate?.seconds > d.assignmentDueDate?.seconds;
        });
      }
    });


    //  console.log(this.assignmentInfoArr)


    this.params = await lastValueFrom(this.route.queryParams.pipe(first()));
    // this.getAllAssignments()
  }


  async getAllAssignments() {
    // console.log(this.assignmentData)
    //this.assignmentInfoArr = this.assignmentData;
  }

  async getAllStudentSubmissions() {
    // get all students having attemptedAssignments
    const query: QueryFn = (ref: CollectionReference) => ref.where('attemptedAssignments', '!=', '');
    const s: Array<any> = await firstValueFrom(await this.studentService.getWithQuery(query));
    // filter the students having classroomId from url
    const studentArr = await s.filter(student => Object.keys(student.classrooms).includes(this.params.classroomId));
    return studentArr;
  }

  async viewSubmission(assignmentDoc: any) {
    const { institutionId, classroomId, programmeId } = this.params;
    const studentArr = await this.getAllStudentSubmissions();

    // for workflow level assignments
    if (assignmentDoc.hasOwnProperty('assignmentId') && assignmentDoc.hasOwnProperty('learningUnitId') && assignmentDoc.hasOwnProperty('workflowId')) {
      this.learingUnitNameForBreadCrumbs(assignmentDoc?.learningUnitId);
      const currentTeacherInfo = {
        lastClickedAssignment: assignmentDoc.workflowId + assignmentDoc.assignmentId
      };
      this.userService.setTeacherInfo({ currentTeacherInfo });

      const initialArr = [];

      for (let i = 0; i < studentArr.length; i++) {
        const snapshot = await lastValueFrom(this.assignmentService.getResources(studentArr[i].docId, this.params));
        const sDoc: any = await snapshot.data();

        if (sDoc && sDoc.hasOwnProperty(`workflowId_${assignmentDoc.workflowId}`) && sDoc[`workflowId_${assignmentDoc.workflowId}`].hasOwnProperty(`assignmentId_${assignmentDoc.assignmentId}`)) {
          const initialObj: any = {
            submission: {
              ...sDoc
            },
            studentInfo: {
              ...studentArr[i].studentMeta,
              docId: studentArr[i].docId
            },
            assignment: {
              ...assignmentDoc,
              numberOfStudentSubmissions: Object.keys(sDoc.versions[`workflowId_${assignmentDoc.workflowId}`][`assignmentId_${assignmentDoc.assignmentId}`]).length
            }
          };
          initialArr.push(initialObj);
        };
      };

      this.assignmentService.assignmentsSub.next(initialArr);

      if (assignmentDoc.assignmentType === 'UPLOAD' || assignmentDoc.type === 'UPLOAD') {
        this.router.navigate(['dashboard', classroomId, 'upload-submissions'], { state: { submissionData: assignmentDoc }, queryParams: { institutionId, classroomId, programmeId, assignmentId: assignmentDoc.assignmentId, workflowId: assignmentDoc.workflowId } });
      };

      if (assignmentDoc.assignmentType === 'QUIZ' || assignmentDoc.type === 'QUIZ') {
        this.router.navigate(['dashboard', classroomId, 'quiz-submissions'], { state: { submissionData: assignmentDoc }, queryParams: { institutionId, classroomId, programmeId, assignmentId: assignmentDoc.assignmentId, workflowId: assignmentDoc.workflowId } });
      };
    } else if (assignmentDoc.hasOwnProperty('docId')) {
      // for programme level assignments
      const programme: any = await lastValueFrom(this.programmeService.getProgrammeDocByIdOnce(this.params.programmeId));
      assignmentDoc = {
        ...assignmentDoc,
        assignmentDueDate: programme.get('assignmentIds')?.[assignmentDoc?.docId]?.assignmentDueDate,
        assignmentId: assignmentDoc?.docId,
        assignmentName: assignmentDoc?.displayName,
        assignmentType: assignmentDoc?.type,
      };

      const initialArr = [];

      for (let i = 0; i < studentArr.length; i++) {
        const snapshot = await lastValueFrom(this.assignmentService.getResources(studentArr[i].docId, this.params));
        const sDoc: any = await snapshot.data();

        if (sDoc && sDoc.hasOwnProperty(`programmeId_${this.params.programmeId}`) && sDoc[`programmeId_${this.params.programmeId}`].hasOwnProperty(`assignmentId_${assignmentDoc.docId}`)) {
          const initialObj: any = {
            submission: {
              ...sDoc
            },
            studentInfo: {
              ...studentArr[i].studentMeta,
              docId: studentArr[i].docId
            }, assignment: {
              ...assignmentDoc,
              numberOfStudentSubmissions: Object.keys(sDoc.versions[`programmeId_${this.params.programmeId}`][`assignmentId_${assignmentDoc.docId}`]).length
            }
          };
          initialArr.push(initialObj);
        };
      };

      this.assignmentService.assignmentsSub.next(initialArr);

      if (assignmentDoc.assignmentType === 'UPLOAD' || assignmentDoc.type === 'UPLOAD') {
        this.router.navigate(['dashboard', classroomId, 'upload-submissions'], { state: { submissionData: assignmentDoc }, queryParams: { institutionId, classroomId, programmeId, assignmentId: assignmentDoc.assignmentId } });
      };

      if (assignmentDoc.assignmentType === 'QUIZ' || assignmentDoc.type === 'QUIZ') {
        this.router.navigate(['dashboard', classroomId, 'quiz-submissions'], { state: { submissionData: assignmentDoc }, queryParams: { institutionId, classroomId, programmeId, assignmentId: assignmentDoc.assignmentId } });
      };
    };
  }

  async learingUnitNameForBreadCrumbs(id) {
    const doc = await lastValueFrom(this.luService.get(id));
    this.luService.currentLearningUnitsName.next(doc?.displayName);
  }

  async viewAssignment(assignmentDoc: any) {
    if (assignmentDoc.type === 'QUIZ') {
      assignmentDoc.questions = assignmentDoc.questionsData;
      // await import('../../../quiz/quiz.module');
      // this.dialog.open(QuizComponent, {
      await import('../../../assignments-quiz/quiz-replay/quiz-replay.module');
      this.dialog.open(QuizReplayComponent, {
        data: {
          quizInfo: assignmentDoc,
          parent: 'ntable'
        }
      });
    };

    if (assignmentDoc.type === 'UPLOAD') {
      assignmentDoc.assignmentDueDate = assignmentDoc.dueDate;
      await import('../../../assignments-upload/upload-replay/upload-replay.module');
      this.dialog.open(UploadReplayComponent, {
        data: {
          uploadInfo: { submissionId_1: {}, submissionId_2: {} },
          assignment: assignmentDoc,
          parent: 'ntable'
        }
      });
    };
  }

  compareDate(d: any) {
    this.assignmentInfoArr.map((d: any) => {
      console.log(d.assignmentDueDate);
    });
  }

}
