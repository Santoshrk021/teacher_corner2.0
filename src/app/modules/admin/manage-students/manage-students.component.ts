import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-manage-students',
  templateUrl: './manage-students.component.html',
  styleUrls: ['./manage-students.component.scss']
})
export class ManageStudentsComponent implements OnInit {

  institutionInfo: any;
  selectedIndex: number;
  instititutionSub = new BehaviorSubject(null);

  constructor(
    public dialog: MatDialog,
  ) {
  }

  ngOnInit(): void {
    this.selectedIndex = 1;
  }

  catchInstitutionInfoEvent(event) {
    this.institutionInfo = event;
  }

}
