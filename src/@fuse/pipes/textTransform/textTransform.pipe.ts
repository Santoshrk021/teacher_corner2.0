import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'textTransform'
})
export class textTransformPipe implements PipeTransform {

    transform(value: string, args?: any): string {
        const str = value.toUpperCase().replace(/  +/g, '').replace(/[^a-zA-Z ]/g, '').trim();
        return str;
    }

}
