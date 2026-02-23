import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { AddService } from '../add/add.service';
import { EditImageFilesComponent } from '../edit-image-files/edit-image-files.component';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { lastValueFrom, map, Observable, startWith } from 'rxjs';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { UiService } from 'app/shared/ui.service';
import { ComponentsService } from '../components.service';
import { ComponentModel } from '../components.interface';
import { MatAutocomplete } from '@angular/material/autocomplete';
import { AngularFirestore } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-component-form',
  templateUrl: './component-form.component.html',
  styleUrls: ['./component-form.component.scss']
})
export class ComponentFormComponent implements OnInit, OnDestroy {
  @Input() editForm!: FormGroup;
  @Input() isReadOnly: boolean = false;
  @Input() addMode: boolean = false;
  @Output() formStatus = new EventEmitter<boolean>();
  @Input() componentDetails: any;
  @Input() componentForm: FormGroup;
  @Input() component: ComponentModel;
  @Input() groupOption: any[];
  @Input() categoryOptions: any[];
  @Input() subCategoryOptions: any[]; 
  @Input() formSubmitted: boolean = false;
  @Output() groupname = new EventEmitter<any>();
  @ViewChild('componentSizeInput') componentSizeInput!: ElementRef<HTMLInputElement>;
  @ViewChild('auto') matAutocomplete!: MatAutocomplete;
  @Output() docIdGenerated = new EventEmitter<string>();
  @Output() uploadedFilesChanged = new EventEmitter<File[]>();
  @Output() imagePreviewsChanged = new EventEmitter<string[]>();



  storageBucket = 'components';
  fileList: any[] = [];
  category: any[] = [];
  subCategories: any[] = [];
  attribute: any[] = [];
  groupOptions: any[] = [];
  componentSizeOptions: any[] = [];
filteredComponentSizeOptions$: Observable<any[]>;
isAddNewComponentSize: boolean = false;
newComponentSizeControl = new FormControl('');
newComponentSize: string = '';
generatedDocId: string = '';
uploadSessionInitialized: boolean = false;

uploadedFiles: File[] = [];
imagePreviews: string[] = [];

isFormModified: boolean = false;
isSaving: boolean = false;
originalFormValue: any; 




  constructor(private addService: AddService,
    private dialog: MatDialog,
    private uiService: UiService,
    private masterService: MasterService,
    private componentsService: ComponentsService,
    private afs: AngularFirestore
  ) { }

  ngOnInit(): void {

   
    // Generate docId for storage operations if not already set
    if (!this.generatedDocId) {
      this.generatedDocId = this.componentDetails?.docId || this.afs.createId();
      this.docIdGenerated.emit(this.generatedDocId);
    }

    // Only fetch dropdown data if not provided via Input
    if (!this.groupOption || this.groupOption.length === 0) {
      this.addService.getComponentDropdownData().subscribe((data) => {
        if (!this.groupOption) this.groupOption = Object.values(data.group);
        this.attribute = Object.values(data.attribute);
      });
    } else {
      // If groupOption is provided, still need to fetch attribute data
      this.addService.getComponentDropdownData().subscribe((data) => {
        this.attribute = Object.values(data.attribute);
      });
    }

    // Handle category data if not provided via Input
    if (!this.categoryOptions || this.categoryOptions.length === 0) {
      this.addService.getComponentCategory().subscribe((data) => {
        const result = Object.values(data as Record<string, any>);
        const groups = result.map(
            (item: any) => item?.composite_configuration
        );
        this.groupOptions = groups;
        const allComponentObjects: any[] = [];
        this.groupOptions.forEach((entry) => {
            Object.keys(entry).forEach((key) => {
                const item = entry[key];
                if (item) {
                    allComponentObjects.push(item);
                }
            });
        });
        if (!this.categoryOptions) this.category = allComponentObjects;
        
        if(this.componentDetails){
             const result = this.category.find(
        (item) => item.componentCode == this.componentDetails.categoryCode
    );
    if (!this.subCategoryOptions && result) {
      this.subCategories = result?.subCategories || [];
    }
        }
    });
    } else {
      // Use provided category data
      this.category = this.categoryOptions;
      // Set subcategories if available
      if (this.subCategoryOptions) {
        this.subCategories = this.subCategoryOptions;
      }
    }
  //  Emit after form is stabilized
  setTimeout(() => {
    this.emitFormValidity();
  }, 100);

  // Keep watching for future changes
  this.editForm.statusChanges.subscribe(() => {
    this.emitFormValidity();
  });


  this.componentsService.getAllComponentSize().subscribe((data: any[]) => {
    this.componentSizeOptions = data;
  
    this.filteredComponentSizeOptions$ = this.editForm.get('componentSize')!.valueChanges.pipe(
      startWith(''),
      map(value => typeof value === 'string' ? value : value?.displayName),
      map(name => name ? this._filterComponentSizes(name) : this.componentSizeOptions.slice())
    );
  
    // If editing existing component, pre-select its value
    if (this.componentDetails?.componentSize) {
      const matchedOption = this.componentSizeOptions.find(
        opt => opt.displayName === this.componentDetails.componentSize
      );
      if (matchedOption) {
        this.editForm.get('componentSize')?.patchValue(matchedOption);
      }
    }
  });


  this.originalFormValue = this.editForm.getRawValue();

  this.editForm.valueChanges.subscribe(() => {
    const currentValue = this.editForm.getRawValue();
    this.isFormModified = JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
  });
  
  
  // Also delay this until form is initialized
  this.uploadedFilesChanged.subscribe(() => {
    this.updateFormModifiedStatus();
  });
  this.imagePreviewsChanged.subscribe(() => {
    this.updateFormModifiedStatus();
  });


  setTimeout(() => {
    this.disableButton();
  }, 500);

}

disableButton(){
  this.isFormModified = false;
  this.isSaving = false;
  this.originalFormValue = this.editForm.getRawValue();
}

