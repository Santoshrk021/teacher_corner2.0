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
import { PartnerTrashModule } from './partner-trash/partner-trash.module';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { PartnerTrashComponent } from './partner-trash/partner-trash.component';
import { AddPartnerComponent } from './add-partner/add-partner.component';
import { MatDialog } from '@angular/material/dialog';
import { PartnerListModule } from './partner-list.module';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';

@Component({
    selector: 'app-partner-list',
    templateUrl: './partner-list.component.html',
    styleUrls: ['./partner-list.component.scss']
})
export class PartnerListComponent implements OnInit {
    isScrollLoading = false;
    loadingMessage = '';
    show = false;
    partners: any = [];

    selectedpartner;
    saveButtonActive = false;
    partnerTobeDeleted;
    partnerForm: FormGroup;
    partnerBsub = new BehaviorSubject(null);
    partnerDetails;
    partnerId: any;
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
    teacherFullName:string = '';
    constructor(
        private partnerService: PartnerService,
        private masterService: MasterService,
        private fb: FormBuilder,
        private configurationService: ConfigurationService,
        private sortingService: SortingService,
        private uiService: UiService,
        private afs: AngularFirestore,
        private drawerService: FuseDrawerService,
        private dialog: MatDialog,
        private fuseConfirmationService: FuseConfirmationService,
        private afAuth: AngularFireAuth,
        private userService: UserService,
        private teacherService: TeacherService,


    ) { }

    async ngOnInit() {
        // this.updateMasterDoc('partners_master_01',this.sss)
        // this.afs.collection('Master').doc('partners_master_01').set({partnerNames:this.sss},{merge:true})
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
        let partnerslist: any = await this.getPartners();
        this.totalCount = partnerslist.length;
        partnerslist = partnerslist.map(d => Object.assign({ ...d, pointOfContactFullName: (d?.pointOfContactFirstName + ' ' + d?.pointOfContactLastname) }));
        partnerslist = partnerslist.map((partner) => {
            if (partner.verificationStatus === undefined) {
                partner.verificationStatus = false;
            }

            return partner;
        });

        this.partnerBsub?.next(partnerslist);
        this.partners = partnerslist;
        if (this.isFirstTime) {
            this.infinityScrollLocked = false;
            this.partners = partnerslist.slice(0, 30);
            this.loadingMessage = `Loaded ${this.partners?.length} of ${this.totalCount} entries`;
        } else {
            this.search(this.searchTerm);
            this.loadingMessage = `${this.partners?.length} search results found`;
        }
        this.drawerService.drawerOpenTrashPartnerSubject.subscribe((res) => {
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
                this.partners = this.partnerBsub?.value?.filter(item => ((item?.organizationName?.length >= 1 && item?.organizationName?.toLowerCase()?.includes(val?.toLowerCase())
                        || (item?.oragnizationphoneNumber?.length >= 1 && item?.oragnizationphoneNumber?.toString()?.toLowerCase()?.includes(val?.toLowerCase()))
                        || ((item?.pointOfContactFirstName + ' ' + item?.pointOfContactLastname)?.length >= 1 && (item?.pointOfContactFirstName + ' ' + item?.pointOfContactLastname)?.length >= 1 && ((item?.pointOfContactFirstName + ' ' + item?.pointOfContactLastname)?.toLowerCase() + ' ' + (item?.pointOfContactFirstName + ' ' + item?.pointOfContactLastname)?.toLowerCase())?.includes(val?.toLowerCase()))
                        || ((item?.pointOfContactCountryCode + item?.pointOfContactPhoneNumber) && (item?.pointOfContactCountryCode + item?.pointOfContactPhoneNumber)?.includes(val?.toLowerCase()))
                        || (item?.docId?.length >= 1 && item?.docId?.toLowerCase()?.includes(val?.toLowerCase()))
                    )));
            }
            this.loadingMessage = `${this.partners?.length} search results found`;
        }
        else {
            if (this.isFirstTime) {
                this.infinityScrollLocked = false;
                this.partners = this.partnerBsub.value?.slice(0, 30);
            }
            this.loadingMessage = `Loaded ${this.partners?.length} of ${this.totalCount} entries`;
        }
    }
    async goToTrash() {
        await import('./partner-trash/partner-trash.module').then(() => {
            this.component = PartnerTrashComponent;
            this.drawerService.drawerOpenTrashPartnerSubject.next(true);
        });
    }

