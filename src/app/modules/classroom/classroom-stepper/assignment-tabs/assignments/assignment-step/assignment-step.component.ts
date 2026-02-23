import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { arrayUnion, serverTimestamp } from '@angular/fire/firestore';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ActivatedRoute } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { AssignmentDialogComponent } from 'app/modules/assignment-dialog/assignment-dialog.component';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { first, firstValueFrom, lastValueFrom, take } from 'rxjs';

@Component({
  selector: 'app-assignment-step',
  templateUrl: './assignment-step.component.html',
  styleUrls: ['./assignment-step.component.scss']
})
export class AssignmentStepComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() assignmentData: any;
  @Input() currentsubmissionurl: any;

  @Input() stepperData: MatStepper;
  @Input() assignment: any;
  @Input() successMessage: string;
  @Input() failureMessage: string;
  @Input() extensionMessage: string;
  @Input() sizeWarningMessage: string;
  @Input() counterTime: number;
  @Input() parent: string;
  @Input() totalTime: number;
  @Input() isTimeExceeded: boolean = false;
  @Input() previousAssignment: any;
  @Input() index: number;
  @Input() contentIndex: any;
  @Input() asgnId;
  @Input() currentWorkflow;
  @Input() workflowId;
  @Input() currentMatIndex;
  @Input() assignmentIdwithtabchange: string;
  @Output() stepTime = new EventEmitter<number>();
  @Output() stepCompletion = new EventEmitter<any>();
  @ViewChild('elementRef', { static: false })
  elementRef: ElementRef;
  storageBucket = 'student_submissions';
  bytesTransferred: number;
  loader: boolean = false;
  params: any;
  filename: any;
  @Output() changeMatstep = new EventEmitter<any>();
  storedFilePath: string = '';
  previousAttempts: number;
  completionMessage: string = '';
  requiredInfo: any;
  acceptedFormats: any;
  currentassignement = '';

  @Input() currentData: any;
  constructor(
    private afStore: AngularFireStorage,
    private assignmentsService: AssignmentsService,
    private deviceInfoService: DeviceInfoService,
    private studentService: StudentsService,
    private uiService: UiService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private workFlowCompletionService: WorkflowCompletionService,
    private userService: UserService,
    private configurationService: ConfigurationService,
  ) { }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes.currentMatIndex || changes.assignmentIdwithtabchange || changes.currentData) {
      // console.log('çhangeinassignment')
      const data = this.currentData['submissionId_' + (this.currentMatIndex + 1)];
      if (data) {
        this.currentassignement = data.submissionPath;
        // console.log(this.currentassignement)

        this.storedFilePath = this.currentassignement ? this.currentassignement : '';

      }
      else {
        console.log('no data');
        this.currentassignement = '';
        this.storedFilePath = '';
      }
      // this.storedFilePath=data.submissionPath?data.submissionPath:''
    }
  }


  async ngAfterViewInit(): Promise<void> {
    this.params = await lastValueFrom(this.route.queryParams.pipe(first()));
    const teacherId = await this.userService.getUid();
    this.requiredInfo = JSON.parse(JSON.stringify(this.params));;
    this.requiredInfo.teacherId = teacherId;
    this.requiredInfo.docId = teacherId;
    this.requiredInfo.assignmentId = this.asgnId;
    // this.assignmentsService.getTeachersResources({ docId: this.requiredInfo.teacherId, classroomId: this.requiredInfo.classroomId, programmeId: this.requiredInfo.programmeId }).subscribe(res => {
    //   let teacherSubmission = res.data();
    //   this.storedFilePath = teacherSubmission?.[`programmeId_${this.requiredInfo.programmeId}`]?.[`assignmentId_${this.asgnId}`]?.[`submissionId_${this.assignmentData.submissionId}`]?.submissionPath;
    // })
    this.storedFilePath = this.currentassignement ? this.currentassignement : '';

  }

  async ngOnInit(): Promise<void> {
    const acceptedFormats = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('acceptedUploadFormats'));
    this.acceptedFormats = acceptedFormats.get('formats');
    this.previousAttempts = 0;
  }

  async upload(event: any) {
    this.loader = true;
    this.filename = event.target.files[0].name;
    const uploadType = this.assignmentData.uploadFileType.toLowerCase() as string;
    const isValid = this.fileTypeAndSizeCheck(event.target.files[0], uploadType);
    if (isValid) {
      const bucketPath = `${this.storageBucket}/${this.requiredInfo.teacherId}/${this.requiredInfo.programmeId}_${this.requiredInfo.assignmentId}_${this.assignmentData.submissionId}.` + this.filename.split('.').slice(-1).pop();
      const ref = this.afStore.ref(bucketPath);
      //putting the file into storage with custom metadata
      const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();

      await lastValueFrom(task).then((uploadedSnapshot) => {
        this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100;
        if (uploadedSnapshot.state === 'success') {
          this.uiService.alertMessage('successful', this.successMessage, 'success');
          this.loader = false;
        };
      });

      this.assignmentObj(bucketPath);
    }
    else {
      this.uiService.alertMessage('Error', 'Invalid file type/ Exceeding size limit', 'error');
    }
    this.elementRef.nativeElement.value = '';
    this.stepTime.emit(this.counterTime);
    this.stepCompletion.emit({ isStepComplete: true, index: this.index });
  }

  async checkResourcePath(resource: any) {
    if (Object.keys(resource).length > 0) {
      const resourceData = resource?.[`programmeId_${this.requiredInfo.programmeId}`]?.[`assignmentId_${this.requiredInfo.assignmentId}`]?.[`submissionId_${this.assignmentData.submissionId}`];
      this.storedFilePath = resourceData?.submissionPath;
    } else {
      this.storedFilePath = '';
    }
  }

  ngOnDestroy(): void {
    this.assignmentsService.isAssignmentTab.next(false);
  }

  async assignmentObj(bucketPath: string) {
    // const timeIpResponse = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    // const [time, ip] = timeIpResponse ?
    //   await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first())) : [new Date(), ''];

    // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const d = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

    const timeTaken = this.totalTime - this.counterTime;
    let obj;

    if (this.workflowId) {
      obj = {
        [`workflowId_${this.workflowId}`]: {
          [`assignmentId_${this.requiredInfo.assignmentId}`]: {
            lastAttemptTime: serverTimestamp(),
            userAgent: navigator.userAgent,
            clientIp: ip,
            [`submissionId_${this.assignmentData.submissionId}`]: {
              submissionPath: bucketPath,
              type: this.assignmentData.uploadFileType,
              timeTaken,
            }
          }
        },
        teacherId: this.requiredInfo.teacherId,
        versions: {
          [`workflowId_${this.workflowId}`]: {
            [`assignmentId_${this.requiredInfo.assignmentId}`]: {
              [`attempt${this.previousAttempts + 1}`]: {
                attemptNumber: this.previousAttempts + 1,
                lastAttemptTime: serverTimestamp(),
                userAgent: navigator.userAgent,
                clientIp: ip,
                [`submissionId_${this.assignmentData.submissionId}`]:
                {
                  submissionPath: bucketPath,
                  type: this.assignmentData.uploadFileType,
                  timeTaken,
                }
              }
            }
          }
        },
        createdAt: serverTimestamp(),
        submissionMeta: arrayUnion(d)
      };
    }
    else {
      obj = {
        [`programmeId_${this.requiredInfo.programmeId}`]: {
          [`assignmentId_${this.requiredInfo.assignmentId}`]: {
            lastAttemptTime: serverTimestamp(),
            userAgent: navigator.userAgent,
            clientIp: ip,
            [`submissionId_${this.assignmentData.submissionId}`]: {
              submissionPath: bucketPath,
              type: this.assignmentData.uploadFileType,
              timeTaken,
            }
          }
        },
        teacherId: this.requiredInfo.teacherId,
        versions: {
          [`programmeId_${this.requiredInfo.programmeId}`]: {
            [`assignmentId_${this.requiredInfo.assignmentId}`]: {
              [`attempt${this.previousAttempts + 1}`]: {
                attemptNumber: this.previousAttempts + 1,
                lastAttemptTime: serverTimestamp(),
                userAgent: navigator.userAgent,
                clientIp: ip,
                [`submissionId_${this.assignmentData.submissionId}`]:
                {
                  submissionPath: bucketPath,
                  type: this.assignmentData.uploadFileType,
                  timeTaken,
                }
              }
            }
          }
        },
        createdAt: serverTimestamp(),
        submissionMeta: arrayUnion(d)
      };
    }
    this.assignmentsService.updateTeachersSubmission(obj, this.requiredInfo).then(async () => {
      this.storedFilePath = bucketPath;
      this.assignmentsService.existingAssignment = (await lastValueFrom(this.assignmentsService.getTeachersResources({ teacherId: this.requiredInfo.teacherId, classroomId: this.requiredInfo.classroomId, programmeId: this.requiredInfo.programmeId }))).data();
      this.uiService.alertMessage('Successful', 'File uploaded successfully', 'success');
      this.workFlowCompletionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
    }).catch((error) => {
      this.uiService.alertMessage('Error', 'Error while uploading', 'error');
      console.error(error);
    });

  }

  fileTypeAndSizeCheck(event: any, uploadType: string) {
    // const allowedExtensions = this.parent === 'image' ? /(\.jpeg|\.png|\.jpg)$/i : this.parent === 'pdf' ? /(\.pdf)$/i : /(.\s)$/i;
    const allowedExtensions = new RegExp(`\\.(${this.acceptedFormats[uploadType].map((ext: string) => ext.slice(1)).join('|')})$`, 'i');
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid file type', this.extensionMessage, 'warn');
      this.elementRef.nativeElement.value = '';
      this.filename = '';
      isValid = false;
      this.loader = false;
    }
    else if (event.size > 3145728) {
      this.uiService.alertMessage('Invalid file type', this.sizeWarningMessage, 'warn');
      this.elementRef.nativeElement.value = '';
      this.filename = '';
      isValid = false;
      this.loader = false;
    }
    else {
      isValid = true;
    };
    return isValid;
  }

  async onClickView() {
    if (this.parent === 'pdf') {
      // importing assignment - dialog.module
      // await import('../../assignment-dialog/assignment-dialog.module')
      await import('../../../../../assignment-dialog/assignment-dialog.module');

      const resource = await lastValueFrom(this.assignmentsService.getTeachersResources(this.requiredInfo).pipe(take(1)));
      const resourceData = resource.get(this.requiredInfo.programmeId)[this.requiredInfo.assignmentId];
      this.dialog.open(AssignmentDialogComponent, {
        data: resourceData
      });
    };
  }

  /*
  // function not in use
  createAnchorTag(url: string) {
    let a = document.createElement('a')
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.click()
  }
  */



}
