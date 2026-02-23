import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { SharedService } from 'app/shared/shared.service';

@Injectable({ providedIn: 'root' })
export class DataService {
  private static readonly ISO_WITH_T = /^\d{4}-\d{2}-\d{2}T/;

  private isRealId = (id: string) =>
    !!id && id !== '--schema--' && id !== '--trash--' && id !== '0' && !/^\d+$/.test(String(id));


  private dataSubject   = new BehaviorSubject<any[]>([]);
  private masterSubject = new BehaviorSubject<any[]>([]);

  data$       = this.dataSubject.asObservable();
  masterData$ = this.masterSubject.asObservable();

  constructor(
    private afs: AngularFirestore,
    private masterdataService: MasterService,
    private _sharedService: SharedService
  ) {}

  /* --------------------------- READS (Normal) --------------------------- */

  readDataCollection(collectionName: string) {
    const coll = (collectionName ?? '').trim();
    this.afs.collection(coll).get().subscribe(snap => {
      const rows: any[] = [];
      snap.forEach(doc => {
        if (!this.isRealId(doc.id)) return;
        rows.push({ ...(doc.data() as any), id: doc.id });
      });
      this.dataSubject.next(rows);
    });
  }

  // Accepts either a map { [id]: row } or an array [{docId:..}, ...]
  readMasterDataCollection(masterType: string, fieldType: string) {
    this.masterdataService.getAllMasterDocsMap(masterType, fieldType).subscribe((data: any) => {
      const rows: any[] = [];
      if (Array.isArray(data)) {
        for (const el of data) {
          const key = String(el?.docId ?? el?.id ?? '').trim();
          if (this.isRealId(key)) rows.push({ key, value: el });
        }
      } else if (data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]) => {
          if (this.isRealId(key)) rows.push({ key, value });
        });
      }
      this.masterSubject.next(rows);
    });
  }

  private async listMasterDocsWithField(masterType: string, fieldType: string): Promise<string[]> {
    const prefix = `${masterType.toLowerCase()}_master_`;
    const coll   = this.afs.firestore.collection('Master');
    const snap   = await coll.get();

    const holders: string[] = [];
    for (const d of snap.docs) {
      if (!d.id.startsWith(prefix)) continue;
      const data = (await coll.doc(d.id).get()).data() as any;
      if (data && typeof data[fieldType] !== 'undefined') holders.push(d.id);
    }
    return holders;
  }

  public async verifyKeyInMaster(
    masterType: string,
    fieldType: string,
    docId: string
  ): Promise<{ found: boolean; shard: string | null }> {
    const holders = await this.listMasterDocsWithField(masterType, fieldType);
    for (const shard of holders) {
      const snap  = await this.afs.firestore.collection('Master').doc(shard).get();
      const field = ((snap.data() || {}) as any)[fieldType];

      if (Array.isArray(field)) {
        if (field.some((x: any) => String(x?.docId ?? x?.id ?? '') === docId)) {
          return { found: true, shard };
        }
      } else if (field && typeof field === 'object') {
        if (Object.prototype.hasOwnProperty.call(field, docId)) {
          return { found: true, shard };
        }
      }
    }
    return { found: false, shard: null };
  }

  async getNormalDatabaseIDs(collectionName: string): Promise<string[]> {
    const snap = await firstValueFrom(this.afs.collection((collectionName ?? '').trim()).get());
    if (!snap || snap.empty) return [];
    return snap.docs.map(d => d.id).filter(this.isRealId);
  }

  private extractIdsFromMasterField(field: any): Set<string> {
    const out = new Set<string>();
    if (!field) return out;
    if (Array.isArray(field)) {
      for (const el of field) {
        const id = String(el?.docId ?? el?.id ?? '').trim();
        if (this.isRealId(id)) out.add(id);
      }
      return out;
    }
    if (typeof field === 'object') {
      for (const k of Object.keys(field)) {
        if (this.isRealId(k)) out.add(k);
      }
    }
    return out;
  }

  private async getMasterDatabaseKeysDirect(masterType: string, fieldType: string): Promise<string[]> {
    const holders = await this.listMasterDocsWithField(masterType, fieldType);
    if (holders.length === 0) return [];
    const keys = new Set<string>();
    for (const id of holders) {
      const snap  = await this.afs.firestore.collection('Master').doc(id).get();
      const field = ((snap.data() || {}) as any)[fieldType];
      this.extractIdsFromMasterField(field).forEach(k => keys.add(k));
    }
    return Array.from(keys);
  }

  async compareAllDatabases(collectionName: string, masterType: string, fieldType: string) {
    const norm = (s: any) => String(s ?? '').trim();
    const normalIds  = (await this.getNormalDatabaseIDs(collectionName)).map(norm);
     const masterKeys = (await this.getMasterDatabaseKeysDirect(masterType, fieldType)).map(norm);
    const masterSet = new Set(masterKeys);
    const normalSet = new Set(normalIds);
    const missingInMaster = normalIds.filter(id => !masterSet.has(id));
    const missingInNormal = masterKeys.filter(id => !normalSet.has(id));
    const commonIds       = normalIds.filter(id => masterSet.has(id));
    return { normalIds, masterKeys, missingInMaster, missingInNormal, commonIds };
  }


  /** Read one existing doc from the target collection to use as a type/shape template. */
public async getCollectionTemplate(coll: string, preferredDocId?: string): Promise<any | null> {
    const colRef = this.afs.firestore.collection(coll);
    if (preferredDocId) {
      const snap = await colRef.doc(preferredDocId).get();
      if (snap.exists) return snap.data();
    }
    const snap = await colRef.limit(20).get();
    for (const d of snap.docs) {
      if (this.isRealId(d.id)) return d.data();
    }
    return null;
  }


  async addToNormal(
    collectionName: string,
    items: any[],
    masterType?: string,
    fieldType?: string,
    opts?: { templateDocId?: string }
  ) {
    const coll = (collectionName ?? '').trim();
    const batch = this.afs.firestore.batch();
    for (const item of items ?? []) {
      const key = String(item?.key ?? item?.id ?? item?.docId ?? item?.docID ?? '').trim();
      if (!this.isRealId(key)) continue;
      const raw = (item?.value && typeof item.value === 'object') ? item.value : item;
      const payload: any = {
        ...raw,
        id: key,
        docId: raw?.docId ?? key,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      };
      const ref = this.afs.firestore.collection(coll).doc(key);
      batch.set(ref, payload, { merge: true });
    }
    await batch.commit();
    this.readDataCollection(coll);
  }

  async addOneToNormalSimple(collectionName: string, item: any): Promise<void> {
    const coll = (collectionName ?? '').trim();
    const key = String(item?.key ?? item?.id ?? item?.docId ?? item?.docID ?? '').trim();
    if (!this.isRealId(key)) return;
    const raw = (item?.value && typeof item.value === 'object') ? item.value : item;
    const payload: any = {
      ...raw,
      id: key,
      docId: raw?.docId ?? key,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    const ref = this.afs.firestore.collection(coll).doc(key);
    await ref.set(payload, { merge: true });
  }
}
