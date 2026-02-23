import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageVendorTrashComponent } from './manage-vendor-trash.component';

describe('ManageVendorTrashComponent', () => {
  let component: ManageVendorTrashComponent;
  let fixture: ComponentFixture<ManageVendorTrashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageVendorTrashComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageVendorTrashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
