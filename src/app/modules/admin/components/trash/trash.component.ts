import { AfterViewInit, Component, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { ComponentModel } from '../components.interface';
import firebase from 'firebase/compat/app';
import { MatDialog } from '@angular/material/dialog';
import { ImagesDialogComponent } from '../images-dialog/images-dialog.component';
import { DialogComponent } from '../dialog/dialog.component';
import { ComponentsService } from '../components.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { UiService } from 'app/shared/ui.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';

@Component({
  selector: 'app-trash',
  templateUrl: './trash.component.html',
  styleUrls: ['./trash.component.scss'],
})
export class TrashComponent implements OnInit, AfterViewInit {
  @Output() drawerClosed = new EventEmitter<boolean>();
  @ViewChild(MatSort) sort: MatSort;
  dataSource = new MatTableDataSource<ComponentModel>([]);
  displayedColumns: string[] = ['image', 'componentCode', 'componentName', 'category', 'componentType', 'attribute', 'sizeUnit', 'quantity', 'createdAt', 'viewMore', 'restore', 'delete'];
  columnsToDisplayWithExpand: string[] = [...this.displayedColumns, 'expandedDetail'];
  expandedElement: ComponentModel | null;
  isLoading: boolean = false;
  trashItems = [];
  selectedComponent: any;

  constructor(
    private dialog: MatDialog,
    private componentsService: ComponentsService,
    private drawerService: FuseDrawerService,
    private fuseConfirmationService: FuseConfirmationService,
    private uiService: UiService,
    private masterService: MasterService
  ) { }

  ngOnInit(): void {
    this.isLoading = true;
    this.componentsService.trash$.subscribe(
      (trashItems) => {
        this.dataSource.data = trashItems;
        this.isLoading = false;
      },
      (error) => {
        this.isLoading = false;
      }
    );


    this.componentsService.getAllTrashComponents().subscribe(
      (trashItems) => {
        this.trashItems = trashItems;

      },
      (error) => {
        console.error(error);
      }
    );
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
  }

  isExpanded(element: ComponentModel): boolean {
    return this.expandedElement === element;
  }

  toggle(element: ComponentModel): void {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  restoreDialog(element: ComponentModel): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        delete: false,
        restore: true,
        emptyTrash: false,
        deletePermenently: false,
      },
      width: '512px',
      height: '185px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        this.isLoading = true;
        try {
          const success = await this.componentsService.restoreFromTrash(element);
        } catch (error) {
          console.log(error);
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  deleteDialog(element: ComponentModel): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        delete: false,
        restore: false,
        emptyTrash: false,
        deletePermenently: true,
      },
      width: '512px',
      height: '185px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        this.isLoading = true;

        try {
          const success = await this.componentsService.permanentlyDeleteFromTrash(element);
        } catch (error) {
          console.log(error);
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  emptyTrashToggle(): void {
    const dialogRef = this.dialog.open(DialogComponent, {
      data: {
        delete: false,
        restore: false,
        emptyTrash: true,
        deletePermenently: false,
      },
      width: '512px',
      height: '185px',
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        this.isLoading = true;

        try {
          const success = await this.componentsService.emptyTrash();
        } catch (error) {
          console.log(error);
        } finally {
          this.isLoading = false;
        }
      }
    });
  }

  closeTrash() {
    // this.drawerClosed.emit(false);
    this.drawerService.drawerOpenTrashComponentSubject.next(false);
  }



  openImageDialog(): void {
    this.dialog.open(ImagesDialogComponent);
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashComponentSubject.next(false);
  }



  toggleDetails(component) {

    const id = component.docId;

    if (this.selectedComponent?.docId === id) {
      this.selectedComponent = null;
 
    }
    else {
      this.selectedComponent = component;

    }
  }

  deleteComponent(componentId) {
    const config = {
      title: 'Delete Component',
      message: 'Are you sure you want to delete permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };

    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        await this.componentsService.deleteInTrash(componentId).then(() => {
          this.uiService.alertMessage('Successful', 'Programme Template Deleted Permanently', 'success');
        });
      }
    });
  }

  async restoreComponent(component) {
    //  const masterDocId = await this.addProgrammeTemplateToMaster(template);
    // component.masterDocId = masterDocId;
    delete component.trashAt;
    delete component.trashedBy;
    await this.componentsService.addNewComponent(component, component.docId);
    await this.masterService.addNewObjectToMasterMap('COMPONENT', 'components', component);
    await this.componentsService.deleteInTrash(component.docId);
    this.uiService.alertMessage('Successful', 'Component Restored Successfully', 'success');

  }

  emptyTrash(): void {
    const config = {
      title: 'Empty Trash',
      message: 'Are you sure you want to delete all the components permanently?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
  
    const dialogRef = this.fuseConfirmationService.open(config);
  
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result === 'confirmed') {
        this.isLoading = true;
  
        try {
          await this.componentsService.emptyTrash();
          this.uiService.alertMessage('Deleted', 'All components deleted successfully', 'success');
        } catch (error) {
          this.uiService.alertMessage('Error', 'Error while emptying trash', 'error');
          console.error(error);
        } finally {
          this.isLoading = false;
        }
      }
    });
  }
  

}