  updateFormModifiedStatus() {
    const currentValue = this.editForm.getRawValue();
    this.isFormModified = JSON.stringify(currentValue) !== JSON.stringify(this.originalFormValue);
  }
  


  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
  
    if (files.length > 0) {
      Array.from(files).forEach((file) => {
        this.uploadedFiles.push(file);
        const objectUrl = URL.createObjectURL(file);
        this.imagePreviews.push(objectUrl);
      });
      
      // Update fake paths after accumulating
      const fakePaths = this.uploadedFiles.map((_, i) => `imageUrl_${i + 1}`);
      this.editForm.get('imageUrl')?.setValue(fakePaths);
      
      // Emit accumulated values
      this.uploadedFilesChanged.emit(this.uploadedFiles);
      this.imagePreviewsChanged.emit(this.imagePreviews);
    }
  }

  async showFiles(key: string) {
    // Use appropriate componentId based on mode
    const componentId = this.componentDetails?.docId || this.generatedDocId;
    
    if (this.addMode && this.uploadedFiles.length > 0) {
        const dialogRef = this.dialog.open(EditImageFilesComponent, {
            data: {
              componentId: componentId,
              isEditMode: false,
              localFiles: [...this.uploadedFiles], // Create copy to avoid reference issues
              localPreviews: [...this.imagePreviews],
              componentForm: this.editForm,
              uploadedFilesChanged: this.uploadedFilesChanged,
              imagePreviewsChanged: this.imagePreviewsChanged,
            },
            height: '80%',
            width: '60vw',
        });

        // Handle dialog close for add mode
        dialogRef.afterClosed().subscribe((result) => {
          if (result?.updatedFiles !== undefined && result?.updatedPreviews !== undefined) {
            this.uploadedFiles = result.updatedFiles;
            this.imagePreviews = result.updatedPreviews;
        
            // Update form control with correct keys for review
            const fakePaths = this.uploadedFiles.map((_, i) => `imageUrl_${i + 1}`);
            this.editForm.get('imageUrl')?.setValue(fakePaths);
            
            // Emit changes to parent components
            this.uploadedFilesChanged.emit(this.uploadedFiles);
            this.imagePreviewsChanged.emit(this.imagePreviews);
          }
        });
    } else {
      console.log('📦 Showing uploaded files from storage for docId:', componentId);
        const dialogRef = this.dialog.open(EditImageFilesComponent, {
            data: {
                componentId: componentId,
                componentForm: this.editForm,
                isEditMode: true
            },
            height: '80%',
            width: '60vw',
        });
  
        // Handle dialog close for edit mode
        dialogRef.afterClosed().subscribe((result) => {
          if (result?.updatedFiles) {
            this.uploadedFiles = result.updatedFiles;
            this.imagePreviews = result.updatedPreviews;
        
            // Update form control to reflect removed images
            const fakePaths = this.uploadedFiles.map((_, i) => `fake_image_${i + 1}`);
            this.editForm.get('imageUrl')?.setValue(fakePaths);
          }
        });
    }
  }
  
  
  ngOnDestroy(): void {
    this.uploadedFiles = [];
    this.imagePreviews.forEach(url => URL.revokeObjectURL(url));
    this.imagePreviews = [];
  }

  // Check if there are images to show view button
  hasImages(): boolean {
    // For add mode, check uploaded files
    if (this.addMode) {
      return this.uploadedFiles.length > 0;
    }
    
    // For edit mode, check if there are existing image URLs
    const formImageUrls = this.editForm.get('imageUrl')?.value;
    const componentImageUrls = this.componentDetails?.imageUrl;
    
    return (formImageUrls && formImageUrls.length > 0) || 
           (componentImageUrls && componentImageUrls.length > 0);
  }
  
  private _filterComponentSizes(name: string): any[] {
    const filterValue = name.toLowerCase();
    return this.componentSizeOptions.filter(option =>
      option.displayName.toLowerCase().includes(filterValue)
    );
  }  

  displayComponentSize = (option: any) => {
    return option?.displayName || '';
  };

  saveNewComponentSize() {
    const displayName = this.newComponentSizeControl.value?.trim();
    if (!displayName) return;

    this.componentsService.addNewComponentSize(displayName, this.componentSizeOptions)
      .then((newEntry) => {
        this.componentSizeOptions.push(newEntry);
        this.editForm.get('componentSize')?.setValue(newEntry);
        this.newComponentSizeControl.reset();
        this.isAddNewComponentSize = false;
      })
      .catch((err) => {
        console.error(err);
      });
  }


  cancelAddNewComponentSize() {
    this.newComponentSize = '';
    this.isAddNewComponentSize = false;
    this.editForm.get('componentSize')?.reset();
  }

  triggerAddNewComponentSize() {
    setTimeout(() => {
      this.isAddNewComponentSize = true;
    });
  }


  onAddNewComponentSizeClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isAddNewComponentSize = true;

    // Wait for the input to appear, then focus and open panel
    setTimeout(() => {
      this.componentSizeInput?.nativeElement?.focus();
      // Optionally, open the panel again
      this.matAutocomplete?.panel?.nativeElement?.classList.add('mat-autocomplete-visible');
    });
  }

  

  emitFormValidity() {
    this.formStatus.emit(this.editForm.valid);
  }

  // Compare functions for mat-select with objects
  compareGroupOptions(option1: any, option2: any): boolean {
    return option1 && option2 ? option1.displayName === option2.displayName : option1 === option2;
  }

  compareCategoryOptions(option1: any, option2: any): boolean {
    return option1 && option2 ? option1.displayName === option2.displayName : option1 === option2;
  }

  compareSubCategoryOptions(option1: any, option2: any): boolean {
    return option1 && option2 ? option1.displayName === option2.displayName : option1 === option2;
  }



  // when category is selected assign the sub category values
  onCategoryChange(value: any) {
    this.editForm.get('attribute')?.setValue('');
    const found = this.groupOptions.find((obj) => {
        const key = Object.keys(obj)[0];
        return obj[key].displayName === value.displayName;
    });

    if (found) {
        const key = Object.keys(found)[0];
        this.subCategories = found[key].subCategories || [];
    } else {
        this.subCategories = [];
    }
}



