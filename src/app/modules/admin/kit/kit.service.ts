import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Observable, first, map } from 'rxjs';
import { Kit, KitRemote, DeletedKit, NotWorkingRemoteEntry } from './kit.interface';
import firebase from 'firebase/compat/app';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { SharedService } from 'app/shared/shared.service';

@Injectable({
  providedIn: 'root'
})
export class KitService {
  private collectionName = 'Kit';
  private trashCollectionPath = 'Kit/--trash--/DeletedKit';
  private kitsSubject = new BehaviorSubject<Kit[]>([]);
  private deletedKitsSubject = new BehaviorSubject<DeletedKit[]>([]);
  kits$ = this.kitsSubject.asObservable();
  deletedKits$ = this.deletedKitsSubject.asObservable();

  private userNamePromise: Promise<string> | null = null;

  constructor(
    private afs: AngularFirestore,
    private institutionsService: InstitutionsService,
    private sharedService: SharedService
  ) {
    this.loadKits();
    this.loadDeletedKits();
  }

  private async getUserName(): Promise<string> {
    if (this.userNamePromise) return this.userNamePromise;
    this.userNamePromise = (async () => {
      try {
        const u = await this.sharedService.getCurrentUser();
        const name = (u as any)?.teacherName || '';
        return String(name || 'Unknown');
      } catch {
        return 'Unknown';
      }
    })();
    return this.userNamePromise;
  }

  private async addDispatchHistory(
    kitDocId: string,
    event: {
      type: 'created' | 'dispatched' | 'received_back' | 'deleted_to_trash' | 'restored' | 'permanent_deleted';
      kitId?: string;
      institutionId?: string | null;
      institutionName?: string | null;
    }
  ): Promise<void> {
    if (!kitDocId) return;
    const userName = await this.getUserName();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    await this.afs.collection(`${this.collectionName}/${kitDocId}/DispatchHistory`).add({
      type: event.type,
      userName,
      kitId: event.kitId || null,
      institutionId: event.institutionId ?? null,
      institutionName: event.institutionName ?? null,
      createdAt: timestamp,
    } as any);
  }

