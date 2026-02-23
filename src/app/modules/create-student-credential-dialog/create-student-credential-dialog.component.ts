import { Component, OnInit } from '@angular/core';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { ActivatedRoute } from '@angular/router';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { ExportService } from 'app/shared/export.service';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { first, firstValueFrom, lastValueFrom } from 'rxjs';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { environment } from 'environments/environment';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { studentListExportPdf } from 'app/shared/pdf-generation/student-credentials';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { deleteField, Timestamp } from '@angular/fire/firestore';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { AllAssignmentsTableComponent } from '../admin/assignments/all-assignments-table/all-assignments-table.component';

@Component({
  selector: 'app-create-student-credential-dialog',
  templateUrl: './create-student-credential-dialog.component.html',
  styleUrls: ['./create-student-credential-dialog.component.scss']
})
export class CreateStudentCredentialDialogComponent implements OnInit {
  params: any;
  nominateMeta: any;

  constructor(
    private route: ActivatedRoute,
    private studentService: StudentsService,
    private classroomService: ClassroomsService,
    private institutionService: InstitutionsService,
    private uiService: UiService,
    private exportService: ExportService,
    private sharedService: SharedService,
    private storage: AngularFireStorage,
    private masterService: MasterService,
    private afAuth: AngularFireAuth,
    private teacherService: TeacherService,
    private afs: AngularFirestore,
    private contestService: ContestService
  ) { }

  startSpinner: boolean = false;
  isCredentialsCreated: boolean = false;
  private intervalId: any;
  addStudentUi = false;
  noOfStudentsLinkedWithTheClass = 0;
  addingStudentNumber: number = 0;
  teacherObj: any;

  async ngOnInit(): Promise<void> {
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    this.teacherObj = await firstValueFrom(this.teacherService.getTeacherByDocId(user.uid));
    this.nominateMeta = this.teacherObj.teacherMeta;
    this.nominateMeta['linkUid'] = user.uid;
    this.nominateMeta['updatedAt'] = deleteField();
    this.nominateMeta['uid'] = deleteField();
    this.nominateMeta['confirm'] = false;
    this.route.queryParams.subscribe((params) => {
      this.params = params;
      this.getNoOfStudentsLinkedWithTheClass(params.classroomId);
    });
  }

  getNoOfStudentsLinkedWithTheClass(classroomId: string) {
    const query: QueryFn = (ref: CollectionReference) => ref.where(`classrooms.${classroomId}.classroomId`, '==', classroomId).where('loginType', '==', 'userid_password');
    this.studentService.getWithQuery(query).subscribe((res) => {
      if (res.length) {
        this.noOfStudentsLinkedWithTheClass = res.length;
      }
    });
  }




