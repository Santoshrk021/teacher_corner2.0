import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsCustomCertificateComponent } from './students-custom-certificate.component';

describe('StudentsCustomCertificateComponent', () => {
  let component: StudentsCustomCertificateComponent;
  let fixture: ComponentFixture<StudentsCustomCertificateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentsCustomCertificateComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentsCustomCertificateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
