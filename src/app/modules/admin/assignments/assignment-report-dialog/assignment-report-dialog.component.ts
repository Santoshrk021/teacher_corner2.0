// assignment-report-dialog.component.ts
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FuseDrawerService,
  AssignmentReportPayload,
  ReportInstitution,
  ReportClassroom,
  ReportProgramme
} from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';

import { AngularFirestore } from '@angular/fire/compat/firestore';
import * as XLSX from 'xlsx';
import * as FileSaver from 'file-saver';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexTitleSubtitle,
  ApexStroke,
  ApexDataLabels,
  ApexFill,
  ApexTooltip,
  ApexLegend,
  ApexResponsive,
  ApexNonAxisChartSeries,
  ApexPlotOptions,
} from 'ng-apexcharts';
import { ViewChild, ElementRef } from '@angular/core';

type StudentDoc = { id: string; data: any };

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis?: ApexXAxis;
  yaxis?: ApexYAxis;
  dataLabels?: ApexDataLabels;
  stroke?: ApexStroke;
  fill?: ApexFill;
  title?: ApexTitleSubtitle;
  tooltip?: ApexTooltip;
  legend?: ApexLegend;
  responsive?: ApexResponsive[];
  plotOptions?: ApexPlotOptions;
};

export type PieChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  legend?: ApexLegend;
  title?: ApexTitleSubtitle;
  responsive?: ApexResponsive[];
};

interface StudentSummaryRow {
  'Student Name': string;
  'Attempted Questions': number;
  'Correct Answers': number;
  'Percentage': string;
}

interface StudentDetailRow {
  'Student Name': string;
  'Question No.': string;
  'Question Description': string;
  'Correct Options': string;
  'Student Selected': string;
  'Is Correct': 'Yes' | 'No';
}

@Component({
  selector: 'app-assignment-report-dialog',
  templateUrl: './assignment-report-dialog.component.html',
  styleUrls: ['./assignment-report-dialog.component.scss']
})
export class AssignmentReportDialogComponent implements OnInit, OnDestroy {
  @ViewChild('chartsContainer') chartsContainer!: ElementRef<HTMLElement>;

  private sub?: Subscription;

  // Master lists from payload
  allInstitutions: ReportInstitution[] = [];
  allClassrooms: ReportClassroom[] = [];
  allProgrammes: ReportProgramme[] = [];
  allLearningUnits: Array<{ learningUnitId: string; learningUnitName: string }> = [];

  // Filtered lists for dropdowns
  institutions: ReportInstitution[] = [];
  classrooms: ReportClassroom[] = [];
  programmes: ReportProgramme[] = [];
  learningUnits: Array<{ learningUnitId: string; learningUnitName: string }> = [];

  // Selections
  selectedInstitutionId: string | null = null;
  selectedClassroomId: string | null = null;
  selectedProgrammeId: string | null = null;
  selectedLearningUnitId: string | null = null;

  // For summary row
  assignmentId: string | null = null;
  assignmentName: string | null = null;
  matchedStudentCount = 0;

  // Aggregate for question-wise export
  private aggregatedQuestions: any[] = [];
  private perQuestionCorrectCounts: number[] = [];
  private totalStudentsConsidered = 0;

  // Loading state for LU dropdown
  isLuLoading = false;

  // Caches
  private rsCache = new Map<string, any[]>();
  private latestAttemptCache = new Map<string, { attempt: any; attemptNumber: number } | null>();
  private accessCodeCache = new Map<string, string | null>();

  // Chart options
  barChartOptions!: Partial<ChartOptions>;
  pieChartOptions!: Partial<PieChartOptions>;
  radarChartOptions!: Partial<ChartOptions>;
  heatmapChartOptions!: Partial<ChartOptions>;
  private heatmapRows: Array<{ name: string; values: number[] }> = []; // 1=correct, 0=wrong, -1=not attempted
  showCharts = false;
  isExporting = false;
  currentExport: 'png' | 'pdf' | null = null;



