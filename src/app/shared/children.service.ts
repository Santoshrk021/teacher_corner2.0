import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { arrayUnion } from 'firebase/firestore';
import { ReplaySubject, Subject, Subscription } from 'rxjs';
import { first, map } from 'rxjs';
import { ReadService } from './read.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class ChildrenService {
  // childrenArr: any[];
  // childrenSub = new ReplaySubject(1);
  chDocSub = new ReplaySubject(1);
  // TACListSub = new ReplaySubject(1);
  // TACListSub = new BehaviorSubject([]);
  TACListSub = new Subject();
  // childSub = new Subscription();
  childPhoneEmail = [];

  classCodesFromDB: any;
  children: any;
  TACList: any = [];
  assignmentSubscription: Subscription;
  subscriptions: Subscription[] = [];
  syllabusSub: Subscription;
  creatingChildren = false;
  constructor(private afs: AngularFirestore, private readService: ReadService, private afAuth: AngularFireAuth, private userService: UserService,) {
    // this.checkValidity(this.validityMap);

    this.afAuth.authState.subscribe(async (user) => {
      if (!user && this.subscriptions.length) {
        this.unsubscribeAll();
      } else {
        // this.getAllChildren([user])
      }
    });
  }






  async buildChildObj(child) {
    const ch = child.data;
    ch.ChildEmail ? ch.ChildEmail : ch.parentDetails.email;
    ch.ChildPhone ? ch.ChildPhone : ch.parentDetails.phone;

    const a = this.getStudentBelongingClassroom(ch.ChildEmail, ch.child_name) || [];
    const b = this.readService.getGCSummary(ch.parentDetails.email, ch.child_name);
    const [classRoom, gcSummaryArr] = (await Promise.all([a, b]));

    const schoolIconUrl = classRoom?.schoolICon;

    const chData = {
      childId: child?.payload?.doc?.id,
      data: ch,
      parentId: ch?.parentDetails?.uid,
      path: child?.payload?.doc?.ref?.path,
      classRoom,
      GCSummary: gcSummaryArr[0],
      GCSummaryPath: gcSummaryArr[1],
      labRecords: gcSummaryArr[2],
      LabRecordURL: gcSummaryArr[3] || '',
      schoolIcon: schoolIconUrl,
      dataFetched: true
    };

    return chData;
  }






  unsubscribeAll() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  async updateGCGmail(children) {

    for (const ch of this.childPhoneEmail) {
      const updatedChildEmail = children.filter(child => (
          child.data.ChildEmail != ch.email &&
          child.childId === ch.childId
        ));
      if (updatedChildEmail.length) {
        this.afs.doc(updatedChildEmail[0].path).set({
          ChildEmail: updatedChildEmail[0].data.ChildEmail,
        }, { merge: true });
      }
    }
  }
  async updateWSPhone(children) {
    for (const ch of this.childPhoneEmail) {
      const updatedChildPhone = children.filter(child => (
          child.data.ChildPhone != ch.phone &&
          child.childId === ch.childId
        ));
      if (updatedChildPhone.length) {
        this.afs.doc(updatedChildPhone[0].path).set({
          ChildPhone: updatedChildPhone[0].data.ChildPhone
        }, { merge: true });
      }
    }
  }

  labRecordSubm(TAC, path, values, labRecords, storageURLs) {
    const checkLabRecords = labRecords.filter(obj => (
        obj.TACtivityName === TAC
      ));

    const checkTACImage = storageURLs.find(obj => (
        obj.name === 'CroppedTACtivityImage' && obj.downloadURL !== undefined
      ));
    const checkTACPdfImage = storageURLs.find(obj => (
        obj.name === 'CroppedObservationImages' && obj.downloadURL !== undefined
      ));

    if (checkLabRecords.length > 0) {
      const indexVal = labRecords.findIndex(element => element.TACtivityName === TAC);

      labRecords[indexVal].Aim = values.Aim ? values.Aim : '';
      labRecords[indexVal].Date = values.Date ? values.Date : '';
      labRecords[indexVal].Theory = values.Theory ? values.Theory : '';
      labRecords[indexVal].MaterialRequirement = values.MaterialRequirement ? values.MaterialRequirement : '';
      labRecords[indexVal].Procedure = values.Procedure ? values.Procedure : '';
      labRecords[indexVal].CalculationDiscussion = values.CalculationDiscussion ? values.CalculationDiscussion : '';
      labRecords[indexVal].Analysis = values.Analysis ? values.Analysis : '';

      if (checkTACImage) {
        // labRecords[indexVal].TACtivityImages = labRecords[indexVal]?.TACtivityImages ? [...labRecords[indexVal]?.TACtivityImages,
        // checkTACImage.downloadURL] : [checkTACImage.downloadURL];
        labRecords[indexVal].TACtivityImage = checkTACImage.downloadURL;
      }
      if (checkTACPdfImage) {
        labRecords[indexVal].ObservationImages = labRecords[indexVal]?.ObservationImages ? [...labRecords[indexVal]?.ObservationImages,
        checkTACPdfImage.downloadURL] : [checkTACPdfImage.downloadURL];
      }

      this.afs.doc(path).set({
        LabRecords: labRecords
      }, { merge: true });

    } else {
      const obj = {
        TACtivityName: TAC ? TAC : '',
        Aim: values.Aim ? values.Aim : '',
        Date: values.Date ? values.Date : '',
        Theory: values.Theory ? values.Theory : '',
        MaterialRequirement: values.MaterialRequirement ? values.MaterialRequirement : '',
        Procedure: values.Procedure ? values.Procedure : '',
        CalculationDiscussion: values.CalculationDiscussion ? values.CalculationDiscussion : '',
        Analysis: values.Analysis ? values.Analysis : '',
        TACtivityImage: checkTACImage ? checkTACImage?.downloadURL : '',
        ObservationImages: checkTACPdfImage ? [checkTACPdfImage?.downloadURL] : []
      };
      this.afs.doc(path).set({
        LabRecords: arrayUnion(obj)
      }, { merge: true }).then(() => {
        labRecords.push(obj);
      });
    }
  }

  async getStudentBelongingClassroom(emailParam, name) {
    // used in router guuard;
    let schoolICon: string = '';
    const user = await this.afAuth.authState.pipe(first()).toPromise();
    const email = emailParam || user.email || user.phoneNumber;
    const e = emailParam || user.email;

    if (email) {

      // const [docs1, docs2] = await Promise.all([this.afs.collection('School', ref => ref.where('StudentsEmails', 'array-contains-any', [e, user.phoneNumber, user.phoneNumber.slice(3)])).get().toPromise()
      //   , this.afs.collection('School', ref => ref.where('StudentsPhones', 'array-contains-any', [user.phoneNumber, user.phoneNumber.slice(3)])).get().toPromise()])

      const PhArr = [];
      if (user.phoneNumber) {
        PhArr.push(user?.phoneNumber, user?.phoneNumber?.slice(3));
      }
      const promiseArr = [this.afs.collection('School', ref => ref.where('StudentsEmails', 'array-contains-any', [...PhArr, user?.email])).get().toPromise()];
      if (PhArr.length)
        {promiseArr.push(this.afs.collection('School', ref => ref.where('StudentsPhones', 'array-contains-any', PhArr)).get().toPromise());}

      const [docs1, docs2 = { empty: true, docs: [] }] = await Promise.all(promiseArr);

      const docs = [...docs1.docs, ...docs2.docs];

      if (!docs1.empty || !docs2.empty) {
        // this.studentBelongingSchool.next(docs.docs);
        let TCID = '';
        let RA2022Stage1Nominated = false;
        for (const doc of docs) {
          const schoolData: any = doc.data();
          if ((docs.length > 1) && (schoolData['ThinkTAC ID'] === 'CBSE11')) {
            continue;
          }
          schoolICon = schoolData?.SchoolIconUrl || '';
          const obj = schoolData.Students.find(s => ((s.Email === email || s.Phone === user?.phoneNumber || s.Phone === user?.phoneNumber?.slice(3)) && s.Name === name)) || {};

          if (Object.keys(obj).length) {
            RA2022Stage1Nominated = obj?.RA2022Stage1Nominated || false;
            TCID = obj['ThinkTac Classroom ID'];
          }
        }

        if (!TCID) {
          return {};
        }
        const TCDoc = await this.afs.collection('ThinkTacClassrooms', ref => ref.where('TC Unique ID', '==', TCID)).get().toPromise()
          .then((sanpshot: any) => ({ ...sanpshot.docs[0].data(), id: sanpshot.docs[0].id }))
          .then(async (data: any) => {
            const indices = data.Students.map((e, i) => (e['Student email'] === email || e['Student phone'] === user?.phoneNumber || e['Student phone'] === user?.phoneNumber?.slice(3)) ? i : '').filter(String);
            for (const idx of indices) {
              data.Students[idx]['LastActivity'] = new Date();
              if (data?.Students[idx]['activeStatus']) {
                data['activeStudents'] = data['activeStudents'] || [];
                data['activeStudents'].push(data?.Students[idx]['Student name']);
              }
            }
            await this.updateStudents(data);
            return { ...data };
          });
        return { schoolICon, ...TCDoc, RA2022Stage1Nominated };
      }
      // else {
      //   // this.studentBelongingSchool.next([]);
      // }
      return {};
    }
  }
  updateStudents(data) {
    return this.afs.collection('ThinkTacClassrooms').doc(data.id).set({ Students: data.Students }, { merge: true });

  }

  async getTACAssignments(TCDoc) {
    this.TACList = [];
    if (this.assignmentSubscription) {
      this.assignmentSubscription.unsubscribe();
    }
    if (TCDoc?.id) {

      const today = new Date(new Date().setHours(24, 0, 0, 0));
      this.assignmentSubscription = this.afs.collection(`ThinkTacClassrooms/${TCDoc.id}/Syllabus/`,
        ref => ref.where('DripDate', '<=', today).orderBy('DripDate', 'desc')).stateChanges().pipe(
          map(actions => actions.map((a) => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          }))
        ).subscribe((data) => {
          const d = data;
          this.TACList = this.pushUpdateArray(this.TACList, d);
          this.TACListSub.next(this.TACList.sort((a, b) => b.DripDate.seconds - a.DripDate.seconds));
        });
    }
    else {
      this.TACListSub.next([]);
    }
    // return [];
  }

  getTacList(id){
    const today = new Date(new Date().setHours(24, 0, 0, 0));
    this.assignmentSubscription = this.afs.collection(`Classrooms/${id}/Syllabus/`).valueChanges().subscribe((res)=>{
      this.TACListSub.next(res);
    });
  }

  mergeArr(a1, a2) {
    return a1.map(t1 => ({ ...t1, ...a2.find(t2 => t2.id === t1.id) }));
  }
  pushUpdateArray(a1, a2) {
    let arr1; let arr2;
    if (a1.length == a2.length) {
      arr1 = a1;
      arr2 = a2;
    }
    else {
      arr1 = a1.length > a2.length ? a1 : a2;
      arr2 = a1.length > a2.length ? a2 : a1;
    }


    for (const obj of arr2) {
      const index = arr1.findIndex(e => e.id === obj.id);
      if (index === -1) {
        arr1.push(obj);
      } else {
        arr1[index] = obj;
      }
    };
    return arr1;
  }

  createChild(name, userID) {
    this.afs.doc('Users/8oZuZVJvW4Uv7iXJ9TAoj2DgGn52/Children/y8kffmlhqZUD7os0wn84').get().toPromise().then((doc: any) => {
      const childDoc = doc.data();
      childDoc.child_name = name;
      this.afs.collection(`Users/${userID}/Children`).add(childDoc)
        .then(() => console.info('Created user at :' + `Users/${userID}/Children`));
    });
  }
}

