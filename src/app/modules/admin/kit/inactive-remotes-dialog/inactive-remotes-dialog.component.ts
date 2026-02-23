import { ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Subscription } from 'rxjs';
import { UsbService } from 'app/usb.service';
import { Kit, NotWorkingRemoteEntry } from '../kit.interface';
import { KitService } from '../kit.service';
import { UiService } from 'app/shared/ui.service';

export interface InactiveRemotesDialogData {
  kitDocId: string;
}

@Component({
  selector: 'app-inactive-remotes-dialog',
  templateUrl: './inactive-remotes-dialog.component.html',
  styleUrls: ['./inactive-remotes-dialog.component.scss']
})
export class InactiveRemotesDialogComponent implements OnInit, OnDestroy {
  loading = true;
  saving = false;

  kit: Kit | null = null;
  inactiveEntries: NotWorkingRemoteEntry[] = [];
  selectedEntry: NotWorkingRemoteEntry | null = null;

  listening = false;
  capturedMac: string | null = null;

  private usbSub: Subscription | null = null;

  constructor(
    public dialogRef: MatDialogRef<InactiveRemotesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InactiveRemotesDialogData,
    private kitService: KitService,
    public usbService: UsbService,
    private uiService: UiService,
    private cdRef: ChangeDetectorRef,
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  ngOnDestroy(): void {
    if (this.usbSub) this.usbSub.unsubscribe();
  }

  private normalizeMac(mac?: string): string {
    return (mac || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  private formatMac(mac?: string): string {
    const hex = this.normalizeMac(mac);
    if (hex.length !== 12) return (mac || '').toLowerCase();
    const pairs = hex.match(/.{1,2}/g) || [];
    return pairs.join(':');
  }

  async reload(): Promise<void> {
    this.loading = true;
    this.capturedMac = null;
    this.selectedEntry = null;

    try {
      const kitDoc = await firstValueFrom(this.kitService.getKitById(this.data.kitDocId));
      this.kit = kitDoc || null;

      const entries: NotWorkingRemoteEntry[] = Array.isArray(this.kit?.notWorkingRemoteEntries)
        ? (this.kit?.notWorkingRemoteEntries as NotWorkingRemoteEntry[])
        : [];

      const merged = [...entries];

      // Dedupe by (role,slot,mac) for proper entries; legacy kept if no matching proper entry exists
      const seen = new Set<string>();
      const uniq: NotWorkingRemoteEntry[] = [];
      merged.forEach((e) => {
        const key = `${e.role}-${Number(e.slotNumber || 0)}-${this.normalizeMac(e.mac)}`;
        if (seen.has(key)) return;
        seen.add(key);
        uniq.push({
          id: e?.id || `nw-${key}`,
          mac: this.formatMac(e.mac),
          role: e.role,
          slotNumber: Number(e.slotNumber || 0),
        } as any);
      });

      // Sort: teacher, student(slot asc), spare(slot asc)
      const roleOrder: any = { teacher: 0, student: 1, spare: 2 };
      uniq.sort((a, b) => {
        const ra = roleOrder[a.role] ?? 9;
        const rb = roleOrder[b.role] ?? 9;
        if (ra !== rb) return ra - rb;
        return Number(a.slotNumber || 0) - Number(b.slotNumber || 0);
      });

      this.inactiveEntries = uniq;
      this.selectedEntry = this.inactiveEntries?.[0] ?? null;
    } finally {
      this.loading = false;
      this.cdRef.detectChanges();
    }
  }

  selectEntry(e: NotWorkingRemoteEntry): void {
    this.selectedEntry = e;
    this.capturedMac = null;
  }

  isReplaceableEntry(e: NotWorkingRemoteEntry | null): boolean {
    return !!e && !!e.role && Number(e.slotNumber || 0) > 0;
  }

  async connectUsb(): Promise<void> {
    if (this.usbService.isConnected) return;
    const ok = await this.usbService.tryAutoReconnect();
    if (ok) return;
    const granted = await this.usbService.requestReceiverFromUser();
    if (!granted) {
      this.uiService.alertMessage('USB Error', 'USB receiver permission not granted', 'error');
      return;
    }
    const setupOk = await this.usbService.setupReceiver();
    if (!setupOk) {
      this.uiService.alertMessage('USB Error', 'Failed to setup USB receiver', 'error');
      return;
    }
    this.usbService.resetRemotes();
    this.usbService.startListening();
  }

  startListening(): void {
    this.capturedMac = null;
    this.listening = true;

    if (this.usbSub) this.usbSub.unsubscribe();
    this.usbSub = this.usbService.remoteSignal$.subscribe(({ MAC }) => {
      const mac = this.formatMac(MAC);
      if (!mac) return;
      this.capturedMac = mac;
      this.listening = false;
      this.cdRef.detectChanges();
    });
  }

  stopListening(): void {
    this.listening = false;
    if (this.usbSub) {
      this.usbSub.unsubscribe();
      this.usbSub = null;
    }
  }

  canReplace(): boolean {
    return !!this.kit?.docId && this.isReplaceableEntry(this.selectedEntry) && !!this.capturedMac && !this.saving;
  }

  async replaceRemote(): Promise<void> {
    if (!this.kit?.docId) return;
    if (!this.selectedEntry) return;
    if (!this.isReplaceableEntry(this.selectedEntry)) {
      this.uiService.alertMessage('Error', 'This inactive remote does not have slot info. Please re-add it using the new flow.', 'error');
      return;
    }
    if (!this.capturedMac) {
      this.uiService.alertMessage('Error', 'Please capture a new remote MAC', 'error');
      return;
    }

    this.saving = true;
    try {
      await this.kitService.replaceKitRemoteByInactiveEntry(this.kit.docId, this.selectedEntry, this.capturedMac);
      this.uiService.alertMessage('Updated', 'Remote replaced successfully', 'success');
      await this.reload();
    } catch (e) {
      console.error(e);
      this.uiService.alertMessage('Error', 'Failed to replace remote', 'error');
    } finally {
      this.saving = false;
      this.cdRef.detectChanges();
      setTimeout(() => {
        this.reload();
      }, 500);
    }
  }

  close(): void {
    this.dialogRef.close(true);
  }
}
