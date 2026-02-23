import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { ComponentsService } from '../components.service';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import firebase from 'firebase/compat/app';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { UiService } from 'app/shared/ui.service';

@Component({
  selector: 'app-add',
  templateUrl: './add.component.html',
  styleUrls: ['./add.component.scss'],
})
export class AddComponent implements OnInit , OnDestroy {

  @Output() formSubmitted: EventEmitter<boolean> = new EventEmitter<boolean>();
  form!: FormGroup;
  editFormIsValid: boolean = false;
  formWasSubmitted = false;
  generatedDocId: string = '';
  componentUploadedFiles: File[] = [];
  uploadedFiles: File[] = [];
  imagePreviews: string[] = [];
  submitLoader: boolean = false;



  
  constructor(private dialogRef: MatDialogRef<AddComponent>,
    private componentsService: ComponentsService,
    private afs: AngularFirestore,
    private masterService: MasterService,
    private sanitizer: DomSanitizer,
    private uiService: UiService
  ) {}

  ngOnInit(): void {
    this.form = new FormGroup ({
      componentName: new FormControl('', Validators.required),
      componentCode: new FormControl({value: '', disabled: true}, Validators.required),
      groupName: new FormControl('', Validators.required),
      category: new FormControl('', Validators.required),
      subCategory: new FormControl('', Validators.required),
      // attribute: new FormControl('', Validators.required),
      componentSize: new FormControl('', Validators.required),
      quantity: new FormControl('', Validators.required),
      imageUrl: new FormControl(''),  
    })


    const controlNames = [ 'componentName', 'groupName', 'category', 'subCategory', 'componentSize', 'quantity'];
    for (let i = 1; i < controlNames.length; i++) {
    const prev = this.form.controls[controlNames[i - 1]];
    const curr = this.form.controls[controlNames[i]];
    curr.disable();
    prev.statusChanges.subscribe((status) => {
      if (status === 'VALID') {
        curr.enable();
      } else {
        curr.disable();
      }
    });
}
  }

  onFilesUpdated(files: File[]) {
    this.componentUploadedFiles = files;
  }
  

  getImagePreview(imgKey: string): SafeUrl {
    const match = imgKey.match(/imageUrl_(\d+)/);
    if (!match) return '';
  
    const index = parseInt(match[1], 10) - 1;
    const url = this.imagePreviews[index];
    return this.sanitizer.bypassSecurityTrustUrl(url);
  }
  
  
  ngOnDestroy() {
    this.componentUploadedFiles = [];
    this.imagePreviews = [];
  }

  close(): void {
    this.dialogRef.close();
  }
  
  onEditFormStatusChanged(valid: boolean) {
    this.editFormIsValid = valid;
  }

  onGeneratedocId(id: string) {
    this.generatedDocId = id;
  }
  
  get imageUrlArray(): string[] {
    const value = this.form.get('imageUrl')?.value;
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }

    return [];
  }

  onNext(): void {
    this.updateFinalCode();
  }

  onPreviewsUpdated(previews: string[]) {
    this.imagePreviews = previews; // Update local preview list
    
    // Update form control with proper image keys for review section
    const fakePaths = previews.map((_, i) => `imageUrl_${i + 1}`);
    this.form.get('imageUrl')?.setValue(fakePaths);
  }


  updateFinalCode() {
    const groupName = this.form.get('groupName')?.value;
    const category = this.form.get('category')?.value;
    const subCategory = this.form.get('subCategory')?.value;
    const componentName = this.form.get('componentName')?.value;
    const componentSize = this.form.get('componentSize')?.value;
  
    if (!groupName || !category?.componentCode || !subCategory?.subCategoryCode || !componentSize?.code) {
      return;
    }
  
    const groupCode = groupName.code;
    const catCode = category.componentCode;
    const subCatCode = subCategory.subCategoryCode;
    const sizeCode = componentSize.code;
  
    let nameCode = '';
    if (componentName) {
      const words = componentName.trim().split(/\s+/);
      if (words.length === 1) {
        nameCode = words[0].substring(0, 3).toUpperCase();
      } else if (words.length === 2) {
        nameCode = (words[0].substring(0, 2) + words[1].substring(0, 1)).toUpperCase();
      } else if (words.length >= 3) {
        nameCode = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
      }
    }
  
    const prefix = `${groupCode}${catCode}${subCatCode}_${nameCode}`;
  
    this.componentsService.getMatchingComponentCodes(prefix).subscribe(matchingCodes => {
      let maxSuffix = 0;
  
      matchingCodes.forEach(code => {
        const suffixMatch = code.match(new RegExp(`^${prefix}_(\\d{3})_`));
        if (suffixMatch && suffixMatch[1]) {
          const num = parseInt(suffixMatch[1], 10);
          if (num > maxSuffix) {
            maxSuffix = num;
          }
        } else {
          const baseMatch = code.match(new RegExp(`^${prefix}_(\\d{4})$`));
          if (baseMatch) {
            maxSuffix = Math.max(maxSuffix, 0);
          }
        }
      });
  
      let finalCode = '';
      if (matchingCodes.length === 0) {
        finalCode = `${prefix}_${sizeCode}`;
      } else {
        const nextSuffix = (maxSuffix + 1).toString().padStart(3, '0');
        finalCode = `${prefix}_${nextSuffix}_${sizeCode}`;
      }
  
      this.form.get('componentCode')?.setValue(finalCode);
    });
  }
  
  async onSubmitForm(): Promise<void> {
    this.submitLoader = true;
    
    this.formWasSubmitted = true;
    this.formSubmitted.emit(true);
  
    const docId = this.generatedDocId || this.afs.createId();
  
    const newcomponentValues: any = {
      componentName: this.form.get('componentName')?.value,
      componentCode: this.form.get('componentCode')?.value,
      groupName: this.form.get('groupName')?.value.displayName,
      groupCode: this.form.get('groupName')?.value.code,
      category: this.form.get('category')?.value.displayName,
      categoryCode: this.form.get('category')?.value.componentCode,
      subCategory: this.form.get('subCategory')?.value.displayName,
      subCategoryCode: this.form.get('subCategory')?.value.subCategoryCode,
      componentSize: this.form.get('componentSize')?.value.displayName,
      quantity: this.form.get('quantity')?.value,
      imageUrl: [],
      createdAt: firebase.firestore.Timestamp.fromDate(new Date())
    };
  
    if (this.componentUploadedFiles.length > 0) {
      const uploadedPaths = await Promise.all(
        this.componentUploadedFiles.map(async (file, index) => {
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
          const indexs = index + 1;
          const storagePath = `components/${docId}/imageUrl_${indexs}.${ext}`;
          const ref = this.afs.firestore.app.storage().ref(storagePath);
          await ref.put(file);
          return storagePath;
        })
      );
      newcomponentValues.imageUrl = uploadedPaths;
    }
  console.log('newcomponentValues', newcomponentValues);
    await this.componentsService.addNewComponent(newcomponentValues, docId);
    const masterComponent = { ...newcomponentValues, docId };
    await this.masterService.addNewObjectToMasterMap('COMPONENT', 'components', masterComponent);
    this.dialogRef.close();
    this.submitLoader = false;
    // this.componentsService.loadComponentsFromMaster()
    this.uiService.alertMessage('Success', 'Component added successfully', 'success');
  }
  
}
