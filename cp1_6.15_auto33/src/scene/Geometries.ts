import * as THREE from 'three';
import { ThemeColors } from '../store';

const CUBE_COUNT = 100;
const CUBE_GRID_SIZE = 10;
const CUBE_SIZE = 0.3;
const CUBE_SPACING = 0.5;
const CUBE_MIN_SCALE = 0.5;
const CUBE_MAX_SCALE = 3;
const CUBE_LERP_SPEED = 5;

const SPHERE_COUNT = 200;
const SPHERE_RING_RADIUS = 3;
const SPHERE_SIZE = 0.2;
const SPHERE_ROTATION_MIN = 0;
const SPHERE_ROTATION_MAX = 2;
const SPHERE_SEGMENTS_HIGH = 32;
const SPHERE_SEGMENTS_LOW = 16;

const PARTICLE_LIFETIME = 1.5;
const PARTICLE_SIZE = 0.08;
const PARTICLE_CONE_ANGLE = Math.PI / 3;
const PARTICLES_PER_FRAME = 50;

export interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  lifetime: number;
  maxLifetime: number;
}

export class GeometryManager {
  private cubeGroup: THREE.Group;
  private sphereGroup: THREE.Group;
  private particleSystem: THREE.Points;
  private particles: ParticleData[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private connectingLines: THREE.Line;

  private cubeTargetScales: number[] = [];
  private cubeCurrentScales: number[] = [];
  private sphereRotationSpeed: number = 0;
  private sphereTargetRotationSpeed: number = 0;

  private lodEnabled: boolean = false;
  private maxParticles: number = 100;
  private isPerformanceMode: boolean = false;

  constructor() {
    this.cubeGroup = this.createCubeArray();
    this.sphereGroup = this.createSphereRing();
    
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleSystem = new THREE.Points(
      this.particleGeometry,
      new THREE.PointsMaterial({
        size: PARTICLE_SIZE,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );

    this.connectingLines = this.createConnectingLines();
  }

  private createCubeArray(): THREE.Group {
    const group = new THREE.Group();
    const startOffset = -((CUBE_GRID_SIZE - 1) * CUBE_SPACING) / 2;

    for (let i = 0; i < CUBE_COUNT; i++) {
      const row = Math.floor(i / CUBE_GRID_SIZE);
      const col = i % CUBE_GRID_SIZE;

      const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
      const material = new THREE.MeshStandardMaterial({
        color: 0xff6b6b,
        metalness: 0.3,
        roughness: 0.5,
        emissive: 0xff6b6b,
        emissiveIntensity: 0.2,
      });

      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(
        startOffset + col * CUBE_SPACING,
        0,
        startOffset + row * CUBE_SPACING
      );
      cube.userData.index = i;

      group.add(cube);
      this.cubeTargetScales.push(CUBE_MIN_SCALE);
      this.cubeCurrentScales.push(CUBE_MIN_SCALE);
    }

    group.position.y = -1;
    return group;
  }

  private createSphereRing(): THREE.Group {
    const group = new THREE.Group();

    for (let i = 0; i < SPHERE_COUNT; i++) {
      const angle = (i / SPHERE_COUNT) * Math.PI * 2;
      const geometry = new THREE.SphereGeometry(SPHERE_SIZE / 2, SPHERE_SEGMENTS_HIGH, SPHERE_SEGMENTS_HIGH);
      
      const hue = i / SPHERE_COUNT;
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(hue, 1, 0.5),
        metalness: 0.5,
        roughness: 0.3,
        emissive: new THREE.Color().setHSL(hue, 1, 0.3),
        emissiveIntensity: 0.3,
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(
        Math.cos(angle) * SPHERE_RING_RADIUS,
        0,
        Math.sin(angle) * SPHERE_RING_RADIUS
      );
      sphere.userData.angle = angle;
      sphere.userData.index = i;

      group.add(sphere);
    }

    group.position.y = 1;
    return group;
  }

  private createConnectingLines(): THREE.Line {
    const points: THREE.Vector3[] = [];
    
    const startOffset = -((CUBE_GRID_SIZE - 1) * CUBE_SPACING) / 2;
    
    const centerCubeIndex = Math.floor(CUBE_GRID_SIZE / 2) * CUBE_GRID_SIZE + Math.floor(CUBE_GRID_SIZE / 2);
    const centerCubePos = new THREE.Vector3(
      startOffset + (centerCubeIndex % CUBE_GRID_SIZE) * CUBE_SPACING,
      -1,
      startOffset + Math.floor(centerCubeIndex / CUBE_GRID_SIZE) * CUBE_SPACING
    );

    const sphereCenter = new THREE.Vector3(0, 1, 0);
    const particleCenter = new THREE.Vector3(0, 0, 0);

    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const x = THREE.MathUtils.lerp(centerCubePos.x, sphereCenter.x, t);
      const y = THREE.MathUtils.lerp(centerCubePos.y, sphereCenter.y, t);
      const z = THREE.MathUtils.lerp(centerCubePos.z, sphereCenter.z, t);
      points.push(new THREE.Vector3(x, y, z));
    }

    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const x = THREE.MathUtils.lerp(sphereCenter.x, particleCenter.x, t);
      const y = THREE.MathUtils.lerp(sphereCenter.y, particleCenter.y, t);
      const z = THREE.MathUtils.lerp(sphereCenter.z, particleCenter.z, t);
      points.push(new THREE.Vector3(x, y, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      linewidth: 1,
    });

    return new THREE.Line(geometry, material);
  }

  getCubeGroup(): THREE.Group {
    return this.cubeGroup;
  }

  getSphereGroup(): THREE.Group {
    return this.sphereGroup;
  }

  getParticleSystem(): THREE.Points {
    return this.particleSystem;
  }

  getConnectingLines(): THREE.Line {
    return this.connectingLines;
  }

  setMaxParticles(count: number): void {
    this.maxParticles = count;
  }

  setLodEnabled(enabled: boolean): void {
    if (this.lodEnabled === enabled) return;
    this.lodEnabled = enabled;

    const segments = enabled ? SPHERE_SEGMENTS_LOW : SPHERE_SEGMENTS_HIGH;
    this.sphereGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        child.geometry = new THREE.SphereGeometry(SPHERE_SIZE / 2, segments, segments);
      }
    });
  }

  setPerformanceMode(enabled: boolean): void {
    this.isPerformanceMode = enabled;
  }

  updateColors(theme: ThemeColors): void {
    const lowColor = new THREE.Color(theme.lowFreq);
    const midStartColor = new THREE.Color(theme.midFreqStart);
    const midEndColor = new THREE.Color(theme.midFreqEnd);

    this.cubeGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.color = lowColor;
        child.material.emissive = lowColor;
      }
    });

    this.sphereGroup.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const t = index / SPHERE_COUNT;
        const color = new THREE.Color().lerpColors(midStartColor, midEndColor, t);
        child.material.color = color;
        child.material.emissive = color;
        child.material.emissiveIntensity = 0.3;
      }
    });
  }

  update(
    deltaTime: number,
    lowFreqEnergy: number,
    midFreqEnergy: number,
    highFreqEnergy: number,
    sensitivity: number
  ): void {
    this.updateCubes(deltaTime, lowFreqEnergy, sensitivity);
    this.updateSpheres(deltaTime, midFreqEnergy, sensitivity);
    this.updateParticles(deltaTime, highFreqEnergy, sensitivity);
  }

  private updateCubes(deltaTime: number, lowFreqEnergy: number, sensitivity: number): void {
    const energy = Math.min(1, lowFreqEnergy * sensitivity);

    for (let i = 0; i < CUBE_COUNT; i++) {
      const row = Math.floor(i / CUBE_GRID_SIZE);
      const col = i % CUBE_GRID_SIZE;
      const centerDist = Math.sqrt(
        Math.pow(col - CUBE_GRID_SIZE / 2, 2) + 
        Math.pow(row - CUBE_GRID_SIZE / 2, 2)
      );
      const distFactor = 1 - (centerDist / (CUBE_GRID_SIZE * 0.7));
      
      this.cubeTargetScales[i] = CUBE_MIN_SCALE + 
        (CUBE_MAX_SCALE - CUBE_MIN_SCALE) * energy * Math.max(0.2, distFactor);

      this.cubeCurrentScales[i] += 
        (this.cubeTargetScales[i] - this.cubeCurrentScales[i]) * 
        CUBE_LERP_SPEED * deltaTime;

      const cube = this.cubeGroup.children[i] as THREE.Mesh;
      if (cube) {
        cube.scale.y = this.cubeCurrentScales[i];
        cube.position.y = (this.cubeCurrentScales[i] - 1) * CUBE_SIZE * 0.5;
        
        if (cube.material instanceof THREE.MeshStandardMaterial) {
          cube.material.emissiveIntensity = 0.2 + energy * 0.5;
        }
      }
    }
  }

  private updateSpheres(deltaTime: number, midFreqEnergy: number, sensitivity: number): void {
    const energy = Math.min(1, midFreqEnergy * sensitivity);
    
    this.sphereTargetRotationSpeed = 
      SPHERE_ROTATION_MIN + 
      (SPHERE_ROTATION_MAX - SPHERE_ROTATION_MIN) * energy;

    this.sphereRotationSpeed += 
      (this.sphereTargetRotationSpeed - this.sphereRotationSpeed) * 
      3 * deltaTime;

    this.sphereGroup.rotation.y += this.sphereRotationSpeed * deltaTime;

    this.sphereGroup.children.forEach((child, index) => {
      if (child instanceof THREE.Mesh) {
        const pulseScale = 1 + Math.sin(
          performance.now() * 0.003 + index * 0.5
        ) * 0.2 * energy;
        child.scale.setScalar(pulseScale);
      }
    });
  }

  private updateParticles(
    deltaTime: number, 
    highFreqEnergy: number, 
    sensitivity: number
  ): void {
    if (this.isPerformanceMode) return;

    const energy = Math.min(1, highFreqEnergy * sensitivity);
    const spawnCount = Math.floor(PARTICLES_PER_FRAME * energy);

    for (let i = 0; i < spawnCount && this.particles.length < this.maxParticles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const coneAngle = Math.random() * PARTICLE_CONE_ANGLE;
      
      const velocity = new THREE.Vector3(
        Math.sin(coneAngle) * Math.cos(angle),
        Math.cos(coneAngle),
        Math.sin(coneAngle) * Math.sin(angle)
      ).multiplyScalar(2 + Math.random() * 3);

      this.particles.push({
        position: new THREE.Vector3(0, 0, 0),
        velocity,
        lifetime: PARTICLE_LIFETIME,
        maxLifetime: PARTICLE_LIFETIME,
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.lifetime -= deltaTime;

      if (particle.lifetime <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      particle.position.add(
        particle.velocity.clone().multiplyScalar(deltaTime)
      );
      particle.velocity.y -= 2 * deltaTime;
    }

    this.updateParticleGeometry();
  }

  private updateParticleGeometry(): void {
    const positions = new Float32Array(this.particles.length * 3);
    const colors = new Float32Array(this.particles.length * 3);

    this.particles.forEach((particle, i) => {
      const idx = i * 3;
      positions[idx] = particle.position.x;
      positions[idx + 1] = particle.position.y;
      positions[idx + 2] = particle.position.z;

      const lifeRatio = particle.lifetime / particle.maxLifetime;
      const color = new THREE.Color();
      
      if (lifeRatio > 0.5) {
        const t = (lifeRatio - 0.5) * 2;
        color.setHSL(50 / 360, 1, 0.5 + t * 0.5);
      } else {
        const t = lifeRatio * 2;
        color.setHSL(30 / 360 + (1 - t) * 10 / 360, 1, 0.5 * t);
      }

      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    });

    this.particleGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );
    this.particleGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(colors, 3)
    );
    
    (this.particleSystem.material as THREE.PointsMaterial).opacity = 0.8;
  }

  dispose(): void {
    this.cubeGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.sphereGroup.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });

    this.particleGeometry.dispose();
    if (this.particleSystem.material instanceof THREE.Material) {
      this.particleSystem.material.dispose();
    }

    if (this.connectingLines.geometry instanceof THREE.BufferGeometry) {
      this.connectingLines.geometry.dispose();
    }
    if (this.connectingLines.material instanceof THREE.Material) {
      this.connectingLines.material.dispose();
    }
  }
}
