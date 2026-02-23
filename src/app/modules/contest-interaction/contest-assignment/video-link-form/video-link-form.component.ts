import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
import { arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import getVideoId from 'get-video-id';
import { map, take, Observable, lastValueFrom } from 'rxjs';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MatDialog } from '@angular/material/dialog';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { SharedService } from 'app/shared/shared.service';
import { ContestSubmissionsService } from 'app/core/dbOperations/contestSubmissions/contestSubmissions.service';
import { ContestInteractionService } from '../../contest-interaction.service';
@Component({
    selector: 'app-video-link-form',
    templateUrl: './video-link-form.component.html',
    styleUrls: ['./video-link-form.component.scss']
})
export class VideoLinkFormComponent implements OnInit, AfterViewInit {
    @Input() contentInfo
    @Input() currentWorkflow: any
    @Input() rawWorkflowInfo
    @Input() isLastStep
    @Input() contestInfo

    assignmentsSubmStatus = [];
    private ipUrl = 'https://api.ipify.org?format=json';
    videoForm: FormGroup;
    valid = false
    studentId: any;
    params: any;
    isFinalSubmission = false;
    isContestEnd: boolean = false;
    message: string;
    incompleteSubmissions: any;
    inBetweenContest: boolean = false;
    isContestStarted: boolean = false;
    currentStage: any;

    constructor(
        private fb: FormBuilder,
        protected http: HttpClient,
        private uiService: UiService,
        private userService: UserService,
        private studentService: StudentsService,
        private route: ActivatedRoute,
        public dialog: MatDialog,
        private contestWorkflowService: ContestWorkflowService,
        private fuseConfirmationService: FuseConfirmationService,
        private contestService: ContestService,
        private cdref: ChangeDetectorRef,
        private sharedService: SharedService,
        private contestSubmissionsService: ContestSubmissionsService,
        private contestInteractionService: ContestInteractionService
    ) {

    }

    getIpAddress(): Observable<any> {
        return this.http.get(this.ipUrl);
    }

    ngOnInit(): void {
        this.videoForm = this.fb.group({
            innovationVideoLink: ['', Validators.required],
        })
        this.route.queryParamMap.subscribe((res: any) => {
            this.params = res.params;
        })
        this.getCurrentStudent();

        const inBetweenContest = this.contestService.isInBetweenContest();
        if (inBetweenContest) {
            this.inBetweenContest = true

        }

        if (!this.inBetweenContest) {
            this.videoForm.get('innovationVideoLink')?.disable();
        } else {
            this.videoForm.get('innovationVideoLink')?.enable();
        }

        const isContestStarted = this.contestService.isContestStart();
        if (isContestStarted) {
            this.isContestStarted = true;
        }
    }

    getStudentMetaData() {
        // this.assignmentsService.getContestSubmGet(thfis.selectedStageSubmInfo.submissionId).then((d)=>{
        //     return d
        // })
    }

    async ngAfterViewInit() {
        const { studentId, stageId, submId, contestId } = this.params;
        const contestSubmission = await lastValueFrom(this.contestSubmissionsService.getContestSubmissions(studentId, contestId));
        const submissionMeta = contestSubmission.get(`stageId-${stageId}.submId-${submId}`)

        const asgnmntId = this.contentInfo?.assignmentId
        const videoLink = !this.studentService?.contestSubmissionMeta?.value ? submissionMeta?.[`assignmentId-${asgnmntId}`] : this.studentService?.contestSubmissionMeta?.value?.[`assignmentId-${asgnmntId}`] || '';

        this.videoForm.patchValue({
            innovationVideoLink: videoLink?.innovationVideoLink != undefined ? videoLink?.innovationVideoLink : ''
        })

        if (!!videoLink?.innovationVideoLink) {
            this.currentWorkflow.isAttempted = true;
            this.videoForm.get('innovationVideoLink').disable();
        } else {
            this.currentWorkflow.isAttempted = false;
        }

        this.studentService.currentStudent.subscribe(studentInfo => {
            const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
            this.currentStage = currentStage;
            const isAllStepsMandatory = currentStage.isAllStepsMandatory;
            if (this.isLastStep && isAllStepsMandatory) {
                this.contestInteractionService.incompleteSubmissions(studentInfo.docId, this.rawWorkflowInfo, this.currentWorkflow, this.params).subscribe(res => {
                    this.incompleteSubmissions = res
                })
            }
            this.isFinalSubmission = studentInfo?.contestSubmissions?.[`contestId_${this.params.contestId}`]?.[`stageId_${this.params.stageId}`]?.[`submId_${this.params.submId}`]?.isSubmitted && this.currentWorkflow.isAttempted
                === true ? true : false;
        })

        const isContestEnd = this.contestService.isContestEnd()
        if (isContestEnd) {
            this.isContestEnd = true
            this.isFinalSubmission = true
        }
        if (this.isFinalSubmission) {
            this, this.videoForm.disable();
        }

        this.getAsmtSubmStatus(this.contestWorkflowService.contestSteps.value)
        this.studentService.currentStudent.subscribe(studentInfo => {
            if (studentInfo?.stage1_extension) {
                this.isContestEnd = false
                this.isFinalSubmission = studentInfo?.contestSubmissions?.[`contestId_${this.params.contestId}`]?.[`stageId_${this.params.stageId}`]?.[`submId_${this.params.submId}`]?.isSubmitted
                    === true ? true : false;
            }
        })
        this.cdref.detectChanges();
    }

