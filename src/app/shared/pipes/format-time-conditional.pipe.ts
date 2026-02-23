import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatTimeConditional'
})
export class FormatTimeConditionalPipe implements PipeTransform {

  transform(value: number): string {
    const minutes: number = Math.floor(value / 60);
    const hours: number = Math.floor(value / 60 / 60);

    let format: string;
    if (hours > 0 && minutes > 0) {
      format = ('00' + hours).slice(-2) +
        ':' +
        ('00' + minutes).slice(-2) +
        ':' +
        ('00' + Math.floor(value - minutes * 60)).slice(-2) +
        ' seconds';
    } else if (minutes > 0) {
      format = ('00' + minutes).slice(-2) +
        ':' +
        ('00' + Math.floor(value - minutes * 60)).slice(-2) +
        ' seconds';
    } else {
      format = ('00' + Math.floor(value - minutes * 60)).slice(-2) +
        ' seconds';
    };

    return (
      format
    );
  }

}
