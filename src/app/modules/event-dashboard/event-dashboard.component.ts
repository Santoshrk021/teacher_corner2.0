import { Component, ElementRef, OnInit } from '@angular/core';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { EventDashboardService } from './event-dashboard.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { EventService } from 'app/core/dbOperations/events/event.service';
import { AssignmentsService } from 'app/core/dbOperations/assignments/assignments.service';
import { EventWorkflowService } from 'app/core/dbOperations/eventworkflows/event-workflow.service';
import { Sort } from '@angular/material/sort';
import { SortingService } from 'app/shared/sorting.service';

@Component({
  selector: 'app-event-dashboard',
  templateUrl: './event-dashboard.component.html',
  styleUrls: ['./event-dashboard.component.scss']
})
export class EventDashboardComponent implements OnInit {
  batchSubs: number = 0;
  totalSubs: number = 0;
  allSubsInBatch: any;
  headingNos: number = 0;
  headings: any[] = [];
  submissionPath: any = [];
  allSubsInBatchFilter: any = [];
  savedSortEvent: any;
  constructor(
    private drawerService: FuseDrawerService,
    private eventDashboardService: EventDashboardService,
    private teacherService: TeacherService,
    private assignmentsService: AssignmentsService,
    private eventWorkflowService: EventWorkflowService,
  ) {
    this.eventDashboardService.eventInfoBSub.subscribe((res) => {

      this.finalSubSpinner = true;
      this.totalSubsOfBatchSpinner = true;
      this.eventInfo = res;
      this.getAllsubmission(this.eventInfo);
      const firstBatch = this.eventInfo.batches[0];

      this.batchInfo = firstBatch;
      this.headingNos = res.batches[0].submissions.length;

      setTimeout(() => {
        this.onBatchSelect(firstBatch);
      }, 3000);
    });
  }

  batchInfo;
  eventInfo;
  batchesObj = {};
  finalSubsNo: number = 0;
  totalSubsOfBatch: number = 0;
  finalSubSpinner = true;
  totalSubsOfBatchSpinner = true;
  ngOnInit(): void {



  }
  calculateGridColumnStyle(): object {
    const columnCount = 6 + (this.submissionPath ? this.submissionPath.length : 0);
    return { 'grid-template-columns': `repeat(${columnCount}, 1fr)` };
  }
  drawerClose() {
    this.drawerService.drawerOpenEventSubject.next(false);
  }

  onBatchSelect(batchInfo) {

    this.allSubsInBatch = [];
    this.batchInfo = batchInfo;
    this.headingNos = batchInfo.submissions.length;
    if (this.batchesObj.hasOwnProperty(batchInfo.batchId)) {
      const values = Object.values(this.batchesObj[batchInfo.batchId]);
      const allSubsInBatchDocs = values.flat();

      this.workflowInfo(batchInfo);
      this.totalSubsOfBatch = allSubsInBatchDocs.length;
      this.totalSubsOfBatchSpinner = false;
      allSubsInBatchDocs.forEach((doc: any) => {
        this.assignmentsService.getEventSubmission(this.eventInfo.docId, doc.docId).subscribe((res: any) => {

          this.getSubmissions(res.data(), batchInfo.batchId);
          this.allSubsInBatch.push({
            // ...this.getSubmissions(res.data(),batchInfo.batchId)
            ...doc,
            ...res.data()
          });
          this.allSubsInBatchFilter.push({
            // ...this.getSubmissions(res.data(),batchInfo.batchId)
            ...doc,
            ...res.data()
          });


        });
      });

      setTimeout(() => {

        this.sortFirstTime();
      }, 2000);
    }


    else {
      this.totalSubsOfBatch = 0;
      this.totalSubsOfBatchSpinner = false;

    }

  }


