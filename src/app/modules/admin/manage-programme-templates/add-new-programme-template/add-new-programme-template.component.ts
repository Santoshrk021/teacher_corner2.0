import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Timestamp } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeTemplateService } from 'app/core/dbOperations/programmeTemplate/programme-template.service';
import { ProgrammeTemplate, ProgrammeTemplateMaster } from 'app/core/dbOperations/programmeTemplate/programme-template.type';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, first, lastValueFrom, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-new-programme-template',
  templateUrl: './add-new-programme-template.component.html',
  styleUrls: ['./add-new-programme-template.component.scss']
})
export class AddNewProgrammeTemplateComponent implements OnInit {
  @Input() templateDetails: any;
  @Input() stepper: MatStepper;
  @Input() stepperData: BehaviorSubject<any>;
  @Input() addNewTemplateFlag?: boolean;
  @Input() allTemplates: any;
  @Input() searchTerm: any;
  @Output() searchTermOutput: EventEmitter<any> = new EventEmitter();

  storageBucket = 'programme_template_images';
  filename;
  bytesTransferred;
  loading: boolean = false;
  classroomTobeUpdated: any = [];
  imagePath: string;
  randomGeneratedId: string;
  images = {
    headLineImage: '',
  };
  grade: number;
  isGrade = true;
  loader = false;
  isUpdateHeadlineImage: boolean = true;
  templateStatus: any = ['LIVE', 'DEVELOPEMENT'];
  templateType: any = ['REGULAR', 'STEM-CLUB'];
  newTemplate: FormGroup;
  masterClassrooms;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  masterDocs;
  lowValueAge: number;
  highValueAge: number;
  classroomDataSubscription: any;
  disableUploadButton: boolean = true;
  internationalBoards: Array<any> = [];
  boardData: any;
  isLoaded: boolean = false;
  countryBoard: Array<string>;
  countryCodes: any;
  teacherCountry: string;
  teacherCountryCode: string;
  isAddNewBoard: boolean = false;
  isAddNewSubject: boolean = false;
  isAddNewCategory: boolean = false;
  gradeList: Array<number>;
  subjectList: Array<string>;
  templateCategoryList: Array<string>;
  disableForm: boolean = true;

  constructor(
    private fb: FormBuilder,
    private programmeTemplateService: ProgrammeTemplateService,
    private masterService: MasterService,
    private afStore: AngularFireStorage,
    private uiService: UiService,
    private configurationService: ConfigurationService,
    private afAuth: AngularFireAuth,
    private userService: UserService,
  ) { }

  ngOnDestroy() {
    // Unsubscribe when the component is destroyed
    if (this.classroomDataSubscription) {
      this.classroomDataSubscription.unsubscribe();
    };
  }

  async ngOnInit(): Promise<void> {
    const currentUser = await this.getCurrentUserDetails();

    this.getProgrammeTemplateDetails();

    if (!this.addNewTemplateFlag) {
      this.randomGeneratedId = this.templateDetails?.templateId;
    } else {
      this.randomGeneratedId = this.programmeTemplateService.generateRandomDocId();
    };

    this.declareForm();

    this.getBoardDetails(currentUser);

    const watchList = [
      'country',
      'templateName',
      'displayName',
      'templateStatus',
      'templateDescription',
      'type',
      'board',
      'grade',
      'subject',
    ];

    const unlockList = [
      'templateName',
      'displayName',
      'templateStatus',
      'templateDescription',
      'type',
      'board',
      'grade',
      'subject',
      'templateCategory',
    ];

    if (this.addNewTemplateFlag) {
      for (let i = 0; i < watchList.length; i++) {
        this.unlockFormSequentially(watchList[i], unlockList[i]);
      };
    } else {
      this.disableUploadButton = false;
      this.newTemplate.valueChanges.pipe(takeUntil(this._unsubscribeAll)).subscribe((res: any) => {
        if (unlockList.every(key => res?.[key] === this.templateDetails?.[key])) {
          this.disableForm = true;
        } else {
          this.disableForm = false;
        }
      });
    };
  }

