import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatStepper } from '@angular/material/stepper';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-upload-type',
  templateUrl: './create-upload-type.component.html',
  styleUrls: ['./create-upload-type.component.scss']
})
export class CreateUploadTypeComponent implements OnInit {
  @Output() qusInfo: EventEmitter<any> = new EventEmitter();
  @ViewChild('stepper') private myStepper: MatStepper;
  @Input() assignmentInfo: any;
  @Input() basicInfo: any;
  assignmentsFormGroup: FormGroup;
  totalCalculatedDuration: number = 0;
  tooltipMessage: string = '';
  assignmentTypes: any;

  constructor(
    private fb: FormBuilder,
    private uiService: UiService,
    private configurationService: ConfigurationService,
  ) { }

  async ngOnInit(): Promise<void> {
    const acceptedFormats = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('acceptedUploadFormats'));
    this.assignmentTypes = acceptedFormats.get('formatNames');

    this.assignmentsFormGroup = this.fb.group({
      assignments: this.fb.array([]),
    });

    if (this.assignmentInfo) {
      this.loadExistingQustions(this.assignmentInfo?.assignments);
    }
    else {
      // create a prefilled form for first step
      const formData = {
        instructions: 'Please upload  image/images of your completed activity',
        maxFileSize: '5',
        submissionId: '',
        title: 'Upload the image/images of completed activity',
        uploadFileType: 'IMAGE',
        resourcePath: '',
        durationInHours: -this.basicInfo.totalDurationInHours,
        durationInMinutes: -this.basicInfo.totalDurationInMinutes,
        durationInSeconds: -this.basicInfo.totalDurationInSeconds,
      };
      this.addAssignment(formData, 0);
    };

