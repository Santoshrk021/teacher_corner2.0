import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormArray, FormControl, FormGroup } from '@angular/forms';
import * as Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { SharedService } from 'app/shared/shared.service';
import { HttpClient } from '@angular/common/http';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { first, lastValueFrom, Subject, takeUntil } from 'rxjs';
import { Row, MessageLogEntry, WhatsAppTemplate, BatchHistoryEntry } from './bulk-composer.interfaces';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { HistoryComponent } from './history/history.component';
import { AngularFireStorage } from '@angular/fire/compat/storage';

@Component({
  selector: 'app-bulk-composer',
  templateUrl: './bulk-composer.component.html',
  styleUrls: ['./bulk-composer.component.scss']
})
export class BulkComposerComponent implements OnInit, OnDestroy {
  templateOptions: WhatsAppTemplate[] = [];
  selectedTemplate: WhatsAppTemplate | null = null;

  // Drawer properties
  showDrawer = false;
  drawerComponent: any;
  drawerOpened = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();

  templateForm = new FormGroup({
    templateKey: new FormControl(''),
    language: new FormControl('en'),
    mediaType: new FormControl('none'),
    headerUrl: new FormControl(''),
    body: new FormControl(''),
    ctaUrl: new FormControl('')
  });

  // Params array for template variables
  paramsArray = new FormArray<FormControl<string>>([]);

  // File upload properties
  fileName = '';
  fileError = '';
  isValidFile = false;
  isFileUploaded = false;  // Track if file was successfully uploaded
  rowsLoaded = 0;
  headers: string[] = [];
  rawRows: Row[] = [];

  // Recipient entries (editable form array)
  recipientEntries: FormGroup[] = [];

  // Preview
  renderedBody = '';
  examplePlaceholder = '';
  currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  constructor(
    private sharedService: SharedService,
    private configService: ConfigurationService,
    private http: HttpClient,
    private drawerService: FuseDrawerService,
    private afStorage: AngularFireStorage
  ) {
    this.drawerService.drawerOpenWhatsAppHistorySubject
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe(res => {
        this.drawerOpened = res;
      });
  }

