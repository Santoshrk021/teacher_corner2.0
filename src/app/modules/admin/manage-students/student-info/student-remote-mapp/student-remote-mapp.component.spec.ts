import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentRemoteMappComponent } from './student-remote-mapp.component';

describe('StudentRemoteMappComponent', () => {
  let component: StudentRemoteMappComponent;
  let fixture: ComponentFixture<StudentRemoteMappComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentRemoteMappComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentRemoteMappComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
