import {Component} from '@angular/core';
import {Router} from '@angular/router';
import {MainThreeSceneComponent} from '../main-three-scene/main-three-scene.component';
import {RLDashboardComponent} from '../rl-dashboard/rl-dashboard.component';
import {RlMainSceneComponent} from '../rl-main-scene/rl-main-scene.component';

@Component({
  selector: 'app-landing-page',
  imports: [
    MainThreeSceneComponent,
    RLDashboardComponent,
    RlMainSceneComponent
  ],
  templateUrl: './landing-page.component.html',
  standalone: true,
  styleUrl: './landing-page.component.css'
})
export class LandingPageComponent {

  constructor(private router: Router) {
  }

  onManualDrive() {
    console.log('Manual driving selected.');
    this.router.navigate(['/manual-drive']); // Navigate to the manual driving scene
  }

  onRLDrive() {
    console.log('RL driving selected.');
    this.router.navigate(['/ai-drive']);
  }


}
