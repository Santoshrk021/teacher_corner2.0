import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { UsbService } from 'app/usb.service';
import { UiService } from 'app/shared/ui.service';
import { KitService } from '../kit.service';
import { Subscription } from 'rxjs';
import { RemoteEventsService, RemoteEvent } from 'app/shared/remote-events.service';

interface CapturedRemote {
  mac: string;
  role: 'teacher' | 'student' | 'spare';
  slotNumber: number;
  capturedAt: Date;
  rawData?: any;
}

type Step = 'connect' | 'teacher' | 'students' | 'spare' | 'review';

@Component({
  selector: 'app-add-kit',
  templateUrl: './add-kit.component.html',
  styleUrls: ['./add-kit.component.scss']
})
export class AddKitComponent implements OnInit, OnDestroy {

  // Connection state
  connected = false;
  connecting = false;

  // Current step
  currentStep: Step = 'connect';

  // Remote capture data
  teacherRemotes: CapturedRemote[] = [];
  studentRemotes: CapturedRemote[] = [];
  spareRemotes: CapturedRemote[] = [];

  // Configuration
  maxTeacherRemotes = 2;
  maxStudentRemotes = 2;
  maxSpareRemotes = 2;

  // Edit mode for remote counts
  editingTeacherCount = false;
  editingStudentCount = false;
  editingSpareCount = false;
  tempTeacherCount = 2;
  tempStudentCount = 2;
  tempSpareCount = 2;

  // Current capture target
  currentStudentSlot = 1;

  // Review section
  selectedReviewType: 'teacher' | 'student' | 'spare' | null = null;
  showTable = false;

  // Subscriptions (USB + Firestore fallback)
  private usbSignalSub?: Subscription;
  private firestoreFallbackSub?: Subscription;

  // Firestore fallback: track timestamp to ignore old events
  private firestoreListenStartTime = 0;
  // Track processed Firestore event timestamps to avoid re-processing same events
  private processedFirestoreEvents = new Set<number>();

  // Save state
  saving = false;

  // UI indicator - NONE until user chooses
  eventSource: 'USB' | 'FIRESTORE' | 'NONE' = 'NONE';

  constructor(
    private dialogRef: MatDialogRef<AddKitComponent>,
    private usbService: UsbService,
    private cdRef: ChangeDetectorRef,
    private uiService: UiService,
    private kitService: KitService,
    private remoteEventsService: RemoteEventsService,
    private zone: NgZone
  ) {
    this.dialogRef.disableClose = true;
  }

  async ngOnInit(): Promise<void> {
    // Check if USB is already connected from another component
    if (this.usbService.isConnected) {
      this.connected = true;
      this.currentStep = 'teacher';
      this.startUsbListening();
    } else {
      // Try to auto-reconnect to previously paired device (no popup)
      this.connecting = true;
      this.cdRef.detectChanges();

      const autoConnected = await this.usbService.tryAutoReconnect();
      if (autoConnected) {
        this.connected = true;
        this.currentStep = 'teacher';
        this.startUsbListening();
      } else {
        // Stay on 'connect' step - wait for user to click "Connect Receiver" button
        // User will then choose USB (by selecting device) or Firestore (by clicking Cancel)
        this.connected = false;
        this.currentStep = 'connect';
      }

      this.connecting = false;
      this.cdRef.detectChanges();
    }
  }

  ngOnDestroy(): void {
    this.usbSignalSub?.unsubscribe();
    this.firestoreFallbackSub?.unsubscribe();
  }

  // -----------------------
  // Source Switching Helpers
  // -----------------------

  private startUsbListening(): void {
    if (this.usbSignalSub) return;

    this.eventSource = 'USB';

    // Stop fallback if running
    this.firestoreFallbackSub?.unsubscribe();
    this.firestoreFallbackSub = undefined;

    this.usbSignalSub = this.usbService.remoteSignal$.subscribe((signal) => {
      this.handleRemoteSignal(signal);
      this.cdRef.detectChanges();
    });
  }

