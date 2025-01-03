import {Component, OnInit, OnDestroy} from '@angular/core';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls';
import {RLQLearningService, CarState, Experience} from '../../services/rlqlearning.service';

interface Obstacle {
  mesh: THREE.Mesh;
  type: 'cone' | 'barrier' | 'movingBox';
  speed?: number;
  direction?: THREE.Vector3;
}

@Component({
  selector: 'app-rl-main-scene',
  imports: [],
  templateUrl: './rl-main-scene.component.html',
  standalone: true,
  styleUrl: './rl-main-scene.component.css'
})
export class RlMainSceneComponent implements OnInit, OnDestroy {

  // Scene and Rendering
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private orbitControls!: OrbitControls;

  // Car and Movement
  private car!: THREE.Group;
  private carPhysics = {
    speed: 0,
    maxSpeed: 5,
    acceleration: 0.1,
    deceleration: 0.05,
    turnSpeed: 0.05
  };

  // Obstacles and Track
  private obstacles: Obstacle[] = [];
  private track!: THREE.Mesh;

  // Reinforcement Learning
  isAutonomousMode = false;
  private autonomousUpdateInterval: any;


  constructor(private rlService: RLQLearningService) {
  }

  ngOnInit() {
    this.initScene();
    this.createTrack();
    this.loadCarModel();
    this.createObstacles();
    this.setupControls();
    this.animate();
  }

  ngOnDestroy() {
    this.stopAutonomousMode();
  }

  private initScene() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(ambientLight, directionalLight);
  }

  private createTrack() {
    const trackGeometry = new THREE.PlaneGeometry(20, 100);
    const trackMaterial = new THREE.MeshStandardMaterial({color: 0x555555});
    this.track = new THREE.Mesh(trackGeometry, trackMaterial);
    this.track.rotation.x = -Math.PI / 2;
    this.scene.add(this.track);
  }

  private loadCarModel() {
    const loader = new GLTFLoader();
    loader.load('models/CarAnimationWheels.glb', (gltf) => {
      this.car = gltf.scene;
      this.car.scale.set(0.5, 0.5, 0.5);
      this.scene.add(this.car);
    });
  }

  private isObstacleType(type: string): type is 'cone' | 'barrier' | 'movingBox' {
    return ['cone', 'barrier', 'movingBox'].includes(type);
  }

  private createObstacles() {
    const obstacleTypes = [
      {type: 'cone', color: 0xff0000},
      {type: 'barrier', color: 0x0000ff},
      {type: 'movingBox', color: 0x00ff00}
    ];

    for (let i = 0; i < 10; i++) {
      const {type, color} = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      if (this.isObstacleType(type)) {

        this.createObstacle(type, color);
      }
    }
  }

  private createObstacle(type: 'cone' | 'barrier' | 'movingBox', color: number) {
    let geometry: THREE.BufferGeometry;
    switch (type) {
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        break;
      case 'barrier':
        geometry = new THREE.BoxGeometry(2, 1, 0.5);
        break;
      case 'movingBox':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        break;
    }

    const material = new THREE.MeshStandardMaterial({color});
    const mesh = new THREE.Mesh(geometry, material);

    // Random positioning
    mesh.position.set(
      (Math.random() - 0.5) * 20,
      0.5,
      (Math.random() * 100) - 50
    );

    this.scene.add(mesh);
    this.obstacles.push({mesh, type});
  }

  private setupControls() {
    // Keyboard controls for manual mode
    window.addEventListener('keydown', this.handleKeyDown.bind(this));
    window.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.isAutonomousMode) return;

    switch (event.code) {
      case 'ArrowUp':
        this.carPhysics.speed = Math.min(
          this.carPhysics.speed + this.carPhysics.acceleration,
          this.carPhysics.maxSpeed
        );
        break;
      case 'ArrowDown':
        this.carPhysics.speed = Math.max(
          this.carPhysics.speed - this.carPhysics.acceleration,
          -this.carPhysics.maxSpeed / 2
        );
        break;
      case 'ArrowLeft':
        this.car.rotation.y += this.carPhysics.turnSpeed;
        break;
      case 'ArrowRight':
        this.car.rotation.y -= this.carPhysics.turnSpeed;
        break;
    }
  }

  private handleKeyUp(event: KeyboardEvent) {
    // Implement deceleration or other key up behaviors
  }

  private updateCarMovement() {
    if (!this.car) return;

    // Movement based on current speed and rotation
    const moveDirection = new THREE.Vector3(
      Math.sin(this.car.rotation.y) * this.carPhysics.speed,
      0,
      Math.cos(this.car.rotation.y) * this.carPhysics.speed
    );

    this.car.position.add(moveDirection);

    // Camera follow
    this.camera.position.lerp(
      new THREE.Vector3(
        this.car.position.x,
        this.camera.position.y,
        this.car.position.z + 10
      ),
      0.1
    );
    this.camera.lookAt(this.car.position);
  }

  private updateAutonomousDriving() {
    if (!this.car) return;

    const carState: CarState = {
      position: {x: this.car.position.x, z: this.car.position.z},
      velocity: this.carPhysics.speed,
      obstacleDistances: this.calculateObstacleDistances(),
      trackPosition: this.car.position.z
    };

    const stateArray = this.rlService.preprocessState(carState);
    const action = this.rlService.selectAction(stateArray);

    this.performAction(action);
    this.rlService.addExperience(stateArray, action, this.calculateReward(), this.calculateNextState());
  }

  private calculateObstacleDistances(): number[] {
    // Calculate distances to obstacles
    return this.obstacles.map(obstacle => {
      const distance = this.car.position.distanceTo(obstacle.mesh.position);
      return distance < 20 ? distance : 20; // Cap distance for normalization
    });
  }

  private performAction(action: number) {
    switch (action) {
      case 0: // Accelerate
        this.carPhysics.speed = Math.min(this.carPhysics.speed + this.carPhysics.acceleration, this.carPhysics.maxSpeed);
        break;
      case 1: // Decelerate
        this.carPhysics.speed = Math.max(this.carPhysics.speed - this.carPhysics.deceleration, 0);
        break;
      case 2: // Turn left
        this.car.rotation.y += this.carPhysics.turnSpeed;
        break;
      case 3: // Turn right
        this.car.rotation.y -= this.carPhysics.turnSpeed;
        break;
    }
  }

  private calculateReward(): number {
    // Reward function based on car's performance
    return this.carPhysics.speed; // Example: reward based on speed
  }

  private calculateNextState(): number[] {
    // Return the next state for experience replay
    return this.rlService.preprocessState({
      position: {x: this.car.position.x, z: this.car.position.z},
      velocity: this.carPhysics.speed,
      obstacleDistances: this.calculateObstacleDistances(),
      trackPosition: this.car.position.z
    });
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.updateCarMovement();

    if (this.isAutonomousMode) {
      this.updateAutonomousDriving();
    }

    this.renderer.render(this.scene, this.camera);
  }

  toggleAutonomousMode() {
    this.isAutonomousMode = !this.isAutonomousMode;

    if (this.isAutonomousMode) {
      this.startAutonomousDriving();
    } else {
      this.stopAutonomousMode();
    }
  }

  private startAutonomousDriving() {
    this.autonomousUpdateInterval = setInterval(() => {
      this.updateAutonomousDriving();
    }, 100);
  }

  private stopAutonomousMode() {
    clearInterval(this.autonomousUpdateInterval);
  }

  resetScene() {
    if (this.car) {
      this.car.position.set(0, 0.5, 0);
      this.carPhysics.speed = 0;
    }
  }


}
