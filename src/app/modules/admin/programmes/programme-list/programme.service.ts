import { Injectable } from '@angular/core';
import { Programme } from './programme.model';
//import { AngularFirestore } from '@angular/fire/firestore';
import { Subject } from 'rxjs';
import { testProgramme } from '../activity';
import { BehaviorSubject } from 'rxjs';
import { Programmelist } from './programme';
import { activity } from './models/activity.model';
import { Observable } from '@firebase/util';
@Injectable({
  providedIn: 'root'
})
export class ProgrammelistService {
  formData: Programme;

  taccode = new Subject<any>();

  program = {
    id: '1',
    displayName: 'AP Pilot Seek',
    ProgrammeId: 'AP Pilot Seek_5',
    Activity: [],
    Selectedact: [],
    TACs: [],

  };

  act = [{
    workflowId: 'freemium',
    tacName: 'Body Joints - Ball Socket ',
    tacCode: 'BA02',
    tacVersion: 'EN-V10'

  }];

  programs: Programme[];

  disname = new BehaviorSubject<activity[]>(this.act);
  successMsg$ = this.disname.asObservable();

  pro = new BehaviorSubject<any>(this.program);
  pro$ = this.pro.asObservable();


  newprogram = new BehaviorSubject<any>(this.program);
  newprogram$ = this.newprogram.asObservable();

  Form = new BehaviorSubject<any>('ddd');
  Form$ = this.Form.asObservable();


  Allprograms = new BehaviorSubject<Programme[]>(Programmelist);
  Allprograms$ = this.Allprograms.asObservable();


  activities = new BehaviorSubject<activity[]>(this.act);
  activities$ = this.activities.asObservable();


  constructor() {

    this.programs = Programmelist;

  }

  getActivity() {
    return this.Allprograms;
  }

  getTac() {
    console.log(testProgramme);
    this.disname.next(testProgramme);
  }

  setForm(form: any) {
    this.Form.next(form);
  }

  programcreated(allprogram?: Programme[]) {
    this.Allprograms.next(allprogram);
  }

  selectprogram(program: any) {
    this.pro.next(program);
  }

}
