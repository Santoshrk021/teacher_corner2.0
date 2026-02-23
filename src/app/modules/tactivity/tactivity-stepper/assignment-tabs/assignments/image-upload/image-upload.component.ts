import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { first, lastValueFrom, take } from 'rxjs';
import { serverTimestamp } from 'firebase/firestore';
import { arrayUnion } from 'firebase/firestore';
import { UiService } from 'app/shared/ui.service';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { MatDialog } from '@angular/material/dialog';
import { AssignmentDialogComponent } from 'app/modules/assignment-dialog/assignment-dialog.component';

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],

})
export class ImageUploadComponent implements OnInit {
  filename: any;
  @Input() assignmentData: any;
  @ViewChild('elementRef', { static: false })
  elementRef: ElementRef;
  storageBucket = 'unlab2';
  bytesTransferred;
  loader = false;
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
    const isValid = this.imageTypeAndSizeCheck(event.target.files[0]);
    if (isValid) {
      const bucketPath = `${this.storageBucket}/${studentInfo.id}-${studentInfo.classroomId}/assignments/${this.assignmentData.id}.` + this.filename.split('.').slice(-1).pop();
      const ref = this.afStore.ref(bucketPath);
      //putting the file into storage with custom metadata
      const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();

      await lastValueFrom(task).then((uploadedSnapshot) => {
        this.bytesTransferred = (uploadedSnapshot.bytesTransferred / uploadedSnapshot.totalBytes) * 100;
        if (uploadedSnapshot.state === 'success') {
          this.uiService.alertMessage('successful', 'The image files is uploaded successfully', 'success');
          this.loader = false;
        }
      });

      this.assignmentObj(bucketPath, studentInfo?.id, studentInfo?.classroomId);
    }


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

  imageTypeAndSizeCheck(event) {
    const allowedExtensions = /(\.jpeg|\.png|\.jpg)$/i;
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid file type', 'Only allowed .jpeg, .png, .jpg file types', 'warn');
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



  async onClickView() {
    // importing assignment - dialog.module
    await import('../../../../../assignment-dialog/assignment-dialog.module');

    // const studentInfo = this.teachersService.currentTeacher.value
    // this.assignmentsService.getResources(studentInfo.id, studentInfo.classroomId).pipe(take(1)).subscribe((res: any) => {
    //   const resourceData = res.data().resourceId[this.assignmentData.id]
    //   this.dialog.open(AssignmentDialogComponent, {
    //     data: resourceData
    //   })
    // })
  }


  // isModuleLoaded() {
  //   if (!window['assignment-dialog.module']) {
  //     window['assignment-dialog.module'] = [];
  //   }
  //   window['assignment-dialog.module'].push(this.constructor.name);
  //   console.log(window['assignment-dialog.module'])
  // }
}
