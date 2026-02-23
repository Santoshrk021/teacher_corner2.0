import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { OutreachComponent } from '../outreach.component';
import { OutreachService } from '../outreach.service';
import { DeletedOutreach } from '../outreach.interface';
import { UiService } from 'app/shared/ui.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';

@Component({
  selector: 'app-outreach-trash',
  templateUrl: './outreach-trash.component.html',
  styleUrls: ['./outreach-trash.component.scss']
})
export class OutreachTrashComponent implements OnInit, OnDestroy {

  deletedOutreach: DeletedOutreach[] = [];
  isLoading = true;

  private deletedSub: Subscription;

  constructor(
    private outreachComponent: OutreachComponent,
    private outreachService: OutreachService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService
  ) { }

  ngOnInit(): void {
    this.deletedSub = this.outreachService.deletedOutreach$.subscribe(items => {
      this.deletedOutreach = items || [];
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    if (this.deletedSub) this.deletedSub.unsubscribe();
  }

  closeDrawer(): void {
    this.outreachComponent.closeDrawer();
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  async restore(item: DeletedOutreach): Promise<void> {
    const config = {
      title: 'Restore Outreach',
      message: 'Are you sure you want to restore this outreach record?',
      icon: {
        name: 'mat_outline:restore_from_trash',
        color: 'primary' as const
      },
      actions: {
        confirm: {
          label: 'Restore',
          color: 'primary' as const
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          await this.outreachService.restoreOutreach(item);
          this.uiService.alertMessage('Restored', 'Outreach restored successfully', 'success');
        } catch (e) {
          console.error(e);
          this.uiService.alertMessage('Error', 'Failed to restore', 'error');
        }
      }
    });
  }

  async permanentDelete(item: DeletedOutreach): Promise<void> {
    const config = {
      title: 'Permanently Delete',
      message: 'Are you sure you want to permanently delete this outreach record? This action cannot be undone.',
      icon: {
        name: 'mat_outline:delete_forever',
        color: 'warn' as const
      },
      actions: {
        confirm: {
          label: 'Delete Forever',
          color: 'warn' as const
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          await this.outreachService.permanentDelete(item.docId);
          this.uiService.alertMessage('Deleted', 'Outreach permanently deleted', 'success');
        } catch (e) {
          console.error(e);
          this.uiService.alertMessage('Error', 'Failed to delete', 'error');
        }
      }
    });
  }

  async emptyTrash(): Promise<void> {
    if (!this.deletedOutreach?.length) {
      this.uiService.alertMessage('Info', 'Trash is already empty', 'info');
      return;
    }

    const config = {
      title: 'Empty Trash',
      message: `Are you sure you want to permanently delete all ${this.deletedOutreach.length} record(s) in trash? This action cannot be undone.`,
      icon: {
        name: 'mat_outline:delete_forever',
        color: 'warn' as const
      },
      actions: {
        confirm: {
          label: 'Empty Trash',
          color: 'warn' as const
        }
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        try {
          await this.outreachService.emptyTrash();
          this.uiService.alertMessage('Success', 'Trash emptied successfully', 'success');
        } catch (e) {
          console.error(e);
          this.uiService.alertMessage('Error', 'Failed to empty trash', 'error');
        }
      }
    });
  }

  trackByFn(index: number, item: DeletedOutreach): string {
    return item.docId || index.toString();
  }
}
