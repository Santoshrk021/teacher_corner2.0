import { Component, Inject, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from 'environments/environment';

type UploadStatus = 'pending' | 'uploading' | 'processing' | 'done' | 'error';

type ExtractedStudent = { name: string | null; rollNumber: string | null };

type FileItem = {
  file: File;
  kind: 'image' | 'pdf';
  previewUrl: string | null;
  safePreviewUrl: SafeResourceUrl | null;
  status: UploadStatus;
  statusLabel: string;
  error?: string;

  extractedStudent?: ExtractedStudent; // (optional) first/best row
  extractedClassroomName?: string | null;
  createdCount?: number;
};

type Classroom = {
  classroomId: string;
  classroomName: string;
  classroomCode?: string;
  institutionId: string;

  programmes?: Record<string, any>; // ✅ add this
};


@Component({
  selector: 'app-add-master-sheet-students',
  templateUrl: './add-master-sheet-students.component.html',
  styleUrls: ['./add-master-sheet-students.component.scss'],
})
export class AddMasterSheetStudentsComponent implements OnDestroy {
  isDragging = false;
  uploading = false;
  errorMsg = '';
  maxFileSizeMB = 15;

  files: FileItem[] = [];
  storageFolder = 'MasterSheetUploads';

  // private textExtractionUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/extractHandwrittenTextFromImage`;
  private textExtractionUrl = `  http://localhost:5000/${environment.firebase.projectId}/asia-south1/extractHandwrittenTextFromImage`;
  private pdfExportUrl = `https://asia-south1-${environment.firebase.projectId}.cloudfunctions.net/exportPDFToImages`;
  
  private DEBUG = true;
  private dlog(...args: any[]) {
    if (!this.DEBUG) return;
    console.log('[MasterSheet]', ...args);
  }

  private preview(value: any, max = 400): string {
    try {
      const s = typeof value === 'string' ? value : JSON.stringify(value);
      if (!s) return '';
      return s.length > max ? s.slice(0, max) + '…' : s;
    } catch {
      return String(value);
    }
  }

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { institutionId: string; classrooms: Classroom[] },
    private dialogRef: MatDialogRef<AddMasterSheetStudentsComponent>,
    private sanitizer: DomSanitizer,
    private storage: AngularFireStorage,
    private afs: AngularFirestore,
    private http: HttpClient
  ) { }

  ngOnDestroy(): void {
    for (const f of this.files) {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    }
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  // -----------------------------
  // Drag & Drop
  // -----------------------------
  onDragOver(evt: DragEvent) {
    evt.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(evt: DragEvent) {
    evt.preventDefault();
    this.isDragging = false;
  }

  onDrop(evt: DragEvent) {
    evt.preventDefault();
    this.isDragging = false;
    const dropped = evt.dataTransfer?.files;
    if (dropped?.length) this.addFiles(Array.from(dropped));
  }

  onFileSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const list = input.files;
    if (!list?.length) return;
    this.addFiles(Array.from(list));
    input.value = '';
  }

  private addFiles(newFiles: File[]) {
    this.errorMsg = '';

    for (const file of newFiles) {
      const validation = this.validateFile(file);
      if (validation) {
        this.errorMsg = validation;
        continue;
      }

      const kind: FileItem['kind'] = file.type === 'application/pdf' ? 'pdf' : 'image';
      const previewUrl = URL.createObjectURL(file);
      const safePreviewUrl = kind === 'pdf'
        ? this.sanitizer.bypassSecurityTrustResourceUrl(previewUrl)
        : null;

      this.files.push({
        file,
        kind,
        previewUrl,
        safePreviewUrl,
        status: 'pending',
        statusLabel: 'Ready',
      });
    }
  }

  removeFile(index: number) {
    const f = this.files[index];
    if (f?.previewUrl) URL.revokeObjectURL(f.previewUrl);
    this.files.splice(index, 1);
  }

  viewFile(item: FileItem) {
    if (!item.previewUrl) return;
    window.open(item.previewUrl, '_blank');
  }

  private validateFile(file: File): string | null {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > this.maxFileSizeMB) return `File "${file.name}" exceeds ${this.maxFileSizeMB}MB.`;

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/tiff'];
    if (!allowed.includes(file.type)) return `Unsupported file type: ${file.type} (${file.name})`;

    return null;
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // -----------------------------
  // Main flow
  // -----------------------------
  async uploadAll() {
    this.errorMsg = '';

    if (!this.data?.institutionId) {
      this.errorMsg = 'Missing institutionId';
      return;
    }
    if (!Array.isArray(this.data?.classrooms) || !this.data.classrooms.length) {
      this.errorMsg = 'No classrooms received. Please load classrooms before opening dialog.';
      return;
    }
    if (!this.files.length) {
      this.errorMsg = 'Please add at least one file.';
      return;
    }

    this.uploading = true;

    try {
      this.dlog('uploadAll() started', {
        institutionId: this.data.institutionId,
        classroomsCount: this.data.classrooms.length,
        filesCount: this.files.length,
      });

      for (const item of this.files) {
        if (item.status === 'done') continue;

        try {
          await this.processMasterSheetFile(item);
        } catch (e: any) {
          item.status = 'error';
          item.statusLabel = 'Failed';
          item.error = e?.message || String(e);
          this.dlog('processMasterSheetFile FAILED:', item.file?.name, e);
        }
      }
    } finally {
      this.uploading = false;
      this.dlog('uploadAll() finished');
    }
  }

  private async processMasterSheetFile(item: FileItem) {
    const institutionId = this.data.institutionId;

    // 1) upload raw
    item.status = 'uploading';
    item.statusLabel = 'Uploading raw file…';

    const uploadId = this.afs.createId();
    const storagePath = `${this.storageFolder}/${institutionId}/${uploadId}/${item.file.name}`;

    this.dlog('Uploading to Storage:', { storagePath, fileName: item.file.name, type: item.file.type });

    await this.storage.ref(storagePath).put(item.file);

    // 2) extract
    item.status = 'processing';
    item.statusLabel = 'Extracting handwritten text…';

    this.dlog('Calling extraction…', { kind: item.kind });

    const extractionResponses = item.file.type === 'application/pdf'
      ? await this.extractFromPdf(item.file, institutionId)
      : [await this.extractFromImage(storagePath, item.file.name)];

    this.dlog('--- EXTRACTION RESPONSES COUNT ---', extractionResponses?.length);

    extractionResponses.forEach((r, idx) => {
      this.dlog(`Response[${idx}] keys:`, r ? Object.keys(r) : r);
      this.dlog(`Response[${idx}] studentInfo:`, r?.studentInfo);
      this.dlog(
        `Response[${idx}] writtenTableData type:`,
        typeof r?.writtenTableData,
        'isArray:',
        Array.isArray(r?.writtenTableData)
      );
      this.dlog(`Response[${idx}] writtenTableData preview:`, this.preview(r?.writtenTableData));
      this.dlog(`Response[${idx}] rawText preview:`, this.preview(r?.rawText, 800));
    });

    // Merge rawText (best effort)
    const mergedRawText = extractionResponses
      .map(r => (r?.rawText || '').toString())
      .filter(Boolean)
      .join('\n');

    this.dlog('--- MERGED RAW TEXT (first 1200 chars) ---');
    this.dlog(this.preview(mergedRawText, 1200));

    // 3) detect classroomName from rawText
    const extractedClassroomName = this.extractClassroomName(mergedRawText);
    item.extractedClassroomName = extractedClassroomName;

    this.dlog('Extracted classroom name:', extractedClassroomName);

    if (!extractedClassroomName) {
      throw new Error(`Could not detect classroom name from sheet. Expected like "Classroom: 1A" / "Classroom : 1 A".`);
    }

    // 4) find matching classroom in passed list
    const classroom = this.findMatchingClassroom(extractedClassroomName, this.data.classrooms);

    this.dlog('Matched classroom:', classroom);

    if (!classroom) {
      const available = this.data.classrooms.map(c => c.classroomName).join(', ');
      throw new Error(`No matching classroom found for "${extractedClassroomName}". Available: ${available}`);
    }

    // 5) extract students rows (roll + name)
    const students = this.extractStudentsFromResponses(extractionResponses, mergedRawText);

    this.dlog('Extracted students:', students);

    if (!students.length) {
      throw new Error(`No students detected in the sheet table. (writtenTableData/rawText parse returned 0 rows)`);
    }

    // show first student as "preview"
    item.extractedStudent = students[0];

    // 6) create students in matched classroom
    item.statusLabel = `Creating ${students.length} students in ${classroom.classroomName}…`;

    const created = await this.createStudentsForClassroom(classroom, students);
    item.createdCount = created;

    item.status = 'done';
    item.statusLabel = `Done • Created ${created}/${students.length} students (${classroom.classroomName})`;
  }

  // -----------------------------
  // Classroom parsing + matching
  // -----------------------------
  private extractClassroomName(rawText: string): string | null {
    if (!rawText) return null;

    const m = rawText.match(/class\s*room\s*[:\-]\s*([0-9]{1,2}\s*[A-Za-z])\b/i);
    if (!m?.[1]) return null;

    // normalize "1A" => "1 A"
    const cleaned = m[1].trim().replace(/\s+/g, '');
    const grade = cleaned.match(/^\d{1,2}/)?.[0] || '';
    const section = cleaned.replace(/^\d{1,2}/, '').toUpperCase();

    if (!grade || !section) return null;
    return `${grade} ${section}`; // matches Firestore style like "1 A"
  }

  private findMatchingClassroom(extractedName: string, classrooms: Classroom[]): Classroom | null {
    const norm = (s: string) => (s || '').toUpperCase().replace(/\s+/g, '');
    const target = norm(extractedName);

    const exact = classrooms.find(c => norm(c.classroomName) === target);
    if (exact) return exact;

    const contains = classrooms.find(c => norm(c.classroomName).includes(target) || target.includes(norm(c.classroomName)));
    if (contains) return contains;

    return null;
  }

  // -----------------------------
  // Students extraction (table)
  // -----------------------------
  private extractStudentsFromResponses(responses: any[], mergedRawText: string): ExtractedStudent[] {
    const out: ExtractedStudent[] = [];

    this.dlog('--- PARSE START ---');
    this.dlog('responses count:', responses?.length || 0);

    // 1) Prefer writtenTableData
    for (let i = 0; i < responses.length; i++) {
      const r = responses[i];
      const raw = r?.writtenTableData;

      this.dlog(`Response[${i}] writtenTableData raw type:`, typeof raw, 'isArray:', Array.isArray(raw));
      this.dlog(`Response[${i}] writtenTableData preview:`, this.preview(raw));

      const lines: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];
      this.dlog(`Response[${i}] writtenTableData normalized lines length:`, lines.length);

      for (let j = 0; j < Math.min(lines.length, 10); j++) {
        this.dlog(`Response[${i}] line[${j}] =>`, lines[j]);
      }

      for (const line of lines) {
        const parsed = this.parseStudentRow(line);
        if (parsed) out.push(parsed);
      }
    }

    this.dlog('Parsed from writtenTableData count:', out.length);

    // 2) Fallback: parse from rawText
    if (!out.length && mergedRawText) {
      const lines = mergedRawText
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean);

      this.dlog('Fallback rawText lines count:', lines.length);
      this.dlog('First 25 rawText lines:');
      lines.slice(0, 25).forEach((l, idx) => this.dlog(`rawLine[${idx}]`, l));

      for (const line of lines) {
        const parsed = this.parseStudentRow(line);
        if (parsed) out.push(parsed);
      }
    }

    this.dlog('Parsed after rawText fallback count:', out.length);

    // 3) Deduplicate by rollNumber
    const seen = new Set<string>();
    const uniq = out.filter(s => {
      const roll = (s.rollNumber || '').trim();
      if (!roll) return false;
      if (seen.has(roll)) return false;
      seen.add(roll);
      return true;
    });

    this.dlog('Unique parsed students:', uniq);
    this.dlog('--- PARSE END ---');

    return uniq;
  }

  private parseStudentRow(line: any): ExtractedStudent | null {
    if (line === null || line === undefined) return null;

    // ✅ CASE 1: cloud function returns object rows like { rollNumber, studentName }
    if (typeof line === 'object' && !Array.isArray(line)) {
      const rollRaw =
        (line.rollNumber ?? line.roll ?? line.rn ?? '').toString().trim();

      const nameRaw =
        (line.studentName ?? line.name ?? line.student ?? '').toString().trim();

      if (!rollRaw || !nameRaw) return null;

      const normalizedRoll =
        rollRaw.length > 3 ? rollRaw.slice(-3) : rollRaw.padStart(2, '0');

      const name = nameRaw.replace(/\s+/g, ' ').trim();
      if (!name || name.length < 2) return null;

      return { rollNumber: normalizedRoll, name };
    }

    // ✅ CASE 2: array input like ["01", "Santosh Kanta"]
    if (Array.isArray(line)) {
      const rollRaw = (line[0] ?? '').toString().trim();
      const nameRaw = (line[1] ?? '').toString().trim();
      if (!rollRaw || !nameRaw) return null;

      const normalizedRoll =
        rollRaw.length > 3 ? rollRaw.slice(-3) : rollRaw.padStart(2, '0');

      const name = nameRaw.replace(/\s+/g, ' ').trim();
      if (!name || name.length < 2) return null;

      return { rollNumber: normalizedRoll, name };
    }

    // ✅ CASE 3: string input like "01 Santosh Kanta"
    const text = String(line).replace(/\s+/g, ' ').trim();
    if (!text) return null;

    // allow "01 Santosh", "01 - Santosh", "01. Santosh", etc.
    const m = text.match(/^\s*([0-9]{1,3})\s*[\.\-\)\:]?\s+(.+?)\s*$/);
    if (!m) return null;

    const rollRaw = (m[1] || '').trim();
    const nameRaw = (m[2] || '').trim();

    const name = nameRaw.replace(/[^A-Za-z\s\.]/g, '').replace(/\s+/g, ' ').trim();
    if (!rollRaw || !name || name.length < 2) return null;

    const normalizedRoll =
      rollRaw.length > 3 ? rollRaw.slice(-3) : rollRaw.padStart(2, '0');

    return { rollNumber: normalizedRoll, name };
  }


  // -----------------------------
  // Create Students
  // -----------------------------
  private async createStudentsForClassroom(classroom: Classroom, students: ExtractedStudent[]): Promise<number> {
    const institutionId = classroom.institutionId;
    const classroomId = classroom.classroomId;

    // Existing access codes (roll numbers) for duplicate prevention
    const existingRolls = await this.getExistingRollNumbersForClassroom(institutionId, classroomId);

    this.dlog('Existing rolls count:', existingRolls.size);

    let created = 0;

    for (const s of students) {
      const roll = (s.rollNumber || '').trim();
      const name = (s.name || '').trim();
      if (!roll || !name) continue;

      const normalizedRoll = roll.length > 3 ? roll.slice(-3) : roll;

      if (existingRolls.has(normalizedRoll)) {
        this.dlog('Skipping duplicate roll:', normalizedRoll, 'name:', name);
        continue;
      }

      const studentId = this.afs.createId();
      const createdAt = new Date();

      const [firstName, ...rest] = name.split(' ');
      const lastName = rest.join(' ').trim();

      this.dlog('Creating student:', { studentId, name, roll: normalizedRoll, classroom: classroom.classroomName });

      const programmes = this.buildProgrammesArrayFromClassroom(classroom);

      await this.afs.collection('Students').doc(studentId).set(
        {
          docId: studentId,
          id: studentId,
          linkUid: studentId,
          createdAt,
          source: 'MASTER_SHEET_UPLOAD',
          studentMeta: {
            linkUid: studentId,
            firstName: firstName || '',
            lastName: lastName || '',
            fullNameLowerCase: name.toLowerCase().replace(/\s+/g, ''),
            email: '',
            phoneNumber: '',
            countryCode: '',
            grade: null,
            updatedAt: createdAt,
          },
          classrooms: {
            [classroomId]: {
              institutionId,
              classroomId,
              type: 'CLASSROOM',
              rollNumber: normalizedRoll,
              createdAt,
              joinedDate: createdAt,
              activeStatus: true,
              programmes: programmes,
            },
          },
        },
        { merge: true }
      );


      // // CustomAuthentication mapping
      // await this.afs.collection('CustomAuthentication').doc(studentId).set(
      //   {
      //     docId: studentId,
      //     accessCode: normalizedRoll,
      //     studentId,
      //     classroomId,
      //     institutionId,
      //     createdAt,
      //     type: 'student_roll',
      //   },
      //   { merge: true }
      // );

      existingRolls.add(normalizedRoll);
      created++;
    }

    return created;
  }

  private async getExistingRollNumbersForClassroom(institutionId: string, classroomId: string): Promise<Set<string>> {
    const snap = await firstValueFrom(
      this.afs.collection('CustomAuthentication', ref =>
        ref.where('institutionId', '==', institutionId).where('classroomId', '==', classroomId)
      ).get()
    );

    const set = new Set<string>();
    snap.forEach(doc => {
      const d: any = doc.data();
      if (d?.accessCode) set.add(String(d.accessCode).trim());
    });

    this.dlog('CustomAuthentication snapshot size:', snap.size);

    return set;
  }

  // -----------------------------
  // Extraction helpers
  // -----------------------------
  private async extractFromImage(storagePath: string, fileName: string): Promise<any> {
    // generate id (same as before)
    const scannedArtefactId = this.afs.createId();

    this.dlog('extractFromImage payload:', { fileName, storagePath, scannedArtefactId });

    return firstValueFrom(
      this.http.post<any>(this.textExtractionUrl, {
        fileName,
        storagePath,
        scannedArtefactId, // ✅ REQUIRED by function
        // scannedAssignmentId: scannedArtefactId, // (optional) keep for backward compat if you want
      })
    );
  }


  private async extractFromPdf(file: File, institutionId: string): Promise<any[]> {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce((acc, byte) => acc + String.fromCharCode(byte), '')
    );

    const body = {
      fileData: base64,
      fileName: file.name,
      institutionId,
      classroomId: '',
      programmeId: '',
      learningUnitId: '',
      workflow: null,
      sequenceNumber: 0,
    };

    this.dlog('exportPDFToImages payload keys:', Object.keys(body));

    const responseBody = await firstValueFrom(this.http.post<any>(this.pdfExportUrl, body));

    this.dlog('exportPDFToImages response keys:', responseBody ? Object.keys(responseBody) : responseBody);
    this.dlog('exportPDFToImages uploadedFiles preview:', this.preview(responseBody?.uploadedFiles, 1200));

    if (!responseBody?.uploadedFiles?.length) throw new Error('PDF export failed: uploadedFiles not returned');

    const responses: any[] = [];
    for (let i = 0; i < responseBody.uploadedFiles.length; i++) {
      const page = responseBody.uploadedFiles[i];

      this.dlog(`PDF page[${i}] uploadedFile:`, page);

      const r = await firstValueFrom(
        this.http.post<any>(this.textExtractionUrl, {
          fileName: page.fileName,
          storagePath: page.storagePath,
          scannedArtefactId: page.scannedArtefactId || this.afs.createId(),
        })
      );

      this.dlog(`PDF page[${i}] extraction response preview:`, this.preview(r, 1200));

      responses.push(r);
    }

    return responses;
  }

  private buildProgrammesArrayFromClassroom(classroom: Classroom): any[] {
    return classroom?.programmes
      ? Object.values(classroom.programmes)   // ✅ keeps workflowIds
      : [];
  }

}
