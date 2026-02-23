import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Sort } from '@angular/material/sort';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { PartnerService } from 'app/core/dbOperations/partner/partner.service';
import { SortingService } from 'app/shared/sorting.service';
import { UiService } from 'app/shared/ui.service';
import { lastValueFrom } from 'rxjs';
@Component({
    selector: 'app-partner-trash',
    templateUrl: './partner-trash.component.html',
    styleUrls: ['./partner-trash.component.scss']
})
export class PartnerTrashComponent implements OnInit {

    selectedPartner: any;
    deletedPartners: any;
    partnerForm: FormGroup;
    partnerTobeDeleted;

    constructor(
        private drawerService: FuseDrawerService,
        private partnerService: PartnerService,
        private fb: FormBuilder,
        private uiService: UiService,
        private masterService: MasterService,
        private fuseConfirmationService: FuseConfirmationService,
        private sortingService: SortingService
    ) { }


    ngOnInit(): void {
        this.partnerForm = this.fb.group({
            organizationName: ['', [Validators.required, Validators.pattern('[A-Za-z "\'\,]+[0-9]{0,2}')]],
            oragnizationphoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
            pointOfContactFirstName: [null, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
            pointOfContactLastname: [null, [Validators.required, Validators.pattern('[a-zA-Z ]*')]],
            pointOfContactCountryCode: [''],
            pointOfContactFullNameLowerCase: [''],
            pointOfContactPhoneNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
            Pincode: ['', [Validators.required]],
            //partnerAddress: ['', [Validators.required]],
            partnerAddress: this.fb.group({
                route: [{ value: '' }, Validators.required],
                street: [{ value: '' }, Validators.required],
                village: [{ value: '' }, Validators.required],
                sublocality: [{ value: '' }, Validators.required],
                city: [{ value: '' }, Validators.required],
                subDistrict: [{ value: '' }, Validators.required],
                district: [{ value: '' }, Validators.required],
                state: [{ value: '' }, Validators.required],
            }),
            partnerGpsCoordinates: ['', [Validators.required]],
            Country: ['', [Validators.required]],
            docId: [''],
            masterDocId: [''],
            verificationStatus: []
        });
        this.getAllPartners();
    }
    drawerClose() {
        this.drawerService.drawerOpenTrashPartnerSubject.next(false);
    }

    getAllPartners() {
        this.partnerService.trashCollection().subscribe((res) => {
            this.deletedPartners = res;
        });
    }

    // toggleDetails(partner) {
    //     const id = partner.docId;
    //     if (this.selectedPartner?.docId === id) {
    //         this.selectedPartner = '';
    //     } else {
    //         this.selectedPartner = partner;
    //         this.partnerForm = this.fb.group({
    //             organizationName: partner?.organizationName || '',
    //             pointOfContactLastname: partner?.pointOfContactLastname || '',
    //             Pincode: partner?.Pincode || '',
    //             pointOfContactFirstName: partner?.pointOfContactFirstName || '',
    //             docId: partner?.docId || '',
    //             partnerGpsCoordinates: partner?.partnerGpsCoordinates || '',
    //             pointOfContactCountryCode: partner?.pointOfContactCountryCode || '',
    //             oragnizationphoneNumber: partner?.oragnizationphoneNumber?.slice(-10) || '',
    //             pointOfContactPhoneNumber: partner?.pointOfContactPhoneNumber || '',
    //             verificationStatus: partner?.verificationStatus || false,
    //             masterDocId: partner?.masterDocId || '',
    //             Country: partner?.Country || '',
    //         });

    //         this.partnerForm.get('partnerAddress')?.patchValue({
    //             city: partner?.partnerAddress?.city || '',
    //             district: partner?.partnerAddress?.district || '',
    //             sublocality: partner?.partnerAddress?.sublocality || '',
    //             route: partner?.partnerAddress?.route || '',
    //             state: partner?.partnerAddress?.state || '',
    //             street: partner?.partnerAddress?.street || '',
    //             village: partner?.partnerAddress?.village || '',
    //             subDistrict: partner?.partnerAddress?.subDistrict || '',
    //         });
    //     }
    // }
    async toggleDetails(parnter) {
        // const countryCode = this.configurationService.getCountryCodeFromPhone(institute?.representativePhone);
        const countryCode = parnter?.representativeCountryCode;
        //  const countryName = this.configurationService.getCountryNameFromCode(countryCode).pipe(first());
        // const country = await lastValueFrom(countryName);
        const typeofSc = '';
        const partnerDetails: any = await this.partnerService.getPartnerDataById(parnter.docId);
        // this.partnerDetails = partnerDetails
        //   let partner = Object.assign(partnerDetails, parnter)
        const id = parnter.docId;
        // this.partnerId = id
        if (this.selectedPartner?.docId === id) {
            this.selectedPartner = '';
        }
        else {
            this.selectedPartner = parnter;
            this.partnerForm.patchValue({
                organizationName: parnter?.organizationName || '',
                pointOfContactLastname: parnter?.pointOfContactLastname || '',
                Pincode: parnter?.Pincode || '',
                pointOfContactFirstName: parnter?.pointOfContactFirstName || '',
                docId: parnter?.docId || '',
                partnerGpsCoordinates: parnter?.partnerGpsCoordinates || '',
                pointOfContactCountryCode: parnter?.pointOfContactCountryCode || '',
                oragnizationphoneNumber: parnter?.oragnizationphoneNumber.slice(-10) || '',
                pointOfContactPhoneNumber: parnter?.pointOfContactPhoneNumber || '',
                verificationStatus: parnter?.verificationStatus || false,
                masterDocId: parnter.masterDocId || '',
                Country: parnter.Country
            });

            this.partnerForm.get('partnerAddress').patchValue({
                city: parnter?.partnerAddress?.city || '',
                district: parnter?.partnerAddress?.district || '',
                sublocality: parnter?.partnerAddress?.sublocality || '',
                route: parnter?.partnerAddress?.route || '',
                state: parnter?.partnerAddress?.state || '',
                street: parnter?.partnerAddress?.street || '',
                village: parnter?.partnerAddress?.village || '',
                subDistrict: parnter?.partnerAddress?.subDistrict || '',
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
    async restorePartner(doc) {
        try {
            // Clean trash-only metadata
            delete doc.trashAt;
            delete doc.trashedBy;

            // Add back into Master map under 'partners'
            const masterDocId = await this.masterService.addNewObjectToMasterMap('PARTNER', 'partners', doc);
            doc.masterDocId = masterDocId || doc.masterDocId || '';

            // Restore into partners collection with same docId
            await this.partnerService.createWithId(doc, doc.docId);

            // Remove from trash
            await this.partnerService.deleteInTrash(doc.docId);

            this.uiService.alertMessage('Successful', 'Partner Restored Successfully', 'success');
        } catch (e) {
            this.uiService.alertMessage('Error', 'Failed to restore partner', 'error');
        }
    }

    deletePartner(doc: any) {
        this.partnerTobeDeleted = doc;
        const config = {
            title: 'Delete Partner',
            message: 'Are you sure you want to delete permanently ?',
            icon: {
                name: 'mat_outline:delete'
            }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                await this.partnerService.deleteInTrash(doc.docId).then(() => {
                    // this.updateInstitutesOnDelete(doc.docId)
                    this.uiService.alertMessage('Successful', 'Partner Deleted Permanently', 'success');
                });
            }
        });
    }

    updateInstitutesOnDelete(docId) {
        const index = this.deletedPartners.findIndex(d => d.docId == docId);
        this.deletedPartners.splice(index, 1);
    }

    emptyTrash() {
        const config = {
            title: 'Empty Trash',
            message: 'Are you sure you want to delete All the Partners permanently ?',
            icon: {
                name: 'mat_outline:delete'
            }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                this.deletedPartners.forEach((i) => {
                    this.partnerService.deleteInTrash(i.docId);
                });

                this.uiService.alertMessage('Deleted', 'All Partners Deleted Successfully', 'success');
            }
        });
    }

    sortData(sort: Sort) {
        const labels = ['name', 'institutionName', 'registrationNumber', 'representativeFirstName', 'representativePhoneNumber', 'pincode', 'institutionCreatorPhoneNumber', 'creationDate', 'verificationStatus'];
        this.deletedPartners = this.sortingService.sortFunction(sort, labels, this.deletedPartners);
    }
}
