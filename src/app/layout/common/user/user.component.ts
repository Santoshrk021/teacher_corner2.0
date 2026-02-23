import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, Input, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { BooleanInput } from '@angular/cdk/coercion';
import { first, firstValueFrom, Subject, takeUntil } from 'rxjs';
import { User } from 'app/core/user/user.types';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { DialogComponent } from './dialog/dialog.component';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { environment } from 'environments/environment';
import { AuthService } from 'app/core/auth/auth.service';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'user',
    templateUrl: './user.component.html',
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    exportAs: 'user',
    styleUrls: ['./user.component.scss']
})
export class UserComponent implements OnInit, OnDestroy {
    /* eslint-disable @typescript-eslint/naming-convention */
    static ngAcceptInputType_showAvatar: BooleanInput;
    /* eslint-enable @typescript-eslint/naming-convention */

    @Input() showAvatar: boolean = true;
    user: User;
    currentUser;
    environment: any = environment;
    userInfo: any;
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _router: Router,
        private _userService: UserService,
        public dialog: MatDialog,
        private authService: AuthService,
        public fuseConfirmationService: FuseConfirmationService,
        private teacherService: TeacherService,
        private httpClient: HttpClient,


    ) {
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Lifecycle hooks
    // -----------------------------------------------------------------------------------------------------

    /**
     * On init
     */
    ngOnInit(): void {
        // Subscribe to user changes
        this._userService.user$
            .pipe(takeUntil(this._unsubscribeAll))
            // .subscribe((user: User) => {
            // this.user = user;
            //  console.log(user);
            .subscribe((user: any) => {
                this.user = user?.teacherMeta;
                this.currentUser = user;
                this.userInfo = user?.teacherMeta;
                // console.log(user);
                // this.user = user;
                // console.log(user);
                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    /**
     * On destroy
     */
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    // -----------------------------------------------------------------------------------------------------
    // @ Public methods
    // -----------------------------------------------------------------------------------------------------

    /**
     * Update the user status
     *
     * @param status
     */
    updateUserStatus(status: string): void {
        // Return if user is not available
        if (!this.user) {
            return;
        }

        // Update the user
        // this._userService.update({
        //     ...this.user,
        //     status
        // }).subscribe();
    }

    /**
     * Sign out
     */
    signOut(): void {
        window.localStorage.setItem('logout-event', Math.random().toString());

        this._router.navigate(['/sign-out']);
    }


    async openDialog() {
        await import('./dialog/dialog.module').then(() => {
            const dialogRef = this.dialog.open(DialogComponent, {
                data: { currentUser: this.currentUser, canClose: true },
                backdropClass: 'backdropBackground1',
                panelClass: 'my-class'
            });
            dialogRef.afterClosed().subscribe((result) => {
                //this.router.navigate(['/'], { relativeTo: this.route });
            });
        });
    }

    // deleteAccount() {
    //     const config = {
    //         title: 'Delete Profile',
    //         message: 'Are you sure you want to delete your profile?',
    //         icon: {
    //             name: 'mat_outline:delete'
    //         }
    //     };
    //     const dialogRef = this.fuseConfirmationService.open(config);
    //     dialogRef.afterClosed().pipe(takeUntil(this._unsubscribeAll)).subscribe(async (result) => {
    //         if (result === 'confirmed') {

    //             try {
    //                await this.teacherService.deleteTeacher(this.userInfo.uid);
    //                await this._userService.deleteUser(this.userInfo.uid);
    //                 await this.deleteAuthUser(this.userInfo.uid);
    //                 await firstValueFrom(this.authService.signOut());
    //                 await this._router.navigate(['/login']);

    //             } catch (error) {
    //                 console.error('Error during account deletion:', error);
    //             }
    //         }
    //     })
    // }

    // async deleteAuthUser(uid: string) {
    //     // http://127.0.0.1:5001/jigyasa-e3fbb/asia-south1/deleteAuthUser
    //     const endUrl = `http://127.0.0.1:5001/${environment.firebase.projectId}/asia-south1/deleteAuthUser`;

    //     const formData = {
    //         uid
    //     };

    //     const httpOption: any = {
    //         responseType: 'application/json'
    //     };

    //     try {
    //         const response = await this.httpClient.post<any>(endUrl, formData, httpOption).toPromise();
    //         return response;
    //     } catch (error: any) {
    //         console.error('Error response:', error);
    //         return error;
    //     }
    // }
}
