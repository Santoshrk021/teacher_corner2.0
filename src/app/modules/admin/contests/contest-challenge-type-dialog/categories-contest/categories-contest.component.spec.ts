import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CategoriesContestComponent } from './categories-contest.component';

describe('CategoriesContestComponent', () => {
  let component: CategoriesContestComponent;
  let fixture: ComponentFixture<CategoriesContestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CategoriesContestComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CategoriesContestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
