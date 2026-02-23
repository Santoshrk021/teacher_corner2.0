import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { ActivatedRoute } from '@angular/router';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { Subject, takeUntil } from 'rxjs';
import { RejectDialogComponent } from './reject-dialog/reject-dialog.component';
import { UiService } from 'app/shared/ui.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';

@Component({
    selector: 'app-self-registration-user-approval',
    templateUrl: './self-registration-user-approval.component.html',
    styleUrls: ['./self-registration-user-approval.component.scss']
})
export class SelfRegistrationUserApprovalComponent implements OnInit {
    viewAllRequest = true;
    allpendingNotification: Notification[] = [];
    allNotificationActionsTaken: Notification[] = [];

    private _unsubscribeAll: Subject<any> = new Subject<any>();
    user;
    constructor(
        private drawerService: FuseDrawerService,
        private route: ActivatedRoute,
        public dialog: MatDialog,
        public afAuth: AngularFireAuth,
        private uiService: UiService,
        private userService: UserService,
        private sharedService: SharedService,
        private notificationService: NotificationsService) { }

    ngOnDestroy(): void {
    }

    ngOnInit(): void {
        // Subscribe to notification changes
        this.notificationService.allApprovalRequestNotificationSub
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((notifications: Notification[]) => {
                // Load the notifications
                this.allpendingNotification = notifications.filter(message => message['actionTakenBy'] == '');
                this.allNotificationActionsTaken = notifications.filter(message => message['actionTakenBy'] != '');
            });
        this.userService.user$
            .pipe((takeUntil(this._unsubscribeAll)))
            .subscribe((user: any) => {
                this.user = user?.teacherMeta;
            });
    }
    toggleList(change: MatSlideToggleChange): void {
        this.viewAllRequest = !change.checked;
    }

    async approveRequest(notificationObj, index) {
        const selfRegUserId = notificationObj?.selfRegUserId || '';
        const approvalObj = {
            selfRegTeacherApproval: {
                [`${notificationObj.classroomId}`]: {
                    approvalStatus: true,
                    classroomId: `${notificationObj.classroomId}`
                }
            }
        };
        if (selfRegUserId) {
            this.allpendingNotification.splice(index, 1);
            this.userService.updateSelfRegUserApproval(approvalObj, selfRegUserId);
            notificationObj.read = true;
            notificationObj.remove = true;
            notificationObj.actionTakenBy = `${this.user?.firstName || ''} ${this.user?.lastName || ''}`;
            notificationObj.actionDate = new Date();
            this.allNotificationActionsTaken.push(notificationObj);
            this.notificationService.delete(notificationObj.id, notificationObj).subscribe();
            const rejection = false;
            // let templateName = 'teacher_corner_successful_approval_request_en_v1'
            const templateName = environment.whatsAppTemplates.approvalConfirmation.templateName;
            const headerImage = environment.whatsAppTemplates.approvalConfirmation.headerImage;
            this.sendWhatsappAprovaludpate(notificationObj, templateName, rejection, headerImage);
            this.uiService.alertMessage('Successful', 'Approved', 'success');
        }
    }

    sendWhatsappAprovaludpate(notificationObj, templateName, rejection, headerImage) {
        const rejectionReason = rejection ? notificationObj.rejectionReason : '';
        const classroom = notificationObj.classroomName;
        const programmeName = notificationObj.subject;
        const institutionName = notificationObj.instituteName;
        const name = notificationObj.firstName + ' ' + notificationObj.lastName;
        const params = [name, classroom, programmeName, institutionName];
        const phone = notificationObj.countryCode + notificationObj.phoneNumber;
        if (rejectionReason != '') {
            params.push(rejectionReason);
        };
        const urlRoute = undefined;
        const mediaType = 'image';

        this.sharedService.sendWhatsAppNotification(phone, templateName, params, headerImage, mediaType, urlRoute);
    }


    async updateIntoDB(notificationObj, index) {
        const selfRegUserId = notificationObj?.selfRegUserId || '';
        const approvalObj = {
            selfRegTeacherApproval: {
                [`${notificationObj.classroomId}`]: {
                    approvalStatus: false,
                    updatedAt: new Date(),
                    classroomId: `${notificationObj.classroomId}`
                }
            }
        };
        if (notificationObj.rejectionReason) {
            approvalObj.selfRegTeacherApproval[`${notificationObj.classroomId}`]['rejectionReason'] = notificationObj.rejectionReason;
        }
        if (selfRegUserId) {
            this.allpendingNotification.splice(index, 1);
            this.userService.updateSelfRegUserApproval(approvalObj, selfRegUserId);
            notificationObj.read = true;
            notificationObj.remove = true;
            notificationObj.actionTakenBy = `${this.user?.firstName || ''} ${this.user?.lastName || ''}`;
            notificationObj.actionDate = new Date();
            this.allNotificationActionsTaken.push(notificationObj);
            this.notificationService.delete(notificationObj.id, notificationObj).subscribe();
            // let templateName = 'teacher_corner_approval_request_rejection_notification_en_v1'
            const templateName = environment.whatsAppTemplates.approvalRejection.templateName;
            const headerImage = environment.whatsAppTemplates.approvalRejection.headerImage;
            const rejection = true;
            this.sendWhatsappAprovaludpate(notificationObj, templateName, rejection, headerImage);
            this.uiService.alertMessage('Successful', 'Rejected', 'success');
        }
    }

    async rejectRequest(userNotification, i) {
        await import('./reject-dialog/reject-dialog.module').then(async () => {
            const dialogRef = this.dialog.open(RejectDialogComponent, {
                data: { ...userNotification },
            });
            dialogRef.afterClosed().subscribe((dialogCloseEvent: any) => {
                if (dialogCloseEvent?.eventName == 'save') {
                    userNotification.rejectionReason = dialogCloseEvent?.message;
                    this.updateIntoDB(userNotification, i);
                }
            });
        });
    }

    drawerClose() {
        this.drawerService.drawerOpenNotificationSubject.next(false);
    }
}
