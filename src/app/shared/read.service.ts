import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReadService {
  progSubLinks = new Subject<any>();
  userDetails = new BehaviorSubject<any>([]);
  journeyDetails = new Subject<any>();
  childrenDetails = new Subject<any>();
  user: any;
  childDetails: any[];
  constructor(public afs: AngularFirestore, private afAuth: AngularFireAuth) { }

  getSchoolByBoardID(boardID) {
    return this.afs.collection('School',
      ref => ref.where('ThinkTAC ID', '==', boardID)
        .limit(1)).get().toPromise().then(async (docsRef: any) => docsRef.docs[0]?.data()?.Name);
  }

  getUDetails(uid) {
    this.afs.collection('Users').doc(uid).get().toPromise().then((usr) => {
      this.user = usr.data();
      this.userDetails.next(usr.data());
    });
  }

  async getJourneyDocs(email) {
    const JourneyDocs = [];
    const journeyRef = this.afs.collection('Journey', ref => ref.where('email', '==', email)).get().toPromise();
    await journeyRef.then(async (snapshots) => {
      if (snapshots.empty) {
      }
      else {
        for (const doc of snapshots.docs) {
          JourneyDocs.push({ id: doc.id, data: doc.data() });
        }
      }
    });
    return JourneyDocs;
  }

  async getJourneySummary(associatedUsers) {
    let webinarCount = 0;
    const GCAttended = [];
    let WAGroupName = '';
    for (const user of associatedUsers) {
      const journeyDoc = await this.getJourneyDocs(user.email);
      for (const journey of journeyDoc) {
        const GuidedWebinar = journey.data.GuidedWebinar;
        const GoogleClasses = journey.data.GoogleClasses;
        const groupName = journey.data.groupName;

        if (GuidedWebinar) {
          webinarCount += GuidedWebinar;
        }
        if (GoogleClasses) {
          for (const clas of GoogleClasses) {
            if (GCAttended.indexOf(clas) === -1) {
              GCAttended.push(clas);
            }
          }
        }
        if (groupName) {
          WAGroupName = groupName;
        }
      }
    }
    return [webinarCount, GCAttended, WAGroupName];
  }

  async setProgSubLink(course) {
    const docs = this.afs.collection('Configuration').doc('Orientation').collection('PlaceHolders').doc(course).get().toPromise();
    this.progSubLinks.next((await docs).data());
  }
  async getJourney(email) {
    this.afs.collection('Journey', ref => ref.where('email', '==', email)).snapshotChanges().subscribe((docs) => {
      docs.forEach((doc: any) => {
        this.journeyDetails.next({ id: doc.payload.doc.id, doc: doc.payload.doc.data() });
      });
    });
  }
  async getNoticeBoard() {
    const docArray = [];
    const promColl = await this.afs.collection('Promotions').get().toPromise();
    for (const doc of promColl.docs) {
      docArray.push(doc.data());
    }
    return docArray;
  }

  async getGCSummary(email, childName) {
    let sortedTACS = {};
    let GCSummaryPath = 'Journey/';
    let labRecords = [];
    let LabRecordURL = '';
    // tslint:disable-next-line: max-line-length
    const gcsCollRef = this.afs.collection('Journey', ref => ref.where('email', '==', email)
      .where('child_name', '==', childName)).get().toPromise();

    await gcsCollRef.then(async (snapshots) => {
      if (snapshots.empty) {
        return;
      }
      else {
        const snapRef = snapshots.docs.map(doc => this.afs.collection('Journey').doc(doc.id)
          .collection('Details').doc('GCSummary').get().toPromise());
        const documents = await Promise.all(snapRef);

        for (const gcsDocRef of documents) {
          const TACtivityDetails = gcsDocRef.data()?.TACtivityDetails;
          GCSummaryPath = GCSummaryPath + gcsDocRef.id + '/Details/GCSummary';
          labRecords = gcsDocRef.data()?.LabRecords ? gcsDocRef.data().LabRecords : [];
          LabRecordURL = gcsDocRef.data()?.LabRecordURL ? gcsDocRef.data().LabRecordURL : '';
          if (TACtivityDetails) {
            sortedTACS = TACtivityDetails.sort(this.timestampSort);
          }
          else {
            sortedTACS = [];
          }
        }
      }
    });
    return [sortedTACS, GCSummaryPath, labRecords, LabRecordURL];
  }
  getIndividualGCSummary() { }

  // async getStudentBelongingClassroom(emailParam) {
  //   // used in router guuard;
  //   const email = emailParam || (await this.afAuth.authState.pipe(first()).toPromise()).email;
  //   if (email) {
  //     const docs: any = await this.afs.collection('School', ref => ref.where('StudentsEmails', 'array-contains', email)).get().toPromise();
  //     if (!docs.empty) {
  //       // this.studentBelongingSchool.next(docs.docs);
  //       const TCID = (docs.docs[0].data().Students.find(s => s.Email === email)['ThinkTac Classroom ID']);
  //       // ['Students'].find(s => s.Email === email)
  //       if (!TCID) {
  //         return;
  //       }
  //       const TCDoc = await this.afs.collection('ThinkTacClassrooms', ref => ref.where('TC Unique ID', '==', TCID)).get().toPromise()
  //         .then((sanpshot: any) => ({ ...sanpshot.docs[0].data(), id: sanpshot.docs[0].id }));
  //       return TCDoc;
  //     }
  //     else {
  //       // this.studentBelongingSchool.next([]);
  //     }
  //     return;
  //   }
  // }


  timestampSort(a, b) {
    const aTime = a?.DueDate ? a.DueDate : a.RecentActivity;
    const bTime = b?.DueDate ? b.DueDate : b.RecentActivity;
    return bTime?.seconds - aTime?.seconds;
  }

  getProgramme() {
    return this.afs.doc('Programmes/workflowIDs').get().toPromise();
  }
}
