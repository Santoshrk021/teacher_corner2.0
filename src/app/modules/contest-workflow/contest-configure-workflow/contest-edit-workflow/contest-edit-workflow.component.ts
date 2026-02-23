import { Component, ElementRef, Inject, NgZone, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ContestWorkflowService } from 'app/core/dbOperations/contestworkflows/contest-workflow.service';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { UiService } from 'app/shared/ui.service';
import moment from 'moment';
import { BehaviorSubject, lastValueFrom, Subscription } from 'rxjs';

@Component({
  selector: 'app-contest-edit-workflow',
  templateUrl: './contest-edit-workflow.component.html',
  styleUrls: ['./contest-edit-workflow.component.scss']
})
export class ContestEditWorkflowComponent implements OnInit, OnDestroy {
  storageBucket = 'contests-images';
  quillConfig = {
    toolbar: {
      container: [
        ['bold', 'italic', 'underline',],        // toggled buttons
        [{ 'header': [1, 2, 3, 4, 6, false] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],      // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],          // outdent/indent
      ],
    }
  };

  @ViewChild('elementRef', { static: false })
  elementRef: ElementRef;
  allGames: any = [];
  workFlowContents: FormGroup;

  workFlowsDoc = {
    contestSteps: [],
    sequenceNumber: 0,
  };
  contentsTypes = [
    // { type: 'TEXTBLOCK', displayName: 'Text Block' },
    { type: 'RESOURCES', displayName: 'Resources' },
    { type: 'ASSIGNMENT', displayName: 'Assignments' },
    // 'textblock',
    // 'assignment',
    // 'resources'
  ];

  additionalResType = [{ type: 'PDF', name: 'Upload PDF' }, { type: 'LINK', name: 'Youtube Link' }, { type: 'PPT', name: 'Upload PPT' }];
  maxValue: any;
  sequenceInitialvalue = new BehaviorSubject(null);
  submitBtnActive: boolean = true;
  _wfInitialValue = new BehaviorSubject(null);

  bytesTransferred: any;
  inputFileName;

  assignmentsObject = {
    enableAssignmentDropDown: false,
    type: '',
    assignmentsTypes: [
      {
        displayName: 'Upload',
        type: 'UPLOAD',
      },
      {
        displayName: 'Quiz',
        type: 'QUIZ',
      },
      {
        displayName: 'Game',
        type: 'GAME',
      },
      {
        displayName: 'Text block',
        type: 'TEXTBLOCK',
      },
      {
        displayName: 'Form',
        type: 'FORM',
      },
      {
        displayName: 'Video',
        type: 'VIDEO',
      },

    ],
    fetchAssignmentsNames: [],
    programmeInfo: {},
    userMessage: '',
  };
  subscriptionRef: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private _fuseConfirmationService: FuseConfirmationService,
    private workflowService: ContestWorkflowService,
    private uiService: UiService,
    public dialog: MatDialog,
    private afStorage: AngularFireStorage,
    private dialogRef: MatDialogRef<ContestEditWorkflowComponent>,
    private assignmentService: AssignmentsService,
    private contestService: ContestService,
    private masterService: MasterService
  ) {
    this.workFlowContents = this.fb.group({
      sequenceNumber: ['', Validators.required],
      contestStepName: ['', Validators.required],
      contestStepSubtitle: ['', Validators.required],
      contestStepDescription: ['', Validators.required],
      contestStepDuration: ['', Validators.required],
      contestLocation: [],
      allowAccess: [],
      viewUnlab: [true],
      canSkipContestStep: [],
      showStepInSubmissionDashboard:[true],
      type: [],
      contents: this.fb.array([]),
    });
  }

