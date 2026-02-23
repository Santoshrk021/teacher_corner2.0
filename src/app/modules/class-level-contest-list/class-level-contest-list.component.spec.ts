import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassLevelContestListComponent } from './class-level-contest-list.component';

describe('ClassLevelContestListComponent', () => {
  let component: ClassLevelContestListComponent;
  let fixture: ComponentFixture<ClassLevelContestListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClassLevelContestListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassLevelContestListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