    this.validateDuration(0);
  }

  onChange(event: StepperSelectionEvent) {
    const currentIndex = event.selectedIndex;

    // Calculate total previous step time
    const formArray = this.assignmentsFormGroup?.get('assignments') as FormArray;
    const totalPreviousTime = formArray.controls
      .slice(0, currentIndex)
      .map(control => ({
        hours: control.get('durationInHours').value || 0,
        minutes: control.get('durationInMinutes').value || 0,
        seconds: control.get('durationInSeconds').value || 0
      }))
      .reduce((acc, curr) => ({
        hours: acc.hours + curr.hours,
        minutes: acc.minutes + curr.minutes,
        seconds: acc.seconds + curr.seconds
      }), { hours: 0, minutes: 0, seconds: 0 });

    // Calculate remaining time for current step
    const { totalDurationInSeconds, totalDurationInMinutes, totalDurationInHours } = this.assignmentInfo ?? this.basicInfo;
    const remainingTimeInSeconds = totalDurationInSeconds - totalPreviousTime.seconds;
    const remainingTimeInMinutes = totalDurationInMinutes - totalPreviousTime.minutes - Math.floor(remainingTimeInSeconds / 60);
    const remainingTimeInHours = totalDurationInHours - totalPreviousTime.hours - Math.floor(remainingTimeInMinutes / 60);

    // Set remaining step time
    const currentFormGroup = formArray.at(currentIndex);
    currentFormGroup.get('durationInHours')?.setValue(remainingTimeInHours);
    currentFormGroup.get('durationInMinutes')?.setValue(remainingTimeInMinutes % 60);
    currentFormGroup.get('durationInSeconds')?.setValue(remainingTimeInSeconds % 60);

    // on second step onwards, add a drop down for the step to add dependence on previous step(s)
    if (currentIndex > 0 && this.assignmentInfo !== undefined) {
      const dependentOnStepNumbers = this.assignmentInfo?.assignments?.at(currentIndex)?.dependentOnStepNumbers || '';
      const currentAssignment = this.assignments.at(currentIndex) as FormGroup;
      currentAssignment.addControl('dependentOnStepNumbers', new FormControl(dependentOnStepNumbers));
    };

    this.validateDuration(event.selectedIndex);
  }

  loadExistingQustions(qustionArr = []) {
    qustionArr.forEach((qus, index) => {
      console.error(index);
      this.addAssignment(qus, index);
    });
  }

  get assignments() {
    return this.assignmentsFormGroup?.get('assignments') as FormArray;
  }

  newAssignment(demoQus?: any, index?: number) {
    const remainingTimeInHours = (this.assignmentInfo?.totalDurationInHours ?? 0) - (demoQus?.durationInHours ?? 0);
    const remainingTimeInMinutes = (this.assignmentInfo?.totalDurationInMinutes ?? 0) - (demoQus?.durationInMinutes ?? 0);
    const remainingTimeInSeconds = (this.assignmentInfo?.totalDurationInSeconds ?? 0) - (demoQus?.durationInSeconds ?? 0);
    const form = this.fb.group({
      // dueDate: [demoQus?.dueDate?.seconds ? moment(demoQus?.dueDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
      instructions: [demoQus?.instructions || '', Validators.required],
      maxFileSize: [demoQus?.maxFileSize || '', Validators.required],
      submissionId: [demoQus?.submissionId || ''],
      title: [demoQus?.title || 'Upload the image/images of completed activity', Validators.required],
      uploadFileType: [demoQus?.uploadFileType || '', Validators.required],
      resourcePath: [demoQus?.resourcePath || ''],
      durationInHours: [remainingTimeInHours],
      durationInMinutes: [remainingTimeInMinutes],
      durationInSeconds: [remainingTimeInSeconds],
      dependentOnStepNumbers: [''],
      maxNoOfUploads: [demoQus?.maxNoOfUploads || '1', Validators.required],
    });

    if(index <= 0) {
      form.removeControl('dependentOnStepNumbers');
    }

    return form;
  }

  addAssignment(demoQus?: any, index?: number) {
    if(!demoQus) {
      index = this.assignments.length;
    }
    this.assignments.push(this.newAssignment(demoQus, index));

    if (!demoQus) {
      setTimeout(() => {
        this.myStepper.selectedIndex = this.assignments.length - 1;
      }, 0);
    }
  }

  removeAssignment(Index: number) {
    this.assignments.removeAt(Index);
    this.uiService.alertMessage('Removed', `Assignment at Step ${Index + 1} removed`, 'warn');
  }

  onClickNext() {
    const form = this.assignmentsFormGroup.value.assignments;
    let count = 0;
    const assignments = form.map((a) => {
      count++;
      return {
        ...a,
        submissionId: count,
        // dueDate: new Date(a.dueDate)
      };
    });
    this.qusInfo.emit({ assignments });
  }

  /*
  // old code
  timeValidation(formControl: string, index: number) {
    const formGroup = (this.assignmentsFormGroup.get('assignments') as FormArray).at(index);
    const timeInHours = formGroup.get('durationInHours').value;
    const timeInMinutes = formGroup.get('durationInMinutes').value;
    const timeInSeconds = formGroup.get('durationInSeconds').value;
    const calculatedTimeInSeconds = (timeInHours * 60 * 60) + (timeInMinutes * 60) + timeInSeconds;

    const {totalDurationInSeconds, totalDurationInMinutes, totalDurationInHours} = this.assignmentInfo;
    const totalTimeCalculatedInSeconds = totalDurationInSeconds + (totalDurationInMinutes * 60) + (totalDurationInHours * 60 * 60);

    if(calculatedTimeInSeconds > totalTimeCalculatedInSeconds) {
      if(formControl === 'durationInHours') {
        if(this.previousTimeInHours !== 0) {
          formGroup.get(formControl).setValue(this.previousTimeInHours);
        } else {
          formGroup.get(formControl).setValue(totalDurationInHours);
        };
      } else if(formControl === 'durationInMinutes') {
        if(this.previousTimeInMinutes !== 0) {
          formGroup.get(formControl).setValue(this.previousTimeInMinutes);
        } else {
          formGroup.get(formControl).setValue(totalDurationInMinutes);
        };
      } else if(formControl === 'durationInSeconds') {
        if(this.previousTimeInSeconds !== 0) {
          formGroup.get(formControl).setValue(this.previousTimeInSeconds);
        } else {
          formGroup.get(formControl).setValue(totalDurationInSeconds);
        };
      };
    } else {
      if(formControl === 'durationInHours') {
        this.previousTimeInHours = timeInHours;
      } else if(formControl === 'durationInMinutes') {
        this.previousTimeInMinutes = timeInMinutes;
      } else if(formControl === 'durationInSeconds') {
        this.previousTimeInSeconds = timeInSeconds;
      };
    };
  }
  */

  timeValidation(formControl: string, index: number) {
    const formGroup = (this.assignmentsFormGroup.get('assignments') as FormArray).at(index);
    const timeInHours = formGroup.get('durationInHours').value;
    const timeInMinutes = formGroup.get('durationInMinutes').value;
    const timeInSeconds = formGroup.get('durationInSeconds').value;
    const calculatedTimeInSeconds = (timeInHours * 60 * 60) + (timeInMinutes * 60) + timeInSeconds;

    const { totalDurationInSeconds, totalDurationInMinutes, totalDurationInHours } = this.assignmentInfo ?? this.basicInfo;
    const totalTimeCalculatedInSeconds = totalDurationInSeconds + (totalDurationInMinutes * 60) + (totalDurationInHours * 60 * 60);

    let newValue: number = 0;

    switch (formControl) {
      case 'durationInHours':
        newValue = calculatedTimeInSeconds > totalTimeCalculatedInSeconds ? totalDurationInHours : timeInHours;
        formGroup.get(formControl).setValue(newValue);
        break;

      case 'durationInMinutes':
        newValue = calculatedTimeInSeconds > totalTimeCalculatedInSeconds ? totalDurationInMinutes : timeInMinutes;
        formGroup.get(formControl).setValue(newValue);
        break;

      case 'durationInSeconds':
        newValue = calculatedTimeInSeconds > totalTimeCalculatedInSeconds ? totalDurationInSeconds : timeInSeconds;
        formGroup.get(formControl).setValue(newValue);
        break;

      default:
        break;
    }
  }

  validateDuration(index: number) {
    (this.assignmentsFormGroup.get('assignments') as FormArray).at(index).valueChanges.subscribe((res) => {
      const { durationInHours, durationInMinutes, durationInSeconds } = res;
      this.totalCalculatedDuration = durationInHours * 3600 + durationInMinutes * 60 + durationInSeconds;
      if(this.totalCalculatedDuration <= 0) {
        (this.assignmentsFormGroup.get('assignments') as FormArray).at(index).setErrors({incorrect: true});
        this.tooltipMessage = 'Kindly set the duration more than 0 seconds';
      } else {
        this.tooltipMessage = '';
      };
    });
  }

}
