import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { first, firstValueFrom, lastValueFrom, Subject } from 'rxjs';
import { UiService } from 'app/shared/ui.service';
import { ExportService } from 'app/shared/export.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { studentListExportPdf } from 'app/shared/pdf-generation/student-credentials';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { deleteField, Timestamp } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { StudentRemoteMappComponent } from './student-remote-mapp/student-remote-mapp.component';
import { UsbService } from 'app/usb.service';
import { ContestNominationsService } from 'app/core/dbOperations/contestNominations/contestNominations.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { StudentsService } from 'app/core/dbOperations/students/students.service';

@Component({
  selector: 'app-student-info',
  templateUrl: './student-info.component.html',
  styleUrls: ['./student-info.component.scss'],
})
export class StudentInfoComponent implements OnInit, OnDestroy, OnChanges {
  @Input() institutionInfo: any;
  @Input() type: string;
  @Input() display: string;

  classroomStemClubArray = [];
  classroomStemClubInfo: FormGroup;
  isLoaded: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  isCredentialsCreated: boolean = false;
  credentialStoragePath: string = '';
  startSpinner: boolean = false;
  isClassroomStemClubSelected: boolean = false;
  showMoreStudents: boolean = false;
  private intervalId: any;
  teacherObj: any;
  nominateMeta: any;
  filteredCustomAuthenticationMaster;
  disableToggleToCheckCounter: boolean = false;
  accessCodeFromCustom: any[] = [];
  currentUser: any = {};
  usbReceiverDocId: string;
  remoteMacs: any;
  isRemoteAvailable: boolean = false;
  isPairing = false;
  isContestRegistrationRequired: boolean = true;
  generalContests: any;
  classroomStemClubdependentContests: any;
  Contest: any;
  finalContestsLst: any;
  selectContest: any;
  allContestIdPatched: string[] = [];

  constructor(
    private classroomService: ClassroomsService,
    private exportService: ExportService,
    private fb: FormBuilder,
    private sharedService: SharedService,
    private uiService: UiService,
    private storage: AngularFireStorage,
    private masterService: MasterService,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private teacherService: TeacherService,
    private userService: UserService,
    private contestService: ContestService,
    private dialog: MatDialog,
    private usbService: UsbService,
    private contestNominationsService: ContestNominationsService,
    private fuseConfirmationService: FuseConfirmationService,
    private studentService: StudentsService
  ) { }

