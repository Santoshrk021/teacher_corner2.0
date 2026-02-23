// UPDATED FILE: app/layout/common/notifications/notifications.component.ts
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewContainerRef, ViewEncapsulation } from '@angular/core';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { MatButton } from '@angular/material/button';
import { Subject, take, takeUntil, firstValueFrom } from 'rxjs';
import { Notification } from 'app/layout/common/notifications/notifications.types';
import { NotificationsService } from 'app/layout/common/notifications/notifications.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { SelfRegistrationUserApprovalComponent } from 'app/modules/admin/self-registration-user-approval/self-registration-user-approval.component';
import { FuseDrawerService } from 'app/core/dbOperations/fuseDrawerService/fuse-drawer.service';
import { SharedService } from 'app/shared/shared.service';
import { environment } from 'environments/environment';
import { NotificationService } from 'app/core/dbOperations/notifications/notification.service';
import { MatDialog } from '@angular/material/dialog';
import { RejectDialogComponent } from 'app/modules/admin/self-registration-user-approval/reject-dialog/reject-dialog.component';

@Component({
  selector: 'notifications',
  templateUrl: './notifications.component.html',
  encapsulation: ViewEncapsulation.None,
  styles: [`
    :host::ng-deep .fuse-drawer-content{
        background-color: #F1F5F9 !important;
    }`],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'notifications'
})
export class NotificationsComponent implements OnInit, OnDestroy {
  @ViewChild('notificationsOrigin') private _notificationsOrigin: MatButton;
  @ViewChild('notificationsPanel') private _notificationsPanel: TemplateRef<any>;

  notifications: Notification[] = [];
  previousNotifications: Notification[] = [];
  unreadCount = 0;

  private _overlayRef: OverlayRef;
  private _unsubscribeAll: Subject<any> = new Subject<any>();
  drawerOpened: any = false;
  component;
  user;

  constructor(
    private _changeDetectorRef: ChangeDetectorRef,
    private _notificationsService: NotificationsService,
    private _overlay: Overlay,
    private drawerService: FuseDrawerService,
    private _viewContainerRef: ViewContainerRef,
    private userService: UserService,
    private sharedService: SharedService,
    private dialog: MatDialog,
    private notificationDbService: NotificationService
  ) {
    this.drawerService.drawerOpenNotificationSubject.subscribe((res) => {
      this.drawerOpened = res;
    });
  }

  async ngOnInit(): Promise<void> {
    // Kick off the stream (uses stable combineLatest internally for accessLevel 9)
    const user: any = await firstValueFrom(this.userService.user$);
    if (user?.teacherMeta?.uid) {
      this._notificationsService.getnotificationsAll(user.teacherMeta.uid);
    } else {
      this._notificationsService.getAll();
    }

    // Panel
    this._notificationsService.notifications$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((notifications: Notification[]) => {
        this.notifications = (notifications || []).filter(n => n?.remove !== true);
        this._calculateUnreadCount();
        this._changeDetectorRef.markForCheck();
      });

    // Previous
    this._notificationsService.previousNotifications$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((prev: Notification[]) => {
        this.previousNotifications = (prev || []).filter(n => n?.remove !== true);
        this._changeDetectorRef.markForCheck();
      });

    // Save current user meta
    this.userService.user$
      .pipe(takeUntil(this._unsubscribeAll))
      .subscribe((u: any) => {
        this.user = u?.teacherMeta;
      });
  }

  ngOnDestroy(): void {
    this._unsubscribeAll.next(null);
    this._unsubscribeAll.complete();
    if (this._overlayRef) this._overlayRef.dispose();
  }

  openPanel(): void {
    if (!this._notificationsPanel || !this._notificationsOrigin) return;
    if (!this._overlayRef) this._createOverlay();
    this._overlayRef.attach(new TemplatePortal(this._notificationsPanel, this._viewContainerRef));
  }

  closePanel(): void { if (this._overlayRef) this._overlayRef.detach(); }

  markAllAsRead(): void { this._notificationsService.markAllAsRead().subscribe(); }

  toggleRead(notification: Notification): void {
    notification.read = !notification.read;
    this._notificationsService.update(notification.id, notification).subscribe();
  }

  delete(notification: Notification): void {
    notification.remove = true;
    this._notificationsService.delete(notification.id, notification).subscribe();
    this._changeDetectorRef.markForCheck();
  }

  trackByFn(index: number, item: any): any { return item.id || index; }

  private _createOverlay(): void {
    this._overlayRef = this._overlay.create({
      hasBackdrop: true,
      backdropClass: 'fuse-backdrop-on-mobile',
      scrollStrategy: this._overlay.scrollStrategies.block(),
      positionStrategy: this._overlay.position()
        .flexibleConnectedTo(this._notificationsOrigin._elementRef.nativeElement)
        .withLockedPosition(true)
        .withPush(true)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
          { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
          { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' }
        ])
    });
    this._overlayRef.backdropClick().subscribe(() => this._overlayRef.detach());
  }

