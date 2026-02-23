import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { ContestService } from 'app/core/dbOperations/contests/contest.service';

@Injectable({
  providedIn: 'root'
})
export class ContestConfigureWorkflowResolver implements Resolve<any> {

  constructor(
    private contestService: ContestService,
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {
    const contestId = route.queryParams.contestId;
    if (contestId) {
      // Return the observable directly, the router will handle the subscription
      return this.contestService.get(contestId);
    } else {
      // Handle the case where contestId is not provided
      return of(null);  // Use `of(null)` to return an empty observable
    }
  }
}
