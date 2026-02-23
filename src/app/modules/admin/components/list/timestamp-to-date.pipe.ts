import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timestampToDate'
})
export class TimestampToDatePipe implements PipeTransform {
  transform(value: any): Date | null {
    if (!value){
      return null;
    }


    // If value has a toDate function, call it
    if (typeof value.toDate === 'function') {
      return value.toDate();
    }

    // If value is already a Date
    if (value instanceof Date) {
      return value;
    }

    // If value is a string that can be parsed to a Date
    if (typeof value === 'string') {
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    // Default fallback
    return null;
  }
}
