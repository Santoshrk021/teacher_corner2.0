import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MasterService } from 'app/core/dbOperations/master/master.service';
import { VendorService } from 'app/core/dbOperations/vendors/vendor.service';
import { SharedService } from 'app/shared/shared.service';
import { lastValueFrom, Subject, takeUntil } from 'rxjs';
import { environment } from 'environments/environment.dev';

@Component({
    selector: 'app-add-vendor',
    templateUrl: './add-vendor.component.html',
    styleUrls: ['./add-vendor.component.scss']
})
export class AddVendorComponent implements OnInit {

    loader = false;
    infoForm: FormGroup;
    private _unsubscribeAll: Subject<any> = new Subject<any>();
    countries = ['India'];
    addressObj: any = {};
    locationdata;
    currentGpsCoordinates;
    options: string[] = [];
    key = 'AIzaSyBrQDqPJ8WWwbVQWYCRjMIMn97uGSq-WOg';
    constructor(private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any,
        private ds: MasterService,
        private vendorService: VendorService,
        public dialogRef: MatDialogRef<AddVendorComponent>
        ,
        private http: HttpClient,
        private sharedService: SharedService

    ) { }

    async ngOnInit() {
        this.loader = true;
        // this.getFilteredAddress(this.data)
        const { latitude, longitude } = await this.sharedService.requestLocationPermission();
        this.currentGpsCoordinates = `${latitude},${longitude}`;
        const data: any = await this.getAddress(latitude, longitude);
        this.locationdata = data;
        this.addressObj = data.address;
        setTimeout(async () => {

            this.setForm();
            this.loader = false;

        }, 4000);


    }

    close() {
        this.dialogRef.close();
    }

