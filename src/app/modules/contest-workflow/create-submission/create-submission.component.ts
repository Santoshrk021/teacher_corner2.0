import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
@Component({
  selector: 'app-create-submission',
  templateUrl: './create-submission.component.html',
  styleUrls: ['./create-submission.component.scss']
})
export class CreateSubmissionComponent implements OnInit {
  storageBucket: string = 'contests-images';
  filename: string = '';
  luType = [
    { name: 'TACtivity', code: 'TAC' },
    { name: 'Keep @ Home', code: 'KAH' },
    { name: 'Multiuse TACtivity', code: 'MUT' },
    { name: 'Multiuse TACtivity @ Home', code: 'MAH' },
    { name: 'NISTA (FLN) TAC', code: 'NAC' },
    { name: 'Group Activity', code: 'GRO' },
    { name: 'Online Games', code: 'ONG' },
    { name: 'CBE Theme', code: 'CBE' },
    { name: 'Toys and Tales', code: 'TAT' },
  ];
  newSubmissionForm = this.fb.group({
    displayName: ['', Validators.required],
    description: ['', Validators.required],
    type: ['TACtivity', Validators.required],
    imagePath: ['', Validators.required],
    submissionId: [this.getRandomId()],
  });
  loader: boolean = true;
  constructor(
    private fb: FormBuilder,
    private uiService: UiService,
    private userService: UserService,
    private afStore: AngularFireStorage,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private contestService: ContestService,
    public dialogRef: MatDialogRef<CreateSubmissionComponent>
  ) { }

  ngOnInit(): void {
  }
  onSubmit(form) {
    const selectedStageSubmissions = this.data.allSubmissions;
    selectedStageSubmissions.push(form.value);
    const stageIndex = this.data.rawContest.stagesNames.findIndex(stage => stage.stageId == this.data.stageId);
    this.data.rawContest.stagesNames[stageIndex]['submissions'] = selectedStageSubmissions;
    const updatedStagesArr = this.data.rawContest.stagesNames;
    this.contestService.addNewSubmission(this.data.contestId, updatedStagesArr).then(() => {
      this.uiService.alertMessage('Added', `${form.value.displayName} has been created.`, 'success');
      this.dialogRef.close('success');
    }).catch((err) => {
      this.uiService.alertMessage('Oops', 'Please try again', 'error');
    });
    // this.dialogRef.close();
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
    return this.contestService.getRandomId();
  }
}
