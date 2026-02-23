import { Injectable } from '@angular/core';
import { KekaEmployeesFirestore } from './keka-employees.firestore';

@Injectable({
  providedIn: 'root'
})
export class KekaEmployeesService {

  constructor(
    private kekaEmployeesFirestore: KekaEmployeesFirestore
  ) { }

  getKekaEmployeeByWorkPhoneNumber(phoneNumber: string) {
    return this.kekaEmployeesFirestore.getCollectionQuery('workPhone', phoneNumber);
  }

  getKekaEmployeeByHomePhoneNumber(phoneNumber: string) {
    return this.kekaEmployeesFirestore.getCollectionQuery('homePhone', phoneNumber);
  }

}
