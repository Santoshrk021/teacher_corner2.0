import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { ContestSubmissionsService } from 'app/core/dbOperations/contestSubmissions/contestSubmissions.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { arrayUnion, serverTimestamp, Timestamp } from 'firebase/firestore';
import { lastValueFrom, Observable, take } from 'rxjs';
import { ContestInteractionService } from '../../contest-interaction.service';
import { SharedService } from 'app/shared/shared.service';

@Component({
    selector: 'app-subject-form-general',
    templateUrl: './subject-form-general.component.html',
    styleUrls: ['./subject-form-general.component.scss']
})
export class SubjectFormGeneralComponents implements OnInit, AfterViewInit {
    @Input() contentInfo;
    @Input() workflowId;
    @Input() selectedStageSubmInfo;
    @Input() isOldcontest
    @Input() isLastStep
    @Input() currentWorkflow: any
    @Input() rawWorkflowInfo
    @Input() contestInfo

    allRYSICategories: any = {};
    selectedSubjectArr = [];
    selectedLangArr = [];
    infoForm: FormGroup;
    studentId: any;
    private ipUrl = 'https://api.ipify.org?format=json';
    params: any;
    isSubmitted: boolean = false;
    isFinalSubmission = false;
    toltipMessage = ''
    isContestEnd: boolean = false;
    message: string;
    incompleteSubmissions: any[];
    tooltipMessage = '';
    isContestStarted: boolean = false;
    inBetweenContest: boolean = false;
    currentStage: any;

    constructor(
        private configurationService: ConfigurationService,
        private fb: FormBuilder,
        private userService: UserService,
        private studentService: StudentsService,
        private route: ActivatedRoute,
        private deviceInfoService: DeviceInfoService,
        private assignmentsService: AssignmentsService,
        private uiService: UiService,
        private contestService: ContestService,
        protected http: HttpClient,
        private contestSubmissionsService: ContestSubmissionsService,
        private fuseConfirmationService: FuseConfirmationService,
        private contestInteractionService: ContestInteractionService,
        private sharedService: SharedService,
    ) { }

    ngOnInit(): void {
        //     const asgnmntId = this.contentInfo.assignmentId;
        this.infoForm = this.fb.group({
            subject: ['', Validators.required],
            category: [{ value: '', disabled: true }, Validators.required],
            topic: [{ value: '', disabled: true }, Validators.required],
            title: ['', Validators.required],
            description: ['', Validators.required],
            materialUsed: ['', Validators.required],
            additionalLanguage: ['', Validators.required],
            selectedCategoryArr: [''],
            selectedTopicArr: [''],
        })

        this.route.queryParamMap.subscribe((res: any) => {
            this.params = res.params;
        })

        //     this.configurationService.getRYSICategories().subscribe(categories => {
        //         this.allRYSICategories = categories;
        //         this.selectedLangArr = categories.Languages
        //         const formData = this.studentService.contestSubmissionMeta?.value?.[`assignmentId-${asgnmntId}`] || ''
        //         if (formData) {
        //             this.infoForm.get('category').enable();
        //             this.infoForm.get('topic').enable();
        //             this.patchingFormValue(formData, categories)
        //             this.studentService.currentStudent.subscribe(studentInfo => {
        //                 if (this.isLastStep) {
        //                     this.contestInteractionService.incompleteSubmissions(studentInfo.docId, this.rawWorkflowInfo, this.currentWorkflow, this.params).subscribe(res => {
        //                         this.incompleteSubmissions = res
        //                     })
        //                 }
        //                 this.isFinalSubmission = studentInfo?.contestSubmissions?.[`contestId_${this.params.contestId}`]?.[`stageId_${this.params.stageId}`]?.[`submId_${this.params.submId}`]?.isSubmitted
        //                     === true ? true : false;
        //             })
        //             const isContestEnd = this.contestService.isContestEnd()
        //             if (isContestEnd) {
        //                 this.isContestEnd = true
        //                 this.isFinalSubmission = true
        //             }
        //             if (this.isFinalSubmission) {
        //                 this.infoForm.disable()
        //             }
        //         }
        //     })
        //     this.route.queryParamMap.subscribe((res: any) => {
        //         this.params = res.params;
        //         this.setMessage()

        //     })
        //     if (this.isOldcontest) {
        //         this.isContestEnd = true
        //     }
        //     else {
        //         this.isContestEnd = false
        //     }
        //    // this.isContestEnd = this.isOldcontest;
        //     this.getCurrentStudent()

        const isContestEnd = this.contestService.isContestEnd();
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

        if (!this.inBetweenContest) {
            this.infoForm.disable();
        } else {
            this.infoForm.enable();
        }

        // if (this.isContestEnd) {
        //     this.tooltipMessage =  `The Stage ${this.currentStage?.submissions?.[0]?.displayName || ''} of the ${this.contestInfo?.contestTitle || ''} ended on the ${this.currentStage?.endDate?.seconds * 1000 }`
        // } else if (this.isContestStarted) {
        //     this.tooltipMessage = `The Stage ${this.currentStage?.submissions?.[0]?.displayName || ''} of the ${this.contestInfo?.contestTitle || ''} starts on the  ${this.currentStage?.startDate?.seconds * 1000 }`;
        // }




    }

