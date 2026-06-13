import * as THREE from 'three';

export type CreatureType = 'grass' | 'tree' | 'rabbit' | 'wolf';

export interface TerrainInfo {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  isLand: boolean;
  elevation: number;
}

export interface PlanetConfig {
  radius?: number;
  seed?: number;
  resolution?: number;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class PerlinNoise3D {
  private perm: Uint8Array;
  private gradX: Float32Array;
  private gradY: Float32Array;
  private gradZ: Float32Array;

  constructor(seed: number = 42) {
    const rand = mulberry32(seed);
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];

    this.gradX = new Float32Array(256);
    this.gradY = new Float32Array(256);
    this.gradZ = new Float32Array(256);
    for (let i = 0; i < 256; i++) {
      let x, y, z, len;
      do {
        x = rand() * 2 - 1;
        y = rand() * 2 - 1;
        z = rand() * 2 - 1;
        len = x * x + y * y + z * z;
      } while (len > 1 || len === 0);
      len = Math.sqrt(len);
      this.gradX[i] = x / len;
      this.gradY[i] = y / len;
      this.gradZ[i] = z / len;
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const zf = z - Math.floor(z);

    const u = this.fade(xf);
    const v = this.fade(yf);
    const w = this.fade(zf);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    const hash = (idx: number) => this.perm[idx & 255];
    const dot = (gi: number, dx: number, dy: number, dz: number) =>
      this.gradX[hash(gi)] * dx + this.gradY[hash(gi)] * dy + this.gradZ[hash(gi)] * dz;

    return this.lerp(
      this.lerp(
        this.lerp(dot(AA, xf, yf, zf), dot(BA, xf - 1, yf, zf), u),
        this.lerp(dot(AB, xf, yf - 1, zf), dot(BB, xf - 1, yf - 1, zf), u),
        v
      ),
      this.lerp(
        this.lerp(dot(AA + 1, xf, yf, zf - 1), dot(BA + 1, xf - 1, yf, zf - 1), u),
        this.lerp(dot(AB + 1, xf, yf - 1, zf - 1), dot(BB + 1, xf - 1, yf - 1, zf - 1), u),
        v
      ),
      w
    );
  }

  fbm(x: number, y: number, z: number, octaves: number = 6): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * this.noise(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum / norm;
  }

  ridged(x: number, y: number, z: number, octaves: number = 6): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      let n = 1 - Math.abs(this.noise(x * freq, y * freq, z * freq));
      n *= n;
      sum += amp * n;
      norm += amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum / norm;
  }
}

export class Planet {
  mesh: THREE.Mesh;
  group: THREE.Group;
  haloMesh: THREE.Mesh;
  radius: number;
  public creaturesGroup: THREE.Group;
  private noise: PerlinNoise3D;
  private seed: number;
  private basePositions: THREE.BufferAttribute;
  private landColorMap: Float32Array;
  private oceanColorMap: Float32Array;
  private elevationValues: Float32Array;
  private _temperature: number = 25;
  private targetTemperature: number = 25;
  private colorTransitionSpeed: number = 0.02;

  constructor(scene: THREE.Scene, config: PlanetConfig = {}) {
    this.radius = config.radius ?? 5;
    this.seed = config.seed ?? 42;
    const resolution = config.resolution ?? 128;
    this.noise = new PerlinNoise3D(this.seed);

    this.group = new THREE.Group();
    this.group.name = 'planetGroup';

    this.creaturesGroup = new THREE.Group();
    this.creaturesGroup.name = 'creaturesGroup';

    const geometry = new THREE.SphereGeometry(this.radius, resolution, resolution);
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    this.basePositions = positions.clone() as THREE.BufferAttribute;

    const vertexCount = positions.count;
    this.elevationValues = new Float32Array(vertexCount);
    this.landColorMap = new Float32Array(vertexCount * 3);
    this.oceanColorMap = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);

