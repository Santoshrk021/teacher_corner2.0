import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_MOMENT_DATE_ADAPTER_OPTIONS, MomentDateAdapter } from '@angular/material-moment-adapter';
import { UserService } from 'app/core/dbOperations/user/user.service';
import moment from 'moment';
import { EventService } from 'app/core/dbOperations/events/event.service';
import { EventWorkshopDialogService } from '../event-workshop-dialog.service';
import { NGX_MAT_DATE_FORMATS, NgxMatDateAdapter, NgxMatDateFormats } from '@angular-material-components/datetime-picker';
import { CustomNgxDatetimeAdapter } from '../define-batches/CustomNgxDatetimeAdapter';
import { NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS } from '@angular-material-components/moment-adapter';

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
    selector: 'app-basic',
    templateUrl: './basic.component.html',
    styleUrls: ['./basic.component.scss'],
    providers: [
        // `MomentDateAdapter` can be automatically provided by importing `MomentDateModule` in your
        // application's root module. We provide it at the component level here, due to limitations of
        // our example generation script.
        {
            provide: NgxMatDateAdapter,
            useClass: CustomNgxDatetimeAdapter,
            deps: [MAT_DATE_LOCALE, NGX_MAT_MOMENT_DATE_ADAPTER_OPTIONS]
        },
        { provide: NGX_MAT_DATE_FORMATS, useValue: MY_FORMATS }
    ],
})
export class BasicComponent implements OnInit {
    @Input() eventInfo;

    @Output() basicInfoEmitter: EventEmitter<any> = new EventEmitter();
    minDate: Date;
    eventAudience = ['Student', 'Teacher'];

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private eventService: EventService,
        private eventWorkshopDialogService: EventWorkshopDialogService,
    ) { }
    basicInfoForm = this.fb.group<any>({
        eventTitle: ['', [Validators.required]],
        eventSubtitle: ['', [Validators.required]],
        eventDescription: ['', [Validators.required]],
        creatorName: [{ value: '', disabled: true }, [Validators.required]],
        participantLimit: ['', [Validators.required]],
        startDate: ['', [Validators.required]],
        endDate: ['', [Validators.required]],
        eventType: [{ value: '', disabled: true }],
        eventAudience: ['', [Validators.required]]
    });
    ngOnInit(): void {
        if (this.eventInfo) {
            this.patchFormValue(this.eventInfo);
        } else {
            this.userService.user$.subscribe((res) => {
                this.basicInfoForm.patchValue({
                    creatorName: `${res?.['teacherMeta']?.['firstName'] || ''} ${res?.['teacherMeta']?.['lastName'] || ''} `,
                    eventType: this.eventService.eventType
                });
            });
        }
    }

    patchFormValue(event) {
        this.basicInfoForm.patchValue({
            eventType: event.eventType,
            eventTitle: event.eventTitle,
            eventSubtitle: event.eventSubtitle,
            eventDescription: event.eventDescription,
            participantLimit: event.participantLimit,
            creatorName: event.creatorName,
            eventAudience: event?.eventAudience || '',
            startDate: event?.startDate?.seconds ? moment(event?.startDate?.seconds * 1000) : '',
            endDate: event?.endDate?.seconds ? moment(event?.endDate?.seconds * 1000) : '',
        });

    }
    onClickNext() {
        this.eventWorkshopDialogService.eventStartDateSub.next(this.basicInfoForm.getRawValue());
        this.basicInfoEmitter.emit(this.basicInfoForm.getRawValue());

    }

    onStartDateChange(value) {
        const parsedDate = moment(value, 'DD/MM/YYYY hh:mm A');
        parsedDate.add(1, 'hours');
        this.minDate = parsedDate.toDate();
    }
}
