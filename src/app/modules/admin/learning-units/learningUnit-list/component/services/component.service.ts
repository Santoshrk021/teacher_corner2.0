import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { LoadingService } from './loading.service';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ComponentService {
    componentData = new BehaviorSubject<any[]>([]);
    componentDatas$: Observable<any[]> = this.componentData.asObservable();
    totalItems: any = [];
    dataArray: any[] = [];

    constructor(
        // private afs: AngularFirestore,
        private masterService: MasterService // private loading: LoadingService
    ) {
        this.loadAllData();
    }

    managingComponent(name: string, data: string): void {
        const componetName = name;
        const componentsize = data;

        const existingData = this.dataArray.find(
            item => item.componetName === componetName
        );

        if (existingData) {
            existingData.componentsize = componentsize;
        } else {
            this.dataArray.push({ componetName, componentsize });
        }
        console.log(this.dataArray);
    }

    managingComponentData(data: any): void {
        const filteredArray = this.dataArray.filter(item =>
            data.includes(item.componetName)
        );
        console.log(filteredArray);
    }

    private loadAllData(): void {

        const loadData$ = this.masterService
            .getAllMasterDocsMap('COMPONENT', 'components')
            .subscribe((data) => {
                Object.values(data).forEach((value) => {
                    this.totalItems.push(value);
                });
                this.componentData.next(this.totalItems);
            });
    }
}
