import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KitTrashComponent } from './kit-trash.component';

describe('KitTrashComponent', () => {
  let component: KitTrashComponent;
  let fixture: ComponentFixture<KitTrashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ KitTrashComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(KitTrashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
