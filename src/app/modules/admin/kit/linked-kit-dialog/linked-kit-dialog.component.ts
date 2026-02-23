import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { KitService } from '../kit.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { UiService } from 'app/shared/ui.service';
import { Kit } from '../kit.interface';
import { firstValueFrom } from 'rxjs';
import firebase from 'firebase/compat/app';

export interface LinkedKitDialogData {
  institutionId: string;
  classroomId: string;
}

export interface LinkedKitItem {
  kitDocId: string;
  kitName: string;
}

@Component({
  selector: 'app-linked-kit-dialog',
  templateUrl: './linked-kit-dialog.component.html',
  styleUrls: ['./linked-kit-dialog.component.scss']
})
export class LinkedKitDialogComponent implements OnInit {

  availableKits: Kit[] = [];
  selectedKitDocId: string = '';
  kitsLinked: LinkedKitItem[] = [];
  isLoading = true;
  isSaving = false;

  constructor(
    public dialogRef: MatDialogRef<LinkedKitDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LinkedKitDialogData,
    private kitService: KitService,
    private institutionsService: InstitutionsService,
    private uiService: UiService
  ) {}

  ngOnInit(): void {
    this.loadAvailableKits();
    this.loadKitsLinked();
  }

  /**
   * Load all kits that are dispatched to this institution
   */
  async loadAvailableKits(): Promise<void> {
    this.isLoading = true;
    try {
      this.kitService.kits$.subscribe(kits => {
        this.availableKits = kits.filter(kit =>
          kit.status === 'dispatched' && kit.institutionId === this.data.institutionId
        );
        this.isLoading = false;
      });
    } catch (error) {
      console.error('Error loading available kits:', error);
      this.isLoading = false;
    }
  }

  /**
   * Load the currently linked kits for this institution
   */
  async loadKitsLinked(): Promise<void> {
    try {
      const institution: any = await firstValueFrom(
        this.institutionsService.getWithId(this.data.institutionId)
      );
      if (institution?.kitsLinked && Array.isArray(institution.kitsLinked)) {
        this.kitsLinked = institution.kitsLinked;
      }
    } catch (error) {
      console.error('Error loading linked kits:', error);
    }
  }

  /**
   * Check if a kit is already linked
   */
  isKitLinked(kitDocId: string): boolean {
    return this.kitsLinked.some(kit => kit.kitDocId === kitDocId);
  }

  /**
   * Get kits that are available to link (not already linked)
   */
  get unlinkedKits(): Kit[] {
    return this.availableKits.filter(kit => !this.isKitLinked(kit.docId));
  }

  /**
   * Link the selected kit to the institution (add to kitsLinked array)
   */
  async linkKit(): Promise<void> {
    if (!this.selectedKitDocId) {
      this.uiService.alertMessage('Error', 'Please select a kit to link', 'error');
      return;
    }

    if (this.isKitLinked(this.selectedKitDocId)) {
      this.uiService.alertMessage('Error', 'This kit is already linked', 'error');
      return;
    }

    this.isSaving = true;
    try {
      const selectedKit = this.availableKits.find(kit => kit.docId === this.selectedKitDocId);
      if (!selectedKit) {
        throw new Error('Selected kit not found');
      }

      const newLinkedKit: LinkedKitItem = {
        kitDocId: selectedKit.docId,
        kitName: selectedKit.kitId
      };

      // Add to kitsLinked array using arrayUnion to prevent race conditions
      await this.institutionsService.update({
        kitsLinked: firebase.firestore.FieldValue.arrayUnion(newLinkedKit)
      }, this.data.institutionId);

      // Update local state
      this.kitsLinked.push(newLinkedKit);
      this.selectedKitDocId = '';

      this.uiService.alertMessage('Success', `Kit "${selectedKit.kitId}" has been linked to this institution`, 'success');
    } catch (error) {
      console.error('Error linking kit:', error);
      this.uiService.alertMessage('Error', 'Failed to link kit to institution', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Unlink a specific kit from the institution (remove from kitsLinked array)
   */
  async unlinkKit(kitToUnlink: LinkedKitItem): Promise<void> {
    this.isSaving = true;
    try {
      // Remove from kitsLinked array using arrayRemove to prevent race conditions
      await this.institutionsService.update({
        kitsLinked: firebase.firestore.FieldValue.arrayRemove(kitToUnlink)
      }, this.data.institutionId);

      // Update local state
      this.kitsLinked = this.kitsLinked.filter(kit => kit.kitDocId !== kitToUnlink.kitDocId);

      this.uiService.alertMessage('Success', `Kit "${kitToUnlink.kitName}" has been unlinked`, 'success');
    } catch (error) {
      console.error('Error unlinking kit:', error);
      this.uiService.alertMessage('Error', 'Failed to unlink kit', 'error');
    } finally {
      this.isSaving = false;
    }
  }

  close(): void {
    this.dialogRef.close({ kitsLinked: this.kitsLinked });
  }
}
