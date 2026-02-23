/* eslint-disable @typescript-eslint/member-ordering */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable arrow-body-style */
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ComponentModel } from './components.interface';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';
import { map } from 'rxjs/operators';
import { serverTimestamp } from '@angular/fire/firestore';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UiService } from 'app/shared/ui.service';

@Injectable({
  providedIn: 'root'
})
export class ComponentsService {
  currentLimit = 15;
  // BehaviorSubjects to store the components data
  componentsSource = new BehaviorSubject<ComponentModel[]>([]);
  trashSource = new BehaviorSubject<ComponentModel[]>([]);

  // Observables that components can subscribe to
  components$ = this.componentsSource.asObservable();
  trash$ = this.trashSource.asObservable();

  // Firestore collections
  private componentsCollection: AngularFirestoreCollection<ComponentModel>;
  private trashCollection: AngularFirestoreCollection<ComponentModel>;
  private masterService: MasterService;
  private uiService: UiService;



  constructor(private afs: AngularFirestore) {
    this.trashCollection = this.afs.collection<ComponentModel>('Components/--trash--/DeletedComponents', ref => ref.limit(30));

    // Initialize with empty arrays
    this.componentsSource.next([]);
    this.trashSource.next([]);

    // Load initial data from Firestore
    this.loadComponentsFromMaster();
    this.loadTrash();

  }


  getComponents(): ComponentModel[] {
    return this.componentsSource.getValue();
  }

  getTrash(): ComponentModel[] {
    return this.trashSource.getValue();
  }

  setComponents(components: ComponentModel[]): void {
    this.componentsSource.next(components);
  }

  setTrash(trash: ComponentModel[]): void {
    this.trashSource.next(trash);
  }


  //get all Components List from DataBase
  getAllComponetsFromDB() {
    return this.afs.collection('Components', ref => ref.where('docId', 'not-in', ['--schema--', '--trash--'])).get();
}



  async restoreFromTrash(component: ComponentModel): Promise<any> {
    const deletedComponent = await this.afs.collection('Components')
      .doc('--trash--')
      .collection('DeletedComponents')
      .doc(component.id)
      .get()
      .toPromise();

    if (!deletedComponent?.exists) {
      throw new Error('Deleted Component not found');
    }

    const data = deletedComponent.data() as ComponentModel;
    const { ...restoredData } = data;

    // Add back to main collection
    await this.afs.collection('Components')
      .doc(component.id)
      .set(restoredData);

    // Delete from trash collection
    return this.afs.collection('Components')
      .doc('--trash--')
      .collection('DeletedComponents')
      .doc(component.id)
      .delete();
  }


  deleteComponentById(docId: string, componentObj): Promise<void> {
    return this.afs.collection('Components').doc('--trash--').collection('DeletedComponents').doc(docId).set({ ...componentObj, trashAt: serverTimestamp() });
  }

  deleteComponent(docId) {
    return this.afs.collection('Components').doc(docId).delete();
  }

