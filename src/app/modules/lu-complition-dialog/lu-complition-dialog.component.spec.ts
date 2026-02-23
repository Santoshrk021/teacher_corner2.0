import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LuComplitionDialogComponent } from './lu-complition-dialog.component';

describe('LuComplitionDialogComponent', () => {
  let component: LuComplitionDialogComponent;
  let fixture: ComponentFixture<LuComplitionDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LuComplitionDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LuComplitionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