  private startFirestoreFallbackListening(): void {
    if (this.firestoreFallbackSub) return;

    this.eventSource = 'FIRESTORE';

    // Stop USB subscription if any (rare, but safe)
    this.usbSignalSub?.unsubscribe();
    this.usbSignalSub = undefined;

    // Record the time when we start listening - ignore events before this
    this.firestoreListenStartTime = Date.now();
    // Clear processed events set when starting fresh
    this.processedFirestoreEvents.clear();
    console.log('🔄 Starting Firestore fallback listening for kit registration, startTime:', this.firestoreListenStartTime);

    // NOTE: This should match your Cloud Function target collection
    this.firestoreFallbackSub = this.remoteEventsService
      .getFreshLatestEvents$(200, 'SnappyRemoteEvents')
      .subscribe({
        next: (docs: RemoteEvent[]) => {
          // Run inside Angular zone for immediate UI updates
          this.zone.run(() => {
            for (const d of docs) {
              // IMPORTANT: Only process events that happened AFTER we started listening
              if (d.serverReceiveMs < this.firestoreListenStartTime) {
                continue;
              }

              // Skip if we've already processed this specific event (by its timestamp)
              if (this.processedFirestoreEvents.has(d.serverReceiveMs)) {
                continue;
              }

              const rawMac = (d.macId || '').trim();
              if (!rawMac) continue;

              // Mark this event as processed BEFORE handling to avoid duplicates
              this.processedFirestoreEvents.add(d.serverReceiveMs);

              // Firestore stores MACs in reversed byte order - reverse them to match USB format
              const mac = this.reverseFirestoreMac(rawMac);
              console.log(`🔥 Firestore event: rawMac=${rawMac}, reversed=${mac}, serverReceiveMs=${d.serverReceiveMs}`);

              // Convert Firestore event -> your existing signal shape
              const parsedValue = Number(d.button);
              const value = Number.isFinite(parsedValue) ? parsedValue : -1;

              this.handleRemoteSignal({ MAC: mac, value, KEY: 'FIRESTORE' });
            }

            // Force immediate change detection
            this.cdRef.detectChanges();
          });
        },
        error: (err) => {
          console.error('❌ Firestore fallback listen failed:', err);
        }
      });
  }