async saveChanges(): Promise<void> {

  if (this.isSaving || !this.isFormModified) return;

  this.isSaving = true;
  const docId = this.componentDetails?.docId;
  const masterDocId = this.componentDetails?.masterDocId;

  if (!docId || !masterDocId) {
    this.uiService.alertMessage('Error', 'Missing docId or masterDocId', 'error');
    return;
  }

  const groupNameValue = this.editForm.get('groupName')?.value;
  const categoryValue = this.editForm.get('category')?.value;
  const subCategoryValue = this.editForm.get('subCategory')?.value;
  
  const updatedComponent: any = {
    ...this.component,
    docId,
    updatedAt: new Date(),

    componentName: this.editForm.get('componentName')?.value || '',
    componentCode: this.editForm.get('componentCode')?.value || '',
    groupName: groupNameValue ? groupNameValue.displayName : '', 
    category: categoryValue ? categoryValue.displayName : '',      
    subCategory: subCategoryValue ? subCategoryValue.displayName : '', 
    attribute: this.editForm.get('attribute')?.value || '',
    componentSize: this.editForm.get('componentSize')?.value?.displayName || '',
    quantity: this.editForm.get('quantity')?.value || '',
    imageUrl: this.editForm.get('imageUrl')?.value || [],
  };

  if (this.uploadedFiles.length > 0) {
    const existingUrls = Array.isArray(this.componentDetails?.imageUrl) ? this.componentDetails.imageUrl : [];

     // Extract max image index from existing image URLs
    const maxIndex = existingUrls.reduce((max, url) => {
      const match = url.match(/imageUrl_(\d+)\./);
      if (match && +match[1] > max) {
        return +match[1];
      }
      return max;
    }, 0);
  
    const uploadedPaths = await Promise.all(
      this.uploadedFiles.map(async (file, index) => {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const indexs = maxIndex + index + 1;
        const storagePath = `components/${docId}/imageUrl_${indexs}.${ext}`;
        const ref = this.afs.firestore.app.storage().ref(storagePath);
        await ref.put(file);
        return storagePath;
      })
    );
  
    // Combine existing + new image paths
    updatedComponent.imageUrl = [...existingUrls, ...uploadedPaths];
  }
  

  console.log('updatedComponent', updatedComponent);

  try {
    // ✅ 1. Update the `components` collection
    await this.componentsService.updateComponent(updatedComponent); 

    // ✅ 2. Update the nested doc in master
    await this.masterService.updateMasterDoc(`components`, masterDocId, {
      [docId]: updatedComponent,
    });

    this.uiService.alertMessage('Success', 'Component updated successfully', 'success');
  } catch (error) {
    this.uiService.alertMessage('Error', 'Update failed', 'error');
  }finally {
    this.originalFormValue = this.editForm.getRawValue();
    this.isFormModified = false;
    this.isSaving = false;

  }
}

}