  constructor(
    private drawerService: FuseDrawerService,
    private afs: AngularFirestore,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    this.sub = this.drawerService.reportData$.subscribe((data: AssignmentReportPayload | null) => {
      if (!data) { this.resetAll(); return; }

      this.allInstitutions = data.institutions || [];
      this.allClassrooms = data.classrooms || [];
      this.allProgrammes = data.programmes || [];
      this.allLearningUnits = data.learningUnits || [];

      this.assignmentId = (data as any).assignmentId ?? null;
      this.assignmentName = (data as any).assignmentName ?? null;

      this.institutions = this.allInstitutions.slice();
      this.classrooms = [];
      this.programmes = [];
      this.learningUnits = [];

      this.selectedInstitutionId = null;
      this.selectedClassroomId = null;
      this.selectedProgrammeId = null;
      this.selectedLearningUnitId = null;

      this.clearAggregate();
      this.clearCaches();
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async waitForRender(ms = 250): Promise<void> {
    await new Promise(res => requestAnimationFrame(() => setTimeout(res, ms)));
  }

  drawerClose() { this.drawerService.drawerOpenSubject.next(false); }

  // ---------- Dropdown handlers ----------

  onSelectInstitution(institutionId: string) {
    this.selectedInstitutionId = institutionId;
    this.selectedClassroomId = null;
    this.selectedProgrammeId = null;
    this.selectedLearningUnitId = null;

    this.classrooms = this.allClassrooms.filter(c => c.institutionId === institutionId);
    this.programmes = [];
    this.learningUnits = [];
    this.matchedStudentCount = 0;
    this.clearAggregate();
    this.clearCaches();
  }

  onSelectClassroom(classroomId: string) {
    this.selectedClassroomId = classroomId;
    this.selectedProgrammeId = null;
    this.selectedLearningUnitId = null;

    this.programmes = this.allProgrammes.filter(p => p.classroomId === classroomId);
    this.learningUnits = [];
    this.matchedStudentCount = 0;
    this.clearAggregate();
    this.clearCaches();
  }

  async onSelectProgramme(programmeId: string) {
    this.selectedProgrammeId = programmeId;
    this.selectedLearningUnitId = null;
    this.matchedStudentCount = 0;
    this.clearAggregate();
    this.clearCaches();

    await this.refreshLearningUnitsForCurrentSelection();
  }

  async onSelectLearningUnit(learningUnitId: string) {
    this.selectedLearningUnitId = learningUnitId;
    this.matchedStudentCount = 0;
    this.clearAggregate();
    this.clearCaches();

    await this.updateMatchedStudentCount();
  }

  /** Count students who have at least one attempt for the selected Programme + Learning Unit */
  private async updateMatchedStudentCount() {
    this.matchedStudentCount = 0;
    if (!this.assignmentId || !this.selectedProgrammeId || !this.selectedLearningUnitId
      || !this.selectedInstitutionId || !this.selectedClassroomId) return;

    const students = await this.fetchMatchingStudents();
    if (!students.length) return;

    let count = 0;
    await this.withConcurrency(students, 6, async (s) => {
      const latest = await this.fetchLatestAttemptForStudent(s.id);
      if (latest) count++;
    });

    this.matchedStudentCount = count;
  }

  private resetAll() {
    this.allInstitutions = this.allClassrooms = this.allProgrammes = [];
    this.institutions = this.classrooms = this.programmes = [];
    this.selectedInstitutionId = this.selectedClassroomId = this.selectedProgrammeId = null;

    this.allLearningUnits = this.learningUnits = [];
    this.selectedLearningUnitId = null;

    this.assignmentId = null;
    this.assignmentName = null;

    this.matchedStudentCount = 0;
    this.isLuLoading = false;

    this.clearAggregate();
    this.clearCaches();
  }

  // ---------- Learning Unit filtering ----------

  /** Build LU dropdown from attempts matching the current Programme (and quiz via parent RS) */
  private async refreshLearningUnitsForCurrentSelection() {
    this.learningUnits = [];
    this.selectedLearningUnitId = null;

    if (!this.assignmentId || !this.selectedInstitutionId || !this.selectedClassroomId || !this.selectedProgrammeId) return;

    this.isLuLoading = true;
    try {
      const matchingStudents = await this.fetchMatchingStudents();
      const allowedStudentIds = new Set(matchingStudents.map(s => s.id));
      if (allowedStudentIds.size === 0) return;

      const luMap = new Map<string, { learningUnitId: string; learningUnitName: string }>();

      for (const sid of allowedStudentIds) {
        const rsDocs = await this.getRemoteSubmissionsForStudent(sid);
        for (const rsd of rsDocs) {
          // Try index-backed query on latestProgrammeId first
          let attemptsDocs: any[] = [];
          try {
            const snap1 = await this.afs.collection(`Students/${sid}/remoteSubmissions/${rsd.id}/attempts`, ref =>
              ref.where('latestProgrammeId', '==', this.selectedProgrammeId!)
            ).get().toPromise();
            attemptsDocs = (snap1?.docs || []).map(d => this.snapDocToObj(d));
          } catch { }

          // If nothing via latestProgrammeId, try programmeId
          if (!attemptsDocs.length) {
            try {
              const snap2 = await this.afs.collection(`Students/${sid}/remoteSubmissions/${rsd.id}/attempts`, ref =>
                ref.where('programmeId', '==', this.selectedProgrammeId!)
              ).get().toPromise();
              attemptsDocs = (snap2?.docs || []).map(d => this.snapDocToObj(d));
            } catch { }
          }

          // Fallback: fetch all attempts and filter on client
          if (!attemptsDocs.length) {
            const allAttempts = await this.afs.collection(`Students/${sid}/remoteSubmissions/${rsd.id}/attempts`).get().toPromise();
            attemptsDocs = (allAttempts?.docs || [])
              .map(d => this.snapDocToObj(d))
              .filter(a => (a?.latestProgrammeId || a?.programmeId) === this.selectedProgrammeId);
          }

          // Collect unique LU ids
          for (const a of attemptsDocs) {
            const luId = a?.latestLearningUnitId || a?.learningUnitId || '';
            const luName = a?.latestLearningUnitName || a?.learningUnitName || a?.displayName || luId;
            if (luId && !luMap.has(luId)) {
              luMap.set(luId, { learningUnitId: luId, learningUnitName: luName });
            }
          }
        }
      }

      const byName = (a: any, b: any) => (a.learningUnitName || '').localeCompare(b.learningUnitName || '');
      this.learningUnits = Array.from(luMap.values()).sort(byName);
      if (!this.learningUnits.length) this.selectedLearningUnitId = null;
    } finally {
      this.isLuLoading = false;
    }
  }

  // ---------- Summary row helpers ----------

  get selectedInstitutionName(): string {
    const n = this.allInstitutions.find(i => i.institutionId === this.selectedInstitutionId)?.institutionName;
    return n || (this.selectedInstitutionId || '');
  }
  get selectedClassroomName(): string {
    const n = this.allClassrooms.find(c => c.classroomId === this.selectedClassroomId)?.classroomName;
    return n || (this.selectedClassroomId || '');
  }
  get selectedProgrammeName(): string {
    const n = this.allProgrammes.find(p => p.programmeId === this.selectedProgrammeId)?.programmeName;
    return n || (this.selectedProgrammeId || '');
  }

  get canDownload(): boolean {
    return !!(this.assignmentId && this.selectedInstitutionId && this.selectedClassroomId && this.selectedProgrammeId && this.selectedLearningUnitId);
  }

  get selectedLearningUnitName(): string {
    const n1 = this.learningUnits.find(lu => lu.learningUnitId === this.selectedLearningUnitId)?.learningUnitName;
    if (n1) return n1;
    const n2 = this.allLearningUnits.find(lu => lu.learningUnitId === this.selectedLearningUnitId)?.learningUnitName;
    return n2 || (this.selectedLearningUnitId || '');
  }

  // ---------- Export: QUESTION-WISE (existing) ----------

  async onClickDownloadExcel() {
    if (!this.canDownload) return;

    this.isExporting = true;
    try {
      const students = await this.fetchMatchingStudents();
      await this.buildAggregateFromStudents(students);
      this.exportQuestionAccuracy();
    } catch (e) {
      console.error('Export failed:', e);
    } finally {
      this.isExporting = false;
    }
  }

  private async fetchMatchingStudents(): Promise<StudentDoc[]> {
    if (!this.assignmentId) return [];

    const snap = await this.afs.collection('Students', ref =>
      ref.where('attemptedAssignments', 'array-contains', this.assignmentId)
    ).get().toPromise();

    const out: StudentDoc[] = [];

    (snap?.docs || []).forEach(d => {
      const data: any = d.data();
      const clsMap = data?.classrooms || {};

      const match = Object.values(clsMap as any).find((c: any) => {
        if (!c) return false;

        const okInst = this.selectedInstitutionId ? (c.institutionId === this.selectedInstitutionId) : true;
        const okCls = this.selectedClassroomId ? (c.classroomId === this.selectedClassroomId) : true;
        if (!okInst || !okCls) return false;

        if (this.selectedProgrammeId) {
          const progs = Array.isArray(c.programmes) ? c.programmes : [];
          return progs.some((p: any) => (p?.programmeId || p?.docId) === this.selectedProgrammeId);
        }
        return true;
      });

      if (match) out.push({ id: d.id, data });
    });

    return out;
  }

  private async buildAggregateFromStudents(students: StudentDoc[]) {
    this.clearAggregate();
    if (!this.assignmentId || !this.selectedLearningUnitId || !this.selectedProgrammeId) return;

    await this.withConcurrency(students, 6, async ({ id: sid }) => {
      const latest = await this.fetchLatestAttemptForStudent(sid);
      if (!latest?.attempt) return;

      const questions: any[] = Array.isArray(latest.attempt?.questions) ? latest.attempt.questions : [];
      if (!questions.length) return;

      if (!this.aggregatedQuestions.length) {
        this.aggregatedQuestions = questions;
        this.perQuestionCorrectCounts = new Array(questions.length).fill(0);
      }

      for (let i = 0; i < Math.min(questions.length, this.aggregatedQuestions.length); i++) {
        const q = questions[i] || {};
        const correct = this.getCorrectIndices(q);
        const selected = this.getSelectedIndices(q);
        const isMatch = selected.length === correct.length && selected.every(idx => correct.includes(idx));
        if (isMatch) this.perQuestionCorrectCounts[i]++;
      }

      this.totalStudentsConsidered++;
    });
  }

  private exportQuestionAccuracy() {
    const baseQuestions: any[] = this.aggregatedQuestions || [];
    const totalQuestions = baseQuestions.length || 0;
    const totalStudents = this.totalStudentsConsidered || 0;

    const rows: Array<{
      'Question No.': string;
      'Question Description': string;
      'Correct Count': number;
      'Percentage': string;
    }> = [];

    for (let i = 0; i < totalQuestions; i++) {
      const qVal = baseQuestions[i] || {};
      const raw = this.htmlToText(qVal.questionTitle || qVal.questionText);
      const description = this.stripLeadingIndex(raw);

      const correctCount = this.perQuestionCorrectCounts[i] || 0;
      const percentage = totalStudents > 0 ? Math.round((correctCount / totalStudents) * 100) : 0;

      rows.push({
        'Question No.': `Q${i + 1}`,
        'Question Description': description || `Q${i + 1}`,
        'Correct Count': correctCount,
        'Percentage': `${percentage}%`,
      });
    }

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(rows, {
      header: ['Question No.', 'Question Description', 'Correct Count', 'Percentage']
    });

    (ws['!cols'] as any) = [
      { wch: 10 },
      { wch: 70 },
      { wch: 14 },
      { wch: 12 },
    ];

    const wb: XLSX.WorkBook = {
      SheetNames: ['Question Accuracy'],
      Sheets: { 'Question Accuracy': ws },
    };

    const filename = this.makeFilename('', '.xlsx');
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, filename);
  }

  async onClickShowCharts() {
    if (!this.canDownload) return;

    this.isExporting = true;
    try {
      const students = await this.fetchMatchingStudents();

      // question aggregates (for radar)
      await this.buildAggregateFromStudents(students);

      // summary + heatmap
      const summaryRows = await this.computeSummaryAndHeatmap(students);

      // render charts
      this.buildCharts(summaryRows);

      // now reveal the charts section
      this.showCharts = true;
    } catch (e) {
      console.error('Show charts failed:', e);
    } finally {
      this.isExporting = false;
      this.cdr.markForCheck();
    }
  }


  /** Build StudentSummaryRow[] and heatmap rows WITHOUT downloading anything. */
  private async computeSummaryAndHeatmap(students: StudentDoc[]): Promise<StudentSummaryRow[]> {
    const summaryRows: StudentSummaryRow[] = [];
    this.heatmapRows = [];

    await this.withConcurrency(students, 6, async ({ id: sid, data }) => {
      const latest = await this.fetchLatestAttemptForStudent(sid);
      if (!latest) return;

      const studentName = await this.getStudentDisplayNameAsync(sid, data);
      const attempt = latest.attempt || {};
      const questions: any[] = Array.isArray(attempt?.questions) ? attempt.questions : [];

      // Determine row length (prefer aggregatedQuestions length if already known)
      const qCount = (this.aggregatedQuestions?.length || questions.length || 0) || questions.length;
      const rowValues = Array(Math.max(qCount, questions.length)).fill(-1);

      if (!questions.length) {
        summaryRows.push({
          'Student Name': studentName,
          'Attempted Questions': 0,
          'Correct Answers': 0,
          'Percentage': '0%',
        });
        this.heatmapRows.push({ name: studentName, values: rowValues });
        return;
      }

      let attemptedCount = 0;
      let correctCount = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i] || {};
        const correctIdxs = this.getCorrectIndices(q);
        const selectedIdxs = this.getSelectedIndices(q);

        const attempted = selectedIdxs.length > 0;
        if (attempted) attemptedCount++;

        const isCorrect =
          attempted &&
          selectedIdxs.length === correctIdxs.length &&
          selectedIdxs.every(idx => correctIdxs.includes(idx));

        rowValues[i] = !attempted ? -1 : (isCorrect ? 1 : 0);
        if (isCorrect) correctCount++;
      }

      this.heatmapRows.push({ name: studentName, values: rowValues });

      const pct = Math.round((correctCount / questions.length) * 100);
      summaryRows.push({
        'Student Name': studentName,
        'Attempted Questions': attemptedCount,
        'Correct Answers': correctCount,
        'Percentage': `${pct}%`,
      });
    });

    return summaryRows;
  }

