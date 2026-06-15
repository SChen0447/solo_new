import * as THREE from 'three';
import { EventBus, SimParams, WaveRadii, WaveType } from './eventBus';

const P_SPEED = 7.0;
const S_SPEED = 4.0;
const L_SPEED = 3.5;

const MAX_SIM_DISTANCE = 160;
const HALF_SHELL = 1.2;

export class EarthquakeSource {
  private scene: THREE.Scene;
  private bus: EventBus;
  private group = new THREE.Group();

  private params: SimParams | null = null;
  private running = false;
  private elapsed = 0;
  private pulseT = 0;

  private sourceMarker!: THREE.Mesh;
  private sourceGlow!: THREE.Sprite;
  private pShell: THREE.Mesh | null = null;
  private sShell: THREE.Mesh | null = null;
  private lShell: THREE.Mesh | null = null;

  private lastBroadcastTime = -1;

  constructor(scene: THREE.Scene, bus: EventBus) {
    this.scene = scene;
    this.bus = bus;
    this.scene.add(this.group);
    this.createSourceMarker();
    this.setupListeners();
  }

  private createSourceMarker(): void {
    const geom = new THREE.SphereGeometry(1.2, 24, 24);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xff2e4d,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sourceMarker = new THREE.Mesh(geom, mat);
    this.group.add(this.sourceMarker);

    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d')!;
    const grd = gctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grd.addColorStop(0, 'rgba(255, 70, 100, 0.95)');
    grd.addColorStop(0.3, 'rgba(233, 69, 96, 0.55)');
    grd.addColorStop(0.7, 'rgba(233, 69, 96, 0.12)');
    grd.addColorStop(1, 'rgba(233, 69, 96, 0)');
    gctx.fillStyle = grd;
    gctx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(glowCanvas);
    tex.needsUpdate = true;
    const glowMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sourceGlow = new THREE.Sprite(glowMat);
    this.sourceGlow.scale.set(10, 10, 1);
    this.group.add(this.sourceGlow);
  }

  private setupListeners(): void {
    this.bus.on('params:changed', (p) => this.onParamsChanged(p));
    this.bus.on('simulation:start', (p) => this.start(p));
    this.bus.on('simulation:complete', () => this.stop());
  }

  private onParamsChanged(p: SimParams): void {
    this.sourceMarker.position.set(0, -p.depth, 0);
    this.sourceGlow.position.set(0, -p.depth, 0);
  }

