import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Inject, Input, OnInit, Output, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { first, lastValueFrom, Observable, take } from 'rxjs';
import { serverTimestamp, Timestamp } from "firebase/firestore";
import { arrayUnion } from 'firebase/firestore';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { HttpClient } from '@angular/common/http';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ContestInteractionService } from 'app/modules/contest-interaction/contest-interaction.service';
import { ContestSubmissionsService } from 'app/core/dbOperations/contestSubmissions/contestSubmissions.service';
import { SharedService } from 'app/shared/shared.service';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
@Component({
    selector: 'app-obs-upload',
    templateUrl: './obs-upload.component.html',
    styleUrls: ['./obs-upload.component.scss'],

})
export class ObsUploadComponent implements OnInit {
    @Output() isAttemptedEvent: EventEmitter<any> = new EventEmitter();
    filename: any;
    @Input() assignmentData: any
    @Input() currentWorkflow: any
    @Input() workflowId: any
    @Input() asgnId: any
    @Input() selectedStageSubmInfo: any
    @Input() isOldcontest
    @Input() isLastStep
    @Input() rawWorkflowInfo
    @Input() contestInfo
    @Input() current
    @Input() total

    @ViewChild('elementRef', { static: false })
    elementRef: ElementRef;
    storageBucket = 'contest_submissions'
    loader = false
    bytesTransferred
    params: any;
    private ipUrl = 'https://api.ipify.org?format=json';
    storedFilePath: string = ''
    studentId: any;
    isFinalSubmission = false;
    isContainsLink = [];
    isDescription = ''
    isContestEnd: boolean = false;
    message: string;
    incompleteSubmissions: any[];
    inBetweenContest: boolean = false;
    isContestStarted: boolean = false;
    currentStage: any;

    constructor(
        private studentService: StudentsService,
        private afStore: AngularFireStorage,
        private assignmentsService: AssignmentsService,
        private uiService: UiService,
        private deviceInfoService: DeviceInfoService,
        private route: ActivatedRoute,
        private userService: UserService,
        private contestService: ContestService,
        protected http: HttpClient,
        private cdRef: ChangeDetectorRef,
        private contestInteractionService: ContestInteractionService,
        private fuseConfirmationService: FuseConfirmationService,
        private contestSubmissionsService: ContestSubmissionsService,
        private sharedService: SharedService,
        @Inject(MAT_DIALOG_DATA) private dialogData: any,
    ) { }

    async ngOnInit(): Promise<void> {
        this.route.queryParamMap.subscribe((res: any) => {
            this.params = res.params;
            this.setMessage()
        })
        await this.getCurrentStudent();

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
        return new Promise((resolve, reject) => {
            this.getIpAddress().subscribe(
                data => {
                    //ip=data.ip
                    resolve(data.ip)
                },
                error => {
                    resolve('null')
                    // console.error('Error getting IP address:', error);
                }
            );
        })
    }

    ngAfterViewInit(): void {
        this.isContainsLink = [];
        this.checkResourcePath()
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

        this.studentService.currentStudent.subscribe(studentInfo => {
            if (studentInfo?.stage1_extension) {
                this.isContestEnd = false
                this.isFinalSubmission = studentInfo?.contestSubmissions?.[`contestId_${this.params.contestId}`]?.[`stageId_${this.params.stageId}`]?.[`submId_${this.params.submId}`]?.isSubmitted
                    === true ? true : false;
            }
        })
        this.isContainsLink = ((this.assignmentData?.instructions)?.match(/\bhttps?:\/\/\S+/gi)) || [];
        this.isDescription = (this.assignmentData?.instructions).replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
        this.cdRef.detectChanges();
    }

    async upload(event) {
        this.loader = true
        this.filename = event.target.files[0].name
        const isValid = this.pdfTypeAndSizeCheck(event.target.files[0])
        if (isValid) {
            const bucketPath = `${this.storageBucket}/${this.params.contestId}/${this.params.stageId}/${this.dialogData?.queryParams?.submId}/${this.dialogData?.studentInfo?.docId}-${this.params.contestId}/${this.asgnId}_${this.assignmentData.submissionId}.` + this.filename.split('.').slice(-1).pop()
            const ref = this.afStore.ref(bucketPath);
            //putting the file into storage with custom metadata
            const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();
            await lastValueFrom(task).then(uploadedSnapshot => {
                this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100
                if (uploadedSnapshot.state === "success") {
                    this.uiService.alertMessage('successful', 'The pdf files is uploaded successfully', 'success')
                    this.loader = false
                }
            })
            this.assignmentObj(bucketPath)
        }
    }

    pdfTypeAndSizeCheck(event) {
        const allowedExtensions = /(\.pdf)$/i;
        let isValid = false
        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage('Invalid file type', 'Only allowed .pdf file type', 'warn')
            this.elementRef.nativeElement.value = "";
            this.filename = ''
            isValid = false
        }
        else if (event.size > 3145728) {
            this.uiService.alertMessage('Invalid file type', 'maximum image size should be 3mb', 'warn')
            this.elementRef.nativeElement.value = "";
            this.filename = ''
            isValid = false
        }
        else {
            isValid = true
        }
        return isValid
    }

    async assignmentObj(bucketPath) {
        //let [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()))
        // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() }
        const d = { clientIp: await this.getIpAddressCurrent(), submissionTime: Timestamp.now().toDate() }
        let obj = {
            [`stageId-${this.params.stageId}`]: {
                [`submId-${this.params.submId}`]: { [`assignmentId-${this.asgnId}`]: { [this.assignmentData.submissionId]: { submissionPath: bucketPath, type: this.assignmentData.uploadFileType } } }
            },
            createdAt: serverTimestamp(),
            submissionMeta: arrayUnion(d)
        }

        try {
            await this.contestSubmissionsService.updateInContestSubmission(obj, this.dialogData?.studentInfo?.docId, this.params.contestId);
            const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
            const isAllStepsMandatory = currentStage.isAllStepsMandatory;
            await this.contestInteractionService.setFlagInStudentDoc(this.params, this.dialogData?.studentInfo?.docId, this.asgnId, this.isLastStep);
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
            this.contestInteractionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
            this.uiService.alertMessage('Successful', 'Innovation observation sheet saved successfully', 'success');
            this.storedFilePath = bucketPath;
            this.isAttemptedEvent.emit(true);
        } catch (error) {
            console.error(error);
        }
    }

    checkResourcePath() {
        const submissionMeta = this.studentService.contestSubmissionMeta.value
        const resourceData = submissionMeta?.[`assignmentId-${this.asgnId}`]?.[this.assignmentData?.submissionId] || ''
        this.storedFilePath = resourceData?.submissionPath || '';
        this.storedFilePath.length ? this.currentWorkflow.isAttempted = true : this.currentWorkflow.isAttempted = false;
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

    setMessage() {
        this.message = this.selectedStageSubmInfo?.stageNumber == 1 ? 'Submissions to Stage 1 of the award have ended' : 'Submissions to Stage 2 of the award have ended'
    }

    onClickUploadAlt() {
        let config = this.contestInteractionService.getConfigForIncompleteSubmissions(this.incompleteSubmissions)
        this.fuseConfirmationService.open()
    }
}