    const tmp = new THREE.Vector3();
    for (let i = 0; i < vertexCount; i++) {
      tmp.fromBufferAttribute(this.basePositions, i);
      tmp.normalize();

      const continent = this.noise.fbm(tmp.x * 1.2, tmp.y * 1.2, tmp.z * 1.2, 5);
      const detail = this.noise.fbm(tmp.x * 3.5, tmp.y * 3.5, tmp.z * 3.5, 4) * 0.2;
      const ridge = (this.noise.ridged(tmp.x * 2.0, tmp.y * 2.0, tmp.z * 2.0, 4) - 0.5) * 0.15;

      let elevation = continent + detail + ridge;
      this.elevationValues[i] = elevation;

      const displaced = tmp.clone().multiplyScalar(this.radius + Math.max(0, elevation) * 0.5);
      positions.setXYZ(i, displaced.x, displaced.y, displaced.z);

      const landHue = this.computeLandColor(elevation, tmp.y);
      this.landColorMap[i * 3] = landHue.r;
      this.landColorMap[i * 3 + 1] = landHue.g;
      this.landColorMap[i * 3 + 2] = landHue.b;

      const oceanHue = this.computeOceanColor(elevation, tmp);
      this.oceanColorMap[i * 3] = oceanHue.r;
      this.oceanColorMap[i * 3 + 1] = oceanHue.g;
      this.oceanColorMap[i * 3 + 2] = oceanHue.b;

      if (elevation > 0) {
        colors[i * 3] = landHue.r;
        colors[i * 3 + 1] = landHue.g;
        colors[i * 3 + 2] = landHue.b;
      } else {
        colors[i * 3] = oceanHue.r;
        colors[i * 3 + 1] = oceanHue.g;
        colors[i * 3 + 2] = oceanHue.b;
      }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.name = 'planetMesh';
    this.group.add(this.mesh);
    this.group.add(this.creaturesGroup);

    this.haloMesh = this.createHalo();
    this.group.add(this.haloMesh);

    scene.add(this.group);
  }

  private computeLandColor(elevation: number, latitude: number): { r: number; g: number; b: number } {
    const absLat = Math.abs(latitude);
    const elevNorm = THREE.MathUtils.clamp(elevation / 0.6, 0, 1);

    const polarFactor = THREE.MathUtils.smoothstep(absLat, 0.7, 0.95);
    const lowlandColor = new THREE.Color(0x4a8c3f);
    const midlandColor = new THREE.Color(0x8b7355);
    const highlandColor = new THREE.Color(0xcccccc);
    const polarColor = new THREE.Color(0xe8f0ff);

    let base = new THREE.Color();
    if (elevNorm < 0.4) {
      base.copy(lowlandColor).lerp(midlandColor, elevNorm / 0.4);
    } else {
      base.copy(midlandColor).lerp(highlandColor, (elevNorm - 0.4) / 0.6);
    }
    base.lerp(polarColor, polarFactor);

    return { r: base.r, g: base.g, b: base.b };
  }

  private computeOceanColor(elevation: number, position: THREE.Vector3): { r: number; g: number; b: number } {
    const depth = Math.min(1, Math.abs(elevation) * 2.5);
    const absLat = Math.abs(position.y);

    const shallow = new THREE.Color(0x3da4d8);
    const deep = new THREE.Color(0x0a2540);
    const polar = new THREE.Color(0x9bc4e2);

    let base = shallow.clone().lerp(deep, depth);
    const polarFactor = THREE.MathUtils.smoothstep(absLat, 0.7, 0.95);
    base.lerp(polar, polarFactor * 0.4);

    return { r: base.r, g: base.g, b: base.b };
  }

