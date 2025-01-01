import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MainThreeSceneComponent } from './main-three-scene.component';

describe('MainThreeSceneComponent', () => {
  let component: MainThreeSceneComponent;
  let fixture: ComponentFixture<MainThreeSceneComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainThreeSceneComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainThreeSceneComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
