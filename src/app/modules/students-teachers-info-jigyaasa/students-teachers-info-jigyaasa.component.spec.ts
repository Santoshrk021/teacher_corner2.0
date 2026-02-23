import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsTeachersInfoJigyaasaComponent } from './students-teachers-info-jigyaasa.component';

describe('StudentsTeachersInfoJigyaasaComponent', () => {
  let component: StudentsTeachersInfoJigyaasaComponent;
  let fixture: ComponentFixture<StudentsTeachersInfoJigyaasaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentsTeachersInfoJigyaasaComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentsTeachersInfoJigyaasaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