    ngAfterViewInit(): void {
        const asgnmntId = this.contentInfo.assignmentId;

        this.configurationService.getRYSICategories().subscribe(async categories => {
            this.allRYSICategories = categories;
            this.selectedLangArr = categories.Languages

            const { studentId, contestId, stageId, submId } = this.params;
            const contestSubmission = await lastValueFrom(this.contestSubmissionsService.getContestSubmissions(studentId, contestId));
            const submissionMeta = contestSubmission.get(`stageId-${stageId}.submId-${submId}.assignmentId-${asgnmntId}`) || '';

            const formData = !this.studentService.contestSubmissionMeta?.value ? submissionMeta : this.studentService.contestSubmissionMeta?.value?.[`assignmentId-${asgnmntId}`];

            if (formData) {
                this.infoForm.get('category').enable();
                this.infoForm.get('topic').enable();
                this.patchingFormValue(formData, categories);
                this.isSubmitted = true;
                this.infoForm.disable();
            }
        })

        this.studentService.currentStudent.subscribe(studentInfo => {
            const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
            this.currentStage = currentStage;
            if (this.isContestEnd) {
                const endDate = this.currentStage?.endDate?.seconds
                    ? new Date(this.currentStage.endDate.seconds * 1000).toLocaleDateString('en-GB')
                    : 'an unknown date';

                this.tooltipMessage = `The Stage ${this.currentStage?.submissions?.[0]?.displayName || ''} of the ${this.contestInfo?.contestTitle || ''} ended on the date of ${endDate}`;
            } else if (this.isContestStarted) {
                const startDate = this.currentStage?.startDate?.seconds
                    ? new Date(this.currentStage.startDate.seconds * 1000).toLocaleDateString('en-GB')
                    : 'an unknown date';

                this.tooltipMessage = `The Stage ${this.currentStage?.submissions?.[0]?.displayName || ''} of the ${this.contestInfo?.contestTitle || ''} starts on the date of ${startDate}`;
            }


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

        if (this.isFinalSubmission) {
            this.infoForm.disable()
        }

        if (this.isOldcontest) {
            this.isContestEnd = true
        }
        else {
            this.isContestEnd = false
        }
        // this.isContestEnd = this.isOldcontest;
        this.getCurrentStudent()
    }

    getIpAddress(): Observable<any> {
        return this.http.get(this.ipUrl);
    }

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

    subjectChange(selectedName) {
        this.infoForm.patchValue({
            selectedCategoryArr: Object.keys(this.allRYSICategories[selectedName])
        })
        this.infoForm.get('category').enable()
    }

    categoryChange(selectedName) {
        const subject = this.infoForm.get('subject').value

        this.infoForm.patchValue({
            selectedTopicArr: Object.keys(this.allRYSICategories[subject][selectedName])
        })
        this.infoForm.get('topic').enable()
    }

    patchingFormValue(value, categories) {
        const selectedCategoryArr = Object.keys(categories[value.subject])
        const selectedTopicArr = Object.keys(categories[value.subject][value.category])
        this.infoForm.patchValue({
            subject: value.subject,
            category: value.category,
            topic: value.topic,
            title: value.title,
            description: value.description,
            materialUsed: value.materialUsed,
            additionalLanguage: value.additionalLanguage,
            selectedCategoryArr: selectedCategoryArr,
            selectedTopicArr: selectedTopicArr
        })
    }

    topicChange(selectedName) {
    }

    languageChange(selectedLang) {
    }

    getObjectArrWithKey(key) {
    }

    async onSubmit(form) {
        if (this.isLastStep && this.incompleteSubmissions.length) {
            let config = this.contestInteractionService.getConfigForIncompleteSubmissions(this.incompleteSubmissions)
            this.fuseConfirmationService.open()
            return
        }
        const formData = {
            subject: form?.value?.subject || '',
            category: form?.value?.category || '',
            topic: form?.value?.topic || '',
            title: form?.value?.title || '',
            description: form?.value?.description || '',
            materialUsed: form?.value?.materialUsed || '',
            additionalLanguage: form?.value?.additionalLanguage || '',
        }
        // let [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()))
        // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() }
        const d = { clientIp: await this.getIpAddressCurrent(), submissionTime: Timestamp.now().toDate() }
        const { assignmentId } = this.contentInfo;
        let obj = {
            [`stageId-${this.params.stageId}`]: {
                [`submId-${this.params.submId}`]: {
                    [`assignmentId-${assignmentId}`]: formData
                }
            },
            createdAt: serverTimestamp(),
            submissionMeta: arrayUnion(d)
        }

        this.assignmentsService.updateInContestSubmission(obj, this.studentId, this.params.contestId).then(async () => {
            const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === this.params.stageId);
            const isAllStepsMandatory = currentStage.isAllStepsMandatory;
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
                    const submissionNumber = parseInt(currentStage.submissions.find((subm: any) => subm.submissionId === this.params.submId).displayName.split(' ')[1]);
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
                }
                this.contestInteractionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
            };
            await this.contestInteractionService.setFlagInStudentDoc(this.params, this.studentId, assignmentId, this.isLastStep);
            this.uiService.alertMessage('Successful', 'Innovation form saved successfully', 'success');
        });
        this.isSubmitted = true;
        this.infoForm.disable();
        this.studentService.submissionMeta.next(formData)
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

}
