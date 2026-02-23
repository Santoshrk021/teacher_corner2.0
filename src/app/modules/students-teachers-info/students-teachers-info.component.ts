import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ActivatedRoute, Router } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { combineLatest, firstValueFrom, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { UiService } from 'app/shared/ui.service';
import { NavigationService } from 'app/core/navigation/navigation.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { CustomAuthenticationService } from 'app/core/dbOperations/customAuthentication/customAuthentication.service';
import { CreateStudentCredentialDialogComponent } from '../create-student-credential-dialog/create-student-credential-dialog.component';
import { WorkflowsService } from 'app/core/dbOperations/workflows/workflows.service';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { environment } from 'environments/environment';
import { LuComplitionDialogComponent } from '../lu-complition-dialog/lu-complition-dialog.component';

@Component({
  selector: 'app-students-teachers-info',
  templateUrl: './students-teachers-info.component.html',
  styleUrls: ['./students-teachers-info.component.scss']
})
export class StudentsTeachersInfoComponent implements OnInit, OnDestroy {
  teacherInfoUi: boolean = false;
  studentInfo: any;
  teacherInfo: any;
  _unsubscribeAll: Subject<any> = new Subject<any>(); filteredStudentInfo: any;
  studentsAuthInfoUi: boolean = true;
  studentsWithAuthInfo: any;
  studentsWithOutAuthInfo: any;
  filteredStudentInfoWithOutAuth: any[];
  params: any;
  ;
  selectedClsId: any;
  selectedProgrammeId: any;
  selectedinstitutionId: any;
  isAdmin: boolean = false;
  passwordVisibility: { [key: string]: boolean } = {};

  teacherCompletionPercentage: any = {};
  studentCompletionPercentageNoAuth: any = {};
  studentCompletionPercentageAuth: any = {};
  learningUnitArray: any;
  workflowsArray: any;
  noWorkflowTooltipMessage: string = '';

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentsService,
    public dialog: MatDialog,
    private teacherService: TeacherService,
    public afAuth: AngularFireAuth,
    private fuseConfirmationService: FuseConfirmationService,
    private drawerService: FuseDrawerService,
    private router: Router,
    private uiService: UiService,
    private _navigationService: NavigationService,
    private userService: UserService,
    private customAuthService: CustomAuthenticationService,
    private workflowService: WorkflowsService,
    private workflowCompletionService: WorkflowCompletionService,
  ) { }
  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  ngOnInit(): void {
    this.drawerService.drawerOpenSubject.subscribe((res) => {
      if (res) {
        this.teacherInfoUi = false;
        this.studentInfo = null;
        this.teacherInfo = null;
        this.filteredStudentInfo = null;
        this.filteredStudentInfo = [];
        this.selectedClsId = null;
        this.selectedProgrammeId = null;
        this.selectedinstitutionId = null;
        this.isAdmin = false;
        this.passwordVisibility = {};
        this.learningUnitArray = null;
        this.workflowsArray = null;
        this.teacherCompletionPercentage = {};
        this.studentCompletionPercentageNoAuth = {};
        this.studentCompletionPercentageAuth = {};
        this.noWorkflowTooltipMessage = '';

        // this.drawerService.drawerOpenLearningUnitsSubject.subscribe(resL => {
        //   if (resL) {
        //     this.getAllStudents()
        //     this.getTeacher()
        //     this.userService.userInfoSub.subscribe((resU: any) => {
        //       this.isAdmin = resU.accessLevel >= 10
        //       // res.accessLevel >= 10 ? this.studentsAuthInfoUi = false : this.studentsAuthInfoUi = true
        //     })
        //     const learningUnitArray: any = resL
        //     this.learningUnitArray = learningUnitArray.sort((a: any, b: any) => a?.docId?.localeCompare(b?.docId));
        //   }
        // })

        // this.drawerService.drawerOpenWorkflowsSubject.subscribe(resW => {
        //   if (resW) {
        //     const workflowsArray: any = resW
        //     this.workflowsArray = workflowsArray.sort((a: any, b: any) => a?.learningUnitId?.localeCompare(b?.learningUnitId));
        //     this.noWorkflowTooltipMessage = `This learning unit has not been configured yet. Please contact us at +${environment.whatsAppSender} or at ${environment.emailSender} for further assistance.`;
        //   }
        // })

        combineLatest([
          this.drawerService.drawerOpenLearningUnitsSubject,
          this.drawerService.drawerOpenWorkflowsSubject
        ]).subscribe(([resL, resW]) => {
          if (resW) {
            const workflowsArray: any = resW;
            this.workflowsArray = workflowsArray.sort((a: any, b: any) => a?.learningUnitId?.localeCompare(b?.learningUnitId));
            this.noWorkflowTooltipMessage = `This learning unit has not been configured yet. Please contact us at +${environment.whatsAppSender} or at ${environment.emailSender} for further assistance.`;
          }

          if (resL && this.workflowsArray) {
            const learningUnitArray: any = resL;

            // 🔎 Filter learning units based on workflowsArray
            this.learningUnitArray = learningUnitArray
              .filter((lu: any) => this.workflowsArray.some((wf: any) => wf.learningUnitId === lu.docId && wf?.workflowId))
              .sort((a: any, b: any) => a?.docId?.localeCompare(b?.docId));

            this.getAllStudents();
            this.getTeacher();

            this.userService.userInfoSub.subscribe((resU: any) => {
              this.isAdmin = resU.accessLevel >= 10;
            });
          }
        });

      }
    });

    // this.getAllStudents()
    // this.getTeacher()
    // this.userService.userInfoSub.subscribe((res: any) => {
    //   this.isAdmin = res.accessLevel >= 10
    //   // res.accessLevel >= 10 ? this.studentsAuthInfoUi = false : this.studentsAuthInfoUi = true
    // })
  }

  toggleList(change: MatSlideToggleChange): void {
    this.teacherInfoUi = change.checked;
  }

  toggleAdmin(change: MatSlideToggleChange): void {
    this.studentsAuthInfoUi = change.checked;
  }

  getFromQueryParams() {
    this.route.queryParams.subscribe(async (res) => {
      this.selectedClsId = res?.classroomId;
      this.selectedProgrammeId = res?.programmeId;
      this.selectedinstitutionId = res?.institutionId;
    });
  }

  getAllStudents() {
    this.route.queryParams.subscribe(async (res) => {
      const classroomId = res?.classroomId;
      this.selectedClsId = classroomId;
      this.selectedProgrammeId = res?.programmeId;
      this.selectedinstitutionId = res?.institutionId;
      const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${classroomId}.classroomId`, '==', classroomId);
      this.studentService.getWithQuery(query).pipe(takeUntil(this._unsubscribeAll)).subscribe(async (res) => {
        const infos = this.querySelectedProgramFromResponse(res);
        this.studentInfo = await Promise.all(
          infos.map(async (student) => {
            const authInfo: any = await lastValueFrom(this.customAuthService.getByIdOnce(student.linkUid));
            return { ...student, authInfo: { ...authInfo.data() } };
          })
        );
        this.studentsWithAuthInfo = this.studentInfo.filter(student => student.loginType === 'userid_password');
        this.studentsWithOutAuthInfo = this.studentInfo.filter(student => student.loginType !== 'userid_password');
        //let studentwithdocIds=await this.getstudentwithdocIds(this.studentInfo)
        // let studentupdated=await this.getEachStudentSubmission(this.studentInfo)
        this.getCompletePercentage(this.studentsWithAuthInfo, false, true);
        this.getCompletePercentage(this.studentsWithAuthInfo, false, false);
        this.filteredStudentInfo = [...this.studentsWithAuthInfo];
        this.filteredStudentInfoWithOutAuth = [...this.studentsWithOutAuthInfo];
      });
    });
  }

  async getEachStudentSubmission(students: any) {

const promises=students.map(async (student: any) => new Promise(async (resolve, reject) => {

//  let sub= await firstValueFrom(this.studentService.getStudentSubmissionByIdOnce(student.docId,this.selectedClsId,this.selectedProgrammeId))



}));
  }

  async getstudentwithdocIds(students: any) {
students.map(async (student: any) => {

const st=await this.studentService.getStudentByLinkUid(student.linkUid);
console.log(st);
});
  }

  async getTeacher() {
    this.route.queryParams.subscribe(async (res) => {
      this.params = res;
      const classroomId = res.classroomId;
      const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${classroomId}.classroomId`, '==', classroomId);
      this.teacherService.getWithQuery(query).pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
        this.teacherInfo = this.querySelectedProgramFromResponse(res);
        this.getCompletePercentage(res, true, false);
      });
    });
  }

  querySelectedProgramFromResponse(res: any) {
    const selectedProgramme = res.filter((item) => {
      const programmes = item?.classrooms?.[this.selectedClsId]?.programmes;
      const selectedProgrammeId = (element: { programmeId: any }) => element?.programmeId === this.selectedProgrammeId;
      const QueryByProgram = programmes?.findIndex(selectedProgrammeId);
      if (QueryByProgram > -1) {
        return programmes[QueryByProgram];
      }
    });
    return selectedProgramme;
  }

  async editStudentOrTeacher(info, isstudent) {
    await import('../user-info-edit-dialog/user-info-edit-dialog..module').then(() => {
    });

    this.dialog.afterAllClosed.subscribe(() => {
      this.getAllStudents();
      this.getTeacher();
    });
  }

  onDelete(doc, isStudent) {
    // doc = this.getUserInfoAfterRemoveProgramme(doc);
    let firstName: string;
    let lastName: string;
    let role: 'teacher' | 'student';
    if (isStudent) {
      firstName = doc?.studentMeta?.firstName;
      lastName = doc?.studentMeta?.lastName;
      role = 'student';
    } else {
      firstName = doc?.teacherMeta?.firstName;
      lastName = doc?.teacherMeta?.lastName;
      role = 'teacher';
    }
    const config = {
      title: 'Delete Profile',
      message: `Are you sure, you want to remove the <br/> ${role} "${firstName} ${lastName}" <br/> from this programme and classroom?`,
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe((result) => {
      if (result == 'confirmed') {
        if (isStudent) {
          let updatedDoc;
          if (Object.keys(doc?.classrooms).length > 1) {
            const programmes = doc?.classrooms[this.selectedClsId].programmes;
            updatedDoc = this.handleProgrammeDelete(programmes, doc);
          } else if (Object.keys(doc?.classrooms).length === 1) {
            const programmes = doc?.classrooms[this.selectedClsId].programmes;
            updatedDoc = this.handleProgrammeDelete(programmes, doc);
          } else if (Object.keys(doc?.classrooms).length < 1) {
          }
          this.studentService.setStudent(updatedDoc.docId, updatedDoc).finally(() => this.getAllStudents());
        }
        else {
          const classHandle = this.handleClassrooms(doc);
          this.teacherService.setTeacher(classHandle?.docId, classHandle).finally(() => {
            if (!classHandle?.classrooms?.hasOwnProperty(this.selectedClsId)) {
              this.userService.getUid().then((user) => {
                if (classHandle?.docId === user) {
                  const firstClassroomId = Object.keys(classHandle?.classrooms)[0];
                  const firstProgramInFirstClassroomId = classHandle?.classrooms?.[firstClassroomId]?.programmes?.[0]?.programmeId;
                  this.router.navigate([`dashboard/${firstClassroomId}`], { queryParams: { institutionId: this.selectedinstitutionId, classroomId: firstClassroomId, programmeId: firstProgramInFirstClassroomId } }).finally(() => {
                    this.uiService.alertMessage('Current Classroom Deleted', 'You are redirecting to different classroom', 'warning');
                    this.drawerClose();
                    this._navigationService.get();
                  });
                }
                const firstName = classHandle?.teacherMeta?.firstName;
                const lastName = classHandle?.teacherMeta?.lastName;
                this.uiService.alertMessage('Teacher removed from classroom', `Teacher ${firstName} ${lastName} has been removed from classroom`, 'warning');
              });
            }
            if (classHandle?.classrooms?.[this.selectedClsId]?.programmes?.length >= 1) {
              const nextProgrammeId = classHandle?.classrooms?.[this.selectedClsId].programmes?.[0]?.programmeId;
              this.router.navigate([`dashboard/${this.selectedClsId}`], { queryParams: { institutionId: this.selectedinstitutionId, classroomId: this.selectedClsId, programmeId: nextProgrammeId } })
                .finally(() => {
                  // window.location.reload();
                  this.uiService.alertMessage('Current Programme Deleted', 'You are redirecting to different programme', 'warning');
                  this.drawerClose();
                  this._navigationService.get();
                });
            }
            // this.drawerClose();
            // this._navigationService.get()
            this.getTeacher();
          });

          /*
          this.teacherService.setTeacher(doc.docId, doc).then(() => {
            this.getTeacher()
            const currentTeacherId = this.teacherService.currentTeacherId.value
            const cls = doc.classrooms[Object.keys(doc.classrooms)[0]]
            if (currentTeacherId == doc.docId) {
              if (doc.classrooms.hasOwnProperty(this.selectedClsId)) {
                const programmeRef = doc.classrooms[this.selectedClsId].programmes
                const programme = programmeRef[Object.keys(programmeRef)[0]]
                this.router.navigate([`dashboard/${cls.classroomId}`], { queryParams: { institutionId: cls?.institutionId, classroomId: cls?.classroomId, programmeId: programme?.programmeId } });
                this.uiService.alertMessage('Current Programme Deleted', 'You are redirecting to different programme', 'warning')

              }
              else {
                this.router.navigate([`dashboard/${cls.classroomId}`], { queryParams: { institutionId: cls?.institutionId, classroomId: cls?.classroomId } });
                this.uiService.alertMessage('Current Classroom Deleted', 'You are redirecting to different classroom', 'warning')
              }
              this.drawerClose()
              this._navigationService.get()
            }

          })

          //   console.log(currentTeacherId);
          //   console.log(doc);
          // this.teacherService.delete(doc).then(() => {
          // })
          */
        }
      }
    });
  }

  handleClassrooms(doc: any) {
    let updatedDoc;
    if (Object.keys(doc?.classrooms).length > 1) {
      const programmes = doc?.classrooms[this.selectedClsId].programmes;
      updatedDoc = this.handleProgrammeDelete(programmes, doc);
    } else if (Object.keys(doc?.classrooms).length === 1) {
      const programmes = doc?.classrooms[this.selectedClsId].programmes;
      updatedDoc = this.handleProgrammeDelete(programmes, doc);
    } else if (Object.keys(doc?.classrooms).length < 1) {
    }
    return updatedDoc;
  }

  handleProgrammeDelete(programmes: any, doc: any) {
    if (programmes.length > 1) {
      const filterDoc = doc.classrooms[this.selectedClsId].programmes.filter(programme => programme.programmeId !== this.selectedProgrammeId);
      doc.classrooms[this.selectedClsId].programmes = filterDoc;
      return doc;
    } else if (programmes.length === 1) {
      delete doc.classrooms[this.selectedClsId];
      return doc;
    };
    return doc;
  }

  getUserInfoAfterRemoveProgramme(doc) {
    const filterDoc = doc.classrooms[this.selectedClsId].programmes.filter(programme => programme.programmeId !== this.selectedProgrammeId);
    doc.classrooms[this.selectedClsId].programmes = filterDoc;
    if (!doc.classrooms[this.selectedClsId].programmes.length) {
      delete doc.classrooms[this.selectedClsId];
    }
    return doc;
  }

  drawerClose() {
    this.drawerService.drawerOpenSubject.next(false);
  }

  filterByQuery(query: string) {
    // Convert query to lower case for case-insensitive comparison
    const lowerCaseQuery = query.toLowerCase();

    if (lowerCaseQuery) {
      this.studentsWithAuthInfo = this.filteredStudentInfo.filter((student: any) =>
        // Check if authInfo exists and then filter based on the query
         (student?.authInfo?.accessCode?.toLowerCase().includes(lowerCaseQuery) ||
          student?.authInfo?.userName?.toLowerCase().includes(lowerCaseQuery))
      );
    } else {
      // If no query, show all students
      this.studentsWithAuthInfo = this.filteredStudentInfo;
    }
  }

  filterByQueryInStudentDoc(query: string) {
    // Convert query to lower case for case-insensitive comparison
    const lowerCaseQuery = query.toLowerCase();

    if (lowerCaseQuery) {
      this.studentsWithOutAuthInfo = this.filteredStudentInfoWithOutAuth.filter((student: any) =>
        // Check if authInfo exists and then filter based on the query
         (student?.studentMeta?.firstName?.toLowerCase().includes(lowerCaseQuery) ||
          student?.studentMeta?.lastName?.toLowerCase().includes(lowerCaseQuery) ||
          student?.studentMeta?.phoneNumber?.toLowerCase().includes(lowerCaseQuery) ||
          student?.studentMeta?.email?.toLowerCase().includes(lowerCaseQuery)
        )
      );
    } else {
      // If no query, show all students
      this.studentsWithOutAuthInfo = this.filteredStudentInfoWithOutAuth;
    }
  }

  togglePasswordVisibility(studentId: string) {
    this.passwordVisibility[studentId] = !this.passwordVisibility[studentId];
  }

  // Check if password is available
  isPasswordAvailable(student: any): boolean {
    return !!student?.authInfo?.password;
  }

  async generateCredential() {
    await import('../create-student-credential-dialog/create-student-credential-dialog.module');
    this.dialog.open(CreateStudentCredentialDialogComponent, {
      data: { institutionInfo: '' }
    });

    this.dialog.afterAllClosed.subscribe(() => {
      this.getAllStudents();
    });
  }

  async getCompletePercentage(res: any, isTeacher: boolean, isAuthStudents: boolean) {

    const workflowCache = new Map(); // Caching workflow details
    if (isTeacher && !isAuthStudents) {
      await Promise.all(res.map(async (teacher: any, sIndex: number) => {
        const docId = teacher.docId;
        this.teacherCompletionPercentage[sIndex] = [];

        await Promise.all(this.workflowsArray.map(async (workflow: any, i: number) => {
          const { workflowId, learningUnitId } = workflow;
          this.teacherCompletionPercentage[sIndex][i] = {};

          if (!workflowId || !learningUnitId) {
            this.teacherCompletionPercentage[sIndex][i].workflowCompletion = 'No Workflow';
            console.error('Blank workflowId or learningUnitId found in programme');
          };

          const selectedLearningUnit = this.learningUnitArray.find((lu: any) => lu.docId === learningUnitId);
          let totalWorkflowSteps: number;

          // Fetch workflow details once and cache them
          if (workflowCache.has(workflowId)) {
            totalWorkflowSteps = workflowCache.get(workflowId);
          } else {
            if (workflowId?.length) {

              const totalWorkflowRef = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(workflowId));

              const workflowSteps = totalWorkflowRef?.get('workflowSteps') || [];
              totalWorkflowSteps = workflowSteps.length;
              workflowCache.set(workflowId, totalWorkflowSteps);
            }

            else {
              totalWorkflowSteps = -1;
            }
          }

          const teacherCompletionPercentage = await lastValueFrom(
            this.workflowCompletionService.getTeacherCompletionById(docId, learningUnitId)
          );


          if (teacherCompletionPercentage.exists) {
            const teacherData: any = teacherCompletionPercentage.data();
            const workflows = teacherData?.workflows; // Access workflows
            const teacherCompletedSteps = workflows?.[workflowId]?.completedSteps ? workflows?.[workflowId]?.completedSteps : 0; // Dynamically access the workflow ID and steps
            if (totalWorkflowSteps == -1) {
              this.teacherCompletionPercentage[sIndex][i].workflowCompletion = 'No Workflow';
              this.teacherCompletionPercentage[sIndex][i].workflowId = '';
              return;
            }
            const teacherCompletedPercentage = Math.round((teacherCompletedSteps * 100) / totalWorkflowSteps);
            this.teacherCompletionPercentage[sIndex][i].workflowCompletion = `${teacherCompletedPercentage}%`;
            this.teacherCompletionPercentage[sIndex][i].workflowId = workflowId;
          } else {
            if (totalWorkflowSteps == -1) {
              this.teacherCompletionPercentage[sIndex][i].workflowCompletion = 'No Workflow';
              this.teacherCompletionPercentage[sIndex][i].workflowId = '';

              return;
            }
            this.teacherCompletionPercentage[sIndex][i].workflowCompletion = '0%';
            this.teacherCompletionPercentage[sIndex][i].workflowId = workflowId;
          };
          // this.teacherCompletionPercentage[sIndex][i].workflowCompletion = teacherCompletedPercentage ? `${teacherCompletedPercentage}%` : 'Workflow not configured';
          this.teacherCompletionPercentage[sIndex][i].learningUnit = selectedLearningUnit;

        }));
      }));

    }
    if (!isTeacher && isAuthStudents) {
      await Promise.all(res.map(async (student: any, sIndex: number) => {
        const docId = student.docId;
        this.studentCompletionPercentageAuth[sIndex] = [];

        await Promise.all(this.workflowsArray.map(async (workflow: any, i: number) => {
          const { workflowId, learningUnitId } = workflow;
          this.studentCompletionPercentageAuth[sIndex][i] = {};

          if (!workflowId || !learningUnitId) {
            this.studentCompletionPercentageAuth[sIndex][i].workflowCompletion = 'No Workflow';
            console.error('Blank workflowId or learningUnitId found in programme');
          };

          const selectedLearningUnit = this.learningUnitArray.find((lu: any) => lu.docId === learningUnitId);
          let totalWorkflowSteps: number;

          // Fetch workflow details once and cache them
          if (workflowCache.has(workflowId)) {
            totalWorkflowSteps = workflowCache.get(workflowId);
          } else {
            if (workflowId?.length) {

              const totalWorkflowRef = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(workflowId));

              const workflowSteps = totalWorkflowRef?.get('workflowSteps') || [];
              totalWorkflowSteps = workflowSteps.length;
              workflowCache.set(workflowId, totalWorkflowSteps);
            }

            else {
              totalWorkflowSteps = -1;
            }
          }


          const studentCompletionPercentageAuth = await lastValueFrom(
            this.workflowCompletionService.getStudentCompletionById(docId, learningUnitId)
          );
          if (studentCompletionPercentageAuth.exists) {
            const studentData: any = studentCompletionPercentageAuth.data();

            const workflows = studentData?.workflows; // Access workflows
            const studentCompletedSteps = workflows?.[workflowId]?.completedSteps ? workflows?.[workflowId]?.completedSteps : 0; // Dynamically access the workflow ID and steps


            if (totalWorkflowSteps == -1) {
              this.studentCompletionPercentageAuth[sIndex][i].workflowCompletion = 'No Workflow';
              this.studentCompletionPercentageAuth[sIndex][i].workflowId = '';
              return;
            }
            const studentCompletedPercentage = Math.round((studentCompletedSteps * 100) / totalWorkflowSteps);

            this.studentCompletionPercentageAuth[sIndex][i].workflowCompletion = `${studentCompletedPercentage}%`;
            this.studentCompletionPercentageAuth[sIndex][i].workflowId = workflowId;
          } else {
            if (totalWorkflowSteps == -1) {
              this.studentCompletionPercentageAuth[sIndex][i].workflowCompletion = 'No Workflow';
              this.studentCompletionPercentageAuth[sIndex][i].workflowId = '';
              return;
            }

            this.studentCompletionPercentageAuth[sIndex][i].workflowCompletion = '0%';
            this.studentCompletionPercentageAuth[sIndex][i].workflowId = workflowId;
          };
          this.studentCompletionPercentageAuth[sIndex][i].learningUnit = selectedLearningUnit;



        }));
      }));

    }
    if (!isTeacher && !isAuthStudents) {
      await Promise.all(res.map(async (student: any, sIndex: number) => {
        const docId = student.docId;
        this.studentCompletionPercentageNoAuth[sIndex] = [];

        await Promise.all(this.workflowsArray.map(async (workflow: any, i: number) => {
          const { workflowId, learningUnitId } = workflow;
          this.studentCompletionPercentageNoAuth[sIndex][i] = {};

          if (!workflowId || !learningUnitId) {
            this.studentCompletionPercentageNoAuth[sIndex][i].workflowCompletion = 'No Workflow';
            console.error('Blank workflowId or learningUnitId found in programme');
          };

          const selectedLearningUnit = this.learningUnitArray.find((lu: any) => lu.docId === learningUnitId);
          let totalWorkflowSteps: number;

          // Fetch workflow details once and cache them
          if (workflowCache.has(workflowId)) {
            totalWorkflowSteps = workflowCache.get(workflowId);
          } else {
            if (workflowId?.length) {

              const totalWorkflowRef = await lastValueFrom(this.workflowService.getWorkflowDocByIdOnce(workflowId));

              const workflowSteps = totalWorkflowRef?.get('workflowSteps') || [];
              totalWorkflowSteps = workflowSteps.length;
              workflowCache.set(workflowId, totalWorkflowSteps);
            }

            else {
              totalWorkflowSteps = -1;
            }
          }


          const studentCompletionPercentageNoAuth = await lastValueFrom(
            this.workflowCompletionService.getStudentCompletionById(docId, learningUnitId)
          );
          if (studentCompletionPercentageNoAuth.exists) {
            const studentData: any = studentCompletionPercentageNoAuth.data();

            const workflows = studentData?.workflows; // Access workflows
            const studentCompletedSteps = workflows?.[workflowId]?.completedSteps ? workflows?.[workflowId]?.completedSteps : 0; // Dynamically access the workflow ID and steps


            if (totalWorkflowSteps == -1) {
              this.studentCompletionPercentageNoAuth[sIndex][i].workflowCompletion = 'No Workflow';
              this.studentCompletionPercentageNoAuth[sIndex][i].workflowId = '';
              return;
            }
            const studentCompletedPercentage = Math.round((studentCompletedSteps * 100) / totalWorkflowSteps);

            this.studentCompletionPercentageNoAuth[sIndex][i].workflowCompletion = `${studentCompletedPercentage}%`;
            this.studentCompletionPercentageNoAuth[sIndex][i].workflowId = workflowId;
          } else {
            if (totalWorkflowSteps == -1) {
              this.studentCompletionPercentageNoAuth[sIndex][i].workflowCompletion = 'No Workflow';
              this.studentCompletionPercentageNoAuth[sIndex][i].workflowId = '';
              return;
            }

            this.studentCompletionPercentageNoAuth[sIndex][i].workflowCompletion = '0%';
            this.studentCompletionPercentageNoAuth[sIndex][i].workflowId = workflowId;
          };
          this.studentCompletionPercentageNoAuth[sIndex][i].learningUnit = selectedLearningUnit;



        }));
      }));

    }
  }


  async onViewLu(learningUnitInfo, teacherOrStudentInfo, isTeacher: boolean, workflowId) {
    import('app/modules/lu-complition-dialog/lu-complition-dialog.module').then(() => {
      this.dialog.open(LuComplitionDialogComponent, {
        data: {
          workflowId: workflowId,
          programmeId:this.selectedProgrammeId,
          learningUnitInfo,
          teacherOrStudentInfo,
          institutionId: this.params.institutionId,
          classroomId: this.params.classroomId,
          isTeacher
        }
      });
    });
  }
}
