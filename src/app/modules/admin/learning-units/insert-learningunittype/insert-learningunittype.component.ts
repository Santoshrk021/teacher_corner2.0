import { Component, EventEmitter, Inject, OnInit, Output,AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';

@Component({
    selector: 'app-insert-learningunittype',
    templateUrl: './insert-learningunittype.component.html',
    styleUrls: ['./insert-learningunittype.component.scss']
})
export class InsertLearningunittypeComponent implements OnInit,AfterViewInit {
    LutypeForm: FormGroup;
    codeError: boolean;

    presentCodes;
    @Output() dialogClosed: EventEmitter<any> = new EventEmitter<any>();
    constructor(
        private fb: FormBuilder,
        public dialogRef: MatDialogRef<InsertLearningunittypeComponent>,
        private config: ConfigurationService,
        private cdr: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: any,

    ) {
        this.LutypeForm = this.fb.group({
            name: ['', Validators.required],
            code: ['', Validators.required]
        });
        this.presentCodes = this.data.allTypes.map(d => d.code);
        this.codeError=false;
        this.LutypeForm.get('code').valueChanges.subscribe((newValue) => {
            // if (newValue !== '' ) {
                if (newValue.length == 2) {

                    if (this.presentCodes.includes(newValue)) {

                        this.LutypeForm.get('code').setErrors({ 'code': true });
                        this.codeError = true;
                        this.cdr.detectChanges();

                    }

                    else {
                        this.LutypeForm.get('code').setErrors(null);
                        this.codeError = false;
                    }
                }
                else {
                  //  this.LutypeForm.get('code').setErrors(null);
                    this.codeError = false;
                }

           // }
        });
    }
    ngAfterViewInit() {

    }

    ngOnInit(): void {



    }


    submitForm(val) {
        const d = val.value;
        const lutype = {
            Types: {
                [d.code]: {
                    name: d.name,
                    code: d.code
                }
            }
        };
         this.config.addLUtype(lutype);
        this.dialogRef.close({data:d,isupdated:true});
    }

    close() {
        this.dialogRef.close({data:null,isupdated:false});
        this.dialogClosed.emit();

    }

}
