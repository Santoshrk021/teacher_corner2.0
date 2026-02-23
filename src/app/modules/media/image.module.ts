import { CommonModule } from '@angular/common';
import { Component, Input, NgModule, OnInit } from '@angular/core';

// Component inject
@Component({
    selector: 'app-image',
    template: '<img [src]="imgUrl"  >',
    styles: ['img{max-width:100%; max-height: 100%}']
})
export class ImageComponent implements OnInit {
    @Input() imgUrl: string;

    constructor() { }
    ngOnInit(): void {
    }
}

// Module inject
@NgModule({
    declarations: [ImageComponent],
    imports: [
        CommonModule
    ],
    exports: [
        ImageComponent
    ]
})
export class ImageModule { }
