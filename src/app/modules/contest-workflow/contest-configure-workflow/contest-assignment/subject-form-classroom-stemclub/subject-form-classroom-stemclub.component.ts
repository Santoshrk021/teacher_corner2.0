import { HttpClient } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { arrayUnion } from '@angular/fire/firestore';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { debounceTime, distinctUntilChanged, first, lastValueFrom, Observable } from 'rxjs';

@Component({
  selector: 'app-subject-form-classroom-stemclub',
  templateUrl: './subject-form-classroom-stemclub.component.html',
  styleUrls: ['./subject-form-classroom-stemclub.component.scss']
})
export class SubjectFormClassroomStemclubComponent implements OnInit {
  @Input() contentInfo: any;
  @Input() workflowId: string;

  assignmentFormGroup: FormGroup;
  private ipUrl = 'https://api.ipify.org?format=json';
  stringifyAnsOfDb: string;
  isSubmitBtnDisabled: boolean = true;
  params: any;
  incompleteSubmissions: any;
  isSubmitted: boolean;
  dependentDropdowns: Array<any> = [];

  constructor(
    private assignmentService: AssignmentsService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private httpClient: HttpClient,
    private configurationService: ConfigurationService,
    private uiService: UiService,
    private afAuth: AngularFireAuth,
    private teacherService: TeacherService,
    private workFlowCompletionService: WorkflowCompletionService,
    private deviceInfoService: DeviceInfoService,
  ) { }

  async ngOnInit(): Promise<void> {
    this.assignmentFormGroup = this.fb.group({
      instructions: [''],
      questions: this.fb.array([
      ]),
    });

    this.params = await lastValueFrom(this.route.queryParams.pipe(first()));

    await this.checkSubmissionData();

    this.questions.valueChanges.pipe(debounceTime(100), distinctUntilChanged()).subscribe(val => {
      this.stringifyAnsOfDb == this.getStringifiedAnswers(val) ? this.isSubmitBtnDisabled = true : this.isSubmitBtnDisabled = false;
    });
  }

  async checkSubmissionData() {
    /*
    // get teacher submissions
    const { contestId, stageId, submId } = this.params;
    const teacherSubmission = await lastValueFrom(this.assignmentService.getContestSubmissions(studentId, contestId));
    if (teacherSubmission.exists) {
      const isValid = [stageId, submId, this.contentInfo?.assignmentId].every(param => JSON.stringify(teacherSubmission.data()).includes(param));
      if (isValid) {
        const { questions } = teacherSubmission.get(`stageId-${stageId}.submId-${submId}.assignmentId-${this.contentInfo?.assignmentId}`)
        this.stringifyAnsOfDb = this.getStringifiedAnswers(questions);
        this.getFormDetails(questions);
      } else {
        this.stringifyAnsOfDb = `""`;
        this.getFormDetails();
      };
    } else {
      this.stringifyAnsOfDb = `""`;
      this.getFormDetails();
    };
    */
    this.stringifyAnsOfDb = `""`;
    this.getFormDetails();
  }

