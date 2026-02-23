import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { ActivatedRoute } from '@angular/router';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ContestSubmissionsService } from 'app/core/dbOperations/contestSubmissions/contestSubmissions.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
import { arrayUnion, serverTimestamp, Timestamp } from "firebase/firestore";
import { Observable, take } from 'rxjs';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ContestInteractionService } from 'app/modules/contest-interaction/contest-interaction.service';
import { SharedService } from 'app/shared/shared.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-video-upload',
  templateUrl: './video-upload.component.html',
  styleUrls: ['./video-upload.component.scss']
})
export class VideoUploadComponent implements OnInit, AfterViewInit {
  @Output() isAttemptedEvent: EventEmitter<any> = new EventEmitter();
  @Input() assignmentData: any
  @Input() currentWorkflow: any
  @Input() workflowId: any
  @Input() asgnId: any
  @Input() rawWorkflowInfo
  @Input() isLastStep
  @Input() selectedStageSubmInfo
  @Input() isOldcontest
  @Input() contestInfo
  @Input() current
  @Input() total
  @ViewChild('elementRef', { static: false })

  filename: any;
  elementRef: ElementRef;
  message: string
  storageBucket = 'contest_submissions'
  bytesTransferred
  loader = false
  params: any;
  private ipUrl = 'https://api.ipify.org?format=json';
  storedFilePath: string = ''
  studentId: any;
  isFinalSubmission = false;
  isContestEnd: boolean = false;
  incompleteSubmissions: any;
  inBetweenContest: boolean = false;
  isContestStarted: boolean = false;
  currentStage: any;

  constructor(
    private afStore: AngularFireStorage,
    private uiService: UiService,
    private route: ActivatedRoute,
    private userService: UserService,
    private studentService: StudentsService,
    private contestService: ContestService,
    protected http: HttpClient,
    private cdRef: ChangeDetectorRef,
    private contestSubmissionsService: ContestSubmissionsService,
    private fuseConfirmationService: FuseConfirmationService,
    private contestInteractionService: ContestInteractionService,
    private sharedService: SharedService,
    @Inject(MAT_DIALOG_DATA) private dialogData: any,
  ) { }