  private makeGradientTexture(colors: [string, string, string]): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.5, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 64);
    const t = new THREE.CanvasTexture(c);
    t.needsUpdate = true;
    return t;
  }

  private createShell(type: WaveType): THREE.Mesh {
    let seg = 64;
    if (type === 'L') seg = 48;
    const geom = new THREE.SphereGeometry(1, seg, Math.max(12, Math.floor(seg / 2)));
    let colors: [string, string, string];
    let side: THREE.Side = THREE.DoubleSide;
    if (type === 'P') {
      colors = ['#00ffd0', '#3ddbd9', '#1a7aa8'];
    } else if (type === 'S') {
      colors = ['#ffb347', '#ff6b35', '#c23a1e'];
    } else {
      colors = ['#e2a6ff', '#b266ff', '#6d28d9'];
    }
    const tex = this.makeGradientTexture(colors);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.3,
      side,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.visible = false;
    this.group.add(mesh);
    return mesh;
  }

  start(params: SimParams): void {
    this.resetShells();
    this.params = params;
    this.elapsed = 0;
    this.running = true;
    this.sourceMarker.position.set(0, -params.depth, 0);
    this.sourceGlow.position.set(0, -params.depth, 0);

    if (params.waveTypes.has('P') && !this.pShell) this.pShell = this.createShell('P');
    if (params.waveTypes.has('S') && !this.sShell) this.sShell = this.createShell('S');
    if (params.waveTypes.has('L') && !this.lShell) this.lShell = this.createShell('L');

    const startR = 0.5;
    if (this.pShell) {
      this.pShell.visible = params.waveTypes.has('P');
      this.pShell.position.set(0, -params.depth, 0);
      this.pShell.scale.setScalar(startR);
    }
    if (this.sShell) {
      this.sShell.visible = params.waveTypes.has('S');
      this.sShell.position.set(0, -params.depth, 0);
      this.sShell.scale.setScalar(startR);
    }
    if (this.lShell) {
      this.lShell.visible = params.waveTypes.has('L');
      this.lShell.position.set(0, 0, 0);
      this.lShell.scale.setScalar(startR);
      const lScale = new THREE.Vector3(1.2, 0.12, 1.2);
      this.lShell.scale.multiply(lScale);
      this.lShell.position.y = 0;
    }
    this.bus.emit('simulation:progress', { progress: 0 });
  }

  private resetShells(): void {
    for (const s of [this.pShell, this.sShell, this.lShell]) {
      if (s) s.visible = false;
    }
  }

  stop(): void {
    this.running = false;
    setTimeout(() => this.resetShells(), 1200);
  }

  update(dt: number): void {
    this.pulseT += dt;
    const pulse = 1 + Math.sin(this.pulseT * 3.2) * 0.08;
    this.sourceMarker.scale.setScalar(pulse);
    this.sourceGlow.scale.setScalar(8 + Math.sin(this.pulseT * 2.6) * 1.6);
    const mat = this.sourceMarker.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.75 + Math.sin(this.pulseT * 4) * 0.15;

    if (!this.running || !this.params) return;

    this.elapsed += dt;

    const pR = this.params.waveTypes.has('P') ? this.elapsed * P_SPEED : 0;
    const sR = this.params.waveTypes.has('S') ? this.elapsed * S_SPEED : 0;
    const lR = this.params.waveTypes.has('L') ? this.elapsed * L_SPEED : 0;

    const breath = 1 + Math.sin(this.pulseT * 2.2) * 0.04;
    if (this.pShell && this.pShell.visible) {
      this.pShell.scale.setScalar(pR * breath);
      const om = THREE.MathUtils.clamp(1 - pR / MAX_SIM_DISTANCE * 0.8, 0.05, 0.35);
      (this.pShell.material as THREE.MeshBasicMaterial).opacity = om * 0.85;
    }
    if (this.sShell && this.sShell.visible) {
      this.sShell.scale.setScalar(sR * breath);
      const om = THREE.MathUtils.clamp(1 - sR / MAX_SIM_DISTANCE * 0.8, 0.05, 0.35);
      (this.sShell.material as THREE.MeshBasicMaterial).opacity = om * 0.9;
    }
    if (this.lShell && this.lShell.visible) {
      this.lShell.scale.set(lR * breath * 1.2, lR * breath * 0.12, lR * breath * 1.2);
      const om = THREE.MathUtils.clamp(1 - lR / MAX_SIM_DISTANCE * 0.8, 0.05, 0.4);
      (this.lShell.material as THREE.MeshBasicMaterial).opacity = om * 0.95;
    }

    const maxActiveR = Math.max(pR, sR, lR);
    const progress = THREE.MathUtils.clamp(maxActiveR / MAX_SIM_DISTANCE, 0, 1);

    const updatePayload: WaveRadii = {
      pRadius: pR,
      sRadius: sR,
      lRadius: lR,
      time: this.elapsed
    };
    const discreteT = Math.floor(this.elapsed / 0.5);
    if (discreteT !== this.lastBroadcastTime) {
      this.lastBroadcastTime = discreteT;
    }
    this.bus.emit('wavefront:update', updatePayload);
    this.bus.emit('simulation:progress', { progress });

    if (maxActiveR > MAX_SIM_DISTANCE * 1.02) {
      this.running = false;
      this.bus.emit('simulation:complete', undefined as any);
    }
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.group.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose?.();
      if (mesh.material) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(m => m.dispose());
      }
    });
  }
}

export { P_SPEED, S_SPEED, L_SPEED };
