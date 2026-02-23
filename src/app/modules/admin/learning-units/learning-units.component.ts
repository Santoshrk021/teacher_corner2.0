import { Component, OnDestroy, OnInit } from '@angular/core';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { tactivity } from 'app/core/dbOperations/learningUnits/learningUnits.types';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-learning-units',
    templateUrl: './learning-units.component.html',
    styleUrls: ['./learning-units.component.scss'],
})
export class LearningUnitsComponent implements OnInit, OnDestroy {
    selectedLang: string = '';
    allLearningUnits: tactivity[];
    selectedVersion: string = 'All Versions';
    inputChanged: string = '';
    luSubject = new BehaviorSubject(null);
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    constructor(private masterService: MasterService) {}

    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // ngOnInit(): void {
    //   this.masterService.getAllMasterDocsMapAsArray('LEARNINGUNIT', 'tacNames').pipe(takeUntil(this._unsubscribeAll)).subscribe((res) => {
    //     const sortedLUData = res.sort((x, y) => y.creationDate.seconds - x.creationDate.seconds);
    //     this.allLearningUnits = sortedLUData;
    //     this.luSubject.next(sortedLUData);
    //   });
    // }

    ngOnInit(): void {
        this.masterService
            .getAllMasterDocsMapAsArray('LEARNINGUNIT', 'tacNames')
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((res) => {
                const validItems = res.filter(item => item?.creationDate?.seconds != null);
                // const validItems = res.filter(item => item?.creationDate?.seconds != null || item?.createdAt?.seconds != null);
                const sortedLUData = validItems.sort((x, y) => y.creationDate.seconds - x.creationDate.seconds);

                // const validItems = (Array.isArray(res) ? res : []).filter(
                //     (item) =>
                //         item?.creationDate?.seconds != null ||
                //         item?.createdAt?.seconds != null
                // );

                // const sortedLUData = validItems.sort(
                //     (x, y) =>
                //         (y.creationDate?.seconds ?? y.createdAt?.seconds ?? 0) -
                //         (x.creationDate?.seconds ?? x.createdAt?.seconds ?? 0)
                // );
                this.allLearningUnits = sortedLUData;
                console.log(
                    'Sorted Learning Units:',
                    sortedLUData.filter(
                        (item) => item?.docId == '5liZT12bz6yUetgUBC5R'
                    )
                );
                this.luSubject.next(sortedLUData);

                res.forEach((item) => {
                    if (!item?.creationDate?.seconds) {
                        console.warn('Item missing creationDate:', item);
                    }
                });
            });
    }

    onlanguageChange(event: any) {
        this.selectedLang = event;
    }

    onversionChange(event: any) {
        this.selectedVersion = event;
    }

    onSearchChanged(event: any) {
        this.inputChanged = event;
    }
}
