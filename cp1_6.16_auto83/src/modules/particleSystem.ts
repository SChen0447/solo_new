import * as THREE from 'three';
import { eventBus, Events } from '../utils/eventBus';

export interface ParticleParams {
  flowSpeed: number;
  particleSize: number;
  emissionAngle: number;
  viscosity: number;
  startColor: string;
  endColor: string;
  emissionRate: number;
  particleLifetime: number;
}

export interface TrajectoryPoint {
  position: THREE.Vector3;
  timestamp: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  id: number;
  birthTime: number;
  trajectory: TrajectoryPoint[];
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.PointsMaterial;
  private points: THREE.Points;
  private maxParticles = 5000;
  private nextParticleId = 0;
  private emitterPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private emitterMesh: THREE.Mesh;
  private params: ParticleParams = {
    flowSpeed: 5,
    particleSize: 0.5,
    emissionAngle: 180,
    viscosity: 0.3,
    startColor: '#ffffff',
    endColor: '#666666',
    emissionRate: 100,
    particleLifetime: 5
  };
  private gravity = 0.2;
  private lastEmitTime = 0;
  private recording = false;
  private startTime = 0;
  private positionArray: Float32Array;
  private colorArray: Float32Array;
  private startColorVec: THREE.Color = new THREE.Color('#ffffff');
  private endColorVec: THREE.Color = new THREE.Color('#666666');
  private trailLines: THREE.Line[] = [];
  private trailsGroup: THREE.Group;
  private isTransitioning = false;
  private transitionAlpha = 1;
  private collisionGrid: Map<string, Particle[]> = new Map();
  private gridCellSize = 1;
  private frameCount = 0;
  private lastFpsTime = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.startTime = performance.now();

