import { Component, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UsbService } from 'app/usb.service';
import { RemoteDialogComponent } from './remote-connect-dialog/remote-dialog.component';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UiService } from 'app/shared/ui.service';
import { Subscription } from 'rxjs';
import { RemoteEventsService, RemoteEvent } from 'app/shared/remote-events.service';

@Component({
  selector: 'app-remote-connect',
  templateUrl: './remote-connect.Component.html'
})
export class RemoteConnectComponent implements OnDestroy {
  connected = false;
  currentUserName: string;
  currentUserId: string;
  public receiverDocId: string;

  latestRemoteEvents: RemoteEvent[] = [];
  private latestSub?: Subscription;

  constructor(
    private usbService: UsbService,
    private dialog: MatDialog,
    private afAuth: AngularFireAuth,
    private uiService: UiService,
   private remoteEventsService: RemoteEventsService
  ) {}

  async ngOnInit() {
    this.currentUserId = (await this.afAuth.currentUser)?.uid;

    // ✅ Subscribe via service (shared stream)
    this.latestSub = this.remoteEventsService
      .getLatestEvents$(50, 'SnappyRemoteEvents') // use Latest collection
      .subscribe({
        next: (docs) => (this.latestRemoteEvents = docs),
        error: (err) => console.error('❌ Firestore listen failed:', err)
      });

      console.log('Latest Remote Events:', this.latestRemoteEvents);
  }

  ngOnDestroy() {
    this.latestSub?.unsubscribe();
  }

  async connect() {
    const granted = await this.usbService.requestReceiverFromUser();
    if (!granted) {
      this.connected = false;
      return;
    }

    const setupOk = await this.usbService.setupReceiver();
    this.connected = setupOk;

    if (this.connected) {
      this.dialog.open(RemoteDialogComponent, {
        width: '95vw',
        maxHeight: '90vh',
        data: this.receiverDocId
      });

      this.usbService.startListening();
    }
  }

  trackByMacId(_: number, item: RemoteEvent) {
    return item.id || item.macId;
  }
}
