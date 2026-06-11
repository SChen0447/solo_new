import * as THREE from 'three';

export type ColorMode = 'rainbow' | 'warm' | 'cool' | 'neon';
export type ParticleShape = 'circle' | 'triangle' | 'square';
export type MotionMode = 'lorenz' | 'noise' | 'attractors' | 'vortex' | 'galaxy';

export interface ParticleParams {
  count: number;
  speed: number;
  size: number;
  colorMode: ColorMode;
  shape: ParticleShape;
  motionMode: MotionMode;
  trailEnabled: boolean;
  trailLength: number;
}

interface ParticleData {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  baseSizes: Float32Array;
  phases: Float32Array;
  attractorIdx: Uint8Array;
}

interface TrailBuffer {
  positions: Float32Array[];
  writeHead: number;
}

class SimplexNoise3D {
  private perm: Uint8Array;
  private grad3: number[][];

  constructor(seed = 1337) {
    this.grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Uint8Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  private dot(g: number[], x: number, y: number, z: number): number {
    return g[0]*x + g[1]*y + g[2]*z;
  }

  private fade(t: number): number { return t*t*t*(t*(t*6-15)+10); }
  private lerp(a: number, b: number, t: number): number { return a + t*(b-a); }

  noise(xin: number, yin: number, zin: number): number {
    const F3 = 1/3, G3 = 1/6;
    const s = (xin+yin+zin)*F3;
    const i = Math.floor(xin+s), j = Math.floor(yin+s), k = Math.floor(zin+s);
    const t = (i+j+k)*G3;
    const X0 = i-t, Y0 = j-t, Z0 = k-t;
    const x0 = xin-X0, y0 = yin-Y0, z0 = zin-Z0;

    let i1,j1,k1,i2,j2,k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0; }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1; }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1; }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1; }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1; }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0; }
    }

    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2*G3, y2 = y0 - j2 + 2*G3, z2 = z0 - k2 + 2*G3;
    const x3 = x0 - 1 + 3*G3, y3 = y0 - 1 + 3*G3, z3 = z0 - 1 + 3*G3;

    const ii = i & 255, jj = j & 255, kk = k & 255;
    const gi0 = this.perm[ii+this.perm[jj+this.perm[kk]]] % 12;
    const gi1 = this.perm[ii+i1+this.perm[jj+j1+this.perm[kk+k1]]] % 12;
    const gi2 = this.perm[ii+i2+this.perm[jj+j2+this.perm[kk+k2]]] % 12;
    const gi3 = this.perm[ii+1+this.perm[jj+1+this.perm[kk+1]]] % 12;

    let n0,n1,n2,n3;
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    n0 = t0 < 0 ? 0 : (t0*=t0, t0*t0*this.dot(this.grad3[gi0],x0,y0,z0));
    let t1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    n1 = t1 < 0 ? 0 : (t1*=t1, t1*t1*this.dot(this.grad3[gi1],x1,y1,z1));
    let t2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    n2 = t2 < 0 ? 0 : (t2*=t2, t2*t2*this.dot(this.grad3[gi2],x2,y2,z2));
    let t3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    n3 = t3 < 0 ? 0 : (t3*=t3, t3*t3*this.dot(this.grad3[gi3],x3,y3,z3));

    return 32*(n0+n1+n2+n3);
  }
}

export class ParticleSystem {
  public points: THREE.Points;
  public trailMeshes: THREE.Points[] = [];
  public params: ParticleParams;
  public paused = false;

  private geometry: THREE.BufferGeometry;
  private data!: ParticleData;
  private trailBuffer!: TrailBuffer;
  private time = 0;
  private noise: SimplexNoise3D;
  private attractors: THREE.Vector3[];

  private static readonly LORENZ_SIGMA = 10;
  private static readonly LORENZ_RHO = 28;
  private static readonly LORENZ_BETA = 8/3;
  private static readonly LORENZ_SCALE = 0.12;
  private static readonly BOUNDARY = 12;

  constructor(params: Partial<ParticleParams> = {}) {
    this.params = {
      count: 5000,
      speed: 1.0,
      size: 0.15,
      colorMode: 'rainbow',
      shape: 'circle',
      motionMode: 'lorenz',
      trailEnabled: false,
      trailLength: 12,
      ...params
    };

    this.noise = new SimplexNoise3D(42);
    this.attractors = this.initAttractors();

    this.geometry = new THREE.BufferGeometry();
    const material = this.createMaterial();
    this.points = new THREE.Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 1;

    this.initParticles();
  }