  async permanentlyDeleteFromTrash(component: ComponentModel): Promise<boolean> {
    try {
      const componentData = await this.afs.collection('Components').doc('--trash--')
        .collection('DeletedComponents')
        .doc(component.id)
        .get()
        .toPromise();

      if (!componentData?.exists) {
        return;
      }

      const data = componentData.data() as ComponentModel;

      // Delete from trash collection
      await this.afs.collection('Components')
        .doc('--trash--')
        .collection('DeletedComponents')
        .doc(component.id)
        .delete();
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async addNewComponent(component:any,id:any):Promise<any>{
    return this.afs.collection('Components')
    .doc(id)
    .set({
      ...component,
      docId: id,
    });
    
  }

  // updateComponent(component: ComponentModel): Promise<void> {
  //   return this.afs.collection('Components')
  //     .doc(component.id)
  //     .update(component);
  // }

  updateComponent(component: any): Promise<void> {
    return this.afs.collection('Components')
      .doc(component.docId)
      .update(component);
  }

  // loadComponents(): void {
  //   const collectionRef = this.afs.collection<ComponentModel>('Components');

  //   collectionRef.get().subscribe((querySnapshot) => {
  //   });
  //   // Initialize Firestore collections
  //   const collectionRefs = this.afs.collection<ComponentModel>('Components', ref => ref.limit(10));
  //   collectionRefs.snapshotChanges().pipe(
  //     map((actions: any[]) => {
  //       return actions.map((a) => {
  //         try {
  //           const data = a.payload.doc.data() as ComponentModel;
  //           const id = a.payload.doc.id;

  //           if (id === '--schema--') {
  //             return null;
  //           }
  //           // Ensure all required fields are present
  //           const component: ComponentModel = {
  //             id,
  //             image: data.image || ['../../assets/imageslist/can.jpeg', '../../assets/imageslist/cardboard.jpeg', '../../assets/imageslist/sheet.jpeg'],
  //             componentCode: data.componentCode || '',
  //             componentName: data.componentName || '',
  //             category: data.category || '',
  //             componentType: data.componentType || '',
  //             attribute: data.attribute || '',
  //             sizeUnit: data.sizeUnit || '',
  //             quantity: data.quantity || 0,
  //             createdAt: data.createdAt || firebase.firestore.Timestamp.fromDate(new Date()),
  //             viewMore: true,
  //             delete: false
  //           };

  //           return component;
  //         } catch (error) {
  //           console.error('Error processing component document:', error);
  //           return null;
  //         }
  //       }).filter(item => item !== null) as ComponentModel[];
  //     })
  //   ).subscribe((components) => {
  //     this.componentsSource.next(components);
  //   }, (error) => {
  //     console.error('Error loading components from Firestore:', error);
  //     // Load empty array on error
  //     this.componentsSource.next([]);
  //   });
  // }



  loadComponentsFromMaster(): void {
    this.afs.collection('Master', ref =>
      ref.where('type', '==', 'COMPONENT').orderBy('creationDate', 'desc')
    )
    .snapshotChanges()
    .pipe(
      map((docs: any[]) => {
        const allComponents = docs
          .map(doc => doc.components || {})
          .flatMap((componentsMap: { [key: string]: any }) =>
            Object.entries(componentsMap).map(([id, comp]) => {
              return {
                id,
                componentCode: comp.componentCode || '',
                componentName: comp.componentName || '',
                category: comp.category || '',
                groupName: comp.groupName || '',
                subCategory: comp.subCategory || '',
                componentSize: comp.componentSize || '',
                quantity: comp.quantity || 0,
                createdAt: comp.createdAt || firebase.firestore.Timestamp.fromDate(new Date()),
                image: comp.imageUrl || [],
              } as ComponentModel;
            })
          );
        return allComponents;
      })
    )
    .subscribe({
      next: (components) => {
        this.componentsSource.next(components);
      },
      error: (err) => {
        console.error('Error loading components from master:', err);
        this.componentsSource.next([]);
      }
    });
  }
  

  // Load trash items from Firestore
  private loadTrash(): void {
    this.trashCollection.snapshotChanges().pipe(
      map((actions) => {
        return actions.map((a) => {
          try {
            const data = a.payload.doc.data() as ComponentModel;
            const id = a.payload.doc.id;

            // Ensure all required fields are present
            const trashItem: ComponentModel = {
              id,
              image: data.image || ['../../assets/imageslist/can.jpeg', '../../assets/imageslist/cardboard.jpeg', '../../assets/imageslist/sheet.jpeg'],
              componentCode: data.componentCode || '',
              componentName: data.componentName || '',
              groupName: data.groupName || '',
              category: data.category || '',
              subCategory: data.subCategory || '',
              componentSize: data.componentSize || '',
              attribute: data.attribute || '',
              quantity: data.quantity || 0,
              createdAt: data.createdAt || firebase.firestore.Timestamp.fromDate(new Date()),
            };
            return trashItem;
          } catch (error) {
            return null;
          }
        }).filter(item => item !== null) as ComponentModel[];
      })
    ).subscribe((trashItems) => {
      this.trashSource.next(trashItems);
    }, (error) => {
      console.error('Error loading trash from Firestore:', error);
      // Load empty array on error
      this.trashSource.next([]);
    });
  }


  getAllTrashComponents() {
    return this.afs.collection('Components/--trash--/DeletedComponents').valueChanges();
  }
// Delete a specific component from trash
deleteInTrash(componentId: string): Promise<void> {
  return this.afs.collection('Components/--trash--/DeletedComponents').doc(componentId).delete();
}

// Empty entire trash collection
async emptyTrash(): Promise<void> {
  const trashCollectionPath = 'Components/--trash--/DeletedComponents';

  try {
    const snapshot = await this.afs.collection(trashCollectionPath).get().toPromise();
    if (snapshot?.empty) {
      return;
    }

    const batch = this.afs.firestore.batch();

    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error(error);
  }
}



  getComponentById(id: string) {
    return this.afs.collection('Components').doc(id).get().pipe(
      map(doc => {
        if (doc.exists) {
          const data = doc.data() as any;
          return { id: doc.id, ...data };
        } else {
          throw new Error('Component not found');
        }
      })
    );
  }


  getAllComponentSize() {
    return this.afs.collection('Configuration').doc('componentSize').get().pipe(
      map(doc => {
        if (doc.exists) {
          const data = doc.data() as any;
          // console.log('Raw size data:', data.componentSize);
          // console.log(Object.values(data.componentSize));
          return data.componentSize ? Object.values(data.componentSize) : [];
        } else {
          console.warn('ComponentSize document does not exist');
          return [];
        }
      }),
  
    );
  }
  
  
  
  addNewComponentSize(displayName: string, existingSizes: any[]): Promise<any> {
    const trimmedName = displayName.trim();
    if (!trimmedName) return Promise.reject('Display name is empty');
  
    const maxCode = existingSizes.reduce((max, item) => {
      const codeNum = parseInt(item.code, 10);
      return isNaN(codeNum) ? max : Math.max(max, codeNum);
    }, 0);
  
    const newCode = (maxCode + 1).toString().padStart(4, '0');
    const newEntry = {
      code: newCode,
      displayName: trimmedName
    };
  
    const docRef = this.afs.collection('Configuration').doc('componentSize');
  
    // ✅ Update under componentSize map
    const updateObj = {
    componentSize: {
      [newCode]: newEntry
    }
  };
  
    return docRef.set(updateObj, { merge: true }).then(() => newEntry);
  }

  getMatchingComponentCodes(prefix: string): Observable<string[]> {
    return this.afs.collection('Master', ref => ref.where('type', '==', 'COMPONENT'))
      .get()
      .pipe(
        map(snapshot => {
          const matchingCodes: string[] = [];

          snapshot.forEach(doc => {
            const data = doc.data();
            const components = data['components'] || {};
            Object.values(components).forEach((comp: any) => {
              const code = comp?.componentCode;
              if (typeof code === 'string' && code.startsWith(prefix)) {
                matchingCodes.push(code);
              }
            });
          });

          return matchingCodes;
        })
      );
  }
  

}
