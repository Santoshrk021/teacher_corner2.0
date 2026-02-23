import { TestBed } from '@angular/core/testing';

import { VisitServiceService } from './visit-service.service';

describe('VisitServiceService', () => {
  let service: VisitServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VisitServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
