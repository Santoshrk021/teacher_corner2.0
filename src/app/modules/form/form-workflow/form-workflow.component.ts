import { HttpClient } from '@angular/common/http';
import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { arrayUnion, serverTimestamp } from '@angular/fire/firestore';
import { FormArray, FormBuilder, FormGroup } from '@angular/forms';
import { MatSelectChange } from '@angular/material/select';
import { ActivatedRoute } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { WorkflowCompletionService } from 'app/core/dbOperations/workflowCompletion/workflow-completion.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { first, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-form-workflow',
  templateUrl: './form-workflow.component.html',
  styleUrls: ['./form-workflow.component.scss']
})
export class FormWorkflowComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() formId: string;
  @Input() contentInfo: any;
  @Input() workflowId: string;
  @Input() currentWorkflow;
  @Input() assignmentIdwithtabchange: string;
  @Input() currentData: any;
  @Input() currentStep: any;
  studentAnsweredData: any;
  assignmentFormGroup: FormGroup;
  // studentStats: Array<string> = [
  dropDownOptions: Array<string> = [
    // '25%',
    // '50%',
    // '75%',
    // '100%'
  ];
  params: any;
  dependentDropdowns: Array<any> = [];

  constructor(
    private assignmentService: AssignmentsService,
    private fb: FormBuilder,
    private deviceInfoService: DeviceInfoService,
    private afAuth: AngularFireAuth,
    private route: ActivatedRoute,
    private teacherService: TeacherService,
    private uiService: UiService,
    private httpClient: HttpClient,
    private workFlowCompletionService: WorkflowCompletionService,
    private userService: UserService,
    private configurationService: ConfigurationService,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.assignmentIdwithtabchange) {
      this.studentAnsweredData = this.currentData?.[this.assignmentIdwithtabchange] ? this.currentData?.[this.assignmentIdwithtabchange] : '';
      if (!changes.currentStep) {
        if (this.assignmentFormGroup) {
          this.assignmentFormGroup.reset();
          this.reloadComponent();
        }
      }
    }
  }

  async ngAfterViewInit(): Promise<void> {
    this.params = await lastValueFrom(this.route.queryParams.pipe(first()));
    const teacherId = await this.userService.getUid();
    this.assignmentService.getTeachersResources({ docId: teacherId, classroomId: this.params.classroomId, programmeId: this.params.programmeId }).subscribe((res) => {
      const teacherSubmission = res.data();
      if (res.data()) {
        if (this.workflowId) {
          if (teacherSubmission[`workflowId_${this.workflowId}`]) {
            if (teacherSubmission[`workflowId_${this.workflowId}`][`assignmentId_${this.formId}`]) {
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
              const questions = teacherSubmission[`workflowId_${this.workflowId}`][`assignmentId_${this.formId}`].questions;
              this.getFormDetails(questions);
            }
            else {
              this.getFormDetails();
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
            }
          }
          else {
            this.getFormDetails();
            this.assignmentFormGroup = this.fb.group({
              instructions: [''],
              questions: this.fb.array([]),
            });
          }
        }
        else {
          if (teacherSubmission[`programmeId_${this.params.programmeId}`]) {
            if (teacherSubmission[`programmeId_${this.params.programmeId}`][`assignmentId_${this.formId}`]) {
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
              const questions = teacherSubmission[`programmeId_${this.params.programmeId}`][`assignmentId_${this.formId}`].questions;
              this.getFormDetails(questions);
            }
            else {
              this.getFormDetails();
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
            }
          }
        }
      }
      else {
        this.getFormDetails();
        this.assignmentFormGroup = this.fb.group({
          instructions: [''],
          questions: this.fb.array([]),
        });
      }
    });
  }

  patchformGroupwithStudentData(qustionsgrp) {
    if (this.studentAnsweredData && this.studentAnsweredData?.questions) {
      const questionanswerd = this.studentAnsweredData?.questions?.find(question => question.questionNumber == qustionsgrp.value.questionNumber);
      qustionsgrp.patchValue({ answer: questionanswerd?.answer });
    }
    return qustionsgrp;
  }

  async ngOnInit(): Promise<void> {
    this.requestLocationPermission();
  }

  async getFormDetails(questionsData?) {
    const formDetails = await lastValueFrom(this.assignmentService.getAssignmentByIdOnce(this.formId));
    this.assignmentFormGroup.patchValue({
      instructions: formDetails.get('instructions'),
    });
    const questions = questionsData ? questionsData : formDetails.get('questions');
    // const processedQuestions = await this.processQuestions(questions);
    // processedQuestions.forEach((question: any) => this.addQuestion(question));
    questions.forEach(question => this.addQuestion(question));
  }

  async processQuestions(questionsArray: Array<any>) {
    // for dynmic dropdowns
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

  addQuestion(question?: any) {
    const dropDownOptions = question?.['questionType'] === 'dropDown' ? question.dropDownOptions.split(',') : [];
    const prompt = question?.['prompt']?.length > 0 ? question?.['prompt'] : ['Enter the answer here'];

    let questionGroup = this.fb.group({
      questionType: question?.['questionType'],
      questionNumber: question?.['questionNumber'],
      question: question?.['question'],
      prompt: [prompt],
      fieldIcon: question?.['fieldIcon'],
      isSubquestion: question?.['isSubquestion'],
      dropDownOptions: [dropDownOptions],
      answer: [{ value: question?.['answer'] ? question?.['answer'] : '', disabled: this.questions.length > 0 }]
    });
    questionGroup = this.patchformGroupwithStudentData(questionGroup);

    this.questions.push(questionGroup);

    if (this.questions.length > 1) {
      const prevQuestionIndex = this.questions.length - 2;
      const prevAnswerControl = this.questions.at(prevQuestionIndex).get('answer');
      prevAnswerControl.valueChanges.subscribe((value) => {
        if (value || this.questions.at(prevQuestionIndex).get('questionType').value === 'none') {
          questionGroup.get('answer').enable();
        } else {
          questionGroup.get('answer').disable();
        }
      });
    }
  }

  get questions() {
    return this.assignmentFormGroup.get('questions') as FormArray;
  }

  catchRatingEvent(event: any, index: number) {
    (this.assignmentFormGroup.get('questions') as FormArray).at(index).patchValue({ answer: event });
  }

  onSelectDynamicDropDown(event: MatSelectChange, index: number) {
    this.dependentDropdowns[index + 1] = event.value;
  }

  onSelectDependentDropDown(event: MatSelectChange, index: number) {
    this.dependentDropdowns[index + 1] = event.value;
  }

  onSubmit() {
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

  async storeInTeacherSubCollection(position) {
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
    // const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    // const teacherdata = await lastValueFrom(this.teacherService.getTeacherByIdOnce(user?.uid));
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

    // const timeIpResponse = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    // const [time, ip] = timeIpResponse ?
    //   await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first())) : [new Date(), ''];
    // const deviceInfo = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const deviceInfo = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

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
  async reloadComponent() {
    this.params = await lastValueFrom(this.route.queryParams.pipe(first()));
    const teacherId = await this.userService.getUid();
    this.assignmentService.getTeachersResources({ docId: teacherId, classroomId: this.params.classroomId, programmeId: this.params.programmeId }).subscribe((res) => {
      const teacherSubmission = res.data();
      if (res.data()) {
        if (this.workflowId) {
          if (teacherSubmission[`workflowId_${this.workflowId}`]) {
            if (teacherSubmission[`workflowId_${this.workflowId}`][`assignmentId_${this.formId}`]) {
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
              const questions = teacherSubmission[`workflowId_${this.workflowId}`][`assignmentId_${this.formId}`].questions;
              this.getFormDetails(questions);
            }
            else {
              this.getFormDetails();
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
            }
          }
          else {
            this.getFormDetails();
            this.assignmentFormGroup = this.fb.group({
              instructions: [''],
              questions: this.fb.array([]),
            });
          }
        }
        else {
          if (teacherSubmission[`programmeId_${this.params.programmeId}`]) {
            if (teacherSubmission[`programmeId_${this.params.programmeId}`][`assignmentId_${this.formId}`]) {
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
              const questions = teacherSubmission[`programmeId_${this.params.programmeId}`][`assignmentId_${this.formId}`].questions;
              this.getFormDetails(questions);
            }
            else {
              this.getFormDetails();
              this.assignmentFormGroup = this.fb.group({
                instructions: [''],
                questions: this.fb.array([]),
              });
            }
          }
        }
      }
      else {
        this.getFormDetails();
        this.assignmentFormGroup = this.fb.group({
          instructions: [''],
          questions: this.fb.array([]),
        });
      }
    });
  }
}
