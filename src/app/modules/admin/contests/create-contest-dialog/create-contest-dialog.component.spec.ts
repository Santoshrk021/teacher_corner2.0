import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateContestDialogComponent } from './create-contest-dialog.component';

describe('CreateContestDialogComponent', () => {
  let component: CreateContestDialogComponent;
  let fixture: ComponentFixture<CreateContestDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CreateContestDialogComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateContestDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
