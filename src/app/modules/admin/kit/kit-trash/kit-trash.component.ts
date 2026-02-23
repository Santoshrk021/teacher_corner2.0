import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { KitComponent } from '../kit.component';
import { KitService } from '../kit.service';
import { DeletedKit } from '../kit.interface';
import { UiService } from 'app/shared/ui.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';

@Component({
  selector: 'app-kit-trash',
  templateUrl: './kit-trash.component.html',
  styleUrls: ['./kit-trash.component.scss']
})
export class KitTrashComponent implements OnInit, OnDestroy {

  deletedKits: DeletedKit[] = [];
  isLoading = true;

  private deletedKitsSub: Subscription;

  constructor(
    private kitComponent: KitComponent,
    private kitService: KitService,
    private uiService: UiService,
    private fuseConfirmationService: FuseConfirmationService
  ) { }

  ngOnInit(): void {
    this.deletedKitsSub = this.kitService.deletedKits$.subscribe(kits => {
      this.deletedKits = kits;
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    if (this.deletedKitsSub) {
      this.deletedKitsSub.unsubscribe();
    }
  }

  closeDrawer(): void {
    this.kitComponent.closeDrawer();
  }

  async permanentDelete(kit: DeletedKit): Promise<void> {
    const config = {
      title: 'Permanently Delete',
      message: `Are you sure you want to permanently delete "${kit.kitId}"? This action cannot be undone.`,
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
          await this.kitService.permanentDeleteKit(kit.docId);
          this.uiService.alertMessage('Deleted', `Kit "${kit.kitId}" permanently deleted`, 'success');
        } catch (error) {
          console.error('Error permanently deleting kit:', error);
          this.uiService.alertMessage('Error', 'Failed to delete kit', 'error');
        }
      }
    });
  }

  async emptyTrash(): Promise<void> {
    if (this.deletedKits.length === 0) {
      this.uiService.alertMessage('Info', 'Trash is already empty', 'info');
      return;
    }

    const config = {
      title: 'Empty Trash',
      message: `Are you sure you want to permanently delete all ${this.deletedKits.length} kit(s) in trash? This action cannot be undone.`,
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
          await this.kitService.emptyTrash();
          this.uiService.alertMessage('Success', 'Trash emptied successfully', 'success');
        } catch (error) {
          console.error('Error emptying trash:', error);
          this.uiService.alertMessage('Error', 'Failed to empty trash', 'error');
        }
      }
    });
  }

  async restoreKit(kit: DeletedKit): Promise<void> {
    const config = {
      title: 'Restore Kit',
      message: `Are you sure you want to restore "${kit.kitId}"?`,
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
          await this.kitService.restoreKit(kit);
          this.uiService.alertMessage('Restored', `Kit "${kit.kitId}" restored successfully`, 'success');
        } catch (error) {
          console.error('Error restoring kit:', error);
          this.uiService.alertMessage('Error', 'Failed to restore kit', 'error');
        }
      }
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'dispatched':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  trackByFn(index: number, item: DeletedKit): string {
    return item.docId || index.toString();
  }
}