  // Normalize MAC address (remove colons/dashes, lowercase)
  private normalizeMac(mac: string): string {
    return (mac || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  // Format MAC with colons (to match USB format stored in kits)
  private formatMac(mac: string): string {
    const hex = this.normalizeMac(mac);
    if (hex.length !== 12) return (mac || '').toLowerCase();
    const pairs = hex.match(/.{1,2}/g) || [];
    return pairs.join(':');
  }

  // Reverse Firestore MAC bytes and format with colons to match USB format
  private reverseFirestoreMac(mac: string): string {
    const normalized = this.normalizeMac(mac);
    if (normalized.length !== 12) return mac; // Return original if not valid length

    // Split into 2-char bytes and reverse
    const bytes: string[] = [];
    for (let i = 0; i < 12; i += 2) {
      bytes.push(normalized.substring(i, i + 2));
    }
    // Return with colons to match USB format (e.g., "5a:ca:d2:88:19:70")
    return bytes.reverse().join(':');
  }

  // -----------------------
  // Connect Receiver
  // -----------------------

  async connectReceiver(): Promise<void> {
    this.connecting = true;
    this.cdRef.detectChanges();

    try {
      // First try auto-reconnect (no popup if previously paired)
      const autoConnected = await this.usbService.tryAutoReconnect();
      if (autoConnected) {
        this.connected = true;
        this.currentStep = 'teacher';
        this.connecting = false;

        // ✅ Switch to USB
        this.startUsbListening();

        this.cdRef.detectChanges();
        return;
      }

      // If auto-reconnect failed, request device permission (shows popup)
      // User clicking "Cancel" in the browser dialog will return false
      const granted = await this.usbService.requestReceiverFromUser();
      if (!granted) {
        // User clicked Cancel in USB dialog → use Firestore method
        this.connected = false;
        this.currentStep = 'teacher';
        this.startFirestoreFallbackListening();
        this.uiService.alertMessage(
          'Using Cloud Mode',
          'USB receiver not selected. Listening for remote events via Firestore.',
          'info'
        );

        this.connecting = false;
        this.cdRef.detectChanges();
        return;
      }

      // User selected a USB device → setup receiver
      const setupOk = await this.usbService.setupReceiver();
      this.connected = setupOk;

      if (this.connected) {
        // Reset any previous remotes
        this.usbService.resetRemotes();

        // Start listening for signals
        this.usbService.startListening();

        // Move to teacher remote step
        this.currentStep = 'teacher';

        // ✅ Switch to USB
        this.startUsbListening();

        this.uiService.alertMessage(
          'USB Connected',
          'USB receiver connected successfully. Listening for remote signals.',
          'success'
        );
      } else {
        // ✅ If setup fails, fallback - move to teacher step
        this.currentStep = 'teacher';
        this.startFirestoreFallbackListening();
        this.uiService.alertMessage(
          'USB Setup Failed',
          'Could not setup USB receiver. Falling back to Firestore mode.',
          'warning'
        );
      }
    } catch (error) {
      console.error('Connection failed:', error);
      this.connected = false;

      // ✅ fallback on error - move to teacher step
      this.currentStep = 'teacher';
      this.startFirestoreFallbackListening();
      this.uiService.alertMessage(
        'Connection Error',
        'Failed to connect USB receiver. Using Firestore mode instead.',
        'warning'
      );
    } finally {
      this.connecting = false;
      this.cdRef.detectChanges();
    }
  }

  // Switch to USB mode manually (if user wants to try USB again)
  async switchToUsb(): Promise<void> {
    this.connecting = true;
    this.cdRef.detectChanges();

    try {
      const granted = await this.usbService.requestReceiverFromUser();
      if (!granted) {
        this.uiService.alertMessage('Cancelled', 'USB device selection cancelled.', 'info');
        this.connecting = false;
        this.cdRef.detectChanges();
        return;
      }

      const setupOk = await this.usbService.setupReceiver();
      if (setupOk) {
        this.connected = true;
        this.usbService.resetRemotes();
        this.usbService.startListening();
        this.startUsbListening();
        this.uiService.alertMessage('USB Connected', 'Switched to USB receiver mode.', 'success');
      } else {
        this.uiService.alertMessage('Setup Failed', 'Could not setup USB receiver.', 'error');
      }
    } catch (error) {
      console.error('Switch to USB failed:', error);
      this.uiService.alertMessage('Error', 'Failed to connect USB receiver.', 'error');
    } finally {
      this.connecting = false;
      this.cdRef.detectChanges();
    }
  }

  // Switch to Firestore mode manually
  switchToFirestore(): void {
    this.connected = false;
    this.startFirestoreFallbackListening();
    this.uiService.alertMessage('Cloud Mode', 'Switched to Firestore mode.', 'info');
    this.cdRef.detectChanges();
  }

  // -----------------------
  // Core Signal Handling (unchanged)
  // -----------------------

  handleRemoteSignal(signal: { MAC: string; value: number; KEY?: string }): void {
    const mac = signal.MAC;

    // Check if already captured in current kit (this session) and show warning
    const existingPosition = this.getRemotePosition(mac);
    if (existingPosition) {
      this.showDuplicateWarning(mac, existingPosition);
      return;
    }

    // Check if MAC is already used in another existing kit
    const existingInOtherKit = this.kitService.checkMacExists(mac);
    if (existingInOtherKit) {
      this.showExistingKitWarning(mac, existingInOtherKit);
      return;
    }

    // Capture based on current step
    switch (this.currentStep) {
      case 'teacher':
        if (this.teacherRemotes.length < this.maxTeacherRemotes) {
          this.captureTeacherRemote(mac, signal);
        }
        break;

      case 'students':
        if (this.studentRemotes.length < this.maxStudentRemotes) {
          this.captureStudentRemote(mac, signal);
        }
        break;

      case 'spare':
        if (this.spareRemotes.length < this.maxSpareRemotes) {
          this.captureSpareRemote(mac, signal);
        }
        break;
    }
  }

  showExistingKitWarning(mac: string, existingInfo: { kitId: string; role: string; slotNumber: number }): void {
    this.uiService.alertMessage(
      'Remote Already Assigned',
      `This remote (${mac}) is already assigned to ${existingInfo.kitId} as ${existingInfo.role} ${existingInfo.slotNumber}.`,
      'error'
    );
  }

  getRemotePosition(mac: string): string | null {
    const teacherRemote = this.teacherRemotes.find(r => r.mac === mac);
    if (teacherRemote) return `Teacher ${teacherRemote.slotNumber}`;

    const studentRemote = this.studentRemotes.find(r => r.mac === mac);
    if (studentRemote) return `Student ${studentRemote.slotNumber}`;

    const spareRemote = this.spareRemotes.find(r => r.mac === mac);
    if (spareRemote) return `Spare ${spareRemote.slotNumber}`;

    return null;
  }

  showDuplicateWarning(mac: string, position: string): void {
    this.uiService.alertMessage(
      'Duplicate Remote',
      `This remote (${mac}) is already used in position: ${position}`,
      'warning'
    );
  }

  captureTeacherRemote(mac: string, rawData: any): void {
    const remote: CapturedRemote = {
      mac,
      role: 'teacher',
      slotNumber: this.teacherRemotes.length + 1,
      capturedAt: new Date(),
      rawData
    };
    this.teacherRemotes.push(remote);
    console.log('Teacher remote captured:', remote);
  }

  captureStudentRemote(mac: string, rawData: any): void {
    const remote: CapturedRemote = {
      mac,
      role: 'student',
      slotNumber: this.currentStudentSlot,
      capturedAt: new Date(),
      rawData
    };
    this.studentRemotes.push(remote);
    this.currentStudentSlot++;
    console.log('Student remote captured:', remote);
  }

  captureSpareRemote(mac: string, rawData: any): void {
    const remote: CapturedRemote = {
      mac,
      role: 'spare',
      slotNumber: this.spareRemotes.length + 1,
      capturedAt: new Date(),
      rawData
    };
    this.spareRemotes.push(remote);
    console.log('Spare remote captured:', remote);
  }

  removeRemote(type: 'teacher' | 'student' | 'spare', index: number): void {
    switch (type) {
      case 'teacher':
        this.teacherRemotes.splice(index, 1);
        this.teacherRemotes.forEach((r, i) => r.slotNumber = i + 1);
        break;
      case 'student':
        this.studentRemotes.splice(index, 1);
        this.studentRemotes.forEach((r, i) => r.slotNumber = i + 1);
        this.currentStudentSlot = this.studentRemotes.length + 1;
        break;
      case 'spare':
        this.spareRemotes.splice(index, 1);
        this.spareRemotes.forEach((r, i) => r.slotNumber = i + 1);
        break;
    }
    this.cdRef.detectChanges();
  }

  // Edit remote count methods
  startEditingCount(type: 'teacher' | 'student' | 'spare'): void {
    switch (type) {
      case 'teacher':
        this.tempTeacherCount = this.maxTeacherRemotes;
        this.editingTeacherCount = true;
        break;
      case 'student':
        this.tempStudentCount = this.maxStudentRemotes;
        this.editingStudentCount = true;
        break;
      case 'spare':
        this.tempSpareCount = this.maxSpareRemotes;
        this.editingSpareCount = true;
        break;
    }
  }

  saveCount(type: 'teacher' | 'student' | 'spare'): void {
    switch (type) {
      case 'teacher':
        if (this.tempTeacherCount >= this.teacherRemotes.length && this.tempTeacherCount > 0) {
          this.maxTeacherRemotes = this.tempTeacherCount;
          this.editingTeacherCount = false;
        } else {
          this.uiService.alertMessage('Invalid', `Cannot set less than ${this.teacherRemotes.length} (already captured)`, 'warning');
        }
        break;
      case 'student':
        if (this.tempStudentCount >= this.studentRemotes.length && this.tempStudentCount > 0) {
          this.maxStudentRemotes = this.tempStudentCount;
          this.editingStudentCount = false;
        } else {
          this.uiService.alertMessage('Invalid', `Cannot set less than ${this.studentRemotes.length} (already captured)`, 'warning');
        }
        break;
      case 'spare':
        if (this.tempSpareCount >= this.spareRemotes.length && this.tempSpareCount >= 0) {
          this.maxSpareRemotes = this.tempSpareCount;
          this.editingSpareCount = false;
        } else {
          this.uiService.alertMessage('Invalid', `Cannot set less than ${this.spareRemotes.length} (already captured)`, 'warning');
        }
        break;
    }
    this.cdRef.detectChanges();
  }

  cancelEditingCount(type: 'teacher' | 'student' | 'spare'): void {
    switch (type) {
      case 'teacher':
        this.editingTeacherCount = false;
        break;
      case 'student':
        this.editingStudentCount = false;
        break;
      case 'spare':
        this.editingSpareCount = false;
        break;
    }
  }

  // Navigation methods
  goToStep(step: Step): void {
    this.currentStep = step;
  }

  nextStep(): void {
    switch (this.currentStep) {
      case 'teacher':
        this.currentStep = 'students';
        break;
      case 'students':
        this.currentStep = 'spare';
        break;
      case 'spare':
        this.currentStep = 'review';
        break;
    }
  }

  previousStep(): void {
    switch (this.currentStep) {
      case 'students':
        this.currentStep = 'teacher';
        break;
      case 'spare':
        this.currentStep = 'students';
        break;
      case 'review':
        this.currentStep = 'spare';
        break;
    }
  }

  canProceed(): boolean {
    switch (this.currentStep) {
      case 'teacher':
        return this.teacherRemotes.length >= this.maxTeacherRemotes;
      case 'students':
        return this.studentRemotes.length >= this.maxStudentRemotes;
      case 'spare':
        return this.spareRemotes.length >= this.maxSpareRemotes;
      default:
        return true;
    }
  }

  getAllRemotes(): CapturedRemote[] {
    return [...this.teacherRemotes, ...this.studentRemotes, ...this.spareRemotes];
  }

  // Review section methods
  selectReviewType(type: 'teacher' | 'student' | 'spare'): void {
    if (this.selectedReviewType === type) {
      this.selectedReviewType = null;
      this.showTable = false;
    } else {
      this.selectedReviewType = type;
      this.showTable = true;
    }
  }

  toggleTable(): void {
    this.showTable = !this.showTable;
  }

  getFilteredRemotes(): CapturedRemote[] {
    switch (this.selectedReviewType) {
      case 'teacher':
        return this.teacherRemotes;
      case 'student':
        return this.studentRemotes;
      case 'spare':
        return this.spareRemotes;
      default:
        return [];
    }
  }

  async saveKit(): Promise<void> {
    if (this.saving) return;

    this.saving = true;

    try {
      const kitData = {
        teacherRemotes: this.teacherRemotes,
        studentRemotes: this.studentRemotes,
        spareRemotes: this.spareRemotes,
        totalRemotes: this.getAllRemotes().length
      };

      await this.kitService.createKit(kitData);
      this.uiService.alertMessage('Success', 'Kit created successfully!', 'success');
      this.dialogRef.close({ saved: true });
    } catch (error) {
      console.error('Error saving kit:', error);
      this.uiService.alertMessage('Error', 'Failed to save kit. Please try again.', 'error');
    } finally {
      this.saving = false;
      this.cdRef.detectChanges();
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}

