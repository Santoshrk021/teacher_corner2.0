import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassroomContestCardComponent } from './classroom-contest-card.component';

describe('ClassroomContestCardComponent', () => {
  let component: ClassroomContestCardComponent;
  let fixture: ComponentFixture<ClassroomContestCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClassroomContestCardComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassroomContestCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
