import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, first, lastValueFrom, map } from 'rxjs';
import firebase from 'firebase/compat/app';
import { DeletedOutreach, Outreach } from './outreach.interface';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OutreachService {
  private collectionName = 'Outreach';
  private trashCollectionPath = 'Outreach/--trash--/DeletedOutreach';

  private uniqueCodeChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  private outreachSubject = new BehaviorSubject<Outreach[]>([]);
  private deletedOutreachSubject = new BehaviorSubject<DeletedOutreach[]>([]);

  outreach$ = this.outreachSubject.asObservable();
  deletedOutreach$ = this.deletedOutreachSubject.asObservable();

  constructor(
    private afs: AngularFirestore,
    private sharedService: SharedService
  ) {
    this.loadOutreach();
    this.loadDeletedOutreach();
  }

  private loadOutreach(): void {
    this.afs.collection<Outreach>(this.collectionName, ref => ref.orderBy('createdAt', 'desc'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as Outreach;
          const docId = a.payload.doc.id;
          return { ...data, docId };
        }))
      )
      .subscribe(items => this.outreachSubject.next(items));
  }

  private loadDeletedOutreach(): void {
    this.afs.collection<DeletedOutreach>(this.trashCollectionPath, ref => ref.orderBy('deletedAt', 'desc'))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as DeletedOutreach;
          const docId = a.payload.doc.id;
          return { ...data, docId };
        }))
      )
      .subscribe(items => this.deletedOutreachSubject.next(items));
  }

  private generateUniqueCode(length = 6): string {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += this.uniqueCodeChars.charAt(Math.floor(Math.random() * this.uniqueCodeChars.length));
    }
    return out;
  }

  async createOutreach(data: {
    institutionId?: string;
    institutionName: string;
    createdBy?: string;
  }): Promise<string> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const docRef = this.afs.collection(this.collectionName).doc();
    const docId = docRef.ref.id;

    const outreach: Outreach = {
      docId,
      institutionId: data?.institutionId ? String(data.institutionId) : '',
      institutionName: String(data?.institutionName || '').trim(),
      uniqueCode: this.generateUniqueCode(6),
      qrCodeValue: '',
      qrCodeImageUrl: '',
      dateGenerated: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
      createdBy: data?.createdBy ? String(data.createdBy).trim() : '',
    };

    await docRef.set(outreach);

    this.sendOutreachSlackNotifications(outreach).catch(err => {
      console.error('Failed to send Slack notifications:', err);
    });

    return docId;
  }

  private async sendOutreachSlackNotifications(outreach: Outreach): Promise<void> {
    try {
      const creatorName = outreach.createdBy || 'Unknown User';
      const schoolName = outreach.institutionName || 'Unknown School';
      const uniqueCode = outreach.uniqueCode || 'N/A';

      // Generate QR code URL that encodes the outreach registration link
      // Dynamically get current website URL, fallback to default if unavailable
      let baseUrl = 'https://teachercorner.thinktac.com';
      try {
        if (typeof window !== 'undefined' && window.location?.origin) {
          baseUrl = window.location.origin;
        }
      } catch (error) {
        console.warn('Failed to get current URL, using default:', error);
      }
      const outreachUrl = `${baseUrl}/outreach/${uniqueCode}`;
      const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(outreachUrl)}`;

      // Get current user's Slack info
      const currentUser = await this.sharedService.getCurrentUser();
      const slackUsers = currentUser?.slackUsers || [];

      // Get Slack channel details
      const slackConfig = environment.slackNotifications?.outreachQRCode;
      if (!slackConfig) {
        console.warn('Slack configuration for outreach QR code not found');
        return;
      }

      const channels = await this.sharedService.getSlackChannelDetails(slackConfig.slackChannels);

      // Message for the audit log channel
      const auditLogMessage = `*New Outreach QR Code Created*\n\n` +
        `• *Created by:* ${creatorName}\n` +
        `• *School:* ${schoolName}\n` +
        `• *Time:* ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n\n`+
        `• *QR Code:*`;

      // Message for the individual user
      const individualMessage = `*QR Code Successfully Created*\n\n` +
        `You have successfully created a new outreach QR code for *${schoolName}*.\n\n` +
        `• *School:* ${schoolName}\n\n` +
        `Teachers can now scan this QR code to register for the outreach program.\n\n`+
        `• *QR Code:*`;

      // Send notification to audit log channel
      if (channels && channels.length > 0) {
        await this.sharedService.sendSlackNotificationsWithImage(
          slackConfig.slackBearerToken,
          [],
          channels.filter(c => c !== null),
          auditLogMessage,
          qrCodeImageUrl,
          'Outreach QR Code'
        );
      }

      // Send notification to individual user
      if (slackUsers && slackUsers.length > 0) {
        await this.sharedService.sendSlackNotificationsWithImage(
          slackConfig.slackBearerToken,
          slackUsers,
          [],
          individualMessage,
          qrCodeImageUrl,
          'Outreach QR Code'
        );
      }
    } catch (error) {
      console.error('Error sending Slack notifications:', error);
      throw error;
    }
  }

  async getOutreachByUniqueCode(uniqueCode: string): Promise<Outreach | null> {
    const code = String(uniqueCode || '').trim();
    if (!code) return null;

    const snap = await lastValueFrom(
      this.afs
        .collection<Outreach>(this.collectionName, (ref) => ref.where('uniqueCode', '==', code).limit(1))
        .get()
        .pipe(first())
    );

    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { ...(doc.data() as Outreach), docId: doc.id };
  }

  async updateOutreach(docId: string, updates: Partial<Outreach>): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    await this.afs.collection(this.collectionName).doc(docId).update({
      ...updates,
      updatedAt: timestamp
    });
  }

  async addTeacherRegistered(docId: string, teacherDocId: string): Promise<void> {
    const id = String(docId || '').trim();
    const teacherId = String(teacherDocId || '').trim();
    if (!id || !teacherId) return;
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    await this.afs.collection(this.collectionName).doc(id).update({
      teacherRegistered: firebase.firestore.FieldValue.arrayUnion(teacherId),
      updatedAt: timestamp,
    });
  }

  async moveToTrash(outreach: Outreach): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const dataForTrash: DeletedOutreach = {
      docId: outreach.docId,
      institutionId: outreach.institutionId || '',
      institutionName: outreach.institutionName,
      uniqueCode: outreach.uniqueCode || '',
      qrCodeValue: outreach.qrCodeValue || '',
      qrCodeImageUrl: outreach.qrCodeImageUrl || '',
      dateGenerated: outreach.dateGenerated || outreach.createdAt,
      createdAt: outreach.createdAt,
      updatedAt: outreach.updatedAt,
      createdBy: outreach.createdBy || '',
      deletedAt: timestamp,
    };

    await this.afs.collection(this.trashCollectionPath).doc(outreach.docId).set(dataForTrash);
    await this.afs.collection(this.collectionName).doc(outreach.docId).delete();
  }

  async restoreOutreach(deleted: DeletedOutreach): Promise<void> {
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();

    const restored: Outreach = {
      docId: deleted.docId,
      institutionId: deleted.institutionId || '',
      institutionName: deleted.institutionName,
      uniqueCode: deleted.uniqueCode || '',
      qrCodeValue: deleted.qrCodeValue || '',
      qrCodeImageUrl: deleted.qrCodeImageUrl || '',
      dateGenerated: deleted.dateGenerated || deleted.createdAt,
      createdAt: deleted.createdAt,
      updatedAt: timestamp,
      createdBy: deleted.createdBy || '',
    };

    await this.afs.collection(this.collectionName).doc(deleted.docId).set(restored);
    await this.afs.collection(this.trashCollectionPath).doc(deleted.docId).delete();
  }

  async permanentDelete(docId: string): Promise<void> {
    await this.afs.collection(this.trashCollectionPath).doc(docId).delete();
  }

  async emptyTrash(): Promise<void> {
    const snapshot = await this.afs.collection(this.trashCollectionPath)
      .get()
      .pipe(first())
      .toPromise();

    const batch = this.afs.firestore.batch();
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}
