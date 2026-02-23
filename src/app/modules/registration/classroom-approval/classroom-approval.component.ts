import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { InstitutionsService } from 'app/core/dbOperations/institutions/institutions.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { ClassroomService } from 'app/modules/dashboard/classroom.service';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-classroom-approval',
  templateUrl: './classroom-approval.component.html',
  styleUrls: ['./classroom-approval.component.scss']
})
export class ClassroomApprovalComponent implements OnInit {
  selfRegCls = {
    classroomName: '',
    institutionName: ''
  };
  environment = environment;

  constructor(
    private userService: UserService,
    private classroomService: ClassroomsService,
    private instituteService: InstitutionsService,
    private router: Router
  ) { }

  async ngOnInit() {
    return this.userService.approvalClassroomInfoSub.subscribe((cls: any) => {
      if (!cls) {
        return this.checkApprovalStatus();
      }
      this.selfRegCls = cls;
    });
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
