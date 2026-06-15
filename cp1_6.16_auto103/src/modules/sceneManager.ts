import * as THREE from 'three';
import { EventType, ParticleData, CameraPose, ParticleInfo, eventBus } from './eventBus';

class SceneManager {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private particles: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;
  private particleMaterial: THREE.PointsMaterial | null = null;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private isDragging: boolean = false;
  private previousMousePosition: { x: number; y: number } = { x: 0, y: 0 };
  private angularVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private cameraDistance: number = 150;
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.PI / 4;
  private target: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private dampingFactor: number = 0.8;

  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id ${containerId} not found`);
    }
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0B0C10);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Points = { threshold: 5 };
    this.mouse = new THREE.Vector2();

    this.setupEventListeners();
    this.updateCameraPosition();

    eventBus.on<ParticleData>(EventType.PARTICLE_DATA_UPDATED, this.onParticleDataUpdated.bind(this));
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onResize.bind(this));
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.renderer.domElement.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('click', this.onClick.bind(this));

    this.renderer.domElement.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.renderer.domElement.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.previousMousePosition = { x: e.clientX, y: e.clientY };
      this.angularVelocity = { x: 0, y: 0 };
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMousePosition.x;
      const deltaY = e.clientY - this.previousMousePosition.y;

      this.angularVelocity = {
        x: deltaX * 0.005,
        y: deltaY * 0.005
      };

      this.cameraTheta -= this.angularVelocity.x;
      this.cameraPhi += this.angularVelocity.y;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.updateCameraPosition();

      this.previousMousePosition = { x: e.clientX, y: e.clientY };
    }

    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.cameraDistance += e.deltaY * 0.1;
    this.cameraDistance = Math.max(30, Math.min(400, this.cameraDistance));
    this.updateCameraPosition();
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.angularVelocity = { x: 0, y: 0 };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (this.isDragging && e.touches.length === 1) {
      e.preventDefault();
      const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
      const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

      this.angularVelocity = {
        x: deltaX * 0.005,
        y: deltaY * 0.005
      };

      this.cameraTheta -= this.angularVelocity.x;
      this.cameraPhi += this.angularVelocity.y;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.updateCameraPosition();

      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private onClick(e: MouseEvent): void {
    if (this.particles && this.particleGeometry) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObject(this.particles);

      if (intersects.length > 0) {
        const intersection = intersects[0];
        const index = intersection.index;

        if (index !== undefined) {
          const positions = this.particleGeometry.attributes.position.array as Float32Array;
          const colors = this.particleGeometry.attributes.color.array as Float32Array;

          const i3 = index * 3;

          const particleInfo: ParticleInfo = {
            index,
            position: {
              x: parseFloat(positions[i3].toFixed(2)),
              y: parseFloat(positions[i3 + 1].toFixed(2)),
              z: parseFloat(positions[i3 + 2].toFixed(2))
            },
            color: {
              r: Math.round(colors[i3] * 255),
              g: Math.round(colors[i3 + 1] * 255),
              b: Math.round(colors[i3 + 2] * 255)
            },
            screenX: e.clientX,
            screenY: e.clientY
          };

          eventBus.emit<ParticleInfo>(EventType.PARTICLE_CLICKED, particleInfo);
        }
      }
    }
  }

  private updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);

    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );
    this.camera.lookAt(this.target);

    const cameraPose: CameraPose = {
      position: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z
      },
      target: {
        x: this.target.x,
        y: this.target.y,
        z: this.target.z
      }
    };
    eventBus.emit<CameraPose>(EventType.CAMERA_POSE_UPDATED, cameraPose);
  }

  private onParticleDataUpdated(data: ParticleData): void {
    if (!this.particles) {
      this.createParticles(data);
    } else {
      this.updateParticles(data);
    }
  }

  private createParticles(data: ParticleData): void {
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(data.sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    const texture = new THREE.CanvasTexture(canvas);

    this.particleMaterial = new THREE.PointsMaterial({
      size: 3,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: texture,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particles);
  }

  private updateParticles(data: ParticleData): void {
    if (!this.particleGeometry || !this.particleMaterial) return;

    const positionAttr = this.particleGeometry.attributes.position;
    const colorAttr = this.particleGeometry.attributes.color;
    const sizeAttr = this.particleGeometry.attributes.size;

    if (positionAttr.count !== data.count) {
      this.particleGeometry.dispose();
      this.createParticles(data);
      return;
    }

    const posArray = positionAttr.array as Float32Array;
    const colArray = colorAttr.array as Float32Array;
    const sizeArray = sizeAttr.array as Float32Array;

    posArray.set(data.positions);
    colArray.set(data.colors);
    sizeArray.set(data.sizes);

    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    this.particleGeometry.computeBoundingSphere();
  }

  private animate(currentTime: number): void {
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (!this.isDragging && (Math.abs(this.angularVelocity.x) > 0.001 || Math.abs(this.angularVelocity.y) > 0.001)) {
      const damping = Math.pow(this.dampingFactor, deltaTime * 60);
      this.cameraTheta -= this.angularVelocity.x * deltaTime * 60;
      this.cameraPhi += this.angularVelocity.y * deltaTime * 60;
      this.cameraPhi = Math.max(0.1, Math.min(Math.PI - 0.1, this.cameraPhi));

      this.angularVelocity.x *= damping;
      this.angularVelocity.y *= damping;

      this.updateCameraPosition();
    }

    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      this.animate(time);
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
    this.particleGeometry?.dispose();
    this.particleMaterial?.dispose();
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }
}

export let sceneManager: SceneManager | null = null;

export function initSceneManager(containerId: string): SceneManager {
  sceneManager = new SceneManager(containerId);
  return sceneManager;
}
