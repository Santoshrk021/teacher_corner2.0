import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from 'app/core/dbOperations/user/user.service';

@Component({
  selector: 'app-create-quiz-step',
  templateUrl: './create-quiz-step.component.html',
  styleUrls: ['./create-quiz-step.component.scss']
})
export class CreateQuizStepComponent implements OnInit {
  @Output() quizBasicInfo: EventEmitter<any> = new EventEmitter();
  @Input() quizInfo: any;
  statusList = ['LIVE', 'DEVELOPMENT'];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
  ) { }

  quizInfoForm = this.fb.group({
    displayName: ['', [Validators.required]],
    creator: ['', [Validators.required]],
    author: ['', [Validators.required]],
    authenticationType: ['', [Validators.required]],
    displayCorrectAnswers: [false, [Validators.required]],
    numberOfAllowedSubmissions: ['', [Validators.required]],
    totalDurationInHours: ['', [Validators.min(0), Validators.max(23)]],
    totalDurationInMinutes: ['', [Validators.min(0), Validators.max(59)]],
    totalDurationInSeconds: ['', [Validators.min(0), Validators.max(59)]],
    allowExitAndReEntry: [false, [Validators.required]],
    status: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.userService.user$.subscribe((res) => {
      // const name = res.hasOwnProperty('teacherMeta') ? res['teacherMeta']?.firstName + ' ' + res['teacherMeta']?.lastName : res.hasOwnProperty('name') ? res?.name : '';
      const name = res.hasOwnProperty('teacherMeta') ? res['teacherMeta']['firstName'] + ' ' + res['teacherMeta']['lastName'] : res.hasOwnProperty('name') ? res['name'] : '';
      this.quizInfoForm.get('creator').patchValue(name);
      this.quizInfoForm.get('creator').disable();

    });

    if (this.quizInfo) {
      this.patchFormValue(this.quizInfo);
    };
  }

  patchFormValue(quizInfo) {
    this.quizInfoForm.patchValue({
      displayName: quizInfo.displayName,
      creator: quizInfo.creator,
      author: quizInfo.author,
      authenticationType: quizInfo.authenticationType,
      status: quizInfo.status,
      displayCorrectAnswers: quizInfo.displayCorrectAnswers,
      numberOfAllowedSubmissions: quizInfo.numberOfAllowedSubmissions,
      totalDurationInHours: quizInfo.totalDurationInHours,
      totalDurationInMinutes: quizInfo.totalDurationInMinutes,
      totalDurationInSeconds: quizInfo.totalDurationInSeconds,
      allowExitAndReEntry: quizInfo.allowExitAndReEntry,
    });
  }

  onClickNext() {
      this.quizInfoForm.controls.creator.enable();
    this.quizBasicInfo.emit(this.quizInfoForm.value);
  }

  onFocusOutName(formControl: string) {
    const controlValue = this.quizInfoForm.get(formControl).value;
    const maxDuration = formControl === 'totalDurationInHours' ? 23 : 59;

    if (controlValue < 0 || controlValue > maxDuration) {
      this.quizInfoForm.get(formControl).reset();
    };
  }

  
}
