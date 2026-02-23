import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { firstValueFrom, Subscription } from 'rxjs';
import { ComponentService } from '../services/component.service';

@Component({
    selector: 'app-details',
    templateUrl: './details.component.html',
    styleUrls: ['./details.component.scss'],
})
export class DetailsComponent implements OnInit, OnDestroy {
    totallist: any = [];

    sizeOptions: { key: any; value: any }[] = [];
    selectedSize: string = '';
    selectedUnit: string = '';
    private dataSub!: Subscription;

    constructor(
        private dialogRef: MatDialogRef<DetailsComponent>,
        @Inject(MAT_DIALOG_DATA) private data: any,
        private afs: AngularFirestore,
        private masterService: MasterService,
        private componentService: ComponentService
    ) {}
     ngOnInit(): any{
        this.componentService.componentDatas$.subscribe((data) => {
            this.totallist = data;
        });
        const found = this.totallist.find(
            item => item.componentName === this.data.split('-')[0]
        );
        this.selectedUnit = found?.sizeUnit ?? '';
        this.sizeOptions = Object.entries(found.size)
            .filter(([key, _]) => key !== 'default')
            .map(([key, value]) => ({  
                key,
                value,
            }));
    }
    clickMe(): any {
        console.log(this.data);
        this.dialogRef.close();
    }
    ngOnDestroy(): void {
        if (this.dataSub) {
            this.dataSub.unsubscribe();
        }
        this.dialogRef.close();
    }
    sendData(): any {
        this.componentService.managingComponent(this.data, this.selectedSize);
        this.dialogRef.close();
    }
}
