import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseLoadingService } from '@fuse/services/loading';

@Component({
  selector: 'app-manage-programme-templates',
  templateUrl: './manage-programme-templates.component.html',
  styleUrls: ['./manage-programme-templates.component.scss']
})
export class ManageProgrammeTemplatesComponent implements OnInit {

  stepperdata = new BehaviorSubject(null);
  list: boolean = true;
  subcriptionsRefArr: Subscription[] = [];

  constructor(
    private _fuseNavigationService: FuseNavigationService,
    private _fuseLoadingService: FuseLoadingService
  ) {
  }

  ngOnInit(): void {
    this._fuseLoadingService.hide();
  }

  closeNavigation() {
    const navigation = this._fuseNavigationService.getComponent<FuseVerticalNavigationComponent>('mainNavigation');
    navigation.close();
  }

  ngOnDestroy(): void {
    if (this.subcriptionsRefArr.length) {this.subcriptionsRefArr.map(d => d.unsubscribe());}
  }

  toggleList() {
    this.list = !this.list;
  }

}
