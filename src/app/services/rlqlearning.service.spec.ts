import { TestBed } from '@angular/core/testing';

import { RLQLearningService } from './rlqlearning.service';

describe('RLQLearningService', () => {
  let service: RLQLearningService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RLQLearningService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
