import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import {RLQLearningService} from '../../services/rlqlearning.service';

interface CarControls {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

interface Obstacle {
  mesh: THREE.Mesh;
  type: 'cone' | 'barrier' | 'movingBox';
  speed?: number; // For moving obstacles
  rotationSpeed?: number; // For rotating obstacles
  direction?: THREE.Vector3; // For moving obstacles
}

@Component({
  selector: 'app-main-three-scene',
  template: `
    <div class="menu">
      <button (click)="selectMode('car')">Drive Car</button>
      <button (click)="selectMode('tieFighter')">Fly Tie Fighter</button>
    </div>
    <canvas #threejs></canvas>
  `,
  standalone: true,
  styles: [`
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }

    .menu {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
    }

    .menu button {
      margin: 5px;
      padding: 10px 20px;
      font-size: 16px;
      cursor: pointer;
    }
  `]
})
export class MainThreeSceneComponent implements AfterViewInit {

  @ViewChild('threejs', {static: true})
  canvas!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private orbitControls!: OrbitControls;


  private car!: THREE.Group;
  private carControls: CarControls = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };

  private cameraMode: 'follow' | 'orbit' = 'follow';

  private carPhysics = {
    speed: 0,
    maxSpeed: 3,
    acceleration: 0.01,
    deceleration: 0.1,
    turnSpeed: 0.025,
    friction: 0.95
  };

