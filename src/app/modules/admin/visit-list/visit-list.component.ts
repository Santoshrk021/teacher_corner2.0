import { Component, OnInit } from '@angular/core';
import { Sort } from '@angular/material/sort';
import { VisitServiceService } from 'app/core/dbOperations/visit/visit-service.service';
import { SortingService } from 'app/shared/sorting.service';
import { visit } from 'graphql';
import { BehaviorSubject } from 'rxjs';
import { ExportComponent } from '../components/export/export.component';
import { MatDialog } from '@angular/material/dialog';
import { VisitexportComponent } from './visitexport/visitexport.component';

@Component({
  selector: 'app-visit-list',
  templateUrl: './visit-list.component.html',
  styleUrls: ['./visit-list.component.scss']
})
export class VisitListComponent implements OnInit {
  allvisits: any[] = [];
  savedSortEvent: Sort;
  isScrollLoading = false;
  isFirstTime = false;
  visitsBsub = new BehaviorSubject(null);

  loadingMessage = '';
  show = false;
  infinityScrollLocked: boolean = false;
  searchTerm: string;
  component: any;
  drawerOpened = false;
  totalCount: any;
  loading: boolean = false;
  constructor(private visitService: VisitServiceService,
    private sortingService: SortingService,
    private dialog: MatDialog
  ) { }

  async ngOnInit() {
    this.loading = true;
    const visitDocs = await this.visitService.getAllVisitsfrommaster();

    const uninfiedData= this.getUnifiedData(visitDocs);
     this.visitsBsub.next(uninfiedData);
    this.totalCount = uninfiedData.length;
    // Show only first 30 initially
    this.allvisits = uninfiedData.slice(0, 30);
    this.loadingMessage = `Loaded ${this.allvisits?.length} of ${this.totalCount} entries`;
    this.loading = false;
    // Apply default sort: latest Visit Start Timestamp on top
    this.sortData({ active: 'visitStartTimestamp', direction: 'desc' } as Sort);
  }

  getUnifiedData(visitDocs: any) {
    const arrayofvistArrays = [];
    visitDocs.forEach((item) => {

      arrayofvistArrays.push(Object.values(item.visits).map((item: any) => ({
        ...item, visitorName: item.visitorfirstName + ' ' + item.visitorlastName, visitRecipient: item?.institutionName || item?.organizationName || item?.vendorName
          || item.organization
      })));

    });
    // Flatten and normalize types for template-safe usage (avoid calling .trim on numbers)
    const flat = arrayofvistArrays.flat();
    return flat.map((v: any) => ({
      ...v,
      vistorPhone: v?.vistorPhone != null ? String(v.vistorPhone) : '',
      visitorEmail: v?.visitorEmail != null ? String(v.visitorEmail) : '',
      visitorName: v?.visitorName != null ? String(v.visitorName) : '',
      visitRecipient: v?.visitRecipient != null ? String(v.visitRecipient) : '',
      visitType: v?.visitType != null ? String(v.visitType) : '',
      ActualTimeDifferenceinString: v?.ActualTimeDifferenceinString != null ? String(v.ActualTimeDifferenceinString) : '',
      purpose: v?.purpose != null ? String(v.purpose) : ''
    }));

  }

  search(event: Event | string) {
    const val = this.searchTerm = this.sortingService.checkType(event);
    if (val !== undefined && val != '') {
      if (val && val.trim() != '') {
        this.infinityScrollLocked = true;
        this.allvisits = this.visitsBsub?.value?.filter(item => ((item?.vistorPhone?.length >= 1 && item?.vistorPhone?.toString()?.toLowerCase()?.includes(val?.toLowerCase())
          || ((item?.visitorEmail?.length >= 1) && (item?.visitorEmail?.toLowerCase()?.includes(val?.toLowerCase())))
          || ((item?.visitorName?.toLowerCase()) && (item?.visitorName?.toLowerCase())?.includes(val?.toLowerCase()))
          || ((item?.visitType?.toLowerCase()) && (item?.visitType?.toLowerCase())?.includes(val?.toLowerCase()))
          || ((item?.visitRecipient?.toLowerCase()) && (item?.visitRecipient?.toLowerCase())?.includes(val?.toLowerCase()))

          || (item?.docId?.length >= 1 && item?.docId?.toLowerCase()?.includes(val?.toLowerCase()))
        )));
      }
      this.loadingMessage = `${this.allvisits?.length} search results found`;
    }
    else {
        this.infinityScrollLocked = false;
        this.allvisits = this.visitsBsub.value?.slice(0, 30);
      this.loadingMessage = `Loaded ${this.allvisits?.length} of ${this.totalCount} entries`;
    }
  }

  toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate().getTime();           // Firestore Timestamp
    if (typeof value === 'object' && 'seconds' in value) {
      const s = Number(value.seconds ?? 0), n = Number(value.nanoseconds ?? 0);
      if (!s && !n) return null;
      return s * 1000 + Math.floor(n / 1e6);
    }
    if (typeof value === 'number') return value < 1e12 ? value * 1000 : value;        // sec→ms
    if (value instanceof Date) return value.getTime();
    return null;
  }

  exportDialog(): void {
    const dialogRef = this.dialog.open(VisitexportComponent, {
      width: '500px',
    });

  }



  onScroll($event) {
    // Infinite scroll: when not searching, append 10 more and update message
    if (this.infinityScrollLocked) return;
    const fullList = this.visitsBsub?.value || [];
    if (!Array.isArray(fullList)) return;
    if (this.allvisits?.length < this.totalCount) {
      const next = fullList.slice(0, this.allvisits.length + 10);
      this.allvisits = next;
      this.loadingMessage = `Loaded ${this.allvisits?.length} of ${this.totalCount} entries`;
    }
  }
  sortData(sort: Sort) {
    const labels = ['visitorName', 'vistorPhone', 'visitRecipient', 'visitorEmail', 'visitType', 'visitEnded', 'ActualTimeDifferenceinString', 'purpose', 'visitStartTimestamp', 'vistEndTimestamp'];
    const defaultLabel = 'visitStartTimestamp';
    this.savedSortEvent = sort;
    this.allvisits = this.sortingService.sortFunction(sort, labels, this.allvisits, defaultLabel);
  }

  copyToClipboard(text: string | undefined): void {
    const s = text == null ? '' : String(text);
    if (s) {
      navigator.clipboard.writeText(s).then(() => {
        console.info('Copied to clipboard:', s);
      }).catch((error) => {
        console.error('Failed to copy:', error);
      });
    }
  }


}
