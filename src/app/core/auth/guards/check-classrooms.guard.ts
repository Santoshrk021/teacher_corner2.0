import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { Observable, first, lastValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CheckClassroomsGuard implements CanActivate {
  constructor(
    private teacherService: TeacherService,
    private router: Router,
    private userService: UserService,
    private classroomService: ClassroomsService,
    private readonly activatedRoute: ActivatedRoute
  ) {
  }
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.checkClassrooms(route);
  }

  async checkClassrooms(route) {
    const id = await this.userService.getUid();

    const promise = new Promise(async (resolve) => {
      (await this.teacherService.getWithId(id)).subscribe((res) => {
        resolve(res);
      });
    });

    const teacherDoc: any = await promise || [];
    const classIdsArr = teacherDoc == undefined ? [] : teacherDoc.hasOwnProperty('classrooms') ? Object.keys(teacherDoc?.classrooms) : [];
    if (!classIdsArr.length) {
      return true;
    };

    const clsInfo = teacherDoc.classrooms[classIdsArr[0]];
    let institutionId: string; let classroomId: string; let programmeId: string;
    const lastAccessedProgramme = await lastValueFrom((await this.userService?.getTeacherInfo()).pipe(first()));
    if(lastAccessedProgramme?.hasOwnProperty('currentTeacherInfo')) {
      // if last accessed institutionId, classroomId, programmeId
      ({institutionId, classroomId, programmeId} = lastAccessedProgramme?.['currentTeacherInfo']);
    } else {
      // if no last accessed institutionId, classroomId, programmeId
      ({ institutionId, classroomId } = clsInfo);
      programmeId = await this.getFirstProgramme(classroomId);
    };

    const approvedStatus: any = await this.checkSelfReg(id, classIdsArr);
    if (approvedStatus == false && typeof(approvedStatus)!=='object') {
      // this.router.navigate(['dashboard'], { queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: programmeId } });
      this.router.navigate([`dashboard/${classroomId}`], { queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: programmeId } });
    } else {
      // this.router.navigate(['approval-page'], { queryParams: { approvedStatus } });
      this.userService.approvalClassroomInfoSub.next(approvedStatus);
      //this.router.navigateByUrl('approval-page')
      if(typeof(approvedStatus.rejected)!='undefined' && approvedStatus.rejected==true){
        this.router.navigateByUrl('approval-rejection');
      }
      else{
        this.router.navigateByUrl('approval-page');
      }

    };

    // this.router.navigate(['dashboard'], { queryParams: { institutionId: institutionId, classroomId: classroomId, programmeId: programmeId } });
    // route.params['institutionId'] = institutionId
    // route.params['classroomId'] = classroomId
    // route.params['programmeId'] = programmeId
    return false;
  }

  async getFirstProgramme(clsId) {
    const a = this.classroomService.get(clsId).toPromise();
    const clsObj = await a;
    return Object?.keys(clsObj?.programmes)?.[0];
  }

  async checkSelfReg(uid, teacherClssrooms) {
    const userInfo: any = await this.userService.getDocDataById(uid);
    const allClassroomsArr = teacherClssrooms || [];
    const selfStatus = allClassroomsArr.find(cls => userInfo?.selfRegTeacherApproval?.[`${cls}`]?.['approvalStatus'] == false);
    if (selfStatus) {
      return userInfo?.selfRegTeacherApproval?.[`${selfStatus}`];
    } else {
      return false;
    };
  }

}
