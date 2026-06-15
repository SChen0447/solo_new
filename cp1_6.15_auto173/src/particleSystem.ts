import * as THREE from 'three';
import type { BuildingMesh, ParticleData, WindParams, WindGridCell, BuildingData } from './types';

export class ParticleSystem {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  public readonly PARTICLE_COUNT = 3000;
  public readonly TRAIL_LENGTH = 12;

  private particles: ParticleData[] = [];
  private particleMesh!: THREE.InstancedMesh;
  private dummyObj: THREE.Object3D = new THREE.Object3D();

  private trailMesh!: THREE.LineSegments;
  private trailPositions: Float32Array;
  private trailColors: Float32Array;

  private buildings: BuildingData[] = [];
  private buildingBoxes: THREE.Box3[] = [];

  private windParams: WindParams = {
    baseSpeed: 5,
    direction: new THREE.Vector3(0, 0, 1),
    turbulenceStrength: 0.6,
    wakeSlowdownFactor: 0.5,
    gridSize: 10
  };

  private colorStart = new THREE.Color(0x00e5ff);
  private colorEnd = new THREE.Color(0xff8a65);
  private tmpColor = new THREE.Color();

  private windGrid: WindGridCell[][] = [];
  private gridBound = 100;
  public currentAvgSpeed = 0;
  public currentMaxSpeed = 0;
  public currentMinSpeed = 999;

  private speedHistory: number[] = [];
  public readonly MAX_HISTORY = 120;

  private anemometerOverlay: HTMLElement;
  private sceneSize = 200;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;

    this.anemometerOverlay = document.getElementById('anemometer-overlay')!;

