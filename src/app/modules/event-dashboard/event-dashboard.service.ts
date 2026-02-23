import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EventDashboardService {
  eventInfo;
  eventInfoBSub=new BehaviorSubject(null);
  constructor() { }
}
