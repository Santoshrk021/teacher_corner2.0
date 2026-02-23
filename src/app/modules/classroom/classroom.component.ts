import { Component, OnInit } from '@angular/core';
import { FuseLoadingService } from '@fuse/services/loading';

@Component({
  selector: 'app-classroom',
  templateUrl: './classroom.component.html',
  styleUrls: ['./classroom.component.scss']
})
export class ClassRoomComponent implements OnInit {

  constructor(private _fuseLoadingService: FuseLoadingService) { }

  ngOnInit(): void {
    this._fuseLoadingService.hide();
  }

}
