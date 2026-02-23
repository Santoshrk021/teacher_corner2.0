/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/naming-convention */
import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import * as XLSX from 'xlsx';

import { MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { ComponentsService } from '../components.service';

@Component({
  selector: 'app-export',
  templateUrl: './export.component.html',
})
export class ExportComponent implements OnInit, OnDestroy {
  isExporting: boolean = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();


  constructor(
    private dialogRef: MatDialogRef<ExportComponent>,
    private componentsService: ComponentsService,
    
  ) { }

  ngOnInit(): void {
    
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  //export function to get data
  async exportComponentsToExcel(): Promise<void> {
    this.isExporting = true;
    const documents = await this.getAllComponents();
    const docsdata = this.getDocsData(documents).filter(d => d.docId != '--schema--' && d.docId != '--trash--');
    this.getExcelFile(docsdata);
    this.isExporting = false;
    this.dialogRef.close();
    
  }

  async getAllComponents() {
    return new Promise((resolve) => {
        this.componentsService.getAllComponetsFromDB().pipe(takeUntil(this._unsubscribeAll)).subscribe((d) => {
            resolve(d.docs.map(m => m.data()));
        });
    });
}

getDocsData(documents) {
  const docs = [];
  documents.forEach((d) => {
      docs.push(d);
  });
  return docs;
}


//converrt to excel file with data
getExcelFile(data) {
        let filteredData = [];

        filteredData = data.map((data, index) => ({
            'SL': index+1,
            'Group Name': data.groupName,
            'Component Code': data.componentCode,
            'Component Name': data.componentName,
            'Category': data.category,
            'Sub Category': data.subCategory,
            'Attribute': data.attribute,
            'Size Unit': data.componentSize,
            'Quantity': data.quantity,
            'Created Date': this.formatDateTime(data.createdAt)

            
        }));

    
        const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredData);
        const wb: XLSX.WorkBook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Components');
       
        XLSX.writeFile(wb, 'ComponentsData.xlsx');
    }

    // convert timestamp to date
    formatDateTime(timestamp: any): string {
      if (!timestamp?.toDate) return '';
      const date = timestamp.toDate();
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
    }


}
  