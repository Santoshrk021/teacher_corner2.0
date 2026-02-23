import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from 'app/core/dbOperations/user/user.service';

@Component({
  selector: 'app-basic-info-upload-type',
  templateUrl: './basic-info-upload-type.component.html',
  styleUrls: ['./basic-info-upload-type.component.scss']
})
export class BasicInfoUploadTypeComponent implements OnInit {
  @Output() assignmentBasicInfo: EventEmitter<any> = new EventEmitter();
  @Input() assignmentInfo: any;
  statusList = ['LIVE', 'DEVELOPMENT'];
  tooltipMessage: string = '';

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
  ) { }

  assignmentInfoForm = this.fb.group({
    displayName: ['', [Validators.required]],
    creator: ['', [Validators.required]],
    author: ['', [Validators.required]],
    numberOfAllowedSubmissions: ['', [Validators.required]],
    status: ['', [Validators.required]],
    duration: [''],
    totalDurationInHours: [0, [Validators.min(0), Validators.max(23)]],
    totalDurationInMinutes: [0, [Validators.min(0), Validators.max(59)]],
    totalDurationInSeconds: [0, [Validators.min(0), Validators.max(59)]],
  });

  ngOnInit(): void {
    // this.userService.getUserInfo();
    this.userService.user$.subscribe((res) => {
      const name = res.hasOwnProperty('teacherMeta') ? res['teacherMeta'].firstName +  ' ' + res['teacherMeta'].lastName : res.hasOwnProperty('name') ? res.name : '';
      this.assignmentInfoForm.get('creator').patchValue(name);
      this.assignmentInfoForm.get('creator').disable();
    });
    if (this.assignmentInfo) {
      this.patchFormValue(this.assignmentInfo);
    };
    this.assignmentInfoForm.valueChanges.subscribe((res) => {
      const { totalDurationInHours, totalDurationInMinutes, totalDurationInSeconds } = res;
      const totalCalculatedDuration = totalDurationInHours * 3600 + totalDurationInMinutes * 60 + totalDurationInSeconds;
      if (totalCalculatedDuration <= 0) {
        this.assignmentInfoForm.setErrors({ incorrect: true });
        this.tooltipMessage = 'Kindly set the duration more than 0 seconds';
      } else {
        this.tooltipMessage = '';
      };
    });
  }

  onClickNext() {
    this.assignmentBasicInfo.emit(this.assignmentInfoForm.getRawValue());
  }

  patchFormValue(info) {
    this.assignmentInfoForm.patchValue({
      displayName: info?.displayName,
      creator: info?.creator,
      author: info?.author,
      numberOfAllowedSubmissions: info?.numberOfAllowedSubmissions,
      status: info?.status,
      totalDurationInHours: info?.totalDurationInHours,
      totalDurationInMinutes: info?.totalDurationInMinutes,
      totalDurationInSeconds: info?.totalDurationInSeconds,
    });
  }

  onFocusOutName(formControl: string) {
    const controlValue = this.assignmentInfoForm.get(formControl).value;
    const maxDuration = formControl === 'totalDurationInHours' ? 23 : 59;

    if (controlValue < 0 || controlValue > maxDuration) {
      this.assignmentInfoForm.get(formControl).reset();
    };
  }

}
