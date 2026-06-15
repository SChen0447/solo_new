import * as THREE from 'three';
import { EventBus, SimParams, WaveRadii } from './eventBus';

interface Building {
  group: THREE.Group;
  pivot: THREE.Object3D;
  height: number;
  distToSource: number;
  posX: number;
  posZ: number;
  freq: number;
  baseAmp: number;
  phase: number;
  active: boolean;
  lastDustSpawn: number;
  triggered: boolean;
  triggerEnd: number;
}

interface DustParticle {
  alive: boolean;
  age: number;
  life: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  color: THREE.Color;
}

export class BuildingParticle {
  private scene: THREE.Scene;
  private bus: EventBus;
  private buildingsGroup = new THREE.Group();
  private params: SimParams | null = null;
  private simulating = false;
  private elapsed = 0;
  private currentRadii: WaveRadii = { pRadius: 0, sRadius: 0, lRadius: 0, time: 0 };

  private buildings: Building[] = [];
  private particles: DustParticle[] = [];
  private particlesMesh!: THREE.Points;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private sizes!: Float32Array;
  private readonly MAX_PARTICLES = 2500;
  private BUILDING_COUNT = 50;

  constructor(scene: THREE.Scene, bus: EventBus) {
    this.scene = scene;
    this.bus = bus;
    this.scene.add(this.buildingsGroup);
    this.setupListeners();
    this.initParticleSystem();
    this.generateBuildings({ depth: 15, magnitude: 6, waveTypes: new Set(['P', 'S', 'L']) });
  }

  private setupListeners(): void {
    this.bus.on('params:changed', (p) => this.regenerate(p));
    this.bus.on('simulation:start', (p) => this.onStart(p));
    this.bus.on('simulation:complete', () => this.onComplete());
    this.bus.on('wavefront:update', (r) => { this.currentRadii = r; });
  }

  private initParticleSystem(): void {
    const N = this.MAX_PARTICLES;
    this.positions = new Float32Array(N * 3);
    this.colors = new Float32Array(N * 3);
    this.sizes = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      this.positions[i * 3 + 1] = -1000;
      this.colors[i * 3] = 0.6;
      this.colors[i * 3 + 1] = 0.4;
      this.colors[i * 3 + 2] = 0.25;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const dustCanvas = document.createElement('canvas');
    dustCanvas.width = dustCanvas.height = 64;
    const dx = dustCanvas.getContext('2d')!;
    const g = dx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(180,140,90,0.9)');
    g.addColorStop(0.5, 'rgba(140,100,60,0.4)');
    g.addColorStop(1, 'rgba(80,60,40,0)');
    dx.fillStyle = g;
    dx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(dustCanvas);
    tex.needsUpdate = true;

    const mat = new THREE.PointsMaterial({
      size: 1.2,
      map: tex,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.NormalBlending
    });
    this.particlesMesh = new THREE.Points(geom, mat);
    this.particlesMesh.frustumCulled = false;
    this.scene.add(this.particlesMesh);
    for (let i = 0; i < N; i++) {
      this.particles.push({
        alive: false, age: 0, life: 1,
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        size: 1, color: new THREE.Color()
      });
    }
  }

  regenerate(params: SimParams): void {
    this.generateBuildings(params);
  }

  private onStart(params: SimParams): void {
    this.params = params;
    this.simulating = true;
    this.elapsed = 0;
    this.currentRadii = { pRadius: 0, sRadius: 0, lRadius: 0, time: 0 };
    for (const b of this.buildings) {
      b.freq = 1 + (params.magnitude - 3) * (4 / 6);
      b.baseAmp = 0.15 + params.magnitude * 0.22;
      b.active = false;
      b.lastDustSpawn = 0;
      b.triggered = false;
      b.triggerEnd = 0;
    }
  }

  private onComplete(): void {
    setTimeout(() => {
      this.simulating = false;
      for (const b of this.buildings) {
        b.pivot.rotation.set(0, 0, 0);
        b.active = false;
      }
    }, 800);
  }