    async verificationToggle(e: MatSlideToggleChange, selectedPartner) {
        const masterPartnersDoc = this.partners;
        const indexNum = masterPartnersDoc.findIndex(instDoc => instDoc.docId == selectedPartner.docId);
        masterPartnersDoc[indexNum].verificationStatus = e.checked;
        masterPartnersDoc[indexNum].isVerified = e.checked;
        selectedPartner['verificationStatus'] = e.checked;
        selectedPartner['isVerified'] = e.checked;
        try {
            // Persist partner document
            await this.partnerService.saveinPartnerColl(selectedPartner, selectedPartner.docId);
            // Upsert into Master map and sync masterDocId
            const newMasterDocId = await this.masterService.addNewObjectToMasterMap('PARTNER', 'partners', selectedPartner);
            selectedPartner.masterDocId = newMasterDocId;
            masterPartnersDoc[indexNum].masterDocId = newMasterDocId;
        } catch (err) {
            console.error('Error upserting partner into Master map:', err);
        }
    }

    async updateMasterDoc(selectedPartner, allPartners) {
        const masterDocId = selectedPartner.masterDocId;
        const masterPartnerDoc = allPartners;
        const filterMasterData = masterPartnerDoc
            .filter(doc => doc.masterDocId === masterDocId)
            .map((sch) => {
                return {
                    organizationName: sch?.organizationName || '',
                    pointOfContactLastname: sch?.pointOfContactLastname || '',
                    Pincode: sch?.Pincode || '',
                    pointOfContactFirstName: sch?.pointOfContactFirstName || '',
                    docId: sch?.docId || '',
                    partnerGpsCoordinates: sch?.partnerGpsCoordinates || '',
                    pointOfContactCountryCode: sch?.pointOfContactCountryCode || '',
                    oragnizationphoneNumber: sch?.oragnizationphoneNumber ? sch?.oragnizationphoneNumber.slice(-10) : '',
                    pointOfContactPhoneNumber: sch?.pointOfContactPhoneNumber || '',
                    verificationStatus: sch?.verificationStatus,
                    isVerified: sch?.isVerified,
                    masterDocId: sch?.masterDocId || '',
                    Country: sch?.Country || '',
                    partnerAddress: sch?.partnerAddress || {},
                    createdAt: sch?.createdAt || new Date(),
                    updatedAt: sch?.updatedAt || new Date(),
                    pointOfContactFullName: sch?.pointOfContactFirstName + ' ' + sch?.pointOfContactLastname,
                };
            });
        try {
            await this.masterService.updateMasterDoc('partners', masterDocId, { [selectedPartner?.docId]: filterMasterData });
        } catch (err) {
            console.error('Error updating master document:', err);
        }
    }

    sortData(sort: Sort) {
        const labels = ['organizationName', 'oragnizationphoneNumber', 'docId', 'pointOfContactFullName', 'pointOfContactPhoneNumber', 'Pincode', 'creationDate', 'verificationStatus'];
        const defaultLabel = 'creationDate';
        this.savedSortEvent = sort;
        this.partners = this.sortingService.sortFunction(sort, labels, this.partners, defaultLabel);
    }

    onScroll($event) {
        // Infinite scroll: load 10 more if not searching
        if (this.infinityScrollLocked) return;
        const fullList = this.partnerBsub?.value || [];
        if (!Array.isArray(fullList)) return;
        if (this.partners?.length < this.totalCount) {
            const next = fullList.slice(0, this.partners.length + 10);
            this.partners = next;
            this.loadingMessage = `Loaded ${this.partners?.length} of ${this.totalCount} entries`;
        }
    }

