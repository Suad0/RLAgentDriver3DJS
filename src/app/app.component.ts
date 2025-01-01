import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {MainThreeSceneComponent} from './components/main-three-scene/main-three-scene.component';
import * as THREE from 'three';



@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MainThreeSceneComponent],
  templateUrl: './app.component.html',
  standalone: true,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'RLAgentDriver3D';
}