    youtubeInputChange() {
        const obj = getVideoId(this.videoForm.controls['innovationVideoLink'].value)
        if (obj.service == 'youtube') {
            this.getYoutubeVideoData(obj.id).subscribe(res => {
                const duration = this.youtubeFormatToSec(res.items[0].contentDetails.duration);
                const privacyStatus = res.items[0].status.privacyStatus;
                if (privacyStatus == 'public') {
                    if (duration <= 250) { // 4min 10sec buffer
                        this.valid = true
                    }
                    else {
                        this.valid = true
                    }
                }
            })
        }
        else {
            this.uiService.alertMessage('Error', "Please enter a valid YouTube link", 'warn')

            this.videoForm.patchValue({
                innovationVideoLink: ''
            })
        }
    }

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

    getYoutubeVideoData(id) {
        return this.http
            .get<any>('https://www.googleapis.com/youtube/v3/videos?id=' + id + '&key=AIzaSyA-1K4xDv1Lpf_Lmh7rgbefqT-QkNpsovE&part=contentDetails,status')
            .pipe(
                map((res: any) => {
                    return res;
                })
            );
    }

    youtubeFormatToSec(time) {
        var a = time.match(/\d+H|\d+M|\d+S/g),
            result = 0;
        var d = { H: 3600, M: 60, S: 1 },
            num,
            type;
        for (var i = 0; i < a.length; i++) {
            num = a[i].slice(0, a[i].length - 1);
            type = a[i].slice(a[i].length - 1, a[i].length);
            result += parseInt(num) * d[type];
        }
        return result;
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

    async onSave(form) {
        // let [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()))
        // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() }

        if (this.isLastStep && this.incompleteSubmissions.length) {
            let config = this.contestInteractionService.getConfigForIncompleteSubmissions(this.incompleteSubmissions)
            this.fuseConfirmationService.open()
            return
        }
        const d = { clientIp: await this.getIpAddressCurrent(), submissionTime: Timestamp.now().toDate() }
        const { assignmentId } = this.contentInfo;
        let obj = {
            [`stageId-${this.params.stageId}`]: {
                [`submId-${this.params.submId}`]: {
                    [`assignmentId-${assignmentId}`]: form.value
                }
            },
            createdAt: serverTimestamp(),
            submissionMeta: arrayUnion(d)
        }
        this.contestSubmissionsService.updateInContestSubmission(obj, this.studentId, this.params.contestId).then(async () => {
            const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
            const isAllStepsMandatory = currentStage.isAllStepsMandatory;
            await this.contestInteractionService.setFlagInStudentDoc(this.params, this.studentId, assignmentId, this.isLastStep);
            if (this.isLastStep) {
                const phone = this.studentService.currentStudent.value.studentMeta.countryCode + this.studentService.currentStudent.value.studentMeta.phoneNumber;
                if (!phone || !phone.length) {
                    console.error(`Whatsapp notification not sent as phone number is not available for student ${this.studentId}: `, phone);
                } else {
                    const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
                    const submissionArray = currentStage.submissions;
                    const isLastSubmission = submissionArray.length > 0 && submissionArray[submissionArray.length - 1].submissionId === this.params.submId;

                    const { classroomId, contestId, institutionId, stageId, studentId, submId } = this.params;
                    const studentFullName = this.studentService.currentStudent.value.studentMeta.firstName + ' ' + this.studentService.currentStudent.value.studentMeta.lastName;
                    const submissionNumber = parseInt(currentStage.submissions.find((subm: any) => subm.submissionId === this.params.submId).displayName.split(" ")[1]);
                    const submissionTitle = this.currentWorkflow.contestStepName;
                    const stageName = currentStage.stageName;
                    const contestTitle = this.contestInfo.contestTitle;
                    const urlLink = this.contestInfo.urlLink;
                    const selectionOption = currentStage.stageName;
                    const selectionMenu = `${contestTitle} "Contests and Challenges"`;
                    const contestResultDate = currentStage.hasOwnProperty(`stage_${this.params.stageId}_result_date`) ? this.sharedService.getFormattedDate(currentStage[`stage_${this.params.stageId}_result_date`]) : this.sharedService.getFormattedDate(this.contestInfo.contestEndDate);
                    const awardScheduleUrl = this.contestInfo.awardScheduleUrl;
                    const senderName = this.contestInfo.senderName;

                    this.contestInteractionService.sendWhatsappNotification(studentFullName, submissionNumber, submissionTitle, stageName, contestTitle, urlLink, selectionOption, selectionMenu, contestResultDate, awardScheduleUrl, senderName, contestId, stageId, phone, classroomId, institutionId, studentId, submId, isLastSubmission);
                };
            };
            this.contestInteractionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
            this.uiService.alertMessage('Successful', 'Innovation video link saved successfully', 'success');
        })
        this.currentWorkflow.isAttempted = true;
        this.videoForm.get('innovationVideoLink').disable();
    }

    // async forStage2() {
    //     const stageSubmissionObj = {
    //         contestSubmissions: {
    //             [`contestId_${this.params.contestId}`]: {
    //                 [`stageId_${this.params.stageId}`]: {
    //                     [`submId_${this.params.submId}`]: {
    //                         isSubmitted: true,
    //                         submittedAt: serverTimestamp()
    //                     }
    //                 }
    //             }
    //         }
    //     };
    //     // const stageSubmissionObj = {
    //     //     contestSubmissions: {
    //     //         [`contestId_${this.params.contestId}`]: {
    //     //             [`stageId_${this.params.stageId}`]: {
    //     //                 [`submId_${this.params.submId}`]: {
    //     //                     isSubmitted: true,
    //     //                     submittedAt: serverTimestamp()
    //     //                 }
    //     //             }
    //     //         }
    //     //     }
    //     // };
    //     await this.studentService.updateStudent(stageSubmissionObj, this.studentId).catch(err => console.error(err))
    //     const doc: any = await this.studentService.getStudentInfo(this.studentId)
    //     this.studentService.currentStudent.next(doc)
    //     const name = doc.studentMeta.firstName + ' ' + doc.studentMeta.lastName
    //     // const submissionName = this.selectedStageSubmInfo.submissionNumber == 0 ? "first" : "second";
    //     // const submissionTitle = this.studentService?.contestSubmissionMeta?.value?.['assignmentId-Innovation_form_id']?.['title'];
    //     const submissionTitle = this.studentService?.contestSubmissionMeta?.value['assignmentId-innovation_form_id']?.title
    //     await this.waNotification(doc.studentMeta.countryCode, doc.studentMeta.phoneNumber, name, submissionName, submissionTitle)
    // }

    // async waNotification(countryCode: string, phoneNumber: string, name: string, submName: string, submTitle: string) {
    //     const phone = countryCode + phoneNumber;
    //     const templateName = environment.whatsAppTemplates.ramanStage2SubmissionAcknowledgement.templateName;
    //     const headerImage = environment.whatsAppTemplates.ramanStage2SubmissionAcknowledgement.headerImage;
    //     const mediaType = "image";
    //     const params = [
    //         name,
    //         submName,
    //         submTitle,
    //         'Stage 2',
    //         'Raman Award 2024',
    //         'Raman Award 2024',
    //         '10th December, 2024',
    //     ];
    //     const urlRoute = undefined;
    //     this.sharedService.sendWhatsAppNotification(phone, templateName, params, mediaType, headerImage, urlRoute);
    // }

    getAsmtSubmStatus(workflowSteps) {
        this.assignmentsSubmStatus = []
        workflowSteps.contestSteps.forEach(wfs => {
            wfs.contents.forEach(assignment => {
                if (assignment.contentType == "ASSIGNMENT" && assignment?.assignmentId) {
                    let checkSubmittedAssignmentId = this.studentService?.contestSubmissionMeta?.value?.[`assignmentId-${assignment?.assignmentId}`] || '';
                    let assignmentDetails = {
                        contestStepName: wfs.contestStepName,
                        assignmentType: assignment.assignmentType,
                        assignmentName: assignment.assignmentName,
                        assignmentId: assignment.assignmentId,
                        contentName: assignment.contentName,
                        submittedAssignmentUrl: checkSubmittedAssignmentId,
                        isSubmitted: checkSubmittedAssignmentId != '' ? true : false
                    }
                    this.assignmentsSubmStatus.push(assignmentDetails)
                }
            })
        });
    }

}
