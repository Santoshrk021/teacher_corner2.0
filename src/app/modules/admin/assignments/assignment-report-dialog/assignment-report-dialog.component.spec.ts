import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignmentReportDialogComponent } from './assignment-report-dialog.component';

describe('AssignmentReportDialogComponent', () => {
  let component: AssignmentReportDialogComponent;
  let fixture: ComponentFixture<AssignmentReportDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AssignmentReportDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignmentReportDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
