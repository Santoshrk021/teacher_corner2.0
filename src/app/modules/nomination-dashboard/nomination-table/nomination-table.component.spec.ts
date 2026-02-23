import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NominationTableComponent } from './nomination-table.component';

describe('NominationTableComponent', () => {
  let component: NominationTableComponent;
  let fixture: ComponentFixture<NominationTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NominationTableComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NominationTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