    onDeletePartner(partner) {
        this.partnerTobeDeleted = partner;
        const name = partner?.organizationName;
        partner['trashedBy'] = this.teacherFullName;
        const config = {
            title: 'Delete Partner',
            message: `<p class="">Are you sure you want to delete "${(name || '').slice(0, 13)}..."?`,
            icon: { name: 'mat_outline:delete' }
        };
        const dialogRef = this.fuseConfirmationService.open(config);
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result == 'confirmed') {
                try {
                    const { masterDocId } = partner;
                    this.partnerService.toTrash(partner.docId, partner);
                    await this.masterService.deleteObjectFromMasterMap(masterDocId, 'partners', partner.docId);
                    await this.partnerService.delete(partner.docId);
                    this.partners = this.partners.filter(d => d.docId !== partner.docId);
                    this.uiService.alertMessage('Deleted', `Partner "${name}" deleted successfully`, 'error');
                } catch (error) {
                    this.uiService.alertMessage('Error', `Error deleting partner "${name}"`, 'error');
                }
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

    async getPartners() {
        return new Promise((resolve, reject) => {
            this.masterService.getAllMasterDocsMapAsArray('PARTNER', 'partners').pipe().subscribe((res: any[]) => {
                let allPartners: any[] = (res || []).map((d: any) => ({
                    ...d,
                    pointOfContactFullName: (d?.pointOfContactFirstName + ' ' + d?.pointOfContactLastname),
                    verificationStatus: d?.verificationStatus !== undefined ? d?.verificationStatus : (d?.isVerified !== undefined ? d?.isVerified : false),
                    isVerified: d?.isVerified !== undefined ? d?.isVerified : (d?.verificationStatus !== undefined ? d?.verificationStatus : false),
                }));
                allPartners = allPartners.sort((a: any, b: any) => (a?.organizationName || '').localeCompare(b?.organizationName || ''));
                resolve(allPartners);
            });
        });
    }

    async addPartner() {
        await import('./add-partner/add-partner.component').then(() => {
            const dialogRef = this.dialog.open(AddPartnerComponent, {
                data: {
                    type: 'Partner',
                    countryCode: '',
                    pinCode: '',
                    address: '',
                    GpsCooridinates: '',
                    addressObj: ''

                }
            });

            dialogRef.afterClosed().subscribe(async (result) => {
                if (result) {
                    // this.partners.push(result.data)
                    let partnerslist: any = await this.getPartners();
                    this.totalCount = partnerslist.length;
                    partnerslist = partnerslist.map(d => Object.assign({ ...d, pointOfContactFullName: (d?.pointOfContactFirstName + ' ' + d?.pointOfContactLastname) }));
                    partnerslist = partnerslist.map((partner) => {
                        if (partner.verificationStatus === undefined) {
                            partner.verificationStatus = false;
                        }

                        return partner;
                    });

                    this.partnerBsub?.next(partnerslist);
                    this.partners = partnerslist;
                } else {
                }
            });
        });

    }

    async toggleDetails(parnter) {
        // const countryCode = this.configurationService.getCountryCodeFromPhone(institute?.representativePhone);
        const countryCode = parnter?.representativeCountryCode;
        const countryName = this.configurationService.getCountryNameFromCode(countryCode).pipe(first());
        const country = await lastValueFrom(countryName);
        const typeofSc = '';
        const partnerDetails: any = await this.partnerService.getPartnerDataById(parnter.docId);
        this.partnerDetails = partnerDetails;
        // let partner = Object.assign(partnerDetails, parnter)
        const id = partnerDetails.docId;
        this.partnerId = id;
        if (this.selectedpartner?.docId === id) {
            this.selectedpartner = '';
        }
        else {
            this.selectedpartner = parnter;
            this.partnerForm.patchValue({
                organizationName: partnerDetails?.organizationName || '',
                pointOfContactLastname: partnerDetails?.pointOfContactLastname || '',
                Pincode: partnerDetails?.Pincode || '',
                pointOfContactFirstName: partnerDetails?.pointOfContactFirstName || '',
                docId: partnerDetails?.docId || '',
                partnerGpsCoordinates: partnerDetails?.partnerGpsCoordinates || '',
                pointOfContactCountryCode: partnerDetails?.pointOfContactCountryCode || '',
                oragnizationphoneNumber: partnerDetails?.oragnizationphoneNumber.slice(-10) || '',
                pointOfContactPhoneNumber: partnerDetails?.pointOfContactPhoneNumber || '',
                verificationStatus: partnerDetails?.verificationStatus || false,
                masterDocId: partnerDetails?.masterDocId || '',
                Country: partnerDetails?.Country || ''
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

            this.initialValue = JSON.parse(JSON.stringify(this.partnerForm.value));
            this.partnerForm.valueChanges.subscribe((changes) => {
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
        const masterPartnerDoc = this.partners;
        const indexNum = masterPartnerDoc.findIndex(instDoc => instDoc.docId == formData.docId);
        masterPartnerDoc[indexNum] = Object.assign(masterPartnerDoc[indexNum], formData);
        masterPartnerDoc[indexNum]['updatedAt'] = new Date();
        formData['updatedAt'] = new Date();
        formData['createdAt'] = masterPartnerDoc[indexNum]['createdAt'] || new Date();
        formData['pointOfContactFullName'] = formData?.pointOfContactFirstName + ' ' + formData?.pointOfContactLastname;

        this.startLoading = true;
        await this.partnerService.saveinPartnerColl(formData, this.selectedpartner.docId);
        await this.updateMasterDoc(formData, masterPartnerDoc).then(() => {
            this.uiService.alertMessage('Successful', 'information updated successfully', 'success');
            this.startLoading = false;
        });
        this.isFirstTime = false;
    }
}
