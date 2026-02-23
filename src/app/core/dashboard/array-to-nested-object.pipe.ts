import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'arrayToNestedObject'
})
export class ArrayToNestedObjectPipe implements PipeTransform {

  nestedObject: any;

  transform(value: Array<any>): any {
    /*
    for(let i = 0; i < value.length; i++) {
      this.nestedObject = {
        [value[i]['learningUnitId']]: value[i]
      };
    };
    */
    this.nestedObject = value.reverse().reduce((accumulator, response) => ({...accumulator, [response.learningUnitId]: response}), {});
    // console.log(this.nestedObject);
    return this.nestedObject;
  }

}