    this.initWindGrid();
    this.initParticles();
    this.initTrailMesh();
  }

  private initWindGrid(): void {
    this.windGrid = [];
    for (let i = 0; i < this.windParams.gridSize; i++) {
      this.windGrid[i] = [];
      for (let j = 0; j < this.windParams.gridSize; j++) {
        this.windGrid[i][j] = { avgSpeed: 0, particleCount: 0, totalSpeed: 0 };
      }
    }
  }

  private initParticles(): void {
    const geometry = new THREE.SphereGeometry(0.15, 6, 6);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });

    this.particleMesh = new THREE.InstancedMesh(geometry, material, this.PARTICLE_COUNT);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    (this.particleMesh as any).instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(this.PARTICLE_COUNT * 3), 3
    );
    this.particleMesh.instanceColor!.setUsage(THREE.DynamicDrawUsage);
    this.scene.add(this.particleMesh);

    this.particles = [];
    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      this.particles.push(this.createParticle(i, true));
    }
  }

  private initTrailMesh(): void {
    const trailCount = this.PARTICLE_COUNT;
    const segmentCount = this.TRAIL_LENGTH - 1;
    const totalVertices = trailCount * this.TRAIL_LENGTH * 2;

    this.trailPositions = new Float32Array(totalVertices * 3);
    this.trailColors = new Float32Array(totalVertices * 3);

    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

    const trailMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.trailMesh = new THREE.LineSegments(trailGeo, trailMat);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);
  }

  private createParticle(index: number, initial = false): ParticleData {
    const halfSize = this.sceneSize / 2;
    const startX = (Math.random() - 0.5) * this.sceneSize * 0.9;
    const startY = 1 + Math.random() * 50;
    const startZ = -halfSize - 5 - Math.random() * 30;

    const endX = startX + (Math.random() - 0.5) * 40;
    const endY = Math.max(2, startY + (Math.random() - 0.5) * 25);
    const endZ = halfSize + 5;

    const start = new THREE.Vector3(startX, startY, startZ);
    const end = new THREE.Vector3(endX, endY, endZ);

    const midZ1 = startZ + (endZ - startZ) * (0.25 + Math.random() * 0.15);
    const midZ2 = startZ + (endZ - startZ) * (0.6 + Math.random() * 0.2);
    const p1 = new THREE.Vector3(
      startX + (Math.random() - 0.5) * 35,
      Math.max(3, startY + (Math.random() - 0.5) * 30),
      midZ1
    );
    const p2 = new THREE.Vector3(
      endX + (Math.random() - 0.5) * 35,
      Math.max(3, endY + (Math.random() - 0.3) * 25),
      midZ2
    );

    const baseSpeed = (0.7 + Math.random() * 0.6) * this.windParams.baseSpeed;
    const progress = initial ? Math.random() : 0;

    const trail: THREE.Vector3[] = [];
    for (let i = 0; i < this.TRAIL_LENGTH; i++) {
      trail.push(new THREE.Vector3(startX, startY, startZ));
    }

    return {
      position: start.clone(),
      velocity: new THREE.Vector3(),
      startPosition: start,
      targetPosition: end,
      bezierP1: p1,
      bezierP2: p2,
      progress,
      speed: baseSpeed,
      baseSpeed,
      isInWake: false,
      wakeTimer: 0,
      age: progress * 100,
      maxAge: 100 + Math.random() * 50,
      trail
    };
  }

  private bezierPoint(t: number, p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): THREE.Vector3 {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;

    return new THREE.Vector3()
      .addScaledVector(p0, mt3)
      .addScaledVector(p1, 3 * mt2 * t)
      .addScaledVector(p2, 3 * mt * t2)
      .addScaledVector(p3, t3);
  }

  private checkBuildingWake(pos: THREE.Vector3): { inWake: boolean; deflect: THREE.Vector3; slowdown: number } {
    let inWake = false;
    let maxSlowdown = 1;
    let totalDeflect = new THREE.Vector3();
    let deflectCount = 0;

    for (let i = 0; i < this.buildingBoxes.length; i++) {
      const box = this.buildingBoxes[i];
      const boxData = this.buildings[i];
      if (!boxData) continue;

      const halfW = boxData.width / 2;
      const halfD = boxData.depth / 2;
      const bMinX = boxData.position.x - halfW;
      const bMaxX = boxData.position.x + halfW;
      const bMinZ = boxData.position.z - halfD;
      const bMaxZ = boxData.position.z + halfD;
      const bMaxY = boxData.height;

      if (pos.y > bMaxY + 8) continue;

      const behindBuilding = pos.z > bMaxZ && pos.z < bMaxZ + 30;
      const withinWidth = pos.x > bMinX - 8 && pos.x < bMaxX + 8;
      const withinHeight = pos.y < bMaxY + 5;

      if (behindBuilding && withinWidth && withinHeight) {
        inWake = true;
        const distToBack = pos.z - bMaxZ;
        const wakeStrength = Math.max(0, 1 - distToBack / 30);
        const slowdown = 1 - this.windParams.wakeSlowdownFactor * wakeStrength;
        if (slowdown < maxSlowdown) maxSlowdown = slowdown;

        const centerX = (bMinX + bMaxX) / 2;
        const dx = pos.x - centerX;
        const deflectDir = new THREE.Vector3(
          Math.sign(dx) * (1 - Math.abs(dx) / (halfW + 10)) * 3,
          (Math.random() - 0.5) * 1.5,
          0
        );
        totalDeflect.add(deflectDir);
        deflectCount++;
      }

      if (pos.x >= bMinX && pos.x <= bMaxX && pos.z >= bMinZ && pos.z <= bMaxZ && pos.y <= bMaxY) {
        inWake = true;
        maxSlowdown = 0.15;
        totalDeflect.add(new THREE.Vector3((Math.random() - 0.5) * 5, 2, 0));
        deflectCount++;
      }
    }

    if (deflectCount > 0) {
      totalDeflect.divideScalar(deflectCount);
    }

    return { inWake, deflect: totalDeflect, slowdown: maxSlowdown };
  }

  public setBuildings(buildingData: BuildingData[]): void {
    this.buildings = [...buildingData];
    this.buildingBoxes = buildingData.map((b) => {
      const box = new THREE.Box3();
      box.min.set(b.position.x - b.width / 2, 0, b.position.z - b.depth / 2);
      box.max.set(b.position.x + b.width / 2, b.height, b.position.z + b.depth / 2);
      return box;
    });
  }

  public setBaseSpeed(speed: number): void {
    this.windParams.baseSpeed = speed;
  }

  public getWindParams(): WindParams {
    return this.windParams;
  }

  public getWindGrid(): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < this.windParams.gridSize; i++) {
      result[i] = [];
      for (let j = 0; j < this.windParams.gridSize; j++) {
        result[i][j] = this.windGrid[i][j].avgSpeed;
      }
    }
    return result;
  }

  public getSpeedHistory(): number[] {
    return [...this.speedHistory];
  }

  private updateWindGrid(pos: THREE.Vector3, speed: number): void {
    const cellSize = (this.gridBound * 2) / this.windParams.gridSize;
    const gi = Math.floor((pos.x + this.gridBound) / cellSize);
    const gj = Math.floor((pos.z + this.gridBound) / cellSize);

    if (gi >= 0 && gi < this.windParams.gridSize && gj >= 0 && gj < this.windParams.gridSize) {
      const cell = this.windGrid[gj][gi];
      cell.totalSpeed += speed;
      cell.particleCount++;
    }
  }

  private finalizeWindGrid(): void {
    let total = 0;
    let count = 0;
    let mx = 0;
    let mn = 999;

    for (let i = 0; i < this.windParams.gridSize; i++) {
      for (let j = 0; j < this.windParams.gridSize; j++) {
        const cell = this.windGrid[i][j];
        if (cell.particleCount > 0) {
          cell.avgSpeed = cell.totalSpeed / cell.particleCount;
        } else {
          cell.avgSpeed = this.windParams.baseSpeed * 0.8;
        }
        total += cell.avgSpeed;
        count++;
        if (cell.avgSpeed > mx) mx = cell.avgSpeed;
        if (cell.avgSpeed < mn) mn = cell.avgSpeed;
      }
    }

    this.currentAvgSpeed = count > 0 ? total / count : this.windParams.baseSpeed;
    this.currentMaxSpeed = mx;
    this.currentMinSpeed = mn < 999 ? mn : this.currentAvgSpeed;
  }

  private resetWindGrid(): void {
    for (let i = 0; i < this.windParams.gridSize; i++) {
      for (let j = 0; j < this.windParams.gridSize; j++) {
        this.windGrid[i][j].avgSpeed = this.windGrid[i][j].avgSpeed * 0.9;
        this.windGrid[i][j].totalSpeed = 0;
        this.windGrid[i][j].particleCount = 0;
      }
    }
  }

  public update(dt: number): void {
    this.resetWindGrid();

    const stepFactor = dt * this.windParams.baseSpeed * 0.02;
    let speedSum = 0;
    let validCount = 0;

    for (let i = 0; i < this.PARTICLE_COUNT; i++) {
      const p = this.particles[i];

      const wakeInfo = this.checkBuildingWake(p.position);
      p.isInWake = wakeInfo.inWake;

      let effectiveSpeed = p.baseSpeed * wakeInfo.slowdown;
      if (p.isInWake) {
        p.wakeTimer = 1;
      } else {
        p.wakeTimer = Math.max(0, p.wakeTimer - dt * 2);
      }

      effectiveSpeed *= (0.85 + this.windParams.turbulenceStrength * Math.sin(p.age * 0.2 + i) * 0.15);
      effectiveSpeed = Math.max(0.3, effectiveSpeed);

      const progressStep = stepFactor * (effectiveSpeed / Math.max(1, this.windParams.baseSpeed));
      p.progress += progressStep;
      p.age += dt * effectiveSpeed;

      if (p.progress >= 1 || p.progress < 0) {
        const np = this.createParticle(i);
        Object.assign(p, np);
      }

      const bezierPos = this.bezierPoint(
        p.progress,
        p.startPosition,
        p.bezierP1,
        p.bezierP2,
        p.targetPosition
      );

      const noiseOffset = new THREE.Vector3(
        Math.sin(p.age * 1.5 + i * 0.3) * 0.4 * this.windParams.turbulenceStrength,
        Math.cos(p.age * 1.2 + i * 0.2) * 0.25 * this.windParams.turbulenceStrength,
        Math.sin(p.age * 0.8 + i * 0.5) * 0.3 * this.windParams.turbulenceStrength
      );

      if (wakeInfo.inWake || p.wakeTimer > 0) {
        noiseOffset.add(wakeInfo.deflect.clone().multiplyScalar(dt * 2 + p.wakeTimer * 0.3));
      }

      p.position.copy(bezierPos).add(noiseOffset);
      p.position.y = Math.max(0.5, p.position.y);

      p.speed = effectiveSpeed;

      this.updateWindGrid(p.position, effectiveSpeed);
      speedSum += effectiveSpeed;
      validCount++;

      for (let t = this.TRAIL_LENGTH - 1; t > 0; t--) {
        p.trail[t].copy(p.trail[t - 1]);
      }
      p.trail[0].copy(p.position);

      this.dummyObj.position.copy(p.position);
      const scale = 0.8 + (effectiveSpeed / this.windParams.baseSpeed) * 0.4;
      this.dummyObj.scale.setScalar(scale);
      this.dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummyObj.matrix);

      const depthRatio = (p.position.z + this.gridBound) / (this.gridBound * 2);
      const t = Math.max(0, Math.min(1, depthRatio));
      const wakeTint = p.isInWake ? 0.3 : 0;
      this.tmpColor.copy(this.colorStart).lerp(this.colorEnd, t + wakeTint * (1 - t) * 0.5);
      this.particleMesh.setColorAt(i, this.tmpColor);

      this.updateTrailForParticle(i, p);
    }

    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }

    this.trailMesh.geometry.attributes.position.needsUpdate = true;
    this.trailMesh.geometry.attributes.color.needsUpdate = true;

    this.finalizeWindGrid();

    const sceneAvg = validCount > 0 ? speedSum / validCount : this.windParams.baseSpeed;
    this.speedHistory.push(sceneAvg);
    if (this.speedHistory.length > this.MAX_HISTORY) {
      this.speedHistory.shift();
    }

    if (this.anemometerOverlay) {
      const rect = document.getElementById('canvas-container')?.getBoundingClientRect();
      if (rect) {
        const worldPos = new THREE.Vector3(0, 5, 0);
        worldPos.project(this.camera);
        const sx = (worldPos.x * 0.5 + 0.5) * rect.width + rect.left;
        const sy = (-worldPos.y * 0.5 + 0.5) * rect.height + rect.top;
        this.anemometerOverlay.style.left = `${sx}px`;
        this.anemometerOverlay.style.top = `${sy}px`;
      }
      this.anemometerOverlay.textContent = `${sceneAvg.toFixed(1)} m/s`;
    }
  }

  private updateTrailForParticle(index: number, p: ParticleData): void {
    const stride = this.TRAIL_LENGTH * 2 * 3;
    const baseIdx = index * stride;

    for (let i = 0; i < this.TRAIL_LENGTH - 1; i++) {
      const a = p.trail[i + 1];
      const b = p.trail[i];

      const posStartIdx = baseIdx + i * 6;
      this.trailPositions[posStartIdx] = a.x;
      this.trailPositions[posStartIdx + 1] = a.y;
      this.trailPositions[posStartIdx + 2] = a.z;
      this.trailPositions[posStartIdx + 3] = b.x;
      this.trailPositions[posStartIdx + 4] = b.y;
      this.trailPositions[posStartIdx + 5] = b.z;

      const alpha = 1 - i / (this.TRAIL_LENGTH - 1);
      const depthRatio = (p.position.z + this.gridBound) / (this.gridBound * 2);
      const t = Math.max(0, Math.min(1, depthRatio));
      this.tmpColor.copy(this.colorStart).lerp(this.colorEnd, t);

      const colStartIdx = posStartIdx;
      const r = this.tmpColor.r * alpha;
      const g = this.tmpColor.g * alpha;
      const bl = this.tmpColor.b * alpha;

      this.trailColors[colStartIdx] = r;
      this.trailColors[colStartIdx + 1] = g;
      this.trailColors[colStartIdx + 2] = bl;
      this.trailColors[colStartIdx + 3] = r;
      this.trailColors[colStartIdx + 4] = g;
      this.trailColors[colStartIdx + 5] = bl;
    }
  }

  public dispose(): void {
    this.scene.remove(this.particleMesh);
    this.particleMesh.geometry.dispose();
    if (this.particleMesh.material instanceof THREE.Material) {
      this.particleMesh.material.dispose();
    }

    this.scene.remove(this.trailMesh);
    this.trailMesh.geometry.dispose();
    if (this.trailMesh.material instanceof THREE.Material) {
      this.trailMesh.material.dispose();
    }

    this.particles = [];
  }
}
