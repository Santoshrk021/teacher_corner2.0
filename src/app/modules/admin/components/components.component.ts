import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AddComponent } from './add/add.component';
import { ExportComponent } from './export/export.component';
import { MatTableDataSource } from '@angular/material/table';
import { ComponentModel } from './components.interface';
import { Subject, Subscription, takeUntil } from 'rxjs';
import { FormControl, FormGroup } from '@angular/forms';
import { TrashComponent } from './trash/trash.component';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';

@Component({
  selector: 'app-components',
  templateUrl: './components.component.html',
})
export class ComponentsComponent implements OnInit , OnDestroy {
  @ViewChild('searchInput') searchInput: ElementRef;

  searchForm = new FormGroup({
    search: new FormControl('')
  });
  opened: boolean = false;
  filterValue: string = '';
  dataSource = new MatTableDataSource<ComponentModel>([]);
  private subscription: Subscription = new Subscription();
  isEditing: boolean;
  show: boolean = false;
  component: any;
  drawerOpened: any = false;
  private _unsubscribeAll: Subject<any> = new Subject<any>();



  constructor(private dialog: MatDialog,
    private drawerService: FuseDrawerService,
  ) {
    this.drawerService.drawerOpenTrashComponentSubject.pipe(takeUntil(this._unsubscribeAll)).subscribe(res => {
      this.drawerOpened = res;
  

    })
  }

  ngOnInit(): void {
    // reset the filter when the input field is empty
    this.searchForm.get('search')?.valueChanges.subscribe(value => {
      const trimmed = value?.trim();
      if (trimmed === '') {
        this.filterValue = '';
      }
    });
  }

  addDialog(): void {
    this.dialog.open(AddComponent, {
      data: {
        addNewComponentFlag: true
      }
    });
  }

  async trashDialog() {
    await import('./trash/trash.module').then(() => {
      this.component = TrashComponent;
      this.show = true;
      this.drawerService.drawerOpenTrashComponentSubject.next(true);
    });
  }

  exportDialog(): void {
    const dialogRef = this.dialog.open(ExportComponent, {
      width: '500px',
    });

  }

  closeTrash(event: boolean): void {
    this.opened = event;
  }

  search(): void {
    this.filterValue = this.searchForm.get('search')?.value || '';
  }
  
  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
  }

}
