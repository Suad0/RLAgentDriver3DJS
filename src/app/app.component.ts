import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {MainThreeSceneComponent} from './components/main-three-scene/main-three-scene.component';
import * as THREE from 'three';
import {RLDashboardComponent} from './components/rl-dashboard/rl-dashboard.component';
import {RlMainSceneComponent} from './components/rl-main-scene/rl-main-scene.component';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MainThreeSceneComponent, RLDashboardComponent, RlMainSceneComponent],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'RLAgentDriver3D';
}
