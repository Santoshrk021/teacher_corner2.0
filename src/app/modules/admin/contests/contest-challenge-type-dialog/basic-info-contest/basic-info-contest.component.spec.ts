import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasicInfoContestComponent } from './basic-info-contest.component';

describe('BasicInfoContestComponent', () => {
  let component: BasicInfoContestComponent;
  let fixture: ComponentFixture<BasicInfoContestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BasicInfoContestComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BasicInfoContestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