  ngAfterViewInit(): void {
    this.studentService.currentStudent.subscribe(studentInfo => {
      const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
      this.currentStage = currentStage;
      const isAllStepsMandatory = currentStage.isAllStepsMandatory;
      if (this.isLastStep && isAllStepsMandatory) {
        this.contestInteractionService.incompleteSubmissions(studentInfo.docId, this.rawWorkflowInfo, this.currentWorkflow, this.params).subscribe(res => {
          this.incompleteSubmissions = res
        })
      }
      this.isFinalSubmission = studentInfo?.contestSubmissions?.[`contestId_${this.params.contestId}`]?.[`stageId_${this.params.stageId}`]?.[`submId_${this.params.submId}`]?.isSubmitted
        === true ? true : false;
    })

    this.contestService.isStage2ContestEnd()
    const isContestEnd = this.contestService.isContestEnd()
    if (isContestEnd) {
      this.isContestEnd = true
      this.isFinalSubmission = true
    }

    const inBetweenContest = this.contestService.isInBetweenContest();
    if (inBetweenContest) {
        this.inBetweenContest = true

    }

    const isContestStarted = this.contestService.isContestStart();
    if (isContestStarted) {
       this.isContestStarted = true;
    }
    // this.studentService.currentStudent.subscribe(studentInfo => {
    //     if (studentInfo?.stage1_extension) {
    //         this.isContestEnd = false
    //         this.isFinalSubmission = studentInfo?.contestSubmissions?.[`contestId_${this.params.contestId}`]?.[`stageId_${this.params.stageId}`]?.[`submId_${this.params.submId}`]?.isSubmitted
    //             === true ? true : false;
    //     }
    // })

    this.checkResourcePath();

    this.cdRef.detectChanges();
  }

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
    })

    await this.getCurrentStudent();
  }

  async upload(event) {
    this.storedFilePath = ''
    this.loader = true
    this.filename = event.target.files[0].name
    const isValid = this.videoTypeAndSizeCheck(event.target.files[0])
    if (isValid) {
      const bucketPath = `${this.storageBucket}/${this.params.contestId}/${this.params.stageId}/${this.dialogData?.queryParams?.submId}/${this.dialogData?.studentInfo?.docId}-${this.params.contestId}/${this.asgnId}_${this.assignmentData.submissionId}.` + this.filename.split('.').slice(-1).pop()
      const ref = this.afStore.ref(bucketPath);
      //putting the file into storage with custom metadata
      const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();

      task.subscribe(async uploadedSnapshot => {
        this.bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100);
        if (uploadedSnapshot.state === "success") {
          this.uiService.alertMessage('successful', 'The video file is uploaded successfully', 'success')
          this.loader = false
          this.bytesTransferred = 0
          await this.assignmentObj(bucketPath)
        }
      })

      // await lastValueFrom(task).then(uploadedSnapshot => {
      //   this.bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100);
      //   if (uploadedSnapshot.state === "success") {
      //     this.uiService.alertMessage('successful', 'The image files is uploaded successfully', 'success')
      //     this.loader = false
      //   }
      // })
    }
  }

  checkResourcePath() {
    const submissionMeta = this.studentService.contestSubmissionMeta.value

    const resourceData = submissionMeta?.[`assignmentId-${this.asgnId}`]?.[this.assignmentData?.submissionId] || ''
    this.storedFilePath = resourceData?.submissionPath || '';
    this.storedFilePath.length ? this.currentWorkflow.isAttempted = true : this.currentWorkflow.isAttempted = false;
  }

  getIpAddress(): Observable<any> {
    return this.http.get(this.ipUrl);
  }

  //   getIpAddressCurrent(){
  //     let ip=""
  //     this.getIpAddress().subscribe(
  //         data => {
  //           ip=data.ip
  //         },
  //         error => {
  //           console.error('Error getting IP address:', error);
  //         }
  //       );
  //       return ip
  //   }
  async getIpAddressCurrent() {
    return new Promise((resolve) => {
      this.getIpAddress().subscribe(
        data => {
          //ip=data.ip
          resolve(data.ip)
        },
        () => {
          resolve('null')
          // console.error('Error getting IP address:', error);
        }
      );
    })
  }

  async assignmentObj(bucketPath) {
    //let [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()))
    // const d = { clientIp: ip, submissionTime: serverTimestamp() }
    const d = { clientIp: await this.getIpAddressCurrent(), submissionTime: Timestamp.now().toDate() }
    let obj = {
      [`stageId-${this.params.stageId}`]: {
        [`submId-${this.params.submId}`]: { [`assignmentId-${this.asgnId}`]: { [this.assignmentData.submissionId]: { submissionPath: bucketPath, type: this.assignmentData.uploadFileType } } }
      },
      createdAt: serverTimestamp(),
      submissionMeta: arrayUnion(d),
    }

    try {
      await this.contestSubmissionsService.updateInContestSubmission(obj, this.dialogData?.studentInfo?.docId, this.params.contestId);
      await this.contestInteractionService.setFlagInStudentDoc(this.params, this.dialogData?.studentInfo?.docId, this.asgnId, this.isLastStep);
      if (this.current === this.total) {
        const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
        const isAllStepsMandatory = currentStage.isAllStepsMandatory;
        if (this.isLastStep) {
          const phone = this.studentService.currentStudent.value.studentMeta.countryCode + this.studentService.currentStudent.value.studentMeta.phoneNumber;
          if (!phone || !phone.length) {
            console.error(`Whatsapp notification not sent as phone number is not available for student ${this.dialogData?.studentInfo?.docId}: `, phone);
          } else {
            const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
            const submissionArray = currentStage.submissions;
            const isLastSubmission = submissionArray.length > 0 && submissionArray[submissionArray.length - 1].submissionId === this.params.submId;

            const { classroomId, contestId, institutionId, stageId, studentId, submId } = this.params;
            const studentFullName = this.studentService.currentStudent.value.studentMeta.firstName + ' ' + this.studentService.currentStudent.value.studentMeta.lastName;
            const submissionNumber = this.assignmentData.submissionId;
            const submissionTitle = this.currentWorkflow.contestStepName;
            const stageName = currentStage.stageName;
            const contestTitle = this.contestInfo.contestTitle;
            const urlLink = this.contestInfo.urlLink;
            const selectionOption = currentStage.stageName;
            const selectionMenu = `${contestTitle} "Contests and Challenges"`;
            const contestResultDate = currentStage.hasOwnProperty(`stage_${this.params.stageId}_result_date`) ? this.sharedService.getFormattedDate(currentStage[`stage_${this.params.stageId}_result_date`]) : this.sharedService.getFormattedDate(this.contestInfo.contestEndDate);
            const awardScheduleUrl = this.contestInfo.awardScheduleUrl;
            const senderName = this.contestInfo.senderName;

            this.contestInteractionService.sendWhatsappNotification(studentFullName, submissionNumber, submissionTitle, stageName, contestTitle, urlLink, selectionOption, selectionMenu, contestResultDate, awardScheduleUrl, senderName, contestId, stageId, phone, classroomId, institutionId, this.dialogData?.studentInfo?.docId, submId, isLastSubmission);
          };
        };
      };
      this.contestInteractionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
      this.uiService.alertMessage('Successful', 'Video saved successfully', 'success');
      this.storedFilePath = bucketPath;
      this.isAttemptedEvent.emit(true);
    } catch (error) {
      console.error(error);
    }
  }

  videoTypeAndSizeCheck(event) {
    const allowedExtensions = /(\.mp4|\.avi|\.mov|\.mkv|\.wmv|\.flv|\.webm|\.m4v)$/i;
    let isValid = false
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid file type', 'Only allowed .jpeg, .png, .jpg file types', 'warn')
      this.elementRef.nativeElement.value = "";
      this.filename = ''
      isValid = false
      this.loader = false
    }
    else if (event.size > 209715200) { // 200 * 1024 * 1024 = 209715200 bytes
      this.uiService.alertMessage('Invalid file type', 'Maximum file size should be 200MB', 'warn');
      this.elementRef.nativeElement.value = "";
      this.filename = '';
      isValid = false;
      this.loader = false;
    }
    else {
      isValid = true
    }
    return isValid
  }

  async getCurrentStudent() {
    const studentId = this.studentService.currentStudentId.value
    if (studentId) {
      this.studentId = studentId
      return
    }
    await (await this.userService.getCurrentStudentInfo()).pipe(take(1)).subscribe(res => {
      this.studentId = res.currentStudentInfo.studentId
    })
  }

  onClickUploadAlt() {
    let config = this.contestInteractionService.getConfigForIncompleteSubmissions(this.incompleteSubmissions)
    this.fuseConfirmationService.open()
  }
}
