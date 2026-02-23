import { AngularFireStorage } from '@angular/fire/compat/storage';
import {
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
import moment from 'moment';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';

export const MY_FORMATS = {
    parse: {
        dateInput: 'DD/MM/YYYY',
    },
    display: {
        dateInput: 'DD/MM/YYYY', // this is how your date will get displayed on the Input
        monthYearLabel: 'MMMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY'
    },
};

@Component({
    selector: 'app-basic-info-contest',
    templateUrl: './basic-info-contest.component.html',
    styleUrls: ['./basic-info-contest.component.scss'],
    providers: [
        // `MomentDateAdapter` can be automatically provided by importing `MomentDateModule` in your
        // application's root module. We provide it at the component level here, due to limitations of
        // our example generation script.
        {
            provide: DateAdapter,
            useClass: MomentDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
        },
        { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    ],
})
export class BasicInfoContestComponent implements OnInit {
    @ViewChild('logoFileInputRef', { static: false }) logoFileInputRef?: ElementRef;
    @Output() contestBasicInfo: EventEmitter<any> = new EventEmitter();
    @Output() isClassorStemClubDependentEvent = new EventEmitter<any>(false);
    @Input() contestInfo;
    @Input() isUpdate;
    filename: any;
    contestTypes = [
        { value: 'Classroom or STEMClub Dependent', key: 'classroomStemClubdependent' },
        { value: 'General', key: 'general' }
    ];
    loader: boolean = false;
    storageBucket = 'contests-images';
    domainUrl = 'https://unlab.thinktac.com';
    subcriptionRef;

    constructor(
        private fb: FormBuilder,
        private uiService: UiService,
        private userService: UserService,
        private afStore: AngularFireStorage,
        private contestService: ContestService,
    ) { }

    basicInfoForm = this.fb.group<any>({
        contestTitle: ['', [Validators.required]],
        contestSubtitle: ['', [Validators.required]],
        contestDescription: ['', [Validators.required]],
        contestType: ['CONTEST', [Validators.required]],
        participantType: ['', [Validators.required]],
        contestLogosPathArr: this.fb.array([]),
        domain: [{ value: this.domainUrl, disabled: true }, [Validators.required]],
        contestEndUrl: ['', [Validators.required]],
        contestUrlLink: ['', [Validators.required, this.websiteUrlValidator()]],
        contestawardScheduleUrl: ['', [Validators.required, this.websiteUrlValidator()]],
        contestsenderName: ['', [Validators.required]], 
        contestFullUrl: ['', [Validators.required]],
        creatorName: ['', [Validators.required]],
        contestStartDate: ['', [Validators.required]],
        contestEndDate: ['', [Validators.required]],
        RegistrationStartdate: ['', [Validators.required]],
        RegistrationEnddate: ['', [Validators.required]],
        type: ['', [Validators.required]],
        isContestStepsLocked: [false, [Validators.required]],
        isContestSubmissionImageNeedsToBeBlurred: [false, [Validators.required]],
        isRysiPartnerContest: [false, [Validators.required]],
    });

    ngOnInit(): void {
        if (this.contestInfo) {
            this.patchFormValue(this.contestInfo);
        } else {
            this.addNewLogo();
            this.subcriptionRef = this.userService.user$.subscribe((res) => {
                this.basicInfoForm.patchValue({
                    creatorName: `${res?.['teacherMeta']?.['firstName'] || ''} ${res?.['teacherMeta']?.['lastName'] || ''} `,
                });
            });
        }
        this.basicInfoForm.get('creatorName').disable();
        if (!this.isUpdate) {
            this.basicInfoForm.get('type').setValue('general');
        }
        this.basicInfoForm.get('contestEndUrl').valueChanges.subscribe((v) => {
            this.basicInfoForm.patchValue({
                contestFullUrl: `${this.domainUrl}/${v.toString().trim()}`
            });
        });
        if (this.basicInfoForm.get('type').value == 'classroomStemClubdependent') {
            this.isClassorStemClubDependentEvent.emit(true);
        }
        this.basicInfoForm.get('type').valueChanges.subscribe((v) => {
            if (v == 'classroomStemClubdependent') {
                this.isClassorStemClubDependentEvent.emit(true);
            } else {
                this.isClassorStemClubDependentEvent.emit(false);
            }
        });
        //  this.isClassorStemClubDependentEvent.emit(true)
    }

    patchFormValue(contest) {
        console.log("contest", contest);
        this.basicInfoForm.patchValue({
            contestTitle: contest.contestTitle,
            contestSubtitle: contest.contestSubtitle,
            contestDescription: contest.contestDescription,
            contestType: contest.contestType,
            participantType: contest.participantType,
            creatorName: contest.creatorName,
            type: contest.type,
            domain: contest?.domain || this.domainUrl,
            contestEndUrl: contest.contestEndUrl || '', 
            contestawardScheduleUrl: contest.awardScheduleUrl || '',
            contestsenderName: contest.senderName || '',
            contestUrlLink: contest.urlLink || '',
            contestFullUrl: contest?.contestFullUrl || '',
            contestStartDate: contest?.contestStartDate?.seconds ? moment(contest?.contestStartDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'),
            contestEndDate: contest?.contestEndDate?.seconds ? moment(contest?.contestEndDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'),
            RegistrationStartdate: contest?.RegistrationStartdate?.seconds ? moment(contest?.RegistrationStartdate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'),
            RegistrationEnddate: contest?.RegistrationEnddate?.seconds ? moment(contest?.RegistrationEnddate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'),
            isContestStepsLocked: contest?.isContestStepsLocked || false,
            isContestSubmissionImageNeedsToBeBlurred: contest?.isContestSubmissionImageNeedsToBeBlurred || false,
            isRysiPartnerContest: contest?.isRysiPartnerContest || false,
        });

        contest.contestLogosPath.map((logo) => {
            const logoFormArr = (this.basicInfoForm.get('contestLogosPathArr') as FormArray);
            logoFormArr.push(this.getLogoFormGroup(logo));
        });
    }

    setContestSubmissionImageBlurred(event) {
        this.basicInfoForm.patchValue({
            isContestSubmissionImageNeedsToBeBlurred: event.checked
        });
    }

    setRysiPartnerContest(event){
        this.basicInfoForm.patchValue({
            isRysiPartnerContest: event.checked
        })
    }

    onClickNext() {
        const docId = this.contestService.getRandomId();
        const data = this.basicInfoForm.getRawValue();
        data['docId'] = this.isUpdate === false ? docId : this.contestInfo.docId;
        this.contestBasicInfo.emit(data);
    }

    getLogoFormGroup(logo?): FormGroup {
        return this.fb.group({
            contestLogoPath: [logo != undefined ? logo : '', [Validators.required]],
            fileName: '',
            loader: false
        });
    }

    addNewLogo() {
        const logoFormArr = (this.basicInfoForm.get('contestLogosPathArr') as FormArray);
        if (logoFormArr.length >= 3) {
            this.uiService.alertMessage('Upload Upto 3 Logos', 'Not allowed More than 3 Logos', 'warn');
            return;
        }
        logoFormArr.push(this.getLogoFormGroup());
    }

    selectFile(event, index) {
        const check = this.fileTypeAndSizeCheck(event.target.files[0]);
        this.filename = event.target.files[0].name;
        const logoFormGroup = ((this.basicInfoForm.get('contestLogosPathArr') as FormArray).at(index) as FormGroup);
        logoFormGroup.patchValue({
            fileName: event.target.files[0].name,
            loader: true
        });
        if (check) {
            this.loader = true;
            const bucketPath: any = logoFormGroup.get('contestLogoPath').value != '' ?
                logoFormGroup.get('contestLogoPath').value :
                `${this.storageBucket}/${this.userService.getRandomId()}` + '.' + this.filename.split('.').slice(-1).pop();
            const ref = this.afStore.ref(bucketPath);
            const task = ref.put(event.target.files[0], { customMetadata: { original_name: this.filename } }).snapshotChanges();
            task.subscribe(async (uploadedSnapshot) => {
                if (uploadedSnapshot.state === 'success') {
                    this.loader = false;
                    logoFormGroup.patchValue({
                        contestLogoPath: bucketPath,
                        loader: false
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

    OnDestroy() {
        if (this.subcriptionRef) {
            this.subcriptionRef.unsubcribe();
        }
    }

    setContestStepsLocked(event) {
        // this.isClassorStemClubDependentEvent.emit(event.checked)
        this.basicInfoForm.patchValue({
            isContestStepsLocked: event.checked
        });
    }

    classorStemClubDependent(event) {
        this.isClassorStemClubDependentEvent.emit(event.checked);
    }
    // import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

  websiteUrlValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (!control.value) return null; // let required handle empty case

    // must start with "www.", then any text, end with ".com" and allow optional paths
    // const pattern = /^www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/;
    const pattern = /^(http:\/\/)?(https:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/;
    return pattern.test(control.value) ? null : { invalidWebsiteUrl: true };
  };
}

// import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

//   websiteUrlValidator1(): ValidatorFn {
//   return (control: AbstractControl): ValidationErrors | null => {
//     if (!control.value) return null; // skip, required will handle empty
//     // start with https://www., then text, then a TLD (org, com, net, in, etc.), and optional path
//     const pattern = /^(https:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/;
//     return pattern.test(control.value) ? null : { invalidWebsiteUrl: true };
//   };
// }



}
