import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentnamePdfEditComponent } from './studentname-pdf-edit.component';

describe('StudentnamePdfEditComponent', () => {
  let component: StudentnamePdfEditComponent;
  let fixture: ComponentFixture<StudentnamePdfEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentnamePdfEditComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentnamePdfEditComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
