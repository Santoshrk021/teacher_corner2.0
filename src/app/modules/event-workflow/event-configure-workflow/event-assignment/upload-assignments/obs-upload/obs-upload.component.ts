import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { first, lastValueFrom, take } from 'rxjs';
import { serverTimestamp } from 'firebase/firestore';
import { arrayUnion } from 'firebase/firestore';
import { ActivatedRoute } from '@angular/router';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
@Component({
  selector: 'app-obs-upload',
  templateUrl: './obs-upload.component.html',
  styleUrls: ['./obs-upload.component.scss'],

})
export class ObsUploadComponent implements OnInit {
  filename: any;
  @Input() assignmentData: any;
  @Input() currentWorkflow: any;
  @Input() workflowId: any;
  @Input() asgnId: any;
  @ViewChild('elementRef', { static: false })
  elementRef: ElementRef;
  storageBucket = 'event_submissions';
  loader = false;
  bytesTransferred;
  params: any;
  storedFilePath: string = '';
  studentId: any;
  isFinalSubmission = false;
  isContainsLink = [];
  isDescription = '';
  description: any;
  teacherId: any;
  privilege: boolean = false;
  constructor(
    private studentService: StudentsService,
    private afStore: AngularFireStorage,
    private assignmentService: AssignmentsService,
    private uiService: UiService,
    private deviceInfoService: DeviceInfoService,
    private route: ActivatedRoute,
    private userService: UserService,
    private teacherService: TeacherService

  ) { }

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
    });
    this.teacherId = await this.userService.getUid();
    this.checkResourcePath();
    this.userService.userInfoSub.subscribe((userInfo) => {
      this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
    });
  }
  checkResourcePath() {
    this.assignmentService.getEventSubmission(this.params.eventId, this.teacherId).subscribe((res) => {
      if (res.data()) {
        const resourceData = res.data()[`batchId-${this.params.batchId}`][`submId-${this.params.submId}`][`assignmentId-${this.asgnId}`][this.assignmentData?.submissionId];
        this.storedFilePath = resourceData?.submissionPath || '';
        this.description = res.data()?.[`batchId-${this.params.batchId}`][`submId-${this.params.submId}`]?.['assignmentId-description']?.text;
      }

    });
  }
  ngAfterViewInit(): void {
    this.isContainsLink = [];
    this.studentService.currentStudent.subscribe((studentInfo) => {
      this.isFinalSubmission = studentInfo?.contestSubmissions?.[`contestId_${this.params.contestId}`]?.[`stageId_${this.params.stageId}`]?.[`submId_${this.params.submId}`]?.isSubmitted
        === true ? true : false;
    });
    this.isContainsLink = ((this.assignmentData?.instructions)?.match(/\bhttps?:\/\/\S+/gi)) || [];
    this.isDescription = (this.assignmentData?.instructions).replace(/(?:https?|ftp):\/\/[\n\S]+/g, '');
  }

  async upload(event) {
    this.loader = true;
    this.filename = event.target.files[0].name;
    const isValid = this.pdfTypeAndSizeCheck(event.target.files[0]);
    if (isValid) {
      const bucketPath = `${this.storageBucket}/${this.params.eventId}/${this.params.batchId}/${this.teacherId}-${this.params.eventId}/${this.asgnId}_${this.assignmentData.submissionId}.` + this.filename.split('.').slice(-1).pop();
      const ref = this.afStore.ref(bucketPath);
      //putting the file into storage with custom metadata
      const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();
      await lastValueFrom(task).then((uploadedSnapshot) => {
        this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100;
        if (uploadedSnapshot.state === 'success') {
          this.uiService.alertMessage('successful', 'The pdf files is uploaded successfully', 'success');
          this.loader = false;
        }
      });
      this.assignmentObj(bucketPath);
    }
  }

  pdfTypeAndSizeCheck(event) {
    const allowedExtensions = /(\.pdf)$/i;
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid file type', 'Only allowed .pdf file type', 'warn');
      this.elementRef.nativeElement.value = '';
      this.filename = '';
      isValid = false;
    }
    else if (event.size > 3145728) {
      this.uiService.alertMessage('Invalid file type', 'maximum image size should be 3mb', 'warn');
      this.elementRef.nativeElement.value = '';
      this.filename = '';
      isValid = false;
    }
    else {
      isValid = true;
    }
    return isValid;
  }

  async assignmentObj(bucketPath) {
    // const [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));
    // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const d = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

    const obj = {
      [`batchId-${this.params.batchId}`]: {
        [`submId-${this.params.submId}`]: {
          [`assignmentId-${this.asgnId}`]: {
            [this.assignmentData.submissionId]: { submissionPath: bucketPath, type: this.assignmentData.uploadFileType }
          }
        }
      },
      createdAt: serverTimestamp(),
      submissionMeta: arrayUnion(d)
    };
    this.assignmentService.updateEventSubmission(this.params.eventId, this.teacherId, obj);
    this.saveFlagInTeacherDoc();
    this.storedFilePath = bucketPath;
  }


  saveFlagInTeacherDoc() {
    const obj = {
      eventSubmissions: {
        [`eventId_${this.params.eventId}`]: {
          [`batchId_${this.params.batchId}`]: {
            [`submId_${this.params.submId}`]: {
              isSubmitted: true,
              submittedAt: serverTimestamp()
            }
          }
        }
      }
    };

    this.teacherService.updateTeacher(obj, this.teacherId);
  }
}
