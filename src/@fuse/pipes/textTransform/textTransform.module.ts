import { NgModule } from '@angular/core';
import {  textTransformPipe } from './textTransform.pipe';


@NgModule({
    declarations: [
        textTransformPipe
    ],
    exports: [
        textTransformPipe
    ]
})
export class textTransformPipeModule {
}