  private currentMode: 'car' | 'tieFighter' = 'car';
  private tieFighter!: THREE.Group;
  private tieFighterControls = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
    rotateLeft: false,
    rotateRight: false,
    rotateUp: false,
    rotateDown: false,
    rollLeft: false,
    rollRight: false
  };


  private obstacles: Obstacle[] = [];
  private score: number = 0;

  private terrain!: THREE.Mesh;
  private track!: THREE.Mesh;

  // Reinforcement Learning


  constructor(private rlService: RLQLearningService) {
  }

  ngAfterViewInit(): void {
    this.initScene();
    this.loadModels();
    this.createRaceTrack();
    this.setupKeyboardControls();
    this.setupCameraControls();


    this.animate();
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x444444);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas.nativeElement,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, 10);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    this.scene.add(directionalLight);

    const gridHelper = new THREE.GridHelper(50, 50);
    this.scene.add(gridHelper);
  }

  private setupCameraControls(): void {
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.1;
    this.orbitControls.maxDistance = 20;
    this.orbitControls.minDistance = 5;
  }

  private loadModels(): void {
    const loader = new GLTFLoader();

    // Load the car model
    loader.load('models/CarAnimationWheels.glb', (gltf) => {
      this.car = gltf.scene;
      this.car.scale.set(0.5, 0.5, 0.5);
      this.car.position.set(0, 0, 0);
      this.scene.add(this.car);
    });

    // Load the Tie Fighter model
    loader.load('models/TieFighter.glb', (gltf) => {
      this.tieFighter = gltf.scene;
      this.tieFighter.scale.set(0.5, 0.5, 0.5);
      this.tieFighter.position.set(5, 0, 0);
      this.scene.add(this.tieFighter);
    });
  }

  selectMode(mode: 'car' | 'tieFighter'): void {
    this.currentMode = mode;
    if (mode === 'car') {
      this.cameraMode = 'follow';
    } else if (mode === 'tieFighter') {
      this.cameraMode = 'orbit'; // Or create a new mode for flight
    }
  }


  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    window.addEventListener('keyup', (event) => this.handleKeyUp(event));
  }


  private handleKeyDown(event: KeyboardEvent): void {
    if (this.currentMode === 'car') {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.carControls.forward = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.carControls.backward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.carControls.left = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.carControls.right = true;
          break;
      }
    } else if (this.currentMode === 'tieFighter') {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.tieFighterControls.forward = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.tieFighterControls.backward = true;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.tieFighterControls.rotateLeft = true;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.tieFighterControls.rotateRight = true;
          break;
        case 'KeyQ':
          this.tieFighterControls.rollLeft = true;
          break;
        case 'KeyE':
          this.tieFighterControls.rollRight = true;
          break;
        case 'Space':
          this.tieFighterControls.up = true;
          break;
        case 'ShiftLeft':
          this.tieFighterControls.down = true;
          break;
      }
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (this.currentMode === 'car') {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.carControls.forward = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.carControls.backward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.carControls.left = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.carControls.right = false;
          break;
      }
    } else if (this.currentMode === 'tieFighter') {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          this.tieFighterControls.forward = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          this.tieFighterControls.backward = false;
          break;
        case 'ArrowLeft':
        case 'KeyA':
          this.tieFighterControls.rotateLeft = false;
          break;
        case 'ArrowRight':
        case 'KeyD':
          this.tieFighterControls.rotateRight = false;
          break;
        case 'KeyQ':
          this.tieFighterControls.rollLeft = false;
          break;
        case 'KeyE':
          this.tieFighterControls.rollRight = false;
          break;
        case 'Space':
          this.tieFighterControls.up = false;
          break;
        case 'ShiftLeft':
          this.tieFighterControls.down = false;
          break;
      }
    }
  }


  private trackDimensions = {
    width: 10,
    height: 0.1,
    length: 10000
  };

  private createRaceTrack(): void {
    // Create the main track
    const trackGeometry = new THREE.BoxGeometry(this.trackDimensions.width, this.trackDimensions.height, this.trackDimensions.length);
    const trackMaterial = new THREE.MeshStandardMaterial({color: 0x555555});
    this.track = new THREE.Mesh(trackGeometry, trackMaterial);
    this.track.position.set(0, 0, 0); // Center the track
    this.scene.add(this.track);

    // Create boundaries
    const boundaryHeight = 0.5;
    const boundaryMaterial = new THREE.MeshStandardMaterial({color: 0x000000});

    const leftBoundaryGeometry = new THREE.BoxGeometry(0.2, boundaryHeight, this.trackDimensions.length);
    const leftBoundary = new THREE.Mesh(leftBoundaryGeometry, boundaryMaterial);
    leftBoundary.position.set(-this.trackDimensions.width / 2 - 0.1, boundaryHeight / 2, 0);
    this.scene.add(leftBoundary);

    const rightBoundary = new THREE.Mesh(leftBoundaryGeometry, boundaryMaterial);
    rightBoundary.position.set(this.trackDimensions.width / 2 + 0.1, boundaryHeight / 2, 0);
    this.scene.add(rightBoundary);

    // Create start and finish lines
    const lineWidth = this.trackDimensions.width; // Same width as the track
    const lineHeight = 0.1; // Height of the line
    const lineLength = 1; // Length of the line

    const startFinishMaterial = new THREE.MeshStandardMaterial({color: 0xff0000}); // Red color for the line

    // Start line
    const startLineGeometry = new THREE.BoxGeometry(lineWidth, lineHeight, lineLength);
    const startLine = new THREE.Mesh(startLineGeometry, startFinishMaterial);
    startLine.position.set(0, lineHeight / 2, -this.trackDimensions.length / 2); // Position at the start
    this.scene.add(startLine);

    // Finish line
    const finishLine = new THREE.Mesh(startLineGeometry, startFinishMaterial);
    finishLine.position.set(0, lineHeight / 2, this.trackDimensions.length / 2); // Position at the finish
    this.scene.add(finishLine);

    // Create road markings (dashed lines)
    const markingMaterial = new THREE.MeshStandardMaterial({color: 0xffffff});
    const markingWidth = 0.2;
    const markingLength = 2;

    for (let i = -this.trackDimensions.length / 2; i < this.trackDimensions.length / 2; i += 5) {
      const markingGeometry = new THREE.BoxGeometry(markingWidth, 0.01, markingLength);
      const marking = new THREE.Mesh(markingGeometry, markingMaterial);
      marking.position.set(0, 0.1, i); // Position in the center of the track
      this.scene.add(marking);
    }

    // Create initial obstacles
    this.createInitialObstacles();
  }

  private createInitialObstacles(): void {
    const obstacleSpacing = 20; // Space between obstacles
    const obstacleCount = Math.floor(this.trackDimensions.length / obstacleSpacing);

    for (let i = 0; i < obstacleCount; i++) {
      const zPosition = -this.trackDimensions.length / 2 + i * obstacleSpacing;
      const obstacleType = this.getRandomObstacleType();
      const xPosition = (Math.random() - 0.5) * this.trackDimensions.width; // Random x position within track width
      this.createObstacle(obstacleType, xPosition, 0.5, zPosition);
    }
  }

  private spawnObstacles(): void {
    const spawnInterval = 2000; // milliseconds
    setInterval(() => {
      const obstacleType = this.getRandomObstacleType();
      const x = (Math.random() - 0.5) * this.trackDimensions.width; // Adjusted to use the track width
      const z = this.track.position.z + this.trackDimensions.length + 10; // Use the stored length
      this.createObstacle(obstacleType, x, 0.5, z);
    }, spawnInterval);
  }

  private createObstacle(
    type: 'cone' | 'barrier' | 'movingBox',
    x: number,
    y: number,
    z: number,
    speed?: number,
    direction?: THREE.Vector3
  ): void {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (type) {
      case 'cone':
        geometry = new THREE.ConeGeometry(0.5, 1, 32);
        material = new THREE.MeshStandardMaterial({color: 0xff0000});
        break;
      case 'barrier':
        geometry = new THREE.BoxGeometry(2, 2, 0.5);
        material = new THREE.MeshStandardMaterial({color: 0x0000ff});
        break;
      case 'movingBox':
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshStandardMaterial({color: 0xffff00});
        break;
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);

    const obstacle: Obstacle = {mesh, type};
    if (speed) obstacle.speed = speed;
    if (direction) obstacle.direction = direction;

    this.obstacles.push(obstacle);
    this.scene.add(mesh);
  }


  private getRandomObstacleType(): 'cone' | 'barrier' | 'movingBox' {
    const types: ('cone' | 'barrier' | 'movingBox')[] = ['cone', 'barrier', 'movingBox'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private updateObstacles(): void {
    this.obstacles.forEach(obstacle => {
      switch (obstacle.type) {
        case 'movingBox':
          if (obstacle.speed && obstacle.direction) {
            obstacle.mesh.position.addScaledVector(obstacle.direction, obstacle.speed);
            // Reverse direction when hitting boundaries
            if (obstacle.mesh.position.z > this.track.position.z + this.trackDimensions.length / 2) {
              obstacle.direction.z *= -1;
            }
            if (obstacle.mesh.position.z < this.track.position.z - this.trackDimensions.length / 2) {
              obstacle.direction.z *= -1;
            }
          }
          break;
        case 'barrier':
          // Optionally, you can add rotation or other animations for barriers
          obstacle.mesh.rotation.y += 0.01; // Example rotation
          break;
      }
    });
  }

  private checkObstacleCollisions(): void {
    if (!this.car) return;

    this.obstacles.forEach(obstacle => {
      if (this.car.position.distanceTo(obstacle.mesh.position) < 1) {
        console.log('Collision detected!');
        this.carPhysics.speed *= 0.5; // Slow down the car
        this.score -= 10; // Deduct points for collision
      }
    });
  }

  private updateMovement(): void {
    if (this.currentMode === 'car') {
      this.updateCarMovement();
    } else if (this.currentMode === 'tieFighter') {
      this.updateTieFighterMovement();
    }
  }


  private updateTieFighterMovement(): void {
    if (!this.tieFighter) return;

    const direction = new THREE.Vector3();
    const rotation = new THREE.Euler(0, 0, 0);

    // Translate
    if (this.tieFighterControls.forward) direction.z -= 0.1;
    if (this.tieFighterControls.backward) direction.z += 0.1;
    if (this.tieFighterControls.left) direction.x -= 0.1;
    if (this.tieFighterControls.right) direction.x += 0.1;
    if (this.tieFighterControls.up) direction.y += 0.1;
    if (this.tieFighterControls.down) direction.y -= 0.1;

    // Rotate
    if (this.tieFighterControls.rotateLeft) rotation.y += 0.05;
    if (this.tieFighterControls.rotateRight) rotation.y -= 0.05;
    if (this.tieFighterControls.rotateUp) rotation.x += 0.05;
    if (this.tieFighterControls.rotateDown) rotation.x -= 0.05;
    if (this.tieFighterControls.rollLeft) rotation.z += 0.05;
    if (this.tieFighterControls.rollRight) rotation.z -= 0.05;

    // Apply translation
    direction.applyEuler(this.tieFighter.rotation);
    this.tieFighter.position.add(direction);

    // Apply rotation
    this.tieFighter.rotation.x += rotation.x;
    this.tieFighter.rotation.y += rotation.y;
    this.tieFighter.rotation.z += rotation.z;
  }


  private updateCarMovement(): void {
    if (!this.car) return;

    if (this.carControls.forward) {
      this.carPhysics.speed = Math.min(
        this.carPhysics.speed + this.carPhysics.acceleration,
        this.carPhysics.maxSpeed
      );
    } else if (this.carControls.backward) {
      this.carPhysics.speed = Math.max(
        this.carPhysics.speed - this.carPhysics.acceleration,
        -this.carPhysics.maxSpeed / 2
      );
    } else {
      this.carPhysics.speed *= this.carPhysics.friction;
    }

    if (this.carControls.left) {
      this.car.rotation.y += this.carPhysics.turnSpeed;
    }
    if (this.carControls.right) {
      this.car.rotation.y -= this.carPhysics.turnSpeed;
    }

    const moveDirection = new THREE.Vector3(
      Math.sin(this.car.rotation.y) * this.carPhysics.speed,
      0,
      Math.cos(this.car.rotation.y) * this.carPhysics.speed
    );

    this.car.position.add(moveDirection);
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    if (!this.car) return;

    if (this.cameraMode === 'follow') {
      const cameraOffset = new THREE.Vector3(0, 3, -5);
      const rotatedOffset = cameraOffset.applyQuaternion(this.car.quaternion);
      this.camera.position.copy(this.car.position).add(rotatedOffset);
      this.camera.lookAt(this.car.position);
    } else {
      this.orbitControls.update();
    }
  }


  private displayScore(): void {
    console.log(`Score: ${this.score}`);
  }

  private increaseScore(): void {
    this.score += 5;
    this.displayScore();
  }

  // Call this method when the game starts
  private startGame(): void {
    this.spawnObstacles();
    this.score = 0;
    this.displayScore();
  }


  private animate = (): void => {
    requestAnimationFrame(this.animate);

    this.updateMovement();


    this.updateObstacles();
    this.checkObstacleCollisions();

    this.renderer.render(this.scene, this.camera);
  };


  // RL Stuff *****************************************************************

  /*

  private async updateAutonomousMovement() {
    if (!this.car) return;

    const currentState = this.getCurrentCarState();
    const processedState = this.rlService.preprocessState(currentState);

    const action = this.rlService.selectAction(processedState);
    this.executeActionFromModel(action);

    const reward = this.calculateReward(currentState);

    const nextState = this.getCurrentCarState();
    const processedNextState = this.rlService.preprocessState(nextState);

    this.rlService.addExperience(
      processedState,
      action,
      reward,
      processedNextState
    );

    await this.rlService.trainModel();
  }

  private executeActionFromModel(action: number) {
    // Reset previous controls
    this.carControls = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    switch (action) {
      case 0: // Accelerate
        this.carControls.forward = true;
        break;
      case 1: // Brake
        this.carControls.backward = true;
        break;
      case 2: // Turn Left
        this.carControls.left = true;
        break;
      case 3: // Turn Right
        this.carControls.right = true;
        break;
    }
  }

  private async saveModelPeriodically() {
    setInterval(async () => {
      await this.rlService.saveModel('./model/car_driver_model');
    }, 5 * 60 * 1000); // Save every 5 minutes
  }

   */


  @HostListener('window:resize')
  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}


/*
import { Component, OnInit, OnDestroy } from '@angular/core';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { RLQLearningService, CarState, Experience } from '../../services/rlqlearning.service';

interface Obstacle {
  mesh: THREE.Mesh;
  type: 'cone' | 'barrier' | 'movingBox';
  speed?: number;
  direction?: THREE.Vector3;
}

@Component({
  selector: 'app-main-three-scene',
  template: `
    <div class="scene-controls">
      <button (click)="toggleAutonomousMode()">
        {{ isAutonomousMode ? 'Manual Control' : 'Autonomous Mode' }}
      </button>
      <button (click)="resetScene()">Reset Scene</button>
    </div>
    <canvas #threejs></canvas>
  `,
  styles: [`
    .scene-controls {
      position: absolute;
      top: 10px;
      left: 10px;
      z-index: 1000;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
  `]
})
export class MainThreeSceneComponent implements OnInit, OnDestroy {
  // Scene and Rendering
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private orbitControls: OrbitControls;

  // Car and Movement
  private car: THREE.Group;
  private carPhysics = {
    speed: 0,
    maxSpeed: 5,
    acceleration: 0.1,
    deceleration: 0.05,
    turnSpeed: 0.05
  };

  // Obstacles and Track
  private obstacles: Obstacle[] = [];
  private track: THREE.Mesh;

  // Reinforcement Learning
  isAutonomousMode = false;
  private autonomousUpdateInterval: any;

  constructor(private rlService: RLQLearningService) {}

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
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
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
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    this.track = new THREE.Mesh(trackGeometry, trackMaterial);
    this.track.rotation.x = -Math.PI / 2;
    this.scene.add(this.track);
  }

  private loadCarModel() {
    const loader = new GLTFLoader();
    loader.load('models/car.glb', (gltf) => {
      this.car = gltf.scene;
      this.car.scale.set(0.5, 0.5, 0.5);
      this.scene.add(this.car);
    });
  }

  private createObstacles() {
    const obstacleTypes = [
      { type: 'cone', color: 0xff0000 },
      { type: 'barrier', color: 0x0000ff },
      { type: 'movingBox', color: 0x00ff00 }
    ];

    for (let i = 0; i < 10; i++) {
      const { type, color } = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
      this.createObstacle(type, color);
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

    const material = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geometry, material);

    // Random positioning
    mesh.position.set(
      (Math.random() - 0.5) * 20,
      0.5,
      (Math.random() * 100) - 50
    );

    this.scene.add(mesh);
    this.obstacles.push({ mesh, type });
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
      position: { x: this.car.position.x, z: this.car.position.z },
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
      position: { x: this.car.position.x, z: this.car.position.z },
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
    }, 100); // Update every 100ms
  }

  private stopAutonomousMode() {
    clearInterval(this.autonomousUpdateInterval);
  }

  resetScene() {
    // Reset car position and speed
    if (this.car) {
      this.car.position.set(0, 0.5, 0);
      this.carPhysics.speed = 0;
    }
    // Reset obstacles and other scene elements as needed
  }
}
 */
