import { AfterViewInit, ChangeDetectorRef, Component, ComponentRef, Input, OnInit, ViewChild } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { FormBuilder } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { LearningUnitsService } from 'app/core/dbOperations/learningUnits/learningUnits.service';
import { tactivity } from 'app/core/dbOperations/learningUnits/learningUnits.types';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { UiService } from 'app/shared/ui.service';
import { Subject } from 'rxjs';
import { tac } from '../learning-units/learningunitdialog/learningunitdialog.component';
import { SortingService } from 'app/shared/sorting.service';
import { environment } from 'environments/environment';
import { SharedService } from 'app/shared/shared.service';



export const data: tactivity[] = [
];
@Component({
  selector: 'app-manage-trash-learning-units',
  templateUrl: './manage-trash-learning-units.component.html',
  styleUrls: ['./manage-trash-learning-units.component.scss']
})
export class ManageTrashLearningUnitsComponent implements OnInit {
  drawerOpened: any = false;
  trashLUList = [];
  componentRef!: ComponentRef<ManageTrashLearningUnitsComponent>;
  loader: boolean = false;


  @Input() sLang: string;
  @Input() sVer: string;
  @Input() iChange: string;
  filteredTac: tac[];
  condition: boolean = true;
  @Input() allLearningunits: tactivity[];
  adata: any;
  headLineimg: string = `https://firebasestorage.googleapis.com/v0/b/${environment.firebase.projectId}.appspot.com/o/learningUnits%2FBA02-EN-V10%2FlearingUnitPic.jpeg?alt=media&token=3d9bc5b0-d7f3-441b-8f0a-df2ddb6c82bd`;
  filteredData: tactivity[];
  sampleData: tactivity[] = data;
  nquestion: any;
  selectedLearningUnit: any = {
  };
  newdata: tactivity[] = data;
  dataSource: MatTableDataSource<tactivity>;
  selectedLuDetails: any;

  constructor(
    private drawerService: FuseDrawerService,
    private fuseConfirmationService: FuseConfirmationService,
    private masterService: MasterService,
    private learningUnitService: LearningUnitsService,
    private uiService: UiService,
    private sharedService: SharedService,
    private sortingService: SortingService
  ) {
    this.dataSource = new MatTableDataSource(data);
  }

  async ngOnInit(): Promise<void> {
    this.loader = true;
    (await this.learningUnitService.getAllTrashLU()).subscribe((trashLUDocs) => {
      this.trashLUList = trashLUDocs.length ? trashLUDocs : [];
      this.loader = false;
    });
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  async toggleDetails(selectedLU: any) {
    const luDetails = selectedLU;
    this.selectedLuDetails = luDetails;
    const id = selectedLU.docId;
    if (this.selectedLearningUnit?.docId === id) {
      this.selectedLearningUnit = '';
    }
    else {
      this.selectedLearningUnit = selectedLU;
    }
  }

  deleteConfirmDialog(tac) {
    const config = {
      title: 'Delete Version',
      message: 'Are you sure you want to delete the Version ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        const index = this.trashLUList.findIndex(lu => lu.docId == tac.docId);
        await this.delete(tac.docId, index);
        this.uiService.alertMessage('Successful', 'Deleted', 'success');
      }
    });
  }

  async restoreVersion(tac: any) {
    const luMasterData = {
      learningUnitCode: tac.learningUnitCode || '',
      creationDate: tac?.creationDate || '',
      difficultyLevel: tac?.difficultyLevel || 0,
      learningUnitId: tac?.learningUnitId,
      exploreTime: tac?.exploreTime || 0,
      learningUnitName: tac?.learningUnitName || '',
      docId: tac?.docId || '',
      learningUnitPreviewImage: tac?.learningUnitPreviewImage || '',
      isoCode: tac?.isoCode || '',
      learningUnitDisplayName: tac?.learningUnitDisplayName || '',
      makingTime: tac?.makingTime || '',
      Maturity: tac?.Maturity || '',
      observationTime: tac?.observationTime || '',
      status: tac?.status || '',
      tacArchitectCountryCode: tac?.tacArchitectCountryCode || '',
      tacArchitectName: tac?.tacArchitectName || '',
      tacArchitectPhoneNumber: tac?.tacArchitectPhoneNumber || '',
      tacMentorCountryCode: tac?.tacMentorCountryCode || '',
      tacMentorName: tac?.tacMentorName || '',
      tacMentorPhoneNumber: tac?.tacMentorPhoneNumber || '',
      tacOwnerCountryCode: tac?.tacOwnerCountryCode || '',
      tacOwnerName: tac?.tacOwnerName || '',
      tacOwnerPhoneNumber: tac?.tacOwnerPhoneNumber || '',
      totalTime: tac?.totalTime || '',
      type: tac?.type || '',
      typeCode: tac?.typeCode || '',
      version: tac?.version || '',
      containsResources: tac?.containsResources || false,
    };
    const masterDocId = tac?.masterDocId;
    try {
      if (masterDocId && masterDocId?.length) {
        await this.masterService.updateMasterDoc('tacNames', masterDocId, { [tac?.docId]: this.sharedService.convertTimestamps(luMasterData) });
      } else {
        const masterDocId = await this.masterService.addNewObjectToMasterArray('LEARNINGUNIT', 'tacNames', this.sharedService.convertTimestamps(luMasterData));
        tac.masterDocId = masterDocId;
      }
      await this.learningUnitService.addNewLU(tac);
      await this.learningUnitService.deleteFromTrashLU(tac.docId);
      this.uiService.alertMessage('Successful', 'Restored Learning Unit Successfully', 'success');
    } catch (error) {
      this.uiService.alertMessage('Error', 'Error Restoring Learning Unit', 'error');
      console.error('Error Restoring Learning Unit', error);
    };
  }

  deleteAllTrash() {
    const config = {
      title: 'Delete Version',
      message: 'Are you sure you want to delete All the Trash Versions ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        let index = 0;
        for (const lu of this.trashLUList) {
          await this.delete(lu.docId, index);
          ++index;
        }
        this.uiService.alertMessage('Successful', 'All Deleted', 'success');
      }
    });
  }

  async delete(docId, index) {
    await this.learningUnitService.deleteFromTrashLU(docId);
    this.trashLUList.splice(index, 1);
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashLUSubject.next(false);
  }

  sortData(sort: Sort) {
    const labels = ['version', 'status', 'code', 'displayName', 'creationDate', 'tacOwner'];
    this.newdata = this.sortingService.sortFunction(sort, labels, this.newdata);
  }

}
