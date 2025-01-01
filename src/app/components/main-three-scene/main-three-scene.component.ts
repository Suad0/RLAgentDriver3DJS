import {AfterViewInit, Component, ElementRef, HostListener, ViewChild} from '@angular/core';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader';
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";

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
    <canvas #threejs></canvas>`,
  standalone: true,
  styles: [`
    canvas {
      width: 100%;
      height: 100%;
      display: block;
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

  private obstacles: Obstacle[] = [];
  private score: number = 0;

  private terrain!: THREE.Mesh;
  private track!: THREE.Mesh;

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
    loader.load('models/CarAnimationWheels.glb', (gltf) => {
      this.car = gltf.scene;
      this.car.scale.set(0.5, 0.5, 0.5);
      this.car.position.set(0, 0, 0);

      this.scene.add(this.car);
    }, undefined, (error) => {
      console.error('An error occurred while loading the model:', error);
    });
  }

  private setupKeyboardControls(): void {
    window.addEventListener('keydown', (event) => this.handleKeyDown(event));
    window.addEventListener('keyup', (event) => this.handleKeyUp(event));
  }

  private handleKeyDown(event: KeyboardEvent): void {
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
  }

  private handleKeyUp(event: KeyboardEvent): void {
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
    const types: ('cone' | 'barrier' | 'movingBox')[] = ['cone', 'barrier', 'movingBox']; // Ensure the array is typed correctly
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

    this.updateCarMovement();


    this.updateObstacles();
    this.checkObstacleCollisions();

    this.renderer.render(this.scene, this.camera);
  };


  @HostListener('window:resize')
  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
