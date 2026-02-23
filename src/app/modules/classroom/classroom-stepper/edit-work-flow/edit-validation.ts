import { AbstractControl, ValidatorFn } from '@angular/forms';

export function contentEmptyValidator(isContentEmpty: boolean): ValidatorFn {
  return (control: AbstractControl): { [key: string]: any } | null => !isContentEmpty ? { 'contentEmptyError': false } : { 'contentEmptyError': true };
}
