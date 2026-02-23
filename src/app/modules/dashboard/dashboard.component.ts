import { Component, OnInit } from '@angular/core';
import { FuseLoadingService } from '@fuse/services/loading';
import { UserService } from 'app/core/dbOperations/user/user.service';

@Component({
    selector: 'app-dashboard',
    templateUrl: './dashboard.component.html',
    styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
    constructor(
        private _fuseLoadingService: FuseLoadingService,
        private userService: UserService

    ) {
        this._fuseLoadingService.hide();
    }

    ngOnInit(): void {
        this._fuseLoadingService.hide();
        this.userService.changeWhatsappIconPosition.next(false);

    }

}
