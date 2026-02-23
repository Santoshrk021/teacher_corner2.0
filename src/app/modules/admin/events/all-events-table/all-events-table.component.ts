import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { EventService } from 'app/core/dbOperations/events/event.service';
import { EventWorkshopDialogComponent } from '../event-workshop-dialog/event-workshop-dialog.component';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UiService } from 'app/shared/ui.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { EventDashboardComponent } from 'app/modules/event-dashboard/event-dashboard.component';
import { EventDashboardService } from 'app/modules/event-dashboard/event-dashboard.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-all-events-table',
  templateUrl: './all-events-table.component.html',
  styleUrls: ['./all-events-table.component.scss']
})
export class AllEventsTableComponent implements OnInit {
  allEvents: any;
  component;
  drawerOpened: any = false;

  constructor(
    private eventService: EventService,
    private dialog: MatDialog,
    private fuseConfirmationService: FuseConfirmationService,
    private uiService: UiService,
    private drawerService: FuseDrawerService,
    private eventDashboardService: EventDashboardService,

  ) {
    this.drawerService.drawerOpenEventSubject.subscribe((res) => {
      this.drawerOpened = res;
    });
  }

  async ngOnInit() {
    this.allEvents = await (firstValueFrom(this.eventService.getAllEvents()));
    const h=this.allEvents.sort((a, b) => {
        if (a.startDate.seconds === b.startDate.seconds) {
            return  b.startDate.nanoseconds-a.startDate.nanoseconds;
        }
        return b.startDate.seconds- a.startDate.seconds;
    });
    this.allEvents=h;

  }
  async onClickEdit(eventInfo) {
    await import('../event-workshop-dialog/event-workshop-dialog.module');
    this.dialog.open(EventWorkshopDialogComponent, {
      data: {
        eventInfo
      }
    });
  }

  onDelete(event) {
    const name = event.eventTitle;
    const config = {
      title: 'Delete Event',
      message: `Are you sure you want to delete "${name}" ?`,
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        await this.eventService.addTrashEvent(event.docId, event);
        await this.eventService.deleteEvent(event.docId);
        this.uiService.alertMessage('Deleted', `The "${name}" has been deleted`, 'warning');
      }
    });
  }

  async submissionDashboard(event){
    await import('app/modules/event-dashboard/event-dashboard.module').then(() => {
      this.component = EventDashboardComponent;
    });
    this.drawerService.drawerOpenEventSubject.next(true);
    this.eventDashboardService.eventInfoBSub.next(event);
  }


}
