import { Component, OnInit } from '@angular/core';
import { CollectionReference, QueryFn } from '@angular/fire/compat/firestore';
import { Timestamp } from '@angular/fire/firestore';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Sort } from '@angular/material/sort';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { PartnerService } from 'app/core/dbOperations/partner/partner.service';
import { SortingService } from 'app/shared/sorting.service';
import { UiService } from 'app/shared/ui.service';
import { BehaviorSubject, first, firstValueFrom, lastValueFrom } from 'rxjs';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { ManageVendorTrashModule } from '../manage-vendor-trash/manage-vendor-trash.module';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { ManageVendorTrashComponent } from '../manage-vendor-trash/manage-vendor-trash.component';
import { VendorService } from 'app/core/dbOperations/vendors/vendor.service';
import { AddVendorComponent } from './add-vendor/add-vendor.component';
import { MatDialog } from '@angular/material/dialog';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
@Component({
    selector: 'app-vendor-list',
    templateUrl: './vendor-list.component.html',
    styleUrls: ['./vendor-list.component.scss']
})
export class VendorListComponent implements OnInit {

    isScrollLoading = false;
    loadingMessage = '';
    show = false;
    vendors: any = [];

    selectedvendor;
    saveButtonActive = false;
    vendorTobeDeleted;
    vendorForm: FormGroup;
    vendorBsub = new BehaviorSubject(null);
    vendorDetails;
    vendorId: any;
    totalCount: number;
    isFirstTime: boolean = true;
    savedSortEvent: any;
    startLoading = false;
    initialValue: any;
    countries = ['India'];
    infinityScrollLocked: boolean = false;
    searchTerm: string;
    component: any;
    drawerOpened = false;
    teacherFullName:string ='';
    constructor(
        private vendorService: VendorService,
        private masterService: MasterService,
        private fb: FormBuilder,
        private configurationService: ConfigurationService,
        private sortingService: SortingService,
        private uiService: UiService,
        private afs: AngularFirestore,
        private drawerService: FuseDrawerService,
        private fuseConfirmationService: FuseConfirmationService,
        private dialog: MatDialog,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private teacherService: TeacherService,
    ) { }

    async ngOnInit() {
        // this.updateMasterDoc('partners_master_01',this.sss)
        // this.afs.collection('Master').doc('partners_master_01').set({partnerNames:this.sss},{merge:true})
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
        await this.getVendors();
        this.drawerService.drawerOpenTrashVendorSubject.subscribe((res) => {
            this.drawerOpened = res;
        });

        // get user name
        const user = await lastValueFrom(this.afAuth.authState.pipe(first()));
    const currentUser = await lastValueFrom(this.userService.getUser(user?.uid));
    const teacher = await lastValueFrom(this.teacherService.getWithId(currentUser?.id || currentUser?.docId));
    this.teacherFullName = teacher.teacherMeta['firstName'] + ' ' + teacher.teacherMeta['lastName'];
    }

    search(event: Event | string) {
        const val = this.searchTerm = this.sortingService.checkType(event);
        if (val !== undefined && val != '') {
            if (val && val.trim() != '') {
                this.infinityScrollLocked = true;
                this.vendors = this.vendorBsub?.value?.filter(item => ((item?.vendorName?.length >= 1 && item?.vendorName?.toLowerCase()?.includes(val?.toLowerCase())
                    || (item?.vendorNumber?.length >= 1 && item?.vendorNumber?.toString()?.toLowerCase()?.includes(val?.toLowerCase()))
                    || ((item?.pointOfContactFirstName + ' ' + item?.pointOfContactSurname)?.length >= 1 && (item?.pointOfContactFirstName + ' ' + item?.pointOfContactSurname)?.length >= 1 && ((item?.pointOfContactFirstName + ' ' + item?.pointOfContactSurname)?.toLowerCase() + ' ' + (item?.pointOfContactFirstName + ' ' + item?.pointOfContactSurname)?.toLowerCase())?.includes(val?.toLowerCase()))
                    || ((item?.pointOfContactCountryCode + item?.pointOfContactPhoneNumber) && (item?.pointOfContactCountryCode + item?.pointOfContactPhoneNumber)?.includes(val?.toLowerCase()))
                    || (item?.docId?.length >= 1 && item?.docId?.toLowerCase()?.includes(val?.toLowerCase()))
                )));
            }
            this.loadingMessage = `${this.vendors?.length} search results found`;
        }
        else {
            if (this.isFirstTime) {
                this.infinityScrollLocked = false;
                this.vendors = this.vendorBsub.value?.slice(0, 30);
            }
            this.loadingMessage = `Loaded ${this.vendors?.length} of ${this.totalCount} entries`;
        }
    }
    async goToTrash() {
        await import('../manage-vendor-trash/manage-vendor-trash.module').then(() => {
            this.component = ManageVendorTrashComponent;
            this.drawerService.drawerOpenTrashVendorSubject.next(true);
        });
    }

