import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StudentsCertificateRawpdfUploadComponent } from './students-certificate-rawpdf-upload.component';

describe('StudentsCertificateRawpdfUploadComponent', () => {
  let component: StudentsCertificateRawpdfUploadComponent;
  let fixture: ComponentFixture<StudentsCertificateRawpdfUploadComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StudentsCertificateRawpdfUploadComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StudentsCertificateRawpdfUploadComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