  async onSubmit() {
    const { institutionId, classroomId } = this.params;
    const institutionRaw: any = await this.institutionService.getDocDataByDocId(institutionId);
    const classroomRaw: any = await this.classroomService.getDocDataByDocId(classroomId);

    const classroom = {
      numberOfStudents: this.addingStudentNumber,
      selectedClassroomStemClub: classroomRaw,
    };

    const selectedClassroomIdRaw = classroom?.selectedClassroomStemClub?.classroomId;
    const selectedClassroomId: string[] = selectedClassroomIdRaw ? [selectedClassroomIdRaw] : [];


    // const studentDocs: any = await this.studentService.getAllStudentDocsByClassroom(selectedClassroomId);
    // console.log(studentDocs, 'studentDocs');
    // let studentData: any[] = [];
    // studentDocs.forEach((studentDoc: any) => {
    //   studentDoc.studentMeta['grade'] = classroom.selectedClassroomStemClub.grade;
    //   studentDoc.studentMeta['board'] = classroom.selectedClassroomStemClub.board;
    //   studentDoc.studentMeta['institutionId'] = classroom.selectedClassroomStemClub.institutionId;
    //   studentDoc.studentMeta['institutionName'] = classroom.selectedClassroomStemClub.institutionName;
    //   studentDoc.studentMeta['gender'] = '';
    //   studentDoc.studentMeta['age'] = 0;
    //   studentDoc.studentMeta['registeredAt'] = Timestamp.now();
    //   studentData.push({ studentMeta: studentDoc.studentMeta, docId: studentDoc.docId });
    // })

    const base64Images = [];
    const imageUrls = environment.pdfPlatformImages;
    for (const imageUrl of imageUrls) {
      base64Images.push(await this.exportService.getTextFromUrl(imageUrl));
    };

    const accessCodePrefix = `${institutionRaw?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode}`;
    const matchingData = await this.afs.collection('CustomAuthentication').get().toPromise().then(snapshot => {
      const matchingDocs = snapshot.docs.filter(doc => {
        const data = doc.data() as { accessCode?: string };
        return data?.accessCode?.startsWith(accessCodePrefix);
      });
      return matchingDocs.map(doc => doc.data());
    });

    const filteredCustomAuthenticationMaster = matchingData.filter((customAuth: any) =>
      customAuth?.accessCode?.startsWith(accessCodePrefix)
    );


    if (classroom?.selectedClassroomStemClub?.studentCounter === 0 || filteredCustomAuthenticationMaster?.length === classroom?.selectedClassroomStemClub?.studentCounter) {
      const numberOfExistingStudents = filteredCustomAuthenticationMaster.length ?? classroom?.selectedClassroomStemClub?.studentCounter ?? 0;
      // const existingStudents = Array.from({ length: numberOfExistingStudents }, (_, i) => i + 1);
      // const currentStudentArray = Array.from({ length: classroom?.numberOfStudents }, (_, i) => i + (classroom?.selectedClassroomStemClub?.studentCounter ?? 0) + 1);
      // const existingAccounts = await Promise.all(
      //   existingStudents.map(async (student: number) => {
      //     const accessCode = `${institutionRaw?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode
      //       }${student.toString().padStart(3, '0')}`;

      //     // Find matching authentication record
      //     const matchingAuth: any = Object.values(matchingData).find(
      //       (auth: any) => auth.accessCode === accessCode
      //     );

      //     // Return matching record or empty object
      //     return matchingAuth
      //       ? {
      //         accessCode: matchingAuth.accessCode,
      //         password: matchingAuth.password,
      //         number: student
      //       }
      //       : {};
      //   })
      // );


       const existingStudentNumbers = filteredCustomAuthenticationMaster.map((item:any) => {
        const accessCode = item.accessCode;
        const studentNumber = parseInt(accessCode.slice(-3), 10);
        return studentNumber;
      });

      // Sort and deduplicate the student numbers
      const existingStudents = Array.from(new Set(existingStudentNumbers)).sort((a: number, b: number) => a - b);
      // Find the highest student number
      const highestStudentNumber = existingStudents.length > 0 ? Math.max(...(existingStudents as number[])) : 0;
      // Create the currentStudentArray starting from highest + 1
      const currentStudentArray = Array.from(
        { length: classroom?.numberOfStudents },
        (_, i) => highestStudentNumber + i + 1
      );

      // Now you can proceed to map over existingStudents
      const existingAccounts = await Promise.all(
        existingStudents.map(async (student: number) => {
          // const accessCode = `${this.institutionInfo?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode}${student.toString().padStart(3, '0')}`;
           const accessCode = `${institutionRaw?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode}${student.toString().padStart(3, '0')}`;
          const matchingAuth: any = Object.values(matchingData).find(
            (auth: any) => auth.accessCode === accessCode
          );
          return matchingAuth
            ? { accessCode: matchingAuth.accessCode, password: matchingAuth.password, number: student }
            : {};
        })
      );


      const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/customStudentProfileGenerator`;
      // const endUrl = `http://localhost:5000/${environment.firebase.projectId}/asia-south1/customStudentProfileGenerator`;
      const platformUrl = environment.pdfPlatformUrl;
      this.startSpinner = true;
      const currentAccounts = [];

      for (let index = 0; index < currentStudentArray.length; index++) {
        const student = currentStudentArray[index];

        const accessCode = `${institutionRaw?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode}${student.toString().padStart(3, '0')}`;

        const body = {
          accessCode,
          student,
          selectedClassroomStemClub: classroom?.selectedClassroomStemClub,
        };

        try {
          const cloudFunctionResponse = await this.sharedService.sendToCloudFunction(endUrl, body);
          this.uiService.alertMessage('Attention', `Generated credentials for student ${index + 1} of ${currentStudentArray?.length}`, 'info');
          // currentAccounts.push(JSON.parse(cloudFunctionResponse));
          // console.log('currentAccounts:', currentAccounts);
          if (typeof (cloudFunctionResponse) === 'object') {
            currentAccounts[index] = cloudFunctionResponse.responseBody;
          } else if (typeof (cloudFunctionResponse) === 'string') {
            currentAccounts[index] = JSON.parse(cloudFunctionResponse).responseBody;
          }
        } catch (error) {
          this.uiService.alertMessage('Error', `Failed to generate credentials for student ${index + 1}`, 'error');
        };
      };

      const allAccounts = [...existingAccounts, ...currentAccounts];

      const filteredAccounts = [...existingAccounts, ...currentAccounts].filter(
        (account: any) =>
          account &&
          account.accessCode &&
          account.password &&
          account.number !== undefined &&
          account.accessCode.length >= 13
      );

      let studentDocIdMap: { [docId: string]: any } = {};
      for (const account of filteredAccounts) {
        const code = account.accessCode;
        const customAuthQuerySnapshot = await firstValueFrom(
          this.afs.collection('CustomAuthentication', ref => ref.where('accessCode', '==', code)).get()
        );

        if (!customAuthQuerySnapshot.empty) {
          const customAuthDoc = customAuthQuerySnapshot.docs[0];
          const docId = customAuthDoc.id;

          const studentDocSnapshot = await firstValueFrom(
            this.afs.collection('Students').doc(docId).get()
          );

          if (studentDocSnapshot.exists) {
            const studentData: any = studentDocSnapshot.data();
            studentDocIdMap[docId] = studentData.studentMeta;
          } else {
            // console.log('No student document found for docId:', docId);
          }

        }
      }
      const studentCredentialPdf = studentListExportPdf(classroom, base64Images, allAccounts, platformUrl);
      studentCredentialPdf.getBuffer(async (buffer: any) => {
        const { classroomId, institutionName, type } = classroom?.selectedClassroomStemClub;
        const classroomStemClubName = type === 'classroom' ? classroom?.selectedClassroomStemClub?.classroomName : classroom?.selectedClassroomStemClub?.stemClubName;
        const filePath = await this.checkStorageFile(institutionRaw?.institutionId, classroomId, institutionName, classroomStemClubName);
        this.storage.ref(filePath);

        try {
          const task = await this.storage.upload(filePath, buffer, { contentType: 'application/pdf' });

          if (!classroom?.selectedClassroomStemClub?.studentCounter || classroom?.selectedClassroomStemClub?.studentCounter === 'NaN') {
            console.error('Student counter is not a number');
            console.error(classroom);
            console.error(classroom?.selectedClassroomStemClub);
          };

          this.classroomService.updateClassroomSingleField(classroom?.selectedClassroomStemClub?.classroomId, 'studentCredentialStoragePath', filePath);
          this.classroomService.updateClassroomSingleField(classroom?.selectedClassroomStemClub?.classroomId, 'studentCounter', classroom?.selectedClassroomStemClub?.studentCounter + classroom?.numberOfStudents);
          await this.masterService.updateMasterDocField(classroom?.selectedClassroomStemClub?.masterDocId, classroom?.selectedClassroomStemClub?.docId, 'classrooms', 'studentCredentialStoragePath', filePath);
          await this.masterService.updateMasterDocField(classroom?.selectedClassroomStemClub?.masterDocId, classroom?.selectedClassroomStemClub?.docId, 'classrooms', 'studentCounter', classroom?.selectedClassroomStemClub?.studentCounter + classroom?.numberOfStudents);
          this.isCredentialsCreated = true;

          const hasLinkedContest = !!classroom?.selectedClassroomStemClub.linkedContestId;

          if (hasLinkedContest) {
            for (const contestId in classroom?.selectedClassroomStemClub.linkedContestId) {
              const contestCollection = `Contest_${contestId}`;

              // Check if contest exists
              const docSnapshot = await firstValueFrom(this.contestService.getContestById(contestId));
              if (!docSnapshot.exists) {
                // console.log('No such contest document! ', contestId);
                continue;
              }

              // Ensure base documents exist
              const baseDocs = [
                '--InstitutionNomination--',
                '--TeacherAndLinkedInstitute--',
                '-Config-'
              ];

              for (const docId of baseDocs) {
                const docRef = this.afs.collection(contestCollection).doc(docId);
                const baseDocSnapshot = await firstValueFrom(docRef.get());
                if (!baseDocSnapshot.exists) {
                  await docRef.set({});
                  // console.log(`Created document ${docId} in ${contestCollection}`);
                }
              }

              const contestData: any = docSnapshot.data() || { stagesNames: [] };

              // Loop through students and isolate per-contest nomination logic
              for (const docId in studentDocIdMap) {
                const originalStudentObj = studentDocIdMap[docId];
                if (!originalStudentObj) continue;

                const studentDocRef = this.afs.collection(contestCollection).doc(docId);
                const studentDocSnap = await firstValueFrom(studentDocRef.get());
                const isNewStudent = !studentDocSnap.exists;

                // Clone studentObj
                // const studentObj: any = {
                //     ...originalStudentObj,
                //     board: classroom?.selectedClassroomStemClub.board,
                //     age: 0,
                //     gender: '',
                //     institutionId: classroom?.selectedClassroomStemClub.institutionId,
                //     institutionName: classroom?.selectedClassroomStemClub.institutionName,
                // };

                // // Only set registeredAt if it's a new student
                // if (isNewStudent) {
                //     studentObj.registeredAt = Timestamp.now();
                // }

                // // Remove stage nomination flags
                // Object.keys(studentObj).forEach(key => {
                //     if (key.startsWith('stage_') && key.endsWith('_nominated')) {
                //         delete studentObj[key];
                //     }
                // });

                // // Clone and update teacher metadata per contest
                // const nominateMeta: any = {
                //     ...this.teacherObj.teacherMeta,
                //     institutionId: classroom?.selectedClassroomStemClub.institutionId,
                //     updatedAt: deleteField(),
                //     uid: deleteField(),
                //     confirm: false,
                // };

                // // Only set nominationAt if it's a new student
                // if (isNewStudent) {
                //     nominateMeta.nominationAt = Timestamp.now();
                // }

                // // Add stage nominations specific to this contest
                // if (contestData.stagesNames?.length) {
                //     contestData.stagesNames.forEach((stage: any) => {
                //         const key = `stage_${stage.stageId}_nominated`;
                //         studentObj[key] = stage.stageNumber === 1;
                //     });
                // }

                // // Update Firestore
                // await studentDocRef.set({
                //     docId,
                //     studentMeta: studentObj,
                //     nominateMeta: nominateMeta,
                // }, { merge: true });

                // Clone studentObj from main Students collection
                const studentObj: any = {
                  ...originalStudentObj,
                  board: classroom?.selectedClassroomStemClub.board,
                  age: 0,
                  gender: '',
                  institutionId: classroom?.selectedClassroomStemClub.institutionId,
                  institutionName: classroom?.selectedClassroomStemClub.institutionName,
                  linkUid: deleteField(),
                };

                // Always clean up nomination flags
                Object.keys(studentObj).forEach(key => {
                  if (key.startsWith('stage_') && key.endsWith('_nominated')) {
                    delete studentObj[key];
                  }
                });

                // Add stage nominations for this contest
                if (contestData.stagesNames?.length) {
                  contestData.stagesNames.forEach((stage: any) => {
                    const key = `stage_${stage.stageId}_nominated`;
                    studentObj[key] = stage.stageNumber === 1;
                  });
                }

                // Build nominateMeta per teacher
                const nominateMeta: any = {
                  ...this.teacherObj.teacherMeta,
                  institutionId: classroom?.selectedClassroomStemClub.institutionId,
                  confirm: false,
                };

                // Set nominationAt only if new
                if (!studentDocSnap.exists) {
                  studentObj.registeredAt = Timestamp.now();
                  nominateMeta.nominationAt = Timestamp.now();
                  studentObj['linkUid']= deleteField();
                }

                // Clean Firestore-only fields
                nominateMeta.updatedAt = deleteField();
                nominateMeta.uid = deleteField();

                // Set document (always)
                await studentDocRef.set({
                  docId,
                  studentMeta: studentObj,
                  nominateMeta: nominateMeta,
                }, { merge: true });

                // console.log(`Updated ${contestCollection} with student ${docId}`);
              }
            }
          }

          this.uiService.alertMessage('Success', 'Student credentials PDF generated successfully', 'success');
          this.startSpinner = false;
        } catch (error) {
          console.error(error);
          this.uiService.alertMessage('Error', 'Failed to generate student credentials PDF', 'error');
        };
      });
    } else {
      this.uiService.alertMessage('Error', 'Error Generating Students Credentials', 'error');
      console.error('Error Generating Students Credentials', `Number of Custom Authentiaction Master Student Credentials is ${filteredCustomAuthenticationMaster?.length} is not matching with classroom counter value ${classroom?.selectedClassroomStemClub?.studentCounter}`);
      this.startSpinner = false;
      return;
    }
  }


  async checkStorageFile(institutionId: string, classroomId: string, institutionName: string, classroomStemClubName: string) {
    let counter = 1;
    let storagePath: string;
    storagePath = `student_credentials/${institutionId}/${classroomId}/${institutionName} ${classroomStemClubName} v${counter.toString().padStart(3, '0')}.pdf`;
    do {
      try {
        const exists = await lastValueFrom(this.storage.ref(storagePath).getDownloadURL());
        if (exists) {
          counter++;
          storagePath = `student_credentials/${institutionId}/${classroomId}/${institutionName} ${classroomStemClubName} v${counter.toString().padStart(3, '0')}.pdf`;
        };
      } catch (error) {
        return storagePath;
      };
    } while (counter < 1000);
  }

}