  async ngOnInit(): Promise<void> {
    const gameDocs = await lastValueFrom(this.masterService.getMasterDocByIdOnce('games'));
    this.allGames = gameDocs.exists ? gameDocs.get('gameNames') : [];
    this.assignmentService.getAllAssignments().subscribe((assignments) => {
      this.assignmentsObject.fetchAssignmentsNames = assignments;
      this.setForm(this.data?.selectedStep);
    });

    this.workFlowsDoc.contestSteps = this.data?.rawWorkflowInfo?.contestSteps?.[this.data?.category]?.steps;

    this.workFlowContents?.get('contents').valueChanges.subscribe((change) => {
      if (JSON.stringify(this._wfInitialValue.value) == JSON.stringify(change)) {
        this.submitBtnActive = true;
      }
      else {
        this.submitBtnActive = true;
      }
    });
  }

  setForm(formInfo) {
    if (formInfo) {
      this.maxValue = this.data?.rawWorkflowInfo?.contestSteps?.[this.data?.category]?.steps?.length;
      const d = formInfo;
      this.sequenceInitialvalue.next(d.sequenceNumber);
      this.workFlowContents = this.fb.group({
        sequenceNumber: [d?.sequenceNumber],
        contestStepName: [d?.contestStepName],
        contestStepSubtitle: [d?.contestStepSubtitle],
        contestStepDescription: [d?.contestStepDescription],
        contestStepDuration: [d?.contestStepDuration],
        contestLocation: [d?.contestLocation == null || d?.contestLocation == undefined ? '' : d?.contestLocation],
        allowAccess: [d?.allowAccess],
        canSkipContestStep: [d?.canSkipContestStep],
        showStepInSubmissionDashboard: [d?.showStepInSubmissionDashboard],
        type: [d?.type],
        contents: this.fb.array([]),
      });
      this.data.selectedStep.contents.map((c) => {
        this.addNewContent(c);
      });
      this._wfInitialValue.next(this.workFlowContents.value);
    }
    else {
      this.maxValue = this.data?.rawWorkflowInfo?.contestSteps?.[this.data?.category]?.steps?.length + 1;
      this.sequenceInitialvalue.next(this.maxValue);
      this.workFlowContents = this.fb.group({
        sequenceNumber: [this.data?.rawWorkflowInfo?.contestSteps?.[this.data?.category]?.steps?.length + 1],
        contestLocation: [''],
        contestStepName: [''],
        contestStepSubtitle: [''],
        contestStepDuration: [''],
        contestStepDescription: [''],
        allowAccess: [''],
        canSkipContestStep: [''],
        showStepInSubmissionDashboard: [true],
        type: [''],
        contents: this.fb.array([]),
      });
      this.addNewContent();
    }
  }

  async checkContentType(typeName, contentIndex) {
    this.contents.at(contentIndex).patchValue({
      contentType: typeName
    });
  }

  selectedOtherType(otherName, contentIndex) {
    this.contents.at(contentIndex).patchValue({
      contentName: otherName
    });
  }

