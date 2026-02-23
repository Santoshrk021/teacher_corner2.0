import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VisitexportComponent } from './visitexport.component';

describe('VisitexportComponent', () => {
  let component: VisitexportComponent;
  let fixture: ComponentFixture<VisitexportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ VisitexportComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VisitexportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
