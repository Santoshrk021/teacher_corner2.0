import { Component, ChangeDetectorRef, Inject } from '@angular/core';
import { UsbService } from 'app/usb.service';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { UiService } from 'app/shared/ui.service';
import { arrayUnion } from '@angular/fire/firestore';
import { firstValueFrom } from 'rxjs';

interface Remote {
  mac: string;
  name: string;
}

@Component({
  selector: 'app-remote-dialog',
  templateUrl: './remote-dialog.component.html'
})
export class RemoteDialogComponent {
  remotes: Remote[] = [];
  batchNumber: number = 0;
  numberBoxes: number[] = [];
  registeredCount: number = 0;

  constructor(
    private dialogRef: MatDialogRef<RemoteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data,
    private usbService: UsbService,
    private cdRef: ChangeDetectorRef,
    private afs: AngularFirestore,
    private uiService: UiService
  ) { }

  async ngOnInit() {
    this.usbService.remotes$.subscribe((remotes) => {
      // Just assign flat remotes with default names, no Firestore query
      this.remotes = remotes.map((r, index) => ({
        mac: r.mac,
        name: `Remote ${index + 1}`
      }));

      this.registeredCount = this.remotes.length;
      this.cdRef.detectChanges();
    });
  }


  removeRemote(mac: string) {
    // Remove from usbService
    this.usbService.removeRemoteByMac(mac);

    // Update local remotes list
    this.remotes = this.usbService.getConnectedRemotes().map((r, i) => ({
      mac: r.mac,
      name: `Remote ${i + 1}`
    }));

    this.registeredCount = this.remotes.length;
    this.cdRef.detectChanges();
  }

  close() {
    this.dialogRef.close();
  }

  generateBoxes() {
    if (this.batchNumber > 0) {
      this.numberBoxes = Array.from({ length: this.batchNumber }, (_, i) => i + 1);
    } else {
      this.numberBoxes = [];
    }
  }

  addRemoteDetailsToDB() {
    if (this.remotes.length === 0) {
      console.warn('No remotes to save.');
      return;
    }

    const allMacs = this.remotes.map(r => r.mac);

    const masterDocRef = this.afs.collection('Master').doc('snappyRemotes');

    masterDocRef.get().toPromise()
      .then(docSnap => {
        const existingData = docSnap.data() as { remotes?: any[] } | undefined;
        const rawRemotes = existingData?.remotes || [];

        // Normalize existingRemotes to plain strings (in case they are objects)
        const existingRemotes: string[] = rawRemotes.map(item => {
          if (typeof item === 'string') return item;
          if (item?.mac) return item.mac; // handle object {mac: 'xx'}
          return String(item);
        });

        // Filter out duplicates
        const newMacs = allMacs.filter(mac => !existingRemotes.includes(mac));

        if (newMacs.length === 0) {
          this.uiService.alertMessage('Info', 'No new remotes to add — all are already registered.', 'info');
          return Promise.reject('No new remotes');
        }

        return masterDocRef.set(
          {
            remotes: arrayUnion(...newMacs)
          },
          { merge: true }
        );
      })
      .then(() => {
        this.dialogRef.close();
        this.uiService.alertMessage('success', '✅ New remotes saved successfully!', 'success');
      })
      .catch(error => {
        if (error !== 'No new remotes') {
          console.error('❌ Failed to save MACs:', error);
          this.uiService.alertMessage('Error', 'Failed to save remotes.', 'error');
        }
      });
  }


}