  async selectAssignmentType(type, contentIndex) {
    const assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == type);
    this.contents.at(contentIndex).patchValue({
      assignmentType: type,
      fetchAssignmentsNames: assignments
    });
  }

  selectedGames(game, contentIndex) {
    this.contents.at(contentIndex).patchValue({
      resourcePath: game.url,
      assignmentId: game.gameId,
    });
  }

  selectedAssignment(assignmentObj, contentIndex) {
    this.contents.at(contentIndex).patchValue({
      assignmentId: assignmentObj.docId
    });
  }

  addNewContent(content?: any, assignmentNames = []) {
    const fArr = this.contents;
    const filterAssignments = this.getFilterAssignments(content);
    const fGroup = this.fb.group({
      'contentName': this.fb.control(content?.contentName || '', [Validators.required]),
      'contentType': this.fb.control(content?.contentType || '', [Validators.required]),
      'resourceType': this.fb.control(content?.resourceType || ''),
      'resourcePath': this.fb.control(content?.resourcePath || ''),
      'contentIsLocked': this.fb.control(content?.contentIsLocked || ''),
      'assignmentType': this.fb.control(content?.assignmentType || ''),
      'contentTextBlock': this.fb.control(content?.contentTextBlock || ''),
      'assignmentName': this.fb.control(content?.assignmentName || ''),
      'assignmentId': this.fb.control(content?.assignmentId || ''),
      'assignmentDueDate': this.fb.control(content?.assignmentDueDate?.seconds ? moment(content?.assignmentDueDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD')),
      'fetchAssignmentsNames': this.fb.control(filterAssignments),
      'gameName': this.fb.control(content?.gameName || ''),

      'uploadProgress': 0,
      'isDownloadable': this.fb.control(content?.isDownloadable != undefined ? content?.isDownloadable : false),
    });
    fArr?.push(fGroup);

  }

  // getFilterAssignments(content) {
  //   let assignments = []
  //   if (content?.contentType == 'ASSIGNMENT' && content?.assignmentType == 'UPLOAD') {
  //     assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'UPLOAD')
  //   }
  //   else if (content?.contentType == 'ASSIGNMENT' && content?.assignmentType == 'QUIZ') {
  //     assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'QUIZ')
  //   }
  //   else if (content?.contentType == 'ASSIGNMENT' && content?.assignmentType == 'FORM') {
  //     assignments = this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type == 'FORM')
  //   }
  //   return assignments
  // }

  getFilterAssignments(content) {
    if (content?.contentType === 'ASSIGNMENT') {
      return this.assignmentsObject.fetchAssignmentsNames.filter(d => d.type === content.assignmentType);
    }
    return [];
  }

  get contents() {
    return this.workFlowContents?.controls['contents'] as FormArray;
  }

  getAllSteps() {

    const updatedFormData = this.workFlowContents.value;
    updatedFormData.contents.map((c) => {
      delete c['fetchAssignmentsNames'];
      delete c['uploadProgress'];
      if (c['contentType'] == 'ASSIGNMENT') {
        c['assignmentDueDate'] = new Date(c['assignmentDueDate']);
        delete c['uploadProgress'];
      }
      else {
        delete c['assignmentDueDate'];
        delete c['assignmentName'];
        delete c['assignmentId'];
        delete c['assignmentType'];
        delete c['assignmentId'];
      }
    });


    const initialIndex = this.sequenceInitialvalue.value - 1;
    const newIndex = this.workFlowContents.get('sequenceNumber').value - 1;
    const arr = this.data?.rawWorkflowInfo?.contestSteps?.[this.data?.category]?.steps;
    const reArr = this.reArrange(arr, initialIndex, updatedFormData, newIndex);

    this.data.rawWorkflowInfo.contestSteps[this.data?.category].steps = this.getSequentially(reArr);
    return this.getSequentially(reArr);
  }

  async onSubmit(resourcePath = '') {
    const templateWorkFlowSteps = {
      contestSteps: { [this.data?.category]: { steps: this.getAllSteps() } },
      templateId: this.data?.rawWorkflowInfo?.templateId,
      templateName: this.data?.rawWorkflowInfo?.templateName,
    };

    if (this.data.selectedStageSubm.workflowId) {
      this.updateWorkflowDoc(templateWorkFlowSteps, this.data.selectedStageSubm.workflowId);
      this.uiService.alertMessage('Successful', 'Changes has been Successfully Saved', 'success');
    } else {
      const createdWFId: string = await this.createNewWorkFlowDocId(templateWorkFlowSteps);
      this.data.selectedStageSubm.workflowId = createdWFId;
      const rawStageArr = this.data.selectedStageSubm.rawContestStages;
      const submId = this.data.selectedStageSubm.submissionId;
      const contestId = this.data.selectedStageSubm.contestId;
      const updatedWFIdStagesArr: any = this.contestService.addWFIdIntoStageSubm(rawStageArr, submId, createdWFId);
      const updateStagesArr = {
        stagesNames: updatedWFIdStagesArr
      };
      await this.contestService.updateContest(updateStagesArr, contestId);
      this.data.selectedStageSubm.rawContestStages = updatedWFIdStagesArr;
      this.uiService.alertMessage('Successful', 'Workflow has been Successfully Saved', 'success');
    }
  }

  /* Update Existing workflow */
  updateWorkflowDoc(workFlowSteps: any, workFlowDocId) {
    this.workflowService.updateWorkFlowTemplate(workFlowSteps, workFlowDocId);
  }

  /* Create New WorkFlow */
  createNewWorkFlowDocId(templateWorkFlowSteps: any) {
    const workFlowId = this.workflowService.addNewWorkFlowTemplate(templateWorkFlowSteps);
    return workFlowId;
  }

  insert(arr, index, newItem) {
    arr.splice(index, 1);
    return [...arr.slice(0, index), newItem, ...arr.slice(index)];
  }

  // reArrange(arr, initialIndex, newItem, newIndex) {

  //   return [...arr.slice(0, newIndex), newItem, ...arr.slice(newIndex + 1)]
  // }
  reArrange(arr, initialIndex, newItem, newIndex) {
    // Create a shallow copy of the original array
    const result = arr.slice();

    // Remove the item from the initial index
    result.splice(initialIndex, 1);

    // Insert the new item at the new index
    result.splice(newIndex, 0, newItem);

    return result;
  }
  getSequentially(arr: Array<any>) {
    let count = 1;
    return arr.map((d: any) => {
      const a = { ...d, 'sequenceNumber': count };
      count++;
      return a;
    });
  }

  deletElements(lessonIndex: number) {
    this.contents.removeAt(lessonIndex);
  }

  updateResourcePath(resourcePath, i) {
    this.contents.at(i).patchValue({
      resourcePath: resourcePath
    });
    // this.onSubmit()
  }

  onChooseFile(event, i, type) {
    this.inputFileName = event.target.files[0].name;
    const isValid = this.fileTypeAndSizeCheck(event.target.files[0], type);
    if (isValid) {
      this.upload(event, i, type);
    }
  }

  async upload(event, index, type) {
    const content = this.contents.at(index).getRawValue();
    const bucketPath = `${this.storageBucket}/${content.contentType}/${this.data.selectedStageSubm.contestId}_${this.data.selectedStageSubm.submissionId}_${this.data?.category}_${index}.` + this.inputFileName.split('.').slice(-1).pop();
    const ref = this.afStorage.ref(bucketPath);
    const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.inputFileName } }).snapshotChanges();
    task.subscribe(async (uploadedSnapshot) => {
      const bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
      this.contents.at(index).patchValue({
        'uploadProgress': bytesTransferred,
      });
      if (uploadedSnapshot.state === 'success') {
        this.updateResourcePath(bucketPath, index);
        if (type == 'ppt') {
          this.uiService.alertMessage('successful', 'The PPT file has been uploaded successfully', 'success');
        } else {
          this.uiService.alertMessage('successful', 'The PDF files has been uploaded successfully', 'success');
        }
      }
    });
  }

  fileTypeAndSizeCheck(event, type) {
    const allowedExtensions = /(\.pdf|\.ppt|\.pptx)$/i;
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid File Type', 'Only allowed PDF, PPT and PNG or JPEG files', 'warn');
      this.elementRef.nativeElement.value = '';
      this.inputFileName = '';
      isValid = false;
    }
    /* Max PPT File 100MB */
    else if (type == 'ppt' && event.size <= 157286400) {
      isValid = true;
    }
    else if (type == 'ppt' && event.size > 157286400) {
      this.uiService.alertMessage('File Size Exceeds', 'Maximum PPT file size should be 150MB', 'warn');
      this.elementRef.nativeElement.value = '';
      this.inputFileName = '';
      isValid = false;
    }
    else if (event.size > 10485760) {
      this.uiService.alertMessage('File Size Exceeds', 'Maximum file size should be 10MB', 'warn');
      this.elementRef.nativeElement.value = '';
      this.inputFileName = '';
      isValid = false;
    }
    else {
      isValid = true;
    }
    return isValid;
  }

  ngOnDestroy(): void {
    if (this.subscriptionRef.length) {this.subscriptionRef.map(d => d.unsubscribe());}
  }

}
