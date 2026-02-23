import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Kit, KitRemote } from 'app/modules/admin/kit/kit.interface';
import firebase from 'firebase/compat/app';

interface StudentInfo {
  studentDocId: string;
  studentName: string;
  accessCode: string;
}

interface RemoteUsedEntry {
  macid: string;
  reAssignedTime?: any;
  index: number;
}

@Injectable({
  providedIn: 'root'
})
export class RemoteMappingService {
  constructor(
    private afs: AngularFirestore,
  ) {}

  private normalizeMac(mac: string | null | undefined): string {
    return (mac ?? '').trim().toLowerCase().replace(/[^a-f0-9]/g, '');
  }

  private toRemoteUsedMap(entries: RemoteUsedEntry[]): Record<string, any> {
    const out: Record<string, any> = {};
    (entries || []).forEach((e, i) => {
      const macid = this.normalizeMac(e?.macid);
      if (!macid) return;
      out[macid] = {
        index: typeof e?.index === 'number' ? e.index : (i + 1),
        reAssignedTime: e?.reAssignedTime ?? null,
      };
    });
    return out;
  }

  private async loadStudents(classroomId: string, limitCount: number): Promise<StudentInfo[]> {
    const snapshot = await this.afs.collection('Students', ref =>
      ref.where(`classrooms.${classroomId}.classroomId`, '==', classroomId)
    ).get().toPromise();

    const studentsWithAccessCodes = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data() as any;
        const studentDocId = doc.id;

        const firstName = data?.studentMeta?.firstName ?? '';
        const lastName = data?.studentMeta?.lastName ?? '';
        const fallbackName = (data?.studentMeta?.name || data?.name || `${firstName} ${lastName}`.trim() || 'Unknown') as string;

        let accessCode = '';
        try {
          const authDoc = await this.afs
            .collection('CustomAuthentication')
            .doc(studentDocId)
            .get()
            .toPromise();
          const authData = authDoc?.data() as { accessCode?: string } | undefined;
          accessCode = authData?.accessCode ?? '';
        } catch {
          accessCode = '';
        }

        const finalAccessCode =
          accessCode || data?.accessCode || data?.studentMeta?.accessCode || data?.rollNumber || '';

        if (!finalAccessCode) return null;

        return {
          studentDocId,
          studentName: fallbackName,
          accessCode: finalAccessCode
        } as StudentInfo;
      })
    );

    const students = (studentsWithAccessCodes.filter(Boolean) as StudentInfo[]);

    students.sort((a, b) => {
      const aNum = parseInt(a.accessCode.slice(-3), 10) || parseInt(a.accessCode, 10) || 0;
      const bNum = parseInt(b.accessCode.slice(-3), 10) || parseInt(b.accessCode, 10) || 0;
      if (aNum && bNum) return aNum - bNum;
      return a.accessCode.localeCompare(b.accessCode);
    });

    if (limitCount > 0) {
      return students.slice(0, limitCount);
    }

    return students;
  }

  async autoCreateMapping(params: {
    classroomId: string;
    selectedKit: Kit;
    mappedRemotes: KitRemote[];
  }): Promise<void> {
    const classroomId = params?.classroomId;
    const kit = params?.selectedKit;
    const mappedRemotes = [...(params?.mappedRemotes || [])].sort((a, b) => (a.slotNumber || 0) - (b.slotNumber || 0));

    if (!classroomId) throw new Error('Missing classroomId');
    if (!kit?.docId) throw new Error('Missing kit');
    if (!mappedRemotes.length) throw new Error('No mapped remotes');

    const students = await this.loadStudents(classroomId, mappedRemotes.length);
    if (!students.length) throw new Error('No students found');

    let existingCreatedAt: any = null;
    try {
      const snap = await this.afs.collection('Mapping').doc(classroomId).ref.get();
      if (snap.exists) {
        const existing = snap.data() as any;
        existingCreatedAt = existing?.createdAt ?? null;
      }
    } catch {
      existingCreatedAt = null;
    }

    const nowTs = firebase.firestore.Timestamp.fromDate(new Date());
    const nowServer = firebase.firestore.FieldValue.serverTimestamp();
    const createdAt = existingCreatedAt ?? nowServer;

    const teacherMac = this.normalizeMac(kit?.teacherRemotes?.[0]?.mac || '');
    const teacherRemote = teacherMac ? [{
      macid: teacherMac,
      role: 'teacher',
      reAssignedTime: nowTs,
      index: 1,
    }] : [];

    const studentRemotes: Record<string, any> = {};
    students.forEach((s, idx) => {
      const remote = mappedRemotes[idx];
      const mac = this.normalizeMac(remote?.mac || '');
      const remoteUsedEntries: RemoteUsedEntry[] = mac ? [{
        macid: mac,
        reAssignedTime: nowTs,
        index: 1,
      }] : [];

      studentRemotes[s.studentDocId] = {
        docId: s.studentDocId,
        studentDocId: s.studentDocId,
        accessCode: s.accessCode,
        slotNumber: remote?.slotNumber || (idx + 1),
        remoteUsed: this.toRemoteUsedMap(remoteUsedEntries)
      };
    });

    await this.afs.collection('Mapping').doc(classroomId).set({
      docId: classroomId,
      kitDocId: kit.docId,
      createdAt,
      updatedAt: nowServer,
      teacherRemote,
      studentRemotes
    });
  }
}
