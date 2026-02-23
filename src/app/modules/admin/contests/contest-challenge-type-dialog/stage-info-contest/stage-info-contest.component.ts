import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { MatStepper } from '@angular/material/stepper';
import { PdfGeneratorService } from 'app/modules/studentname-pdf-edit/pdf-generator.service';
import { StudentsCertificateRawpdfUploadComponent } from 'app/modules/students-certificate-rawpdf-upload/students-certificate-rawpdf-upload.component';
import { StudentsCustomCertificateComponent } from 'app/modules/students-custom-certificate/students-custom-certificate.component';
import { UiService } from 'app/shared/ui.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import moment from 'moment';

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
    selector: 'app-stage-info-contest',
    templateUrl: './stage-info-contest.component.html',
    styleUrls: ['./stage-info-contest.component.scss'],
    providers: [
        {
            provide: DateAdapter,
            useClass: MomentDateAdapter,
            deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
        },
        { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
    ],
})
export class StageInfoContestComponent implements OnInit {
    @Output() contestStageInfo: EventEmitter<any> = new EventEmitter();
    @ViewChild('stageStepperRef') private stageStepper: MatStepper;
    @Input() contestInfo;
    @Input() contestBasicInfo;
    disableFields = false;
    stageInfoForm: FormGroup;
    @Output() isClassorStemClubDependentEvent = new EventEmitter<any>(false);

    // Dynamic rubric options loaded from Configuration/submissionEvaluations
    rubricOptions: Array<{ value: string; label: string }> = [];

    constructor(
        private fb: FormBuilder,
        private uiService: UiService,
        private dialog: MatDialog,
        private pdfService: PdfGeneratorService,
        private configService: ConfigurationService,
    ) { }

    ngOnInit(): void {
        // Load dynamic rubric options
        this.loadRubricOptions();

        this.stageInfoForm = this.fb.group({
            stagesFormArr: this.fb.array([])
        });
        if (this.contestInfo) {
            this.patchFormValue(this.contestInfo?.stagesNames);
        }
        else {
            this.addNewStage();
        }
    }

    private loadRubricOptions() {
        this.configService.getSubmissionEvaluations$()
            .subscribe((doc: any) => {
                // doc is the whole document data; iterate fields and map
                if (!doc || typeof doc !== 'object') {
                    // No config found: use a safe default
                    this.rubricOptions = [{ value: 'default', label: 'Default' }];
                    this.applyDefaultRubricIfNeeded();
                    return;
                }
                const entries = Object.entries(doc);
                const mapped = entries
                    .filter(([k, v]) => k !== 'docId' && v !== null && v !== undefined)
                    .map(([k, v]: [string, any]) => {
                        // Flexible mapping: support objects with display/value, strings, or booleans
                        if (v && typeof v === 'object') {
                            const label = v.displayName || v.display || v.label || k;
                            const value = v.value != null ? v.value : k;
                            return { value: String(value), label: String(label) };
                        }
                        if (typeof v === 'string') {
                            return { value: k, label: v };
                        }
                        return { value: k, label: k };
                    });

                // If nothing valid came back, provide a single default option
                this.rubricOptions = mapped && mapped.length > 0
                    ? mapped
                    : [{ value: 'default', label: 'Default' }];

                // After loading options, ensure a default rubric is selected where missing
                this.applyDefaultRubricIfNeeded();
            });
    }

    patchFormValue(stagesArr = []) {
        stagesArr.forEach((stage) => {
            this.addNewStage(stage);
        });
        // After all stages are added from DB, enforce defaults and sync the active stage
        this.applyDefaultRubricIfNeeded();
        this.syncRubricForStage(0);
    }

    onStepChange(event) {
        const objkeys = Object.keys(this.contestInfo?.stagesNames[event.selectedIndex]);
        if (objkeys.includes('isNominationAllowed')) {
            this.disableFields = this.contestInfo?.stagesNames[event.selectedIndex]['isNominationAllowed'];
        }
        else {
            this.disableFields = true;
        }
        // Ensure rubric selection reflects DB for the active stage
        this.syncRubricForStage(event.selectedIndex);
    }

