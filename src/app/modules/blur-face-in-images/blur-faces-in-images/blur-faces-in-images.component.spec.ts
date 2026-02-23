import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BlurFacesInImagesComponent } from './blur-faces-in-images.component';

describe('BlurFacesInImagesComponent', () => {
  let component: BlurFacesInImagesComponent;
  let fixture: ComponentFixture<BlurFacesInImagesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BlurFacesInImagesComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BlurFacesInImagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
