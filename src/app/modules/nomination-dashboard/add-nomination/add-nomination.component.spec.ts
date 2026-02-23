import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNominationComponent } from './add-nomination.component';

describe('AddNominationComponent', () => {
  let component: AddNominationComponent;
  let fixture: ComponentFixture<AddNominationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddNominationComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddNominationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