  async getFormDetails(questions?: Array<any>) {
    if (!!questions && questions.length) {
      await Promise.all(questions.map((question: any) => this.addQuestion(question)));
      this.stringifyAnsOfDb == this.getStringifiedAnswers(questions) ? this.isSubmitBtnDisabled = true : this.isSubmitBtnDisabled = false;
    }
    const formDetails = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(this.contentInfo?.assignmentId));
    this.assignmentFormGroup.patchValue({
      instructions: formDetails?.get('instructions'),
    });
    const questionsArr: Array<any> = formDetails?.get('questions');
    const processedQuestions = await this.processQuestions(questionsArr);
    processedQuestions.forEach((question: any) => this.addQuestion(question));
  }

  async processQuestions(questionsArray: Array<any>) {
    const questions = await Promise.all(questionsArray.map(async question => {
      const option = question.questionType === 'dropDownDynamic' && question?.dropDownOptionsDynamic?.split(',') || question.questionType === 'dropDownDependent' && question?.dropDownOptionsDependent?.split(',');
      const [collectionName, dropDownName, ...dependantValues] = option || [undefined, undefined, undefined];
      const docRef = collectionName ? await lastValueFrom(this.configurationService.getConfigurationDocumentOnce(collectionName)) : {};
      if (question.questionType === 'dropDownDynamic' && question?.hasOwnProperty('dropDownOptionsDynamic') && question?.dropDownOptionsDynamic.length) {
        question.dropDownOptionsDynamic = Object.values(docRef.get(dropDownName)).map((option: any) => option.display);
      };

      if (question.questionType === 'dropDownDependent' && question.hasOwnProperty('dropDownOptionsDependent') && question.dropDownOptionsDependent.length) {
        const dependentMap = docRef.get(dropDownName);

        const dropDownOptionsDependent = {};
        for (const parentkey in dependentMap) {
          for (const childKey in dependentMap[parentkey]) {
            if (dependantValues.includes(childKey)) {
              dropDownOptionsDependent[parentkey] = Object.keys(dependentMap[parentkey][childKey]);
            } else {
              if (typeof dependentMap[parentkey][childKey] === 'object') {
                for (const nestedChildKey in dependentMap[parentkey][childKey]) {
                  for (const nextNestedChildKey in dependentMap[parentkey][childKey][nestedChildKey]) {
                    if (dependantValues.includes(nextNestedChildKey)) {
                      dropDownOptionsDependent[nestedChildKey] = Object.keys(dependentMap[parentkey][childKey][nestedChildKey][nextNestedChildKey]);
                    }
                  };
                }
              }
            }
          }
        }
        question.dropDownOptionsDependent = dropDownOptionsDependent;
      };

      if (question.questionType === 'dropDown') {
        question.dropDownOptions = question.dropDownOptions.split(',')
      };

      return question;
    }));

    return questions;
  }

  async addQuestion(questionObject?: any) {
    const fieldsToCheck = ['prompt', 'questionType', 'questionNumber', 'question', 'isSubquestion', 'dropDownOptions', 'dropDownOptionsDynamic', 'dropDownOptionsDependent', 'fieldIcon'];
    const isValid = fieldsToCheck.every(field => questionObject.hasOwnProperty(field));
    if (!isValid) {
      throw new Error(`Fields missing in question : ${fieldsToCheck.filter(field => !questionObject.hasOwnProperty(field)).join(', ')}`);
    }

    const { prompt, questionType, questionNumber, question, isSubquestion, dropDownOptions, dropDownOptionsDynamic, dropDownOptionsDependent, fieldIcon } = questionObject;

    const questionGroup = this.fb.group({
      questionType: [questionType],
      questionNumber: [questionNumber],
      question: [question],
      prompt: [prompt?.length > 0 ? question : 'Enter the answer here'],
      isSubquestion: [isSubquestion],
      dropDownOptions: [dropDownOptions],
      dropDownOptionsDynamic: [dropDownOptionsDynamic],
      dropDownOptionsDependent: [dropDownOptionsDependent],
      fieldIcon: [fieldIcon],
      answer: [questionObject?.answer ?? '', Validators.required],
    });

    this.questions.push(questionGroup);
  }

  get questions() {
    return this.assignmentFormGroup?.get('questions') as FormArray;
  }

  onSelectDynamicDropDown(event: MatSelectChange, index: number) {
    this.dependentDropdowns[index + 1] = event.value;
  }

  onSelectDependentDropDown(event: MatSelectChange, index: number) {
    this.dependentDropdowns[index + 1] = event.value;
  }

  getStringifiedAnswers(arr: { [key: string]: any }[]): string {
    const concatenatedAnswers = arr
      .filter(obj => obj.hasOwnProperty('answer')) // Filter objects with "answer" key
      .map(obj => obj.answer)                      // Extract the "answer" values
      .join('');                                   // Concatenate all answers into a single string

    return JSON.stringify(concatenatedAnswers);    // Convert the single string to a JSON string
  }

  getIpAddress(): Observable<any> {
    return this.httpClient.get(this.ipUrl);
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

  catchRatingEvent(event: any, index: number) {
    (this.assignmentFormGroup?.get('questions') as FormArray).at(index).get('answer').patchValue(event);
  }

  async onSubmit() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.storeInTeacherSubCollection(position);
        },
        (error) => {
          if (error.code == 1) {
            this.uiService.alertMessage('Location Error', 'Please provide location access in order to finalise your submission', 'warn');
          }
        }
      );
    } else {
      const error = 'Geolocation is not supported by this browser.';
      console.log(error);
    }
  }

  async storeInTeacherSubCollection(position: any) {
    /*
    // from classroom stepper
    const apiKey = environment.gmapApiKey;
    const lat = position.coords.latitude;
    const long = position.coords.longitude;
    const endUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${apiKey}`;

    const addressRes: any = await lastValueFrom(this.httpClient.get(endUrl));
    const locationInfo = {
      geolocationPosition: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        timestamp: position.timestamp,
        accuracy: position.coords.accuracy,
      },
      formatted_address: addressRes.results[0].formatted_address
    };

    const queryParams = await lastValueFrom(this.route.queryParams.pipe(first()));
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const teacherId = user?.uid;
    const queryParamsUpdated = {
      ...queryParams,
      docId: teacherId
    };

    const finalObj = {
      ...this.assignmentFormGroup.value,
      displayName: this.contentInfo?.assignmentName,
      totalQuestions: this.questions?.length,
      id: this.formId,
    };

    const timeIpResponse = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    const [time, ip] = timeIpResponse ?
      await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first())) : [new Date(), ''];
    const deviceInfo = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    let obj: any;
    if (this.workflowId) {
      obj = {
        [`workflowId_${this.workflowId}`]: {
          [`assignmentId_${this.formId}`]: {
            locationInfo,
            lastAttemptTime: serverTimestamp(),
            userAgent: navigator.userAgent,
            clientIp: ip,
            ...finalObj
          }
        },
        teacherId,
        // versions: {
        //   [`workflowId_${this.workflowId}`]: {
        //     [`assignmentId_${this.formId}`]: {
        //       [`attempt${this.previousAttempts + 1}`]: {
        //         attemptNumber: this.previousAttempts + 1,
        //         lastAttemptTime: serverTimestamp(),
        //         userAgent: navigator.userAgent,
        //         clientIp: ip,
        //         ...finalObj
        //       }
        //     }
        //   }
        // },
        createdAt: serverTimestamp(),
        submissionMeta: arrayUnion(deviceInfo)
      };
    } else {
      obj = {
        [`programmeId_${this.params.programmeId}`]: {
          [`assignmentId_${this.formId}`]: {
            locationInfo,
            lastAttemptTime: serverTimestamp(),
            userAgent: navigator.userAgent,
            clientIp: ip,
            ...finalObj
          }
        },
        teacherId,
        // versions: {
        //   [`workflowId_${this.workflowId}`]: {
        //     [`assignmentId_${this.formId}`]: {
        //       [`attempt${this.previousAttempts + 1}`]: {
        //         attemptNumber: this.previousAttempts + 1,
        //         lastAttemptTime: serverTimestamp(),
        //         userAgent: navigator.userAgent,
        //         clientIp: ip,
        //         ...finalObj
        //       }
        //     }
        //   }
        // },
        createdAt: serverTimestamp(),
        submissionMeta: arrayUnion(deviceInfo)
      };
    };

    const updateSubmission = this.assignmentService.updateTeachersSubmission(obj, queryParamsUpdated);
    const teacher: any = (await lastValueFrom(this.teacherService.getTeacherByIdOnce(teacherId))).data();
    teacher.attemptedAssignments = arrayUnion(this.formId);
    const updateTeacher = this.teacherService.updateTeacher(teacher, teacherId);
    Promise.all([updateSubmission, updateTeacher]).then(async () => {
      this.assignmentService.existingAssignment = (await lastValueFrom(this.assignmentService.getTeachersResources({ teacherId, classroomId: queryParams.classroomId, programmeId: queryParams.programmeId }))).data();
      this.workFlowCompletionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
      this.uiService.alertMessage('Successful', 'Form Submitted Successfully', 'success');
    }).catch((error) => {
      this.uiService.alertMessage('Error', 'There Is An Error Submitting The Form', 'error');
      console.error(error);
    });
    */

    /*
    // from unlab
    // create and add form assignment to submission sub-document in teacher document
    if (this.isLastStep && this.incompleteSubmissions.length) {
      let config = this.contestInteractionService.getConfigForIncompleteSubmissions(this.incompleteSubmissions)
      this.fuseConfirmationService.open(config)
      return
    }

    const { classroomId, contestId, institutionId, stageId, studentId, submId } = this.params;
    const formData = this.assignmentFormGroup.value;

    // let [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()))
    // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() }
    const d = { clientIp: await this.getIpAddressCurrent(), submissionTime: Timestamp.now().toDate() }
    const { assignmentId } = this.contentInfo;
    let obj = {
      [`stageId-${stageId}`]: {
        [`submId-${submId}`]: {
          [`assignmentId-${assignmentId}`]: formData
        }
      },
      createdAt: serverTimestamp(),
      submissionMeta: arrayUnion(d)
    }


    this.assignmentService.updateInContestSubmission(obj, studentId, contestId).then(async () => {
      const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === stageId);
      const isAllStepsMandatory = currentStage.isAllStepsMandatory;
      if (this.isLastStep) {
        const phone = this.studentService.currentStudent.value.studentMeta.countryCode + this.studentService.currentStudent.value.studentMeta.phoneNumber;
        if (!phone || !phone.length) {
          console.error(`Whatsapp notification not sent as phone number is not available for student ${studentId}: `, phone);
        } else {
          const currentStage = this.contestInfo.stagesNames.find((stage: any) => stage.stageId === stageId);
          const submissionArray = currentStage.submissions;
          const isLastSubmission = submissionArray.length > 0 && submissionArray[submissionArray.length - 1].submissionId === submId;
          const studentFullName = this.studentService.currentStudent.value.studentMeta.firstName + ' ' + this.studentService.currentStudent.value.studentMeta.lastName;
          const submissionNumber = parseInt(currentStage.submissions.find((subm: any) => subm.submissionId === submId).displayName.split(' ')[1]);
          const submissionTitle = this.currentWorkflow.contestStepName;
          const stageName = currentStage.stageName;
          const contestTitle = this.contestInfo.contestTitle;
          const urlLink = this.contentInfo.urlLink;
          const selectionOption = currentStage.stageName;
          const selectionMenu = `${contestTitle} "Contests and Challenges"`;
          const contestResultDate = currentStage.hasOwnProperty(`stage_${stageId}_result_date`) ? this.sharedService.getFormattedDate(currentStage[`stage_${stageId}_result_date`]) : this.sharedService.getFormattedDate(this.contestInfo.contestEndDate);
          const awardScheduleUrl = this.contestInfo.awardScheduleUrl;
          const senderName = this.contestInfo.senderName;

          this.contestInteractionService.sendWhatsappNotification(studentFullName, submissionNumber, submissionTitle, stageName, contestTitle, urlLink, selectionOption, selectionMenu, contestResultDate, awardScheduleUrl, senderName, contestId, stageId, phone, classroomId, institutionId, studentId, submId, isLastSubmission);
        }
        this.contestInteractionService.unlockedSteps.next(this.currentWorkflow.sequenceNumber);
      };
      await this.contestInteractionService.setFlagInStudentDoc(this.params, studentId, assignmentId, this.isLastStep);
      this.uiService.alertMessage('Successful', 'form saved successfully', 'success');
    });
    this.isSubmitted = true;
    this.assignmentFormGroup.disable();
    this.studentService.submissionMeta.next(formData)
    */
  }

  requestLocationPermission(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Location access granted. Latitude:', position.coords.latitude, 'Longitude:', position.coords.longitude);
          // Handle the location data here
        },
        (error) => {
          console.error('Error requesting location permission:', error);
          // Handle the error or permission denial here
        }
      );
    } else {
      console.error('Geolocation is not supported by this browser.');
    }
  }

}
