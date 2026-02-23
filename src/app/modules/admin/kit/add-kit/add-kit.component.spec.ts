import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddKitComponent } from './add-kit.component';

describe('AddKitComponent', () => {
  let component: AddKitComponent;
  let fixture: ComponentFixture<AddKitComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AddKitComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddKitComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
