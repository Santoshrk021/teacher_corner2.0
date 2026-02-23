import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EventWorkshopDialogComponent } from './event-workshop-dialog/event-workshop-dialog.component';
import { EventService } from 'app/core/dbOperations/events/event.service';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss']
})
export class EventsComponent implements OnInit {

  constructor(
    public dialog: MatDialog,
    private eventService: EventService
    ) { }

  ngOnInit(): void {
  }

  async createEvent(type) {
    this.eventService.eventType=type;
    await import('./event-workshop-dialog/event-workshop-dialog.module');
    this.dialog.open(EventWorkshopDialogComponent, {
    });


  }
}