  ngOnDestroy(): void {
    this.startSpinner = false;
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  async ngOnChanges(changes: SimpleChanges): Promise<void> {
    this.showMoreStudents = false;
    this.setForm();

    if (this.institutionInfo) {
      const institutionId = this.institutionInfo.institutionId;
      const classrooms = await lastValueFrom(
        this.classroomService.getAllClassroomByInstitute(institutionId)
      );

      // Filter by type first
      let filtered = classrooms.filter(
        (classroom: any) => classroom.type === this.type
      );

      // Deduplicate by classroomName if type is CLASSROOM
      if (this.type === 'CLASSROOM') {
        const seen = new Set();
        filtered = filtered.filter((item: any) => {
          if (seen.has(item.classroomName)) {
            return false;
          }
          seen.add(item.classroomName);
          return true;
        });
      }

      // Now sort and assign
      this.classroomStemClubArray = filtered.sort((a, b) => {
        if (
          a.hasOwnProperty('classroomName') &&
          b.hasOwnProperty('classroomName')
        ) {
          const [gradeA, sectionA] = a.classroomName.split(' ');
          const [gradeB, sectionB] = b.classroomName.split(' ');
          const gradeANum = parseInt(gradeA);
          const gradeBNum = parseInt(gradeB);
          return gradeANum === gradeBNum
            ? sectionA.localeCompare(sectionB)
            : gradeANum - gradeBNum;
        } else if (
          a.hasOwnProperty('stemClubName') &&
          b.hasOwnProperty('classroomName')
        ) {
          return a.stemClubName.localeCompare(b.classroomName);
        } else if (
          a.hasOwnProperty('classroomName') &&
          b.hasOwnProperty('stemClubName')
        ) {
          return a.classroomName.localeCompare(b.stemClubName);
        } else {
          return a.stemClubName.localeCompare(b.stemClubName);
        }
      });
    }
  }

  async ngOnInit(): Promise<void> {
    const users = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(
      this.userService.getUser(users?.uid)
    );
    this.currentUser = currentUser;
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    this.teacherObj = await firstValueFrom(
      this.teacherService.getTeacherByDocId(user.uid)
    );
    this.nominateMeta = this.teacherObj.teacherMeta;
    this.nominateMeta['linkUid'] = user.uid;
    this.nominateMeta['updatedAt'] = deleteField();
    this.nominateMeta['uid'] = deleteField();
    // this.nominateMeta['nominationAt'] = Timestamp.now();
    this.nominateMeta['confirm'] = false;

    // 3️⃣ Query `usbReceivers` using currentUser.uid as ownerId
    const receiverSnap = await this.afs
      .collection('usbReceivers', (ref) =>
        ref.where('ownerId', '==', this.currentUser.uid)
      )
      .get()
      .toPromise();

    if (!receiverSnap.empty) {
      const doc = receiverSnap.docs[0]; // assuming one USB receiver per user
      this.usbReceiverDocId = doc.id;
      const receiverData = doc.data() as { remotes?: any[] };
      this.remoteMacs = receiverData?.remotes ?? [];
    } else {
      console.warn('❌ No USB Receiver found for this user.');
      this.remoteMacs = [];
    }

    this.generalContests = await lastValueFrom(
      this.contestService.getContestsByType('general')
    );

    this.classroomStemClubdependentContests = await lastValueFrom(
      this.contestService.getContestsByType('classroomStemClubdependent')
    );
    this.Contest = (this.classroomStemClubdependentContests || []).filter(
      (contest) => {
        const instId = this.institutionInfo?.institutionId;
        const visibility =
          contest?.contestVisibilityToInstitutions?.[instId];
        return visibility?.institutionId === instId;
      }
    );

    this.finalContestsLst = [...this.generalContests, ...this.Contest];
  }

  setForm() {
    this.classroomStemClubInfo = this.fb.group({
      selectedClassroomStemClub: ['', Validators.required],
      numberOfStudents: ['', Validators.required],
    });
  }

  // async onSubmit(form: FormGroup) {
  //   this.startSpinner = true;
  //   this.isCredentialsCreated = false;
  //   const base64Images = [];
  //   const imageUrls = environment.pdfPlatformImages;

  //   for (const imageUrl of imageUrls) {
  //     base64Images.push(
  //       await this.exportService.getTextFromUrl(imageUrl)
  //     );
  //   }
  //   const classroom = form.value;
  //   console.log('Classroom selected 2:', classroom);
  //   if (
  //     classroom?.selectedClassroomStemClub?.studentCounter === 0 ||
  //     this.filteredCustomAuthenticationMaster?.length ===
  //     classroom?.selectedClassroomStemClub?.studentCounter
  //   ) {
  //     const numberOfExistingStudents =
  //       this.filteredCustomAuthenticationMaster?.length ??
  //       classroom?.selectedClassroomStemClub?.studentCounter ??
  //       0;

  //     // Extract student numbers from access codes
  //     const existingStudentNumbers =
  //       this.filteredCustomAuthenticationMaster.map((item) => {
  //         const accessCode = item.accessCode;
  //         const studentNumber = parseInt(accessCode.slice(-3), 10);
  //         return studentNumber;
  //       });

  //     // Sort and deduplicate the student numbers
  //     const existingStudents = Array.from(
  //       new Set(existingStudentNumbers)
  //     ).sort((a: number, b: number) => a - b);

  //     // Find the highest student number
  //     const highestStudentNumber =
  //       existingStudents.length > 0
  //         ? Math.max(...(existingStudents as number[]))
  //         : 0;

  //     // Create the currentStudentArray starting from highest + 1
  //     const currentStudentArray = Array.from(
  //       { length: classroom?.numberOfStudents },
  //       (_, i) => highestStudentNumber + i + 1
  //     );

  //     // Now you can proceed to map over existingStudents
  //     const existingAccounts = await Promise.all(
  //       existingStudents.map(async (student: number) => {
  //         const accessCode = `${this.institutionInfo?.institutionCode
  //           }${classroom?.selectedClassroomStemClub?.classroomCode
  //           }${student.toString().padStart(3, '0')}`;
  //         const matchingAuth: any = Object.values(
  //           this.accessCodeFromCustom
  //         ).find((auth: any) => auth.accessCode === accessCode);
  //         return matchingAuth
  //           ? {
  //             accessCode: matchingAuth.accessCode,
  //             password: matchingAuth.password,
  //             number: student,
  //           }
  //           : {};
  //       })
  //     );

  //     // return;
  //     const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/customStudentProfileGenerator`;
  //     const platformUrl = environment.pdfPlatformUrl;
  //     const currentAccounts = [];

  //     for (let index = 0; index < currentStudentArray.length; index++) {
  //       const student = currentStudentArray[index];
  //       // console.log('Generating credentials for student:', student);
  //       const accessCode = `${this.institutionInfo?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode
  //         }${student.toString().padStart(3, '0')}`;
  //       const body = {
  //         accessCode,
  //         student,
  //         selectedClassroomStemClub:
  //           classroom?.selectedClassroomStemClub,
  //       };

  //       try {
  //         const cloudFunctionResponse =
  //           await this.sharedService.sendToCloudFunction(
  //             endUrl,
  //             body
  //           );
  //         this.uiService.alertMessage(
  //           'Attention',
  //           `Generated credentials for student ${index + 1} of ${currentStudentArray?.length
  //           }`,
  //           'info'
  //         );
  //         if (typeof cloudFunctionResponse === 'object') {
  //           currentAccounts[index] =
  //             cloudFunctionResponse.responseBody;
  //         } else if (typeof cloudFunctionResponse === 'string') {
  //           currentAccounts[index] = JSON.parse(
  //             cloudFunctionResponse
  //           ).responseBody;
  //         }
  //       } catch (error) {
  //         this.uiService.alertMessage(
  //           'Error',
  //           `Failed to generate credentials for student ${index + 1
  //           }`,
  //           'error'
  //         );
  //         console.error(error);
  //       }
  //     }

  //     const allAccounts = [
  //       ...existingAccounts,
  //       ...currentAccounts,
  //     ].filter(
  //       (account: any) =>
  //         account &&
  //         account.accessCode &&
  //         account.password &&
  //         account.number !== undefined &&
  //         account.accessCode.length >= 13
  //     );

  //     let studentDocIdMap: { [docId: string]: any } = {};

  //     for (const account of allAccounts) {
  //       const code = account.accessCode;
  //       const customAuthQuerySnapshot = await firstValueFrom(
  //         this.afs
  //           .collection('CustomAuthentication', (ref) =>
  //             ref.where('accessCode', '==', code)
  //           )
  //           .get()
  //       );

  //       if (!customAuthQuerySnapshot.empty) {
  //         const customAuthDoc = customAuthQuerySnapshot.docs[0];
  //         const docId = customAuthDoc.id;

  //         const studentDocSnapshot = await firstValueFrom(
  //           this.afs.collection('Students').doc(docId).get()
  //         );


  //         if (studentDocSnapshot.exists) {
  //           const studentData: any = studentDocSnapshot.data();
  //           studentDocIdMap[docId] = studentData.studentMeta;
  //         } else {

  //         }
  //       }
  //     }
  //     // Below line will generate the PDF
  //     const studentCredentialPdf = studentListExportPdf(
  //       classroom,
  //       base64Images,
  //       allAccounts,
  //       platformUrl
  //     );

  //     console.log('Generated PDF Buffer 5:', classroom);
  //     // Below line will upload the PDF to Firebase Storage
  //     studentCredentialPdf.getBuffer(async (buffer: any) => {
  //       const { classroomId, institutionName, type } =
  //         classroom?.selectedClassroomStemClub;
  //       const classroomStemClubName =
  //         type === 'CLASSROOM'
  //           ? classroom?.selectedClassroomStemClub?.classroomName
  //           : type === 'STEM-CLUB'
  //             ? classroom?.selectedClassroomStemClub?.stemClubName
  //             : undefined;

  //       if (!classroomStemClubName) {
  //         this.uiService.alertMessage(
  //           'Error',
  //           'Classroom or Stem Club name is undefined',
  //           'warn'
  //         );
  //         return;
  //       }

  //       const filePath = await this.checkStorageFile(
  //         this.institutionInfo?.institutionId,
  //         classroomId,
  //         institutionName,
  //         classroomStemClubName
  //       );
  //       try {
  //         const task = await this.storage.upload(filePath, buffer, {
  //           contentType: 'application/pdf',
  //         });
  //         if (task.state === 'success') {
  //           this.uiService.alertMessage(
  //             'Success',
  //             'Student credentials PDF generated successfully',
  //             'success'
  //           );
  //         } else {
  //           this.uiService.alertMessage(
  //             'Error',
  //             'Failed to generate student credentials PDF',
  //             'error'
  //           );
  //           return;
  //         }

  //         this.credentialStoragePath =
  //           await task.ref.getDownloadURL();
  //         if (
  //           !classroom?.selectedClassroomStemClub?.hasOwnProperty(
  //             'studentCounter'
  //           )
  //         ) {
  //           console.error(
  //             'studentCounter not found in classroom, adding manually'
  //           );
  //           classroom.selectedClassroomStemClub.studentCounter = 0;
  //         }

  //         if (
  //           !classroom?.selectedClassroomStemClub?.hasOwnProperty(
  //             'studentCredentialStoragePath'
  //           )
  //         ) {
  //           console.error(
  //             'studentCredentialStoragePath not found in classroom, adding manually'
  //           );
  //           classroom.selectedClassroomStemClub.studentCredentialStoragePath =
  //             '';
  //         }
  //         await this.classroomService.updateClassroomSingleField(
  //           classroom?.selectedClassroomStemClub?.classroomId,
  //           'studentCredentialStoragePath',
  //           filePath
  //         );
  //         await this.classroomService.updateClassroomSingleField(
  //           classroom?.selectedClassroomStemClub?.classroomId,
  //           'studentCounter',
  //           classroom?.selectedClassroomStemClub?.studentCounter +
  //           classroom?.numberOfStudents
  //         );
  //         await this.masterService.updateMasterDocField(
  //           classroom?.selectedClassroomStemClub?.masterDocId,
  //           classroom?.selectedClassroomStemClub?.docId,
  //           'classrooms',
  //           'studentCredentialStoragePath',
  //           filePath
  //         );
  //         await this.masterService.updateMasterDocField(
  //           classroom?.selectedClassroomStemClub?.masterDocId,
  //           classroom?.selectedClassroomStemClub?.docId,
  //           'classrooms',
  //           'studentCounter',
  //           classroom?.selectedClassroomStemClub?.studentCounter +
  //           classroom?.numberOfStudents
  //         );

  //         const previousStudentCount =
  //           classroom?.selectedClassroomStemClub?.studentCounter ??
  //           0;
  //         const updatedStudentCount =
  //           previousStudentCount + classroom?.numberOfStudents;

  //         const updatedClassroom = {
  //           ...classroom.selectedClassroomStemClub,
  //           studentCredentialStoragePath: filePath,
  //           studentCounter: updatedStudentCount,
  //         };
  //         console.log('Updated Classroom 3:', updatedClassroom);

  //         this.classroomStemClubArray =
  //           this.classroomStemClubArray.map((item) =>
  //             item.classroomId === updatedClassroom.classroomId
  //               ? updatedClassroom
  //               : item
  //           );

  //         // --- NOMINATION FOR CONTESTS ---
  //         const hasLinkedContest = !!updatedClassroom.linkedContestId;

  //         if (
  //           this.selectContest !== undefined &&
  //           this.selectContest !== null &&
  //           this.selectContest !== ''
  //         ) {
  //           const contestId = this.selectContest.docId;




  //           const contestCollection = `Contest_${contestId}`;

  //           // Check if contest exists
  //           const docSnapshot = await firstValueFrom(
  //             this.contestService.getContestById(contestId)
  //           );

  //           const baseDocs = [
  //             '--InstitutionNomination--',
  //             '--TeacherAndLinkedInstitute--',
  //             '-Config-',
  //           ];

  //           for (const docId of baseDocs) {
  //             const docRef = this.afs
  //               .collection(contestCollection)
  //               .doc(docId);
  //             const baseDocSnapshot = await firstValueFrom(
  //               docRef.get()
  //             );
  //             if (!baseDocSnapshot.exists) {
  //               await docRef.set({});
  //               // console.log(`Created document ${docId} in ${contestCollection}`);
  //             }
  //           }

  //           const contestData: any = docSnapshot.data() || {
  //             stagesNames: [],
  //           };

  //           console.log('studentDocIdMap uhuhuhuuyu:', studentDocIdMap);

  //           // Loop through students and isolate per-contest nomination logic
  //           for (const docId in studentDocIdMap) {
  //             const originalStudentObj = studentDocIdMap[docId];
  //             if (!originalStudentObj) continue;
  //             const studentDocRef = this.afs
  //               .collection(contestCollection)
  //               .doc(docId);
  //             const studentDocSnap = await firstValueFrom(
  //               studentDocRef.get()
  //             );
  //             const isNewStudent = !studentDocSnap.exists;

  //             // Clone studentObj
  //             const studentObj: any = {
  //               ...originalStudentObj,
  //               board: updatedClassroom.board,
  //               age: 0,
  //               gender: '',
  //               institutionId: updatedClassroom.institutionId,
  //               institutionName:
  //                 updatedClassroom.institutionName,
  //               linkUid: deleteField(),
  //             };

  //             // Only set registeredAt if it's a new student
  //             if (isNewStudent) {
  //               studentObj.registeredAt = Timestamp.now();
  //               delete studentObj['linkUid'];
  //             }

  //             // Remove stage nomination flags
  //             Object.keys(studentObj).forEach((key) => {
  //               if (
  //                 key.startsWith('stage_') &&
  //                 key.endsWith('_nominated')
  //               ) {
  //                 delete studentObj[key];
  //               }
  //             });

  //             // Clone and update teacher metadata per contest
  //             const nominateMeta: any = {
  //               ...this.teacherObj.teacherMeta,
  //               institutionId: updatedClassroom.institutionId,
  //               updatedAt: deleteField(),
  //               uid: deleteField(),
  //               confirm: false,
  //             };

  //             // Only set nominationAt if it's a new student
  //             if (isNewStudent) {
  //               nominateMeta.nominationAt = Timestamp.now();
  //             }
  //             // Add stage nominations specific to this contest
  //             if (contestData.stagesNames?.length) {
  //               contestData.stagesNames.forEach(
  //                 (stage: any) => {
  //                   const key = `stage_${stage.stageId}_nominated`;
  //                   studentObj[key] =
  //                     stage.stageNumber === 1;
  //                 }
  //               );
  //             }

  //             // Update Firestore
  //             await studentDocRef.set(
  //               {
  //                 docId,
  //                 studentMeta: studentObj,
  //                 nominateMeta: nominateMeta,
  //               },
  //               { merge: true }
  //             );
  //           }
  //         }

  //         this.classroomStemClubInfo
  //           .get('selectedClassroomStemClub')
  //           .patchValue(updatedClassroom);
  //         const teacherData: any =
  //           await this.teacherService.getDocDataById(
  //             this.currentUser?.docId
  //           );

  //         await this.sharedService.sendWhatsAppNotification(
  //           `${this.currentUser?.countryCode}${this.currentUser?.phoneNumber}`,
  //           environment.whatsAppTemplates.studentCredentialPdf
  //             .templateName,
  //           [
  //             `${teacherData.teacherMeta.firstName} ${teacherData.teacherMeta.lastName}`,
  //             updatedClassroom.studentCounter,
  //             updatedClassroom?.classroomName ??
  //             updatedClassroom?.stemClubName,
  //             updatedClassroom?.institutionName,
  //             updatedClassroom.studentCounter,
  //             environment.projectName,
  //           ],
  //           { document: { media_url: this.credentialStoragePath } },
  //           'document',
  //           undefined
  //         );
  //         this.uiService.alertMessage(
  //           'Success',
  //           'PDF sent to WhatsApp successfully',
  //           'success'
  //         );
  //         this.isCredentialsCreated = true;
  //         this.showMoreStudents = false;
  //         this.startSpinner = false;
  //       } catch (error) {
  //         console.error(error);
  //         this.uiService.alertMessage(
  //           'Error',
  //           'Failed to generate student credentials PDF',
  //           'error'
  //         );
  //         this.startSpinner = false;
  //       }
  //     });
  //   } else {
  //     this.uiService.alertMessage(
  //       'Error',
  //       'Error Generating Students Credentials',
  //       'error'
  //     );
  //     console.error(
  //       'Error Generating Students Credentials',
  //       `Number of Custom Authentiaction Master Student Credentials is ${this.filteredCustomAuthenticationMaster?.length} is not matching with classroom counter value ${classroom?.selectedClassroomStemClub?.studentCounter}`
  //     );
  //     this.startSpinner = false;
  //     return;
  //   }
  // }


  async onSubmit(form: FormGroup) {
    this.startSpinner = true;
    this.isCredentialsCreated = false;
    const base64Images = [];
    const imageUrls = environment.pdfPlatformImages;

    for (const imageUrl of imageUrls) {
      base64Images.push(
        await this.exportService.getTextFromUrl(imageUrl)
      );
    }
    const classroom = form.value;
    if (
      classroom?.selectedClassroomStemClub?.studentCounter === 0 ||
      this.filteredCustomAuthenticationMaster?.length ===
      classroom?.selectedClassroomStemClub?.studentCounter
    ) {
      const numberOfExistingStudents =
        this.filteredCustomAuthenticationMaster?.length ??
        classroom?.selectedClassroomStemClub?.studentCounter ??
        0;

      // Extract student numbers from access codes
      const existingStudentNumbers =
        this.filteredCustomAuthenticationMaster.map((item) => {
          const accessCode = item.accessCode;
          const studentNumber = parseInt(accessCode.slice(-3), 10);
          return studentNumber;
        });

      // Sort and deduplicate the student numbers
      const existingStudents = Array.from(
        new Set(existingStudentNumbers)
      ).sort((a: number, b: number) => a - b);

      // Find the highest student number
      const highestStudentNumber =
        existingStudents.length > 0
          ? Math.max(...(existingStudents as number[]))
          : 0;

      // Create the currentStudentArray starting from highest + 1
      const currentStudentArray = Array.from(
        { length: classroom?.numberOfStudents },
        (_, i) => highestStudentNumber + i + 1
      );

      // Now you can proceed to map over existingStudents
      const existingAccounts = await Promise.all(
        existingStudents.map(async (student: number) => {
          const accessCode = `${this.institutionInfo?.institutionCode
            }${classroom?.selectedClassroomStemClub?.classroomCode
            }${student.toString().padStart(3, '0')}`;
          const matchingAuth: any = Object.values(
            this.accessCodeFromCustom
          ).find((auth: any) => auth.accessCode === accessCode);
          return matchingAuth
            ? {
              accessCode: matchingAuth.accessCode,
              password: matchingAuth.password,
              number: student,
            }
            : {};
        })
      );

      // return;
      const endUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/customStudentProfileGenerator`;
      // const endUrl = 'http://127.0.0.1:5001/backup-collection/asia-south1/customStudentProfileGenerator'
      const platformUrl = environment.pdfPlatformUrl;
      const currentAccounts = [];

      for (let index = 0; index < currentStudentArray.length; index++) {
        const student = currentStudentArray[index];
        // console.log('Generating credentials for student:', student);
        const accessCode = `${this.institutionInfo?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode
          }${student.toString().padStart(3, '0')}`;
        const body = {
          accessCode,
          student,
          selectedClassroomStemClub:
            classroom?.selectedClassroomStemClub,
        };

        try {
          const cloudFunctionResponse =
            await this.sharedService.sendToCloudFunction(
              endUrl,
              body
            );
          this.uiService.alertMessage(
            'Attention',
            `Generated credentials for student ${index + 1} of ${currentStudentArray?.length
            }`,
            'info'
          );
          if (typeof cloudFunctionResponse === 'object') {
            currentAccounts[index] =
              cloudFunctionResponse.responseBody;
          } else if (typeof cloudFunctionResponse === 'string') {
            currentAccounts[index] = JSON.parse(
              cloudFunctionResponse
            ).responseBody;
          }
        } catch (error) {
          this.uiService.alertMessage(
            'Error',
            `Failed to generate credentials for student ${index + 1
            }`,
            'error'
          );
          console.error(error);
        }
      }

      const allAccounts = [
        ...existingAccounts,
        ...currentAccounts,
      ].filter(
        (account: any) =>
          account &&
          account.accessCode &&
          account.password &&
          account.number !== undefined &&
          account.accessCode.length >= 13
      );

      let studentDocIdMap: { [docId: string]: any } = {};

      for (const account of allAccounts) {
        const code = account.accessCode;
        const customAuthQuerySnapshot = await firstValueFrom(
          this.afs
            .collection('CustomAuthentication', (ref) =>
              ref.where('accessCode', '==', code)
            )
            .get()
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

          }
        }
      }
      // Below line will generate the PDF
      const studentCredentialPdf = studentListExportPdf(
        classroom,
        base64Images,
        allAccounts,
        platformUrl
      );

      // Below line will upload the PDF to Firebase Storage
      studentCredentialPdf.getBuffer(async (buffer: any) => {
        const { classroomId, institutionName, type } =
          classroom?.selectedClassroomStemClub;
        const classroomStemClubName =
          type === 'CLASSROOM'
            ? classroom?.selectedClassroomStemClub?.classroomName
            : type === 'STEM-CLUB'
              ? classroom?.selectedClassroomStemClub?.stemClubName
              : undefined;

        if (!classroomStemClubName) {
          this.uiService.alertMessage(
            'Error',
            'Classroom or Stem Club name is undefined',
            'warn'
          );
          return;
        }

        const filePath = await this.checkStorageFile(
          this.institutionInfo?.institutionId,
          classroomId,
          institutionName,
          classroomStemClubName
        );
        try {
          const task = await this.storage.upload(filePath, buffer, {
            contentType: 'application/pdf',
          });
          if (task.state === 'success') {
            this.uiService.alertMessage(
              'Success',
              'Student credentials PDF generated successfully',
              'success'
            );
          } else {
            this.uiService.alertMessage(
              'Error',
              'Failed to generate student credentials PDF',
              'error'
            );
            return;
          }

          this.credentialStoragePath =
            await task.ref.getDownloadURL();
          if (
            !classroom?.selectedClassroomStemClub?.hasOwnProperty(
              'studentCounter'
            )
          ) {
            console.error(
              'studentCounter not found in classroom, adding manually'
            );
            classroom.selectedClassroomStemClub.studentCounter = 0;
          }

          if (
            !classroom?.selectedClassroomStemClub?.hasOwnProperty(
              'studentCredentialStoragePath'
            )
          ) {
            console.error(
              'studentCredentialStoragePath not found in classroom, adding manually'
            );
            classroom.selectedClassroomStemClub.studentCredentialStoragePath =
              '';
          }
          await this.classroomService.updateClassroomSingleField(
            classroom?.selectedClassroomStemClub?.classroomId,
            'studentCredentialStoragePath',
            filePath
          );
          await this.classroomService.updateClassroomSingleField(
            classroom?.selectedClassroomStemClub?.classroomId,
            'studentCounter',
            classroom?.selectedClassroomStemClub?.studentCounter +
            classroom?.numberOfStudents
          );
          await this.masterService.updateMasterDocField(
            classroom?.selectedClassroomStemClub?.masterDocId,
            classroom?.selectedClassroomStemClub?.docId,
            'classrooms',
            'studentCredentialStoragePath',
            filePath
          );
          await this.masterService.updateMasterDocField(
            classroom?.selectedClassroomStemClub?.masterDocId,
            classroom?.selectedClassroomStemClub?.docId,
            'classrooms',
            'studentCounter',
            classroom?.selectedClassroomStemClub?.studentCounter +
            classroom?.numberOfStudents
          );

          const previousStudentCount =
            classroom?.selectedClassroomStemClub?.studentCounter ??
            0;
          const updatedStudentCount =
            previousStudentCount + classroom?.numberOfStudents;

          const updatedClassroom = {
            ...classroom.selectedClassroomStemClub,
            studentCredentialStoragePath: filePath,
            studentCounter: updatedStudentCount,
          };

          this.classroomStemClubArray =
            this.classroomStemClubArray.map((item) =>
              item.classroomId === updatedClassroom.classroomId
                ? updatedClassroom
                : item
            );

          // --- NOMINATION FOR CONTESTS ---
          if (
            this.selectContest !== undefined &&
            this.selectContest !== null &&
            this.selectContest !== '' &&
            Array.isArray(this.selectContest) &&
            this.selectContest.length > 0
          ) {

            // Extract contest IDs for the contests array
            const selectedContestIds = this.selectContest.map(contest => contest.docId);

            // Filter new students (those that don't exist in contest collections)
            const newStudentsForCounting: { [docId: string]: any } = {};

            // Process each selected contest
            for (const contest of this.selectContest) {
              const contestId = contest.docId;
              const contestCollection = `Contest_${contestId}`;

              try {
                // Check if contest exists
                const docSnapshot = await firstValueFrom(
                  this.contestService.getContestById(contestId)
                );

                if (!docSnapshot.exists) {
                  console.warn(`Contest ${contestId} not found, skipping`);
                  continue;
                }

                // Create base documents for this contest if they don't exist
                const baseDocs = [
                  '--InstitutionNomination--',
                  '--TeacherAndLinkedInstitute--',
                  '-Config-',
                ];

                for (const docId of baseDocs) {
                  const docRef = this.afs.collection(contestCollection).doc(docId);
                  const baseDocSnapshot = await firstValueFrom(docRef.get());
                  if (!baseDocSnapshot.exists) {
                    await docRef.set({});
                  }
                }

                const contestData: any = docSnapshot.data() || {
                  stagesNames: [],
                };

                // Process each student for this specific contest
                for (const docId in studentDocIdMap) {
                  const originalStudentObj = studentDocIdMap[docId];
                  if (!originalStudentObj) continue;

                  const studentDocRef = this.afs.collection(contestCollection).doc(docId);
                  const studentDocSnap = await firstValueFrom(studentDocRef.get());
                  const isNewStudent = !studentDocSnap.exists;

                  // Track new students for counting
                  if (isNewStudent) {
                    newStudentsForCounting[docId] = originalStudentObj;
                  }

                  // Clone studentObj for this contest
                  const studentObj: any = {
                    ...originalStudentObj,
                    board: updatedClassroom.board,
                    age: 0,
                    gender: '',
                    institutionId: updatedClassroom.institutionId,
                    institutionName: updatedClassroom.institutionName,
                  };

                  // Add stemClubName if it's a STEM club
                  if (updatedClassroom?.type === 'STEM-CLUB' && updatedClassroom?.stemClubName) {
                    studentObj.stemClubName = updatedClassroom.stemClubName;
                  }

                  // Only set registeredAt if it's a new student for this contest
                  if (isNewStudent) {
                    studentObj.registeredAt = Timestamp.now();
                  }

                  // Remove existing stage nomination flags
                  Object.keys(studentObj).forEach((key) => {
                    if (key.startsWith('stage_') && key.endsWith('_nominated')) {
                      delete studentObj[key];
                    }
                  });

                  // Add stage nominations specific to this contest
                  if (contestData.stagesNames?.length) {
                    contestData.stagesNames.forEach((stage: any) => {
                      const key = `stage_${stage.stageId}_nominated`;
                      studentObj[key] = stage.stageNumber === 1;
                    });
                  }

                  // Clone and update teacher metadata per contest
                  const nominateMeta: any = {
                    ...this.teacherObj.teacherMeta,
                    institutionId: updatedClassroom.institutionId,
                    updatedAt: deleteField(),
                    uid: deleteField(),
                    confirm: false,
                  };

                  // Only set nominationAt if it's a new student for this contest
                  if (isNewStudent) {
                    nominateMeta.nominationAt = Timestamp.now();
                  }

                  // Update Firestore for this contest
                  await studentDocRef.set(
                    {
                      docId,
                      studentMeta: studentObj,
                      nominateMeta: nominateMeta,
                    },
                    { merge: true }
                  );

                }

              } catch (error) {
                console.error(`❌ Error processing contest ${contestId}:`, error);
                this.uiService.alertMessage(
                  'Warning',
                  `Failed to register students for contest: ${contest.contestTitle}`,
                  'warning'
                );
              }
            }

            // 🆕 UPDATE INSTITUTION NOMINATIONS USING SERVICE
            if (Object.keys(newStudentsForCounting).length > 0) {
              try {
                // await this.contestNominationsService.processMultipleContestNominations(
                //   this.selectContest,
                //   newStudentsForCounting,
                //   updatedClassroom,
                //   this.institutionInfo
                // );


                await this.contestNominationsService.processMultipleContestNominationsWithStemClub(
                  this.selectContest,
                  newStudentsForCounting,
                  updatedClassroom,
                  this.institutionInfo
                );
              } catch (error) {
                console.error('❌ Error updating institution nominations:', error);
              }
            }

            // 🆕 UPDATE STUDENTS COLLECTION WITH CONTESTS ARRAY

            for (const docId in studentDocIdMap) {
              try {
                const studentDocRef = this.afs.collection('Students').doc(docId);

                // Get current student document to check existing contests
                const currentStudentDoc = await firstValueFrom(studentDocRef.get());
                let existingContests: string[] = [];
                let existingContestsObj: any = {};

                if (currentStudentDoc.exists) {
                  const currentData = currentStudentDoc.data() as any;
                  // existingContests = currentData?.contests || [];
                  existingContestsObj = currentData?.contests || {};
                }

                // // Merge with new contest IDs (avoid duplicates)
                // const updatedContests = [...new Set([...existingContests, ...selectedContestIds])];

                // // Update the student document with the contests array
                // await studentDocRef.update({
                //   contests: updatedContests,
                // });

                // Create classroom info for this student
                // const classroomInfo = {
                //   classroomId: updatedClassroom.classroomId,
                //   classroomName: updatedClassroom?.classroomName || updatedClassroom?.stemClubName
                // };
                // Create classroom info for this student
                const classroomInfo: any = {
                  classroomId: updatedClassroom.classroomId,
                };

                // Check type to determine if it's STEM club or regular classroom
                if (updatedClassroom?.type === 'STEM-CLUB' && updatedClassroom?.stemClubName) {
                  classroomInfo.stemClubName = updatedClassroom.stemClubName;
                } else if (updatedClassroom?.classroomName) {
                  classroomInfo.classroomName = updatedClassroom.classroomName;
                }

                // Update contests object for each selected contest
                for (const contest of this.selectContest) {
                  const contestId = contest.docId;

                  // Initialize contest entry if it doesn't exist
                  if (!existingContestsObj[contestId]) {
                    existingContestsObj[contestId] = {
                      classrooms: {}
                    };
                  }

                  // Initialize classrooms object if it doesn't exist
                  if (!existingContestsObj[contestId].classrooms) {
                    existingContestsObj[contestId].classrooms = {};
                  }

                  // Add this classroom to the contest
                  existingContestsObj[contestId].classrooms[updatedClassroom.classroomId] = classroomInfo;
                }

                // Update the student document with the new contests structure
                await studentDocRef.update({
                  contests: existingContestsObj,
                });

                // console.log(`✅ Updated student ${docId} contests:`, existingContestsObj);

              } catch (error) {
                console.error(`❌ Error updating student ${docId} contests array:`, error);
              }
            }

            // Show success message for all contests
            const contestTitles = this.selectContest.map(c => c.contestTitle).join(', ');
            this.uiService.alertMessage(
              'Success',
              `Students registered for contests: ${contestTitles}`,
              'success'
            );

          } else if (
            this.selectContest !== undefined &&
            this.selectContest !== null &&
            this.selectContest !== '' &&
            !Array.isArray(this.selectContest)
          ) {
            // Handle single contest selection (fallback)
            console.warn('Single contest selected, but expecting array. Converting...');

            const contestId = this.selectContest.docId;
            const contestCollection = `Contest_${contestId}`;
            const newStudentsForCounting: { [docId: string]: any } = {};

            try {
              // Check if contest exists
              const docSnapshot = await firstValueFrom(
                this.contestService.getContestById(contestId)
              );

              if (docSnapshot.exists) {
                // Create base documents for this contest if they don't exist
                const baseDocs = [
                  '--InstitutionNomination--',
                  '--TeacherAndLinkedInstitute--',
                  '-Config-',
                ];

                for (const docId of baseDocs) {
                  const docRef = this.afs.collection(contestCollection).doc(docId);
                  const baseDocSnapshot = await firstValueFrom(docRef.get());
                  if (!baseDocSnapshot.exists) {
                    await docRef.set({});
                  }
                }

                const contestData: any = docSnapshot.data() || {
                  stagesNames: [],
                };

                // Process each student for this contest
                for (const docId in studentDocIdMap) {
                  const originalStudentObj = studentDocIdMap[docId];
                  if (!originalStudentObj) continue;

                  const studentDocRef = this.afs.collection(contestCollection).doc(docId);
                  const studentDocSnap = await firstValueFrom(studentDocRef.get());
                  const isNewStudent = !studentDocSnap.exists;

                  // Track new students for counting
                  if (isNewStudent) {
                    newStudentsForCounting[docId] = originalStudentObj;
                  }

                  // Clone studentObj for this contest
                  const studentObj: any = {
                    ...originalStudentObj,
                    board: updatedClassroom.board,
                    age: 0,
                    gender: '',
                    institutionId: updatedClassroom.institutionId,
                    institutionName: updatedClassroom.institutionName,
                  };

                  // Only set registeredAt if it's a new student for this contest
                  if (isNewStudent) {
                    studentObj.registeredAt = Timestamp.now();
                  }

                  // Remove existing stage nomination flags
                  Object.keys(studentObj).forEach((key) => {
                    if (key.startsWith('stage_') && key.endsWith('_nominated')) {
                      delete studentObj[key];
                    }
                  });

                  // Add stage nominations specific to this contest
                  if (contestData.stagesNames?.length) {
                    contestData.stagesNames.forEach((stage: any) => {
                      const key = `stage_${stage.stageId}_nominated`;
                      studentObj[key] = stage.stageNumber === 1;
                    });
                  }

                  // Clone and update teacher metadata per contest
                  const nominateMeta: any = {
                    ...this.teacherObj.teacherMeta,
                    institutionId: updatedClassroom.institutionId,
                    updatedAt: deleteField(),
                    uid: deleteField(),
                    confirm: false,
                  };

                  // Only set nominationAt if it's a new student for this contest
                  if (isNewStudent) {
                    nominateMeta.nominationAt = Timestamp.now();
                  }

                  // Update Firestore for this contest
                  await studentDocRef.set(
                    {
                      docId,
                      studentMeta: studentObj,
                      nominateMeta: nominateMeta,
                    },
                    { merge: true }
                  );
                }

                // 🆕 UPDATE INSTITUTION NOMINATION USING SERVICE
                if (Object.keys(newStudentsForCounting).length > 0) {
                  try {
                    // await this.contestNominationsService.processSingleContestNomination(
                    //   this.selectContest,
                    //   newStudentsForCounting,
                    //   updatedClassroom,
                    //   this.institutionInfo
                    // );

                    await this.contestNominationsService.processSingleContestNominationWithStemClub(
                      this.selectContest,
                      newStudentsForCounting,
                      updatedClassroom,
                      this.institutionInfo
                    );
                  } catch (error) {
                    console.error('❌ Error updating institution nomination:', error);
                  }
                }

                // Update Students collection for single contest
                for (const docId in studentDocIdMap) {
                  try {
                    const studentDocRef = this.afs.collection('Students').doc(docId);

                    // Get current student document
                    const currentStudentDoc = await firstValueFrom(studentDocRef.get());
                    let existingContests: string[] = [];

                    if (currentStudentDoc.exists) {
                      const currentData = currentStudentDoc.data() as any;
                      existingContests = currentData?.contests || [];
                    }

                    // Add new contest ID if not already present
                    if (!existingContests.includes(this.selectContest.docId)) {
                      existingContests.push(this.selectContest.docId);

                      await studentDocRef.update({
                        contests: existingContests,
                      });

                    }

                  } catch (error) {
                    console.error(`❌ Error updating student ${docId} with single contest:`, error);
                  }
                }

                this.uiService.alertMessage(
                  'Success',
                  `Students registered for contest: ${this.selectContest.contestTitle}`,
                  'success'
                );
              }
            } catch (error) {
              console.error(`❌ Error processing single contest ${contestId}:`, error);
              this.uiService.alertMessage(
                'Warning',
                `Failed to register students for contest: ${this.selectContest.contestTitle}`,
                'warning'
              );
            }
          }

          this.classroomStemClubInfo
            .get('selectedClassroomStemClub')
            .patchValue(updatedClassroom);
          const teacherData: any =
            await this.teacherService.getDocDataById(
              this.currentUser?.docId
            );

          await this.sharedService.sendWhatsAppNotification(
            `${this.currentUser?.countryCode}${this.currentUser?.phoneNumber}`,
            environment.whatsAppTemplates.studentCredentialPdf
              .templateName,
            [
              `${teacherData.teacherMeta.firstName} ${teacherData.teacherMeta.lastName}`,
              updatedClassroom.studentCounter,
              updatedClassroom?.classroomName ??
              updatedClassroom?.stemClubName,
              updatedClassroom?.institutionName,
              updatedClassroom.studentCounter,
              environment.projectName,
            ],
            { document: { media_url: this.credentialStoragePath } },
            'document',
            undefined
          );
          await this.refreshAuthenticationData();
          this.uiService.alertMessage(
            'Success',
            'PDF sent to WhatsApp successfully',
            'success'
          );
          this.isCredentialsCreated = true;
          this.showMoreStudents = false;
          this.startSpinner = false;
        } catch (error) {
          console.error(error);
          this.uiService.alertMessage(
            'Error',
            'Failed to generate student credentials PDF',
            'error'
          );
          this.startSpinner = false;
        }
      });
    } else {
      this.uiService.alertMessage(
        'Error',
        'Error Generating Students Credentials',
        'error'
      );
      console.error(
        'Error Generating Students Credentials',
        `Number of Custom Authentication Master Student Credentials is ${this.filteredCustomAuthenticationMaster?.length} is not matching with classroom counter value ${classroom?.selectedClassroomStemClub?.studentCounter}`
      );
      this.startSpinner = false;
      return;
    }
  }

  async checkStorageFile(
    institutionId: string,
    classroomId: string,
    institutionName: string,
    classroomStemClubName: string
  ) {
    let counter = 1;
    let storagePath: string;
    storagePath = `student_credentials/${institutionId}/${classroomId}/${institutionName} ${classroomStemClubName} v${counter
      .toString()
      .padStart(3, '0')}.pdf`;
    do {
      try {
        const exists = await lastValueFrom(
          this.storage.ref(storagePath).getDownloadURL()
        );
        if (exists) {
          counter++;
          storagePath = `student_credentials/${institutionId}/${classroomId}/${institutionName} ${classroomStemClubName} v${counter
            .toString()
            .padStart(3, '0')}.pdf`;
        }
      } catch (error) {
        return storagePath;
      }
    } while (counter < 1000);
  }

  toggleStudentsMenu() {
    this.showMoreStudents = !this.showMoreStudents;
  }

  async onSelectClassroom(): Promise<void> {
    this.isClassroomStemClubSelected = true;
    const classroom = this.classroomStemClubInfo.value;
    if (!classroom?.selectedClassroomStemClub) {
      return;
    }

    await this.refreshAuthenticationData();
    this.getStudentDocumentsBasedOnCustomAuth();

    const accessCodePrefix = `${this.institutionInfo?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode}`;

    try {
      const snapshot = await this.afs
        .collection('CustomAuthentication')
        .get()
        .toPromise();
      const matchingDocs = snapshot.docs.filter((doc) => {
        const data = doc.data() as { accessCode?: string };
        return data?.accessCode?.startsWith(accessCodePrefix);
      });
      this.accessCodeFromCustom = matchingDocs.map((doc) => doc.data());
      this.filteredCustomAuthenticationMaster =
        this.accessCodeFromCustom.filter((customAuth: any) =>
          customAuth?.accessCode?.startsWith(accessCodePrefix)
        );
      const studentCounter =
        classroom?.selectedClassroomStemClub?.studentCounter ?? 0;
      if (
        this.filteredCustomAuthenticationMaster === 0 ||
        this.filteredCustomAuthenticationMaster.length ===
        studentCounter
      ) {
        // Enable the form
        this.classroomStemClubInfo.enable();
        this.disableToggleToCheckCounter = true;
      } else {
        // Disable the form if mismatch
        this.classroomStemClubInfo.disable();
        this.disableToggleToCheckCounter = false;
        this.uiService.alertMessage(
          'Error',
          `Mismatch between existing credentials (${this.filteredCustomAuthenticationMaster.length}) and student classroom counter (${studentCounter})`,
          'error'
        );
        console.error('Mismatch detected. Form disabled.');
      }
    } catch (error) {
      console.error(
        'Error while checking CustomAuthentication data:',
        error
      );
      this.uiService.alertMessage(
        'Error',
        'Failed to fetch authentication data.',
        'error'
      );
      this.classroomStemClubInfo.disable();
    }
  }

  async openRemoteDialog() {
    if (this.isPairing) return;
    this.isPairing = true;
    try {
      // Guard: require a classroom selection (your button is already disabled, but keep this)
      const selectedClassroom =
        this.classroomStemClubInfo?.value?.selectedClassroomStemClub;
      if (!selectedClassroom?.docId) {
        this.uiService.alertMessage(
          'Error',
          'No classroom selected.',
          'error'
        );
        return;
      }

      // ✅ 1) Ask to connect the receiver FIRST (inside the click gesture)
      const granted = await this.usbService.requestReceiverFromUser(); // shows chooser on first click
      if (granted) {
        const ok = await this.usbService.setupReceiver();
        if (ok) this.usbService.startListening();
      } else {
        // Optional: continue without a receiver, or bail with a toast
        // this.uiService.alertMessage('Info', 'No receiver connected. Continuing without remotes.', 'info');
      }

      // ✅ 2) Now do your existing async work (Firestore queries, dialog open, etc.)
      const uId = this.currentUser?.uid;
      const institutionId = this.institutionInfo?.institutionId;
      const classroomDocId = selectedClassroom.docId;

      const studentSnap = await this.afs
        .collection('Students', (ref) =>
          ref.where(
            `classrooms.${classroomDocId}.classroomId`,
            '==',
            classroomDocId
          )
        )
        .get()
        .toPromise();

      const studentsWithAccessCodes = await Promise.all(
        studentSnap.docs.map(async (doc) => {
          const studentData: any = doc.data();
          const firstName = studentData?.studentMeta?.firstName ?? '';
          const lastName = studentData?.studentMeta?.lastName ?? '';
          const studentDocId = doc.id;

          try {
            const authDoc = await this.afs
              .collection('CustomAuthentication')
              .doc(studentDocId)
              .get()
              .toPromise();
            const authData = authDoc.data() as
              | { accessCode?: string }
              | undefined;
            const accessCode = authData?.accessCode ?? '';
            return accessCode
              ? {
                studentDocId,
                studentName:
                  `${firstName} ${lastName}`.trim(),
                accessCode,
              }
              : null;
          } catch {
            return null;
          }
        })
      );

      let students = studentsWithAccessCodes.filter(Boolean) as {
        studentDocId: string;
        studentName: string;
        accessCode: string;
      }[];

      if (students.length === 0) {
        this.isRemoteAvailable = false;
        this.uiService.alertMessage(
          'Warning',
          'No students with valid access codes found.',
          'warning'
        );
        return;
      }

      students.sort(
        (a, b) =>
          parseInt(a.accessCode.slice(-3), 10) -
          parseInt(b.accessCode.slice(-3), 10)
      );
      this.isRemoteAvailable = true;

      const masterDoc = await this.afs
        .collection('Master')
        .doc('snappyRemotes')
        .get()
        .toPromise();
      const masterData = masterDoc.data() as { remotes?: string[] };
      const macAddresses: string[] = masterData?.remotes || [];
      if (macAddresses.length === 0) {
        this.uiService.alertMessage(
          'Warning',
          'No remotes found in Master/snappyRemotes.',
          'warning'
        );
        return;
      }

      const teacherSnap = await this.afs
        .collection('Teachers', (ref) =>
          ref.where(`teacherMeta.uid`, '==', uId)
        )
        .get()
        .toPromise();

      const teacherDoc = teacherSnap?.docs?.[0];
      if (!teacherDoc) {
        this.uiService.alertMessage(
          'Error',
          'Current teacher not found in Teachers collection.',
          'error'
        );
        return;
      }

      const teacherData = teacherDoc.data() as any;
      const teacherId = teacherDoc.id;
      const teacherName = `${teacherData?.teacherMeta?.firstName || ''} ${teacherData?.teacherMeta?.lastName || ''
        }`.trim();

      this.dialog.open(StudentRemoteMappComponent, {
        width: '500px',
        data: {
          students,
          macAddresses,
          teacherId,
          teacherName,
          classroomDocId,
          institutionId,
        },
      });
    } catch (error) {
      console.error('❌ Error during remote dialog setup:', error);
      this.uiService.alertMessage(
        'Error',
        'Failed to fetch student or remote data.',
        'error'
      );
    } finally {
      this.isPairing = false;
    }
  }

  // onContestRegistrationChange(event: any) {
  //     if(!event){
  //         this.selectContest = '';
  //         console.log('Contest deselected', this.selectContest);
  //     }
  // }

  onContestRegistrationChange(value: boolean) {
    if (!value) {
      this.selectContest = []; // Clear selected contests when "No" is selected
    }
  }


  /**
   * Check if there's a mismatch between credentials and student counter
   */
  hasMismatch(): boolean {
    const selectedClassroom = this.classroomStemClubInfo?.get('selectedClassroomStemClub')?.value;

    if (!selectedClassroom) return false;

    const studentCounter = selectedClassroom?.studentCounter ?? 0;
    const credentialsCount = this.filteredCustomAuthenticationMaster?.length ?? 0;

    // Return true if there's a mismatch and classroom is selected
    return this.isClassroomStemClubSelected &&
      studentCounter !== credentialsCount &&
      studentCounter > 0;
  }

  /**
   * Fix the counter mismatch
   */
  async fixCounter(): Promise<void> {
    const selectedClassroom = this.classroomStemClubInfo?.get('selectedClassroomStemClub')?.value;

    if (!selectedClassroom) {
      this.uiService.alertMessage('Error', 'No classroom selected', 'error');
      return;
    }

    const credentialsCount = this.filteredCustomAuthenticationMaster?.length ?? 0;
    const currentCounter = selectedClassroom?.studentCounter ?? 0;

    // Show confirmation dialog
    const config = {
      title: 'Fix Student Counter',
      message: `Current student counter: ${currentCounter}
      <br>
    Actual credentials found: ${credentialsCount}
    <br>
    This will update the student counter to match the actual credentials count.
    Are you sure you want to proceed?`,
      // icon: {
      //   name: 'mat_outline:delete'
      // }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result !== 'confirmed') {
        return;
      }

      try {
        this.startSpinner = true;

        // Update the classroom document
        await this.classroomService.updateClassroomSingleField(
          selectedClassroom.classroomId,
          'studentCounter',
          credentialsCount
        );

        // Update the master document
        await this.masterService.updateMasterDocField(
          selectedClassroom.masterDocId,
          selectedClassroom.docId,
          'classrooms',
          'studentCounter',
          credentialsCount
        );

        // Update local array
        const updatedClassroom = {
          ...selectedClassroom,
          studentCounter: credentialsCount
        };

        this.classroomStemClubArray = this.classroomStemClubArray.map((item) =>
          item.classroomId === updatedClassroom.classroomId
            ? updatedClassroom
            : item
        );

        // Update form value
        this.classroomStemClubInfo.get('selectedClassroomStemClub').patchValue(updatedClassroom);

        // Re-enable form since mismatch is fixed
        this.classroomStemClubInfo.enable();
        this.disableToggleToCheckCounter = true;

        this.uiService.alertMessage(
          'Success',
          `Student counter updated from ${currentCounter} to ${credentialsCount}`,
          'success'
        );

      } catch (error) {
        console.error('Error fixing counter:', error);
        this.uiService.alertMessage(
          'Error',
          'Failed to update student counter',
          'error'
        );
      } finally {
        this.startSpinner = false;
      }
    });
  }


  /**
 * Refresh authentication data for the currently selected classroom
 */
  async refreshAuthenticationData(): Promise<void> {
    const classroom = this.classroomStemClubInfo.value;
    if (!classroom?.selectedClassroomStemClub) {
      return;
    }

    const accessCodePrefix = `${this.institutionInfo?.institutionCode}${classroom?.selectedClassroomStemClub?.classroomCode}`;

    try {

      const snapshot = await this.afs
        .collection('CustomAuthentication')
        .get()
        .toPromise();

      const matchingDocs = snapshot.docs.filter((doc) => {
        const data = doc.data() as { accessCode?: string };
        return data?.accessCode?.startsWith(accessCodePrefix);
      });

      this.accessCodeFromCustom = matchingDocs.map((doc) => doc.data());
      this.filteredCustomAuthenticationMaster =
        this.accessCodeFromCustom.filter((customAuth: any) =>
          customAuth?.accessCode?.startsWith(accessCodePrefix)
        );

      // Check for mismatch after refresh
      const studentCounter = classroom?.selectedClassroomStemClub?.studentCounter ?? 0;
      const credentialsCount = this.filteredCustomAuthenticationMaster?.length ?? 0;

      if (credentialsCount === studentCounter) {
        // Enable form if counts match
        this.classroomStemClubInfo.enable();
        this.disableToggleToCheckCounter = true;
      } else {
        console.warn(`⚠️ Mismatch detected: ${credentialsCount} credentials vs ${studentCounter} counter`);
      }

    } catch (error) {
      console.error('❌ Error refreshing authentication data:', error);
    }
  }


  async getStudentDocumentsBasedOnCustomAuth() {
    this.allContestIdPatched = [];
    // for (const auth of this.filteredCustomAuthenticationMaster) {
    //     const studentData: any = await this.studentService.getStudentInfo(auth.docId);

    //     // Handle new contests object structure where contests is an object with contestIds as keys
    //     if (studentData?.contests) {
    //       if (typeof studentData.contests === 'object' && !Array.isArray(studentData.contests)) {
    //         // New structure: contests is an object { contestId: { classrooms: {...} } }
    //         const contestIds = Object.keys(studentData.contests);
    //         this.allContestIdPatched.push(...contestIds);
    //       } else if (Array.isArray(studentData.contests)) {
    //         // Old structure: contests is an array of contestIds (backward compatibility)
    //         this.allContestIdPatched.push(...studentData.contests);
    //       }
    //     }
    //   }

    // for (const auth of this.filteredCustomAuthenticationMaster) {
    //   const studentData: any = await this.studentService.getStudentInfo(auth.docId);
    //   if (studentData?.contests?.length) {
    //     this.allContestIdPatched.push(...studentData.contests); // merge arrays
    //   }
    // }

    for (const auth of this.filteredCustomAuthenticationMaster) {
      const studentData: any = await this.studentService.getStudentInfo(auth.docId);

      // Handle new contests object structure where contests is an object with contestIds as keys
      if (studentData?.contests) {
        if (typeof studentData.contests === 'object' && !Array.isArray(studentData.contests)) {
          // New structure: contests is an object { contestId: { classrooms: {...} } }
          const contestIds = Object.keys(studentData.contests);
          this.allContestIdPatched.push(...contestIds);
        } else if (Array.isArray(studentData.contests)) {
          // Old structure: contests is an array of contestIds (backward compatibility)
          this.allContestIdPatched.push(...studentData.contests);
        }
      }
    }
    this.allContestIdPatched = [...new Set(this.allContestIdPatched)];

    if (this.allContestIdPatched.length === 0) {
      this.selectContest = [];
      return;
    }

    const matchingContests = this.finalContestsLst?.filter(contest =>
      this.allContestIdPatched.includes(contest.docId)
    ) || [];

    if (matchingContests.length > 0) {
      // Patch the contests to the form
      this.selectContest = matchingContests;
    }
  }
}
