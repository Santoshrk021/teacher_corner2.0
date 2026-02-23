import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { finalize } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UploadService {

  constructor(
    private storage: AngularFireStorage,
  ) { }

  uploadFileToFirebaseStorage(file: any, extension: string, filePath: string, fileName: string, contentType: any) {
    const filePathToStore = `${filePath}/${fileName}.${extension}`;
    const fileRef = this.storage.ref(filePathToStore);
    const task = this.storage.upload(filePathToStore, file, { contentType });
    return task.snapshotChanges().pipe(
      finalize(() => {
        fileRef.getDownloadURL().subscribe(url => url);
      })
    );
  }

}