  ngOnInit(): void {
    this.loadTemplatesFromFirestore();
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

  async openHistoryDrawer() {
    await import('./history/history.module').then(() => {
      this.drawerComponent = HistoryComponent;
      this.showDrawer = true;
      this.drawerService.drawerOpenWhatsAppHistorySubject.next(true);
    });
  }

  loadTemplatesFromFirestore() {
    this.configService.getConfigurationDocumentOnce('WhatsappTemplates')
      .pipe(first())
      .subscribe((doc: any) => {
        const data = doc.data();
        if (data?.templates && Array.isArray(data.templates)) {
          this.templateOptions = data.templates;
        }
      });
  }

  new() {
    // Reset form and data
    this.templateForm.reset({
      templateKey: '',
      language: 'en',
      mediaType: 'none',
      headerUrl: '',
      body: '',
      ctaUrl: ''
    });
    this.paramsArray.clear();
    this.fileName = '';
    this.fileError = '';
    this.isValidFile = false;
    this.isFileUploaded = false;
    this.rowsLoaded = 0;
    this.headers = [];
    this.rawRows = [];
    this.selectedTemplate = null;
    this.renderedBody = '';
    this.recipientEntries = [];
  }

  onTemplateChange() {
    this.updatePreview();
  }

  onTemplatePicked() {
    const templateName = this.templateForm.value.templateKey;
    this.selectedTemplate = this.templateOptions.find(t => t.templateName === templateName) || null;

    if (this.selectedTemplate) {
      this.templateForm.patchValue({
        language: this.selectedTemplate.language || 'en',
        body: this.selectedTemplate.body || '',
        mediaType: this.selectedTemplate.mediaType || 'none',
        headerUrl: this.selectedTemplate.header || ''
      });
      this.syncParamsFromBody();
    }
    this.updatePreview();
  }

  onBodyInput() {
    this.syncParamsFromBody();
    this.updatePreview();
  }

  syncParamsFromBody() {
    const body = this.templateForm.value.body || '';
    const matches = body.match(/\{\{\d+\}\}/g) || [];
    const count = new Set(matches).size;

    while (this.paramsArray.length > count) {
      this.paramsArray.removeAt(this.paramsArray.length - 1);
    }
    while (this.paramsArray.length < count) {
      this.paramsArray.push(new FormControl('', { nonNullable: true }));
    }
  }

  updatePreview() {
    let body = this.templateForm.value.body || '';
    this.paramsArray.controls.forEach((ctrl, i) => {
      const placeholder = `{{${i + 1}}}`;
      body = body.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), ctrl.value || `[param${i + 1}]`);
    });
    this.renderedBody = body;
  }

  // File handling
  onFileChosen(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fileName = file.name;
    this.fileError = '';
    this.isValidFile = false;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv') {
      this.parseCSV(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
      this.parseExcel(file);
    } else {
      this.fileError = 'Unsupported file type. Please upload .xlsx, .xls, or .csv';
    }
  }

  parseCSV(file: File) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        this.processData(result.data as Row[], result.meta.fields || []);
      },
      error: (err) => {
        this.fileError = `CSV parse error: ${err.message}`;
      }
    });
  }

  parseExcel(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Row>(sheet, { defval: '' });
      const headers = json.length > 0 ? Object.keys(json[0]) : [];
      this.processData(json, headers);
    };
    reader.onerror = () => {
      this.fileError = 'Failed to read Excel file';
    };
    reader.readAsArrayBuffer(file);
  }

  processData(rows: Row[], headers: string[]) {
    this.headers = headers;
    this.rawRows = rows;
    this.rowsLoaded = rows.length;
    this.isValidFile = rows.length > 0 && headers.includes('phone');

    // Validation checks
    if (!headers.includes('phone')) {
      this.fileError = 'Missing required "phone" column. Please re-upload with correct format.';
      this.isFileUploaded = false;
      return;
    }

    if (rows.length === 0) {
      this.fileError = 'No entries found in the file. Please check and re-upload.';
      this.isFileUploaded = false;
      return;
    }

    // Success - mark as uploaded
    this.fileError = '';
    this.isFileUploaded = true;

    // Create editable form entries from uploaded data
    this.recipientEntries = rows.map(row => {
      const formGroup = new FormGroup({});
      headers.forEach(h => {
        formGroup.addControl(h, new FormControl(row[h] || ''));
      });
      return formGroup;
    });

  }

  // Clear uploaded file and allow re-upload
  clearUploadedFile() {
    this.fileName = '';
    this.fileError = '';
    this.isValidFile = false;
    this.isFileUploaded = false;
    this.rowsLoaded = 0;
    this.rawRows = [];
    this.recipientEntries = [];
    this.headers = this.getTemplateHeaders();
  }

  downloadTemplate() {
    if (!this.selectedTemplate) return;

    // Use params from DB if available, otherwise fallback to body parsing
    const paramCols = this.selectedTemplate.params && this.selectedTemplate.params.length > 0
      ? this.selectedTemplate.params
      : this.getParamsFromBody();

    const headers = ['phone', ...paramCols];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `${this.selectedTemplate.templateName}_template.xlsx`);
  }

  // Get param column names from body placeholders as fallback
  getParamsFromBody(): string[] {
    const body = this.templateForm.value.body || '';
    const matches = body.match(/\{\{\d+\}\}/g) || [];
    return [...new Set(matches)].map((_, i) => `param${i + 1}`);
  }

  // Get dynamic headers based on selected template params
  getTemplateHeaders(): string[] {
    if (!this.selectedTemplate) return ['phone'];
    const paramCols = this.selectedTemplate.params && this.selectedTemplate.params.length > 0
      ? this.selectedTemplate.params
      : this.getParamsFromBody();
    return ['phone', ...paramCols]; 
  }

  // Add a new recipient entry manually
  addRecipientEntry() {
    if (!this.selectedTemplate) return;

    const headers = this.getTemplateHeaders();
    const formGroup = new FormGroup({});
    headers.forEach(h => {
      formGroup.addControl(h, new FormControl(''));
    });
    this.recipientEntries.push(formGroup);
    this.updateRowsFromEntries();
  }

  // Remove a recipient entry
  removeRecipientEntry(index: number) {
    this.recipientEntries.splice(index, 1);
    this.updateRowsFromEntries();
  }

  // Update rawRows from recipientEntries
  updateRowsFromEntries() {
    this.rawRows = this.recipientEntries.map(fg => fg.value);
    this.rowsLoaded = this.rawRows.length;
    this.headers = this.getTemplateHeaders();
    this.isValidFile = this.rawRows.length > 0;
  }

  get hasRows(): boolean {
    return this.rawRows.length > 0;
  }

  get canSubmit(): boolean {
    return this.hasRows && !!this.selectedTemplate;
  }

  // Check if a single entry has all fields filled
  isEntryComplete(entry: FormGroup): boolean {
    const headers = this.getTemplateHeaders();
    return headers.every(h => {
      const value = entry.get(h)?.value;
      return value !== null && value !== undefined && value.toString().trim() !== '';
    });
  }

  // Check if there are any incomplete entries
  hasIncompleteEntries(): boolean {
    return this.recipientEntries.some(entry => !this.isEntryComplete(entry));
  }

  // Check if all entries are complete (for enabling Next button)
  get allEntriesComplete(): boolean {
    if (this.recipientEntries.length === 0) return false;
    return this.recipientEntries.every(entry => this.isEntryComplete(entry));
  }

  // Check if plus button should be enabled (no incomplete entries)
  get canAddEntry(): boolean {
    if (!this.selectedTemplate) return false;
    if (this.recipientEntries.length === 0) return true;
    return this.allEntriesComplete;
  }

  // Check if Next button in step 2 should be enabled
  get canProceedStep2(): boolean {
    // Must have at least one entry and no invalid entries (phone or empty fields)
    return this.recipientEntries.length > 0 && this.invalidEntryCount === 0;
  }

  // Check if a phone number is valid (exactly 10 digits)
  isPhoneValid(entry: FormGroup): boolean {
    const phone = entry.get('phone')?.value || '';
    const digitsOnly = String(phone).replace(/\D/g, '');
    return digitsOnly.length === 10;
  }

  // Get phone validation error message
  getPhoneError(entry: FormGroup): string {
    const phone = entry.get('phone')?.value || '';
    const digitsOnly = String(phone).replace(/\D/g, '');
    if (digitsOnly.length === 0) {
      return '';
    }
    if (digitsOnly.length > 10) {
      return `Has ${digitsOnly.length - 10} extra digits`;
    }
    if (digitsOnly.length < 10) {
      return `${10 - digitsOnly.length} digits remaining`;
    }
    return '';
  }

  // Count invalid phone numbers
  get invalidPhoneCount(): number {
    return this.recipientEntries.filter(entry => {
      const phone = entry.get('phone')?.value || '';
      const digitsOnly = String(phone).replace(/\D/g, '');
      return digitsOnly.length !== 10 && digitsOnly.length > 0;
    }).length;
  }

  // Check if phone number is duplicate
  isDuplicatePhone(entry: FormGroup, index: number): boolean {
    const phone = entry.get('phone')?.value || '';
    const digitsOnly = String(phone).replace(/\D/g, '');
    if (digitsOnly.length === 0) return false;

    // Check if this phone exists in any other entry
    return this.recipientEntries.some((otherEntry, otherIndex) => {
      if (otherIndex === index) return false;
      const otherPhone = otherEntry.get('phone')?.value || '';
      const otherDigits = String(otherPhone).replace(/\D/g, '');
      return otherDigits === digitsOnly && otherDigits.length > 0;
    });
  }

  // Get duplicate phone error message
  getDuplicatePhoneError(entry: FormGroup, index: number): string {
    if (this.isDuplicatePhone(entry, index)) {
      return 'Duplicate number';
    }
    return '';
  }

  // Count duplicate phone numbers
  get duplicatePhoneCount(): number {
    const phoneMap = new Map<string, number>();

    // Count occurrences of each phone number
    this.recipientEntries.forEach(entry => {
      const phone = entry.get('phone')?.value || '';
      const digitsOnly = String(phone).replace(/\D/g, '');
      if (digitsOnly.length === 10) {
        phoneMap.set(digitsOnly, (phoneMap.get(digitsOnly) || 0) + 1);
      }
    });

    // Count entries that have duplicate phones
    let duplicateCount = 0;
    this.recipientEntries.forEach(entry => {
      const phone = entry.get('phone')?.value || '';
      const digitsOnly = String(phone).replace(/\D/g, '');
      if (digitsOnly.length === 10 && (phoneMap.get(digitsOnly) || 0) > 1) {
        duplicateCount++;
      }
    });

    return duplicateCount;
  }

  // Check if a field is empty (for non-phone fields)
  isFieldEmpty(entry: FormGroup, field: string): boolean {
    const value = entry.get(field)?.value;
    return value === null || value === undefined || value.toString().trim() === '';
  }

  // Get field error message
  getFieldError(entry: FormGroup, field: string): string {
    if (this.isFieldEmpty(entry, field)) {
      return 'This field is required';
    }
    return '';
  }

  // Check if an entry has any validation error (phone, duplicate, or other fields)
  hasEntryError(entry: FormGroup, index: number): boolean {
    // Check phone error
    const phone = entry.get('phone')?.value || '';
    const digitsOnly = String(phone).replace(/\D/g, '');
    const hasPhoneError = digitsOnly.length !== 10;

    // Check duplicate phone
    const hasDuplicatePhone = this.isDuplicatePhone(entry, index);

    // Check other fields for empty
    const headers = this.getTemplateHeaders();
    const hasEmptyField = headers.some(h => this.isFieldEmpty(entry, h));

    return hasPhoneError || hasDuplicatePhone || hasEmptyField;
  }

  // Count total invalid entries (entries with any error - phone, duplicate, or empty fields)
  get invalidEntryCount(): number {
    return this.recipientEntries.filter((entry, index) => this.hasEntryError(entry, index)).length;
  }

  // Track sending progress
  isSending = false;
  sendingProgress = 0;
  totalToSend = 0;
  sendingComplete = false;

  // Confirmation dialog
  showConfirmDialog = false;

  // Message log for tracking request_id and status
  messageLog: MessageLogEntry[] = [];
  isCheckingStatus = false;
  statusCheckComplete = false;

  // Open confirmation dialog
  openConfirmDialog() {
    if (!this.canSubmit || this.isSending) return;
    this.showConfirmDialog = true;
  }

  // Close confirmation dialog
  closeConfirmDialog() {
    this.showConfirmDialog = false;
  }

  // Confirm and send
  confirmSend() {
    this.showConfirmDialog = false;
    this.submitViaSharedService();
  }

  async submitViaSharedService() {
    if (!this.canSubmit || this.isSending) return;

    const templateName = this.selectedTemplate?.templateName;
    const headerImage = this.selectedTemplate?.header || 'undefined';
    const mediaType = this.selectedTemplate?.mediaType || 'text';
    const urlRoute = undefined;

    // Get param field names (excluding phone)
    const paramFields = this.getTemplateHeaders().filter(h => h !== 'phone');

    this.isSending = true;
    this.sendingProgress = 0;
    this.totalToSend = this.recipientEntries.length;
    this.sendingComplete = false;
    this.messageLog = []; // Reset message log
    this.statusCheckComplete = false;

    try {
      // Loop through each recipient with 500ms delay
      for (let i = 0; i < this.recipientEntries.length; i++) {
        const entry = this.recipientEntries[i];

        // Get phone number with +91 prefix
        const phoneDigits = String(entry.get('phone')?.value || '').replace(/\D/g, '');
        const phoneNumber = `+91${phoneDigits}`;

        // Build params array from entry values (in order of paramFields)
        const params = paramFields.map(field => entry.get(field)?.value || '');

        console.log(phoneNumber,
          templateName,
          params,
          headerImage,
          mediaType,
          urlRoute)

        // Send notification for this recipient
        const response = await this.sharedService.sendWhatsAppNotification(
          phoneNumber,
          templateName,
          params,
          headerImage,
          mediaType,
          urlRoute
        );

        console.log(response)
        // Extract request_id from response (check nested data object first)
        const requestId = response?.data?.request_id || response?.request_id || response?.requestId || 'N/A';
        this.messageLog.push({
          phone: phoneNumber,
          params: params,
          request_id: requestId,
          status: 'pending',
          failure_reason: '',
          timestamp: new Date().toISOString()
        });

        // Update progress
        this.sendingProgress = i + 1;

        // Add 500ms delay before next message (except for last one)
        if (i < this.recipientEntries.length - 1) {
          await this.delay(500);
        }
      }

      this.sendingComplete = true;
      // console.log(`Successfully sent ${this.sendingProgress} messages`);
      // console.log('Message Log:', this.messageLog);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      this.isSending = false;
    }
  }

  // Helper method to create delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check message status for all entries using backend Cloud Function
  async checkMessageStatus() {
    if (this.messageLog.length === 0 || this.isCheckingStatus) return;

    this.isCheckingStatus = true;

    try {
      for (let i = 0; i < this.messageLog.length; i++) {
        const logEntry = this.messageLog[i];

        if (logEntry.request_id === 'N/A') {
          logEntry.status = 'FAILED';
          logEntry.failure_reason = 'No request ID received from server';
          continue;
        }

        try {
          const response = await this.sharedService.checkWhatsAppMessageStatus(logEntry.request_id);

          // Parse response if it's a string
          let parsedResponse = response;
          if (typeof response === 'string') {
            try {
              parsedResponse = JSON.parse(response);
            } catch (e) {
              console.log('Could not parse response as JSON');
            }
          }

          // Extract status from freshchatRaw.outbound_messages array
          const outboundMessage = parsedResponse?.freshchatRaw?.outbound_messages?.[0];

          if (outboundMessage) {
            logEntry.status = outboundMessage.status || 'unknown';
            // Set failure_reason only if status is FAILED
            if (outboundMessage.status === 'FAILED') {
              logEntry.failure_reason = outboundMessage.failure_reason || '';
            } else {
              logEntry.failure_reason = '';
            }
          } else {
            logEntry.status = 'unknown';
            logEntry.failure_reason = 'No outbound message data in response';
          }
        } catch (err) {
          console.error(`Failed to get status for request_id: ${logEntry.request_id}`, err);
          logEntry.status = 'ERROR';
          logEntry.failure_reason = 'Error checking status from server';
        }

        // Small delay between status checks
        if (i < this.messageLog.length - 1) {
          await this.delay(200);
        }
      }

      this.statusCheckComplete = true;
      // Save batch history to Firebase Storage
      await this.saveBatchHistoryToStorage();
    } catch (error) {
      console.error('Failed to check message status:', error);
    } finally {
      this.isCheckingStatus = false;
    }
  }

  // Save batch history to Firebase Storage
  async saveBatchHistoryToStorage() {
    if (this.messageLog.length === 0 || !this.selectedTemplate) return;

    try {
      const batchId = `batch_${Date.now()}`;
      const folderPath = `whatsapp-bulk-messages/${batchId}`;
      const paramFields = this.getTemplateHeaders().filter(h => h !== 'phone');

      // 1. Create batch metadata
      const batchMetadata: BatchHistoryEntry = {
        batchId,
        templateName: this.selectedTemplate.templateName,
        totalRecipients: this.messageLog.length,
        successCount: this.successCount,
        failedCount: this.failedCount,
        createdAt: new Date().toISOString(),
        status: 'completed',
        paramFields
      };

      // 2. Prepare full log data (with all details including request_id)
      const fullLogData = this.messageLog.map(entry => {
        const row: any = { 'Phone Number': entry.phone };
        entry.params.forEach((param, idx) => {
          row[paramFields[idx] || `param${idx + 1}`] = param;
        });
        row['Request ID'] = entry.request_id;
        row['Status'] = entry.status;
        row['Failure Reason'] = entry.failure_reason;
        return row;
      });

      // 3. Create Excel workbook for full log
      const wsFullLog = XLSX.utils.json_to_sheet(fullLogData);
      const wbFullLog = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wbFullLog, wsFullLog, 'Full Log');
      const fullLogBuffer = XLSX.write(wbFullLog, { bookType: 'xlsx', type: 'array' });
      const fullLogBlob = new Blob([fullLogBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // 4. Upload full log Excel
      const fullLogRef = this.afStorage.ref(`${folderPath}/full_log.xlsx`);
      await fullLogRef.put(fullLogBlob);

      // 5. Upload batch metadata as JSON
      const metadataBlob = new Blob([JSON.stringify(batchMetadata, null, 2)], { type: 'application/json' });
      const metadataRef = this.afStorage.ref(`${folderPath}/metadata.json`);
      await metadataRef.put(metadataBlob);

      console.log('Batch history saved to Firebase Storage:', batchId);
    } catch (error) {
      console.error('Failed to save batch history:', error);
    }
  }

  // Success statuses
  private successStatuses = ['READ', 'DELIVERED', 'SENT', 'ACCEPTED', 'SUCCESS'];

  // Get count of successful messages
  get successCount(): number {
    return this.messageLog.filter(entry =>
      this.successStatuses.includes(entry.status.toUpperCase())
    ).length;
  }

  // Get count of failed messages
  get failedCount(): number {
    return this.messageLog.filter(entry =>
      entry.status.toUpperCase() === 'FAILED' || entry.status.toUpperCase() === 'ERROR'
    ).length;
  }

  // Download message log as Excel file
  downloadMessageLog() {
    if (this.messageLog.length === 0) return;

    // Prepare data for Excel
    const excelData = this.messageLog.map(entry => ({
      'Phone Number': entry.phone,
      'Parameters': entry.params.join(', '),
      'Status': entry.status,
      'Failure Reason': entry.failure_reason
    }));

    // Create worksheet and workbook
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Message Log');

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `whatsapp_message_log_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  }

  // Phone validation - only allow digits
  onPhoneKeypress(event: KeyboardEvent): boolean {
    const key = event.key;
    // Allow only digits (0-9) and control keys (backspace, delete, arrows, tab)
    if (!/^\d$/.test(key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(key)) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // Phone input handler - strip non-digits and limit to 10
  onPhoneInput(event: Event, entry: FormGroup): void {
    const input = event.target as HTMLInputElement;
    // Remove any non-digit characters
    let value = input.value.replace(/\D/g, '');
    // Limit to 10 digits
    if (value.length > 10) {
      value = value.substring(0, 10);
    }
    // Update the form control
    entry.get('phone')?.setValue(value, { emitEvent: false });
    input.value = value;
    this.updateRowsFromEntries();
  }

}