  sortFirstTime() {
    const sort: Sort = {
      'active': 'name',
      'direction': 'asc'
    };
    this.sortData(sort);
  }
  workflowInfo(batchInfo: any) {
    this.submissionPath = [];
    const submissions: [] = batchInfo.submissions;
    this.headings = [];
    submissions.forEach((subInfo: any) => {
      const wfId = subInfo.workflowId;
      this.eventWorkflowService.getEventWorkflowByGet(wfId).subscribe((res) => {
        const wfData = res.data();
        const assignmentPaths = [];
        const headingsInSubmission = [];


        wfData.workflowSteps.forEach((step) => {
          // if (step.type == "ASSIGNMENT" || step.type == "VIDEO" || step.type == "SUBJECT") {
          //   headingsInSubmission.push(step?.eventStepName)
          //   step?.contents.forEach((c, index) => {

          //     // let path="batchId-"+batchInfo.batchId+'.'+"submId-"+subInfo.submissionId+'.'+"assignmentId-"+c.assignmentId+'.'+this.removeLeadingZeros(index+1)+".submissionPath"
          //     // let path=`['batchId-${batchInfo.batchId}']['submId-${subInfo.submissionId}']['assignmentId-${c.assignmentId}']['${this.removeLeadingZeros(index+1)}']['submissionPath']`
          //     let path = {
          //       batch: `batchId-${batchInfo.batchId}`,
          //       submId: `submId-${subInfo.submissionId}`,
          //       assignmentId: `assignmentId-${c.assignmentId}`,
          //       folderPath: `${this.removeLeadingZeros(index + 1)}`,
          //       submissionPath: 'submissionPath'
          //     };
          //     assignmentPaths.push(path)
          //   })
          // }
          headingsInSubmission.push(step?.eventStepName);
          step?.contents.forEach((c, index) => {
            if (c.contentType=='ASSIGNMENT') {
              const path = {
                batch: `batchId-${batchInfo.batchId}`,
                submId: `submId-${subInfo.submissionId}`,
                assignmentId: `assignmentId-${c.assignmentId}`,
                folderPath: `${this.removeLeadingZeros(index + 1)}`,
                submissionPath: 'submissionPath'
              };
              assignmentPaths.push(path);
            }

          });
        });
        this.headings.push(headingsInSubmission);

        this.submissionPath.push(assignmentPaths);


      });
    });
  }
  removeLeadingZeros(number) {
    // Convert the number to a string and parse it back to a number
    // This removes any leading zeros.
    return Number(number.toString());
  }
  getSubmissions(docData, batchId) {

    const subValues = Object.values(docData[`batchId-${batchId}`]);
    const asgnValues = Object.values(subValues[0]);


  }
  getAllsubmission(eventInfo) {

    this.eventInfo.batches.forEach((b) => {
      if (!b.submissions.length) {
        this.finalSubSpinner = false;
      }
      b.submissions.forEach(async (s) => {
        const query: QueryFn = (ref: CollectionReference) => ref.where(`eventSubmissions.eventId_${eventInfo.docId}.batchId_${b.batchId}.submId_${s.submissionId}.isSubmitted`, '==', true);
        // const query: QueryFn = (ref: CollectionReference) => ref.where(`eventSubmissions.eventId_RUP15rPmasOWdIEVRVJA.batchId_660ch.submId_q1eEp8ePk1rLV8F6o3ir.isSubmitted`, '==', true)
        this.teacherService.getWithQuery(query).subscribe((res) => {

          this.finalSubSpinner = false;
          if (res.length) {
            this.finalSubsNo = res.length;
            if (this.batchesObj.hasOwnProperty(b.batchId)) {
              this.batchesObj[b.batchId] = {
                ...this.batchesObj[b.batchId],
                [s.submissionId]: res
              };
            }
            else {

              this.batchesObj[b.batchId] = {
                [s.submissionId]: res
              };
            }
          }
        });


      });
    });
  }

  search(event) {
    this.allSubsInBatch = [];
    const searchTerm = event.target.value;
    if (searchTerm && searchTerm.trim() != '') {
      this.allSubsInBatch = this.allSubsInBatchFilter.filter((teacherInfo) => {
        const phn = teacherInfo?.teacherMeta?.countryCode + teacherInfo?.teacherMeta?.phoneNumber;

        return (
          teacherInfo.teacherMeta.firstName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          teacherInfo.teacherMeta.lastName
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          phn
            .toString()
            .toLowerCase()
            .includes(searchTerm) ||
          teacherInfo.teacherMeta.email
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        );
      });
    }
    else {
      this.allSubsInBatch = this.allSubsInBatchFilter;
    }
  }


  sortData(sort: Sort) {
    const data = this.allSubsInBatch.slice();
    if (!sort.active || sort.direction === '') {
      this.allSubsInBatch = data;
      return;
    }

    this.allSubsInBatch = data.sort((a, b) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'name':
          return compare(a['teacherMeta']['firstName'], b['teacherMeta']['firstName'], isAsc);
        case 'phone':
          return compare(a['teacherMeta']['phone'], b['teacherMeta']['phone'], isAsc);
        case 'email':
          return compare(a['teacherMeta']['email'], b['teacherMeta']['email'], isAsc);
        case 'gender':
          return compare(a['teacherMeta']['gender'], b['teacherMeta']['gender'], isAsc);
        case 'age':
          return compare(a['teacherMeta']['age'], b['teacherMeta']['age'], isAsc);
        default:
          return 0;
      }
    });

    function compare(a: number | string, b: number | string, isAsc: boolean) {
      return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
    }
  }


  textSlice(textString: string) {
    if (textString.length > 20) {
      return textString.slice(0, 17) + '...';
    }
    else {
      return textString;
    }
  }

  copyToClipboard(text: string | undefined): void {
    if (text) {
      // Copy the 'text' to clipboard here (you can use document.execCommand('copy') or Clipboard API)
      // For simplicity, I'll use the Clipboard API here:
      navigator.clipboard.writeText(text).then(() => {
        console.info('Copied to clipboard:', text);
      }).catch((error) => {
        console.error('Failed to copy:', error);
      });
    }
  }
}
