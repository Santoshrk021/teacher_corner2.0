import { Component, OnInit } from '@angular/core';
import { MatSelectChange } from '@angular/material/select';
import { MatSlideToggleChange } from '@angular/material/slide-toggle';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-my-tactivity',
  templateUrl: './my-tactivity.component.html',
  styleUrls: ['./my-tactivity.component.scss']
})
export class MyTACtivityComponent implements OnInit {

  filters: {
    categorySlug$: BehaviorSubject<string>;
    query$: BehaviorSubject<string>;
    hideCompleted$: BehaviorSubject<boolean>;
  } = {
      categorySlug$: new BehaviorSubject('all'),
      query$: new BehaviorSubject(''),
      hideCompleted$: new BehaviorSubject(false)
    };

  testProgramme: any = [
    {
      workflowId: 'freemium',
      tacName: 'Body Joints - Ball Socket ',
      tacCode: 'BA02',
      tacVersion: 'EN-V10'
    }
  ];

  classRooms=[
    {'classroomName': 'Demo Classroom 1'},
    {'classroomName': 'Demo Classroom 2'},
    {'classroomName': 'Demo Classroom 3'},
  ];
  selectedClassroom = this.classRooms[0]['classroomName'];

  constructor(
    private router: Router,

  ) { }

  ngOnInit(): void {
  }
  filterByCategory(change: MatSelectChange): void {
    this.filters.categorySlug$.next(change.value);
  }

  filterByQuery(query: string): void {
    this.filters.query$.next(query);
  }

  toggleCompleted(change: MatSlideToggleChange): void {
    this.filters.hideCompleted$.next(change.checked);
  }

  trackByFn(index: number, item: any): any {
    return item.id || index;
  }

  programmeOnClick(cls){
    this.selectedClassroom=cls;
  }

  onClickContinue(tac) {
    this.router.navigate(['my-tactivities', tac.tacCode, tac.tacVersion], { state: tac });

  }
}
