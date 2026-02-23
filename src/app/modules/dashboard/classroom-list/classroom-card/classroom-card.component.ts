import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
    selector: 'app-classroom-card',
    templateUrl: './classroom-card.component.html',
    styleUrls: ['./classroom-card.component.scss']
})
export class ClassroomCardComponent implements OnInit {

    constructor(private router: Router) { }

    ngOnInit(): void {
    }
    shortenText(text, maxLength) {
        let ret = text;
        if (ret.length > maxLength) {
            ret = ret.slice(0, maxLength) + '...';
        }
        return ret;
    }
}
