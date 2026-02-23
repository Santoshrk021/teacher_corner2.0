/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { ComponentModel } from '../components.interface';

@Injectable({
    providedIn: 'root',
})
export class AddService {
    loadingCode = new BehaviorSubject<boolean>(false);
    loadingCode$: Observable<boolean> = this.loadingCode.asObservable();

    toggleCodeOn(): void {
        this.loadingCode.next(true);
    }
    toggleCodeOff(): void {
        this.loadingCode.next(false);
    }

    constructor(private firestore: AngularFirestore) {
        this.getComponentCategory();
    }

    getComponentDropdownData(): Observable<{
        category: string[];
        materialType: string[];
        size: string[];
        unitSize: string[];
        group: {};
        attribute: any[];
    }> {
        return this.firestore
            .doc('Configuration/componentDetails')
            .valueChanges()
            .pipe(
                map((data: any) => {
                    // console.log('Dropdown data:', data);
                    return {
                        category: data?.category || [],
                        materialType: data?.materialType || [],
                        size: data?.size || [],
                        unitSize: data?.unitSize || [],
                        group: data?.group || {},
                        attribute: data?.attribute || [],
                    };
                })
            );
    }

    getComponentTypes(): any {
        return this.firestore
            .doc('Configuration/componentDetails')
            .snapshotChanges()
            .pipe(
                map((actions) => {
                    const data = actions.payload.data() as ComponentModel;
                    const id = actions.payload.id;
                    return data?.category;
                })
            );
    }

    getComponentCategory(): any {
        return this.firestore
            .collection('Configuration', (ref) =>
                ref.where('docId', 'in', [
                    'component_category_a',
                    'component_category_c',
                    'component_category_d',
                    'component_category_e',
                    'component_category_f',
                    'component_category_g',
                    'component_category_h',
                    'component_category_m',
                    'component_category_n',
                    'component_category_o',
                    'component_category_p',
                    'component_category_q',
                    'component_category_r',
                    'component_category_w',
                    'component_category_x',
                ])
            )
            .valueChanges()
            .pipe(
                map((data: any) => {
                    // console.log('Dropdown data:', data);
                    return data;
                })
            );
    }
}
