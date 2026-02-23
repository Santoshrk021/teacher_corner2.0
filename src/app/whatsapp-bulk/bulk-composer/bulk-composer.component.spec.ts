import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BulkComposerComponent } from './bulk-composer.component';

describe('BulkComposerComponent', () => {
  let component: BulkComposerComponent;
  let fixture: ComponentFixture<BulkComposerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BulkComposerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BulkComposerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
