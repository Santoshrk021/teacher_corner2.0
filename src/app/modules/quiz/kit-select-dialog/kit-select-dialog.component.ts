import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { KitService } from 'app/modules/admin/kit/kit.service';
import { Kit, KitRemote } from 'app/modules/admin/kit/kit.interface';
import { UsbService } from 'app/usb.service';
import { UiService } from 'app/shared/ui.service';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { DialogComponent } from 'app/modules/admin/components/dialog/dialog.component';
import { RemoteMappingService } from '../remote-mapping.service';
import { firstValueFrom } from 'rxjs';

export interface KitSelectDialogData {
  institutionId: string;
  classroomId: string;
}

export interface KitSelectDialogResult {
  selectedKit: Kit | null;
  connected: boolean;
  studentCount: number;
  mappedRemotes: KitRemote[]; // Only the remotes that will be used (based on student count)
}

@Component({
  selector: 'app-kit-select-dialog',
  templateUrl: './kit-select-dialog.component.html',
  styleUrls: ['./kit-select-dialog.component.scss']
})
export class KitSelectDialogComponent implements OnInit {

  availableKits: Kit[] = [];
  selectedKit: Kit | null = null;
  isLoading = true;
  isConnecting = false;
  isConnected = false;

  // Student validation
  studentCount = 0;
  isLoadingStudents = true;
  validationStatus: 'valid' | 'warning' | 'error' | null = null;
  validationMessage = '';
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<KitSelectDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: KitSelectDialogData,
    private kitService: KitService,
    private usbService: UsbService,
    private uiService: UiService,
    private cdRef: ChangeDetectorRef,
    private classroomService: ClassroomsService,
    private router: Router,
    private dialog: MatDialog,
    private remoteMappingService: RemoteMappingService
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    // Load student count from classroom
    this.loadStudentCount();

    // Check if USB is already connected
    if (this.usbService.isConnected) {
      this.isConnected = true;
    } else {
      // Try auto-reconnect to previously paired device
      this.isConnecting = true;
      this.cdRef.detectChanges();

      const autoConnected = await this.usbService.tryAutoReconnect();
      if (autoConnected) {
        this.isConnected = true;
      }
      this.isConnecting = false;
      this.cdRef.detectChanges();
    }

