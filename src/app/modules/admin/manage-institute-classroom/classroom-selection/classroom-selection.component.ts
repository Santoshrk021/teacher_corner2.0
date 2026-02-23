import { AfterViewInit, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { ProgrammeService } from 'app/core/dbOperations/programmes/programme.service';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { serverTimestamp } from 'firebase/firestore';
import { BehaviorSubject, Subject, Subscription, first, take, takeUntil } from 'rxjs';
@Component({
  selector: 'app-classroom-selection',
  templateUrl: './classroom-selection.component.html',
  styleUrls: ['./classroom-selection.component.scss']
})
export class ClassroomSelectionComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() stepper: MatStepper;
  @Input() selectedClassroomsSub: BehaviorSubject<any>;
  @Input() nextBtnIsActive;

  classCreate = this.fb.group({
    board: [null],
    pincode: [null],
    institutionName: [''],
    classInfo: this.fb.array([]),
    institutionId: ['']
  });
  customSection = {};
  subjectList;
  addNewClass = false;
  gradeList: number[] = Array.from({ length: 10 }).map((_, i) => i + 1);
  section: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'NA'];
  allProgrammes = [];
  subcriptionRef: Subscription[] = [];
  allClassrooms: any = [];
  instituteRepInfo = {
    representativePhone: '',
    representativeFirstName: '',
    representativeLastName: '',
  };
  classObj: any = {};
  indexObj = {};
  // selectedInstitution
  isWANotificationsDisabled: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  countryCode: string;

  constructor(
    private configurationService: ConfigurationService,
    public dialog: MatDialog,
    private fb: FormBuilder,
    private uiService: UiService,
    private institutionService: InstitutionsService,
    private classroomService: ClassroomsService,
    private programmeService: ProgrammeService,
    private masterService: MasterService,
    private afAuth: AngularFireAuth,
    private sharedService: SharedService,
  ) {

  }

  ngOnDestroy(): void {
    if (this.subcriptionRef.length) {this.subcriptionRef.map(d => d.unsubscribe());}
    // Unsubscribe from all subscriptions
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async ngOnInit(): Promise<void> {
    const user = await this.afAuth.authState.pipe(first()).toPromise();
    const phone = user.phoneNumber;
    const phoneWithoutCode = phone.slice(-10);
    this.countryCode = phone.split(phoneWithoutCode)[0];

    this.configurationService.getTeacherCornerConfigurations().pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
      this.isWANotificationsDisabled = res?.disableWhatsAppNotifications;
    });

    const instSubRef = this.institutionService.selectedInstitution.pipe(takeUntil(this._unsubscribeAll)).subscribe((inst) => {
      if (inst != null) {
        this.instituteRepInfo = {
          representativePhone: inst['representativePhone'],
          representativeFirstName: inst['representativeFirstName'],
          representativeLastName: inst['representativeLastName'],
        };
        this.classCreate.patchValue({
          board: inst['board'],
          pincode: inst['institutionAddress']['pincode'],
          institutionId: inst['institutionId'],
          institutionName: inst['institutionName'],
        });
      }
    });
    this.subcriptionRef.push(instSubRef);
  }

  ngAfterViewInit(): void {
    this.addClassInfo();
    this.getSubjects();
    this.getAllLiveProgrammes();
    this.getAllClassroom();
  }

  getAllClassroom() {
    const clsSubRef = this.classroomService.allClassroomByInstituteSub.subscribe((cls) => {
      if (cls != null) {
        this.allClassrooms = cls;
      }
      // console.log("All classrooms")
      // console.log(newclassRooms)

    });
    this.subcriptionRef.push(clsSubRef);
  }

  classInfo(): FormArray {
    return this.classCreate.get('classInfo') as FormArray;
  }

  addClassInfo() {
    this.classInfo().push(this.newClassInfo());
    const i = this.classInfo().length;
    this.customSection[i] = false;
  }

  newClassInfo(): FormGroup {
    return this.fb.group({
      subject: ['', Validators.required],
      grade: ['', Validators.required],
      section: ['', Validators.required],
      programme: ['', [Validators.required]],
    });
  }

  removeClassInfo(empIndex: number) {
    this.classInfo().removeAt(empIndex);
    this.customSection[empIndex] = false;
  }

  onclassCreateSubmit(form) {
    this.processClassroom(form.value);
  }

  processClassroom(form) {
    this.classCreate.disable();
    form?.classInfo?.map(async (c) => {
      const obj = {
        institutionName: form?.institutionName?.trim(),
        institutionId: form?.institutionId?.trim(),
        board: form?.board?.trim(),
        programmes: {},
        grade: null,
        section: '',
        subject: '',
        classroomName: '',
        classroomId: '',
        creationDate: serverTimestamp(),
        docId: ''
      };
      const id = this.classroomService.getRandomGeneratedId();
      obj.grade = Number(c?.grade),
        obj.section = c?.section?.trim(),
        obj.subject = c?.subject?.trim(),
        obj.classroomName = `${obj.grade} ${obj.section}`,
        obj.classroomId = id;
      obj.docId = id;
      for (const p in c?.programme) {
        const pr = c.programme[p];
        obj.programmes[pr.programmeId] = {
          'programmeId': pr.programmeId,
          'programmeName': pr?.programmeName
        };
      }
      const classroomMaster = await this.masterService.addNewObjectToMasterMap('CLASSROOM', 'classrooms', obj);
      obj['masterDocId'] = classroomMaster;
      await this.classroomService.update(obj, id).then(() => {
        if (!this.isWANotificationsDisabled) {
          this.sendWaNotifications(obj);
        }
        this.allClassrooms.push(obj);
        this.classroomService.allClassroomByInstituteSub.next(this.allClassrooms);
        this.classCreate.reset();
        this.addNewClass = false;
        this.uiService.alertMessage('Successful', `${obj.classroomName} Classroom Created Successfully`, 'success');
      });
    });
  }

  async sendWaNotifications(clsInfo) {
    const phoneNumber = this.countryCode + this.instituteRepInfo?.representativePhone;
    const templateName = environment.whatsAppTemplates.classroomCreation.templateName;
    const headerImage = environment.whatsAppTemplates.classroomCreation.headerImage;
    const mediaType = 'text';
    const params = [
      this.instituteRepInfo?.representativeFirstName,
      this.instituteRepInfo?.representativeLastName,
      clsInfo?.institutionName,
      clsInfo?.grade,
      clsInfo?.section,
      clsInfo?.subject,
      `${Object.values(clsInfo?.programmes).map(d => d['programmeName']).toString()}`
    ];
    const urlRoute = undefined;

    this.sharedService.sendWhatsAppNotification(phoneNumber, templateName, params, headerImage, mediaType, urlRoute);
  }

  getAllLiveProgrammes() {
    const progSub = this.programmeService.getAllLiveProgrammes().pipe(take(1)).subscribe((res) => {
      this.allProgrammes = res.sort((a, b) => (a.programmeName.localeCompare(b.programmeName, 'en-US', { numeric: 'true' })));
    });
    this.subcriptionRef.push(progSub);
  }

  async getSubjects() {
    const subSub = this.configurationService.subjectsSub.subscribe((d) => {
      if (d == null) {
        this.configurationService.getDoc('subjects');
      } else {
        this.subjectList = d;
      }
    });
    this.subcriptionRef.push(subSub);
    console.log(subSub);
  }

  onClickClass(classInfo) {
    this.selectedClassroomsSub.next(classInfo);
  }

  openProgramme() {

  }

  checkCheckBoxvalue(classinfo) {

    if (this.indexObj[classinfo.classroomId] == classinfo.classroomId) {
      delete this.indexObj[classinfo.classroomId];
      delete this.classObj[classinfo.classroomId];
    }
    else {
      this.indexObj[classinfo.classroomId] = classinfo.classroomId;
      this.classObj[classinfo.classroomId] = classinfo;

    }
    // this.indexObj[classinfo.classroomId] = classinfo.classroomId
    console.log(this.indexObj);
    console.log(classinfo);

    this.selectedClassroomsSub.next(Object.values(this.classObj));

    // this.classObj[classinfo.classroomId] = classinfo
    // delete this.classObj[classinfo.classroomId]

    // console.log(Object.values(this.classObj));
    // this.selectedClassroomsSub.next(Object.values(this.classObj))


  }

}
