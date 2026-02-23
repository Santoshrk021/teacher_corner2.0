import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EventService } from 'app/core/dbOperations/events/event.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
@Component({
  selector: 'app-create-submission',
  templateUrl: './create-submission.component.html',
  styleUrls: ['./create-submission.component.scss']
})
export class CreateSubmissionComponent implements OnInit {
  storageBucket: string = 'events-images';
  filename: string = '';

  newSubmissionForm = this.fb.group({
    displayName: ['', Validators.required],
    imagePath: ['', Validators.required],
    submissionId: [this.getRandomId()],
  });
  loader: boolean = true;
  submissionInfo: any;
  constructor(
    private fb: FormBuilder,
    private uiService: UiService,
    private userService: UserService,
    private afStore: AngularFireStorage,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private eventService: EventService,
    public dialogRef: MatDialogRef<CreateSubmissionComponent>
  ) { }

  ngOnInit(): void {
    if(this.data.submissionId){
      const batchIndex = this.data.rawEvent.batches.findIndex(stage => stage.batchId == this.data.batchId);
      const submissionIndex= this.data.rawEvent.batches[batchIndex]['submissions'].findIndex(s=>s.submissionId==this.data.submissionId);
      this.submissionInfo=this.data.rawEvent.batches[batchIndex]['submissions'][submissionIndex];
      this.newSubmissionForm.patchValue({
        displayName: this.submissionInfo.displayName,
        imagePath: this.submissionInfo.imagePath,
        submissionId:this.data.submissionId,
      });
    }
  }
  onSubmit(form) {
    if(this.data.submissionId){
      this.submissionInfo.displayName=form.value.displayName;
      this.submissionInfo.imagePath=form.value.imagePath;
      this.eventService.addNewSubmission(this.data.eventId, this.data.rawEvent.batches).then(() => {
        this.uiService.alertMessage('Updated', `${form.value.displayName} has been Updated.`, 'success');
        this.dialogRef.close();
      }).catch((err) => {
        this.uiService.alertMessage('Oops', 'Please try again', 'error');
      });
      return;
    }
    const selectedBatchSubmissions = this.data.allSubmissions;
    selectedBatchSubmissions.push(form.value);
    const batchIndex = this.data.rawEvent.batches.findIndex(stage => stage.batchId == this.data.batchId);
    this.data.rawEvent.batches[batchIndex]['submissions'] = selectedBatchSubmissions;
    const updatedBatchesArr = this.data.rawEvent.batches;
    this.eventService.addNewSubmission(this.data.eventId, updatedBatchesArr).then(() => {
      this.uiService.alertMessage('Added', `${form.value.displayName} has been created.`, 'success');
      this.dialogRef.close();
    }).catch((err) => {
      this.uiService.alertMessage('Oops', 'Please try again', 'error');
    });
  }

  selectFile(event) {
    const check = this.fileTypeAndSizeCheck(event.target.files[0]);
    this.filename = event.target.files[0].name;
    this.loader = true;
    if (check) {
      this.loader = true;
      const bucketPath = `${this.storageBucket}/${this.userService.getRandomId()}` + '.' + this.filename.split('.').slice(-1).pop();
      const ref = this.afStore.ref(bucketPath);
      const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();
      task.subscribe(async (uploadedSnapshot) => {
        // let bytesTransferred = Math.round((uploadedSnapshot.bytesTransferred * 100) / uploadedSnapshot.totalBytes);
        if (uploadedSnapshot.state === 'success') {
          this.loader = false;
          this.newSubmissionForm.patchValue({
            imagePath: bucketPath,
          });
        }
      });
    }
  }

  fileTypeAndSizeCheck(event) {
    const allowedExtensions = /(\.png|\.jpeg|\.jpg)$/i;
    let isValid = false;
    if (!allowedExtensions.exec(event.name)) {
      this.uiService.alertMessage(
        'Invalid File Type',
        'Only allowed PNG or JPEG file',
        'warn'
      );
      isValid = false;
    } else if (event.size > 10485760) {
      /* Max Image File size 10MB */
      this.uiService.alertMessage(
        'File Size Exceeds',
        'Maximum file size should be 10MB',
        'warn'
      );
      isValid = false;
    } else {
      isValid = true;
    }
    return isValid;
  }
  getRandomId(): string {
    return this.userService.getRandomId();
  }


}
