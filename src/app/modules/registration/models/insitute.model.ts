import { AbstractControl, FormGroup, ValidationErrors } from '@angular/forms';

export interface Institute {
    registrationNumber: any;
    institutionId: string;
    institutionName: (string | ((control: AbstractControl<any, any>) => ValidationErrors)[])[];
    institutionCreatorFirstName: string;
    institutionCreatorLastName: string;
    institutionCreatorName: string;
    institutionCreatorEmail: string;
    representativeEmail?: (string | ((control: AbstractControl<any, any>) => ValidationErrors)[])[];
    representativePhone?: (string | ((control: AbstractControl<any, any>) => ValidationErrors)[])[];
    representativeFirstName?: (string | ((control: AbstractControl<any, any>) => ValidationErrors)[])[];
    representativeLastName?: (string | ((control: AbstractControl<any, any>) => ValidationErrors)[])[];
    institutiontype: 'thinktac' | 'school' | 'partner';
    institutionAddress: FormGroup;
    creationDate?: Date;
    lastUsedDate?: Date;
    // boardId:string,
    board: (((control: AbstractControl<any, any>) => ValidationErrors) | { value: any; disabled: true })[];
    genderType: (string | ((control: AbstractControl<any, any>) => ValidationErrors))[];
    medium: any;
}
export interface Address {
    street1: string;
    street2?: string;
    city: string;
    district: string;
    state: string;
    pincode: number;
}
