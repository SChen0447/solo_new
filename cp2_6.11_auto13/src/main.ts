import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PhysicsEngine } from './core/PhysicsEngine';
import { StarField } from './rendering/StarField';
import { ControlPanel } from './ui/ControlPanel';
import { INITIAL_STAR_COUNT } from './utils/constants';

class GalaxySimulator {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private physicsEngine: PhysicsEngine;
  private starField: StarField;
  private controlPanel: ControlPanel;
  private clock: THREE.Clock;
  private fpsFrames: number = 0;
  private fpsTime: number = 0;
  private currentFPS: number = 0;
  private totalCollisions: number = 0;
  private container: HTMLElement;
  private animationFrameId: number | null = null;

  constructor() {
    this.clock = new THREE.Clock();

    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('Canvas container not found');
    this.container = container;

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 80, 300);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 20;
    this.controls.maxDistance = 800;
    this.controls.enablePan = true;

    this.starField = new StarField(this.scene);

    this.physicsEngine = new PhysicsEngine();
    this.physicsEngine.setOnUpdate(this.onPhysicsUpdate.bind(this));

    this.controlPanel = new ControlPanel('control-panel', {
      onGravityChange: this.onGravityChange.bind(this),
      onTimeStepChange: this.onTimeStepChange.bind(this),
      onStarCountChange: this.onStarCountChange.bind(this)
    });

    this.addBackgroundStars();

    window.addEventListener('resize', this.onResize.bind(this));

    this.init();
  }

  private addBackgroundStars() {
    const bgGeometry = new THREE.BufferGeometry();
    const bgCount = 2000;
    const positions = new Float32Array(bgCount * 3);

    for (let i = 0; i < bgCount; i++) {
      const radius = 800 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    bgGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const bgMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.5,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: false
    });

    const bgStars = new THREE.Points(bgGeometry, bgMaterial);
    this.scene.add(bgStars);
  }

  private init() {
    this.physicsEngine.init(INITIAL_STAR_COUNT);
    this.physicsEngine.start();
    this.animate();
  }

  private onPhysicsUpdate(data: {
    positions: Float32Array;
    colors: Float32Array;
    sizes: Float32Array;
    collisions: number;
    count: number;
  }) {
    this.starField.updateData(data.positions, data.colors, data.sizes, data.count);
    this.totalCollisions = data.collisions;
    this.controlPanel.updateStarCount(data.count);
    this.controlPanel.updateCollisions(data.collisions);
  }

  private onGravityChange(value: number) {
    this.physicsEngine.setGravitationalConstant(value);
  }

  private onTimeStepChange(value: number) {
    this.physicsEngine.setTimeStep(value);
  }

  private onStarCountChange(value: number) {
    this.physicsEngine.setStarCount(value);
    this.starField.setCount(value);
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    this.fpsFrames++;
    this.fpsTime += delta;
    if (this.fpsTime >= 0.5) {
      this.currentFPS = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
      this.controlPanel.updateFPS(this.currentFPS);
    }

    this.controls.update();
    this.starField.animate(delta);

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    window.removeEventListener('resize', this.onResize.bind(this));
    this.physicsEngine.dispose();
    this.starField.dispose();
    this.controlPanel.dispose();
    this.renderer.dispose();
    this.controls.dispose();
  }
}

let app: GalaxySimulator | null = null;

window.addEventListener('DOMContentLoaded', () => {
  app = new GalaxySimulator();
});

export default GalaxySimulator;
