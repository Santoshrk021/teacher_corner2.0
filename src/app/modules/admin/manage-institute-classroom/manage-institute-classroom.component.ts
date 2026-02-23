import { Component, EventEmitter, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { environment } from 'environments/environment';
import { BehaviorSubject, first, lastValueFrom, take } from 'rxjs';

@Component({
  selector: 'app-manage-institute-classroom',
  templateUrl: './manage-institute-classroom.component.html',
  styleUrls: ['./manage-institute-classroom.component.scss']
})
export class ManageInstituteClassroomComponent implements OnInit {
  clsSubject = new BehaviorSubject(null);
  isActive = false;
  selectedIndex: number;
  change: EventEmitter<number> = new EventEmitter<number>();
  instititutionSub = new BehaviorSubject(null);
  country: string = '';
  environment = environment
  accessLevel: number = null;
  isLoaded: boolean = false;
  loggedInTeacher: any;

  constructor(
    public dialog: MatDialog,
    private userService: UserService,
    private teacherService: TeacherService,
    private classroomService: ClassroomsService,
    private configurationService: ConfigurationService,
  ) {
    this.checkClsSubject();
  }

  async ngOnInit(): Promise<void> {
    const id = await this.userService.getUid();
    const user: any = await this.userService.getDocDataById(id);

    if (!user.hasOwnProperty('accessLevel')) {
      console.error(`AccessLevel not defined for user ${id}`);
    }

    const loggedInTeacher: any = await lastValueFrom(this.teacherService.getTeacherByIdOnce(id));
    this.loggedInTeacher = loggedInTeacher.exists ? loggedInTeacher.data() : {};

    if (Number(user?.accessLevel) === 9) {
      const teacherInstitutionId = Object.values(loggedInTeacher?.get('classrooms'))?.[0]?.['institutionId'];
      const classrooms = await lastValueFrom(this.classroomService.getAllClassroomByInstitute(teacherInstitutionId).pipe(take(1)));
      this.clsSubject.next(classrooms);
      const countryname = await lastValueFrom(this.configurationService.getCountryNameFromCode(user?.countryCode).pipe(first()));
      this.instititutionSub.next(teacherInstitutionId);
      this.country = countryname;
    }

    this.accessLevel = Number(user?.accessLevel);

    this.isLoaded = true;

    this.selectedIndex = 1;
  }

  checkClsSubject() {
    this.clsSubject.subscribe((res) => {
      if (res?.length > 0) {
        this.isActive = true;
      }

      if (res?.length == 0) {
        this.isActive = false;
      }
    });
  }

  // async addUsers(hdata?: any, isTeacher?: any) {
  //   hdata["isTeacher"] = isTeacher
  //   hdata["allClassrooms"] = this.classrooms$
  //   const clRoomData = hdata
  //   await import('../../admin/manage-institute-classroom/add-users/add-users.module').then(() => {
  //     const dialogRef = this.dialog.open(AddUsersComponent, {
  //       data: clRoomData
  //     });
  //   });
  // }

  onStepChange(ev) {
    this.selectedIndex = ev.selectedIndex;
    // this.change.emit(this.selectedIndex);
  }

  catchCountryEvent(event) {
    this.country = event;
  }

}
