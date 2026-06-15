import * as THREE from 'three';
import { eventBus } from './eventBus';
import { latLngToPosition } from './dataParser';
import type { DataSnapshot, RoadData, SharedScene, TimePeriod } from './types';

const CONGESTION_COLORS = [
  new THREE.Color(0x00FF00),
  new THREE.Color(0x99FF00),
  new THREE.Color(0xFFFF00),
  new THREE.Color(0xFF6600),
  new THREE.Color(0x8B0000)
];

const BAR_HEIGHT_PER_LEVEL = 2;
const BAR_RADIUS = 0.8;
const PARTICLE_MIN_COUNT = 20;
const PARTICLE_MAX_COUNT = 50;
const PARTICLE_MIN_SIZE = 1;
const PARTICLE_MAX_SIZE = 3;
const TRAIL_LENGTH = 8;
const TRANSITION_DURATION = 1500;
const BAR_ANIM_DURATION = 500;
const COLOR_TRANSITION_DURATION = 300;

interface BarAnimationState {
  targetHeight: number;
  currentHeight: number;
  startHeight: number;
  startTime: number;
  targetColor: THREE.Color;
  currentColor: THREE.Color;
  startColor: THREE.Color;
  colorStartTime: number;
  delay: number;
}

interface ParticleState {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  speed: number;
  size: number;
  color: THREE.Color;
  roadLength: number;
  progress: number;
  trail: THREE.Vector3[];
}

export class HeatmapRenderer {
  private sharedScene: SharedScene | null = null;
  private currentSnapshot: DataSnapshot | null = null;
  private barMeshes: Map<string, { bar: THREE.Mesh; sphere: THREE.Mesh; state: BarAnimationState }> = new Map();
  private particles: THREE.Points | null = null;
  private particleStates: ParticleState[] = [];
  private particleGeometry: THREE.BufferGeometry | null = null;
  private positions: Float32Array | null = null;
  private colors: Float32Array | null = null;
  private sizes: Float32Array | null = null;
  private previousRoadData: RoadData[] = [];
  private centerPoint: THREE.Vector2 = new THREE.Vector2(0, 0);

  constructor() {
    eventBus.on('data-ready', this.handleDataReady.bind(this));
    eventBus.on('time-changed', this.handleTimeChanged.bind(this));
    eventBus.on('scene-ready', this.handleSceneReady.bind(this));
  }

  private handleSceneReady(scene: SharedScene): void {
    this.sharedScene = scene;
    if (this.currentSnapshot) {
      this.renderHeatmap(this.currentSnapshot);
    }
  }

  private handleDataReady(snapshot: DataSnapshot): void {
    this.currentSnapshot = snapshot;
    if (this.sharedScene) {
      this.renderHeatmap(snapshot);
    }
  }

  private handleTimeChanged(_period: TimePeriod): void {
    if (this.currentSnapshot) {
      eventBus.emit('data-ready', this.currentSnapshot);
    }
  }

  private getCongestionColor(level: number): THREE.Color {
    const clampedLevel = Math.max(1, Math.min(5, level));
    const idx = Math.floor(clampedLevel) - 1;
    const t = clampedLevel - Math.floor(clampedLevel);
    
    if (t === 0) {
      return CONGESTION_COLORS[idx].clone();
    }
    
    const color1 = CONGESTION_COLORS[Math.min(idx, 4)];
    const color2 = CONGESTION_COLORS[Math.min(idx + 1, 4)];
    return color1.clone().lerp(color2, t);
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private getRoadMidpoint(road: RoadData): { x: number; z: number } {
    const start = latLngToPosition(road.startLat, road.startLng);
    const end = latLngToPosition(road.endLat, road.endLng);
    return {
      x: (start.x + end.x) / 2,
      z: (start.z + end.z) / 2
    };
  }

  private getRoadLength(road: RoadData): number {
    const start = latLngToPosition(road.startLat, road.startLng);
    const end = latLngToPosition(road.endLat, road.endLng);
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private calculateDistanceFromCenter(road: RoadData): number {
    const mid = this.getRoadMidpoint(road);
    const dx = mid.x - this.centerPoint.x;
    const dz = mid.z - this.centerPoint.y;
    return Math.sqrt(dx * dx + dz * dz);
  }

  private clearHeatmap(): void {
    if (!this.sharedScene) return;

    for (const { bar, sphere } of this.barMeshes.values()) {
      this.sharedScene.heatmapGroup.remove(bar);
      this.sharedScene.heatmapGroup.remove(sphere);
      bar.geometry.dispose();
      (bar.material as THREE.Material).dispose();
      sphere.geometry.dispose();
      (sphere.material as THREE.Material).dispose();
    }
    this.barMeshes.clear();

    if (this.particles) {
      this.sharedScene.particlesGroup.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
    }
    this.particleStates = [];
    this.particleGeometry = null;
    this.positions = null;
    this.colors = null;
    this.sizes = null;
  }

  private createBar(road: RoadData): void {
    if (!this.sharedScene) return;

    const mid = this.getRoadMidpoint(road);
    const height = road.congestionLevel * BAR_HEIGHT_PER_LEVEL;
    const color = this.getCongestionColor(road.congestionLevel);
    const distance = this.calculateDistanceFromCenter(road);
    const maxDistance = 150;
    const delay = (distance / maxDistance) * (TRANSITION_DURATION * 0.5);

    const barGeometry = new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, height, 8);
    const barMaterial = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.8,
      emissive: color,
      emissiveIntensity: 0.3
    });
    const bar = new THREE.Mesh(barGeometry, barMaterial);
    bar.position.set(mid.x, height / 2, mid.z);
    bar.castShadow = true;

