import { Injectable } from '@angular/core';
import { ActivatedRoute, ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { ClassroomsService } from 'app/core/dbOperations/classrooms/classrooms.service';
import { TeacherService } from 'app/core/dbOperations/teachers/teachers.service';
import { UserService } from 'app/core/dbOperations/user/user.service';
import { Observable } from 'rxjs';

type accessRule = | { allowed: number[] } | { minimum: number; maximum?: number };

@Injectable({
    providedIn: 'root'
})
export class CheckPermissionGuard implements CanActivate {
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
        return this.checkPermissionLevel(route);
    }

    async checkPermissionLevel(route) {
        const rule = (route?.data?.['access'] as accessRule) ?? { minimum: 0 };
        const id = await this.userService.getUid();
        const checkUserAccessLevel: any = await this.userService.getDocDataById(id);
        const { accessLevel } = checkUserAccessLevel;

        const pass = 'allowed' in rule
            ? rule.allowed.includes(accessLevel)
            : accessLevel >= rule.minimum && accessLevel <= (rule.maximum ?? Number.POSITIVE_INFINITY);

        return pass ? true : this.router.navigate(['/']);
    }
}
