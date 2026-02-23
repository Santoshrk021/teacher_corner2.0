import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Sort } from '@angular/material/sort';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { MasterInstituteDoc } from 'app/core/dbOperations/master/master.types';
import { SortingService } from 'app/shared/sorting.service';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-manage-trash-institutes',
  templateUrl: './manage-trash-institutes.component.html',
  styleUrls: ['./manage-trash-institutes.component.scss']
})
export class ManageTrashInstitutesComponent implements OnInit {
  deletedInstitues: Array<any>;
  selectedInstitute: any;
  instituteForm: FormGroup;
  genderTypes = ['Boys', 'Girls', 'Co-ed'];
  langList: Array<any>;

  constructor(
    private drawerService: FuseDrawerService,
    private institutionsService: InstitutionsService,
    private fb: FormBuilder,
    private uiService: UiService,
    private masterService: MasterService,
    private fuseConfirmationService: FuseConfirmationService,
    private sortingService: SortingService,
    private configurationService: ConfigurationService,
  ) { }

  ngOnInit(): void {
    this.getLanguagesAndGenderTypes();
    this.getAllinstitutes();
  }

  drawerClose() {
    this.drawerService.drawerOpenTrashInstitutesSubject.next(false);
  }

  getAllinstitutes() {
    this.institutionsService.trashCollection().subscribe((res) => {
      this.deletedInstitues = res;
    });
  }

  async getLanguagesAndGenderTypes() {
    const languageList = await lastValueFrom(this.configurationService.getConfigurationDocumentOnce('Languages'));
    this.langList = languageList?.get('langTypes') || [];
  }

  toggleDetails(institute) {
    const id = institute.docId;
    if (this.selectedInstitute?.docId === id) {
      this.selectedInstitute = '';
    }
    else {
      this.selectedInstitute = institute;
      this.instituteForm = this.fb.group({
        institutionName: [{ value: institute?.institutionName, disabled: true }],
        genderType: [{ value: institute?.genderType, disabled: true }],
        medium: [{ value: institute?.medium, disabled: true }],
        representativeEmail: [{ value: institute?.representativeEmail, disabled: true }],
        registrationNumber: [{ value: institute?.registrationNumber, disabled: true }],
        representativeFirstName: [{ value: institute?.representativeFirstName, disabled: true }],
        representativeLastName: [{ value: institute?.representativeLastName, disabled: true }],
        representativeCountryCode: [institute?.representativeCountryCode],
        representativePhoneNumber: [{ value: institute?.representativePhoneNumber, disabled: true }],
        typeofSchool: [{ value: institute?.typeofSchool, disabled: true }],

        institutionAddress: this.fb.group({
          street: [{ value: institute?.institutionAddress?.street1, disabled: true }],
          city: [{ value: institute?.institutionAddress?.city, disabled: true }],
          district: [{ value: institute?.institutionAddress?.district, disabled: true }],
          state: [{ value: institute?.institutionAddress?.state, disabled: true }],
          pincode: [{ value: institute?.institutionAddress?.pincode, disabled: true }],
          village: [{ value: institute?.institutionAddress?.village, disabled: true }],
          subDistrict: [{ value: institute?.institutionAddress?.subDistrict, disabled: true }]
        }),
        docId: ['']
      });

    }
  }


  async restoreInstitute(doc) {
    const masterInstituteData: MasterInstituteDoc = {
      docId: doc?.docId,
      board: doc?.board || '', /* Board Code */
      institutionName: doc?.institutionName || '',
      institutionCreatorCountryCode: doc?.institutionCreatorCountryCode || '',
      institutionCreatorPhoneNumber: doc?.institutionCreatorPhoneNumber || '',
      institutionCreatorName: doc?.institutionCreatorName || `${doc?.institutionCreatorFirstName || ''} ${doc?.institutionCreatorLastName || ''}`.trim(),
      registrationNumber: doc?.registrationNumber || '',
      representativeFirstName: doc?.representativeFirstName || '',
      representativeLastName: doc?.representativeLastName || '',
      representativeCountryCode: doc?.representativeCountryCode || '',
      representativePhoneNumber: doc?.representativePhoneNumber || '',
      creationDate: new Date(),
      typeofSchool: doc?.typeofSchool || 'Private School',
      pincode: doc?.institutionAddress?.pincode || 0,
      verificationStatus: doc?.verificationStatus || false,
    };
    try {
      // Use addNewObjectToMasterMap instead of addNewObjectToMasterArray
      const newMasterDocId = await this.masterService.addNewObjectToMasterMap('INSTITUTE', 'institutionNames', masterInstituteData);
      // Update the masterDocId in the institution document if it changed
      const institutionToRestore = { ...doc };
      if (newMasterDocId !== doc.masterDocId) {
        institutionToRestore.masterDocId = newMasterDocId;
      }
      // await this.institutionsService.createWithId(doc, doc.docId);
      await this.institutionsService.createWithId(institutionToRestore, doc.docId);
      await this.institutionsService.deleteInTrash(doc.docId);
      // this.updateInstitutesOnDelete(doc.docId)
      this.uiService.alertMessage('Successful', 'Institute Restored Successfully', 'success');
    } catch (error) {
      this.uiService.alertMessage('Error', 'Institute Restoration Failed', 'error');
      console.error('Error restoring institute:', error);
    }
  }

  deleteInstitute(doc: any) {
    const config = {
      title: 'Delete Institute',
      message: 'Are you sure you want to delete permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        try {
          await this.institutionsService.deleteInTrash(doc);
          // this.updateInstitutesOnDelete(doc.docId)
          this.uiService.alertMessage('Successful', 'Institute Deleted Permanently', 'success');
        } catch (error) {
          this.uiService.alertMessage('Error', 'Institute Deletion Failed', 'error');
          console.error('Error deleting institute:', error);
        }
      }
    });
  }

  updateInstitutesOnDelete(docId) {
    const index = this.deletedInstitues.findIndex(d => d.docId == docId);
    this.deletedInstitues.splice(index, 1);
  }

  emptyTrash() {
    const config = {
      title: 'Empty Trash',
      message: 'Are you sure you want to delete All the Institutes permanently ?',
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        const originalLength = this.deletedInstitues.length;
        for (let i = 0; i < this.deletedInstitues.length; i++) {
          try {
            await this.institutionsService.deleteInTrash(this.deletedInstitues[i].docId);
            this.uiService.alertMessage('Deleted', `Deleted Classroom ${i + 1} of ${originalLength} Successfully`, 'success');
          } catch (error) {
            this.uiService.alertMessage('Error', `Error Deleting Classroom ${i + 1} of ${originalLength}`, 'error');
            console.error(`Error deleting classroom ${this.deletedInstitues[i].docId}: `, error);
          }
        }

        this.uiService.alertMessage('Deleted', 'All Institutes Deleted Successfully', 'success');
      }
    });
  }

  sortData(sort: Sort) {
    const labels = ['name', 'institutionName', 'registrationNumber', 'representativeFirstName', 'representativePhoneNumber', 'pincode', 'institutionCreatorPhoneNumber', 'creationDate', 'verificationStatus'];
    this.deletedInstitues = this.sortingService.sortFunction(sort, labels, this.deletedInstitues);
  }
}