    const sphereGeometry = new THREE.SphereGeometry(BAR_RADIUS * 1.2, 8, 8);
    const sphereMaterial = new THREE.MeshStandardMaterial({
      color: color,
      transparent: true,
      opacity: 0.6,
      emissive: color,
      emissiveIntensity: 0.5
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.set(mid.x, height, mid.z);

    const state: BarAnimationState = {
      targetHeight: height,
      currentHeight: 0,
      startHeight: 0,
      startTime: performance.now(),
      targetColor: color.clone(),
      currentColor: color.clone(),
      startColor: color.clone(),
      colorStartTime: performance.now(),
      delay: delay
    };

    this.barMeshes.set(road.id, { bar, sphere, state });
    this.sharedScene.heatmapGroup.add(bar);
    this.sharedScene.heatmapGroup.add(sphere);
  }

  private createParticles(roads: RoadData[]): void {
    if (!this.sharedScene) return;

    let totalParticles = 0;
    const particlesPerRoad: number[] = [];
    const roadLengths: number[] = [];

    for (const road of roads) {
      const length = this.getRoadLength(road);
      roadLengths.push(length);
      const count = Math.floor(PARTICLE_MIN_COUNT + (length / 100) * (PARTICLE_MAX_COUNT - PARTICLE_MIN_COUNT));
      particlesPerRoad.push(Math.min(PARTICLE_MAX_COUNT, Math.max(PARTICLE_MIN_COUNT, count)));
      totalParticles += particlesPerRoad[particlesPerRoad.length - 1];
    }

    this.particleStates = [];
    this.positions = new Float32Array(totalParticles * 3);
    this.colors = new Float32Array(totalParticles * 3);
    this.sizes = new Float32Array(totalParticles);

    let particleIndex = 0;

    for (let i = 0; i < roads.length; i++) {
      const road = roads[i];
      const count = particlesPerRoad[i];
      const start = latLngToPosition(road.startLat, road.startLng);
      const end = latLngToPosition(road.endLat, road.endLng);
      const startVec = new THREE.Vector3(start.x, 0.5, start.z);
      const endVec = new THREE.Vector3(end.x, 0.5, end.z);
      const direction = endVec.clone().sub(startVec).normalize();
      const length = roadLengths[i];

      const baseSpeed = Math.max(2, 30 - road.averageSpeed * 0.5);
      const size = PARTICLE_MIN_SIZE + (road.congestionLevel / 5) * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE);
      const color = this.getCongestionColor(road.congestionLevel);

      for (let j = 0; j < count; j++) {
        const progress = Math.random();
        const position = startVec.clone().lerp(endVec, progress);
        const trail: THREE.Vector3[] = [];
        for (let t = 0; t < TRAIL_LENGTH; t++) {
          trail.push(position.clone());
        }

        this.particleStates.push({
          position,
          direction: direction.clone(),
          speed: baseSpeed * (0.8 + Math.random() * 0.4),
          size: size * (0.8 + Math.random() * 0.4),
          color: color.clone(),
          roadLength: length,
          progress,
          trail
        });

        const idx = particleIndex * 3;
        this.positions[idx] = position.x;
        this.positions[idx + 1] = position.y;
        this.positions[idx + 2] = position.z;

        this.colors[idx] = color.r;
        this.colors[idx + 1] = color.g;
        this.colors[idx + 2] = color.b;

        this.sizes[particleIndex] = size;

        particleIndex++;
      }
    }

    this.particleGeometry = new THREE.BufferGeometry();
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const particleMaterial = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(this.particleGeometry, particleMaterial);
    this.sharedScene.particlesGroup.add(this.particles);
  }