    this.particleGeometry = new THREE.BufferGeometry();
    this.positionArray = new Float32Array(this.maxParticles * 3);
    this.colorArray = new Float32Array(this.maxParticles * 3);
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positionArray, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colorArray, 3));
    this.particleGeometry.setDrawRange(0, 0);

    this.particleMaterial = new THREE.PointsMaterial({
      size: this.params.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.points = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.points);

    this.trailsGroup = new THREE.Group();
    this.scene.add(this.trailsGroup);

    const emitterGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const emitterMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.6 });
    this.emitterMesh = new THREE.Mesh(emitterGeo, emitterMat);
    this.emitterMesh.position.copy(this.emitterPosition);
    this.scene.add(this.emitterMesh);

    this.registerEventListeners();
  }

  private registerEventListeners(): void {
    eventBus.on<Partial<ParticleParams>>(Events.PARAM_UPDATE, (params) => {
      this.updateParams(params);
    });

    eventBus.on<THREE.Vector3>(Events.EMITTER_MOVE, (pos) => {
      this.setEmitterPosition(pos);
    });

    eventBus.on<void>(Events.RECORD_START, () => {
      this.startRecording();
    });

    eventBus.on<void>(Events.RECORD_STOP, () => {
      this.stopRecording();
    });

    eventBus.on<void>(Events.PRESET_APPLY, () => {
      this.clearWithTransition();
    });
  }

  public updateParams(params: Partial<ParticleParams>): void {
    const oldStartColor = this.params.startColor;
    const oldEndColor = this.params.endColor;

    this.params = { ...this.params, ...params };

    if (params.particleSize !== undefined) {
      this.particleMaterial.size = this.params.particleSize;
    }
    if (params.startColor !== undefined || params.endColor !== undefined) {
      if (params.startColor) this.startColorVec.set(params.startColor);
      if (params.endColor) this.endColorVec.set(params.endColor);
    }
  }

  public setEmitterPosition(pos: THREE.Vector3): void {
    this.emitterPosition.copy(pos);
    this.emitterMesh.position.copy(pos);
  }

  public getEmitterPosition(): THREE.Vector3 {
    return this.emitterPosition.clone();
  }

  public getEmitterMesh(): THREE.Mesh {
    return this.emitterMesh;
  }

  public startRecording(): void {
    this.recording = true;
    this.particles.forEach(p => {
      p.trajectory = [{ position: p.position.clone(), timestamp: performance.now() }];
    });
  }

  public stopRecording(): void {
    this.recording = false;
    this.displayRecentTrails();
  }

  private clearWithTransition(): void {
    this.isTransitioning = true;
    this.transitionAlpha = 1;
    const startTime = performance.now();
    const duration = 500;

    const animateFade = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      this.transitionAlpha = 1 - progress;

      if (progress < 1) {
        requestAnimationFrame(animateFade);
      } else {
        this.particles = [];
        this.isTransitioning = false;
        this.transitionAlpha = 1;
      }
    };
    animateFade();
  }

  public clearAll(): void {
    this.particles = [];
    this.clearTrails();
  }

  private clearTrails(): void {
    this.trailLines.forEach(line => {
      this.trailsGroup.remove(line);
      (line.geometry as THREE.BufferGeometry).dispose();
      (line.material as THREE.LineBasicMaterial).dispose();
    });
    this.trailLines = [];
  }

  private displayRecentTrails(): void {
    this.clearTrails();

    const particlesWithTrails = this.particles
      .filter(p => p.trajectory.length > 1)
      .sort((a, b) => b.trajectory.length - a.trajectory.length)
      .slice(0, 5);

    particlesWithTrails.forEach(p => {
      const positions = new Float32Array(p.trajectory.length * 3);
      const colors = new Float32Array(p.trajectory.length * 3);
      const tempColor = new THREE.Color();

      p.trajectory.forEach((tp, i) => {
        positions[i * 3] = tp.position.x;
        positions[i * 3 + 1] = tp.position.y;
        positions[i * 3 + 2] = tp.position.z;

        const lifeRatio = i / p.trajectory.length;
        tempColor.copy(this.startColorVec).lerp(this.endColorVec, lifeRatio);
        colors[i * 3] = tempColor.r;
        colors[i * 3 + 1] = tempColor.g;
        colors[i * 3 + 2] = tempColor.b;
      });

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });

      const line = new THREE.Line(geo, mat);
      this.trailLines.push(line);
      this.trailsGroup.add(line);
    });
  }

  public getRecentTrajectories(): TrajectoryPoint[][] {
    return this.particles
      .filter(p => p.trajectory.length > 5)
      .sort((a, b) => b.trajectory.length - a.trajectory.length)
      .slice(0, 5)
      .map(p => p.trajectory.map(tp => ({
        position: tp.position.clone(),
        timestamp: tp.timestamp
      })));
  }

  private getGridKey(x: number, y: number, z: number): string {
    return `${Math.floor(x / this.gridCellSize)},${Math.floor(y / this.gridCellSize)},${Math.floor(z / this.gridCellSize)}`;
  }

  private buildCollisionGrid(): void {
    this.collisionGrid.clear();
    this.particles.forEach(p => {
      const key = this.getGridKey(p.position.x, p.position.y, p.position.z);
      if (!this.collisionGrid.has(key)) {
        this.collisionGrid.set(key, []);
      }
      this.collisionGrid.get(key)!.push(p);
    });
  }

  private resolveCollisions(particle: Particle): void {
    const cx = Math.floor(particle.position.x / this.gridCellSize);
    const cy = Math.floor(particle.position.y / this.gridCellSize);
    const cz = Math.floor(particle.position.z / this.gridCellSize);
    const minDist = this.params.particleSize * 1.5;
    const minDistSq = minDist * minDist;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = this.getGridKey(
            (cx + dx) * this.gridCellSize,
            (cy + dy) * this.gridCellSize,
            (cz + dz) * this.gridCellSize
          );
          const cell = this.collisionGrid.get(key);
          if (!cell) continue;

          cell.forEach(other => {
            if (other.id === particle.id) return;
            const distSq = particle.position.distanceToSquared(other.position);
            if (distSq < minDistSq && distSq > 0.0001) {
              const dist = Math.sqrt(distSq);
              const overlap = (minDist - dist) / 2;
              const dir = new THREE.Vector3()
                .subVectors(particle.position, other.position)
                .normalize();
              particle.position.addScaledVector(dir, overlap);
              other.position.addScaledVector(dir, -overlap);

              const relVel = new THREE.Vector3().subVectors(particle.velocity, other.velocity);
              const velAlongNormal = relVel.dot(dir);
              if (velAlongNormal > 0) {
                const restitution = 0.3;
                const impulse = -(1 + restitution) * velAlongNormal / 2;
                particle.velocity.addScaledVector(dir, impulse);
                other.velocity.addScaledVector(dir, -impulse);
              }
            }
          });
        }
      }
    }
  }

  private emitParticles(delta: number): void {
    const particlesToEmit = Math.floor(this.params.emissionRate * delta);
    const spawnable = Math.min(particlesToEmit, this.maxParticles - this.particles.length);
    if (spawnable <= 0) return;

    for (let i = 0; i < spawnable; i++) {
      const angleRad = (this.params.emissionAngle * Math.PI) / 180;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * angleRad - angleRad / 2;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.abs(Math.cos(phi)),
        Math.sin(phi) * Math.sin(theta)
      ).normalize().multiplyScalar(this.params.flowSpeed);

      velocity.x += (Math.random() - 0.5) * 0.5;
      velocity.z += (Math.random() - 0.5) * 0.5;

      const particle: Particle = {
        position: this.emitterPosition.clone().add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.2
          )
        ),
        velocity,
        life: this.params.particleLifetime,
        maxLife: this.params.particleLifetime,
        size: this.params.particleSize * (0.8 + Math.random() * 0.4),
        id: this.nextParticleId++,
        birthTime: performance.now(),
        trajectory: this.recording ? [{ position: this.emitterPosition.clone(), timestamp: performance.now() }] : []
      };

      this.particles.push(particle);
    }
  }

  public update(delta: number, currentTime: number): void {
    this.frameCount++;
    if (currentTime - this.lastFpsTime > 1000) {
      eventBus.emit(Events.FPS_UPDATE, Math.round(this.frameCount * 1000 / (currentTime - this.lastFpsTime)));
      this.frameCount = 0;
      this.lastFpsTime = currentTime;
    }

    this.emitParticles(delta);
    this.buildCollisionGrid();

    const decay = Math.pow(1 - this.params.viscosity, delta * 60);
    const gravityVec = new THREE.Vector3(0, -this.gravity, 0);
    const tempColor = new THREE.Color();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.velocity.multiplyScalar(decay);
      p.velocity.addScaledVector(gravityVec, delta);
      p.position.addScaledVector(p.velocity, delta);

      this.resolveCollisions(p);

      if (p.position.y < -10) {
        p.position.y = -10;
        p.velocity.y *= -0.3;
        p.velocity.x *= 0.8;
        p.velocity.z *= 0.8;
      }

      p.life -= delta;

      if (this.recording) {
        const sampleInterval = 100;
        if (p.trajectory.length === 0 ||
            currentTime - p.trajectory[p.trajectory.length - 1].timestamp >= sampleInterval) {
          p.trajectory.push({ position: p.position.clone(), timestamp: currentTime });
          const maxPoints = 100;
          if (p.trajectory.length > maxPoints) {
            p.trajectory = p.trajectory.slice(-maxPoints);
          }
        }
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    const drawCount = Math.min(this.particles.length, this.maxParticles);
    this.particleGeometry.setDrawRange(0, drawCount);

    for (let i = 0; i < drawCount; i++) {
      const p = this.particles[i];
      const lifeRatio = 1 - p.life / p.maxLife;
      const fadeFactor = this.isTransitioning ? this.transitionAlpha : Math.min(1, p.life / Math.min(0.5, p.maxLife * 0.1));

      this.positionArray[i * 3] = p.position.x;
      this.positionArray[i * 3 + 1] = p.position.y;
      this.positionArray[i * 3 + 2] = p.position.z;

      tempColor.copy(this.startColorVec).lerp(this.endColorVec, lifeRatio);
      this.colorArray[i * 3] = tempColor.r * fadeFactor;
      this.colorArray[i * 3 + 1] = tempColor.g * fadeFactor;
      this.colorArray[i * 3 + 2] = tempColor.b * fadeFactor;
    }

    (this.particleGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  public getParticleCount(): number {
    return this.particles.length;
  }

  public getParams(): ParticleParams {
    return { ...this.params };
  }

  public dispose(): void {
    this.scene.remove(this.points);
    this.scene.remove(this.emitterMesh);
    this.scene.remove(this.trailsGroup);
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.clearTrails();
    this.emitterMesh.geometry.dispose();
    (this.emitterMesh.material as THREE.Material).dispose();
  }
}
