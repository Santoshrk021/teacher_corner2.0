import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TextblockViewComponent } from './textblock-view/textblock-view.component';
import { QuillModule } from 'ngx-quill';


@NgModule({
  declarations: [
    TextblockViewComponent
  ],
  imports: [
    CommonModule,
    QuillModule.forRoot(),
  ],
  exports: [
    TextblockViewComponent
  ]
})
export class TextblockModule { }