  private _calculateUnreadCount(): void {
    this.unreadCount = this.notifications?.filter(n => !n?.read)?.length ?? 0;
  }

  asDate(value: any): Date | null {
    if (!value) return null;
    if (value?.seconds && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    if (value instanceof Date) return value;
    const d = new Date(value);
    return isNaN(d as any) ? null : d;
  }

  // ---------- Approval flow ----------
  async acceptApproval(notificationObj: Notification) {
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
      this.notificationDbService.updateSelfRegUserApproval(approvalObj, selfRegUserId);
      notificationObj.read = true;
      notificationObj.remove = true;
      notificationObj.actionTakenBy = `${this.user?.firstName || ''} ${this.user?.lastName || ''}`;
      notificationObj.actionDate = new Date();
      this.delete(notificationObj);
    }

    const templateName = environment.whatsAppTemplates.approvalConfirmation.templateName;
    const headerImage = environment.whatsAppTemplates.approvalConfirmation.headerImage;
    const rejection = false;
    this.sendWhatsappAprovaludpate(notificationObj, templateName, rejection, headerImage);
  }

  sendWhatsappAprovaludpate(notificationObj, templateName, rejection, headerImage) {
    const rejectionReason = rejection ? 'unknown' : '';
    const classroom = notificationObj.classroomName;
    const programmeName = notificationObj.subject;
    const institutionName = notificationObj.instituteName;
    const name = notificationObj.firstName + ' ' + notificationObj.lastName;
    const params = [name, classroom, programmeName, institutionName];
    const phone = notificationObj.countryCode + notificationObj.phoneNumber;
    if (rejectionReason != '') params.push(rejectionReason);
    const mediaType = 'image';
    const urlRoute = undefined;
    this.sharedService.sendWhatsAppNotification(phone, templateName, params, headerImage, mediaType, urlRoute);
  }

  async rejectApproval(notificationObj: Notification) {
    await import('app/modules/admin/self-registration-user-approval/reject-dialog/reject-dialog.module');
    const dialogRef = this.dialog.open(RejectDialogComponent, { data: { ...notificationObj } });

    dialogRef.afterClosed().pipe(take(1)).subscribe((dialogCloseEvent: any) => {
      if (dialogCloseEvent?.eventName === 'save') {
        const reason = dialogCloseEvent?.message || '';
        this._handleRejection(notificationObj, reason);
      }
    });
  }

  private _handleRejection(notificationObj: Notification, rejectionReason: string) {
    const selfRegUserId = notificationObj?.selfRegUserId || '';

    if (selfRegUserId && notificationObj?.classroomId) {
      const approvalObj: any = {
        selfRegTeacherApproval: {
          [`${notificationObj.classroomId}`]: {
            approvalStatus: false,
            updatedAt: new Date(),
            classroomId: `${notificationObj.classroomId}`,
            rejectionReason
          }
        }
      };
      this.notificationDbService.updateSelfRegUserApproval(approvalObj, selfRegUserId);
    }

    notificationObj.read = true;
    notificationObj.remove = true;
    notificationObj.actionTakenBy = `${this.user?.firstName || ''} ${this.user?.lastName || ''}`;
    notificationObj.actionDate = new Date();
    (notificationObj as any).rejectionReason = rejectionReason;

    this._notificationsService.delete(notificationObj.id, notificationObj).subscribe();

    const templateName = environment.whatsAppTemplates.approvalRejection.templateName;
    const headerImage = environment.whatsAppTemplates.approvalRejection.headerImage;
    const rejection = true;
    this._sendWhatsappRejection(notificationObj, templateName, headerImage, rejectionReason, rejection);

    this._changeDetectorRef.markForCheck();
  }

  private _sendWhatsappRejection(
    notificationObj: any,
    templateName: string,
    headerImage: string,
    rejectionReason: string,
    rejection: boolean
  ) {
    const classroom = notificationObj.classroomName;
    const programmeName = notificationObj.subject;
    const institutionName = notificationObj.instituteName;
    const name = `${notificationObj.firstName} ${notificationObj.lastName}`;
    const phone = `${notificationObj.countryCode}${notificationObj.phoneNumber}`;

    const params = [name, classroom, programmeName, institutionName];
    if (rejection && rejectionReason) params.push(rejectionReason);

    const urlRoute = undefined;
    const mediaType = 'image';

    this.sharedService.sendWhatsAppNotification(
      phone,
      templateName,
      params,
      headerImage,
      mediaType,
      urlRoute
    );
  }

  async viewRequest() {
    await import('../../../modules/admin/self-registration-user-approval/self-registration-user-approval.module').then(() => {
      this.component = SelfRegistrationUserApprovalComponent;
    });
    this.drawerService.drawerOpenNotificationSubject.next(true);
  }
}
