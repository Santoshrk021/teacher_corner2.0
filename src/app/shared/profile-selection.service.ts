import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ChildrenService } from './children.service';

@Injectable({
  providedIn: 'root'
})
export class ProfileSelectionService {
  loadedProfiles;
  loadedProfilesSub = new BehaviorSubject({});
  latestProfilesSub = new BehaviorSubject({});

  constructor(private router: Router,
    private childrenServ: ChildrenService) {
    const data = localStorage.getItem('loadedProfiles');
    this.loadedProfiles = JSON.parse(data) || {};
  }

  async selectProfile(child) {
    this.clear();
    const id = child.payload?.doc?.id || localStorage.getItem('childID');
    let selected = this.loadedProfiles[id] || '';
    if (!selected || this.checkExpiry(selected.loadedOn)) {
      selected = await this.childrenServ.buildChildObj(child);
      this.latestProfilesSub.next(selected);
      if (selected.childId)
        {this.loadedProfiles[selected.childId] = { ...selected, loadedOn: new Date() };}
    }
    localStorage.setItem('loadedProfiles', JSON.stringify(this.loadedProfiles));
    localStorage.setItem('childID', selected.childId || id);
    this.loadedProfilesSub.next(this.loadedProfiles);
    this.router.navigate(['/dashboard', selected.data.child_name]);
    return selected;
  }

  checkExpiry(oldTime) {
    const currentTime = new Date().getTime();
    let expired = false;
    if ((oldTime + 3600000) < currentTime) //1hrs expiry time
      {expired = true;}
    return expired;
  }

  clear() {
    this.loadedProfiles = {};
    localStorage.clear();
  }

  getLatestSeletedProfile() {
    const data = this.loadedProfiles;
    const id = localStorage.getItem('childID');
    this.latestProfilesSub.next(data[id]);
    return data[id];
  }
}