  private initAttractors(): THREE.Vector3[] {
    return [
      new THREE.Vector3(3, 1, 2),
      new THREE.Vector3(-4, -2, 1),
      new THREE.Vector3(1, 4, -3),
      new THREE.Vector3(-2, 3, 4),
      new THREE.Vector3(2, -4, -2)
    ];
  }

  private createShapeTexture(shape: ParticleShape): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 64, 64);

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.7)');
    gradient.addColorStop(0.75, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    switch (shape) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(32, 4);
        ctx.lineTo(60, 58);
        ctx.lineTo(4, 58);
        ctx.closePath();
        ctx.fill();
        break;
      case 'square':
        ctx.fillRect(6, 6, 52, 52);
        break;
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return tex;
  }

  private createMaterial(): THREE.PointsMaterial {
    const texture = this.createShapeTexture(this.params.shape);
    return new THREE.PointsMaterial({
      size: this.params.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: true,
      map: texture,
      alphaTest: 0.02,
      sizeAttenuation: true
    });
  }

  private getColorForIndex(i: number, total: number): THREE.Color {
    const color = new THREE.Color();
    const t = i / total;
    switch (this.params.colorMode) {
      case 'rainbow':
        color.setHSL(t, 0.88, 0.58);
        break;
      case 'warm':
        color.setHSL(0.02 + t * 0.1, 0.92, 0.48 + t * 0.2);
        break;
      case 'cool':
        color.setHSL(0.52 + t * 0.18, 0.88, 0.5 + t * 0.18);
        break;
      case 'neon':
        color.setHSL(0.68 + t * 0.18, 0.98, 0.58 + t * 0.08);
        break;
    }
    return color;
  }

  private initParticles(): void {
    const { count } = this.params;
    this.data = {
      positions: new Float32Array(count * 3),
      velocities: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      sizes: new Float32Array(count),
      baseSizes: new Float32Array(count),
      phases: new Float32Array(count),
      attractorIdx: new Uint8Array(count)
    };

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = 0.5 + Math.random() * 1.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      this.data.positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      this.data.positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      this.data.positions[i3 + 2] = radius * Math.cos(phi);

      this.data.velocities[i3] = (Math.random() - 0.5) * 0.3;
      this.data.velocities[i3 + 1] = (Math.random() - 0.5) * 0.3;
      this.data.velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;

      const color = this.getColorForIndex(i, count);
      this.data.colors[i3] = color.r;
      this.data.colors[i3 + 1] = color.g;
      this.data.colors[i3 + 2] = color.b;

      const sz = this.params.size * (0.55 + Math.random() * 0.9);
      this.data.sizes[i] = sz;
      this.data.baseSizes[i] = sz;
      this.data.phases[i] = Math.random() * Math.PI * 2;
      this.data.attractorIdx[i] = Math.floor(Math.random() * this.attractors.length);
    }

    this.initTrailBuffer();
    this.updateGeometry();
    this.createTrailMeshes();
  }

  private initTrailBuffer(): void {
    const len = Math.max(1, this.params.trailLength);
    const pos = this.data.positions;
    this.trailBuffer = { positions: [], writeHead: 0 };
    for (let t = 0; t < len; t++) {
      const arr = new Float32Array(pos.length);
      arr.set(pos);
      this.trailBuffer.positions.push(arr);
    }
  }

  private createTrailMeshes(): void {
    this.trailMeshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
    this.trailMeshes = [];
    if (!this.params.trailEnabled) return;

    const tex = (this.points.material as THREE.PointsMaterial).map;
    const len = this.trailBuffer.positions.length;
    const count = this.params.count;

    for (let t = 0; t < len - 1; t++) {
      const age = t / (len - 1);
      const decay = Math.pow(1 - age, 2);
      const geo = new THREE.BufferGeometry();
      const colorArr = new Float32Array(this.data.colors);

      geo.setAttribute('position', new THREE.BufferAttribute(this.trailBuffer.positions[t], 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colorArr, 3));

      const mat = new THREE.PointsMaterial({
        size: this.params.size * decay * 0.8,
        vertexColors: true,
        transparent: true,
        opacity: decay * 0.3,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        depthTest: true,
        map: tex,
        alphaTest: 0.02,
        sizeAttenuation: true
      });

      const pts = new THREE.Points(geo, mat);
      pts.frustumCulled = false;
      pts.renderOrder = 2 + t;
      this.trailMeshes.push(pts);
      void count;
    }
  }

  private updateGeometry(): void {
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.data.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.data.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.data.sizes, 1));
  }

  private clampBoundary(i3: number): void {
    const B = ParticleSystem.BOUNDARY;
    if (this.data.positions[i3] > B) { this.data.positions[i3] = B - 0.5; this.data.velocities[i3] *= -0.6; }
    else if (this.data.positions[i3] < -B) { this.data.positions[i3] = -B + 0.5; this.data.velocities[i3] *= -0.6; }
    if (this.data.positions[i3+1] > B) { this.data.positions[i3+1] = B - 0.5; this.data.velocities[i3+1] *= -0.6; }
    else if (this.data.positions[i3+1] < -B) { this.data.positions[i3+1] = -B + 0.5; this.data.velocities[i3+1] *= -0.6; }
    if (this.data.positions[i3+2] > B) { this.data.positions[i3+2] = B - 0.5; this.data.velocities[i3+2] *= -0.6; }
    else if (this.data.positions[i3+2] < -B) { this.data.positions[i3+2] = -B + 0.5; this.data.velocities[i3+2] *= -0.6; }
  }

  private updateLorenz(i: number, i3: number, dt: number): void {
    const S = ParticleSystem.LORENZ_SIGMA;
    const R = ParticleSystem.LORENZ_RHO;
    const B = ParticleSystem.LORENZ_BETA;
    const SC = ParticleSystem.LORENZ_SCALE;

    let x = this.data.positions[i3] / SC;
    let y = this.data.positions[i3+1] / SC;
    let z = this.data.positions[i3+2] / SC;
    const phase = this.data.phases[i];

    const dx = S * (y - x) * dt;
    const dy = (x * (R - z) - y) * dt;
    const dz = (x * y - B * z) * dt;

    x += dx; y += dy; z += dz;

    const jitter = 0.002;
    x += Math.sin(phase + this.time * 1.3) * jitter;
    y += Math.cos(phase + this.time * 1.7) * jitter;

    this.data.positions[i3] = x * SC;
    this.data.positions[i3+1] = y * SC;
    this.data.positions[i3+2] = z * SC;
  }

  private updateNoise(i: number, i3: number, dt: number): void {
    const x = this.data.positions[i3];
    const y = this.data.positions[i3+1];
    const z = this.data.positions[i3+2];
    const phase = this.data.phases[i];
    const tScale = 0.08;

    const nx = this.noise.noise(x * 0.2 + phase, y * 0.2, z * 0.2 + this.time * tScale);
    const ny = this.noise.noise(x * 0.2, y * 0.2 + phase, z * 0.2 + this.time * tScale + 100);
    const nz = this.noise.noise(x * 0.2, y * 0.2, z * 0.2 + phase + this.time * tScale + 200);

    this.data.velocities[i3] = this.data.velocities[i3] * 0.96 + nx * dt * 1.5;
    this.data.velocities[i3+1] = this.data.velocities[i3+1] * 0.96 + ny * dt * 1.5;
    this.data.velocities[i3+2] = this.data.velocities[i3+2] * 0.96 + nz * dt * 1.5;

    this.data.positions[i3] += this.data.velocities[i3];
    this.data.positions[i3+1] += this.data.velocities[i3+1];
    this.data.positions[i3+2] += this.data.velocities[i3+2];
  }

  private updateAttractors(i: number, i3: number, dt: number): void {
    const x = this.data.positions[i3];
    const y = this.data.positions[i3+1];
    const z = this.data.positions[i3+2];
    const ai = this.data.attractorIdx[i];
    const attr = this.attractors[ai];

    const ax = attr.x - x;
    const ay = attr.y - y;
    const az = attr.z - z;
    const d2 = ax*ax + ay*ay + az*az;
    const d = Math.sqrt(d2) + 0.001;

    let fx = ax / d * 2.5 / (d + 0.3);
    let fy = ay / d * 2.5 / (d + 0.3);
    let fz = az / d * 2.5 / (d + 0.3);

    for (let k = 0; k < this.attractors.length; k++) {
      if (k === ai) continue;
      const a = this.attractors[k];
      const bx = a.x - x, by = a.y - y, bz = a.z - z;
      const dd2 = bx*bx + by*by + bz*bz;
      const dd = Math.sqrt(dd2) + 0.001;
      if (dd < 3) {
        const rep = 1.2 / (dd * dd);
        fx -= bx / dd * rep;
        fy -= by / dd * rep;
        fz -= bz / dd * rep;
      }
    }

    const phase = this.data.phases[i];
    fx += (this.noise.noise(x*0.3, y*0.3, z*0.3 + phase)) * 0.3;
    fy += (this.noise.noise(x*0.3 + 50, y*0.3, z*0.3 + phase)) * 0.3;
    fz += (this.noise.noise(x*0.3, y*0.3 + 50, z*0.3 + phase)) * 0.3;

    this.data.velocities[i3] = this.data.velocities[i3] * 0.94 + fx * dt;
    this.data.velocities[i3+1] = this.data.velocities[i3+1] * 0.94 + fy * dt;
    this.data.velocities[i3+2] = this.data.velocities[i3+2] * 0.94 + fz * dt;

    const vLim = 1.2;
    const vx = this.data.velocities[i3], vy = this.data.velocities[i3+1], vz = this.data.velocities[i3+2];
    const vl = Math.sqrt(vx*vx + vy*vy + vz*vz);
    if (vl > vLim) {
      const s = vLim / vl;
      this.data.velocities[i3] *= s;
      this.data.velocities[i3+1] *= s;
      this.data.velocities[i3+2] *= s;
    }

    this.data.positions[i3] += this.data.velocities[i3];
    this.data.positions[i3+1] += this.data.velocities[i3+1];
    this.data.positions[i3+2] += this.data.velocities[i3+2];

    if (d < 0.3 && Math.random() < 0.003) {
      this.data.attractorIdx[i] = Math.floor(Math.random() * this.attractors.length);
    }
  }

  private updateVortex(i: number, i3: number, dt: number): void {
    const x = this.data.positions[i3];
    const y = this.data.positions[i3+1];
    const z = this.data.positions[i3+2];
    const phase = this.data.phases[i];

    const r = Math.sqrt(x*x + z*z) + 0.001;
    const theta = Math.atan2(z, x);
    const rotSpeed = (2.5 + phase * 1.5) / (r + 0.8);

    const lift = Math.sin(r * 0.8 - this.time * 1.5 + phase) * 0.6;
    const pull = (3 - r) * 0.25;

    const newTheta = theta + rotSpeed * dt;
    const newR = r + pull * dt;
    const finalR = Math.max(0.5, Math.min(9, newR));

    this.data.positions[i3] = Math.cos(newTheta) * finalR;
    this.data.positions[i3+2] = Math.sin(newTheta) * finalR;
    this.data.positions[i3+1] = y + lift * dt + (this.noise.noise(x*0.4, phase, z*0.4)) * 0.15 * dt;

    const lim = ParticleSystem.BOUNDARY - 0.5;
    if (this.data.positions[i3+1] > lim) this.data.positions[i3+1] = lim;
    else if (this.data.positions[i3+1] < -lim) this.data.positions[i3+1] = -lim;
  }

  private updateGalaxy(i: number, i3: number, dt: number): void {
    const x = this.data.positions[i3];
    const y = this.data.positions[i3+1];
    const z = this.data.positions[i3+2];
    const phase = this.data.phases[i];

    const arm = i % 4;
    const r = Math.sqrt(x*x + z*z);
    let theta = Math.atan2(z, x);
    const armOffset = arm * (Math.PI / 2);
    const targetTheta = armOffset + r * 0.35;
    let diff = targetTheta - theta;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const rotSpeed = 0.8 + 3 / (r + 1.2);
    theta += diff * 0.02 + dt * rotSpeed * (phase > 0.5 ? 1 : -1);

    const targetR = 1.5 + (phase * 8);
    const rDiff = targetR - r;
    const newR = Math.max(0.5, r + rDiff * 0.003);

    const wave = Math.sin(r * 0.6 - this.time * 2 + arm + phase) * 0.3;
    const thick = Math.cos(r * 0.4 + phase * 5) * 0.4;

    this.data.positions[i3] = Math.cos(theta) * newR;
    this.data.positions[i3+2] = Math.sin(theta) * newR;
    this.data.positions[i3+1] = wave + thick + (this.noise.noise(x*0.5, y*0.5, z*0.5 + phase)) * 0.25;
  }

  public update(deltaTime: number): void {
    if (this.paused) return;
    this.time += deltaTime;

    const { count, speed, motionMode } = this.params;
    const dt = deltaTime * speed;
    const d = this.data;

    switch (motionMode) {
      case 'lorenz':
        for (let i = 0; i < count; i++) this.updateLorenz(i, i * 3, dt);
        break;
      case 'noise':
        for (let i = 0; i < count; i++) { this.updateNoise(i, i * 3, dt); this.clampBoundary(i * 3); }
        break;
      case 'attractors':
        for (let i = 0; i < count; i++) { this.updateAttractors(i, i * 3, dt); this.clampBoundary(i * 3); }
        break;
      case 'vortex':
        for (let i = 0; i < count; i++) this.updateVortex(i, i * 3, dt);
        break;
      case 'galaxy':
        for (let i = 0; i < count; i++) this.updateGalaxy(i, i * 3, dt);
        break;
    }

    const t = this.time * 2;
    for (let i = 0; i < count; i++) {
      d.sizes[i] = d.baseSizes[i] * (1 + Math.sin(t + d.phases[i]) * 0.2);
    }

    if (this.params.trailEnabled && this.trailMeshes.length > 0) {
      this.trailBuffer.writeHead = (this.trailBuffer.writeHead + 1) % this.trailBuffer.positions.length;
      this.trailBuffer.positions[this.trailBuffer.writeHead].set(d.positions);

      const len = this.trailMeshes.length;
      for (let m = 0; m < len; m++) {
        const idx = (this.trailBuffer.writeHead - m - 1 + this.trailBuffer.positions.length) % this.trailBuffer.positions.length;
        const mesh = this.trailMeshes[m];
        (mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
        const pAttr = mesh.geometry.attributes.position as THREE.BufferAttribute;
        if (pAttr.array !== this.trailBuffer.positions[idx]) {
          pAttr.array = this.trailBuffer.positions[idx];
          pAttr.updateRange.count = -1;
        }
      }
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
  }

  public setCount(count: number): void {
    this.params.count = count;
    this.initParticles();
  }

  public setSpeed(speed: number): void { this.params.speed = speed; }

  public setSize(size: number): void {
    this.params.size = size;
    for (let i = 0; i < this.params.count; i++) {
      const s = size * (0.55 + (this.data.baseSizes[i] / this.params.size) * 0.45);
      this.data.baseSizes[i] = s;
      this.data.sizes[i] = s;
    }
    (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).size = size;
  }

  public setColorMode(mode: ColorMode): void {
    this.params.colorMode = mode;
    for (let i = 0; i < this.params.count; i++) {
      const i3 = i * 3;
      const c = this.getColorForIndex(i, this.params.count);
      this.data.colors[i3] = c.r;
      this.data.colors[i3+1] = c.g;
      this.data.colors[i3+2] = c.b;
    }
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    this.trailMeshes.forEach(mesh => {
      const arr = (mesh.geometry.attributes.color as THREE.BufferAttribute).array as Float32Array;
      arr.set(this.data.colors);
      (mesh.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
    });
  }

  public setShape(shape: ParticleShape): void {
    this.params.shape = shape;
    const tex = this.createShapeTexture(shape);
    const swap = (mat: THREE.PointsMaterial) => {
      mat.map?.dispose();
      mat.map = tex;
      mat.alphaTest = 0.02;
      mat.depthTest = true;
      mat.needsUpdate = true;
    };
    swap(this.points.material as THREE.PointsMaterial);
    this.trailMeshes.forEach(m => swap(m.material as THREE.PointsMaterial));
  }

  public setMotionMode(mode: MotionMode): void {
    if (this.params.motionMode === mode) return;
    this.params.motionMode = mode;
    const count = this.params.count;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.data.velocities[i3] *= 0.3;
      this.data.velocities[i3+1] *= 0.3;
      this.data.velocities[i3+2] *= 0.3;
    }
  }

  public setTrailEnabled(enabled: boolean): void {
    if (this.params.trailEnabled === enabled) return;
    this.params.trailEnabled = enabled;
    if (enabled) this.initTrailBuffer();
    this.createTrailMeshes();
  }

  public setTrailLength(length: number): void {
    this.params.trailLength = length;
    if (this.params.trailEnabled) {
      this.initTrailBuffer();
      this.createTrailMeshes();
    }
  }

  public togglePause(): void { this.paused = !this.paused; }

  public reset(): void {
    this.initParticles();
    this.time = 0;
  }

  public dispose(): void {
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.trailMeshes.forEach(m => {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }

  public benchmarkUpdate(iterations: number): number {
    const start = performance.now();
    const savedPaused = this.paused;
    this.paused = false;
    for (let i = 0; i < iterations; i++) this.update(0.016);
    this.paused = savedPaused;
    return (performance.now() - start) / iterations;
  }

  public getParticleCount(): number { return this.params.count; }
  public getActiveTrailCount(): number { return this.trailMeshes.length; }
}
