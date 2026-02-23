/* eslint-disable @typescript-eslint/member-ordering */
import { AfterViewInit, Component, HostListener, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ComponentModel } from '../components.interface';
import { MatDialog } from '@angular/material/dialog';
import { ImagesDialogComponent } from '../images-dialog/images-dialog.component';
import { DialogComponent } from '../dialog/dialog.component';
import { ComponentsService } from '../components.service';
import { BehaviorSubject, first, lastValueFrom } from 'rxjs';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { SortingService } from 'app/shared/sorting.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UiService } from 'app/shared/ui.service';
import { AngularFireAuth } from '@angular/fire/compat/auth';

import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { AddService } from '../add/add.service';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent implements OnInit, AfterViewInit, OnChanges {

  @ViewChild(MatSort) sort: MatSort;

  isLoading: boolean = false;
  displayedColumns = ['image', 'componentCode', 'componentName', 'category', 'componentType', 'attribute', 'sizeUnit', 'quantity', 'createdAt', 'viewMore', 'delete'];
  columnsToDisplayWithExpand = [...this.displayedColumns, 'expandedDetail'];
  dataSource = new MatTableDataSource<ComponentModel>([]);
  expandedElement: ComponentModel | null;
  infinityScrollLocked: boolean = false;
  isScrollLoading: boolean = true;
  loadingMessage: string;
  totalCount: number;
  components: any[] = [];
  savedSortEvent: any;
  isFirstTime: boolean = true;
  selectedComponent: any = {};
  selectedComponentDetails: any;
  componentsSub = new BehaviorSubject(null);
  allComponents: any[] = [];
  loadedCount = 30;
  displayedCount = 30;
  teacherFullName: string = '';
  @Input()
  set filterValue(val: any) {
    this._filterValue = val;
    this.applySearchFilter();
  }
  filteredComponents: any[] = [];
  private _filterValue: any = '';
  show: boolean = false;
  constructor(
    private dialog: MatDialog,
    private componentsService: ComponentsService,
    private masterService: MasterService,
    private sortingService: SortingService,
    private fuseConfirmationService: FuseConfirmationService,
    private uiService: UiService,
    private afAuth: AngularFireAuth,
    private userService: UserService,
    private teacherService: TeacherService,
    private addService: AddService
  ) {
    this.dataSource.filterPredicate = (data: ComponentModel, filter: string): boolean => {
      const dataStr = Object.keys(data)
        .reduce((currentTerm: string, key: string) => {
          const value = data[key as keyof ComponentModel];
          return currentTerm + (value !== null && value !== undefined ? value.toString() : '');
        }, '').toLowerCase();

      return dataStr.indexOf(filter) !== -1;
    };
  }

 async ngOnInit() {
    // Subscribe to the components observable from Firestore
    this.isLoading = true;
    this.componentsService.components$.subscribe(
      (components) => {
        this.dataSource.data = components;
        this.isLoading = false;
      }
    );


    this.getAllComponents();

    const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    const teacher = await lastValueFrom(this.teacherService.getWithId(currentUser?.id || currentUser?.docId));
    this.teacherFullName = teacher.teacherMeta['firstName'] + ' ' + teacher.teacherMeta['lastName'];

  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.applySearchFilter();
  }


  applyFilter(filterValue: string): void {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  isExpanded(element: ComponentModel): boolean {
    return this.expandedElement === element;
  }

  toggle(element: ComponentModel): void {
    this.expandedElement = this.expandedElement === element ? null : element;
  }

  openImageDialog(): void {
    const dialogRef = this.dialog.open(ImagesDialogComponent);
    // Ensure the close button is visible when opened from list component
    if (dialogRef.componentInstance) {
      dialogRef.componentInstance.showCloseButton = true;
    }
  }

  deleteDialog(element: ComponentModel): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        delete: true,
        restore: false,
        emptyTrash: false,
        deletePermenently: false,
      },
      width: '512px',
      height: '185px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        this.componentsService.deleteComponent(element);
      }
    });
  }


  sortData(sort: Sort) {
    // const labels = ['componentCode', 'componentName', 'componentType', 'attribute', 'sizeUnit', 'quantity', 'type', 'createdAt'];
    const labels=['componentCode, componentName', 'groupName', 'category', 'subCategory', 'attribute', 'componentSize', 'quantity', 'createdAt'];
    const defaultLabel = 'createdAt';
    // this.allLearningUnits = this.sortingService.sortFunction(sort, labels, this.allLearningUnits, defaultLabel);

    this.savedSortEvent = sort;
    this.filteredComponents = this.sortingService.sortFunction(sort, labels, this.filteredComponents, defaultLabel);
    this.show = true;
  }


  trackByFn(index: number, item: any): any {
    return item.id || index;
  }


  async toggleDetails(selectedComponent: any) {
    this.addService.toggleCodeOn();
    this.selectedComponentDetails = selectedComponent;
    const id = selectedComponent.docId;
    if (this.selectedComponent?.docId === id) {
      this.selectedComponent = '';
    }
    else {
      this.selectedComponent = selectedComponent;
    }
  }


  async deleteComponent(component: any) {
    const componentId = component?.docId;
    const name = component?.componentName;
    const config = {
      title: 'Delete Component',
      message: `<p class="">Are you sure you want to delete "${name.slice(0, 13)}..."?`,
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        try {
          // this.componentsService.deleteComponent(componentId);
          const { masterDocId } = component;
          component['trashedBy'] = this.teacherFullName;
          this.componentsService.deleteComponentById(component.docId, component);
          this.masterService.deleteObjectFromMasterMap(masterDocId, 'components', component.docId);
          this.componentsService.deleteComponent(component.docId);

          this.uiService.alertMessage('Deleted', `Component "${name}" deleted successfully`, 'error');
        } catch (error) {
          this.uiService.alertMessage('Error', `Error deleting component "${name}"`, 'error');
        };
      }
    });
  }

  onScroll(event: any) {
    if (!this.infinityScrollLocked && this.displayedCount < this.components.length) {
      this.isScrollLoading = true;
      // Add 10 more components to the displayed list
      this.displayedCount += 10;
      // Slice from the filtered list
      this.filteredComponents = this.components.slice(0, this.displayedCount);
      // Apply sorting to the newly extended list
      this.sortData(this.savedSortEvent || { active: 'createdAt', direction: 'desc' } as Sort);
      // Update loading message
      this.loadingMessage = `Loaded ${this.filteredComponents.length} of ${this.totalCount} entries`;
      this.isScrollLoading = false;
    }
  }


  applySearchFilter(): void {
    const searchTerm = this._filterValue?.toLowerCase()?.trim() || '';

    if (searchTerm) {
      this.infinityScrollLocked = true;
      this.components = this.allComponents.filter((c) =>
        // Search across all relevant columns
      (c.componentName?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.componentCode?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.groupName?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.category?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.subCategory?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.componentType?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.attribute?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.componentSize?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.sizeUnit?.toString()?.toLowerCase()?.includes(searchTerm)) ||
      (c.quantity?.toString()?.toLowerCase()?.includes(searchTerm))
      
      );
    } else {
      this.infinityScrollLocked = false;
      this.components = [...this.allComponents];
    }

    this.displayedCount = 30;
    this.filteredComponents = this.components.slice(0, this.displayedCount);
    this.sortData(this.savedSortEvent || { active: 'createdAt', direction: 'desc' } as Sort);
    this.loadingMessage = `Loaded ${this.filteredComponents.length} of ${this.components.length} entries`;
  }

  async getAllComponents(): Promise<void> {
    const allComponents = await lastValueFrom(
      this.masterService.getAllMasterDocsMapAsArray('COMPONENT', 'components').pipe(first())
    );

    if (allComponents?.length) {
      this.totalCount = allComponents.length;
      this.allComponents = allComponents;
      this.components = allComponents;

      // Sort the full list first
      this.sortData(this.sortingService.defaultOrSavedSort(this.savedSortEvent, 'createdAt', 'desc') as Sort);

      // Show only first 30 components
      this.displayedCount = 30;
      this.filteredComponents = this.components.slice(0, this.displayedCount);

      this.componentsSub.next(this.components);
      this.loadingMessage = `Loaded ${this.filteredComponents.length} of ${this.totalCount} entries`;
      this.isScrollLoading = false;
    } else {
      this.uiService.alertMessage('Error', 'No components found', 'error');
    }
  }


  copyToClipboard(text: string | undefined): void {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.uiService.alertMessage('Copied', 'Copied to clipboard', 'success');
      }).catch((error) => {
        this.uiService.alertMessage('Error', 'Failed to copy', 'error');
      });
    }
  }

  copyToClipboardDate(d) {
    const dateInMilliseconds = d.seconds * 1000 + Math.floor(d.nanoseconds / 1e6);
    const formattedDate = new Date(dateInMilliseconds).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    navigator.clipboard.writeText(formattedDate).then(() => {
      this.uiService.alertMessage('Copied', 'Copied to clipboard', 'success');
    }).catch((error) => {
      this.uiService.alertMessage('Error', 'Failed to copy', 'error');
    });
  }

}
