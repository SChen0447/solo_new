import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LAYER_CONFIG } from './data/bioData';

export interface CreatureRef {
  id: string;
  name: string;
  depthRange: [number, number];
  intro: string;
  layer: 'shallow' | 'middle' | 'deep';
  mesh: THREE.Object3D;
  instancedMesh?: THREE.InstancedMesh;
  instanceIndex?: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  baseY: number;
}

export interface PulseAnimation {
  mesh: THREE.Mesh;
  startTime: number;
  duration: number;
  worldPos: THREE.Vector3;
}

type DepthCallback = (depth: number, worldPos: THREE.Vector3) => void;
type FrameCallback = (delta: number) => void;

export class SceneManager {
  private container: HTMLElement | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private ambientLight: THREE.HemisphereLight | null = null;
  private hemisphereLight: THREE.HemisphereLight | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;

  private creatures: CreatureRef[] = [];
  private pulseAnimations: PulseAnimation[] = [];
  private depthCallbacks: DepthCallback[] = [];
  private frameCallbacks: FrameCallback[] = [];

  private particleSystems: { shallow: THREE.Points; middle: THREE.Points; deep: THREE.Points } | null = null;

  private clock: THREE.Clock = new THREE.Clock();
  private animationFrameId: number = 0;
  private lastDepth: number = 0;

  private readonly MAX_DEPTH = 500;
  private readonly MIN_DEPTH = 0;
  private readonly WORLD_SIZE = 80;

  private frameTimes: number[] = [];
  private fps: number = 60;

  getScene() { return this.scene; }
  getCamera() { return this.camera; }
  getRenderer() { return this.renderer; }
  getCreatures() { return this.creatures; }
  getFPS() { return this.fps; }

  init(container: HTMLElement) {
    this.container = container;
    this.createScene();
    this.createCamera();
    this.createRenderer();
    this.createLights();
    this.createFog();
    this.createParticles();
    this.createControls();
    this.handleResize();
    window.addEventListener('resize', () => this.handleResize());
    this.startAnimationLoop();
    return this;
  }

