import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageAssignmentsTrashComponent } from './manage-assignments-trash.component';

describe('ManageAssignmentsTrashComponent', () => {
  let component: ManageAssignmentsTrashComponent;
  let fixture: ComponentFixture<ManageAssignmentsTrashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageAssignmentsTrashComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageAssignmentsTrashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
