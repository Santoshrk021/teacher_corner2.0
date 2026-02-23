import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { EventService } from 'app/core/dbOperations/events/event.service';
import { Subject, take } from 'rxjs';
import { CreateSubmissionComponent } from '../create-submission/create-submission.component';
import { UserService } from 'app/core/dbOperations/user/user.service';

@Component({
  selector: 'app-event-card',
  templateUrl: './event-card.component.html',
  styleUrls: ['./event-card.component.scss']
})
export class EventCardComponent implements OnInit {

  private _unsubscribeAll: Subject<any> = new Subject<any>();
  selectedEvent = {
    rawEvent: {},
    allSubmissions: [],
    eventId: '',
    batchId: '',
    allowedSubmission: 0,
  };
  constructor(
    private activatedRoute: ActivatedRoute,
    private eventService: EventService,
    private dialog: MatDialog,
    private router: Router,
    private userService: UserService,

  ) { }
  privilege: boolean = false;

  ngOnInit(): void {
    if (this.activatedRoute.queryParams) {
      const routeSub = this.activatedRoute.queryParams.subscribe(async (res) => {
        // console.log(res);
        const eventId = res.eventId;
        const batchId = res.batchId;
        this.handleQueryParams(eventId, batchId);
      });
      // this.subcriptionArr.push(routeSub)
    }
    this.userService.userInfoSub.subscribe((userInfo) => {
      this.privilege = userInfo?.['accessLevel'] >= 10 ? true : false;
    });
  }

  handleQueryParams(eventId, batchId) {
    this.eventService.getSelectedEvent(eventId).pipe(take(1)).subscribe((event) => {
      const selectedBatch = this.eventService.getBatchs(event.batches, batchId);
      this.selectedEvent.allSubmissions = selectedBatch?.submissions != undefined ? selectedBatch?.submissions : [];
      this.selectedEvent.batchId = batchId;
      this.selectedEvent.eventId = eventId;
      this.selectedEvent.rawEvent = event;
      this.selectedEvent.allowedSubmission = selectedBatch.numberOfAllowedSubmissions;
    });
  }

  addNewSubm(submissionId?) {
    this.dialog.open(CreateSubmissionComponent, {
      data:submissionId? {...this.selectedEvent,submissionId:submissionId}:this.selectedEvent,
    });
  }

  getWorkflow(submId: string) {
    // console.log(submId);
    this.router.navigate(['workflow'],
      {
        queryParams: { submId: submId },
        relativeTo: this.activatedRoute,
        queryParamsHandling: 'merge'
      });
    this.eventService.currentEvent=this.selectedEvent;
  }
}
