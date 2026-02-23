import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ContestDashboardService {
  contestInfo;
  isSpectatorIsATeacher=false;
  selectedInstitution;
  isNominationDashBoard=false;
  constructor() { }
}
