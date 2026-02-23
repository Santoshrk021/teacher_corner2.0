import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter, NgxMatDateFormats } from '@angular-material-components/datetime-picker';
import { NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular-material-components/moment-adapter';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatStepper } from '@angular/material/stepper';
import { UiService } from 'app/shared/ui.service';
import moment from 'moment';
import { CustomNgxDatetimeAdapter } from './CustomNgxDatetimeAdapter';
import { EventWorkshopDialogService } from '../event-workshop-dialog.service';
export const MY_FORMATS: NgxMatDateFormats = {
    parse: {
        dateInput: 'l, LTS',
    },
    display: {
        dateInput: 'DD/MM/YYYY hh:mm A', // this is how your date will get displayed on the Input
        monthYearLabel: 'MMMM YYYY',
        dateA11yLabel: 'LL',
        monthYearA11yLabel: 'MMMM YYYY'
    },
};

@Component({
    selector: 'app-define-batches',
    templateUrl: './define-batches.component.html',
    styleUrls: ['./define-batches.component.scss'],
    providers: [
        // {
        //     provide: DateAdapter,
        //     useClass: MomentDateAdapter,
        //     deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
        // },
        // { provide: MAT_DATE_FORMATS, useValue: MY_FORMATS },
        {
            provide: NgxMatDateAdapter,
            useClass: CustomNgxDatetimeAdapter,
            deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS]
        },
        { provide: NGX_MAT_DATE_FORMATS, useValue: MY_FORMATS }
    ],
})
export class DefineBatchesComponent implements OnInit,OnDestroy {
    @Output() batchInfoEmitter: EventEmitter<any> = new EventEmitter();
    @ViewChild('batchStepperRef') private batchStepper: MatStepper;
    @Input() eventInfo;
    minDate = {};
    minEventStartDate;
    batchInfoForm: FormGroup;
    constructor(
        private fb: FormBuilder,
        private uiService: UiService,
        private eventWorkshopDialogService: EventWorkshopDialogService,

    ) {
        this.eventWorkshopDialogService?.eventStartDateSub.subscribe((res) => {

            if (res) {
                this.minEventStartDate = new Date(res?.startDate);
            }
        });
    }
    ngOnDestroy(): void {
        this.eventWorkshopDialogService?.eventStartDateSub.next(null);
    }
    ngOnInit(): void {
        this.batchInfoForm = this.fb.group({
            batchsFormArr: this.fb.array([])
        });
        if (this.eventInfo) {
            this.patchFormValue(this.eventInfo?.batches);
        }
        else {
            this.addNewBatch();
        }

    }


    patchFormValue(batchsArr = []) {
        batchsArr.forEach((batch) => {
            this.addNewBatch(batch);
        });
    }
    addNewBatch(updateBatch?) {
        const batchNo = this.getFormArr.length + 1;
        if (batchNo == 1) {
            this.getFormArr.push(this.getFormGroupFor1stBatch(updateBatch, batchNo));
        }
        else {
            this.getFormArr.push(this.getFormGroup(updateBatch, batchNo));
        }
        if (!updateBatch) {
            setTimeout(() => {
                this.batchStepper.selectedIndex = this.getFormArr.length - 1;
            }, 0);
        }
    }

    get getFormArr() {
        return this.batchInfoForm.get('batchsFormArr') as FormArray;
    }
    getFormGroup(batchInfo, batchNum): FormGroup {

        const form = this.fb.group<any>({
            batchName: [batchInfo?.batchName || ' ', Validators.required],
            batchNumber: [{ value: batchNum, disabled: true }], /* {value: 'someValue', disabled:true} */
            numberOfAllowedSubmissions: [batchInfo?.numberOfAllowedSubmissions || 1, [Validators.required]],
            // startDate: [batchInfo?.startDate?.seconds ? moment(batchInfo?.startDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            startDate: [batchInfo?.startDate?.seconds ? moment(batchInfo?.startDate?.seconds * 1000) : this.minEventStartDate, [Validators.required]],
            // endDate: [batchInfo?.endDate?.seconds ? moment(batchInfo?.endDate?.seconds * 1000).format('YYYY-MM-DD') : moment(new Date()).format('YYYY-MM-DD'), [Validators.required]],
            endDate: [batchInfo?.endDate?.seconds ? moment(batchInfo?.endDate?.seconds * 1000) : { value: this.onStartDateChangeInitial(this.minEventStartDate, this.getFormArr.length), disabled: false }, [Validators.required]],
            submissions: [batchInfo?.submissions != undefined ? batchInfo?.submissions : []],
            batchId: [batchInfo?.batchId != undefined ? batchInfo.batchId : `${this.makeBatchId(5)}`],
        });


        return form;
    }

    getFormGroupFor1stBatch(batchInfo, batchNum): FormGroup {

        const form = this.fb.group<any>({
            batchName: [batchInfo?.batchName || ' ', [Validators.required]],
            batchNumber: [{ value: batchNum, disabled: true }], /* {value: 'someValue', disabled:true} */
            numberOfAllowedSubmissions: [batchInfo?.numberOfAllowedSubmissions || 1, [Validators.required]],
            startDate: [batchInfo?.startDate?.seconds ? moment(batchInfo?.startDate?.seconds * 1000) : this.minEventStartDate, [Validators.required]],
            // endDate: [{value:batchInfo?.endDate?.seconds ? moment(batchInfo?.endDate?.seconds * 1000) :'',disabled:true}, [Validators.required]],
            endDate: [batchInfo?.endDate?.seconds ? moment(batchInfo?.endDate?.seconds * 1000) : { value: this.onStartDateChangeInitial(this.minEventStartDate, this.getFormArr.length), disabled: false }, [Validators.required]],
            submissions: [batchInfo?.submissions != undefined ? batchInfo?.submissions : []],
            batchId: [batchInfo?.batchId != undefined ? batchInfo.batchId : `${this.makeBatchId(5)}`],
        });

        return form;

    }

    removeBatch(index) {
        this.getFormArr.removeAt(index);
        this.uiService.alertMessage('Removed', `Batch ${index + 1} has been removed`, 'warn');
    }
    onClickNext() {
        const batches = this.batchInfoForm.getRawValue().batchsFormArr;

        this.batchInfoEmitter.emit({ batches });
    }

    makeBatchId(length) {
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

    onStartDateChange(value, index) {
        const parsedDate = moment(value, 'DD/MM/YYYY hh:mm A');
        const increasedDate = parsedDate.add(1, 'hours');
        this.minDate[index] = parsedDate.toDate();
        this.getFormArr.at(index).get('endDate').enable();
        this.getFormArr.at(index).patchValue({
            endDate: increasedDate.format()
        });
    }
    onStartDateChangeInitial(value, index) {
        const parsedDate = moment(value, 'DD/MM/YYYY hh:mm A');
        const increasedDate = parsedDate.add(1, 'hours');
        this.minDate[index] = parsedDate.toDate();
        return increasedDate.format();
    }


    onBatchNameChange(index: number, event) {
        this.getFormArr.at(index).patchValue({
            batchName: event.target.value.trim()
        });
    }
}
