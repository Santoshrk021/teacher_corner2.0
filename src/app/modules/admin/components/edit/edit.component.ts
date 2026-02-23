import {
    Component,
    Input,
    OnInit,
} from '@angular/core';
import {
    FormControl,
    FormGroup,
    Validators,
} from '@angular/forms';
import { AddService } from '../add/add.service';
@Component({
    selector: 'app-edit',
    templateUrl: './edit.component.html',
    styleUrls: ['./edit.component.scss'],
})
export class EditComponent implements OnInit {
    editForm!: FormGroup;
    @Input() componentDetails: any;
    @Input() groupname : any;
  groupOption: any[] = [];
  categoryOptions: any[] = [];
  subCategoryOptions: any[] = [];
  matchingGroup: any;
  matchingCategory: any;
  matchingSubCategory: any;

    constructor(private addService: AddService) {}
  
    ngOnInit(): void {
      this.editForm = new FormGroup({
        componentName:new FormControl('', Validators.required),
        componentCode:new FormControl({value: '', disabled: true}, Validators.required),
        groupName:new FormControl('', Validators.required),
        category:new FormControl('', Validators.required),
        subCategory:new FormControl('', Validators.required),
        attribute:new FormControl('', Validators.required),
        componentSize: new FormControl('', Validators.required),
        quantity: new FormControl('', Validators.required),
        imageUrl: new FormControl([], Validators.required),
      });

      
      this.setValues();
      
    }


    setValues() {
      const groupNameFromTable = this.componentDetails.groupName;
      const categoryFromTable = this.componentDetails.category;
      const subCategoryFromTable = this.componentDetails.subCategory;
      
    
      // First, get group data
      this.addService.getComponentDropdownData().subscribe((data) => {
        this.groupOption = Object.values(data.group);
    
        // Find the matching group object
        this.matchingGroup = this.groupOption.find(
          (g: any) => g.displayName === groupNameFromTable
        );
    
      });

      // Then get category data
      this.addService.getComponentCategory().subscribe((data) => {
        const result = Object.values(data as Record<string, any>);
        const groups = result.map(
            (item: any) => item?.composite_configuration
        );
        const allComponentObjects: any[] = [];
        groups.forEach((entry) => {
            Object.keys(entry).forEach((key) => {
                const item = entry[key];
                if (item) {
                    allComponentObjects.push(item);
                }
            });
        });
        this.categoryOptions = allComponentObjects;

        // Find matching category
        this.matchingCategory = this.categoryOptions.find(
          (c: any) => c.displayName === categoryFromTable
        );

        // Find subcategories based on matched category
        if (this.matchingCategory && this.matchingCategory.subCategories) {
          this.subCategoryOptions = this.matchingCategory.subCategories;

          // Find matching subcategory
          this.matchingSubCategory = this.subCategoryOptions.find(
            (sc: any) => sc.displayName === subCategoryFromTable
          );
          }

        //  First patch all other values
        this.editForm.patchValue({
          componentName: this.componentDetails.componentName || '',
          componentCode: this.componentDetails.componentCode || '',
          groupName: this.matchingGroup || '',
          category: this.matchingCategory || '',
          subCategory: this.matchingSubCategory || '',
          attribute: this.componentDetails.attribute || '',
          componentSize: this.componentDetails.componentSize || '',
          quantity: this.componentDetails.quantity || '',
          imageUrl: this.componentDetails.imageUrl || [],
        });

      });
    }
    
    
    
}