    addNewStage(updateStage?) {
        const stageNo = this.getFormArr.length + 1;
        let group: FormGroup;
        if (stageNo == 1) {
            group = this.getFormGroupFor1stStage(updateStage, stageNo);
        }
        else {
            group = this.getFormGroup(updateStage, stageNo);
        }
        this.getFormArr.push(group);
        // Ensure nomination-related validators are conditional on toggle per stage
        this.setupNominationControls(group);
        // Keep rubric controls consistent when user changes selection
        this.setupRubricControlSync(group);
        // Immediately ensure a valid rubric selection (defaults to first option when empty)
        this.applyDefaultRubricIfNeeded();
        if (!updateStage) {
            setTimeout(() => {
                this.stageStepper.selectedIndex = this.getFormArr.length - 1;
            }, 0);
        }
    }

    toggle(e) {
        if (e.checked) {
            this.disableFields = true;
        }
        else {
            this.disableFields = false;
        }
    }

    get getFormArr() {
        return this.stageInfoForm.get('stagesFormArr') as FormArray;
    }

    getFormGroup(stageInfo, stageNum): FormGroup {
        return this.fb.group<any>({
            stageName: [stageInfo?.stageName || '', [Validators.required]],
            stageNumber: [{ value: stageNum, disabled: true }], /* {value: 'someValue', disabled:true} */
            numberOfAllowedSubmissions: [stageInfo?.numberOfAllowedSubmissions || 1, [Validators.required, Validators.pattern('^[0-9]')]],
            numberOfMinFemaleCandidates: [stageInfo?.numberOfMinFemaleCandidates || 0, [Validators.required, Validators.pattern('^[0-9]')]],
            numberOfMinMaleCandidates: [stageInfo?.numberOfMinMaleCandidates || 0, [Validators.required, Validators.pattern('^[0-9]')]],
            startDate: [stageInfo?.startDate?.seconds ? moment(stageInfo?.startDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            endDate: [stageInfo?.endDate?.seconds ? moment(stageInfo?.endDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            isNominationAllowed: [stageInfo?.isNominationAllowed || false, [Validators.required]],
            isDependentOtherStage: [stageInfo?.isDependentOtherStage || false, [Validators.required]],
            submissions: [stageInfo?.submissions != undefined ? stageInfo?.submissions : []],
            stageId: [stageInfo?.stageId != undefined ? stageInfo.stageId : `${this.makeStageId(5)}`],
            maximumNomination: [stageInfo?.maximumNomination || 1, [Validators.required]],
            nominationStartDate: [stageInfo?.nominationStartDate?.seconds ? moment(stageInfo?.nominationStartDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            nominationEndDate: [stageInfo?.nominationEndDate?.seconds ? moment(stageInfo?.nominationEndDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            resultAwardDate: [stageInfo?.[`stage_${stageInfo.stageId}_result_date`]?.seconds ? moment(stageInfo?.[`stage_${stageInfo.stageId}_result_date`]?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            isAllStepsMandatory: [stageInfo?.isAllStepsMandatory || false, [Validators.required]],
            // rubric controls
            rubricsValue: [stageInfo?.rubricsValue ?? stageInfo?.chosenRubric ?? null],
            rubricsName: [stageInfo?.rubricsName ?? null],
            chosenRubric: [stageInfo?.rubricsValue ?? stageInfo?.chosenRubric ?? null, [Validators.required]]
        });
    }

    getFormGroupFor1stStage(stageInfo, stageNum): FormGroup {
        return this.fb.group<any>({
            stageName: [stageInfo?.stageName || '', [Validators.required]],
            stageNumber: [{ value: stageNum, disabled: true }], /* {value: 'someValue', disabled:true} */
            numberOfAllowedSubmissions: [stageInfo?.numberOfAllowedSubmissions || 1, [Validators.required, Validators.pattern('^[0-9]')]],
            numberOfMinFemaleCandidates: [stageInfo?.numberOfMinFemaleCandidates || 0, [Validators.required, Validators.pattern('^[0-9]')]],
            numberOfMinMaleCandidates: [stageInfo?.numberOfMinMaleCandidates || 0, [Validators.required, Validators.pattern('^[0-9]')]],
            startDate: [stageInfo?.startDate?.seconds ? moment(stageInfo?.startDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            endDate: [stageInfo?.endDate?.seconds ? moment(stageInfo?.endDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            isDependentOtherStage: [stageInfo?.isDependentOtherStage || false, [Validators.required]],
            isNominationAllowed: [stageInfo?.isNominationAllowed || false, [Validators.required]],
            submissions: [stageInfo?.submissions != undefined ? stageInfo?.submissions : []],
            stageId: [stageInfo?.stageId != undefined ? stageInfo.stageId : `${this.makeStageId(5)}`],
            maximumNomination: [stageInfo?.maximumNomination || 1, [Validators.required]],
            nominationStartDate: [stageInfo?.nominationStartDate?.seconds ? moment(stageInfo?.nominationStartDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            nominationEndDate: [stageInfo?.nominationEndDate?.seconds ? moment(stageInfo?.nominationEndDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            resultAwardDate: [stageInfo?.[`stage_${stageInfo.stageId}_result_date`]?.seconds ? moment(stageInfo?.[`stage_${stageInfo.stageId}_result_date`]?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            isAllStepsMandatory: [stageInfo?.isAllStepsMandatory || false, [Validators.required]],
            // rubric controls
            rubricsValue: [stageInfo?.rubricsValue ?? stageInfo?.chosenRubric ?? null],
            rubricsName: [stageInfo?.rubricsName ?? null],
            chosenRubric: [stageInfo?.rubricsValue ?? stageInfo?.chosenRubric ?? null, [Validators.required]]
        });
    }

    removeStage(index) {
        this.getFormArr.removeAt(index);
        this.uiService.alertMessage('Removed', `Stage ${index + 1} has been removed`, 'warn');
    }

    onClickNext() {
        const stagesRaw = this.stageInfoForm.getRawValue().stagesFormArr;
        const stages = stagesRaw.map((s: any) => {
            const selected = this.rubricOptions.find(o => o.value === s.chosenRubric);
            return {
                ...s,
                rubricsValue: s.chosenRubric ?? null,
                rubricsName: selected?.label ?? s.chosenRubric ?? 'default',
            };
        });
        this.contestStageInfo.emit({ stages });
    }

    makeStageId(length) {
        let result = '';
        const characters = '12345thinktacispf67890';
        const charactersLength = characters.length;
        let counter = 0;
        while (counter < length) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
            counter += 1;
        }
        return result;
    }

    classorStemClubDependent(event) {
        this.isClassorStemClubDependentEvent.emit(event.checked)
    }

    openUploadCertificateDialog(): void {
        const dialogRef = this.dialog.open(StudentsCertificateRawpdfUploadComponent, {
            width: '500px',
            disableClose: true,
            height: '50vh',
            data: {
                contestIdFromStageInfo: this.contestBasicInfo.docId,
            }

        });

        dialogRef.afterClosed().subscribe(result => {
        });
    }

    addCustomCertificateDialog(): void {
        const dialogRef = this.dialog.open(StudentsCustomCertificateComponent, {
            width: '500px',
            disableClose: true,
            height: '50vh',
            data: {
                contestIdFromStageInfo: this.contestBasicInfo.docId,
            }
        });

        dialogRef.afterClosed().subscribe(result => {
        });
    }

    isAllStepsMandatory(event: MatSlideToggleChange, index: number) {
        this.getFormArr.at(index).get('isAllStepsMandatory').setValue(event.checked);
    }

    setupNominationControls(group: FormGroup) {
        const isNominationAllowedCtrl = group.get('isNominationAllowed');
        const fields = ['maximumNomination', 'nominationStartDate', 'nominationEndDate'];

        const apply = (enabled: boolean) => {
            fields.forEach((f) => {
                const ctrl = group.get(f);
                if (!ctrl) { return; }
                if (enabled) {
                    ctrl.setValidators([Validators.required]);
                } else {
                    ctrl.clearValidators();
                }
                ctrl.updateValueAndValidity({ emitEvent: false });
            });
        };

        // Apply for initial state
        apply(!!isNominationAllowedCtrl?.value);

        // React to future changes
        isNominationAllowedCtrl?.valueChanges.subscribe((val: boolean) => {
            apply(!!val);
        });
    }

    private setupRubricControlSync(group: FormGroup) {
        const chosenCtrl = group.get('chosenRubric');
        if (!chosenCtrl) { return; }
        chosenCtrl.valueChanges.subscribe((val: string) => {
            const selected = this.rubricOptions.find(o => o.value === val);
            group.get('rubricsValue')?.setValue(val, { emitEvent: false });
            group.get('rubricsName')?.setValue(selected?.label ?? null, { emitEvent: false });
        });
    }

    private applyDefaultRubricIfNeeded() {
        if (!this.rubricOptions || this.rubricOptions.length === 0) { return; }
        const optionValues = this.rubricOptions.map(o => o.value);
        // Prefer the option explicitly named 'default' if present; otherwise use the first option
        const defaultValue = this.rubricOptions.find(o => o.value === 'default')?.value
            ?? this.rubricOptions[0]?.value;
        this.getFormArr?.controls?.forEach((grp: FormGroup) => {
            const ctrl = grp.get('chosenRubric');
            if (!ctrl) { return; }
            const savedVal = grp.get('rubricsValue')?.value;
            const savedName = grp.get('rubricsName')?.value;
            let nextVal = ctrl.value;

            // Prefer exact saved value if it's valid
            if (savedVal && optionValues.includes(savedVal)) {
                nextVal = savedVal;
            }
            // Else try to map saved display name to an option
            else if (savedName) {
                const match = this.rubricOptions.find(o => o.label === savedName);
                if (match) { nextVal = match.value; }
            }
            // Else keep current if valid
            else if (nextVal && !optionValues.includes(nextVal)) {
                nextVal = undefined;
            }

            // Fallback to default
            if (nextVal === undefined || nextVal === null || nextVal === '') {
                nextVal = defaultValue;
            }

            ctrl.setValue(nextVal, { emitEvent: false });
            ctrl.setValidators([Validators.required]);
            ctrl.updateValueAndValidity({ emitEvent: false });
            // Also backfill hidden fields so review/save see correct labels
            const selected = this.rubricOptions.find(o => o.value === nextVal);
            grp.get('rubricsValue')?.setValue(nextVal, { emitEvent: false });
            grp.get('rubricsName')?.setValue(selected?.label ?? null, { emitEvent: false });
        });
    }

    private syncRubricForStage(index: number) {
        const grp = this.getFormArr?.at(index) as FormGroup;
        if (!grp) { return; }
        const optionValues = this.rubricOptions?.map(o => o.value) || [];
        const savedVal = grp.get('rubricsValue')?.value;
        const savedName = grp.get('rubricsName')?.value;
        let nextVal = grp.get('chosenRubric')?.value;

        if (savedVal && optionValues.includes(savedVal)) {
            nextVal = savedVal;
        } else if (savedName) {
            const match = this.rubricOptions.find(o => o.label === savedName);
            if (match) { nextVal = match.value; }
        }

        if (nextVal !== undefined && nextVal !== null && nextVal !== '') {
            grp.get('chosenRubric')?.setValue(nextVal, { emitEvent: false });
            const selected = this.rubricOptions.find(o => o.value === nextVal);
            grp.get('rubricsValue')?.setValue(nextVal, { emitEvent: false });
            grp.get('rubricsName')?.setValue(selected?.label ?? null, { emitEvent: false });
        } else {
            // fallback through defaulting logic
            this.applyDefaultRubricIfNeeded();
        }
    }
}