  private clearBuildings(): void {
    while (this.buildingsGroup.children.length > 0) {
      const c = this.buildingsGroup.children[0];
      this.buildingsGroup.remove(c);
      (c as THREE.Group).traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (mat) {
          const mats = Array.isArray(mat) ? mat : [mat];
          mats.forEach(x => x.dispose());
        }
      });
    }
    this.buildings = [];
  }

  generateBuildings(params: SimParams): void {
    this.clearBuildings();
    this.params = params;
    this.BUILDING_COUNT = 50;
    const freq = 1 + (params.magnitude - 3) * (4 / 6);
    const baseAmp = 0.15 + params.magnitude * 0.22;

    const minR = 8, maxR = 70;
    for (let i = 0; i < this.BUILDING_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = minR + Math.pow(Math.random(), 0.6) * (maxR - minR);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const h = 5 + Math.random() * 25;
      const w = 1.2 + Math.random() * 2.2;
      const d = 1.2 + Math.random() * 2.2;
      const distToSource = Math.sqrt(x * x + z * z + params.depth * params.depth);

      const group = new THREE.Group();
      group.position.set(x, 0, z);

      const pivot = new THREE.Object3D();
      pivot.position.y = 0;
      group.add(pivot);

      const grayV = THREE.MathUtils.clamp(0.55 + (1 - r / maxR) * 0.4, 0.55, 0.95);
      const color = new THREE.Color(grayV, grayV, grayV);

      const floors = Math.max(1, Math.floor(h / 3.5));
      const floorH = h / floors;
      for (let f = 0; f < floors; f++) {
        const fw = w * (1 - f * 0.015);
        const fd = d * (1 - f * 0.015);
        const box = new THREE.BoxGeometry(fw, floorH * 0.96, fd);
        const floorColor = color.clone().offsetHSL(0, 0, (Math.random() - 0.5) * 0.08);
        const mat = new THREE.MeshStandardMaterial({
          color: floorColor,
          roughness: 0.75,
          metalness: 0.12,
          transparent: true,
          opacity: 0.98
        });
        const mesh = new THREE.Mesh(box, mat);
        mesh.position.y = f * floorH + floorH / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        pivot.add(mesh);

        if (Math.random() < 0.45) {
          const windows = new THREE.Mesh(
            new THREE.BoxGeometry(fw * 1.001, floorH * 0.78, fd * 1.001),
            new THREE.MeshBasicMaterial({
              color: new THREE.Color(0.12, 0.16, 0.28),
              transparent: true,
              opacity: 0.55,
              side: THREE.DoubleSide
            })
          );
          windows.position.y = mesh.position.y;
          pivot.add(windows);
        }
      }

      if (Math.random() < 0.35) {
        const roof = new THREE.ConeGeometry(Math.min(w, d) * 0.55, 1.6, 4);
        const roofMesh = new THREE.Mesh(
          roof,
          new THREE.MeshStandardMaterial({ color: 0x8a2a3a, roughness: 0.8 })
        );
        roofMesh.position.y = h + 0.8;
        roofMesh.rotation.y = Math.PI / 4;
        pivot.add(roofMesh);
      }

      const antenna = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 3.5, 6),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
      );
      antenna.position.set(0, h + 2, 0);
      pivot.add(antenna);

      this.buildingsGroup.add(group);
      this.buildings.push({
        group, pivot, height: h, distToSource, posX: x, posZ: z,
        freq, baseAmp, phase: Math.random() * Math.PI * 2,
        active: false, lastDustSpawn: 0, triggered: false, triggerEnd: 0
      });
    }
  }

  private spawnDust(b: Building, count: number): void {
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const p = this.particles[i];
      if (p.alive) continue;
      const heightFactor = Math.random();
      const hOff = 1 + heightFactor * (b.height - 1);
      const scl = 0.9 + heightFactor * 0.5;
      const jitterX = (Math.random() - 0.5) * 1.6 * scl;
      const jitterZ = (Math.random() - 0.5) * 1.6 * scl;
      const worldPos = new THREE.Vector3(b.posX + jitterX, hOff, b.posZ + jitterZ);
      b.pivot.localToWorld(worldPos);
      p.alive = true;
      p.age = 0;
      p.life = 0.9 + Math.random() * 0.4;
      p.pos.copy(worldPos);
      p.vel.set(
        (Math.random() - 0.5) * 1.8,
        1.2 + Math.random() * 2.8,
        (Math.random() - 0.5) * 1.8
      );
      p.size = 0.5 + Math.random() * 1.0;
      const tint = 0.5 + Math.random() * 0.4;
      p.color.setRGB(0.72 * tint, 0.5 * tint, 0.3 * tint);
      spawned++;
    }
  }

  private updateParticles(dt: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.alive) {
        this.positions[i * 3 + 1] = -10000;
        this.sizes[i] = 0;
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        this.positions[i * 3 + 1] = -10000;
        this.sizes[i] = 0;
        continue;
      }
      p.vel.y -= 2.4 * dt;
      p.vel.x *= 0.98;
      p.vel.z *= 0.98;
      p.pos.addScaledVector(p.vel, dt);
      const a = 1 - p.age / p.life;
      this.positions[i * 3] = p.pos.x;
      this.positions[i * 3 + 1] = p.pos.y;
      this.positions[i * 3 + 2] = p.pos.z;
      this.colors[i * 3] = p.color.r * a;
      this.colors[i * 3 + 1] = p.color.g * a;
      this.colors[i * 3 + 2] = p.color.b * a;
      this.sizes[i] = p.size * (0.6 + a * 1.2);
    }
    const posAttr = this.particlesMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particlesMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particlesMesh.geometry.getAttribute('size') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  update(dt: number): void {
    this.updateParticles(dt);
    if (!this.simulating || !this.params) return;
    this.elapsed += dt;

    const { pRadius, sRadius, lRadius } = this.currentRadii;
    const params = this.params;

    for (const b of this.buildings) {
      const horizontalR = Math.sqrt(b.posX * b.posX + b.posZ * b.posZ);
      const wasActive = b.active;

      const depthFactor = params.depth / 50;
      const pArrive = (pRadius > 0) && (b.distToSource * (0.7 + depthFactor * 0.5) <= pRadius);
      const sArrive = (sRadius > 0) && (b.distToSource * (0.7 + depthFactor * 0.5) <= sRadius);
      const lArrive = (lRadius > 0) && (horizontalR <= lRadius);

      let waveAmpMul = 0;
      if (pArrive) waveAmpMul += 0.35;
      if (sArrive) waveAmpMul += 0.75;
      if (lArrive) waveAmpMul += 1.1;
      b.active = pArrive || sArrive || lArrive;

      if (b.active) {
        if (!wasActive) {
          b.triggered = true;
          b.triggerEnd = this.elapsed + 6;
        }
        const decay = 32;
        const dFall = Math.exp(-horizontalR / decay);
        const magBoost = Math.pow((params.magnitude - 3) / 6, 0.7);
        const amp = b.baseAmp * (0.3 + magBoost * 0.9) * dFall * waveAmpMul;

        const swayAxis = Math.atan2(b.posZ, b.posX);
        const totalPhase = this.elapsed * b.freq * Math.PI * 2 + b.phase;
        const swing = Math.sin(totalPhase) * amp;
        const swing2 = Math.sin(totalPhase * 0.63 + 1.3) * amp * 0.45;

        b.pivot.rotation.z = Math.cos(swayAxis) * swing + Math.sin(swayAxis) * swing2 * 0.4;
        b.pivot.rotation.x = -Math.sin(swayAxis) * swing + Math.cos(swayAxis) * swing2 * 0.4;
        b.pivot.rotation.y = Math.sin(totalPhase * 0.4 + b.phase) * amp * 0.18;

        if (this.elapsed - b.lastDustSpawn > (0.6 / Math.max(1, waveAmpMul))) {
          b.lastDustSpawn = this.elapsed;
          const n = Math.floor(6 + Math.random() * 10 * Math.min(1.5, waveAmpMul));
          this.spawnDust(b, n);
        }
      } else if (b.triggered && this.elapsed < b.triggerEnd) {
        const damping = Math.max(0, (b.triggerEnd - this.elapsed) / 6);
        b.pivot.rotation.z *= 0.92;
        b.pivot.rotation.x *= 0.92;
        b.pivot.rotation.y *= 0.92;
        if (damping < 0.15) {
          b.pivot.rotation.set(0, 0, 0);
          b.triggered = false;
        }
      } else {
        b.pivot.rotation.z *= 0.85;
        b.pivot.rotation.x *= 0.85;
        b.pivot.rotation.y *= 0.85;
      }
    }
  }

  dispose(): void {
    this.scene.remove(this.buildingsGroup);
    this.scene.remove(this.particlesMesh);
    this.clearBuildings();
  }
}
