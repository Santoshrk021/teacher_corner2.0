import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';


export function representativePhoneExistValidator(inputPhone): ValidatorFn {
    return (control: AbstractControl): ValidationErrors => {
        const isSame = inputPhone === control.value;
        return isSame ? {representativePhoneExistError: true} : null;
    };
}

export function representativePhoneValidator(inputPhone): ValidatorFn {
    return (control: AbstractControl): ValidationErrors => {
        const isSame = inputPhone === (control.value);
        return isSame ? {invalidRepresentativePhone: true} : null;
    };
}

export function representativeNameExistValidator(firstName, inputName): ValidatorFn {
    return (control: AbstractControl): ValidationErrors => {
        const isSame = inputName === firstName + ' ' + control.value;
        return isSame ? {representativeNameExistError: true} : null;
    };
}

export function representativeNameValidator(firstName, inputName): ValidatorFn {
    return (control: AbstractControl): ValidationErrors => {
        const isSame = inputName === firstName + ' ' + control.value;
        return isSame ? {invalidRepresentativeName: true} : null;
    };
}

export function representativeEmailExistValidator(inputEmail): ValidatorFn {
    return (control: AbstractControl): ValidationErrors => {
        const isSame = inputEmail === control.value;
        return isSame ? {representativeEmailExistError: true} : null;
    };
}

export function representativeEmailValidator(inputEmail): ValidatorFn {
    return (control: AbstractControl): ValidationErrors => {
        const isSame = inputEmail === control.value;
        return isSame ? {invalidRepresentativeEmail: true} : null;
    };
}
