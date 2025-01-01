import { TestBed } from '@angular/core/testing';

import { RlServiceService } from './rl-service.service';

describe('RlServiceService', () => {
  let service: RlServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RlServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
