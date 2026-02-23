import { Component, OnInit } from '@angular/core';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { BatchHistoryEntry } from '../bulk-composer.interfaces';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-whatsapp-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit {
  isLoading = false;
  historyItems: BatchHistoryEntry[] = [];
  selectedBatch: BatchHistoryEntry | null = null;

  // Data for expanded view
  originalData: any[] = [];
  statusResults: any[] = [];
  failedEntries: any[] = [];
  isLoadingDetails = false;

  constructor(
    private drawerService: FuseDrawerService,
    private afStorage: AngularFireStorage
  ) {}

  ngOnInit(): void {
    this.loadHistory();
  }

  async loadHistory(): Promise<void> {
    this.isLoading = true;
    try {
      // List all batch folders in whatsapp-bulk-messages
      const listRef = this.afStorage.ref('whatsapp-bulk-messages');
      const result = await listRef.listAll().toPromise();

      const batches: BatchHistoryEntry[] = [];

      // Load metadata for each batch folder
      for (const prefix of result?.prefixes || []) {
        try {
          const metadataRef = prefix.child('metadata.json');
          const url = await metadataRef.getDownloadURL();
          const response = await fetch(url);
          const metadata: BatchHistoryEntry = await response.json();
          batches.push(metadata);
        } catch (err) {
          console.error('Failed to load metadata for batch:', prefix.name, err);
        }
      }

      // Sort by date descending (newest first)
      this.historyItems = batches.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      this.isLoading = false;
    }
  }

  toggleDetails(batch: BatchHistoryEntry): void {
    if (this.selectedBatch?.batchId === batch.batchId) {
      this.selectedBatch = null;
      this.originalData = [];
      this.statusResults = [];
      this.failedEntries = [];
    } else {
      this.selectedBatch = batch;
      this.loadBatchDetails(batch);
    }
  }

  async loadBatchDetails(batch: BatchHistoryEntry): Promise<void> {
    this.isLoadingDetails = true;
    this.originalData = [];
    this.statusResults = [];
    this.failedEntries = [];

    try {
      const folderPath = `whatsapp-bulk-messages/${batch.batchId}`;

      // Load full log Excel
      const fullLogRef = this.afStorage.ref(`${folderPath}/full_log.xlsx`);
      const fullLogUrl = await fullLogRef.getDownloadURL().toPromise();

      // Fetch and parse Excel file
      const response = await fetch(fullLogUrl);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<any>(sheet);

      // Process data for different views
      this.originalData = data.map(row => {
        const entry: any = {
          phone: row['Phone Number'] || '',
          params: []
        };
        // Extract params based on paramFields
        batch.paramFields.forEach(field => {
          if (row[field] !== undefined) {
            entry.params.push(row[field]);
          }
        });
        return entry;
      });

      // Status results (without request_id)
      this.statusResults = data.map(row => ({
        phone: row['Phone Number'] || '',
        params: batch.paramFields.map(field => row[field] || ''),
        status: row['Status'] || '',
        failure_reason: row['Failure Reason'] || ''
      }));

      // Failed entries only
      this.failedEntries = data
        .filter(row => {
          const status = (row['Status'] || '').toUpperCase();
          return status === 'FAILED' || status === 'ERROR';
        })
        .map(row => ({
          phone: row['Phone Number'] || '',
          params: batch.paramFields.map(field => row[field] || '')
        }));

    } catch (error) {
      console.error('Failed to load batch details:', error);
    } finally {
      this.isLoadingDetails = false;
    }
  }

  downloadOriginalData(): void {
    if (!this.selectedBatch || this.originalData.length === 0) return;

    const exportData = this.originalData.map(entry => {
      const row: any = { 'Phone Number': entry.phone };
      this.selectedBatch!.paramFields.forEach((field, idx) => {
        row[field] = entry.params[idx] || '';
      });
      return row;
    });

    this.downloadExcel(exportData, `original_${this.selectedBatch.batchId}.xlsx`);
  }

  downloadStatusReport(): void {
    if (!this.selectedBatch || this.statusResults.length === 0) return;

    const exportData = this.statusResults.map(entry => {
      const row: any = { 'Phone Number': entry.phone };
      this.selectedBatch!.paramFields.forEach((field, idx) => {
        row[field] = entry.params[idx] || '';
      });
      row['Status'] = entry.status;
      row['Failure Reason'] = entry.failure_reason;
      return row;
    });

    this.downloadExcel(exportData, `status_report_${this.selectedBatch.batchId}.xlsx`);
  }

  downloadFailedEntries(): void {
    if (!this.selectedBatch || this.failedEntries.length === 0) return;

    const exportData = this.failedEntries.map(entry => {
      const row: any = { 'Phone Number': entry.phone };
      this.selectedBatch!.paramFields.forEach((field, idx) => {
        row[field] = entry.params[idx] || '';
      });
      return row;
    });

    this.downloadExcel(exportData, `failed_${this.selectedBatch.batchId}.xlsx`);
  }

  private downloadExcel(data: any[], filename: string): void {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename);
  }

  getStatusClass(status: string): string {
    const upperStatus = status.toUpperCase();
    if (['READ', 'DELIVERED', 'SENT', 'ACCEPTED', 'SUCCESS'].includes(upperStatus)) {
      return 'bg-green-100 text-green-700';
    }
    if (upperStatus === 'FAILED' || upperStatus === 'ERROR') {
      return 'bg-red-100 text-red-700';
    }
    return 'bg-yellow-100 text-yellow-700';
  }

  drawerClose(): void {
    this.drawerService.drawerOpenWhatsAppHistorySubject.next(false);
  }
}