  private createScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1628);
  }

  private createCamera() {
    if (!this.container) return;
    const { clientWidth, clientHeight } = this.container;
    this.camera = new THREE.PerspectiveCamera(60, clientWidth / clientHeight, 0.1, 2000);
    this.camera.position.set(0, -20, 40);
    this.camera.lookAt(0, -20, 0);
  }

  private createRenderer() {
    if (!this.container) return;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
  }

  private createLights() {
    if (!this.scene) return;

    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x001122, 0.8);
    this.scene.add(this.hemisphereLight);

    this.ambientLight = new THREE.HemisphereLight(0x4ea8de, 0x001122, 0.6);
    this.scene.add(this.ambientLight);

    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.directionalLight.position.set(20, 60, 30);
    this.directionalLight.castShadow = false;
    this.scene.add(this.directionalLight);

    const fillLight = new THREE.DirectionalLight(0x4ea8de, 0.3);
    fillLight.position.set(-30, -20, -30);
    this.scene.add(fillLight);
  }

  private createFog() {
    if (!this.scene) return;
    this.scene.fog = new THREE.FogExp2(0x0a1628, 0.008);
  }

  private createParticles() {
    if (!this.scene) return;

    const createParticleSystem = (count: number, baseY: number, range: number, color: number, size: number) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * this.WORLD_SIZE * 2;
        positions[i * 3 + 1] = -baseY - Math.random() * range;
        positions[i * 3 + 2] = (Math.random() - 0.5) * this.WORLD_SIZE * 2;

        const col = new THREE.Color(color);
        const brightness = 0.3 + Math.random() * 0.7;
        colors[i * 3] = col.r * brightness;
        colors[i * 3 + 1] = col.g * brightness;
        colors[i * 3 + 2] = col.b * brightness;

        sizes[i] = Math.random() * size + 0.5;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      });

      const points = new THREE.Points(geometry, material);
      points.userData = { baseY, range, originalPositions: positions.slice() };
      this.scene!.add(points);
      return points;
    };

    this.particleSystems = {
      shallow: createParticleSystem(300, 0, 50, 0xa8dadc, 1.0),
      middle: createParticleSystem(500, 50, 150, 0x457b9d, 0.8),
      deep: createParticleSystem(800, 200, 300, 0x1d3557, 0.6)
    };
  }

  private createControls() {
    if (!this.camera || !this.renderer) return;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 120;
    this.controls.autoRotate = false;
    this.controls.autoRotateSpeed = 0.3;
    this.controls.target.set(0, -100, 0);
  }

  private handleResize() {
    if (!this.container || !this.camera || !this.renderer) return;
    const { clientWidth, clientHeight } = this.container;
    this.camera.aspect = clientWidth / clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(clientWidth, clientHeight);
  }

  addCreature(creature: CreatureRef) {
    if (!this.scene) return;
    this.creatures.push(creature);
    if (creature.mesh) {
      this.scene.add(creature.mesh);
    }
    if (creature.instancedMesh && !this.creatures.some(c => c.instancedMesh === creature.instancedMesh && c.id !== creature.id)) {
      this.scene.add(creature.instancedMesh);
    }
  }

  removeCreature(creature: CreatureRef) {
    if (!this.scene) return;
    const index = this.creatures.indexOf(creature);
    if (index > -1) {
      this.creatures.splice(index, 1);
      if (creature.mesh) {
        this.scene.remove(creature.mesh);
      }
    }
  }

  triggerPulse(worldPosition: THREE.Vector3, color: number = 0x00ffff) {
    if (!this.scene) return;

    const torusGeometry = new THREE.TorusGeometry(0.5, 0.03, 8, 32);
    const torusMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });

    const torus = new THREE.Mesh(torusGeometry, torusMaterial);
    torus.position.copy(worldPosition);
    torus.lookAt(this.camera?.position || new THREE.Vector3());

    this.scene.add(torus);

    this.pulseAnimations.push({
      mesh: torus,
      startTime: performance.now(),
      duration: 800,
      worldPos: worldPosition.clone()
    });
  }

  private updatePulseAnimations() {
    const now = performance.now();
    const toRemove: number[] = [];

    this.pulseAnimations.forEach((pulse, index) => {
      const elapsed = now - pulse.startTime;
      if (elapsed >= pulse.duration) {
        toRemove.push(index);
        return;
      }

      const progress = elapsed / pulse.duration;
      const scale = 1 + progress * 5;
      const opacity = 1 - progress;

      pulse.mesh.scale.setScalar(scale);
      (pulse.mesh.material as THREE.MeshBasicMaterial).opacity = opacity * 0.8;
      pulse.mesh.position.copy(pulse.worldPos);
      pulse.mesh.lookAt(this.camera?.position || new THREE.Vector3());
    });

    toRemove.reverse().forEach(index => {
      const pulse = this.pulseAnimations[index];
      if (pulse && this.scene) {
        this.scene.remove(pulse.mesh);
        pulse.mesh.geometry.dispose();
        (pulse.mesh.material as THREE.Material).dispose();
      }
      this.pulseAnimations.splice(index, 1);
    });
  }

  private updateWaterColorAndLighting(depth: number) {
    const normalizedDepth = THREE.MathUtils.clamp(depth / this.MAX_DEPTH, 0, 1);

    const shallowColor = new THREE.Color(LAYER_CONFIG.shallow.color);
    const middleColor = new THREE.Color(LAYER_CONFIG.middle.color);
    const deepColor = new THREE.Color(LAYER_CONFIG.deep.color);

    let bgColor: THREE.Color;
    if (normalizedDepth < 0.1) {
      const t = normalizedDepth / 0.1;
      bgColor = shallowColor.clone().lerp(middleColor, t);
    } else if (normalizedDepth < 0.4) {
      const t = (normalizedDepth - 0.1) / 0.3;
      bgColor = middleColor.clone().lerp(deepColor, t);
    } else {
      const t = Math.min((normalizedDepth - 0.4) / 0.6, 1);
      bgColor = deepColor.clone().lerp(new THREE.Color(0x000008), t);
    }

    if (this.scene) {
      this.scene.background = bgColor;
      (this.scene.fog as THREE.FogExp2).color.copy(bgColor);
      const fogDensity = 0.005 + normalizedDepth * 0.015;
      (this.scene.fog as THREE.FogExp2).density = fogDensity;
    }

    const ambientIntensity = 0.8 * Math.exp(-normalizedDepth * 2.5);
    if (this.hemisphereLight) {
      this.hemisphereLight.intensity = ambientIntensity;
    }
    if (this.ambientLight) {
      this.ambientLight.intensity = Math.max(0.08, 0.6 * Math.exp(-normalizedDepth * 3));
    }
    if (this.directionalLight) {
      this.directionalLight.intensity = Math.max(0.1, 0.5 * Math.exp(-normalizedDepth * 2));
    }
  }

  private updateParticles(delta: number) {
    if (!this.particleSystems) return;

    Object.values(this.particleSystems).forEach(system => {
      const positions = system.geometry.attributes.position.array as Float32Array;
      const originalPositions = system.userData.originalPositions as Float32Array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += Math.sin(performance.now() * 0.0002 + originalPositions[i]) * 0.002;
        positions[i + 1] += Math.sin(performance.now() * 0.0003 + originalPositions[i + 1]) * 0.0015;
        positions[i + 2] += Math.cos(performance.now() * 0.00025 + originalPositions[i + 2]) * 0.002;

        if (Math.random() < 0.001) {
          positions[i + 1] += 0.05;
        }
      }

      system.geometry.attributes.position.needsUpdate = true;
    });
  }

  private updateCreatures(delta: number) {
    this.creatures.forEach(creature => {
      const time = performance.now() * 0.001;

      if (creature.mesh) {
        creature.position.add(creature.velocity.clone().multiplyScalar(delta));

        const bobAmount = 1.5;
        const bobSpeed = 1.2 + creature.baseY * 0.002;
        creature.position.y = creature.baseY + Math.sin(time * bobSpeed + creature.position.x * 0.1) * bobAmount;

        const boundary = this.WORLD_SIZE;
        if (creature.position.x > boundary) creature.velocity.x = -Math.abs(creature.velocity.x);
        if (creature.position.x < -boundary) creature.velocity.x = Math.abs(creature.velocity.x);
        if (creature.position.z > boundary) creature.velocity.z = -Math.abs(creature.velocity.z);
        if (creature.position.z < -boundary) creature.velocity.z = Math.abs(creature.velocity.z);

        const minY = -creature.depthRange[1] - 5;
        const maxY = Math.max(-creature.depthRange[0] + 5, -5);
        if (creature.position.y < minY) creature.velocity.y = Math.abs(creature.velocity.y);
        if (creature.position.y > maxY) creature.velocity.y = -Math.abs(creature.velocity.y);

        creature.mesh.position.copy(creature.position);

        const direction = creature.velocity.clone().normalize();
        if (direction.lengthSq() > 0.001) {
          const targetRotation = Math.atan2(direction.x, direction.z);
          creature.mesh.rotation.y = THREE.MathUtils.lerp(creature.mesh.rotation.y, targetRotation, 0.05);
        }

        const wobble = Math.sin(time * 2 + creature.position.x) * 0.05;
        creature.mesh.rotation.z = wobble;

        if (creature.instancedMesh && creature.instanceIndex !== undefined) {
          const matrix = new THREE.Matrix4();
          matrix.copy(creature.mesh.matrix);
          creature.instancedMesh.setMatrixAt(creature.instanceIndex, matrix);
          creature.instancedMesh.instanceMatrix.needsUpdate = true;
        }
      }
    });
  }

  getCurrentDepth(): number {
    if (!this.camera) return 0;
    const depth = THREE.MathUtils.clamp(-this.camera.position.y, this.MIN_DEPTH, this.MAX_DEPTH);
    return depth;
  }

  getPointerDepth(normalizedX: number, normalizedY: number): { depth: number; worldPos: THREE.Vector3 } {
    if (!this.camera) return { depth: 0, worldPos: new THREE.Vector3() };

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(normalizedX, normalizedY), this.camera);

    const planeNormal = new THREE.Vector3(0, 1, 0);
    const planePoint = new THREE.Vector3(0, -100, 0);
    const plane = new THREE.Plane(planeNormal, -planePoint.dot(planeNormal));

    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    const depth = THREE.MathUtils.clamp(-intersectPoint.y, this.MIN_DEPTH, this.MAX_DEPTH);
    return { depth, worldPos: intersectPoint };
  }

  onDepthChange(callback: DepthCallback) {
    this.depthCallbacks.push(callback);
    return () => {
      const idx = this.depthCallbacks.indexOf(callback);
      if (idx > -1) this.depthCallbacks.splice(idx, 1);
    };
  }

  onFrame(callback: FrameCallback) {
    this.frameCallbacks.push(callback);
    return () => {
      const idx = this.frameCallbacks.indexOf(callback);
      if (idx > -1) this.frameCallbacks.splice(idx, 1);
    };
  }

  private startAnimationLoop() {
    const animate = () => {
      this.animationFrameId = requestAnimationFrame(animate);
      const delta = this.clock.getDelta();

      const frameStart = performance.now();

      const currentDepth = this.getCurrentDepth();
      if (Math.abs(currentDepth - this.lastDepth) > 0.5) {
        this.lastDepth = currentDepth;
        const worldPos = this.camera?.position.clone() || new THREE.Vector3();
        this.depthCallbacks.forEach(cb => cb(currentDepth, worldPos));
      }

      this.updateWaterColorAndLighting(currentDepth);
      this.updateParticles(delta);
      this.updateCreatures(delta);
      this.updatePulseAnimations();

      this.frameCallbacks.forEach(cb => cb(delta));

      if (this.controls) {
        this.controls.update();
      }

      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }

      const frameTime = performance.now() - frameStart;
      this.frameTimes.push(frameTime);
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
      const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
      this.fps = Math.round(1000 / avgFrameTime);
    };

    animate();
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener('resize', () => this.handleResize());

    if (this.renderer) {
      this.renderer.dispose();
      if (this.container && this.renderer.domElement.parentNode === this.container) {
        this.container.removeChild(this.renderer.domElement);
      }
    }

    this.creatures.forEach(creature => {
      if (creature.instancedMesh) {
        creature.instancedMesh.geometry.dispose();
        if (Array.isArray(creature.instancedMesh.material)) {
          creature.instancedMesh.material.forEach(m => m.dispose());
        } else {
          creature.instancedMesh.material.dispose();
        }
      }
    });
  }
}
