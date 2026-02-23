import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewContestComponent } from './review-contest.component';

describe('ReviewContestComponent', () => {
  let component: ReviewContestComponent;
  let fixture: ComponentFixture<ReviewContestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ReviewContestComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewContestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