  private renderHeatmap(snapshot: DataSnapshot): void {
    if (!this.sharedScene) return;

    const now = performance.now();

    if (this.barMeshes.size > 0 && this.previousRoadData.length > 0) {
      const prevMap = new Map(this.previousRoadData.map(r => [r.id, r]));
      
      for (const road of snapshot.roads) {
        const prevRoad = prevMap.get(road.id);
        const barData = this.barMeshes.get(road.id);
        
        if (barData && prevRoad) {
          const state = barData.state;
          state.startHeight = state.currentHeight;
          state.targetHeight = road.congestionLevel * BAR_HEIGHT_PER_LEVEL;
          state.startTime = now + state.delay;
          
          state.startColor = state.currentColor.clone();
          state.targetColor = this.getCongestionColor(road.congestionLevel);
          state.colorStartTime = now + state.delay;
        } else if (barData) {
          const state = barData.state;
          state.startHeight = 0;
          state.targetHeight = road.congestionLevel * BAR_HEIGHT_PER_LEVEL;
          state.startTime = now + state.delay;
          
          state.startColor = this.getCongestionColor(1);
          state.targetColor = this.getCongestionColor(road.congestionLevel);
          state.colorStartTime = now + state.delay;
        } else {
          this.createBar(road);
        }
      }

      this.updateParticles(snapshot.roads);
    } else {
      this.clearHeatmap();

      for (const road of snapshot.roads) {
        this.createBar(road);
      }

      this.createParticles(snapshot.roads);
    }

    this.previousRoadData = [...snapshot.roads];
  }

  private updateParticles(roads: RoadData[]): void {
    if (!this.particles || !this.particleGeometry) return;

    const roadMap = new Map(roads.map(r => [r.id, r]));
    let particleIdx = 0;

    const newStates: ParticleState[] = [];
    const positions = this.positions!;
    const colors = this.colors!;

    for (const state of this.particleStates) {
      const roadId = this.getRoadIdForParticle(state);
      const road = roadMap.get(roadId);

      if (road) {
        const targetColor = this.getCongestionColor(road.congestionLevel);
        state.color.lerp(targetColor, 0.05);
      }

      newStates.push(state);

      const idx = particleIdx * 3;
      positions[idx] = state.position.x;
      positions[idx + 1] = state.position.y;
      positions[idx + 2] = state.position.z;

      colors[idx] = state.color.r;
      colors[idx + 1] = state.color.g;
      colors[idx + 2] = state.color.b;

      particleIdx++;
    }

    this.particleStates = newStates;
    (this.particleGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.particleGeometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private getRoadIdForParticle(_state: ParticleState): string {
    return '';
  }

  public update(deltaTime: number): void {
    const now = performance.now();

    for (const { bar, sphere, state } of this.barMeshes.values()) {
      const elapsed = now - state.startTime;
      
      if (elapsed >= 0) {
        const t = Math.min(1, elapsed / BAR_ANIM_DURATION);
        const eased = this.easeOutBack(t);
        state.currentHeight = state.startHeight + (state.targetHeight - state.startHeight) * eased;

        bar.scale.y = state.currentHeight / (state.targetHeight || 1);
        bar.position.y = state.currentHeight / 2;
        sphere.position.y = state.currentHeight;
      }

      const colorElapsed = now - state.colorStartTime;
      if (colorElapsed >= 0) {
        const colorT = Math.min(1, colorElapsed / COLOR_TRANSITION_DURATION);
        state.currentColor.copy(state.startColor).lerp(state.targetColor, colorT);

        (bar.material as THREE.MeshStandardMaterial).color.copy(state.currentColor);
        (bar.material as THREE.MeshStandardMaterial).emissive.copy(state.currentColor);
        (sphere.material as THREE.MeshStandardMaterial).color.copy(state.currentColor);
        (sphere.material as THREE.MeshStandardMaterial).emissive.copy(state.currentColor);
      }
    }

    this.updateParticlePositions(deltaTime);
  }

  private updateParticlePositions(deltaTime: number): void {
    if (!this.particles || !this.particleGeometry || !this.positions) return;

    const positions = this.positions;

    for (let i = 0; i < this.particleStates.length; i++) {
      const state = this.particleStates[i];
      
      const moveDistance = state.speed * deltaTime;
      state.position.add(state.direction.clone().multiplyScalar(moveDistance));
      state.progress += moveDistance / state.roadLength;

      if (state.progress >= 1) {
        state.progress = 0;
        const start = state.position.clone().sub(
          state.direction.clone().multiplyScalar(state.roadLength)
        );
        state.position.copy(start);
      }

      const idx = i * 3;
      positions[idx] = state.position.x;
      positions[idx + 1] = state.position.y;
      positions[idx + 2] = state.position.z;
    }

    (this.particleGeometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }

  public dispose(): void {
    this.clearHeatmap();
  }
}
