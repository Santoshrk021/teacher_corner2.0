import { Component, Input, OnInit } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-duration-input',
  templateUrl: './duration-input.component.html',
  styleUrls: ['./duration-input.component.scss']
})
export class DurationInputComponent implements OnInit {
  @Input() i: number;
  @Input() questionsFormArray: FormArray;
  @Input() questionsFormGroup: FormGroup;
  @Input() quizInfo: any;
  indexFormGroup: FormGroup;

  constructor() { }

  ngOnInit(): void {
    this.indexFormGroup = this.questionsFormArray.controls.at(this.i) as FormGroup;

    // duration for total quiz
    const { totalDurationInHours, totalDurationInMinutes, totalDurationInSeconds } = this.quizInfo;
    // duration for each question
    const quizDuration = this.quizInfo?.questionsData?.[this.i];
    const { durationInHours = 0, durationInMinutes = 0, durationInSeconds = 0 } = quizDuration || {};

    // if duration is provided in the database, patch it to the form
    if (quizDuration && (!!durationInHours || !!durationInMinutes || !!durationInSeconds)) {
      this.indexFormGroup.patchValue({
        durationInHours: durationInHours ?? 0,
        durationInMinutes: durationInMinutes ?? 0,
        durationInSeconds: durationInSeconds ?? 0
      });
    } else {
      // set the total duration as default for the first question
      if (this.i === 0) {
        this.indexFormGroup.patchValue({
          durationInHours: totalDurationInHours ?? 0,
          durationInMinutes: totalDurationInMinutes ?? 0,
          durationInSeconds: totalDurationInSeconds ?? 0,
        });
      } else {
        // for subsequent questions, calculate the remaining duration
        const remainingDurationInHours = totalDurationInHours - this.questionsFormArray.controls.slice(0, this.i).reduce((acc, control) => acc + (control.get('durationInHours').value || 0), 0);
        const remainingDurationInMinutes = totalDurationInMinutes - this.questionsFormArray.controls.slice(0, this.i).reduce((acc, control) => acc + (control.get('durationInMinutes').value || 0), 0);
        const remainingDurationInSeconds = totalDurationInSeconds - this.questionsFormArray.controls.slice(0, this.i).reduce((acc, control) => acc + (control.get('durationInSeconds').value || 0), 0);

        this.indexFormGroup.patchValue({
          durationInHours: remainingDurationInHours,
          durationInMinutes: remainingDurationInMinutes,
          durationInSeconds: remainingDurationInSeconds,
        });
      }
    }
  }

  timeValidation(formControl: string) {
    const { totalDurationInHours, totalDurationInMinutes, totalDurationInSeconds } = this.quizInfo;
    const calculatedTotalDuration = totalDurationInHours * 3600 + totalDurationInMinutes * 60 + totalDurationInSeconds;

    let remainingTime = calculatedTotalDuration;
    const arrayDuration = this.questionsFormArray.controls.slice(0, this.i + 1).map(control => ({
      hours: control.get('durationInHours').value,
      minutes: control.get('durationInMinutes').value,
      seconds: control.get('durationInSeconds').value
    }));

    for (const item of arrayDuration) {
      remainingTime -= item.hours * 3600 + item.minutes * 60 + item.seconds;
    };

    let newValue: number;

    switch (formControl) {
      case 'durationInHours':
        newValue = Math.max(Math.floor(remainingTime / 3600), 0);
        break;
      case 'durationInMinutes':
        newValue = Math.max(Math.floor((remainingTime % 3600) / 60), 0);
        break;
      case 'durationInSeconds':
        newValue = Math.max(remainingTime % 60, 0);
        break;
      default:
        newValue = 0;
    };

    if (this.questionsFormArray.controls.length - 1 >= this.i + 1 && newValue !== undefined) {
      this.questionsFormArray.controls[this.i + 1].get(formControl).patchValue(newValue);
    };
  }


}