  private createHalo(): THREE.Mesh {
    const haloGeo = new THREE.SphereGeometry(this.radius * 1.12, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uColor: { value: new THREE.Color(0x6688ff) },
        uIntensity: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        uniform vec3 uColor;
        uniform float uIntensity;
        void main() {
          float rim = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(uColor, rim * uIntensity);
        }
      `,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.name = 'haloMesh';
    return halo;
  }

  get temperature(): number {
    return this.targetTemperature;
  }

  setTemperature(value: number) {
    this.targetTemperature = THREE.MathUtils.clamp(value, 0, 50);
  }

  getElevationAt(point: THREE.Vector3): number {
    const dir = point.clone().normalize();
    const continent = this.noise.fbm(dir.x * 1.2, dir.y * 1.2, dir.z * 1.2, 5);
    const detail = this.noise.fbm(dir.x * 3.5, dir.y * 3.5, dir.z * 3.5, 4) * 0.2;
    const ridge = (this.noise.ridged(dir.x * 2.0, dir.y * 2.0, dir.z * 2.0, 4) - 0.5) * 0.15;
    return Math.max(0, continent + detail + ridge) * 0.5;
  }

  isLandAt(point: THREE.Vector3): boolean {
    const dir = point.clone().normalize();
    const continent = this.noise.fbm(dir.x * 1.2, dir.y * 1.2, dir.z * 1.2, 5);
    const detail = this.noise.fbm(dir.x * 3.5, dir.y * 3.5, dir.z * 3.5, 4) * 0.2;
    return continent + detail > 0;
  }

  getSurfacePoint(direction: THREE.Vector3): TerrainInfo {
    const dir = direction.clone().normalize();
    const elevation = this.getElevationAt(dir);
    const position = dir.multiplyScalar(this.radius + elevation);
    return {
      position,
      normal: position.clone().normalize(),
      isLand: elevation > 0.01,
      elevation,
    };
  }

  getRandomLandPoint(): TerrainInfo {
    for (let i = 0; i < 50; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      const info = this.getSurfacePoint(dir);
      if (info.isLand) return info;
    }
    return this.getSurfacePoint(new THREE.Vector3(1, 0.2, 0.5).normalize());
  }

  getRandomPoint(): TerrainInfo {
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    return this.getSurfacePoint(dir);
  }

  addCreature(mesh: THREE.Object3D) {
    this.creaturesGroup.add(mesh);
  }

  removeCreature(mesh: THREE.Object3D) {
    this.creaturesGroup.remove(mesh);
  }

  private updateTemperatureColors(dt: number) {
    if (Math.abs(this._temperature - this.targetTemperature) < 0.01) {
      this._temperature = this.targetTemperature;
      return;
    }

    this._temperature += (this.targetTemperature - this._temperature) * this.colorTransitionSpeed;

    const tempNorm = (this._temperature - 25) / 25;
    const positions = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.mesh.geometry.attributes.color as THREE.BufferAttribute;
    const count = positions.count;

    const hotLand = new THREE.Color(0xc9a64a);
    const coldLand = new THREE.Color(0x6a95c9);
    const hotOcean = new THREE.Color(0x4a90b8);
    const coldOcean = new THREE.Color(0x6aa8c9);

    const tmp = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const elev = this.elevationValues[i];
      tmp.fromBufferAttribute(this.basePositions, i);
      tmp.normalize();
      const absLat = Math.abs(tmp.y);
      const polarFactor = THREE.MathUtils.smoothstep(absLat, 0.7, 0.95);

      if (elev > 0) {
        let r = this.landColorMap[i * 3];
        let g = this.landColorMap[i * 3 + 1];
        let b = this.landColorMap[i * 3 + 2];

        if (tempNorm > 0) {
          r = THREE.MathUtils.lerp(r, hotLand.r, tempNorm * (1 - polarFactor * 0.5));
          g = THREE.MathUtils.lerp(g, hotLand.g, tempNorm * (1 - polarFactor * 0.5));
          b = THREE.MathUtils.lerp(b, hotLand.b, tempNorm * (1 - polarFactor * 0.3));
        } else {
          const t = -tempNorm;
          r = THREE.MathUtils.lerp(r, coldLand.r, t * 0.8);
          g = THREE.MathUtils.lerp(g, coldLand.g, t * 0.6);
          b = THREE.MathUtils.lerp(b, coldLand.b, t * 0.9);
        }

        const snowCap = polarFactor + (elev > 0.3 ? (elev - 0.3) * 2 : 0);
        const snow = Math.min(1, Math.max(0, snowCap - tempNorm * 0.3));
        r = THREE.MathUtils.lerp(r, 0.95, snow * 0.7);
        g = THREE.MathUtils.lerp(g, 0.97, snow * 0.7);
        b = THREE.MathUtils.lerp(b, 1.0, snow * 0.8);

        colors.setXYZ(i, r, g, b);
      } else {
        let r = this.oceanColorMap[i * 3];
        let g = this.oceanColorMap[i * 3 + 1];
        let b = this.oceanColorMap[i * 3 + 2];

        if (tempNorm > 0) {
          r = THREE.MathUtils.lerp(r, hotOcean.r, tempNorm * 0.3);
          g = THREE.MathUtils.lerp(g, hotOcean.g, tempNorm * 0.2);
          b = THREE.MathUtils.lerp(b, hotOcean.b, tempNorm * 0.15);
        } else {
          const t = -tempNorm;
          r = THREE.MathUtils.lerp(r, coldOcean.r, t * 0.4);
          g = THREE.MathUtils.lerp(g, coldOcean.g, t * 0.35);
          b = THREE.MathUtils.lerp(b, coldOcean.b, t * 0.25);
        }
        colors.setXYZ(i, r, g, b);
      }
    }
    colors.needsUpdate = true;
  }

  update(delta: number) {
    this.group.rotation.y += 0.001;
    this.updateTemperatureColors(delta);
  }
}