    this.loadAvailableKits();
  }

  /**
   * Load student count from classroom
   */
  async loadStudentCount(): Promise<void> {
    this.isLoadingStudents = true;
    try {
      if (this.data.classroomId) {
        const classroomDoc = await firstValueFrom(
          this.classroomService.getClassroomByIdOnce(this.data.classroomId)
        );
        if (classroomDoc.exists) {
          const classroomData = classroomDoc.data() as any;
          this.studentCount = classroomData?.studentCounter || 0;
        }
      }
    } catch (error) {
      console.error('Error loading student count:', error);
      this.studentCount = 0;
    } finally {
      this.isLoadingStudents = false;
      this.validateKitSelection();
      this.cdRef.detectChanges();
    }
  }

  /**
   * Load all kits that are dispatched to this institution
   */
  loadAvailableKits(): void {
    this.isLoading = true;
    this.kitService.kits$.subscribe(kits => {
      this.availableKits = kits.filter(kit =>
        kit.status === 'dispatched' && kit.institutionId === this.data.institutionId
      );
      // Auto-select if only one kit available
      if (this.availableKits.length === 1) {
        this.selectedKit = this.availableKits[0];
        this.validateKitSelection();
      }
      this.isLoading = false;
      this.cdRef.detectChanges();
    });
  }

  /**
   * Connect USB receiver
   */
  async connectReceiver(): Promise<void> {
    this.isConnecting = true;
    this.cdRef.detectChanges();

    try {
      // First try auto-reconnect (no popup if previously paired)
      const autoConnected = await this.usbService.tryAutoReconnect();
      if (autoConnected) {
        this.isConnected = true;
        this.isConnecting = false;
        this.cdRef.detectChanges();
        return;
      }

      // If auto-reconnect failed, request device permission (shows popup)
      const granted = await this.usbService.requestReceiverFromUser();
      if (!granted) {
        this.isConnected = false;
        this.isConnecting = false;
        this.cdRef.detectChanges();
        return;
      }

      // Setup receiver
      const setupOk = await this.usbService.setupReceiver();
      this.isConnected = setupOk;

      if (this.isConnected) {
        this.usbService.resetRemotes();
        this.usbService.startListening();
      }
    } catch (error) {
      console.error('Connection failed:', error);
      this.isConnected = false;
      this.uiService.alertMessage('Connection Failed', 'Could not connect to USB receiver', 'error');
    } finally {
      this.isConnecting = false;
      this.cdRef.detectChanges();
    }
  }

  /**
   * Select a kit
   */
  selectKit(kit: Kit): void {
    this.selectedKit = kit;
    this.validateKitSelection();
  }

  /**
   * Validate kit selection against student count
   */
  validateKitSelection(): void {
    if (!this.selectedKit || this.isLoadingStudents) {
      this.validationStatus = null;
      this.validationMessage = '';
      return;
    }

    const remoteCount = this.selectedKit.studentRemotes?.length || 0;

    if (this.studentCount === 0) {
      // No students in classroom
      this.validationStatus = 'warning';
      this.validationMessage = 'No students registered in this classroom. Please add students first.';
    } else if (this.studentCount > remoteCount) {
      // More students than remotes - ERROR, cannot proceed
      this.validationStatus = 'error';
      this.validationMessage = `Not enough remotes! Classroom has ${this.studentCount} students but kit only has ${remoteCount} student remotes.`;
    } else if (this.studentCount < remoteCount) {
      // Fewer students than remotes - WARNING, can proceed
      this.validationStatus = 'warning';
      this.validationMessage = `Classroom has ${this.studentCount} students. Kit has ${remoteCount} remotes. Only ${this.studentCount} remotes will be used (slots 1-${this.studentCount}).`;
    } else {
      // Exact match - VALID
      this.validationStatus = 'valid';
      this.validationMessage = `Perfect match! ${this.studentCount} students and ${remoteCount} remotes.`;
    }

    this.cdRef.detectChanges();
  }

  /**
   * Get the remotes that will be mapped to students (based on student count)
   */
  getMappedRemotes(): KitRemote[] {
    if (!this.selectedKit || this.studentCount === 0) {
      return [];
    }

    // Sort by slot number and take only the number of students
    const sortedRemotes = [...(this.selectedKit.studentRemotes || [])]
      .sort((a, b) => a.slotNumber - b.slotNumber);

    // Only take remotes up to student count
    return sortedRemotes.slice(0, this.studentCount);
  }

  /**
   * Check if can proceed with quiz
   * Now allows proceeding without USB connection (fallback mode)
   */
  canProceed(): boolean {
    return this.selectedKit !== null &&
           this.validationStatus !== 'error' &&
           this.studentCount > 0;
  }

  /**
   * Confirm selection and close dialog
   */
  confirm(): void {
    if (!this.selectedKit) {
      this.uiService.alertMessage('Error', 'Please select a kit', 'error');
      return;
    }

    if (this.validationStatus === 'error') {
      this.uiService.alertMessage('Error', 'Cannot proceed: Not enough remotes for all students', 'error');
      return;
    }

    if (this.studentCount === 0) {
      this.uiService.alertMessage('Error', 'No students in classroom. Please add students first.', 'error');
      return;
    }

    this.createMappingAndClose();
  }

  private async createMappingAndClose(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    this.cdRef.detectChanges();

    try {
      const mappedRemotes = this.getMappedRemotes();

      if (this.selectedKit && this.data?.classroomId) {
        await this.remoteMappingService.autoCreateMapping({
          classroomId: this.data.classroomId,
          selectedKit: this.selectedKit,
          mappedRemotes,
        });
      }

      const result: KitSelectDialogResult = {
        selectedKit: this.selectedKit,
        connected: this.isConnected,
        studentCount: this.studentCount,
        mappedRemotes
      };
      this.dialogRef.close(result);
    } catch (error) {
      console.error('Error creating mapping:', error);
      this.uiService.alertMessage('Error', 'Failed to create mapping', 'error');
    } finally {
      this.saving = false;
      this.cdRef.detectChanges();
    }
  }

  /**
   * Skip kit selection (proceed without remote)
   */
  skipKitSelection(): void {
    const result: KitSelectDialogResult = {
      selectedKit: null,
      connected: false,
      studentCount: this.studentCount,
      mappedRemotes: []
    };
    this.dialogRef.close(result);
  }

  /**
   * Start with remote only (no kit selected, but USB connected)
   */
  startWithRemoteOnly(): void {
    const result: KitSelectDialogResult = {
      selectedKit: null,
      connected: this.isConnected,
      studentCount: this.studentCount,
      mappedRemotes: []
    };
    this.dialogRef.close(result);
  }

  /**
   * Close dialog without action
   */
  close(): void {
    this.dialogRef.close(null);
  }

  /**
   * Add extra students - redirect directly to student-manager
   */
  addExtraStudents(): void {
    this.dialogRef.close(); // Close the kit selection dialog first
    this.router.navigate(['/student-manager']);
  }
}
