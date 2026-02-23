import { Injectable } from '@angular/core';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { BehaviorSubject, take } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SideNavigationService {

  constructor(
    private classroomsService: ClassroomsService,
    private studentsService: TeacherService,
  ) { }

  classroomNavSubject = new BehaviorSubject(null);

  async classroomSidenav(classroomId) {

    this.classroomsService.get(classroomId);
    const clsPromise = new Promise((resolve) => {
      this.classroomsService.get(classroomId).pipe(take(1)).subscribe((res) => {
        resolve(res);
      });
    });
    const classInfo: any = await clsPromise;

    const arr = {
      id: 'classroom',
      title: 'Classrooms',
      type: 'group',
      icon: 'mat_outline:class',
      children: []
    };

    if (classInfo) {
      arr.children.push({
        id: classInfo.classroomId,
        title: classInfo.classroomName,
        type: 'basic',
        icon: 'mat_outline:attractions',
        // link: '',
      });
    }
    this.classroomNavSubject.next({ 'default': [arr] });
  }

  async classroomSidenavWithLink(classroomId, link) {

    this.classroomsService.get(classroomId);
    const clsPromise = new Promise((resolve) => {
      this.classroomsService.get(classroomId).pipe(take(1)).subscribe((res) => {
        resolve(res);
      });
    });
    const classInfo: any = await clsPromise;

    const arr = {
      id: 'classroom',
      title: 'Classrooms',
      type: 'group',
      icon: 'mat_outline:class',
      children: []
    };

    if (classInfo) {
      arr.children.push({
        id: classInfo.classroomId,
        title: classInfo.classroomName,
        type: 'basic',
        icon: 'mat_outline:attractions',
        link: link,
      });
    }
    this.classroomNavSubject.next({ 'default': [arr] });
  }
}

