import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot, Resolve,
  RouterStateSnapshot
} from '@angular/router';
import { ConfigurationService } from 'app/core/dbOperations/configuration/configuration.service';
import { delay, Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegistrationResolver implements Resolve<any> {
  constructor(private _configureService: ConfigurationService) { }
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<any> {
    // return of(true);
    return of(this._configureService.getAllConfigure()).pipe(delay(1000));
  }
}
