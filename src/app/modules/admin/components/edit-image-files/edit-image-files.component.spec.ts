import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditImageFilesComponent } from './edit-image-files.component';

describe('EditImageFilesComponent', () => {
  let component: EditImageFilesComponent;
  let fixture: ComponentFixture<EditImageFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ EditImageFilesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditImageFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