    async verificationToggle(e: MatSlideToggleChange, selectedVendor) {
        const masterVendorsDoc = this.vendors;
        const indexNum = masterVendorsDoc.findIndex(instDoc => instDoc.docId == selectedVendor.docId);
        masterVendorsDoc[indexNum].verificationStatus = e.checked;
        masterVendorsDoc[indexNum].isVerified = e.checked;
        selectedVendor['verificationStatus'] = e.checked;
        selectedVendor['isVerified'] = e.checked;
        // Persist vendor document
        await this.vendorService.saveinVendorColl(selectedVendor);
        // Upsert into Master map using addNewObjectToMasterMap and keep masterDocId in sync
        try {
            const newMasterDocId = await this.masterService.addNewObjectToMasterMap('VENDOR', 'vendorNames', selectedVendor);
            selectedVendor.masterDocId = newMasterDocId;
            masterVendorsDoc[indexNum].masterDocId = newMasterDocId;
        } catch (err) {
            console.error('Error upserting vendor into Master map:', err);
        }
    }

    async updateMasterDoc(selectedVendor, allVendors) {
        const masterDocId = selectedVendor.masterDocId; 
        const masterVendorDoc = allVendors;
        const filterMasterData = masterVendorDoc
            .filter(doc => doc.masterDocId === masterDocId)
            .map((sch) => {

                let date;
                if (typeof (sch.creationDate) == 'string') {
                    date = Timestamp.fromDate(new Date(sch.creationDate));
                }
                else {
                    date = sch.creationDate;
                }
                return {
                    vendorName: sch?.vendorName || '',
                    pointOfContactSurname: sch?.pointOfContactSurname || '',
                    Pincode: sch?.Pincode || '',
                    pointOfContactFirstName: sch?.pointOfContactFirstName || '',
                    docId: sch?.docId || '',
                    vendorGpsCoordinates: sch?.vendorGpsCoordinates || '',
                    pointOfContactCountryCode: sch?.pointOfContactCountryCode || '',
                    vendorNumber: sch?.vendorNumber ? sch?.vendorNumber.slice(-10) : '',
                    pointOfContactPhoneNumber: sch?.pointOfContactPhoneNumber || '',
                    verificationStatus: sch?.verificationStatus,
                    masterDocId: sch?.masterDocId || '',
                    Country: sch?.Country || '',
                    vendorAddress: sch?.vendorAddress || {},
                    createdAt: sch?.createdAt || new Date(),
                    updatedAt: sch?.updatedAt || new Date(),

                    pointOfContactFullName: sch?.pointOfContactFirstName + ' ' + sch?.pointOfContactSurname,
                };
            });
        try {
            await this.masterService.updateMasterDoc('vendorNames', masterDocId, { [selectedVendor?.docId]: filterMasterData });
        } catch (err) {
            console.error('Error updating master document:', err, filterMasterData.filter(x => x === undefined));
        }
    }

