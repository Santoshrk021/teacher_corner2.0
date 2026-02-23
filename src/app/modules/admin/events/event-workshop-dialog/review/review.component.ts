import { Component, Input, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { EventService } from 'app/core/dbOperations/events/event.service';
import { UiService } from 'app/shared/ui.service';
import { EventWorkshopDialogComponent } from '../event-workshop-dialog.component';

@Component({
  selector: 'app-review',
  templateUrl: './review.component.html',
  styleUrls: ['./review.component.scss']
})
export class ReviewComponent implements OnInit {
  @Input() eventInfo;
  @Input() eventBatchInfo;
  @Input() eventBasicInfo;
  btnDisable: boolean = false;

  constructor(
    private eventService: EventService,
    private uiService: UiService,
    private dialogRef: MatDialogRef<EventWorkshopDialogComponent>,

  ) { }

  ngOnInit(): void {
  }

  onSave(docId){
    this.btnDisable=true;

    const eventDoc={
      ...this.eventBasicInfo,
      startDate:new Date(this.eventBasicInfo.startDate),
      endDate:new Date(this.eventBasicInfo.endDate),
      batches:this.eventBatchInfo?.batches.map(d=>({
          ...d,
          startDate:d?.startDate? new Date(d?.startDate):'',
          endDate:d?.endDate?new Date(d?.endDate):''
        }))
    };


    if (docId != undefined) {
      docId = docId;

      this.eventService.updateEvent(eventDoc, docId);
      this.uiService.alertMessage('Successfully', 'Contest has been Updated', 'success');
    } else {
      this.eventService.addEvent(eventDoc);
      this.uiService.alertMessage('Successfully', 'Contest has been Added', 'success');
    }
    this.dialogRef.close();
    this.btnDisable = false;
  }
}