  // ---------- Export: STUDENT-WISE (download + charts) ----------

  async onClickDownloadStudentWise() {
    if (!this.canDownload) return;

    this.isExporting = true;
    try {
      const students = await this.fetchMatchingStudents();
      await this.exportStudentWise(students);
    } catch (e) {
      console.error('Student-wise export failed:', e);
    } finally {
      this.isExporting = false;
    }
  }

  private async exportStudentWise(students: StudentDoc[]) {
    const summaryRows: StudentSummaryRow[] = [];
    const detailRows: StudentDetailRow[] = [];
    this.heatmapRows = [];

    await this.withConcurrency(students, 6, async ({ id: sid, data }) => {
      const latest = await this.fetchLatestAttemptForStudent(sid);
      if (!latest) return;

      const studentName = await this.getStudentDisplayNameAsync(sid, data);
      const attempt = latest.attempt || {};
      const questions: any[] = Array.isArray(attempt?.questions) ? attempt.questions : [];

      // Heatmap row setup
      const qCount = (this.aggregatedQuestions?.length || questions.length || 0) || questions.length;
      const rowValues = Array(Math.max(qCount, questions.length)).fill(-1);

      if (!questions.length) {
        summaryRows.push({
          'Student Name': studentName,
          'Attempted Questions': 0,
          'Correct Answers': 0,
          'Percentage': '0%',
        });
        this.heatmapRows.push({ name: studentName, values: rowValues });
        return;
      }

      let attemptedCount = 0;
      let correctCount = 0;

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i] || {};
        const correctIdxs = this.getCorrectIndices(q);
        const selectedIdxs = this.getSelectedIndices(q);

        const attempted = selectedIdxs.length > 0;
        if (attempted) attemptedCount++;

        const isCorrect =
          attempted &&
          selectedIdxs.length === correctIdxs.length &&
          selectedIdxs.every(idx => correctIdxs.includes(idx));

        rowValues[i] = !attempted ? -1 : (isCorrect ? 1 : 0);
        if (isCorrect) correctCount++;

        detailRows.push({
          'Student Name': studentName,
          'Question No.': `Q${i + 1}`,
          'Question Description': this.stripLeadingIndex(this.htmlToText(q?.questionTitle || q?.questionText || '')),
          'Correct Options': correctIdxs.map(this.optionIndexToLabel).join(','),
          'Student Selected': selectedIdxs.map(this.optionIndexToLabel).join(','),
          'Is Correct': isCorrect ? 'Yes' : 'No',
        });
      }

      this.heatmapRows.push({ name: studentName, values: rowValues });

      const pct = Math.round((correctCount / questions.length) * 100);
      summaryRows.push({
        'Student Name': studentName,
        'Attempted Questions': attemptedCount,
        'Correct Answers': correctCount,
        'Percentage': `${pct}%`,
      });
    });

    // Build and download Excel
    const wsSummary: XLSX.WorkSheet = XLSX.utils.json_to_sheet(summaryRows, {
      header: ['Student Name', 'Attempted Questions', 'Correct Answers', 'Percentage']
    });
    (wsSummary['!cols'] as any) = [{ wch: 32 }, { wch: 20 }, { wch: 16 }, { wch: 12 }];

    const wsDetail: XLSX.WorkSheet = XLSX.utils.json_to_sheet(detailRows, {
      header: ['Student Name', 'Question No.', 'Question Description', 'Correct Options', 'Student Selected', 'Is Correct']
    });
    (wsDetail['!cols'] as any) = [{ wch: 32 }, { wch: 12 }, { wch: 70 }, { wch: 16 }, { wch: 18 }, { wch: 10 }];

    const wb: XLSX.WorkBook = {
      SheetNames: ['Student Summary', 'Student Q&A'],
      Sheets: { 'Student Summary': wsSummary, 'Student Q&A': wsDetail },
    };

    const filename = this.makeFilename('_StudentWise', '.xlsx');
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    FileSaver.saveAs(blob, filename);
    this.cdr.markForCheck();
  }

  // ---------- Shared helpers ----------

  private optionIndexToLabel(idx: number): string {
    return String.fromCharCode(65 + (idx | 0));
  }

  private getCorrectIndices(q: any): number[] {
    const opts = Array.isArray(q?.options) ? q.options : [];
    const indices: number[] = [];
    opts.forEach((opt: any, idx: number) => { if (this.isTrue(opt?.isCorrect)) indices.push(idx); });
    return indices;
  }

  private getSelectedIndices(q: any): number[] {
    const opts = Array.isArray(q?.options) ? q.options : [];
    const sel: number[] = [];
    opts.forEach((opt: any, idx: number) => { if (this.isTrue(opt?.attemptedOption)) sel.push(idx); });
    return sel;
  }

  private isTrue(v: any): boolean {
    return v === true || v === 'true' || v === 1 || v === '1';
  }

  private htmlToText(html: string | undefined | null): string {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('img, picture, figure').forEach(el => el.remove());
    const text = (div.textContent || div.innerText || '').replace(/\s+/g, ' ').trim();
    return text.replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+/gi, '').trim();
  }

  private stripLeadingIndex(s: string): string {
    return s.replace(/^\s*(?:q(?:uestion)?\s*)?\d{1,3}\s*[\.\)\-–—:]\s*/i, '').trim();
  }

  private sanitize(s: string): string {
    return (s || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private clearAggregate() {
    this.aggregatedQuestions = [];
    this.perQuestionCorrectCounts = [];
    this.totalStudentsConsidered = 0;

    // Clear chart state as well to avoid stale visuals
    this.barChartOptions = undefined as any;
    this.pieChartOptions = undefined as any;
    this.radarChartOptions = undefined as any;
    this.heatmapChartOptions = undefined as any;
    this.heatmapRows = [];
    this.showCharts = false;

  }

  private clearCaches() {
    this.rsCache.clear();
    this.latestAttemptCache.clear();
  }

  private makeFilename(suffix: string, ext: string) {
    const inst = this.sanitize(this.selectedInstitutionName || 'Institution');
    const cls = this.sanitize(this.selectedClassroomName || 'Classroom');
    const prog = this.sanitize(this.selectedProgrammeName || 'Programme');
    const lu = this.sanitize(this.selectedLearningUnitName || 'LearningUnit');
    const quiz = this.sanitize(this.assignmentName || 'Assignment');
    return `${inst}_${cls}_${prog}_${lu}_${quiz}${suffix}${ext}`;
  }

  private async getStudentDisplayNameAsync(studentId: string, data: any): Promise<string> {
    const first = (data?.firstName || '').trim();
    const last = (data?.lastName || '').trim();
    const full = [first, last].filter(Boolean).join(' ').trim();
    if (full) return full;

    const access = await this.getAccessCode(studentId);
    return access || studentId;
  }

  private async getAccessCode(studentId: string): Promise<string | null> {
    if (this.accessCodeCache.has(studentId)) return this.accessCodeCache.get(studentId)!;

    let access: string | null = null;

    try {
      const docSnap = await this.afs.collection('CustomAuthentication').doc(studentId).get().toPromise();
      const docData: any = docSnap?.data?.() ?? docSnap?.data();
      if (docData?.accessCode) { access = String(docData.accessCode); }

      if (!access) {
        const qSnap = await this.afs.collection('CustomAuthentication', ref =>
          ref.where('docId', '==', studentId).limit(1)
        ).get().toPromise();

        const hit = qSnap?.docs?.[0];
        const qData: any = hit ? (typeof hit.data === 'function' ? hit.data() : hit.data) : null;
        if (qData?.accessCode) { access = String(qData.accessCode); }
      }
    } catch { }

    this.accessCodeCache.set(studentId, access);
    return access;
  }

  private snapDocToObj(d: any): { id: string;[k: string]: any } {
    const val = (typeof d.data === 'function' ? d.data() : d.data) || {};
    return { id: d.id, ...(val as Record<string, any>) };
  }

  private async withConcurrency<T>(
    items: T[],
    limit: number,
    worker: (item: T, index: number) => Promise<void>
  ) {
    const queue = [...items];
    const runners: Promise<void>[] = [];
    const runOne = async (i: number) => {
      const item = queue.shift();
      if (item === undefined) return;
      try { await worker(item, i); } finally { await runOne(i); }
    };
    for (let i = 0; i < Math.min(limit, items.length); i++) {
      runners.push(runOne(i));
    }
    await Promise.all(runners);
  }

  private async getRemoteSubmissionsForStudent(studentId: string): Promise<any[]> {
    const cacheKey = studentId;
    if (this.rsCache.has(cacheKey)) return this.rsCache.get(cacheKey)!;
    if (!this.assignmentId) return [];

    const rsSnap = await this.afs.collection(`Students/${studentId}/remoteSubmissions`, ref =>
      ref.where('quizId', '==', this.assignmentId)
    ).get().toPromise();

    const rsDocs = (rsSnap?.docs || []).map(d => this.snapDocToObj(d));
    this.rsCache.set(cacheKey, rsDocs);
    return rsDocs;
  }

  private async fetchLatestAttemptForStudent(sid: string): Promise<{ attempt: any; attemptNumber: number } | null> {
    const cacheKey = sid;
    if (this.latestAttemptCache.has(cacheKey)) return this.latestAttemptCache.get(cacheKey)!;

    if (!this.assignmentId || !this.selectedProgrammeId || !this.selectedLearningUnitId) {
      this.latestAttemptCache.set(cacheKey, null);
      return null;
    }

    const rsDocs = await this.getRemoteSubmissionsForStudent(sid);
    let candidateAttempts: any[] = [];

    for (const rsd of rsDocs) {
      let attemptsDocs: any[] = [];
      try {
        const snap1 = await this.afs.collection(`Students/${sid}/remoteSubmissions/${rsd.id}/attempts`, ref =>
          ref
            .where('latestLearningUnitId', '==', this.selectedLearningUnitId!)
            .where('latestProgrammeId', '==', this.selectedProgrammeId!)
        ).get().toPromise();
        attemptsDocs = (snap1?.docs || []).map((d: any) => this.snapDocToObj(d));
      } catch { }

      if (!attemptsDocs.length) {
        try {
          const snap2 = await this.afs.collection(`Students/${sid}/remoteSubmissions/${rsd.id}/attempts`, ref =>
            ref
              .where('learningUnitId', '==', this.selectedLearningUnitId!)
              .where('programmeId', '==', this.selectedProgrammeId!)
          ).get().toPromise();
          attemptsDocs = (snap2?.docs || []).map((d: any) => this.snapDocToObj(d));
        } catch { }
      }

      if (!attemptsDocs.length) {
        const allAttempts = await this.afs.collection(`Students/${sid}/remoteSubmissions/${rsd.id}/attempts`).get().toPromise();
        attemptsDocs = (allAttempts?.docs || [])
          .map(d => this.snapDocToObj(d))
          .filter(a =>
            (a?.latestLearningUnitId || a?.learningUnitId) === this.selectedLearningUnitId &&
            (a?.latestProgrammeId || a?.programmeId) === this.selectedProgrammeId
          );
      }

      candidateAttempts.push(...attemptsDocs);
    }

    if (!candidateAttempts.length) {
      this.latestAttemptCache.set(cacheKey, null);
      return null;
    }

    candidateAttempts.sort((a, b) => (Number(a?.attemptNumber || 0) - Number(b?.attemptNumber || 0)));
    const latest = candidateAttempts[candidateAttempts.length - 1];
    const result = { attempt: latest, attemptNumber: Number(latest?.attemptNumber || 0) };

    this.latestAttemptCache.set(cacheKey, result);
    return result;
  }

  private buildCharts(summaryRows: StudentSummaryRow[]): void {
    // 1) Bar Chart – Student Accuracy
    const names = summaryRows.map(s => s['Student Name']);
    const percentages = summaryRows.map(s => parseInt(s['Percentage']));

    this.barChartOptions = {
      series: [{ name: 'Accuracy', data: percentages }],
      chart: { type: 'bar', height: 350 },
      xaxis: { categories: names, labels: { rotate: -45 } },
      yaxis: { max: 100, title: { text: 'Accuracy (%)' } },
      dataLabels: { enabled: true },
      title: { text: 'Student Accuracy Comparison (Bar Chart)', align: 'center' },
    };

    // 2) Pie Chart – Performance Distribution
    const performance = { Excellent: 0, Average: 0, Poor: 0 };
    for (const p of percentages) {
      if (p >= 80) performance.Excellent++;
      else if (p >= 50) performance.Average++;
      else performance.Poor++;
    }
    this.pieChartOptions = {
      series: Object.values(performance),
      labels: Object.keys(performance),
      chart: { type: 'pie', height: 350 },
      title: { text: 'Performance Distribution (Pie Chart)', align: 'center' },
      legend: { position: 'bottom' }
    };

    // 3) Radar Chart – Question Accuracy
    const denom = this.totalStudentsConsidered || 1;
    const questionLabels = this.aggregatedQuestions.map((_, i) => `Q${i + 1}`);
    const questionAccuracy = this.perQuestionCorrectCounts.map(
      c => Math.round((c / denom) * 100)
    );
    this.radarChartOptions = {
      series: [{ name: 'Question Accuracy (%)', data: questionAccuracy }],
      chart: { type: 'radar', height: 350 },
      xaxis: { categories: questionLabels },
      yaxis: { max: 100, tickAmount: 5 },
      title: { text: 'Question-wise Accuracy (Radar Chart)', align: 'center' },
    };

    // 4) Heatmap – Student × Question
    const totalQ = this.aggregatedQuestions.length;
    const normalizedRows = this.heatmapRows.map(r => {
      const copy = r.values.slice(0, totalQ);
      while (copy.length < totalQ) copy.push(-1);
      return { name: r.name, values: copy };
    });

    const heatmapSeries: ApexAxisChartSeries = normalizedRows.map(r => ({
      name: r.name,
      data: r.values.map((v, i) => ({ x: `Q${i + 1}`, y: v }))
    }));

    this.heatmapChartOptions = {
      series: heatmapSeries,
      chart: { type: 'heatmap', height: Math.min(80 + normalizedRows.length * 24, 800) },
      dataLabels: { enabled: false },
      title: { text: 'Student × Question Grid (Heatmap)', align: 'center' },
      xaxis: { categories: questionLabels },
      plotOptions: {
        heatmap: {
          shadeIntensity: 0.4,
          colorScale: {
            ranges: [
              { from: 1, to: 1, name: 'Correct', color: '#16a34a' },
              { from: 0, to: 0, name: 'Wrong', color: '#dc2626' },
              { from: -1, to: -1, name: 'Not Attempted', color: '#9ca3af' },
            ],
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val: number) => {
            if (val === 1) return 'Correct';
            if (val === 0) return 'Wrong';
            return 'Not attempted';
          },
        },
      },
    };
  }

  async downloadChartsAsPNG() {
    if (!this.chartsContainer) return;

    this.isExporting = true;
    this.currentExport = 'png';
    this.cdr.markForCheck();

    try {
      const [{ default: html2canvas }] = await Promise.all([import('html2canvas')]);
      await this.waitForRender();

      const node = this.chartsContainer.nativeElement;
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const filename = this.makeFilename('_Charts', '.png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
    } catch (e) {
      console.error('PNG export failed', e);
    } finally {
      this.isExporting = false;
      this.currentExport = null;
      this.cdr.markForCheck();
    }
  }

  async downloadChartsAsPDF() {
    if (!this.chartsContainer) return;

    this.isExporting = true;
    this.currentExport = 'pdf';
    this.cdr.markForCheck();

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
      ]);

      await this.waitForRender();

      const node = this.chartsContainer.nativeElement;
      const canvas = await html2canvas(node, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight, undefined, 'FAST');
      } else {
        let y = 0, remaining = imgHeight;
        while (remaining > 0) {
          pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight, undefined, 'FAST');
          remaining -= pageHeight;
          if (remaining > 0) {
            pdf.addPage();
            y -= pageHeight;
          }
        }
      }

      pdf.save(this.makeFilename('_Charts', '.pdf'));
    } catch (e) {
      console.error('PDF export failed', e);
    } finally {
      this.isExporting = false;
      this.currentExport = null;
      this.cdr.markForCheck();
    }
  }


}