  async declareForm() {
    this.newTemplate = this.fb.group({
      country: [{ value: '', disabled: true }, Validators.required],
      templateName: [this.templateDetails?.templateName || '', Validators.required],
      templateDescription: [{ value: this.templateDetails?.templateDescription || '', disabled: this.addNewTemplateFlag ? true : false }, Validators.required],
      templateStatus: [{ value: this.templateDetails?.templateStatus || '', disabled: this.addNewTemplateFlag ? true : false }, Validators.required],
      templateImagePath: [this.templateDetails?.templateImagePath || ''],
      board: [{ value: this.templateDetails?.board || '', disabled: this.addNewTemplateFlag ? true : false }, Validators.required],
      grade: [{ value: this.templateDetails?.grade || '', disabled: this.addNewTemplateFlag ? true : false }, Validators.required],
      subject: [{ value: this.templateDetails?.subject || '', disabled: this.addNewTemplateFlag ? true : false }, Validators.required],
      templateCategory: [{ value: this.templateDetails?.templateCategory || '', disabled: this.addNewTemplateFlag ? true : false }, Validators.required],
      displayName: [{ value: this.templateDetails?.displayName, disabled: this.addNewTemplateFlag ? true : false }, [Validators.required]],
      type: [{ value: this.templateDetails?.type, disabled: this.addNewTemplateFlag ? true : false }, [Validators.required]],
    });
  }

  async onSubmit(form: FormGroup) {
    this.loading = true;

    if (this.addNewTemplateFlag) {
      const newTemplate: ProgrammeTemplate = {
        assignmentIds: [],
        board: form.get('board').value,
        createdAt: Timestamp.fromDate(new Date()),
        displayName: form.get('displayName').value,
        docId: this.randomGeneratedId,
        grade: form.get('grade').value,
        learningUnitsIds: [],
        masterDocId: '',
        subject: form.get('subject').value,
        templateCategory: form.get('templateCategory').value,
        templateDescription: form.get('templateDescription').value,
        templateId: this.randomGeneratedId,
        templateImagePath: this.imagePath,
        templateName: form.get('templateName').value,
        templateStatus: form.get('templateStatus').value,
        type: form.get('type').value,
        updatedAt: Timestamp.fromDate(new Date()),
        isLocalHost: false
      };
      this.stepperData.next(newTemplate);
    }
    else {
      const {
        templateName,
        displayName,
        templateStatus,
        templateDescription,
        type,
        templateImagePath,
        board,
        grade,
        subject,
        templateCategory,
      } = form.value;

      const { docId, masterDocId } = this.templateDetails;

      const fieldsToUpdate = {
        templateName,
        displayName,
        templateStatus,
        templateDescription,
        type,
        templateImagePath,
        board,
        grade,
        subject,
        templateCategory,
      };

      try {
        await Promise.all(Object.entries(fieldsToUpdate).map(async ([key, value]) => {
          // only changed fields will be updated in programme templates and programme template master
          if (value !== this.templateDetails[key]) {
            await this.masterService.updateMasterDocField(masterDocId, docId, 'programmeTemplates', key, value);
            await this.programmeTemplateService.updateProgrammeTemplateSingleField(docId, key, value);
          }
        }));
        this.searchTermOutput.emit(this.searchTerm);
        this.uiService.alertMessage('Successful', 'Programme Template Updated Successfully', 'success');
      } catch (error) {
        this.uiService.alertMessage('Error', 'Error updating Programme Template', 'error');
        console.error('Error updating Programme Template:', error);
      } finally {
        this.loading = false;
      }
    };
  }

  async updateTemplateMaster(updatedTemplate: ProgrammeTemplate, masterDocId: string) {
    const masterTemplateToBeUpdated: ProgrammeTemplateMaster = {
      board: updatedTemplate?.board,
      createdAt: updatedTemplate?.createdAt,
      displayName: updatedTemplate?.displayName,
      docId: updatedTemplate?.docId,
      grade: updatedTemplate?.grade,
      learningUnitsIds: updatedTemplate?.learningUnitsIds,
      subject: updatedTemplate?.subject,
      templateCategory: updatedTemplate?.templateCategory,
      templateDescription: updatedTemplate?.templateDescription,
      templateId: updatedTemplate?.templateId,
      templateImagePath: updatedTemplate?.templateImagePath,
      templateName: updatedTemplate?.templateName,
      templateStatus: updatedTemplate?.templateStatus,
      type: updatedTemplate?.type,
      updatedAt: updatedTemplate?.updatedAt,
    };

    const masterProgrammeTemplates = await lastValueFrom(this.masterService.getMasterDocByIdOnce(masterDocId));
    const programmeTemplateArray = masterProgrammeTemplates.get('programmeTemplates');
    const index = programmeTemplateArray.findIndex(e => e.templateId === updatedTemplate?.templateId);
    programmeTemplateArray[index] = masterTemplateToBeUpdated;
    this.masterService.updateMasterDoc('programmeTemplates', masterDocId, { [updatedTemplate?.docId]: programmeTemplateArray });
  }

