import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClassroomSelectionComponent } from './classroom-selection.component';

describe('ClassroomSelectionComponent', () => {
  let component: ClassroomSelectionComponent;
  let fixture: ComponentFixture<ClassroomSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ClassroomSelectionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClassroomSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
