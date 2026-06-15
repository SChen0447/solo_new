import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleSystem } from './particles/ParticleSystem';
import { ControlsPanel } from './ui/ControlsPanel';

class NebulaApp {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls!: OrbitControls;
  private particleSystem!: ParticleSystem;
  private controlsPanel!: ControlsPanel;
  private starField!: THREE.Points;
  private clock: THREE.Clock;
  private animationId: number = 0;

  constructor() {
    this.clock = new THREE.Clock();
    this.init();
    this.animate();
  }

  private init(): void {
    this.initRenderer();
    this.initScene();
    this.initCamera();
    this.initControls();
    this.initLighting();
    this.initStarField();
    this.initParticleSystem();
    this.initUI();
    this.initResize();
  }

  private initRenderer(): void {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x0a0a1a, 1);
    document.body.appendChild(this.renderer.domElement);
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x0a0a1a, 0.008);
  }

  private initCamera(): void {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 10, 45);
    this.camera.lookAt(0, 0, 0);
  }

  private initControls(): void {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;
    this.controls.enablePan = true;
    this.controls.autoRotate = false;
  }

  private initLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.3, 80);
    pointLight.position.set(0, 0, 0);
    this.scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x8A2BE2, 0.15, 60);
    pointLight2.position.set(15, 10, 15);
    this.scene.add(pointLight2);
  }

  private initStarField(): void {
    const starCount = 3000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 80 + Math.random() * 40;

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      starSizes[i] = 0.3 + Math.random() * 0.7;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));

    const starMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        uniform float uPixelRatio;
        uniform float uTime;
        varying float vTwinkle;

        void main() {
          float twinkle = sin(uTime * 2.0 + position.x * 0.5 + position.y * 0.3) * 0.3 + 0.7;
          vTwinkle = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z) * twinkle;
          gl_PointSize = max(gl_PointSize, 0.5);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vTwinkle;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.0, dist) * vTwinkle * 0.8;
          gl_FragColor = vec4(0.9, 0.9, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.scene.add(this.starField);
  }

  private initParticleSystem(): void {
    this.particleSystem = new ParticleSystem(this.scene, 8000);
  }

  private initUI(): void {
    this.controlsPanel = new ControlsPanel(this.particleSystem);
  }

  private initResize(): void {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const deltaTime = this.clock.getDelta();
    const elapsedTime = this.clock.getElapsedTime();

    this.controls.update();

    this.starField.rotation.y += 0.0005;
    (this.starField.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsedTime;

    this.particleSystem.update(deltaTime);
    this.controlsPanel.update();

    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.particleSystem.dispose();
    this.renderer.dispose();
  }
}

new NebulaApp();
