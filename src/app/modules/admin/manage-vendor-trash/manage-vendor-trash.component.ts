import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Sort } from '@angular/material/sort';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { VendorService } from 'app/core/dbOperations/vendors/vendor.service';
import { SortingService } from 'app/shared/sorting.service';
import { UiService } from 'app/shared/ui.service';

@Component({
    selector: 'app-manage-vendor-trash',
    templateUrl: './manage-vendor-trash.component.html',
    styleUrls: ['./manage-vendor-trash.component.scss']
})
export class ManageVendorTrashComponent implements OnInit {

    selectedvendor: any;
    deletedvendors: any;
    vendorForm: FormGroup;
    vendorTobeDeleted;

    constructor(
        private drawerService: FuseDrawerService,
        private vendorService: VendorService,
        private fb: FormBuilder,
        private uiService: UiService,
        private masterService: MasterService,
        private fuseConfirmationService: FuseConfirmationService,
        private sortingService: SortingService
    ) { }


    ngOnInit(): void {
        this.vendorForm = this.fb.group({
            vendorName: ['', [Validators.required, Validators.pattern('[A-Za-z "\'\,]+[0-9]{0,2}')]],
            vendorNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
            pointOfContactFirstName: [null, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
            pointOfContactSurname: [null, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
            pointOfContactCountryCode: [''],
            pointOfContactFullNameLowerCase: [''],
            pointOfContactPhoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
            Pincode: ['', [Validators.required]],
            //partnerAddress: ['', [Validators.required]],
            vendorAddress: this.fb.group({
                route: [{ value: '' }, Validators.required],
                street: [{ value: '' }, Validators.required],
                village: [{ value: '' }, Validators.required],
                sublocality: [{ value: '' }, Validators.required],
                city: [{ value: '' }, Validators.required],
                subDistrict: [{ value: '' }, Validators.required],
                district: [{ value: '' }, Validators.required],
                state: [{ value: '' }, Validators.required],
            }),
            vendorGpsCoordinates: ['', [Validators.required]],
            Country: ['', [Validators.required]],
            docId: [''],
            masterDocId: [''],
            verificationStatus: []
        });
        this.getAllVendors();
    }
    drawerClose() {
        this.drawerService.drawerOpenTrashVendorSubject.next(false);
    }

    getAllVendors() {
        this.vendorService.trashCollection().subscribe((res) => {
            this.deletedvendors = res;
        });
    }


    async toggleDetails(vendor) {
        // const countryCode = this.configurationService.getCountryCodeFromPhone(institute?.representativePhone);
        const countryCode = vendor?.representativeCountryCode;
        //  const countryName = this.configurationService.getCountryNameFromCode(countryCode).pipe(first());
        // const country = await lastValueFrom(countryName);
        const typeofSc = '';
        const vendorDetails: any = await this.vendorService.getVendorDataById(vendor.docId);
        // this.partnerDetails = partnerDetails
        //   let partner = Object.assign(partnerDetails, parnter)
        const id = vendor.docId;
        // this.partnerId = id
        if (this.selectedvendor?.docId === id) {
            this.selectedvendor = '';
        }
        else {
            this.selectedvendor = vendor;
            this.vendorForm.patchValue({
                vendorName: vendor?.vendorName || '',
                pointOfContactSurname: vendor?.pointOfContactSurname || '',
                Pincode: vendor?.Pincode || '',
                pointOfContactFirstName: vendor?.pointOfContactFirstName || '',
                docId: vendor?.docId || '',
                vendorGpsCoordinates: vendor?.vendorGpsCoordinates || '',
                pointOfContactCountryCode: vendor?.pointOfContactCountryCode || '',
                vendorNumber: vendor?.vendorNumber.slice(-10) || '',
                pointOfContactPhoneNumber: vendor?.pointOfContactPhoneNumber || '',
                verificationStatus: vendor?.verificationStatus || false,
                masterDocId: vendor.masterDocId || '',
                Country: vendor.Country
            });

            this.vendorForm.get('vendorAddress').patchValue({
                city: vendor?.vendorAddress?.city || '',
                district: vendor?.vendorAddress?.district || '',
                sublocality: vendor?.vendorAddress?.sublocality || '',
                route: vendor?.vendorAddress?.route || '',
                state: vendor?.vendorAddress?.state || '',
                street: vendor?.vendorAddress?.street || '',
                village: vendor?.vendorAddress?.village || '',
                subDistrict: vendor?.vendorAddress?.subDistrict || '',
            });

            // this.initialValue = JSON.parse(JSON.stringify(this.partnerForm.value));
            // this.partnerForm.valueChanges.subscribe((changes) => {
            //     if (JSON.stringify(changes) !== JSON.stringify(this.initialValue)) {
            //         this.saveButtonActive = true
            //     }
            //     else {
            //         this.saveButtonActive = false
            //     }
            // });
        }
    }
    async restoreVendor(doc) {
        try {
            // Remove trash metadata
            delete doc.trashAt;
            delete doc.trashedBy;

            // Add back to Vendors collection with same docId
            await this.vendorService.saveinVendorColl(doc);

            // Add back into Master under vendorNames (map storage)
            await this.masterService.addNewObjectToMasterMap('VENDOR', 'vendorNames', doc);

            // Remove from trash
            await this.vendorService.deleteInTrash(doc.docId);

            this.uiService.alertMessage('Successful', 'Vendor Restored Successfully', 'success');
        } catch (e) {
            this.uiService.alertMessage('Error', 'Failed to restore vendor', 'error');
        }
    }

    deleteVendor(doc: any) {
        this.vendorTobeDeleted = doc;
        console.log(doc);
        const config = {
            title: 'Delete Vendor',
            message: 'Are you sure you want to delete permanently ?',
            icon: {
                name: 'mat_outline:delete'
            }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                await this.vendorService.deleteInTrash(doc.docId).then(() => {
                    // this.updateInstitutesOnDelete(doc.docId)
                    this.uiService.alertMessage('Successful', 'Vendor Deleted Permanently', 'success');
                });
            }
        });
    }

    updateInstitutesOnDelete(docId) {
        const index = this.deletedvendors.findIndex(d => d.docId == docId);
        this.deletedvendors.splice(index, 1);
    }

    emptyTrash() {
        const config = {
            title: 'Empty Trash',
            message: 'Are you sure you want to delete All the Vendors permanently ?',
            icon: {
                name: 'mat_outline:delete'
            }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                this.deletedvendors.forEach((i) => {
                    this.vendorService.deleteInTrash(i.docId);
                });

                this.uiService.alertMessage('Deleted', 'All Vendors Deleted Successfully', 'success');
            }
        });
    }

    sortData(sort: Sort) {
        const labels = ['name', 'institutionName', 'registrationNumber', 'representativeFirstName', 'representativePhoneNumber', 'pincode', 'institutionCreatorPhoneNumber', 'creationDate', 'verificationStatus'];
        this.deletedvendors = this.sortingService.sortFunction(sort, labels, this.deletedvendors);
    }

}
