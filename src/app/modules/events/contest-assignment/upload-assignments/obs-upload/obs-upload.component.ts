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
  storageBucket = 'contest_submissions';
  loader = false;
  bytesTransferred;
  params: any;
  storedFilePath: string = '';
  studentId: any;
  isFinalSubmission = false;
  isContainsLink = [];
  isDescription = '';
  constructor(
    private studentService: StudentsService,
    private afStore: AngularFireStorage,
    private assignmentsService: AssignmentsService,
    private uiService: UiService,
    private deviceInfoService: DeviceInfoService,
    private route: ActivatedRoute,
    private userService: UserService,

  ) { }

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
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
      const bucketPath = `${this.storageBucket}/${this.params.contestId}/${this.params.stageId}/${this.params.submId}/${this.studentId}-${this.params.contestId}/${this.asgnId}_${this.assignmentData.submissionId}.` + this.filename.split('.').slice(-1).pop();
      console.log(bucketPath, 'from obs upload');
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
      [`stageId-${this.params.stageId}`]: {
        [`submId-${this.params.submId}`]: { [`assignmentId-${this.asgnId}`]: { [this.assignmentData.submissionId]: { submissionPath: bucketPath, type: this.assignmentData.uploadFileType } } }
      },
      createdAt: serverTimestamp(),
      submissionMeta: arrayUnion(d)
    };
    this.storedFilePath = bucketPath;
  }



}
