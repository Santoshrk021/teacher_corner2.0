
import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Injectable({ providedIn: 'root' })
export class DataPreloaderService {
  constructor(private firestore: AngularFirestore) {}

  async preloadAllCollections() {
    console.log('🔥 Preloading Firestore collections...');
    // List your collection names manually
    const collections = ['Institutions', 'Classrooms'];
    for (const col of collections) {
      const snapshot = await this.firestore.collection(col).get().toPromise();
      console.log(`Cached ${snapshot.size} docs from ${col}`);
    }
  }
}
