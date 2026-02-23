import {
    CdkDragDrop,
    moveItemInArray,
    transferArrayItem,
} from '@angular/cdk/drag-drop';
import { Component, OnInit } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { filter, firstValueFrom } from 'rxjs';
import { DetailsComponent } from './details/details.component';
import { ComponentService } from './services/component.service';

@Component({
    selector: 'app-component',
    templateUrl: './component.component.html',
    styleUrls: ['./component.component.scss'],
})
export class ComponentComponent implements OnInit {
    totalItems: any = [];
    searchTerm: string = '';
    selectedLanguage: string = '';
    filteredPrograms: string[] = [];
    availablePrograms = [];
    assignedPrograms = [];

    constructor(
        private matdialog: MatDialog,
        private componentService: ComponentService
    ) {}

    ngOnInit(): void {
        this.componentService.componentDatas$.subscribe((data) => {
            this.totalItems = data;
            const names: string[] = [];
            for (const item of this.totalItems) {
                const name = item.componentName;
                const type = item.componentType;
                const code = item.componentCode;
                const category = item.category;
                names.push(`${name}-(${code})-${type}-${category}`);
            }

            this.filteredPrograms = names;
            this.availablePrograms = names;
        });
    }

    filterPrograms(): void {
        this.filteredPrograms = this.availablePrograms.filter((program) => {
            const matchesLanguage = this.selectedLanguage
                ? program.includes(`-${this.selectedLanguage}`)
                : true;

            const matchesSearch = this.searchTerm
                ? program.toLowerCase().includes(this.searchTerm.toLowerCase())
                : true;

            return matchesLanguage && matchesSearch;
        });
    }
    drop(event: CdkDragDrop<string[]>): void {
        if (event.previousContainer === event.container) {
            moveItemInArray(
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
        } else {
            const isLeftToRight =
                event.previousContainer.id === 'leftList' &&
                event.container.id === 'rightList';

            const droppedItem =
                event.previousContainer.data[event.previousIndex];
            transferArrayItem(
                event.previousContainer.data,
                event.container.data,
                event.previousIndex,
                event.currentIndex
            );
            if (isLeftToRight) {
                setTimeout(() => {
                    this.openEditDialog(droppedItem);
                }, 100);
            }
        }
    }

    openEditDialog(data: string): void {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = false;
        dialogConfig.autoFocus = true;
        dialogConfig.width = '490px';
        dialogConfig.height = '430px';
        dialogConfig.data = data;
        const dialogRef = this.matdialog.open(DetailsComponent, dialogConfig);
        dialogRef
            .afterClosed()
            .pipe(
                filter(val => !!val) //
            )
            .subscribe();
    }

    saveComponent(): void {
        this.componentService.managingComponentData(this.assignedPrograms);
        console.log(this.assignedPrograms);
    }
}
