// datadetails.component.ts
import { Component, OnInit, HostListener } from '@angular/core';
import { combineLatest, firstValueFrom } from 'rxjs';
import { take, skip } from 'rxjs/operators';
import { DataService } from './service/data.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import {
  ConfigurationService,
  MasterManagerCollection,
} from 'app/core/dbOperations/configuration/configuration.service';
import firebase from 'firebase/compat/app';

interface CompareSnapshot {
  normalIds?: string[];
  masterKeys?: string[];
  missingInMaster?: string[];
  missingInNormal?: string[];
}

type Path = string;
type IdGetter = (normal: any) => string;

type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'timestamp';

interface FieldRule {
  from?: Path;
  alt?: Path[];
  compute?: (normal: any) => any;
  default?: any;
  normalize?: (v: any) => any;
  type?: FieldType;
  blank?: any;
}

interface CollectionMapping {
  collectionName: string;
  masterType: string;
  masterMapField: string;
  idFromNormal: IdGetter;
  fields: Record<string, FieldRule>;
}

/* ---------- helpers ---------- */
const getByPath = (obj: any, path?: string): any => {
  if (!obj || !path) return undefined;
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
};
const coalesce = (...vals: any[]) => vals.find((v) => v !== undefined && v !== null && v !== '');
const unwrap = (row: any) => (row && row.value ? row.value : row);

/* ---------- PREVIEW blanks derived from template (no hardcode) ---------- */
/** Fill missing keys from `template`. For leaves, missing => "" (UI only). */
function fillMissingForPreview(target: any, template: any): any {
  // If no template, just return target or empty object
  if (template === null || template === undefined) {
    return target ?? {};
  }

  // Arrays: keep array if target is array; else use empty array
  if (Array.isArray(template)) {
    return Array.isArray(target) ? target : [];
  }

  // Objects: recurse per key in template
  if (template && typeof template === 'object') {
    const out: any = { ...(target ?? {}) };
    for (const [k, sample] of Object.entries(template)) {
      out[k] = fillMissingForPreview(out[k], sample);
    }
    return out;
  }

  // Leaf: if target is missing/undefined, preview as ""
  return (target === undefined) ? "" : target;
}

/** Build a preview-only blank object from the template (all leaves -> "") */
function blankFromTemplate(template: any): any {
  if (template === null || template === undefined) return {};
  if (Array.isArray(template)) return [];
  if (template && typeof template === 'object') {
    const o: any = {};
    for (const [k, v] of Object.entries(template)) {
      o[k] = blankFromTemplate(v);
    }
    return o;
  }
  // leaf
  return "";
}

/* ---------- tiny compute/normalize evaluator ---------- */
const isRef = (x: any) => typeof x === 'string' && x.startsWith('$');
const deref = (row: any, ref: string) => getByPath(row, ref.slice(1));
const toPrim = (v: any) => (v == null ? '' : String(v));

function evalExpr(expr: any[] | undefined, row: any, seed?: any) {
  if (!expr || !Array.isArray(expr) || expr.length === 0) return undefined;
  const [op, ...args] = expr;
  const valueOf = (a: any) => (a === '$__seed__' ? seed : (isRef(a) ? deref(row, a) : a));

  switch (op) {
    case 'coalesce': {
      for (const a of args) {
        const v = valueOf(a);
        if (v !== undefined && v !== null && v !== '') return v;
      }
      return undefined;
    }
    case 'join': {
      const [sep, ...rest] = args;
      return rest.map(valueOf).filter(v => v != null && v !== '').join(sep ?? '');
    }
    case 'concat':   return args.map(valueOf).join('');
    case 'upper':    return toPrim(valueOf(args[0])).toUpperCase();
    case 'lower':    return toPrim(valueOf(args[0])).toLowerCase();
    case 'trim':     return toPrim(valueOf(args[0])).trim();
    case 'toString': return toPrim(valueOf(args[0]));
    default:         return undefined;
  }
}

/* ---------- applyRule ---------- */
const applyRule = (row: any, rule: FieldRule): any => {
  const computed = rule.compute?.(row);
  const primary = rule.from ? getByPath(row, rule.from) : undefined;
  const alternatives = (rule.alt ?? []).map((p) => getByPath(row, p));

  let val = coalesce(computed, primary, ...alternatives, rule.default);
  return rule.normalize ? rule.normalize(val) : val;
};

