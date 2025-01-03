import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RlDashboardComponent } from './rl-dashboard.component';

describe('RlDashboardComponent', () => {
  let component: RlDashboardComponent;
  let fixture: ComponentFixture<RlDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RlDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RlDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