  async selectFile(event: any) {
    this.filename = event.target.files[0].name;
    const isValid = this.imageTypeAndSizeCheck(event.target.files[0]);
    if (isValid) {
      this.loader = true;
      const bucketPath = `${this.storageBucket}/${this.randomGeneratedId}.` + this.filename.split('.').slice(-1).pop();
      const ref = this.afStore.ref(bucketPath);
      const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();

      await lastValueFrom(task).then((uploadedSnapshot) => {
        this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100;
        if (uploadedSnapshot.state === 'success') {
          this.loader = false;
          if (this.templateDetails) {
            this.templateDetails.programmeImagePath = bucketPath;
          }
          this.imagePath = bucketPath;
          this.uiService.alertMessage('successful', 'Image Uploaded successfully', 'success');
        };
      });
    };
  }

  imageTypeAndSizeCheck(event) {
    const allowedExtensions = /(\.jpeg|\.png|\.jpg)$/i;
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid file type', 'Only allowed .jpeg, .png, .jpg file types', 'warn');
      this.filename = '';
      isValid = false;
    }
    else if (event.size > 3145728) {
      this.uiService.alertMessage('Invalid file type', 'maximum image size should be 3mb', 'warn');
      this.filename = '';
      isValid = false;
    }
    else {
      isValid = true;
    };
    return isValid;
  }

  unlockFormSequentially(watch: string, unlock: string) {
    switch (watch) {
      case 'country':
        const countryName = this.newTemplate?.get(watch)?.value;
        if (countryName) {
          const internationalBoards = this.boardData?.boardsInternational;
          const country = countryName?.includes(' ') ? countryName?.toLowerCase()?.replace(/\s/g, '-') : countryName?.toLowerCase();
          this.teacherCountry = country;
          this.teacherCountryCode = this.countryCodes?.[country]?.phone;
          this.countryBoard = internationalBoards?.[country];
          this.isAddNewBoard = false;
        };
        break;

      case 'type':
        this.newTemplate?.get(watch)?.valueChanges.subscribe(async (res) => {
          if (res) {
            this.newTemplate?.get(unlock)?.enable();
            this.disableUploadButton = false;
          };
        });
        break;

      default:
        this.newTemplate?.get(watch)?.valueChanges.subscribe(async (res) => {
          if (res) {
            this.newTemplate?.get(unlock)?.enable();
          };
        });
        break;
    };
  }

  async getTemplateConfigData() {
    // this.configurationService.
  }

  async getCurrentUserDetails() {
    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    return currentUser;
  }

  async getBoardDetails(currentUser: any) {
    const { countryCode, countryCodes, boardData, countryName, isLoaded } = await this.configurationService.getInternationalBoards(currentUser, this.newTemplate, false);
    [this.teacherCountryCode, this.countryCodes, this.boardData, this.teacherCountry, this.isLoaded] = [countryCode, countryCodes, boardData, countryName, isLoaded];
    this.countryBoard = this.boardData?.boardsInternational[this.teacherCountry];
  }

  async saveNewBoard() {
    const { boards, countryBoard, isAddNewBoard } = await this.configurationService.saveNewBoard(this.newTemplate, this.isAddNewBoard, this.boardData, this.countryBoard, this.teacherCountry);
    [this.boardData, this.countryBoard, this.isAddNewBoard] = [boards, countryBoard, isAddNewBoard];
  }

  async getProgrammeTemplateDetails() {
    const { gradeList, subjectList, templateList } = await lastValueFrom(this.configurationService.getProgrammeTemplateObject().pipe(first()));
    [this.gradeList, this.subjectList, this.templateCategoryList] = [gradeList, subjectList, templateList];
  }

  async saveNewSubject() {
    const { updatedSubjectList, isAddNewSubject } = await this.configurationService.saveNewSubject(this.newTemplate, this.isAddNewSubject, this.subjectList);
    [this.subjectList, this.isAddNewSubject] = [updatedSubjectList, isAddNewSubject];
  }

  async saveNewCategory() {
    const { updatedCategoryList, isAddNewCategory } = await this.configurationService.saveNewTemplateCategory(this.newTemplate, this.isAddNewCategory, this.templateCategoryList);
    [this.templateCategoryList, this.isAddNewCategory] = [updatedCategoryList, isAddNewCategory];
  }

}
