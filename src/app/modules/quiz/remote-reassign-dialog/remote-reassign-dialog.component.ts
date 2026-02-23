import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { KitService } from 'app/modules/admin/kit/kit.service';
import { Kit, KitRemote } from 'app/modules/admin/kit/kit.interface';
import { UiService } from 'app/shared/ui.service';

export type RemoteReassignTarget =
  | { kind: 'teacher'; currentMac: string }
  | { kind: 'student'; studentDocId: string; accessCode: string; slotNumber: number; currentMac: string };

export interface RemoteReassignDialogData {
  kitDocId: string;
  usedMacs: string[];
  target: RemoteReassignTarget;
}

export interface RemoteReassignDialogResult {
  saved: boolean;
  target: RemoteReassignTarget;
  newMac: string;
}

@Component({
  selector: 'app-remote-reassign-dialog',
  templateUrl: './remote-reassign-dialog.component.html',
  styleUrls: ['./remote-reassign-dialog.component.scss']
})
export class RemoteReassignDialogComponent implements OnInit {
  loading = true;
  kit: Kit | null = null;
  availableRemotes: KitRemote[] = [];
  selectedMac: string | null = null;

  constructor(
    public dialogRef: MatDialogRef<RemoteReassignDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RemoteReassignDialogData,
    private kitService: KitService,
    private uiService: UiService,
    private cdRef: ChangeDetectorRef,
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    this.loading = true;
    try {
      const kitDoc = await firstValueFrom(this.kitService.getKitById(this.data.kitDocId));
      this.kit = kitDoc || null;
      this.buildAvailableRemotes();
    } finally {
      this.loading = false;
      this.cdRef.detectChanges();
    }
  }

  private normalizeMac(mac?: string): string {
    return (mac || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  private buildAvailableRemotes(): void {
    const kit = this.kit;
    if (!kit) {
      this.availableRemotes = [];
      return;
    }

    const used = new Set<string>((this.data.usedMacs || []).map(m => this.normalizeMac(m)).filter(m => !!m));

    const allowedRoles: Array<'teacher' | 'student' | 'spare'> =
      this.data.target.kind === 'teacher'
        ? ['teacher', 'spare']
        : ['student', 'spare'];

    const all: KitRemote[] = [
      ...(kit.teacherRemotes || []),
      ...(kit.studentRemotes || []),
      ...(kit.spareRemotes || []),
    ];

    this.availableRemotes = all
      .filter(r => allowedRoles.includes(r.role))
      .filter(r => !used.has(this.normalizeMac(r.mac)))
      .sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

    if (this.availableRemotes.length === 0) {
      this.uiService.alertMessage('Info', 'No unused remotes available in this kit', 'info');
    }
  }

  canSave(): boolean {
    return !!this.selectedMac;
  }

  save(): void {
    const mac = this.normalizeMac(this.selectedMac || '');
    if (!mac) {
      this.uiService.alertMessage('Error', 'Please select a remote', 'error');
      return;
    }

    const result: RemoteReassignDialogResult = {
      saved: true,
      target: this.data.target,
      newMac: mac,
    };

    this.dialogRef.close(result);
  }

  close(): void {
    this.dialogRef.close(null);
  }
}
