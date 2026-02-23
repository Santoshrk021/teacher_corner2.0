import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function selfNominationValidator(inputPhone): ValidatorFn {
    return (control: AbstractControl): ValidationErrors => {
        const selfNominated = inputPhone.slice(-10) === (control.value);
        return selfNominated ? {selfNomination: true} : null;
    };
}
