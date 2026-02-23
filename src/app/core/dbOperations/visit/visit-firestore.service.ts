import { Injectable } from '@angular/core';
import { FirebaseApp, initializeApp } from 'firebase/app';
import { environment } from 'environments/environment.prod';
@Injectable({
    providedIn: 'root'
  })
export class visitFirebaseService {
  private firebaseApp1: FirebaseApp;
  private firebaseApp2: FirebaseApp;
  private activeFirebaseApp: FirebaseApp;

  constructor() {
    this.firebaseApp1 = initializeApp(environment.firebase, 'project1');
    this.activeFirebaseApp = this.firebaseApp1; // Default Firebase project
  }

  switchProject(project: 'project1' | 'project2') {
    this.activeFirebaseApp = project === 'project1' ? this.firebaseApp1 : null;
  }

  getActiveFirebaseApp() {
    return this.activeFirebaseApp;
  }
}


