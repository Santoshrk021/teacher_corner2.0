import { Component, OnInit } from '@angular/core';
import { takeUntil } from 'rxjs';
import { Subject } from 'rxjs';
import { MatDialogRef } from '@angular/material/dialog';
import * as XLSX from 'xlsx';
import { VisitListService } from '../visit-lisit.service';

@Component({
  selector: 'app-visitexport',
  templateUrl: './visitexport.component.html',
  styleUrls: ['./visitexport.component.scss']
})
export class VisitexportComponent implements OnInit {

  isExporting: boolean = false;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
  
  
    constructor(
      private dialogRef: MatDialogRef<VisitexportComponent>,
      private visitListService: VisitListService
      
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
    async exportVisitToExcel(): Promise<void> {
      this.isExporting = true;
      const documents = await this.getAllVisits();
      const docsdata = this.getDocsData(documents).filter(d => d.docId != '--schema--' && d.docId != '--trash--');
      this.getExcelFile(docsdata);
      this.isExporting = false;
      this.dialogRef.close();
      
    }
  
    async getAllVisits() {
      return new Promise((resolve) => {
          this.visitListService.getAllVisitsFromDB().pipe(takeUntil(this._unsubscribeAll)).subscribe((d) => {
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
              'Visitor Name': data.visitorfirstName + ' ' + data.visitorlastName,
              'Visitor Email': data.visitorEmail,
              'Visit Category': data.catagory,
              'Visit Purpose': data.purpose,
              'Visit Type': data.visitType,
              'Visit Start Date': this.formatDateTime(data.visitStartTimestamp),
              'Visit Start Location': this.formatLocation(data.startLocation),
              'Visit End Date': this.formatDateTime(data.visitEndTimestamp) || this.formatDateTime(data.vistEndTimestamp),
              'Visit End Location': this.formatLocation(data.endLocation),
              'Actual Time Difference': data.ActualTimeDifferenceinString,
              'User Provided Time Difference' : data.visitUserProvidedTimeinString,
              'Source': data.source || 'Visit Tracker Website',
          }));
  
      
          const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(filteredData);
          // Set custom column widths to avoid congested data in Excel
          // Width unit 'wch' is roughly the number of characters that can fit in the cell
          // Order must match the column order of the JSON keys used above
          ws['!cols'] = [
            { wch: 4 },   // SL
            { wch: 22 },  // Visitor Name
            { wch: 30 },  // Visitor Email
            { wch: 20 },  // Visit Category
            { wch: 28 },  // Visit Purpose
            { wch: 14 },  // Visit Type
            { wch: 22 },  // Visit Start Date
            { wch: 28 },  // Visit Start Location
            { wch: 22 },  // Visit End Date
            { wch: 28 },  // Visit End Location
            { wch: 24 },  // Actual Time Difference
            { wch: 28 },  // User Provided Time Difference
            { wch: 20 },  // Source
          ];
          const wb: XLSX.WorkBook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Visits');
         
          XLSX.writeFile(wb, 'VisitsData.xlsx');
      }
  
      // convert timestamp to date
      formatDateTime(timestamp: any): string {
        if (!timestamp?.toDate) return '';
        const date = timestamp.toDate();
        return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
      }
  
      // safely format location objects that might be missing or in different shapes
      // supports { latitude, longitude } or { lat, lng } or [lat, lng]
      formatLocation(loc: any): string {
        if (!loc) return '';
        const lat = (loc?.latitude ?? loc?.lat ?? (Array.isArray(loc) ? loc[0] : undefined));
        const lng = (loc?.longitude ?? loc?.lng ?? (Array.isArray(loc) ? loc[1] : undefined));
        if (lat == null || lng == null) return '';
        return `${lat}, ${lng}`;
      }
  

}
