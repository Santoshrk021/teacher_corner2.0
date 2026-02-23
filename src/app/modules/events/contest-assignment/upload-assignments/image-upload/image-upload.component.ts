import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { StudentsService } from 'app/core/dbOperations/students/students.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { AssignmentDialogComponent } from 'app/modules/assignment-dialog/assignment-dialog.component';
import { DeviceInfoService } from 'app/shared/deviceInfoService';
import { SharedService } from 'app/shared/shared.service';
import { UiService } from 'app/shared/ui.service';
import { environment } from 'environments/environment';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';
import { first, lastValueFrom, take } from 'rxjs';

@Component({
  selector: 'app-image-upload',
  templateUrl: './image-upload.component.html',
  styleUrls: ['./image-upload.component.scss'],

})
export class ImageUploadComponent implements OnInit, AfterViewInit {
  filename: any;
  @Input() assignmentData: any;
  @Input() currentWorkflow: any;
  @Input() workflowId: any;
  @Input() asgnId: any;
  @ViewChild('elementRef', { static: false })
  elementRef: ElementRef;
  storageBucket = 'event_submissions';
  bytesTransferred;
  loader = false;
  params: any;
  storedFilePath: string = '';
  teacherId: any;
  isFinalSubmission = false;
  description;

  isActive = false;
  constructor(
    private afStore: AngularFireStorage,
    private uiService: UiService,
    private deviceInfoService: DeviceInfoService,
    private route: ActivatedRoute,
    private userService: UserService,
    private assignmentService: AssignmentsService,
    private sharedService: SharedService,
    private teacherService: TeacherService
  ) { }

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe((res: any) => {
      this.params = res.params;
    });

    this.teacherId = await this.userService.getUid();
    this.checkResourcePath();

  }

  ngAfterViewInit(): void {

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

  async upload(event) {
    this.loader = true;
    this.filename = event.target.files[0].name;
    const isValid = this.imageTypeAndSizeCheck(event.target.files[0]);
    if (isValid) {
      const bucketPath = `${this.storageBucket}/${this.params.eventId}/${this.params.workflowId}/${this.teacherId}-${this.params.eventId}/${this.asgnId}_${this.assignmentData.submissionId}.` + this.filename.split('.').slice(-1).pop();
      console.log(bucketPath, 'from image upload');
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
      this.assignmentObj(bucketPath);
    }
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
    this.storedFilePath = bucketPath;
  }

  imageTypeAndSizeCheck(event) {
    const allowedExtensions = /(\.jpeg|\.png|\.jpg)$/i;
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage('Invalid file type', 'Only allowed .jpeg, .png, .jpg file types', 'warn');
      this.elementRef.nativeElement.value = '';
      this.filename = '';
      isValid = false;
      this.loader = false;
    }
    else if (event.size > 3145728) {
      this.uiService.alertMessage('Invalid file type', 'maximum image size should be 3mb', 'warn');
      this.elementRef.nativeElement.value = '';
      this.filename = '';
      isValid = false;
      this.loader = false;

    }
    else {
      isValid = true;
    }
    return isValid;
  }


  async onClickView() {
    // importing assignment - dialog.module
    // await import('../../../../../assignment-dialog/assignment-dialog.module')

    // this.assignmentsService.getResources(this.params).pipe(take(1)).subscribe((res: any) => {
    //   const resourceData = res.data()[this.workflowId][this.assignmentData?.submissionId]
    //   this.dialog.open(AssignmentDialogComponent, {
    //     data: resourceData
    //   })
    // })
  }
  /*  @ViewChild('image') imageRef;
   download() {
     // Create a reference to the file we want to download
     const storage = getStorage();

     return this.assignmentsService.getResources(this.params).pipe(take(1)).subscribe(async (res: any) => {
       const resourceData = res.data()[this.workflowId][this.assignmentData?.submissionId]
       const url = resourceData.submissionPath;
       console.log(url);
       const starsRef = ref(storage, `${url}`);
       console.log(starsRef);
       const downloadUrl: any = await this.downloadFromRef(starsRef);
       console.log(downloadUrl);

       //  return window.open(downloadUrl,"_blank",);

       return downloadUrl
     })
   }
   downloadFromRef(starsRef) {
     // Get the download URL
     return getDownloadURL(starsRef)
       .then((url) => {
         console.log(url);
         return url
         // Insert url into an <img> tag to "download"
       })
       .catch((error) => {
         // A full list of error codes is available at
         // https://firebase.google.com/docs/storage/web/handle-errors
         switch (error.code) {
           case 'storage/object-not-found':
             // File doesn't exist
             break;
           case 'storage/unauthorized':
             // User doesn't have permission to access the object
             break;
           case 'storage/canceled':
             // User canceled the upload
             break;

           // ...

           case 'storage/unknown':
             // Unknown error occurred, inspect the server response
             break;
         }
       });
   } */
  // isModuleLoaded() {
  //   if (!window['assignment-dialog.module']) {
  //     window['assignment-dialog.module'] = [];
  //   }
  //   window['assignment-dialog.module'].push(this.constructor.name);
  //   console.log(window['assignment-dialog.module'])
  // }


  des(event) {
    if (event.length) {
      this.isActive = true;
    }
    else {
      this.isActive = false;
    }

  }

  async onSave() {
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
          ['assignmentId-description']: {
            text: this.description
          }
        }
      },
      submissionMeta: arrayUnion(d)
    };

    this.assignmentService.updateEventSubmission(this.params.eventId, this.teacherId, obj).then(async () => {
      this.saveFlagInTeacherDoc();
      this.uiService.alertMessage('successful', 'Description saved successfully', 'success');
      await this.whatsappNotification();
    });
    this.isActive = false;
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
  async whatsappNotification() {
    const tDoc: any = await this.teacherService.getDocDataById(this.teacherId);
    const name = tDoc.teacherMeta.firstName + ' ' + tDoc.teacherMeta.lastName;
    const phone = tDoc.teacherMeta.phone;
    const templateName = environment.whatsAppTemplates.eventSubmissionConfirmation.templateName;
    const headerImage = environment.whatsAppTemplates.eventSubmissionConfirmation.headerImage;
    const mediaType = 'image';
    const params = [
      name,
    ];
    const urlRoute = undefined;

    this.sharedService.sendWhatsAppNotification(phone, templateName, params, headerImage, mediaType, urlRoute);
  }
}
