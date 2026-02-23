import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(
    private http: HttpClient
  ) { }

  createExcelSheet(data: any, name: string) {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(data);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws);
    XLSX.writeFile(wb, `${name}.xlsx`);
  }

  getBase64ImageFromURL(url: string): Promise<string> {
    return this.http.get(url, { responseType: 'blob' }).toPromise().then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  getArrayBufferFromUrl(url: string): Promise<ArrayBuffer> {
    return this.http.get(url, { responseType: 'arraybuffer' }).toPromise();
  }

  getTextFromUrl(url: string): Promise<string> {
    return this.http.get(url, { responseType: 'text' }).toPromise();
  }

}