  private loadKits(): void {
    this.afs.collection<Kit>(this.collectionName, ref => ref.orderBy('createdAt', 'desc'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as Kit;
          const docId = a.payload.doc.id;
          return { ...data, docId };
        }))
      )
      .subscribe(kits => {
        this.kitsSubject.next(kits);
      });
  }

  private loadDeletedKits(): void {
    this.afs.collection<DeletedKit>(this.trashCollectionPath, ref => ref.orderBy('deletedAt', 'desc'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DeletedKit;
          const docId = a.payload.doc.id;
          return { ...data, docId };
        }))
      )
      .subscribe(deletedKits => {
        this.deletedKitsSubject.next(deletedKits);
      });
  }

  async getNextKitId(): Promise<string> {
    const snapshot = await this.afs.collection<Kit>(this.collectionName)
      .get()
      .pipe(first())
      .toPromise();

    const existingIds = snapshot.docs.map(doc => {
      const data = doc.data() as Kit;
      return data.kitId;
    });

    let counter = 1;
    let newKitId = `KIT${counter.toString().padStart(3, '0')}`;

    while (existingIds.includes(newKitId)) {
      counter++;
      newKitId = `KIT${counter.toString().padStart(3, '0')}`;
    }

    return newKitId;
  }

  async createKit(kitData: {
    teacherRemotes: KitRemote[];
    studentRemotes: KitRemote[];
    spareRemotes: KitRemote[];
    totalRemotes: number;
  }): Promise<string> {
    const kitId = await this.getNextKitId();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Generate a new document reference to get the ID first
    const docRef = this.afs.collection(this.collectionName).doc();
    const docId = docRef.ref.id;

    const kit: Kit = {
      docId, // Store docId inside the document
      kitId,
      status: 'active',
      teacherRemotes: kitData.teacherRemotes.map(r => ({
        mac: r.mac,
        role: r.role,
        slotNumber: r.slotNumber
      })),
      studentRemotes: kitData.studentRemotes.map(r => ({
        mac: r.mac,
        role: r.role,
        slotNumber: r.slotNumber
      })),
      spareRemotes: kitData.spareRemotes.map(r => ({
        mac: r.mac,
        role: r.role,
        slotNumber: r.slotNumber
      })),
      totalRemotes: kitData.totalRemotes,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Use set() with the pre-generated docId
    await docRef.set(kit);

    try {
      await this.addDispatchHistory(docId, { type: 'created', kitId });
    } catch {
      // ignore
    }
    return docId;
  }

  async updateKit(docId: string, updates: Partial<Kit>): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    await this.afs.collection(this.collectionName).doc(docId).update({
      ...updates,
      updatedAt: timestamp
    });
  }

  async updateKitStatus(docId: string, status: 'active' | 'inactive' | 'dispatched'): Promise<void> {
    await this.updateKit(docId, { status });
  }

  // Dispatch kit to an institution
  // Adds this kit to the institution's kitsLinked array
  async dispatchKit(docId: string, institutionId: string, institutionName: string): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Get the kit to find its kitId
    const kit = this.kitsSubject.getValue().find(k => k.docId === docId);

    // If kit was previously dispatched to a different institution, remove from old institution first
    if (kit && kit.institutionId && kit.institutionId !== institutionId) {
      await this.institutionsService.update({
        kitsLinked: firebase.firestore.FieldValue.arrayRemove({
          kitDocId: docId,
          kitName: kit.kitId
        })
      }, kit.institutionId);
    }

    await this.updateKit(docId, {
      status: 'dispatched',
      institutionId,
      institutionName,
      dispatchedAt: timestamp,
      receivedBackAt: null
    });

    // Add this kit to the new institution's kitsLinked array
    if (kit) {
      await this.institutionsService.update({
        kitsLinked: firebase.firestore.FieldValue.arrayUnion({
          kitDocId: docId,
          kitName: kit.kitId
        })
      }, institutionId);
    }

    try {
      await this.addDispatchHistory(docId, {
        type: 'dispatched',
        kitId: kit?.kitId,
        institutionId,
        institutionName,
      });
    } catch {
      // ignore
    }
  }

  // Mark kit as received back from institution
  // Saves current institution as last institution, then clears current assignment
  // Also removes this kit from the institution's kitsLinked array
  async receiveBackKit(docId: string, institutionId: string, institutionName: string): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Get the kit to find its kitId for removing from kitsLinked
    const kit = this.kitsSubject.getValue().find(k => k.docId === docId);

    await this.updateKit(docId, {
      status: 'active',
      // Save to history
      lastInstitutionId: institutionId,
      lastInstitutionName: institutionName,
      // Clear current assignment
      institutionId: null,
      institutionName: null,
      dispatchedAt: null,
      receivedBackAt: timestamp
    });

    // Remove this kit from institution's kitsLinked array when kit is received back
    if (kit) {
      await this.institutionsService.update({
        kitsLinked: firebase.firestore.FieldValue.arrayRemove({
          kitDocId: docId,
          kitName: kit.kitId
        })
      }, institutionId);
    }

    try {
      await this.addDispatchHistory(docId, {
        type: 'received_back',
        kitId: kit?.kitId,
        institutionId,
        institutionName,
      });
    } catch {
      // ignore
    }
  }

  // Clear institution assignment (without changing status)
  async clearInstitutionAssignment(docId: string): Promise<void> {
    await this.updateKit(docId, {
      institutionId: null,
      institutionName: null,
      dispatchedAt: null,
      receivedBackAt: null
    });
  }

  async updateKitRemotes(docId: string, remoteType: 'teacher' | 'student' | 'spare', remotes: KitRemote[]): Promise<void> {
    const updateData: Partial<Kit> = {};

    switch (remoteType) {
      case 'teacher':
        updateData.teacherRemotes = remotes;
        break;
      case 'student':
        updateData.studentRemotes = remotes;
        break;
      case 'spare':
        updateData.spareRemotes = remotes;
        break;
    }

    // Also update total remotes count
    const kit = this.kitsSubject.getValue().find(k => k.docId === docId);
    if (kit) {
      const teacherCount = remoteType === 'teacher' ? remotes.length : (kit.teacherRemotes?.length || 0);
      const studentCount = remoteType === 'student' ? remotes.length : (kit.studentRemotes?.length || 0);
      const spareCount = remoteType === 'spare' ? remotes.length : (kit.spareRemotes?.length || 0);
      updateData.totalRemotes = teacherCount + studentCount + spareCount;
    }

    await this.updateKit(docId, updateData);
  }

  private normalizeMac(mac?: string): string {
    return (mac || '').toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  private formatMac(mac?: string): string {
    const hex = this.normalizeMac(mac);
    if (hex.length !== 12) return (mac || '').toLowerCase();
    const pairs = hex.match(/.{1,2}/g) || [];
    return pairs.join(':');
  }

  private updateKitCache(docId: string, patch: Partial<Kit>): void {
    if (!docId) return;
    const kits = this.kitsSubject.getValue();
    const idx = kits.findIndex(k => k.docId === docId);
    if (idx < 0) return;
    const next = [...kits];
    next[idx] = { ...next[idx], ...patch } as Kit;
    this.kitsSubject.next(next);
  }

  private async resolveKitDocId(kitIdOrDocId: string): Promise<string | null> {
    if (!kitIdOrDocId) return null;

    // 1) Direct docId lookup
    try {
      const direct = await this.afs.collection(this.collectionName).doc(kitIdOrDocId).ref.get();
      if (direct.exists) return kitIdOrDocId;
    } catch {
      // ignore
    }

    // 2) Fallback: kitId field lookup
    try {
      const q = await this.afs.collection(this.collectionName, (ref) =>
        ref.where('kitId', '==', kitIdOrDocId).limit(1)
      ).get().pipe(first()).toPromise();
      const doc = q?.docs?.[0];
      return doc?.id || null;
    } catch {
      return null;
    }
  }

  async getKitByIdentifierOnce(kitIdOrDocId: string): Promise<Kit | null> {
    const docId = await this.resolveKitDocId(kitIdOrDocId);
    if (!docId) return null;
    const snap = await this.afs.collection<Kit>(this.collectionName).doc(docId).ref.get();
    if (!snap.exists) return null;
    return { ...(snap.data() as any), docId: snap.id } as Kit;
  }

  private buildNotWorkingEntry(input: {
    mac: string;
    role: 'teacher' | 'student' | 'spare';
    slotNumber: number;
  }): NotWorkingRemoteEntry {
    const formatted = this.formatMac(input.mac);
    const normalized = this.normalizeMac(formatted);
    const slot = Number(input.slotNumber || 0);
    const role = input.role;
    // Deterministic-ish id (good for dedupe + removal)
    const id = `${role}-${slot}-${normalized}-${Date.now()}`;
    return {
      id,
      mac: formatted,
      role,
      slotNumber: slot,
    } as any;
  }

  async addNotWorkingRemoteEntry(
    kitDocId: string,
    input: { mac: string; role: 'teacher' | 'student' | 'spare'; slotNumber: number }
  ): Promise<void> {
    if (!kitDocId) return;
    const resolvedDocId = await this.resolveKitDocId(kitDocId);
    if (!resolvedDocId) return;
    const entry = this.buildNotWorkingEntry(input);
    if (!entry.mac || !entry.role || !entry.slotNumber) return;

    const kitRef = this.afs.collection(this.collectionName).doc(resolvedDocId).ref;
    await this.afs.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(kitRef);
      if (!snap.exists) return;
      const data = (snap.data() || {}) as any;

      const existing: NotWorkingRemoteEntry[] = Array.isArray(data?.notWorkingRemoteEntries)
        ? (data.notWorkingRemoteEntries as NotWorkingRemoteEntry[])
        : [];

      const normalized = this.normalizeMac(entry.mac);
      const already = existing.some((e) =>
        this.normalizeMac(e?.mac) === normalized && e?.role === entry.role && Number(e?.slotNumber || 0) === entry.slotNumber
      );
      const nextEntries = already ? existing : [...existing, entry];

      // Persist only what is required: {mac, role, slotNumber}
      const sanitized = nextEntries.map((e) => ({
        mac: this.formatMac(e?.mac),
        role: e?.role,
        slotNumber: Number(e?.slotNumber || 0),
      })) as any;

      tx.update(kitRef, {
        notWorkingRemoteEntries: sanitized,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      } as any);
    });
  }

  async replaceKitRemoteByInactiveEntry(
    kitDocId: string,
    entry: NotWorkingRemoteEntry,
    newMac: string,
  ): Promise<void> {
    if (!kitDocId) throw new Error('Missing kit');
    if (!entry?.role || !Number(entry?.slotNumber || 0)) throw new Error('Invalid inactive entry');

    const formattedNew = this.formatMac(newMac);
    if (!formattedNew) throw new Error('Invalid MAC');

    const kitRef = this.afs.collection(this.collectionName).doc(kitDocId).ref;
    let nextTeacherRemotes: KitRemote[] = [];
    let nextStudentRemotes: KitRemote[] = [];
    let nextSpareRemotes: KitRemote[] = [];
    let nextInactiveEntries: Array<{ mac: string; role: 'teacher' | 'student' | 'spare'; slotNumber: number }> = [];

    await this.afs.firestore.runTransaction(async (tx) => {
      const snap = await tx.get(kitRef);
      if (!snap.exists) throw new Error('Kit not found');
      const data = (snap.data() || {}) as any;

      const teacherRemotes: KitRemote[] = Array.isArray(data?.teacherRemotes) ? JSON.parse(JSON.stringify(data.teacherRemotes)) : [];
      const studentRemotes: KitRemote[] = Array.isArray(data?.studentRemotes) ? JSON.parse(JSON.stringify(data.studentRemotes)) : [];
      const spareRemotes: KitRemote[] = Array.isArray(data?.spareRemotes) ? JSON.parse(JSON.stringify(data.spareRemotes)) : [];

      const role = entry.role;
      const slotNumber = Number(entry.slotNumber || 0);

      if (!slotNumber) throw new Error('Invalid slot');

      const replaceIn = (arr: KitRemote[]) => {
        const idx = arr.findIndex(r => Number(r?.slotNumber || 0) === slotNumber);
        if (idx < 0) throw new Error('Slot not found');
        arr[idx] = { ...arr[idx], mac: formattedNew, role };
        return arr;
      };

      if (role === 'teacher') replaceIn(teacherRemotes);
      if (role === 'student') replaceIn(studentRemotes);
      if (role === 'spare') replaceIn(spareRemotes);

      const existingEntries: NotWorkingRemoteEntry[] = Array.isArray(data?.notWorkingRemoteEntries)
        ? (data.notWorkingRemoteEntries as NotWorkingRemoteEntry[])
        : [];
      const targetKey = `${entry.role}-${Number(entry.slotNumber || 0)}-${this.normalizeMac(entry.mac)}`;
      const nextEntries = existingEntries.filter((e) => {
        const key = `${e?.role}-${Number(e?.slotNumber || 0)}-${this.normalizeMac(e?.mac)}`;
        return key !== targetKey;
      });

      const sanitized = nextEntries.map((e) => ({
        mac: this.formatMac(e?.mac),
        role: e?.role,
        slotNumber: Number(e?.slotNumber || 0),
      })) as any;

      // capture for local cache update
      nextTeacherRemotes = teacherRemotes;
      nextStudentRemotes = studentRemotes;
      nextSpareRemotes = spareRemotes;
      nextInactiveEntries = sanitized;

      tx.update(kitRef, {
        teacherRemotes,
        studentRemotes,
        spareRemotes,
        totalRemotes: (teacherRemotes?.length || 0) + (studentRemotes?.length || 0) + (spareRemotes?.length || 0),
        notWorkingRemoteEntries: sanitized,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      } as any);
    });

    // Immediate UI update (Admin screens) without waiting for snapshot refresh
    this.updateKitCache(kitDocId, {
      teacherRemotes: nextTeacherRemotes,
      studentRemotes: nextStudentRemotes,
      spareRemotes: nextSpareRemotes,
      totalRemotes: (nextTeacherRemotes?.length || 0) + (nextStudentRemotes?.length || 0) + (nextSpareRemotes?.length || 0),
      notWorkingRemoteEntries: nextInactiveEntries as any,
    });
  }

  async deleteKit(docId: string): Promise<void> {
    await this.afs.collection(this.collectionName).doc(docId).delete();
  }

  // Move a kit to trash (soft delete)
  // Copies the kit to Kit/--trash--/DeletedKit with the SAME docId and removes from Kit collection
  // For dispatched kits: receives back first (saves institution to lastInstitution) and sets status to inactive
  async moveToTrash(kit: Kit): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Prepare the kit data for trash (include docId in the document)
    let kitDataForTrash: DeletedKit = {
      docId: kit.docId, // Store docId inside the document
      kitId: kit.kitId,
      status: kit.status,
      teacherRemotes: kit.teacherRemotes || [],
      studentRemotes: kit.studentRemotes || [],
      spareRemotes: kit.spareRemotes || [],
      totalRemotes: kit.totalRemotes,
      createdAt: kit.createdAt,
      updatedAt: kit.updatedAt,
      deletedAt: timestamp,
      // Preserve institution history fields
      lastInstitutionId: kit.lastInstitutionId,
      lastInstitutionName: kit.lastInstitutionName,
      receivedBackAt: kit.receivedBackAt
    };

    // If kit is dispatched, receive it back first (save current institution as previous)
    if (kit.status === 'dispatched' && kit.institutionId && kit.institutionName) {
      kitDataForTrash = {
        ...kitDataForTrash,
        status: 'inactive', // Set to inactive when deleted while dispatched
        // Save current institution as last institution
        lastInstitutionId: kit.institutionId,
        lastInstitutionName: kit.institutionName,
        // Clear current assignment
        institutionId: null,
        institutionName: null,
        dispatchedAt: null,
        receivedBackAt: timestamp
      };
    } else {
      // For non-dispatched kits, just set to inactive
      kitDataForTrash.status = 'inactive';
    }

    // Add to trash collection using the SAME docId
    await this.afs.collection(this.trashCollectionPath).doc(kit.docId).set(kitDataForTrash);

    try {
      await this.addDispatchHistory(kit.docId as string, {
        type: 'deleted_to_trash',
        kitId: kit.kitId,
        institutionId: kit.institutionId ?? null,
        institutionName: kit.institutionName ?? null,
      });
    } catch {
      // ignore
    }

    // Delete from main collection
    await this.afs.collection(this.collectionName).doc(kit.docId).delete();
  }

  /**
   * Permanently delete a kit from trash
   */
  async permanentDeleteKit(docId: string): Promise<void> {
    try {
      await this.addDispatchHistory(docId, { type: 'permanent_deleted' });
    } catch {
      // ignore
    }
    await this.afs.collection(this.trashCollectionPath).doc(docId).delete();
  }

  /**
   * Empty all kits from trash
   */
  async emptyTrash(): Promise<void> {
    const snapshot = await this.afs.collection(this.trashCollectionPath)
      .get()
      .pipe(first())
      .toPromise();

    const batch = this.afs.firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    try {
      await Promise.all(
        snapshot.docs.map((d) => this.addDispatchHistory(d.id, { type: 'permanent_deleted' }))
      );
    } catch {
      // ignore
    }

    await batch.commit();
  }

  /**
   * Get all deleted kits
   */
  getDeletedKits(): Observable<DeletedKit[]> {
    return this.deletedKits$;
  }

  /**
   * Restore a kit from trash back to main collection
   * Uses the SAME docId and sets status to 'active'
   */
  async restoreKit(deletedKit: DeletedKit): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    // Create the kit document (without trash-specific fields like deletedAt)
    // Status is set to 'active' on restore, docId is preserved
    const kit: Kit = {
      docId: deletedKit.docId, // Store docId inside the document
      kitId: deletedKit.kitId,
      status: 'active', // Always restore as active
      teacherRemotes: deletedKit.teacherRemotes || [],
      studentRemotes: deletedKit.studentRemotes || [],
      spareRemotes: deletedKit.spareRemotes || [],
      totalRemotes: deletedKit.totalRemotes,
      createdAt: deletedKit.createdAt,
      updatedAt: timestamp,
      // Preserve institution history fields
      lastInstitutionId: deletedKit.lastInstitutionId,
      lastInstitutionName: deletedKit.lastInstitutionName,
      receivedBackAt: deletedKit.receivedBackAt
    };

    // Add back to main collection using the SAME docId
    await this.afs.collection(this.collectionName).doc(deletedKit.docId).set(kit);

    try {
      await this.addDispatchHistory(deletedKit.docId as string, {
        type: 'restored',
        kitId: deletedKit.kitId,
      });
    } catch {
      // ignore
    }

    // Delete from trash collection
    await this.afs.collection(this.trashCollectionPath).doc(deletedKit.docId).delete();
  }

  getKitById(docId: string): Observable<Kit | undefined> {
    return this.afs.collection<Kit>(this.collectionName).doc(docId)
      .snapshotChanges()
      .pipe(
        map(action => {
          if (action.payload.exists) {
            const data = action.payload.data() as Kit;
            return { ...data, docId: action.payload.id };
          }
          return undefined;
        })
      );
  }

  getAllKits(): Observable<Kit[]> {
    return this.kits$;
  }

  /**
   * Check if a MAC address is already used in any existing kit
   * Returns null if not found, or details about where it's used
   */
  checkMacExists(mac: string): { kitId: string; role: string; slotNumber: number } | null {
    const kits = this.kitsSubject.getValue();

    for (const kit of kits) {
      // Check teacher remotes
      const teacherRemote = kit.teacherRemotes?.find(r => r.mac === mac);
      if (teacherRemote) {
        return {
          kitId: kit.kitId,
          role: 'Teacher',
          slotNumber: teacherRemote.slotNumber
        };
      }

      // Check student remotes
      const studentRemote = kit.studentRemotes?.find(r => r.mac === mac);
      if (studentRemote) {
        return {
          kitId: kit.kitId,
          role: 'Student',
          slotNumber: studentRemote.slotNumber
        };
      }

      // Check spare remotes
      const spareRemote = kit.spareRemotes?.find(r => r.mac === mac);
      if (spareRemote) {
        return {
          kitId: kit.kitId,
          role: 'Spare',
          slotNumber: spareRemote.slotNumber
        };
      }
    }

    return null;
  }

  /**
   * Get all MAC addresses from all kits
   */
  getAllMacAddresses(): { mac: string; kitId: string; role: string; slotNumber: number }[] {
    const kits = this.kitsSubject.getValue();
    const macs: { mac: string; kitId: string; role: string; slotNumber: number }[] = [];

    for (const kit of kits) {
      kit.teacherRemotes?.forEach(r => {
        macs.push({ mac: r.mac, kitId: kit.kitId, role: 'Teacher', slotNumber: r.slotNumber });
      });
      kit.studentRemotes?.forEach(r => {
        macs.push({ mac: r.mac, kitId: kit.kitId, role: 'Student', slotNumber: r.slotNumber });
      });
      kit.spareRemotes?.forEach(r => {
        macs.push({ mac: r.mac, kitId: kit.kitId, role: 'Spare', slotNumber: r.slotNumber });
      });
    }

    return macs;
  }

  /**
   * Get kits dispatched to a specific institution
   * Returns kits that match the given institutionId
   */
  getKitsByInstitutionId(institutionId: string): Kit[] {
    const kits = this.kitsSubject.getValue();
    return kits.filter(kit => kit.institutionId === institutionId && kit.status === 'dispatched');
  }

  /**
   * Get a kit by its kitId (e.g., "KIT001")
   */
  getKitByKitId(kitId: string): Kit | undefined {
    const kits = this.kitsSubject.getValue();
    return kits.find(kit => kit.kitId === kitId);
  }
}
