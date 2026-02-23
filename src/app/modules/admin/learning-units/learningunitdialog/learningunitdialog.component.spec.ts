import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LearningunitdialogComponent } from './learningunitdialog.component';

describe('LearningunitdialogComponent', () => {
  let component: LearningunitdialogComponent;
  let fixture: ComponentFixture<LearningunitdialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LearningunitdialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LearningunitdialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
