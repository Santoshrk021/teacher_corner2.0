import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-classroom-approval-rejection',
  templateUrl: './classroom-approval-rejection.component.html',
  styleUrls: ['./classroom-approval-rejection.component.scss']
})
export class ClassroomApprovalRejectionComponent implements OnInit {
  testmessage = 'This is a test message';
  selfRegCls = {
    classroomName: '',
    institutionName: '',
    rejectionReason: ''
  };
  environment = environment;

  constructor(
    private classroomService: ClassroomsService,
    private instituteService: InstitutionsService,
    private router: Router,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.userService.approvalClassroomInfoSub.subscribe((cls: any) => {
      if (!cls) {
        return this.checkApprovalStatus();
      }
      this.selfRegCls = cls;
      this.selfRegCls.rejectionReason = cls.rejectionReason;
    });
  }

  isHyperlink(text: string): boolean {
    const urlPattern = /^(http:\/\/|https:\/\/)/;
    return urlPattern.test(text);
  }

  async getClassroomData(clsId) {
    const classRoomData = await this.classroomService.getClassroomDataById(clsId);
  }

  async getInstituteData(instId) {
    const instituteData = await this.instituteService.getClassroomDataById(instId);
  }

  checkUserSelfReg() {
  }

  async checkApprovalStatus() {
    this.router.navigateByUrl('registration-page');
  }

  logout() {
    this.router.navigate(['/sign-out']);
  }

}
