// contest-detail-redirect.guard.ts
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ContestDetailRedirectGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | UrlTree {
    const qpId = route.queryParamMap.get('contestId');
    if (qpId) {
      // redirect to /contests list
      return this.router.createUrlTree(['/contests']);
    }
    return true;
  }
}
