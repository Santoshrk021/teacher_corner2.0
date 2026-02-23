import { Component, OnInit } from '@angular/core';
import { FuseNavigationService, FuseVerticalNavigationComponent } from '@fuse/components/navigation';
import { FuseLoadingService } from '@fuse/services/loading';
import { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs/internal/BehaviorSubject';
@Component({
  selector: 'app-programmes',
  templateUrl: './programmes.component.html',
  styleUrls: ['./programmes.component.scss'],
})
export class ProgrammesComponent implements OnInit {
  stepperdata = new BehaviorSubject(null);
  list: boolean = true;
  subcriptionsRefArr: Subscription[] = [];

  constructor(
    private _fuseNavigationService: FuseNavigationService,
    private _fuseLoadingService: FuseLoadingService) {
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
