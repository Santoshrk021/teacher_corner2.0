import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContestInteractionComponent } from './contest-interaction.component';

describe('ContestInteractionComponent', () => {
  let component: ContestInteractionComponent;
  let fixture: ComponentFixture<ContestInteractionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ContestInteractionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContestInteractionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
