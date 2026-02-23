import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { BehaviorSubject, first, ReplaySubject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
@Injectable({
  providedIn: 'root'
})
export class UserService {
  updateUserStudentNotifications(workflowStepsClone: any, workflowSteps: any[]) {
    throw new Error('Method not implemented.');
  }
  userDocSub = new ReplaySubject(1);
  userBelongingSchool = new ReplaySubject(1);

  constructor(private afs: AngularFirestore, private afAuth: AngularFireAuth,
    private http: HttpClient) { }

  async getUserBelongingSchool() {
    // used in router guuard;
    const user = await this.afAuth.authState.pipe(first()).toPromise();
    const PhArr = [];
    if (user.phoneNumber) {
      PhArr.push(user?.phoneNumber, user?.phoneNumber?.slice(3));
    }
    if (user) {
      const promiseArr = [this.afs.collection('School', ref => ref.where('StudentsEmails', 'array-contains-any', [...PhArr, user?.email])).get().toPromise()];
      if (PhArr.length)
        {promiseArr.push(this.afs.collection('School', ref => ref.where('StudentsPhones', 'array-contains-any', PhArr)).get().toPromise());}

      const [docs, docs2 = {
        empty: true,
        docs: []
      }] = await Promise.all(promiseArr);
      const documents = !docs.empty || !docs2.empty ? [...docs?.docs, ...docs2?.docs] : [];
      this.userBelongingSchool.next(documents);
      const d = !docs.empty || !docs2.empty ? [...docs?.docs, ...docs2?.docs] : [];
      return d;
      // return !docs.empty ? docs.docs : []
    }
    else {
      return Promise.reject('Not loggedIn');
    }
  }

  async getAssociatedUser() {
    const users = [];
    let phone = '';
    await this.afAuth.currentUser.then(async (user) => {
      await this.afs.collection('Users').doc(user.uid).get().toPromise().then(async (doc: any) => {
        if (doc.exists) {
          phone = doc.data()?.address_details?.phonenum || user.phoneNumber || '';
          // if (doc.data().purchasedProducts) {
          if (doc.data()) {
            users.push({
              uid: user.uid,
              email: user?.email || user.phoneNumber,
              phone
            });
          }
          if (doc.data().AssociatedUsers) {
            const AU = doc.data().AssociatedUsers;
            for (const AUser of AU) {
              users.push({ uid: AUser.uid, email: AUser.email, phone });
            }
          }
        }
        else {
          // console.error('Invalid email');
        }
      });

    });
    return users;
  }
  async getUserDetails(uid) {
    return this.afs.collection('Users').doc(uid).get().toPromise().then(async (doc: any) => {
      const user = {
        address_details: doc.data().address_details ? doc.data().address_details : { uid },
        purchasedProducts: doc.data().purchasedProducts ? this.reverseArray(doc.data().purchasedProducts) : '',
        email: doc.data().email,
        // phone: doc.data()?.address_details?.phonenum,
        displayName: doc.data()?.displayName || '',
        uid,
        CommunicationMode: doc.data().CommunicationMode ? doc.data().CommunicationMode : {},
        alternatePhone: doc.data().AlternatePhone ? doc.data().AlternatePhone : '',
        alternateEmail: doc.data().AlternateEmail ? doc.data().AlternateEmail : ''
      };
      this.userDocSub.next(user);
      return user;
    });
  }
  reverseArray(arr) {
    const newArray = [];
    for (let x = arr.length - 1; 0 <= x; --x) {
      newArray.push(arr[x]);
    }
    return newArray;
  }

  updateAddress(data) {
    this.afs.collection('Users').doc(data.uid).set({
      address_details: {
        street1: data.street1U,
        street2: data.street2U,
        city: data.cityU,
        // phonenum: data.phonenumU,
        pincode: data.pincodeU,
      },
      AlternatePhone: data.alternatePhoneU ? data.alternatePhoneU : '',
      AlternateEmail: data.alternateEmailU ? data.alternateEmailU : '',
    }, { merge: true });
  }

  updatePRF(values) {
    this.afs.collection('Users').doc(values.uid).set({
      CommunicationMode: {
        Phone: values.Phone,
        eMail: values.eMail,
        WhatsApp: values.WhatsApp,
      }
    }, { merge: true });
  }


  // async getTacDetails(TacID, version) {
  //   const arr = ['Image', 'Public Links', 'Description', 'Materials', 'Associated TACs', 'Additional Resources'];
  //   const ref = this.afs.collection('Tac').doc(TacID);
  //   const doc = await ref.get().toPromise();

  //   if (doc.exists) {

  //     let data = doc.data();
  //     const PromiseArr = [];
  //     for (const sub of arr) {
  //       // const subRef = ref.collection('V1').doc(sub);
  //       const subRef = ref.collection(version || 'V1').doc(sub);
  //       PromiseArr.push(subRef.get().toPromise());
  //     }
  //     const resolved = await Promise.all(PromiseArr);
  //     resolved.forEach(subDoc => {
  //       data = Object.assign(data, subDoc.data());
  //     });

  //     return data;
  //   }
  // }

  getTacDetails(tacCode, version) {
    return this.afs.doc(`TACtivities/${tacCode}/Version/${version}`).valueChanges();
  }

  updateOtpForPhone(ph,data){
    return this.afs.doc(`OTPAttempts/${ph}`).set(data,{merge:true});
  }

  getOtpPhoneDetails(ph){
    return this.afs.doc(`OTPAttempts/${ph}`).get();
  }

  getDateTimeAPI(){
   return this.http.get('http://worldtimeapi.org/api/timezone/Asia/Kolkata');
  }


  async updateUserLoginAttempt(ph,data){
    return this.afs.doc(`OTPAttempts/${ph}`).set(data,{merge:true});
  }
}
