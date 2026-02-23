import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { arrayUnion, deleteField, serverTimestamp } from '@angular/fire//firestore';
import { AngularFirestore, CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { User } from 'app/core/dbOperations/user/user.types';
import { BehaviorSubject, Observable, ReplaySubject, first, firstValueFrom, forkJoin, map, mergeMap, take, tap } from 'rxjs';
import { MasterFirestore } from './master.firestore';
import { flatMap } from 'lodash';

@Injectable({
    providedIn: 'root'
})
export class MasterService {
    private _user: ReplaySubject<User> = new ReplaySubject<User>(1);
    learningList: ReplaySubject<User> = new ReplaySubject<User>(1);
    getAllLiveLerningUnitsSub = new BehaviorSubject(null);
    allLUListMaster = new BehaviorSubject(null);
    // collectionName = 'CopyOfMaster';
    collectionName = 'Master';

    /**
     * Constructor
     */
    constructor(
        private _httpClient: HttpClient,
        private afs: AngularFirestore,
        private masterFirestore: MasterFirestore
    ) {
    }

    /* Get all master documents */
    getAllMasterDocs(masterType: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', masterType).orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query);
    }

    /* Get all master documents map */
    getAllMasterDocsMap(masterType: string, fieldName: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', masterType).orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query).pipe(
            first(),
            map(docs => docs.map(doc => doc[fieldName]).reduce((acc, value) => {
                Object.entries(value).forEach(([key, value]) => {
                    acc[key] = value;
                });
                return acc;
            })));
    }

    /* Get all master documents map as array */
    getAllMasterDocsMapAsArray(masterType: string, fieldName: string) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', masterType).orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query).pipe(
            map(docs => docs.map(doc => Object.values(doc[fieldName]).map((value: any) => ({ ...value, masterDocId: doc.docId })))),
            map(docs => flatMap(docs))
        );
    }

    /* Get master document by ID once */
    getMasterDocByIdOnce(masterDocId: string) {
        return this.masterFirestore.getWithGet(masterDocId);
    }

    /* Add object to master document array */
    async addNewObjectToMasterArray(masterType: string, fieldName: string, objectData: any) {
        const docSizeLimit = {
            'CLASSROOM': 800,
            'CUSTOM_AUTHENTICATION': 800,
            'INSTITUTE': 800,
            'LEARNINGUNIT': 500,
            'PARTNER': 800,
            'PROGRAMME_TEMPLATE': 800,
            'PROGRAMME': 400,
            'VENDOR': 800,
            'WORKFLOW_TEMPLATE': 800,
            'COMPONENT': 800,
            'Notification': 600,
            'VISITS': 600
        };
        const latestMasterDoc = await this.getLatestMasterDoc(masterType);
        const masterDocId = latestMasterDoc.docId;
        if (latestMasterDoc?.[fieldName]?.length <= docSizeLimit[masterType]) {
            await this.afs.collection(this.collectionName).doc(masterDocId).set(
                { [`${fieldName}`]: arrayUnion({ ...objectData, creationDate: new Date() }) },
                { merge: true });
            return masterDocId;
        } else {
            const collName = this.collectionName;
            await this.addNewMasterDoc(collName, masterType, fieldName, objectData, masterDocId);
            return masterDocId;
        }
    }

    /* Add object to master document map */
    async addNewObjectToMasterMap(masterType: string, fieldName: string, objectData: any) {
        const docSizeLimit = {
            'CLASSROOM': 800,
            'CUSTOM_AUTHENTICATION': 800,
            'INSTITUTE': 800,
            'LEARNINGUNIT': 500,
            'PARTNER': 800,
            'PROGRAMME_TEMPLATE': 800,
            'PROGRAMME': 400,
            'VENDOR': 800,
            'WORKFLOW_TEMPLATE': 800,
            'COMPONENT': 800,
            'Notification': 600,
            'VISITS': 600
        };
        const latestMasterDoc = await this.getLatestMasterDoc(masterType);

        // If no master doc exists yet, create the first one: <type>_master_01
        if (!latestMasterDoc || !latestMasterDoc?.docId) {
            const initialDocId = `${masterType.toLowerCase()}_master_01`;
            await this.afs.collection(this.collectionName).doc(initialDocId).set({
                [`${fieldName}`]: { [`${objectData.docId}`]: { ...objectData, createdAt: new Date(), creationDate: new Date() } },
                creationDate: serverTimestamp(),
                createdAt: serverTimestamp(),
                type: masterType,
                docId: initialDocId
            }, { merge: true });
            return initialDocId;
        }

        const masterDocId = latestMasterDoc.docId;
        const currentField = latestMasterDoc?.[fieldName] || {};
        const currentCount = typeof currentField === 'object' ? Object.keys(currentField).length : 0;

        if (currentCount <= (docSizeLimit?.[masterType] ?? 800)) {
            await this.afs.collection(this.collectionName).doc(masterDocId).update(
                { [`${fieldName}.${objectData.docId}`]: { ...objectData, createdAt: new Date(), updatedAt: new Date() }, updatedAt: new Date() });
            return masterDocId;
        } else {
            const collName = this.collectionName;
            await this.addNewMasterDocMap(collName, masterType, fieldName, objectData, masterDocId);
            return masterDocId;
        }
    }

    async deleteProgrammeFromMasterById(programmeId: string): Promise<void> {
        try {
            // Fetch all documents in the Master collection
            const masterDocsSnapshot = await this.afs.collection(this.collectionName).get().toPromise();
            if (masterDocsSnapshot.empty) {
                return;
            }

            // Iterate over each document in the Master collection
            for (const docSnapshot of masterDocsSnapshot.docs) {
                // Check if the document ID starts with 'programme_master_'
                if (docSnapshot.id.startsWith('programme_master_')) {
                    const docData = docSnapshot.data() as any;
                    const programmes = docData?.programmes;

                    if (!programmes) {
                        continue;
                    }

                    // Check if the programmeId exists in the programmes map
                    if (Object.keys(programmes).includes(programmeId)) {

                        // Remove the programme from the programmes map
                        delete programmes[programmeId];

                        // Update the document with the modified programmes map and updatedAt field
                        await docSnapshot.ref.update({
                            programmes,
                            updatedAt: serverTimestamp(),
                        });


                        return; // Exit after deleting to avoid checking other documents unnecessarily
                    } else {

                    }
                }
            }


        } catch (error) {
            console.error('Error deleting programme from master documents:', error);
        }
    }

    async deleteWorkflowTemplateFromMasterById(templateId: string): Promise<void> {
        try {
            // Fetch all documents in the Master collection
            const masterDocsSnapshot = await this.afs.collection(this.collectionName).get().toPromise();
            if (masterDocsSnapshot.empty) {
                return;
            }

            // Iterate over each document in the Master collection
            for (const docSnapshot of masterDocsSnapshot.docs) {
                // Check if the document ID starts with 'programme_master_'
                if (docSnapshot.id.startsWith('workflow_template_master_')) {
                    const docData = docSnapshot.data() as any;
                    const workflowTemplates = docData?.workflowTemplates;

                    if (!workflowTemplates) {
                        continue;
                    }

                    // Check if the programmeId exists in the programmes map
                    if (Object.keys(workflowTemplates).includes(templateId)) {
                        // Remove the programme from the programmes map
                        delete workflowTemplates[templateId];

                        // Update the document with the modified programmes map and updatedAt field
                        await docSnapshot.ref.update({
                            workflowTemplates,
                            updatedAt: serverTimestamp(),
                        });


                        return; // Exit after deleting to avoid checking other documents unnecessarily
                    } else {

                    }
                }
            }

        } catch (error) {
            console.error('Error deleting programme from master documents:', error);
        }
    }

    async updateProgrammeInMasterById(programmeId: string, programmeData: any): Promise<void> {
        try {
            // Fetch all documents in the Master collection
            const masterDocsSnapshot = await this.afs.collection(this.collectionName).get().toPromise();
            if (masterDocsSnapshot.empty) {
                return;
            }

            // Iterate over each document in the Master collection
            for (const docSnapshot of masterDocsSnapshot.docs) {
                // Check if the document ID starts with 'programme_master_'
                if (docSnapshot.id.startsWith('programme_master_')) {
                    const docData = docSnapshot.data() as any;
                    const programmes = docData?.programmes;

                    if (!programmes) {
                        continue;
                    }

                    // Check if the programmeId exists in the programmes map
                    if (Object.keys(programmes).includes(programmeId)) {

                        // Update the programme with the new data
                        programmes[programmeId] = { ...programmes[programmeId], ...programmeData, updatedAt: new Date() };


                        // Update the document with the modified programmes map and updatedAt field
                        await docSnapshot.ref.update({
                            programmes,
                            updatedAt: serverTimestamp(),
                        });


                        return; // Exit after deleting to avoid checking other documents unnecessarily
                    } else {

                    }
                }
            }

        } catch (error) {
            console.error('Error deleting programme from master documents:', error);
        }
    }

    async updateWorkflowTemplateInMasterById(templateId: string, templateData: any): Promise<void> {

        try {
            // Fetch all documents in the Master collection
            const masterDocsSnapshot = await this.afs.collection(this.collectionName).get().toPromise();
            if (masterDocsSnapshot.empty) {

                return;
            }

            // Iterate over each document in the Master collection
            for (const docSnapshot of masterDocsSnapshot.docs) {
                // Check if the document ID starts with 'programme_master_'
                if (docSnapshot.id.startsWith('workflow_template_master_')) {
                    const docData = docSnapshot.data() as any;
                    const workflowTemplates = docData?.workflowTemplates;

                    if (!workflowTemplates) {
                        continue;
                    }

                    // Check if the programmeId exists in the programmes map
                    if (Object.keys(workflowTemplates).includes(templateId)) {

                        // Update the programme with the new data
                        workflowTemplates[templateId] = { ...workflowTemplates[templateId], ...templateData };


                        // Update the document with the modified programmes map and updatedAt field
                        await docSnapshot.ref.update({
                            workflowTemplates,
                            updatedAt: serverTimestamp(),
                        });

                        // console.log(`workflow template with ID ${templateId} updated successfully from ${docSnapshot.id}`);
                        return; // Exit after deleting to avoid checking other documents unnecessarily
                    } else {
                        // console.log(`workflow template with ID ${templateId} not found in ${docSnapshot.id}`);
                    }

                    /*
                                        if (Object.keys(workflowTemplates).includes(templateId)) {
                                            console.log(`🔄 Updating workflow template with ID ${templateId}...`);

                                            // Ensure updatedAt is included inside templateData
                                            workflowTemplates[templateId] = {
                                                ...workflowTemplates[templateId],
                                                ...templateData,
                                                updatedAt: new Date() // ✅ Ensuring updatedAt is inside templateData
                                            };

                                            // Update Firestore document with modified workflowTemplates map & global updatedAt field
                                            await docSnapshot.ref.update({
                                                workflowTemplates,
                                                updatedAt: serverTimestamp(), // ✅ Firestore timestamp for document-level update tracking
                                            });

                                            console.log(`✅ Workflow template with ID ${templateId} updated successfully in ${docSnapshot.id}`);
                                            return; // Exit after updating
                                        } else {
                                            console.log(`⚠️ Workflow template with ID ${templateId} not found in ${docSnapshot.id}`);
                                        }
                                 */
                }
            }

            // console.log(`Programme with ID ${templateId} not found in any master document.`);
        } catch (error) {
            console.error('Error updating programme from master documents:', error);
        }
    }

    getLatestMasterDocId(masterDocIds: string[]): string | null {
        if (!masterDocIds || masterDocIds.length === 0) {
            return null; // No master documents exist
        }

        // Sort the IDs numerically (e.g., programme_master_01, programme_master_02)
        masterDocIds.sort((a, b) => {
            const numA = parseInt(a.split('_').pop()!); // Extract the number part
            const numB = parseInt(b.split('_').pop()!);
            return numB - numA; // Descending order
        });

        return masterDocIds[0]; // Return the latest master document ID
    }

    generateNextMasterDocId(latestMasterDocId: string | null): string {
        if (!latestMasterDocId) {
            // If no master document exists, start with programme_master_01
            return 'programme_master_01';
        }

        const lastNumber = parseInt(latestMasterDocId.split('_').pop()!); // Extract the number part
        const nextNumber = lastNumber + 1;

        return `programme_master_${nextNumber.toString().padStart(2, '0')}`;
    }


    /* Get All LerningUnit Master Documents */
    getAllLU() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', 'LEARNINGUNIT').orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query);
    }

    /* Get All Institutes Doc */
    getAllInstitutes() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', 'INSTITUTE').orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query);
    }

    /* Get All Institutes Doc */
    getAllClassrooms() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', 'CLASSROOM').orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query);
    }

    /* Get All Programme Templates Doc */
    getAllProgrammeTemplates() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', 'PROGRAMME_TEMPLATES').orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query);
    }

    /* Get All Custom Authentication Doc */
    getAllCustomAuthentication() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', 'CUSTOM_AUTHENTICATION');
        return this.masterFirestore.collection$(query).pipe(
            first(),
            map(docs => docs.map(doc => doc.custom_authentication).reduce((acc, value) => {
                Object.entries(value).forEach(([key, value]) => {
                    acc[key] = value;
                });
                return acc;
            }))
        );
    }

    /* Get All Programme Doc */
    getAllProgrammes() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', 'PROGRAMME').orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query);
    }

    getAllWorkflowTemplates() {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', 'WORKFLOW_TEMPLATE').orderBy('creationDate', 'desc');
        return this.masterFirestore.collection$(query);
    }

    /* Get Programme Template by ID */
    getProgrammeTemplateById(masterDocId: string) {
        return this.masterFirestore.doc$(masterDocId);
    }

    /* Update LU Master Document */
    async updateMasterTACs(masterDocId, masterData) {
        await this.afs.collection(this.collectionName).doc(masterDocId).set(
            { 'tacNames': masterData, updatedAt: serverTimestamp() },
            { merge: true })
    }

    /**
     * Update  master doc Institute
     */
    async updateInstitutesMasterDoc(masterDocId, masterData) {
        await this.afs.collection(this.collectionName).doc(masterDocId).set(
            { 'institutionNames': masterData, updatedAt: serverTimestamp() },
            { merge: true })
    }

    /**
    * Update  Classroom master document
    */
    async updateClassroomsMasterDoc(masterDocId, masterData) {
        const value = { 'classrooms': masterData, updatedAt: serverTimestamp() }
        await this.afs.collection(this.collectionName).doc(masterDocId).set(value, { merge: true })
    }

    /**
     * Update Programme Template master document
     */
    updateProgrammeTemplateMasterDoc(masterDocId, masterData) {
        const value = { 'programmeTemplates': masterData, updatedAt: serverTimestamp() }
        return this.afs.collection(this.collectionName).doc(masterDocId).set(value, { merge: true })
    }

    async getLatestMasterDoc(type) {
        const query: QueryFn = (ref: CollectionReference) =>
            ref.where('type', '==', type).orderBy('creationDate', 'desc').limit(1);
        const collRef = this.masterFirestore.collection$(query);
        const doc: any = await firstValueFrom(collRef);
        return doc[0];
    }

    async addNewMasterDoc(collName: string, docType: string, fieldName: string, docData: any, masterDocId: string) {
        const lastDashIndex = masterDocId.lastIndexOf('_');
        const fileNumber = parseInt(masterDocId.substring(lastDashIndex + 1)) + 1;
        const docId = `${docType.toLowerCase()}_master_${fileNumber.toString().padStart(2, '0')}`;

        return await this.afs.collection(collName).doc(docId).set(
            {
                [`${fieldName}`]: arrayUnion({ ...docData, createdAt: new Date(), creationDate: new Date() }),
                'creationDate': serverTimestamp(),
                'createdAt': serverTimestamp(),
                'type': docType,
                'docId': docId
            });
    }

    async addNewMasterDocMap(collName: string, docType: string, fieldName: string, docData: any, masterDocId: string) {
        const lastDashIndex = masterDocId.lastIndexOf('_');
        const fileNumber = parseInt(masterDocId.substring(lastDashIndex + 1)) + 1;
        const docId = `${docType.toLowerCase()}_master_${fileNumber.toString().padStart(2, '0')}`;

        return await this.afs.collection(collName).doc(docId).set({
            [`${fieldName}`]: { [`${docData.docId}`]: { ...docData, createdAt: new Date(), creationDate: new Date() } },
            'creationDate': serverTimestamp(),
            'createdAt': serverTimestamp(),
            'type': docType,
            docId,
        });
    }

    /* Update master document */
    async updateMasterDoc(fieldName: string, masterDocId: string, masterData: any) {
        // console.log('Updating master document:', masterDocId, fieldName, masterData);
        const value = {
            [`${fieldName}`]: masterData,
            updatedAt: serverTimestamp()
        };
        // console.log('Value to update:', value);
        return await this.afs.collection(this.collectionName).doc(masterDocId).set(value, { merge: true });
    }

    async updateMasterDocWithoutMerge(fieldName: string, masterDocId: string, docId: string, masterData: any) {
        const value: any = {};
        // Spread the fields into dot notation
        for (const [key, val] of Object.entries(masterData)) {
            value[`${fieldName}.${docId}.${key}`] = val;
        }

        value.updatedAt = serverTimestamp();
        return await this.afs.collection(this.collectionName).doc(masterDocId).update(value);
    }

    /* Updaate single field in master document */
    async updateMasterDocField(masterDocId: string, docId: string, fieldName: string, key: string, value: any) {
        return await this.afs.collection(this.collectionName).doc(masterDocId).update({ [`${fieldName}.${docId}.${key}`]: value, updatedAt: serverTimestamp() });
    }

    /* Delete object from master document map */
    async deleteObjectFromMasterMap(masterDocId: string, fieldName: string, objectId: string) {
        const value = {
            [`${fieldName}.${objectId}`]: deleteField(),
            updatedAt: new Date()
        };
        return this.afs.collection(this.collectionName).doc(masterDocId).update(value);
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Accessors
    // -----------------------------------------------------------------------------------------------------

    /**
     * Setter & getter for user
     *
     * @param value
     */
    set user(value: User) {
        // Store the value
        this._user.next(value);
    }

    getDocsById(id) {
        return this.masterFirestore.doc$(id).pipe(take(1),
            tap(luList => luList));
    }

    get user$(): Observable<User> {
        this._user.subscribe((a) => {
        });
        return this._user.asObservable();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Get the current logged in user data
     */
    get(): Observable<any> {
        return this.masterFirestore.doc$('YDqVvM9njKe8h4rbbYbXElEKHBA3' + '/Student' + '/' + 'jMQ6DTULY4LGhmTwyZSi')
            // return this.userFirestore.doc$(this.authUser.uid + '/Student' + '/' + 'jMQ6DTULY4LGhmTwyZSi')
            .pipe(take(1),
                tap((user) => {
                    this._user.next(user);
                })
            );
    }

    /**
     * Update the user
     *
     * @param user
     */
    update(user: User): Observable<any> {
        return this._httpClient.patch<User>('api/common/user', { user }).pipe(
            map((response) => {
                this._user.next(response);
            })
        );
    }

    getDocId() {
        return this.afs.createId();
    }


 private static readonly NOTIF_TYPE = 'NOTIFICATION';
  private static readonly NOTIF_FIELD = 'notifications';
  private static readonly NOTIF_LIMIT = 600;

  private _countNotificationsInDoc(doc: any): number {
    const n = doc?.[MasterService.NOTIF_FIELD];
    if (!n) return 0;
    let total = 0;
    Object.values(n).forEach((byUser: any) => {
      if (!byUser || typeof byUser !== 'object') return;
      Object.values(byUser).forEach((byCat: any) => {
        if (!byCat || typeof byCat !== 'object') return;
        total += Object.keys(byCat).length;
      });
    });
    return total;
  }

  private _getNotificationLeaf(data: any, userId: string, category: string, notificationDocId: string) {
    return data?.[MasterService.NOTIF_FIELD]?.[userId]?.[category]?.[notificationDocId];
  }

  private async _getLatestNotificationMaster(): Promise<any | null> {
    const latest = await this.getLatestMasterDoc(MasterService.NOTIF_TYPE);
    return latest || null;
  }

  private async _createNextNotificationMaster(prevIdOrNull: string | null): Promise<string> {
    let nextId = 'notification_master_01';
    if (prevIdOrNull) {
      const lastNum = parseInt(prevIdOrNull.split('_').pop()!, 10) || 0;
      nextId = `notification_master_${String(lastNum + 1).padStart(2, '0')}`;
    }
    await this.afs.collection(this.collectionName).doc(nextId).set(
      {
        [MasterService.NOTIF_FIELD]: {},
        creationDate: serverTimestamp(),
        createdAt: serverTimestamp(),
        type: MasterService.NOTIF_TYPE,
        docId: nextId
      },
      { merge: true }
    );
    return nextId;
  }

  /**
   * UPSERT (create or replace) a single notification leaf using **nested object**
   * so it always lands under the same `notifications` key (no dotted-key fields).
   */
  async upsertNotificationInMaster(
    userId: string,
    category: string,
    notificationDocId: string,
    data: any
  ): Promise<string> {
    // pick a target doc with capacity
    const latest = await this._getLatestNotificationMaster();
    let targetId: string;
    if (!latest) {
      targetId = await this._createNextNotificationMaster(null);
    } else {
      const count = this._countNotificationsInDoc(latest);
      targetId = count >= MasterService.NOTIF_LIMIT
        ? await this._createNextNotificationMaster(latest.docId)
        : latest.docId;
    }

    // NESTED OBJECT (no dotted path)
    const nested = {
      [MasterService.NOTIF_FIELD]: {
        [userId]: {
          [category]: {
            [notificationDocId]: {
              ...data,
              updatedAt: new Date()
            }
          }
        }
      },
      updatedAt: serverTimestamp()
    };

    await this.afs.collection(this.collectionName).doc(targetId).set(nested, { merge: true });

    // read back & log leaf
    const snap = await this.afs.collection(this.collectionName).doc(targetId).ref.get();
    const after = snap.data();
    const leaf = this._getNotificationLeaf(after, userId, category, notificationDocId);
    console.log('[MASTER UPSERT]', { docId: targetId, userId, category, notificationDocId, value: leaf });

    return targetId;
  }

  /**
   * UPDATE (replace) a leaf that already exists — also uses **nested object**.
   * Returns the updated value for convenience/logging.
   */
  async updateNotificationInMaster(
    userId: string,
    category: string,
    notificationDocId: string,
    fullPayload: any
  ): Promise<{ docId: string; value: any }> {
    const [docId] = await this._findNotificationContainer(userId, category, notificationDocId);
    if (!docId) return { docId: '', value: null };

    const nested = {
      [MasterService.NOTIF_FIELD]: {
        [userId]: {
          [category]: {
            [notificationDocId]: {
              ...fullPayload,
              updatedAt: new Date()
            }
          }
        }
      },
      updatedAt: serverTimestamp()
    };

    await this.afs.collection(this.collectionName).doc(docId).set(nested, { merge: true });

    const snap = await this.afs.collection(this.collectionName).doc(docId).ref.get();
    const after = snap.data();
    const value = this._getNotificationLeaf(after, userId, category, notificationDocId);
    console.log('[MASTER UPDATE]', { docId, userId, category, notificationDocId, value });

    return { docId, value };
  }

  /**
   * Find containing notification_master_xx for a leaf.
   */
  private async _findNotificationContainer(
    userId: string,
    category: string,
    notificationDocId: string
  ): Promise<[string | null, any | null]> {
    const snap = await this.afs.collection(this.collectionName).ref
      .where('type', '==', MasterService.NOTIF_TYPE)
      .orderBy('creationDate', 'desc')
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const ok = !!data?.[MasterService.NOTIF_FIELD]?.[userId]?.[category]?.[notificationDocId];
      if (ok) return [doc.id, data];
    }
    return [null, null];
  }

  /**
   * Delete still uses a dotted field path (that’s fine for deletes).
   */
  async deleteNotificationFromMaster(
    userId: string,
    category: string,
    notificationDocId: string
  ): Promise<void> {
    const [docId] = await this._findNotificationContainer(userId, category, notificationDocId);
    if (!docId) return;
    const path = `${MasterService.NOTIF_FIELD}.${userId}.${category}.${notificationDocId}`;
    await this.afs.collection(this.collectionName).doc(docId).update({
      [path]: deleteField(),
      updatedAt: serverTimestamp()
    });
    console.log('[MASTER DELETE]', { docId, path });
  }

  /* ---- readers (unchanged) ---- */

  getAllNotificationMasterDocs() {
    const query: QueryFn = (ref: CollectionReference) =>
      ref.where('type', '==', MasterService.NOTIF_TYPE).orderBy('creationDate', 'desc');
    return this.masterFirestore.collection$(query);
  }

  async getNotificationsForUserAsMap(userId: string): Promise<Record<string, any>> {
    const out: Record<string, any> = {};
    const snap = await this.afs.collection(this.collectionName).ref
      .where('type', '==', MasterService.NOTIF_TYPE)
      .orderBy('creationDate', 'desc')
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const node = data?.[MasterService.NOTIF_FIELD]?.[userId];
      if (!node) continue;
      Object.values(node).forEach((byCat: any) => {
        if (!byCat || typeof byCat !== 'object') return;
        Object.entries(byCat).forEach(([notifId, payload]) => (out[notifId] = payload));
      });
    }
    return out;
  }

  async getNotificationsForUserCategoryAsArray(userId: string, category: string): Promise<Array<any>> {
    const results: Array<any> = [];
    const snap = await this.afs.collection(this.collectionName).ref
      .where('type', '==', MasterService.NOTIF_TYPE)
      .orderBy('creationDate', 'desc')
      .get();

    for (const doc of snap.docs) {
      const data = doc.data();
      const catMap = data?.[MasterService.NOTIF_FIELD]?.[userId]?.[category];
      if (!catMap) continue;
      Object.entries(catMap).forEach(([notificationDocId, payload]: [string, any]) => {
        results.push({ notificationDocId, ...payload, masterDocId: doc.id });
      });
    }
    return results;
  }

  
}