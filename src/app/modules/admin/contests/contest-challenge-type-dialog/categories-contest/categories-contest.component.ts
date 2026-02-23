import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatStepper } from '@angular/material/stepper';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { UiService } from 'app/shared/ui.service';
import { take } from 'rxjs';

@Component({
    selector: 'app-categories-contest',
    templateUrl: './categories-contest.component.html',
    styleUrls: ['./categories-contest.component.scss'],
})
export class CategoriesContestComponent implements OnInit, OnChanges, AfterViewInit {
    @ViewChild('stepper') private myStepper: MatStepper;
    @Input() contestInfo;
    @Input() isContestClassroomDependent: boolean;
    @Input() isstemclubClassroomdependent;
    @Input() isUpdate;
    @Input() contestDocInfo;

    @Output() contestCategoryInfo: EventEmitter<any> = new EventEmitter();
    

    loading: boolean = false;
    isFocused = false;
    formatType: string;
    filteredGradesList: number[][] = [];
    grades = new FormControl();

    // storageBucket:string;
    toolCtrl = new FormControl('');
    filteredGrades: any = [];
    gradeArray: number[] = Array.from({ length: 10 }).map((_, i) => i + 1);
    unassignedGrades: number[] = [...this.gradeArray];
    categoriesForm = this.fb.group<any>({
        categories: this.fb.array([]),
    });
    disableGradesControl: boolean = false;

    constructor(
        private fb: FormBuilder,
        private uiService: UiService,
        private userService: UserService,
        private afStore: AngularFireStorage,
        private cdRef: ChangeDetectorRef,
        private ngZone: NgZone
    ) {
        this.filteredGrades = this.gradeArray;
    }

    

