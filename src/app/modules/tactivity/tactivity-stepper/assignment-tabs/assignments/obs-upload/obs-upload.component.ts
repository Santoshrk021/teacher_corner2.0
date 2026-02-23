import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { UiService } from 'app/shared/ui.service';
import { first, lastValueFrom, take } from 'rxjs';
import { serverTimestamp } from 'firebase/firestore';
import { arrayUnion } from 'firebase/firestore';
import { AssignmentDialogComponent } from 'app/modules/assignment-dialog/assignment-dialog.component';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
@Component({
  selector: 'app-obs-upload',
  templateUrl: './obs-upload.component.html',
  styleUrls: ['./obs-upload.component.scss'],

})
export class ObsUploadComponent implements OnInit {
  filename: any;
  @Input() assignmentData: any;
  @ViewChild('elementRef', { static: false })
  elementRef: ElementRef;
  storageBucket = 'unlab2';
  loader = false;
  bytesTransferred;
  constructor(
    private teachersService: TeacherService,
    private afStore: AngularFireStorage,
    private assignmentsService: AssignmentsService,
    private uiService: UiService,
    private deviceInfoService: DeviceInfoService,
    private dialog: MatDialog,
  ) { }

  ngOnInit(): void {
  }
  async upload(event) {
    this.loader = true;
    const studentInfo = this.teachersService.currentTeacher.value;
    this.filename = event.target.files[0].name;
    const isValid = this.pdfTypeAndSizeCheck(event.target.files[0]);

    if (isValid) {
      const bucketPath = `${this.storageBucket}/${studentInfo.id}-${studentInfo.classroomId}/assignments/${this.assignmentData.id}.` + this.filename.split('.').slice(-1).pop();
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

      this.assignmentObj(bucketPath, studentInfo?.id, studentInfo?.classroomId);
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


  async assignmentObj(bucketPath, studentId, classId) {
    // const [time, ip]: any = await lastValueFrom(this.deviceInfoService.timeIpSubject.pipe(first()));

    // const d = { clientIp: ip, submissionTime: time ? new Date(time) : new Date() };

    const [utcDate, ip] = await this.deviceInfoService.getTime();
    const d = {
      clientIp: ip,
      submissionTime: utcDate// accurate server time
    };

    const obj = {
      resourceId: { [this.assignmentData.id]: { storagePath: bucketPath, type: this.assignmentData.type } },
      createdAt: serverTimestamp(),
      submissionMeta: arrayUnion(d)
    };

    // this.assignmentsService.updateInSubmission(obj, studentId, classId)
  }

  async onClickView() {
    // importing assignment - dialog.module
    await import('../../../../../assignment-dialog/assignment-dialog.module');

    // const studentInfo = this.teachersService.currentTeacher.value
    // this.assignmentsService.getResources(studentInfo.id, studentInfo.classroomId).pipe(take(1)).subscribe((res: any) => {
    //   const resourceData = res.data().resourceId[this.assignmentData.id]
    //   // const ref = this.afStore.ref(resourceData.storagePath)
    //   // const url = ref.getDownloadURL();
    //   // url.subscribe(url => {
    //   //   this.createAnchorTag(url)
    //   // })
    //   this.dialog.open(AssignmentDialogComponent, {
    //     data: resourceData
    //   })
    // })
  }

  createAnchorTag(url) {
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('target', '_blank');
    a.click();
  }
}
