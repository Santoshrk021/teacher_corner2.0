import { TestBed } from '@angular/core/testing';

import { WhatsappSenderService } from './whatsapp-sender.service';

describe('WhatsappSenderService', () => {
  let service: WhatsappSenderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WhatsappSenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