@Component({
  selector: 'app-datadetails',
  templateUrl: './datadetails.component.html',
  styleUrls: ['./datadetails.component.scss'],
})
export class DatadetailsComponent implements OnInit {
  collections: MasterManagerCollection[] = [];
  selectedCollection: MasterManagerCollection | null = null;

  isLoading = false;
  isWorking = false;
  progressTotal = 0;
  progressCurrent = 0;

  dataWithoutMaster: any[] = [];
  dataMaster: any[] = [];

  missingMaster: any[] = [];
  missingNormal: any[] = [];

  selectedItems: any[] = [];
  selectedNormalItems: any[] = [];
  selectedMode: 'master' | 'normal' = 'master';

  comparisonResults: CompareSnapshot | null = null;

  showMappingDialog = false;
  mappingForm = { type: '', master: '', field: '' };

  private lastRunId = 0;
  private lastLoadedSignature = '';

  // preview
  previewOpen = false;
  previewSide: 'normal' | 'master' = 'normal';
  previewId = '';
  previewExpected: any = null;
  previewActual: any = null;
  previewDiffs: Array<{ field: string; expected: any; actual: any; match: boolean }> = [];
  previewNotFound = false;
  previewRow: any = null;
  previewTab: 'diff' | 'expected' | 'actual' = 'diff';
  previewWidth = 80; // vw

  // learned shape (template) for current Normal collection
  private templateShape: any = null;

  currentItem: any;

  // batch selection controls
  batchOptions: number[] = [10, 20, 50, 100];
  leftBatch: number | null = null;   // for Normal -> Master
  rightBatch: number | null = null;  // for Master -> Normal

  /** Mapping config (optional) */
  private mappingCfg: Record<string, any> = {};

  constructor(
    public dataservice: DataService,
    private configSvc: ConfigurationService,
    private masterService: MasterService
  ) {}

  /* ---- counts ---- */
  get totalInMaster(): number { return this.comparisonResults?.masterKeys?.length ?? 0; }
  get totalInNormal(): number { return this.comparisonResults?.normalIds?.length ?? 0; }
  get missingInMasterCount(): number { return this.comparisonResults?.missingInMaster?.length ?? 0; }
  get missingInNormalCount(): number { return this.comparisonResults?.missingInNormal?.length ?? 0; }
  get previewMismatchCount(): number { return (this.previewDiffs ?? []).filter((d) => !d.match).length; }
  get previewMatchCount(): number { return (this.previewDiffs ?? []).filter((d) => d.match).length; }

  // limited views based on selected batch size
  get leftDisplayRows(): any[] {
    const src = this.missingMaster ?? [];
    const n = Number(this.leftBatch) || 0;
    return n > 0 ? src.slice(0, n) : [];
  }
  get rightDisplayRows(): any[] {
    const src = this.missingNormal ?? [];
    const n = Number(this.rightBatch) || 0;
    return n > 0 ? src.slice(0, n) : [];
  }

  get expectedTargetLabel(): string {
    return this.previewSide === 'normal' ? 'to Master' : `to ${this.selectedCollection?.type || 'Normal'}`;
  }
  get actualSideLabel(): string {
    if (this.previewSide === 'normal') return 'Master';
    return this.previewNotFound ? 'Master' : 'Normal';
  }