    ngOnInit(): void {
        // Set loading to true initially
        this.loading = false;
        
        // Set basic format type immediately
        this.formatType = 'tiles';
        
        
        // Initialize basic contest info if not provided
        if (!this.contestInfo) {
            this.contestInfo = { categories: [] };
        }

        





    }
    ngAfterViewInit(): void {

        
        
        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            this.cdRef.detectChanges();
            window.dispatchEvent(new Event('resize')); // Force chip-list reflow
          });
        });

        this.ngZone.onStable.pipe(take(1)).subscribe(() => {
            this.cdRef.detectChanges();
            window.dispatchEvent(new Event('resize')); // for chip-list reflow
            this.runAfterUiRendered(); // your custom logic
          });

        setTimeout(() => {
            this.loadData();
        }, 1000);
      }

      loadData(): void{
            this.initializeComponent();
      }

      trackByGrade(index: number, item: any): number {
        return item.grade;
      }


      runAfterUiRendered(): void {
        // 1. Ensure the chip-list renders correctly (especially with Tailwind + flexbox)
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 0);
      
        // 2. Re-run change detection to catch UI bindings (if delayed async patching is used)
        this.cdRef.detectChanges();
      
        // 3. Ensure forms are valid and synced visually
        this.categories.updateValueAndValidity();
      
        // 4. Optionally, scroll to a specific element (like first chip list or error)
        const firstInvalidControl = document.querySelector('.mat-form-field-invalid');
        if (firstInvalidControl) {
          firstInvalidControl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      
      
    

    private initializeComponent(): void {
        try {
            // Handle classroom dependent contest setup
            this.setupClassroomDependentContest();
            
            // Handle form patching for updates
            this.handleFormPatching();
            
            // Initialize grades and validation
            this.finalizeInitialization();
            
        } catch (error) {
            console.error('Error during component initialization:', error);
        } finally {
            // Set loading to false after initialization
            this.loading = false;
        }
    }

    private setupClassroomDependentContest(): void {
        if (this.isContestClassroomDependent && this.isUpdate == false) {
            if (this.categories.length == 0) {
                this.addNewCategory();
            }

            this.categories.at(0).get('categoryName').patchValue('K10');    
            
            const gradeArray = this.gradeArray.map(grade => ({ grade, image: null }));
            this.categories.at(0).get('grades').patchValue(gradeArray);
            this.categories.at(0).disable();
            this.disableGradesControl = true;
        } else {
            this.categories.clear();
            this.categoriesForm.reset();
            this.filteredGrades = [];
            this.unassignedGrades = [...this.gradeArray];
            this.categoriesForm.get('categories').enable();
            this.disableGradesControl = false;
        }
    }

    private handleFormPatching(): void {
        if (this.contestInfo && this.isUpdate == true) {
            this.patchFormValue(this.contestInfo);
        }
    }

    private finalizeInitialization(): void {
        this.initializeUnassignedGrades();
        this.categories.updateValueAndValidity();

        if (this.contestInfo && this.contestInfo.categories) {
            this.contestInfo.categories.forEach(
                (category: any, index: number) => {
                    const grades = category.grades.map((g: any) => ({
                        grade: g.grade,
                        image: g.thumbImagePath
                            ? {
                                thumbImagePath: g.thumbImagePath,
                                fileName: g.thumbImagePath.split('/').pop(),
                            }
                            : null,
                    }));
                    this.categories.at(index).get('grades').setValue(grades);
                }
            );
        }

    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.isContestClassroomDependent) {
            if (this.isContestClassroomDependent && this.isUpdate==false) {
                if (this.categories.length == 0 ) {
                     this.addNewCategory();

                }

                this.categories.at(0).get('categoryName').patchValue('K10');
                const gradeArray = this.gradeArray.map(grade => ({ grade, image: null }));
                this.categories.at(0).get('grades').patchValue(gradeArray);
                this.categories.at(0).disable();
                this.disableGradesControl = true;
            } else {
                this.categories.clear();
                this.categoriesForm.reset();
                this.disableGradesControl = false;
                // this.categories.at(0).enable();
                this.filteredGrades = [];
                this.unassignedGrades = [...this.gradeArray];


                this.categoriesForm.get('categories').enable();

            }
        }
        // if (this.isContestClassroomDependent) {
        //     console.log(this.categories)
        //     if(this.categories.length==0){
        //         this.addNewCategory();

        //     }

        //     this.categories.at(0).get('categoryName').patchValue('K10');
        //     const gradeArray = this.gradeArray.map((grade) => ({ grade, image: null }));
        //     this.categories.at(0).get('grades').patchValue(gradeArray);
        //     this.categories.at(0).disable();
        //     this.disableGradesControl = true;
        // } else {
        //     this.categories.clear();
        //     this.disableGradesControl = false;
        // }
    }

    // Initialize the filtered grades list based on the `contestInfo` data
    initializeUnassignedGrades(): void {
        const assignedGrades = this.categories.controls.flatMap(category =>
            category.get('grades').value.map((gradeObj: any) => gradeObj.grade)
        );

        this.unassignedGrades = this.gradeArray.filter(
            grade => !assignedGrades.includes(grade)
        );
    }

    getAllAssignedGrades(): number[] {
        const allGrades = this.categories.controls.flatMap(category =>
            category.get('grades').value.map((gradeObj: any) => gradeObj.grade)
        );
        return allGrades;
    }

    // Get the filtered grades for a specific category index
    getFilteredGrades(): number[] {
        return this.unassignedGrades;
    }

    // Get grades for a specific category index
    getCategoryGrades(categoryIndex: number): any[] {
        const category = this.categories.at(categoryIndex);
        if (!category) {
            return [];
        }
        const gradesControl = category.get('grades');
        return gradesControl ? gradesControl.value || [] : [];
    }

    addGradeByEnter(event: KeyboardEvent, index: number): void {
        const input = event.target as HTMLInputElement; // Access the input element
        const gradeValue = parseInt(input.value, 10); // Parse the entered grade

        if (isNaN(gradeValue) || !this.unassignedGrades.includes(gradeValue))
            {return;} // Validate the input

        const cateArr = this.categories.at(index); // Get the category form group
        const grades = cateArr.get('grades').value; // Current grades array

        // Add the grade only if it's not already present
        if (!grades.some((g: any) => g.grade === gradeValue)) {
            grades.push({ grade: gradeValue, image: null });

            // Remove the added grade from the global unassigned grades list
            this.unassignedGrades = this.unassignedGrades.filter(
                grade => grade !== gradeValue
            );

            // Update the form control value with the new grades array
            cateArr.get('grades').setValue(grades);

            // Reset the `imageUploaded` flag (if required)
            grades.forEach((grade: any) => {
                if (grade.grade === gradeValue) {
                    grade.imageUploaded = false; // Ensure the flag is properly set
                }
            });
            // Clear the input field (ensure placeholder appears again)
            input.value = ''; // Reset the input field for new entries
        }
    }

    selectedGrade(event: MatAutocompleteSelectedEvent, index: number): void {
        const gradeValue = event.option.value; // Selected grade value
        const cateArr = this.categories.at(index); // Get the category form group
        const grades = cateArr.get('grades').value; // Current grades array

        // Add the grade only if it's not already present
        if (!grades.some((g: any) => g.grade === gradeValue)) {
            grades.push({ grade: gradeValue, image: null });

            // Remove the added grade from the global unassigned grades list
            this.unassignedGrades = this.unassignedGrades.filter(
                grade => grade !== gradeValue
            );

            // Update the form control value with the new grades array
            cateArr.get('grades').setValue(grades);

            // Clear the input field (ensure placeholder appears again)
            this.grades.setValue('');
        }
    }

    get categories() {
        return this.categoriesForm.get('categories') as FormArray;
    }

    getFormGroup(categ?): FormGroup {
        return this.fb.group<any>({
            categoryName: [
                categ?.categoryName != undefined ? categ.categoryName : '',
                [Validators.required],
            ],
            toolCtrl: [''],
            grades: [[]], // Will now contain objects with {grade: number, image: any}
        });
    }

    addNewCategory(): void {
        const newCategory = this.getFormGroup({ grades: [], categoryName: '' });
        this.categories.push(newCategory);

        // Include all grades for the new category
        this.filteredGradesList.push(this.gradeArray.slice());
    }

    removeCategory(index) {
        const formArr: FormArray = this.categories;
        // Get the grades from the category being removed
        const categoryToRemove = formArr.at(index);
        const gradesToReturn = categoryToRemove.get('grades').value;

        // Add the grades back to unassignedGrades if they're not in other categories
        if (gradesToReturn && gradesToReturn.length > 0) {
            gradesToReturn.forEach((gradeObj: any) => {
                // Check if this grade exists in any other category
                const isGradeInOtherCategories = this.categories.controls
                    .filter((_, categoryIndex) => categoryIndex !== index) // Exclude current category
                    .some((category) => {
                        const grades = category.get('grades').value;
                        return grades.some((g: any) => g.grade === gradeObj.grade);
                    });

                // If grade is not in other categories, add it back to unassigned
                if (!isGradeInOtherCategories && !this.unassignedGrades.includes(gradeObj.grade)) {
                    this.unassignedGrades.push(gradeObj.grade);
                }
            });

            // Sort the unassigned grades to maintain order
            this.unassignedGrades.sort((a, b) => a - b);
        }

        // Remove the category from the form array
        formArr.removeAt(index);

        // Remove the corresponding filtered grades list entry
        if (this.filteredGradesList.length > index) {
            this.filteredGradesList.splice(index, 1);
        }
    }

    // Patch form value and initialize filtered grades
    patchFormValue(contestInfo): void {
        contestInfo.categories.forEach((category, index) => {
            this.categories.push(this.getFormGroup(category));

            const cateArr = this.categories.at(index);

            const gradesArr = category.grades;
            gradesArr.forEach((gr) => {
                cateArr.get('grades').value.push(gr);
            });

            // Recalculate unassigned grades
            this.initializeUnassignedGrades();
        });
    }

    onClickNext(): void {
        const updatedCategories = (
            this.categoriesForm.value.categories as any[]
        ).map((category: any) => ({
            ...category,
            grades: Array.isArray(category.grades)
                ? category.grades.map((grade: any) => ({
                    ...grade,
                    thumbImagePath:
                        grade.image?.thumbImagePath || '',
                }))
                : [],
        }));

        this.contestCategoryInfo.emit({ categories: updatedCategories });
    }

    fileTypeAndSizeCheck(event) {
        const allowedExtensions = /(\.png|\.jpeg|\.jpg)$/i;
        let isValid = false;
        if (!allowedExtensions.exec(event.name)) {
            this.uiService.alertMessage(
                'Invalid File Type',
                'Only allowed PNG or JPEG file',
                'warn'
            );
            isValid = false;
        } else if (event.size > 10485760) {
            /* Max Image File size 10MB */
            this.uiService.alertMessage(
                'File Size Exceeds',
                'Maximum file size should be 10MB',
                'warn'
            );
            isValid = false;
        } else {
            isValid = true;
        }
        return isValid;
    }

    updateFilteredGrades(index: number): void {
        this.filteredGradesList[index] = this.getFilteredGrades();
    }

    removeGrade(gradeObj: any, index: number): void {
        const cateArr = this.categories.at(index);
        const grades = cateArr.get('grades').value;

        const gradeIndex = grades.findIndex(
            (g: any) => g.grade === gradeObj.grade
        );
        if (gradeIndex >= 0) {
            grades.splice(gradeIndex, 1); // Remove the grade from this category

            // Reset image data when a grade is removed
            gradeObj.image = null;
            gradeObj.imageUploaded = false; // Reset uploaded flag

            // Add back to unassigned grades globally if it's not in any category
            const allAssignedGrades = this.getAllAssignedGrades();
            if (!allAssignedGrades.includes(gradeObj.grade)) {
                this.unassignedGrades.push(gradeObj.grade);
                this.unassignedGrades.sort((a, b) => a - b); // Keep the grades sorted
            }

            // Update the form control
            cateArr.get('grades').setValue(grades);
        }
    }

    selectFileForGrade(
        event: Event,
        categoryIndex: number,
        gradeObj: any
    ): void {
        const fileInput = event.target as HTMLInputElement;

        if (fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            if (!this.fileTypeAndSizeCheck(file)) {return;}

            const reader = new FileReader();
            gradeObj.image = { loader: true, fileName: file.name }; // Set loader and file name

            reader.onload = () => {
                const base64Data = reader.result as string;
                gradeObj.image.preview = base64Data; // Add Base64 preview for the UI
            };
            reader.readAsDataURL(file);

            const bucketPath = `${'contest-categories'}/${
                this.contestDocInfo.docId
            }/${'category-thumb-images'}/grade_${
                gradeObj.grade
            }_thumb.${file.name.split('.').pop()}`;
            const ref = this.afStore.ref(bucketPath);
            const task = ref
                .put(file, { customMetadata: { original_name: file.name } })
                .snapshotChanges();

            task.subscribe({
                next: (uploadedSnapshot) => {
                    if (uploadedSnapshot.state === 'success') {
                        this.uiService.alertMessage(
                            'Successfully',
                            `Contest Grade logo has been uploaded for Grade ${gradeObj.grade}`,
                            'success'
                        );
                        gradeObj.image.loader = false; // Remove loader
                        gradeObj.image.filePath = bucketPath; // Store uploaded path
                        gradeObj.imageUploaded = true; // Mark as uploaded


                        ref.getDownloadURL().subscribe((downloadUrl) => {
                            // Extract the desired part of the URL
                            const urlBase =
                                'https://firebasestorage.googleapis.com/v0/b/backup-collection.appspot.com/o/';
                            const extractedPath = downloadUrl
                                .replace(urlBase, '') // Remove the base URL
                                .split('?')[0] // Remove query parameters
                                .replace(/%2F/g, '/'); // Replace encoded `%2F` with `/`

                            gradeObj.image.url = downloadUrl; // Save the full public URL
                            gradeObj.image.thumbImagePath = bucketPath; // Save the formatted path
                        });
                    }
                },
                error: (err) => {
                    gradeObj.image = {
                        loader: false,
                        fileName: null,
                        preview: null,
                    };
                },
            });
        }
    }

    viewFileInNewTab(fileUrl: string): void {
        if (fileUrl) {
            const newTab = window.open();
            if (newTab) {
                newTab.document.body.innerHTML = `<img src="${fileUrl}" style="max-width: 100%; height: 300px;" alt="Uploaded Image">`;
            }
        }
    }

    // Method to fetch the image URL from Firestore data
    getFirestoreImageUrl(gradeObj: any): string {
        if (this.contestInfo?.categories) {
            for (const category of this.contestInfo.categories) {
                const gradeData = category.grades.find(
                    g => g.grade === gradeObj.grade
                );
                if (gradeData && gradeData.thumbImagePath) {
                    return `https://firebasestorage.googleapis.com/v0/b/backup-collection.appspot.com/o/${encodeURIComponent(
                        gradeData.thumbImagePath
                    )}?alt=media`;
                }
            }
        }
        return ''; // If no image is found, return an empty string
    }

    getFilePathForView(gradeObj: any): string {
        if (!gradeObj) {
            return '';
        }

        // Return URL of the uploaded image
        if (gradeObj.image?.url) {
            return gradeObj.image.url;
        }

        // Return Firestore image URL
        return this.getFirestoreImageUrl(gradeObj);
    }

    shouldShowViewButton(gradeObj: any): boolean {
        // Button is shown only if there's an uploaded image or Firestore reference
        return !!(gradeObj.image?.url || gradeObj.image?.thumbImagePath);
    }

    get isNextEnabled(): boolean {
        // Case 1: When categories exist (either from Firestore or new data)
        if (
            this.contestInfo?.categories &&
            this.contestInfo.categories.length > 0
        ) {
            // If there are categories from Firestore, check each category and its grades
            return this.categories.controls.every((category) => {
                const grades = category.get('grades').value;

                // Ensure every grade either has a thumbImagePath or an uploaded image
                // and that at least one grade is selected
                return (
                    grades.length > 0 &&
                    //grades.every((grade) => grade.image || grade.thumbImagePath)

                    grades.every(grade => grade.grade !== null || grade.grade !== undefined)
                );
            });
        }

        // Case 2: When the contest is classroom dependent
        if (this.isContestClassroomDependent) {
            return true;
        }

        // Case 3: When there is no Firestore data (fresh data entry)
        return this.categories.controls.every((category) => {
            const categoryName = category.get('categoryName').value;
            const grades = category.get('grades').value;

            // Ensure that the category name is filled, there are grades,
            // and each grade has either a thumbImagePath or an uploaded image
            return (
                categoryName &&
                grades.length > 0 &&
                grades.every(grade => grade.image || grade.thumbImagePath)
            );
        });
    }

    getGrades(index: number): FormGroup[] {
        const category = this.categories.at(index);
        const gradesArray = category.get('grades') as FormArray;
        return gradesArray?.controls as FormGroup[];
    }

    // refresh(): void {
    //     console.log('Refreshing CategoriesContestComponent...');
      
    //     // Re-run any initialization logic you want
    //     this.filteredGrades = [];
    //     this.unassignedGrades = [...this.gradeArray];
    //     this.categories.clear();
    //     this.categoriesForm.reset();
    //     this.disableGradesControl = false;
      
    //     // If classroom dependent, reinitialize category
    //     if (this.isContestClassroomDependent && !this.isUpdate) {
    //       this.addNewCategory();
    //       this.categories.at(0).get('categoryName').patchValue('K10');
    //       const gradeArray = this.gradeArray.map((grade) => ({ grade, image: null }));
    //       this.categories.at(0).get('grades').patchValue(gradeArray);
    //       this.categories.at(0).disable();
    //       this.disableGradesControl = true;
    //     }
      
    //     // Reassign data if needed
    //     if (this.contestInfo && this.isUpdate) {
    //       this.patchFormValue(this.contestInfo);
    //     }
      
    //     this.initializeUnassignedGrades();
    //   }
      
    
    
}


