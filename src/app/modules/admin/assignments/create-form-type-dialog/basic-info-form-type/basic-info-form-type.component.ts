import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { first, lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-basic-info-form-type',
  templateUrl: './basic-info-form-type.component.html',
  styleUrls: ['./basic-info-form-type.component.scss']
})
export class BasicInfoFormTypeComponent implements OnInit {
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
    status: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    this.userService.user$.subscribe((res) => {
      const name = res.hasOwnProperty('teacherMeta') ? res['teacherMeta']['firstName'] + ' ' + res['teacherMeta']['lastName'] : res.hasOwnProperty('name') ? res['name'] : '';
      this.assignmentInfoForm.get('creator').patchValue(name);
      this.assignmentInfoForm.get('creator').disable();
    });
    if (this.assignmentInfo) {
      // this.patchFormValue(this.assignmentInfo);
      this.assignmentInfoForm.patchValue(this.assignmentInfo);
    };
  }

  onClickNext() {
    this.assignmentInfoForm.controls.creator.enable();
    this.assignmentBasicInfo.emit(this.assignmentInfoForm.value);
  }

}