  /* ---- width control ---- */
  onWidthInput(e: Event) {
    const n = (e.target as HTMLInputElement).valueAsNumber;
    this.previewWidth = Number.isFinite(n) ? Math.min(96, Math.max(50, n)) : this.previewWidth;
  }
  bump(d: number) {
    this.previewWidth = Math.min(96, Math.max(50, this.previewWidth + d));
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.previewOpen || !e.ctrlKey) return;
    if (e.key === '+' || e.key === '=') { this.bump(+2); e.preventDefault(); }
    if (e.key === '-')                  { this.bump(-2); e.preventDefault(); }
    if (e.key === '0')                  { this.previewWidth = 80; e.preventDefault(); }
  }


  ensurePreviewSelection() {
    if (!this.selectedItems?.length && this.currentItem) {
      this.selectedItems = [this.currentItem];
    }
  }

  // ---- batch selection handlers ----
  onLeftBatchChange(n: number) {
    if (!this.selectedCollection) return;
    const count = Number(n) || 0;
    this.selectedItems = (this.missingMaster ?? []).slice(0, count);
  }

  onRightBatchChange(n: number) {
    if (!this.selectedCollection) return;
    const count = Number(n) || 0;
    this.selectedNormalItems = (this.missingNormal ?? []).slice(0, count);
  }

  get canAddToMaster(): boolean {
    return !!(this.selectedCollection?.master &&
              this.selectedCollection?.field &&
              this.selectedItems?.length);
  }

  async ngOnInit() {
    this.isLoading = true;
    try {
      this.mappingCfg   = await firstValueFrom(this.configSvc.getMasterManagerMappings$());
      this.collections  = await firstValueFrom(this.configSvc.getMasterManagerCollections$());
      this.selectedCollection = null;
      this.resetUI();
      this.ensurePreviewSelection();
    } finally {
      this.isLoading = false;
    }
  }

  /* ---- id helpers ---- */
  private norm(v: any): string { return String(v ?? '').trim(); }
  private normalIdOf(item: any): string { return this.norm(item?.id ?? item?.docId ?? item?.docID); }
  private masterKeyOf(item: any): string { return this.norm(item?.key ?? item?.docId ?? item?.docID ?? item?.id); }

  toggleSelection(item: any) {
    const id = this.normalIdOf(item);
    const i = this.selectedItems.findIndex((x) => this.normalIdOf(x) === id);
    if (i > -1) this.selectedItems.splice(i, 1);
    else this.selectedItems.push(item);
  }
  isSelected(item: any) {
    const id = this.normalIdOf(item);
    return this.selectedItems.some((x) => this.normalIdOf(x) === id);
  }

  toggleSelectionNormal(item: any) {
    const k = this.masterKeyOf(item);
    const i = this.selectedNormalItems.findIndex((x) => this.masterKeyOf(x) === k);
    if (i > -1) this.selectedNormalItems.splice(i, 1);
    else this.selectedNormalItems.push(item);
  }
  isSelectedNormal(item: any) {
    const k = this.masterKeyOf(item);
    return this.selectedNormalItems.some((x) => this.masterKeyOf(x) === k);
  }

  toggleAllLeft(checked: boolean) {
    this.selectedItems = checked ? [...(this.missingMaster ?? [])] : [];
  }
  toggleAllRight(checked: boolean) {
    this.selectedNormalItems = checked ? [...(this.missingNormal ?? [])] : [];
  }

  private resetUI() {
    this.selectedItems = [];
    this.selectedNormalItems = [];
    this.missingMaster = [];
    this.missingNormal = [];
    this.dataWithoutMaster = [];
    this.dataMaster = [];
    this.comparisonResults = null;
    this.templateShape = null;
    this.leftBatch = null;
    this.rightBatch = null;
  }

  async onSelectionChange() {
    const runId = ++this.lastRunId;
    this.isLoading = true;
    this.resetUI();
    if (!this.selectedCollection) { this.isLoading = false; return; }

    try {
      await this.loadDataFreshForSelection();
      await this.runCompleteComparison();
    } finally {
      if (runId === this.lastRunId) this.isLoading = false;
    }
  }

  /** After switching queries, loads data and learns the template shape. */
  private async loadDataFreshForSelection() {
    if (!this.selectedCollection) return;

    const sig =
      `${this.selectedCollection.type}|` +
      `${this.selectedCollection.master}|` +
      `${this.selectedCollection.field}`;

    this.dataservice.readDataCollection(this.selectedCollection.type);
    this.dataservice.readMasterDataCollection(
      this.selectedCollection.master,
      this.selectedCollection.field
    );
    
    const useSkip = sig !== this.lastLoadedSignature;
    this.lastLoadedSignature = sig;
     
    const data$ = useSkip ? this.dataservice.data$.pipe(skip(1)) : this.dataservice.data$;
    const master$ = useSkip ? this.dataservice.masterData$.pipe(skip(1)) : this.dataservice.masterData$;

    await firstValueFrom(combineLatest([data$, master$]).pipe(take(1)));

    // Learn template shape (no hardcoded field names)
    this.templateShape = await this.dataservice.getCollectionTemplate(this.selectedCollection.type);
  }

  /** One authoritative compare + rebuild both tables and counters. */
  private async runCompleteComparison() {
    if (!this.selectedCollection) return;

    const [normalData, masterData] = await firstValueFrom(
      combineLatest([this.dataservice.data$, this.dataservice.masterData$]).pipe(take(1))
    );

    this.dataWithoutMaster = normalData;
    this.dataMaster = masterData;

    const nIds = new Set<string>((normalData ?? []).map((x) => this.normalIdOf(x)));
    const mKeys = new Set<string>((masterData ?? []).map((x) => this.masterKeyOf(x)));

    const missingInMaster: string[] = Array.from(nIds).filter((id) => !mKeys.has(id));
    const missingInNormal: string[] = Array.from(mKeys).filter((k) => !nIds.has(k));

    const missMasterSet = new Set<string>(missingInMaster);
    const missNormalSet = new Set<string>(missingInNormal);

    this.missingMaster = normalData.filter((x) => missMasterSet.has(this.normalIdOf(x)));
    this.missingNormal = masterData
      .filter((x) => missNormalSet.has(this.masterKeyOf(x)))
      .map((x) => ({ ...x, key: this.masterKeyOf(x) }));

    this.comparisonResults = {
      normalIds: Array.from(nIds),
      masterKeys: Array.from(mKeys),
      missingInMaster,
      missingInNormal,
    };
  }

  async onAddToMaster() {
    if (!this.selectedCollection || this.selectedItems.length === 0) return;

    const masterType = this.selectedCollection.master;
    const fieldName  = this.selectedCollection.field;

    const ids = new Set(this.selectedItems.map((x) => this.normalIdOf(x)));
    this.missingMaster = this.missingMaster.filter((row) => !ids.has(this.normalIdOf(row)));

    this.isWorking = true;
    this.progressTotal = this.selectedItems.length;
    this.progressCurrent = 0;
    try {
      // Determine storage model: default MAP; use ARRAY if latest master doc shows array at field
      let useArrayModel = false;
      try {
        const latest = await this.masterService.getLatestMasterDoc(masterType);
        const existingField = latest?.[fieldName as any];
        useArrayModel = Array.isArray(existingField);
      } catch { useArrayModel = false; }

      // Add one by one using MasterService
      for (const it of this.selectedItems) {
        const id = this.normalIdOf(it);
        if (!id) continue;

        const objectData = { ...(it?.value && typeof it.value === 'object' ? it.value : it), docId: id };

        if (useArrayModel) {
          await this.masterService.addNewObjectToMasterArray(masterType, fieldName, objectData);
        } else {
          await this.masterService.addNewObjectToMasterMap(masterType, fieldName, objectData);
        }
        this.progressCurrent++;
      }

      // Fast refresh: reload master data stream once and rebuild tables
      this.dataservice.readMasterDataCollection(masterType, fieldName);
      await firstValueFrom(this.dataservice.masterData$.pipe(skip(1), take(1)));
      await this.runCompleteComparison();
    } finally {
      this.selectedItems = [];
      this.progressTotal = 0;
      this.progressCurrent = 0;
      this.isWorking = false;
    }
  }

  async onAddToNormal() {
    if (!this.selectedCollection || this.selectedNormalItems.length === 0) return;

    const keys = new Set(this.selectedNormalItems.map(x => this.masterKeyOf(x)));
    this.missingNormal = this.missingNormal.filter(row => !keys.has(this.masterKeyOf(row)));

    this.isWorking = true;
    this.progressTotal = this.selectedNormalItems.length;
    this.progressCurrent = 0;
    try {
      for (const it of this.selectedNormalItems) {
        await this.dataservice.addOneToNormalSimple(this.selectedCollection.type, it);
        this.progressCurrent++;
      }
      // Refresh Normal once and rebuild tables
      this.dataservice.readDataCollection(this.selectedCollection.type);
      await firstValueFrom(this.dataservice.data$.pipe(skip(1), take(1)));
      await this.runCompleteComparison();
    } finally {
      this.selectedNormalItems = [];
      this.progressTotal = 0;
      this.progressCurrent = 0;
      this.isWorking = false;
    }
  }

  /* ---------- mapping builders (optional config) ---------- */
  private guessType(v: any): FieldType {
    if (Array.isArray(v)) return 'array';
    if (v && typeof v === 'object') {
      if ('seconds' in v && 'nanoseconds' in v) return 'timestamp';
      return 'object';
    }
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') return t as FieldType;
    return 'string';
  }

  private buildMappingFromConfig(colType: string, side: 'normal'|'master', row: any): CollectionMapping | null {
    const cfg = this.mappingCfg?.[colType];
    if (!cfg) return null;

    const idFields: string[] = Array.isArray(cfg.id) ? cfg.id : [cfg.id];
    const idFromNormal: IdGetter = (n: any) => {
      for (const f of idFields) {
        const v = getByPath(n, f) ?? n?.[f];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
      return String(n?.id ?? n?.docId ?? n?.docID ?? '').trim();
    };

    const sample = side === 'normal' ? row : unwrap(row);
    const fields: Record<string, FieldRule> = {};

    Object.entries(cfg.fields || {}).forEach(([k, r]: any) => {
      const rule: FieldRule = {
        from: r.from,
        alt: r.alt,
        default: r.default,
        type: r.type as FieldType,
        blank: r.blank,
      };
      if (!rule.type && sample && Object.prototype.hasOwnProperty.call(sample, k)) {
        rule.type = this.guessType(sample[k]);
      }
      if (Array.isArray(r.compute)) {
        rule.compute = (n: any) => evalExpr(r.compute, n);
      }
      if (Array.isArray(r.normalize) && r.normalize.length > 0) {
        rule.normalize = (v: any) => evalExpr(['toString', '$__seed__'], { __seed__: v }, v) ?? v;
      }
      fields[k] = rule;
    });

    return {
      collectionName: colType,
      masterType: cfg.masterType,
      masterMapField: cfg.masterMapField,
      idFromNormal,
      fields,
    };
  }

  private buildDynamicMappingForRow(side: 'normal'|'master', row: any): CollectionMapping {
    const sample = side === 'normal' ? row : unwrap(row);
    const fields: Record<string, FieldRule> = {};
    Object.keys(sample || {}).forEach(k => {
      fields[k] = { from: k, type: this.guessType(sample[k]) };
    });
    return {
      collectionName: this.selectedCollection?.type || 'Unknown',
      masterType: this.selectedCollection?.master || '',
      masterMapField: this.selectedCollection?.field || '',
      idFromNormal: (n: any) => String(n?.id ?? n?.docId ?? n?.docID ?? '').trim(),
      fields,
    };
  }

  private buildExpectedMasterEntry(mapping: CollectionMapping, normalRow: any) {
    const expected: any = {};
    for (const [masterField, rule] of Object.entries(mapping.fields)) {
      const v = applyRule(normalRow, rule as FieldRule);
      if (v !== undefined) expected[masterField] = v;
    }
    // Fill any missing keys (preview only) from template
    return fillMissingForPreview(expected, this.templateShape);
  }

  private buildExpectedFromMaster(mapping: CollectionMapping, masterRow: any) {
    // Start from what master has
    const expected: any = {};
    for (const key of Object.keys(mapping.fields)) {
      if (Object.prototype.hasOwnProperty.call(masterRow ?? {}, key)) {
        expected[key] = masterRow[key];
      }
    }
    // Add any missing keys from template for preview purposes
    return fillMissingForPreview(expected, this.templateShape);
  }

  private findActualMasterEntry(mapping: CollectionMapping, id: string) {
    const matched = this.dataMaster.find((m) => this.masterKeyOf(m) === id);
    return matched ? unwrap(matched) : undefined;
  }

  private diffRows(expected: any, actual: any) {
    const fields = new Set<string>([
      ...Object.keys(expected || {}),
      ...Object.keys(actual || {}),
    ]);
    const diffs: Array<{ field: string; expected: any; actual: any; match: boolean }> = [];
    for (const f of fields) {
      const e = expected?.[f];
      const a = actual?.[f];
      const match = JSON.stringify(e) === JSON.stringify(a);
      diffs.push({ field: f, expected: e, actual: a, match });
    }
    return diffs;
  }

  preview(side: 'normal' | 'master', row: any) {
    const colType = this.selectedCollection?.type ?? '';

    const mappingFromCfg = this.buildMappingFromConfig(colType, side, row);
    const mapping = mappingFromCfg ?? this.buildDynamicMappingForRow(side, row);

    this.previewSide = side;
    this.previewRow = row;

    if (side === 'normal') {
      const id = mapping.idFromNormal(row);
      this.previewId = id;

      const expectedCore = this.buildExpectedMasterEntry(mapping, row);
      const actualRow = this.findActualMasterEntry(mapping, id);
      const actual = actualRow
        ? fillMissingForPreview(actualRow, this.templateShape)
        : (this.templateShape ? blankFromTemplate(this.templateShape) : {});

      this.previewExpected = expectedCore;
      this.previewActual = actual;
      this.previewDiffs = this.diffRows(expectedCore, actualRow);
      this.previewNotFound = !actualRow;
    } else {
      const id = this.masterKeyOf(row);
      this.previewId = id;

      const masterRow = unwrap(row);
      const normal = this.dataWithoutMaster.find((n) => mapping.idFromNormal(n) === id);

      const expected = normal
        ? this.buildExpectedMasterEntry(mapping, normal)
        : this.buildExpectedFromMaster(mapping, masterRow);

      const actual = (normal ?? masterRow)
        ? fillMissingForPreview(normal ?? masterRow, this.templateShape)
        : (this.templateShape ? blankFromTemplate(this.templateShape) : {});

      this.previewExpected = expected;
      this.previewActual = actual;
      this.previewDiffs = this.diffRows(expected, normal);
      this.previewNotFound = !normal;
    }

    this.previewOpen = true;
    this.previewTab = 'diff';
  }

  // ---------- Timestamp-friendly formatting for table cells ----------
  private asTimestamp(val: any): firebase.firestore.Timestamp | null {
    if (val instanceof firebase.firestore.Timestamp) return val;
    if (
      val && typeof val === 'object' &&
      typeof val.seconds === 'number' &&
      typeof val.nanoseconds === 'number' &&
      Object.keys(val).length === 2
    ) {
      return new firebase.firestore.Timestamp(val.seconds, val.nanoseconds);
    }
    return null;
  }
  private formatTimestamp(ts: firebase.firestore.Timestamp): string {
    return ts.toDate().toLocaleString();
  }

  formatVal(v: any): string {
    if (v === undefined || v === null) return '';
    const ts = this.asTimestamp(v);
    if (ts) return this.formatTimestamp(ts);
    try {
      if (typeof v === 'object') {
        return JSON.stringify(v, (_k, val) => {
          const t = this.asTimestamp(val);
          return t ? this.formatTimestamp(t) : val;
        });
      }
      return String(v);
    } catch {
      return String(v);
    }
  }
  stringify(obj: any): string {
    return JSON.stringify(obj, (_k, val) => {
      const t = this.asTimestamp(val);
      return t ? this.formatTimestamp(t) : val;
    }, 2);
  }

  closePreview() {
    this.previewOpen = false;
  }

  async addOneToMasterFromPreview() {
    if (!this.selectedCollection || !this.previewNotFound || this.previewSide !== 'normal') return;

    const colType = this.selectedCollection.type;
    const mapping =
      this.buildMappingFromConfig(colType, 'normal', this.previewRow) ??
      this.buildDynamicMappingForRow('normal', this.previewRow);

    const normalRow =
      this.dataWithoutMaster.find((n) => mapping.idFromNormal(n) === this.previewId);

    if (!normalRow) return;

    this.selectedItems = [normalRow];
    await this.onAddToMaster();
    this.previewOpen = false;
  }

  async addOneToNormalFromPreview() {
    if (!this.selectedCollection || !this.previewNotFound || this.previewSide !== 'master') return;
    if (!this.previewRow) return;

    this.selectedNormalItems = [this.previewRow];

    await this.dataservice.addToNormal(
      this.selectedCollection.type,
      this.selectedNormalItems,
      this.selectedCollection.master,
      this.selectedCollection.field
    );

    this.previewOpen = false;
  }

  async saveMapping() {
    const type   = (this.mappingForm.type || '').trim();
    const master = (this.mappingForm.master || '').trim();
    const field  = (this.mappingForm.field || '').trim();

    if (!type || !master || !field) {
      alert('Please fill Collection name, Master type, and Field key.');
      return;
    }

    const row = { type, master: master.toUpperCase(), field };

    try {
      await this.configSvc.addMasterManagerCollection(row);
      this.collections = await firstValueFrom(this.configSvc.getMasterManagerCollections$());
      this.showMappingDialog = false;
      this.mappingForm = { type: '', master: '', field: '' };
    } catch (e) {
      console.error('Failed to save mapping', e);
      alert('Failed to save mapping. See console for details.');
    }
  }
}