    sortData(sort: Sort) {
        const labels = ['vendorName', 'vendorNumber', 'docId', 'pointOfContactFullName', 'pointOfContactPhoneNumber', 'Pincode', 'creationDate', 'verificationStatus'];
        const defaultLabel = 'creationDate';
        this.savedSortEvent = sort;
        this.vendors = this.sortingService.sortFunction(sort, labels, this.vendors, defaultLabel);
    }

    onScroll($event) {
        // Infinite scroll: load 10 more if not searching
        if (this.infinityScrollLocked) return;
        const fullList = this.vendorBsub?.value || [];
        if (!Array.isArray(fullList)) return;
        if (this.vendors?.length < this.totalCount) {
            const next = fullList.slice(0, this.vendors.length + 10);
            this.vendors = next;
            this.loadingMessage = `Loaded ${this.vendors?.length} of ${this.totalCount} entries`;
        }
    }


    async onDeleteVendor(vendor: any) {
    const name = vendor?.vendorName;
    const config = {
      title: 'Delete Vendor',
      message: `<p class="">Are you sure you want to delete "${name.slice(0, 13)}..."?`,
      icon: {
        name: 'mat_outline:delete'
      }
    };
    const dialogRef = this.fuseConfirmationService.open(config);
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        try {
          const { masterDocId } = vendor;
          vendor['trashedBy'] = this.teacherFullName;
          this.vendorService.deleteComponentById(vendor.docId, vendor);
          this.masterService.deleteObjectFromMasterMap(masterDocId, 'vendorNames', vendor.docId);
          this.vendorService.deleteComponent(vendor.docId);

          this.uiService.alertMessage('Deleted', `Component "${name}" deleted successfully`, 'error');
        } catch (error) {
          this.uiService.alertMessage('Error', `Error deleting component "${name}"`, 'error');
        };
      }
    });
  }

    copyToClipboard(text: string | undefined): void {
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                console.info('Copied to clipboard:', text);
            }).catch((error) => {
                console.error('Failed to copy:', error);
            });
        }
    }

    async getVendors() {
        return new Promise((resolve, reject) => {
            this.masterService.getAllMasterDocsMapAsArray('VENDOR', 'vendorNames').pipe().subscribe((res) => {
                // Flatten is already done by service; ensure shape and defaults
                let allVendors: any[] = (res || []).map((d: any) => ({
                    ...d,
                    pointOfContactFullName: (d?.pointOfContactFirstName + ' ' + d?.pointOfContactSurname),
                    verificationStatus: d?.verificationStatus !== undefined ? d?.verificationStatus : (d?.isVerified !== undefined ? d?.isVerified : false),
                    isVerified: d?.isVerified !== undefined ? d?.isVerified : (d?.verificationStatus !== undefined ? d?.verificationStatus : false),
                }));
                allVendors = allVendors.sort((a: any, b: any) => (a?.vendorName || '').localeCompare(b?.vendorName || ''));

                this.totalCount = allVendors.length;
                this.vendorBsub?.next(allVendors);

                if (this.isFirstTime) {
                    this.infinityScrollLocked = false;
                    this.vendors = allVendors.slice(0, 30);
                    this.loadingMessage = `Loaded ${this.vendors?.length} of ${this.totalCount} entries`;
                } else {
                    this.search(this.searchTerm);
                    this.loadingMessage = `${this.vendors?.length} search results found`;
                }
                resolve(allVendors);
            });
        });
    }

    async toggleDetails(parnter) {
        // const countryCode = this.configurationService.getCountryCodeFromPhone(institute?.representativePhone);
        const countryCode = parnter?.representativeCountryCode;
        const countryName = this.configurationService.getCountryNameFromCode(countryCode).pipe(first());
        const country = await lastValueFrom(countryName);
        const vendorDetails: any = await this.vendorService.getVendorDataById(parnter.docId);
        this.vendorDetails = vendorDetails;
        // let vendor = Object.assign(vendorDetails, parnter)
        const id = vendorDetails.docId;
        this.vendorId = id;
        if (this.selectedvendor?.docId === id) {
            this.selectedvendor = '';
        }
        else {
            this.selectedvendor = parnter;
            this.vendorForm.patchValue({
                vendorName: vendorDetails?.vendorName || '',
                pointOfContactSurname: vendorDetails?.pointOfContactSurname || '',
                Pincode: vendorDetails?.Pincode || '',
                pointOfContactFirstName: vendorDetails?.pointOfContactFirstName || '',
                docId: vendorDetails?.docId || '',
                vendorGpsCoordinates: vendorDetails?.vendorGpsCoordinates || '',
                pointOfContactCountryCode: vendorDetails?.pointOfContactCountryCode || '',
                vendorNumber: vendorDetails?.vendorNumber.slice(-10) || '',
                pointOfContactPhoneNumber: vendorDetails?.pointOfContactPhoneNumber || '',
                verificationStatus: vendorDetails?.verificationStatus || false,
                masterDocId: vendorDetails.masterDocId || '',
                Country: vendorDetails.Country || ''
            });

            this.vendorForm.get('vendorAddress').patchValue({
                city: vendorDetails?.vendorAddress?.city || '',
                district: vendorDetails?.vendorAddress?.district || '',
                sublocality: vendorDetails?.vendorAddress?.sublocality || '',
                route: vendorDetails?.vendorAddress?.route || '',
                state: vendorDetails?.vendorAddress?.state || '',
                street: vendorDetails?.vendorAddress?.street || '',
                village: vendorDetails?.vendorAddress?.village || '',
                subDistrict: vendorDetails?.vendorAddress?.subDistrict || '',
            });

            this.initialValue = JSON.parse(JSON.stringify(this.vendorForm.value));
            this.vendorForm.valueChanges.subscribe((changes) => {
                if (JSON.stringify(changes) !== JSON.stringify(this.initialValue)) {
                    this.saveButtonActive = true;
                }
                else {
                    this.saveButtonActive = false;
                }
            });
        }
    }

    async formSubmit(form) {
        const formData: any = form.value;
        const masterVendorDoc = this.vendors;
        const indexNum = masterVendorDoc.findIndex(instDoc => instDoc.docId == formData.docId);
        masterVendorDoc[indexNum] = Object.assign(masterVendorDoc[indexNum], formData);
        masterVendorDoc[indexNum]['updatedAt'] = new Date();
        formData['updatedAt'] = new Date();
        formData['createdAt'] = masterVendorDoc[indexNum]['createdAt'] || new Date();
        formData['pointOfContactFullName'] = formData?.pointOfContactFirstName + ' ' + formData?.pointOfContactSurname;

        this.startLoading = true;
        await this.vendorService.saveinVendorColl(formData);
        await this.updateMasterDoc(formData, masterVendorDoc).then(() => {
            this.uiService.alertMessage('Successful', 'information updated successfully', 'success');
            this.startLoading = false;
        });
        this.isFirstTime = false;
    }

    async addVendor() {
        await import('./add-vendor/add-vendor.component').then(() => {
            const dialogRef = this.dialog.open(AddVendorComponent, {
                data: {
                    type: 'Vendor',
                    countryCode: '',
                    pinCode: '',
                    address: '',
                    GpsCooridinates: '',
                    addressObj: ''

                }
            });

            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    //this.vendors.push(result.data)
                    let vendorslist: any = await this.getVendors();
                    this.totalCount = vendorslist.length;
                    vendorslist = vendorslist.map(d => Object.assign({ ...d, pointOfContactFullName: (d?.pointOfContactFirstName + ' ' + d?.pointOfContactSurname) }));
                    vendorslist = vendorslist.map((vendor) => {
                        if (vendor.verificationStatus === undefined) {
                            vendor.verificationStatus = false;
                        }

                        return vendor;
                    });

                    this.vendorBsub?.next(vendorslist);
                    this.vendors = vendorslist;
                } else {
                }
            });
        });

    }


}
