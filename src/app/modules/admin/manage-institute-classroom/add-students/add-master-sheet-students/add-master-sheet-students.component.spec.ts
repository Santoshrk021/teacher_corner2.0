import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMasterSheetStudentsComponent } from './add-master-sheet-students.component';

describe('AddMasterSheetStudentsComponent', () => {
  let component: AddMasterSheetStudentsComponent;
  let fixture: ComponentFixture<AddMasterSheetStudentsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddMasterSheetStudentsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMasterSheetStudentsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
