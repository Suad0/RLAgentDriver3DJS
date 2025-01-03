import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RlMainSceneComponent } from './rl-main-scene.component';

describe('RlMainSceneComponent', () => {
  let component: RlMainSceneComponent;
  let fixture: ComponentFixture<RlMainSceneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RlMainSceneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RlMainSceneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
