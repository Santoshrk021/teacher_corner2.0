import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CustomTooltipDirective } from './custom-tooltip.directive';



@NgModule({
  declarations: [CustomTooltipDirective],
  imports: [
    CommonModule
  ],
  exports: [CustomTooltipDirective]

})
export class CustomTooltipModule { }
