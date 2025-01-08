import {Routes} from '@angular/router';
import {RlMainSceneComponent} from './components/rl-main-scene/rl-main-scene.component';
import {MainThreeSceneComponent} from './components/main-three-scene/main-three-scene.component';
import {LandingPageComponent} from './components/landing-page/landing-page.component';

export const routes: Routes = [
  {path: '', component: LandingPageComponent},
  {path: 'manual-drive', component: MainThreeSceneComponent},
  {path: 'ai-drive', component: RlMainSceneComponent},
];