    async getAddress(lat: number, long: number) {
        return new Promise((resolve, reject) => {
            const endUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${long}&key=${environment.gmapApiKey}`;
            this.http.get<any>(endUrl).subscribe((response) => {
                if (response.status === 'OK' && response.results.length > 0) {
                    const addressComponents = response.results[0]['address_components'];
                    this.addressObj = addressComponents;
                    let pincode = '';
                    let country = '';
                    const address = [];

                    for (const component of addressComponents) {
                        if (component.types.includes('street_number') || component.types.includes('street')) {
                            //address.push(component['long_name']);
                            this.addressObj['street'] = component['long_name'] || '';
                        }
                        if (component.types.includes('route')) {
                            //address.push(component['long_name']);
                            this.addressObj['route'] = component['long_name'] || '';
                        }
                        if (component.types.includes('sublocality') || component.types.includes('sublocality_level_1')) {
                            // address.push(component['long_name']);
                            this.addressObj['sublocality'] = component['long_name'] || '';

                        }

                        if (component.types.includes('locality') || component.types.includes('sublocality_level_2')) {
                            // address.push(component['long_name']);
                            this.addressObj['locality'] = component['long_name'] || '';

                        }
                        if (component.types.includes('administrative_area_level_3')) {
                            //address.push(component['long_name']);
                            this.addressObj['level3'] = component['long_name'] || '';
                        }
                        if (component.types.includes('administrative_area_level_2')) {
                            //address.push(component['long_name']);
                            this.addressObj['level2'] = component['long_name'] || '';

                        }

                        if (component.types.includes('administrative_area_level_1')) {
                            //address.push(component['long_name']);
                            this.addressObj['level1'] = component['long_name'] || '';

                        }
                        if (component.types.includes('country')) {
                            country = component['long_name'] || '';
                        }
                        if (component.types.includes('postal_code')) {
                            pincode = component['long_name'] || '';
                            break;
                        }
                    }
                    if (pincode) {
                        resolve({ pincode: pincode, country: country, address: this.addressObj });
                    } else {
                        resolve('Pincode not found');
                    }

                } else {
                    //this.address = 'Address not found';
                    reject('Address not found');
                }
            }, (error) => {
                console.error(error);
                //this.address = 'Error retrieving address';
                reject('Error retrieving address');
            });
        });
    }
    getFilteredAddress(data) {
        data.addressObj.forEach((component) => {
            if (component.types.includes('street_number') || component.types.includes('street')) {
                this.addressObj['street'] = component['long_name'] || '';
            }
            if (component.types.includes('route')) {

                this.addressObj['route'] = component['long_name'] || '';
            }
            if (component.types.includes('sublocality') && component.types.includes('sublocality_level_1')) {

                this.addressObj['sublocality'] = component['long_name'] || '';

            }

            if (component.types.includes('sublocality') && component.types.includes('sublocality_level_2')) {

                this.addressObj['locality'] = component['long_name'] || '';

            }
            if (component.types.includes('administrative_area_level_3')) {
                this.addressObj['level3'] = component['long_name'] || '';
            }
            if (component.types.includes('administrative_area_level_2')) {
                this.addressObj['level2'] = component['long_name'] || '';

            }

            if (component.types.includes('administrative_area_level_1')) {
                this.addressObj['level1'] = component['long_name'] || '';

            }
            if (component.types.includes('country')) {
                this.addressObj['country'] = component['long_name'] || '';

            }
            if (component.types.includes('postal_code')) {
                this.addressObj['pincode'] = component['long_name'] || '';

            }
        });
    }
    async setForm() {
        const docId = this.ds.getDocId();
        const latestDocId = await this.ds.getLatestMasterDoc('VENDOR');
        this.infoForm = this.fb.group({
            docId: docId,
            pointOfContactCountryCode: [{ value: '+91', disabled: true }, [Validators.required]],
            // vendorName: [{ value: '', disabled: false }, [Validators.required]],
            Country: [{ value: this.locationdata.country || '', disabled: true }, [Validators.required]],
            Pincode: [{ value: this.locationdata.pincode || '', disabled: true }, [Validators.required]],
            masterDocId: latestDocId?.docId || '',
            //Catagory: [{ value: this.data?.type || '', disabled: true }, [Validators.required]],
            vendorName: [{ value: '', disabled: false }, [Validators.required]],
            vendorNumber: [{ value: '', disabled: true }, [Validators.required]],
            vendorAddress: this.fb.group({
                route: [{ value: this.addressObj['street'] || '', disabled: true }, Validators.required],

                street: [{ value: this.addressObj['route'], disabled: true }, Validators.required],
                village: [{ value: this.addressObj['locality'] || '', disabled: true }, Validators.required],
                sublocality: [{ value: this.addressObj['sublocality'] || '', disabled: true }, Validators.required],

                city: [{ value: this.addressObj['level3'] || '', disabled: true }, Validators.required],
                subDistrict: [{ value: this.addressObj['level2'] || '', disabled: true }, Validators.required],
                district: [{ value: this.addressObj['level1'] || '', disabled: true }, Validators.required],
                state: [{ value: this.addressObj['level1'] || '', disabled: true }, Validators.required],


            }),
            //vendorAddress: [{ value: this.data.address || '', disabled: true }, [Validators.required]],
            pointOfContactFirstName: [{ value: '', disabled: true }, [Validators.required]],
            pointOfContactSurname: [{ value: '', disabled: true }, [Validators.required]],
            // pointOfContactFullName: [{ value: '', disabled: true }, [Validators.required]],
            // pointOfContactFullNameLowerCase: [{ value: '', disabled: true }, [Validators.required]],
            pointOfContactPhoneNumber: [{ value: '', disabled: true }, [Validators.required]],
            vendorGpsCoordinates: [{ value: this.currentGpsCoordinates || '', disabled: true }],

        });
        // this.infoForm.get('pointOfContactCountryCode').setValue('+91')
        // this.getInfoFromPin(this.data?.pinCode)
        const watchList = [
            'pointOfContactCountryCode',
            'vendorName',
            'Pincode',
            'pointOfContactFirstName',
            'pointOfContactSurname',
            'Country',
            'pointOfContactPhoneNumber',
            'vendorNumber',
            'vendorAddress.route',
            'vendorAddress.street',
            'vendorAddress.village',
            'vendorAddress.sublocality',
            'vendorAddress.city',
            'vendorAddress.subDistrict',
            'vendorAddress.district',
            'vendorAddress.state',

        ];

        const unlockList = [
            'vendorName',
            'Pincode',
            'pointOfContactFirstName',
            'pointOfContactSurname',
            'Country',
            'pointOfContactPhoneNumber',
            'vendorNumber',
            'vendorAddress.route',
            'vendorAddress.street',
            'vendorAddress.village',
            'vendorAddress.sublocality',
            'vendorAddress.city',
            'vendorAddress.subDistrict',
            'vendorAddress.district',
            'vendorAddress.state',
            'vendorGpsCoordinates'
        ];

        for (let i = 0; i < watchList.length; i++) {
            this.unlockFormSequentially(watchList[i], unlockList[i]);
        }

        this.infoForm.get('Pincode').disable();
        this.infoForm.get('pointOfContactFirstName').disable();


    }

    async getInfoFromPin(pin) {
        const doc = this.http.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${pin}&key=${this.key}`);
        const ref = lastValueFrom(doc);
        const value: any = await ref;
        const options = value?.results?.[0]?.postcode_localities || value?.results?.[0]?.address_components?.filter(item => item?.types?.includes('route') || item?.types?.includes('sublocality'))?.[0]?.long_name;
        this.options = typeof (options) === 'string' ? [options] : options;

    }


    async unlockFormSequentially(watch: string, unlock: string) {
        switch (watch) {
            //   case 'Pincode':
            //       this.infoForm?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe(async res => {
            //           if (res) {

            //               this.infoForm?.get(unlock)?.enable();
            //           };
            //       });
            //       break;

            //   case 'pointOfContactFirstName':
            //       this.infoForm?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe(async res => {
            //           if (res) {

            //               this.infoForm?.get(unlock)?.enable();
            //           };
            //       });
            //       break;

            //   case 'pointOfContactSurname':
            //       this.infoForm.get(watch).valueChanges.subscribe(async res => {
            //           if (res) {
            //               this.infoForm?.get(unlock)?.enable();

            //           }
            //       });
            //       break;

            //   case 'pointOfContactSurname':
            //       this.infoForm.get(watch).valueChanges.subscribe(async res => {
            //           if (res) {
            //               this.infoForm?.get(unlock)?.enable();

            //           }
            //       });
            //       break;

            //   case 'vendorNumber':

            //       this.infoForm.get(watch).valueChanges.subscribe(async res => {
            //           console.log(watch)
            //           console.log(unlock)
            //           if (res) {
            //               this.infoForm?.get(unlock)?.enable();

            //           }
            //       });
            //       break;

            //   case 'vendorAddress.route':
            //       this.infoForm.get(watch).valueChanges.subscribe(async res => {
            //           console.log(watch)
            //           console.log(unlock)
            //           if (res) {
            //               this.infoForm?.get(unlock)?.enable();

            //           }
            //       });
            //       break;
            //   case 'vendorAddress.street':
            //       this.infoForm.get(watch).valueChanges.subscribe(async res => {
            //           console.log(watch)
            //           console.log(unlock)
            //           if (res) {
            //               this.infoForm?.get(unlock)?.enable();

            //           }
            //       });
            //       break;
            default:
                this.infoForm?.get(watch)?.valueChanges?.pipe(takeUntil(this._unsubscribeAll))?.subscribe((res) => {
                    if (res) {
                        this.infoForm?.get(unlock)?.enable();
                    };
                });
                break;
        }

    }

    getInputTextFormatte(inputText) {
        const textArray = inputText.split(' ');
        const spacedText = textArray.map((val) => {
            if (val.length == 2) {
                return val.split('').join(' ');
            }
            return val;

        }).toString().replaceAll(',', ' ');

        return spacedText;
    }


    async onSubmit(form) {
        const value = form.getRawValue();
        value['updatedAt'] = new Date();
        value['createdAt'] = new Date();
        value['pointOfContactFullName'] = value?.pointOfContactFirstName + ' ' + value?.pointOfContactSurname;
        value['vendorNumber'] = value?.pointOfContactCountryCode + value?.vendorNumber;
        value['Catagory'] = 'Vendor';
        value['verificationStatus'] = false;
        value['isVerified'] = false;
        // Upsert to Master map first to capture masterDocId
        const masterDocId = await this.ds.addNewObjectToMasterMap('VENDOR', 'vendorNames', value);
        value['masterDocId'] = masterDocId || value['masterDocId'] || '';
        // Save vendor document
        this.vendorService.saveinVendorColl(value);
        this.dialogRef.close({ data: value });
    }

}
