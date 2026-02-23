import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';
import { ComponentsService } from '../components.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
    selector: 'app-edit-image-files',
    templateUrl: './edit-image-files.component.html',
    styleUrls: ['./edit-image-files.component.scss']
})
export class EditImageFilesComponent implements OnInit {

    constructor(
        public dialogRef: MatDialogRef<EditImageFilesComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private afStore: AngularFireStorage,
        private uiService: UiService,
        private componentService: ComponentsService,
        private masterService: MasterService,
        private sanitizer: DomSanitizer
    ) {}

    fileList = [];
    loading = {};
    storageBucket = 'components';
    selectedFileIndex: number | null = null;
    component: any;
    imageLoader = true;

    async ngOnInit() {
        if (!this.data.isEditMode && this.data.localFiles?.length) {
          this.fileList = this.data.localFiles.map((file: File, i: number) => ({
            name: `imageUrl_${(i + 1)}.${file.name.split('.').pop()}`,
            url: this.data.localPreviews[i],
            file: file
          }));
          this.imageLoader = false; // Data is local, so stop spinner immediately
        } else {
          await this.getFileNames(`${this.storageBucket}/${this.data.componentId}`);
          this.imageLoader = false; // Hide spinner after fetching from Firebase
        }
      }
      

    

    close() {
        if (!this.data.isEditMode) {
          // Return updated files and previews
          const updatedFiles = this.fileList.map(f => f?.file).filter(Boolean);
          const updatedPreviews = this.fileList.map(f => f?.url).filter(Boolean);
      
          this.dialogRef.close({
            updatedFiles,
            updatedPreviews
          });
        } else {
          // Edit mode behavior
          if (this.selectedFileIndex !== null && this.fileList[this.selectedFileIndex]) {
            this.dialogRef.close({
              updatedImage: this.fileList[this.selectedFileIndex],
              index: this.selectedFileIndex
            });
          } else {
            this.dialogRef.close();
          }
        }
      }
      

    sanitizeUrl(url: string): SafeResourceUrl {
        return this.sanitizer.bypassSecurityTrustResourceUrl(url);
      }

    async getFileNames(sourcePath: string): Promise<any[]> {
        const sourceRef = this.afStore.ref(sourcePath);
        try {
            const listResult = await lastValueFrom(sourceRef.listAll());
            const files = await Promise.all(
                listResult.items.map(itemRef =>
                    itemRef.getDownloadURL().then(url => ({ name: itemRef.name, url: url, path: itemRef.fullPath }))
                )
            );
            this.fileList = files;
            return this.fileList;
        } catch (error) {
            this.uiService.alertMessage('Error', 'Error fetching file names', 'error');
            return [];
        }
    }

    async deleteFile(url: string, i: number) {
        const isLocalOnly = !this.data.isEditMode;

  if (isLocalOnly) {
    this.fileList.splice(i, 1);
    this.data.localFiles.splice(i, 1);
    this.data.localPreviews.splice(i, 1);

    // Update form control with correct keys that match review section expectations
    if (this.data.componentForm?.get('imageUrl')) {
      const fakePaths = this.data.localFiles.map((_, index) => `imageUrl_${index + 1}`);
      this.data.componentForm.get('imageUrl')?.setValue(fakePaths);
    }

    // Emit changes using proper callback methods
    if (this.data.imagePreviewsChanged) {
      this.data.imagePreviewsChanged.emit([...this.data.localPreviews]);
    }
    if (this.data.uploadedFilesChanged) {
      this.data.uploadedFilesChanged.emit([...this.data.localFiles]);
    }

    this.uiService.alertMessage('Successful', 'Image removed', 'success');
    return;
  }
    
        // For edit mode: Delete from Firebase
        const fileRef = this.afStore.refFromURL(url);
        fileRef.delete().subscribe({
            next: async () => {
                const deletedIndex = this.fileList.findIndex(f => f?.url === url || f?.path === url);
                if (deletedIndex === -1) {
                    this.uiService.alertMessage('Error', 'File not found in fileList', 'error');
                    return;
                }
    
                this.fileList.splice(deletedIndex, 1);
    
                const rebuiltImagePaths = this.fileList
                    .filter(f => f && f.path)
                    .map(f => f.path);
    
                this.data.componentForm.get('imageUrl')?.setValue(rebuiltImagePaths);
    
                await this.updateDb();
                this.uiService.alertMessage('Successful', 'Deleted successfully', 'success');
            },
            error: () => {
                this.uiService.alertMessage('Error', 'Deletion failed', 'error');
            }
        });
    }
    
    

    async selectFile(event: any, filename: string, url: string, index: number): Promise<void> {
        const file: File = event.target.files[0];
        if (!file) return;

        const componentId = this.data.componentId;
        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const controlName = `imageUrl_${index}`;
        const newPath = `${this.storageBucket}/${componentId}/${controlName}.${fileExtension}`;
        const newRef = this.afStore.ref(newPath);

        const possibleExtensions = ['jpg', 'jpeg', 'png', 'webp'];
        for (const ext of possibleExtensions) {
            const possiblePath = `${this.storageBucket}/${componentId}/${controlName}.${ext}`;
            if (possiblePath !== newPath) {
                try {
                    await lastValueFrom(this.afStore.ref(possiblePath).delete());
                } catch {
                    // Ignore if file doesn't exist
                }
            }
        }

        this.loading[filename] = true;
        try {
            await lastValueFrom(
                newRef.put(file, {
                    customMetadata: { original_name: file.name }
                }).snapshotChanges()
            );

            const downloadURL = await lastValueFrom(newRef.getDownloadURL());

            const updatedFile = {
                name: `${controlName}.${fileExtension}`,
                url: downloadURL,
                path: newPath
            };

            const existingPaths = [...(this.data.componentForm.get('imageUrl')?.value || [])];
            while (existingPaths.length <= index) existingPaths.push('');

            existingPaths[index] = updatedFile.path;
            this.data.componentForm.get('imageUrl')?.setValue(existingPaths);
            this.fileList[index] = updatedFile;

            await this.updateDb();

            this.uiService.alertMessage('successful', 'File uploaded and replaced successfully', 'success');
        } catch (err) {
            this.uiService.alertMessage('Error', 'File upload failed', 'error');
        } finally {
            this.loading[filename] = false;
        }
    }

    async updateDb() {
        const updatedPaths = this.data.componentForm.get('imageUrl')?.value || [];

        const updatedComponent: any = {
            docId: this.data.componentId,
            imageUrl: updatedPaths,
            updatedAt: new Date()
        };

        const formValue = this.data.componentForm?.value || {};
        const safeKeys = [
            'componentName', 'componentCode', 'category',
            'componentType', 'attribute', 'sizeUnit', 'quantity', 'masterDocId'
        ];

        for (const key of safeKeys) {
            if (formValue[key] !== undefined) {
                updatedComponent[key] = formValue[key];
            }
        }

        await this.componentService.updateComponent(updatedComponent);

        if (this.component?.masterDocId) {
            await this.masterService.updateMasterDoc(
                'components',
                this.component.masterDocId,
                { [this.data.componentId]: updatedComponent }
            );
        }
    }
}
