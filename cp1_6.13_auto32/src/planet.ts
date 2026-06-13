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

class ImprovedPerlinNoise3D {
  private perm: Uint8Array;
  private gradP: { x: number; y: number; z: number }[];

  private static grad3 = [
    { x: 1, y: 1, z: 0 }, { x: -1, y: 1, z: 0 }, { x: 1, y: -1, z: 0 }, { x: -1, y: -1, z: 0 },
    { x: 1, y: 0, z: 1 }, { x: -1, y: 0, z: 1 }, { x: 1, y: 0, z: -1 }, { x: -1, y: 0, z: -1 },
    { x: 0, y: 1, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 0, y: 1, z: -1 }, { x: 0, y: -1, z: -1 },
  ];

  constructor(seed: number = 42) {
    const rand = mulberry32(seed);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    this.perm = new Uint8Array(512);
    this.gradP = new Array(512);
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
      this.gradP[i] = ImprovedPerlinNoise3D.grad3[this.perm[i] % 12];
    }
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return (1 - t) * a + t * b;
  }

  private dot(g: { x: number; y: number; z: number }, x: number, y: number, z: number): number {
    return g.x * x + g.y * y + g.z * z;
  }

  noise(x: number, y: number, z: number): number {
    let X = Math.floor(x) & 255;
    let Y = Math.floor(y) & 255;
    let Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);

    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);

    const A = this.perm[X] + Y;
    const AA = this.perm[A] + Z;
    const AB = this.perm[A + 1] + Z;
    const B = this.perm[X + 1] + Y;
    const BA = this.perm[B] + Z;
    const BB = this.perm[B + 1] + Z;

    return this.lerp(
      this.lerp(
        this.lerp(this.dot(this.gradP[AA], x, y, z), this.dot(this.gradP[BA], x - 1, y, z), u),
        this.lerp(this.dot(this.gradP[AB], x, y - 1, z), this.dot(this.gradP[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.dot(this.gradP[AA + 1], x, y, z - 1), this.dot(this.gradP[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.dot(this.gradP[AB + 1], x, y - 1, z - 1), this.dot(this.gradP[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }

  fbm(x: number, y: number, z: number, octaves: number = 6, lacunarity: number = 2.0, gain: number = 0.5): number {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amplitude * this.noise(x * frequency, y * frequency, z * frequency);
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / norm;
  }

  ridged(x: number, y: number, z: number, octaves: number = 6, lacunarity: number = 2.0, gain: number = 0.5): number {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < octaves; o++) {
      let n = Math.abs(this.noise(x * frequency, y * frequency, z * frequency));
      n = 1 - n;
      n *= n;
      sum += amplitude * n;
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
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
  private noise: ImprovedPerlinNoise3D;
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
    this.noise = new ImprovedPerlinNoise3D(this.seed);

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

      const continent = this.noise.fbm(tmp.x * 1.3, tmp.y * 1.3, tmp.z * 1.3, 5, 2.1, 0.48);
      const detail = this.noise.fbm(tmp.x * 3.8, tmp.y * 3.8, tmp.z * 3.8, 4, 2.0, 0.5) * 0.18;
      const ridge = (this.noise.ridged(tmp.x * 2.2, tmp.y * 2.2, tmp.z * 2.2, 4, 2.1, 0.5) - 0.5) * 0.12;
      const warp = this.noise.fbm(tmp.x * 0.8 + 100, tmp.y * 0.8 + 100, tmp.z * 0.8 + 100, 3) * 0.08;

      const elevation = continent + detail + ridge + warp;
      this.elevationValues[i] = elevation;

      const dispScale = this.radius + Math.max(0, elevation) * 0.55;
      const displaced = tmp.clone().multiplyScalar(dispScale);
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
      roughness: 0.88,
      metalness: 0.04,
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
    const elevNorm = THREE.MathUtils.clamp(elevation / 0.7, 0, 1);

    const polarFactor = THREE.MathUtils.smoothstep(absLat, 0.68, 0.92);
    const coastColor = new THREE.Color(0x5d9b4a);
    const lowlandColor = new THREE.Color(0x3d8b3a);
    const midlandColor = new THREE.Color(0x8b7355);
    const highlandColor = new THREE.Color(0x999999);
    const snowColor = new THREE.Color(0xe8f0ff);

    let base = new THREE.Color();
    if (elevNorm < 0.15) {
      base.copy(coastColor).lerp(lowlandColor, elevNorm / 0.15);
    } else if (elevNorm < 0.5) {
      base.copy(lowlandColor).lerp(midlandColor, (elevNorm - 0.15) / 0.35);
    } else {
      base.copy(midlandColor).lerp(highlandColor, (elevNorm - 0.5) / 0.5);
    }

    const snowThreshold = 0.55;
    if (elevNorm > snowThreshold) {
      const snowAmount = (elevNorm - snowThreshold) / (1 - snowThreshold);
      base.lerp(snowColor, snowAmount * 0.9);
    }
    base.lerp(snowColor, polarFactor * 0.85);

    return { r: base.r, g: base.g, b: base.b };
  }

  private computeOceanColor(elevation: number, position: THREE.Vector3): { r: number; g: number; b: number } {
    const depth = Math.min(1, Math.abs(elevation) * 2.8);
    const absLat = Math.abs(position.y);

    const shallow = new THREE.Color(0x4ab8d8);
    const mid = new THREE.Color(0x1e6b9e);
    const deep = new THREE.Color(0x0a1f35);
    const polar = new THREE.Color(0xa8d4e8);

    let base = new THREE.Color();
    if (depth < 0.5) {
      base.copy(shallow).lerp(mid, depth / 0.5);
    } else {
      base.copy(mid).lerp(deep, (depth - 0.5) / 0.5);
    }

    const polarFactor = THREE.MathUtils.smoothstep(absLat, 0.7, 0.95);
    base.lerp(polar, polarFactor * 0.45);

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
    const continent = this.noise.fbm(dir.x * 1.3, dir.y * 1.3, dir.z * 1.3, 5, 2.1, 0.48);
    const detail = this.noise.fbm(dir.x * 3.8, dir.y * 3.8, dir.z * 3.8, 4, 2.0, 0.5) * 0.18;
    const ridge = (this.noise.ridged(dir.x * 2.2, dir.y * 2.2, dir.z * 2.2, 4, 2.1, 0.5) - 0.5) * 0.12;
    const warp = this.noise.fbm(dir.x * 0.8 + 100, dir.y * 0.8 + 100, dir.z * 0.8 + 100, 3) * 0.08;
    return Math.max(0, continent + detail + ridge + warp) * 0.55;
  }

  isLandAt(point: THREE.Vector3): boolean {
    const dir = point.clone().normalize();
    const continent = this.noise.fbm(dir.x * 1.3, dir.y * 1.3, dir.z * 1.3, 5, 2.1, 0.48);
    const detail = this.noise.fbm(dir.x * 3.8, dir.y * 3.8, dir.z * 3.8, 4, 2.0, 0.5) * 0.18;
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

    const hotLand = new THREE.Color(0xd4a84a);
    const warmLand = new THREE.Color(0xc9a046);
    const coldLand = new THREE.Color(0x5a86b8);
    const frozenLand = new THREE.Color(0x7a9cc9);

    const hotOcean = new THREE.Color(0x55a0c8);
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

        const tempStrength = Math.abs(tempNorm);
        const landInfluence = 1 - polarFactor * 0.4;
        const elevNorm = THREE.MathUtils.clamp(elev / 0.7, 0, 1);
        const snowThreshold = 0.55 - tempNorm * 0.15;

        if (tempNorm > 0) {
          const heatCol = elevNorm < 0.3 ? warmLand : hotLand;
          r = THREE.MathUtils.lerp(r, heatCol.r, tempStrength * landInfluence * 0.7);
          g = THREE.MathUtils.lerp(g, heatCol.g, tempStrength * landInfluence * 0.65);
          b = THREE.MathUtils.lerp(b, heatCol.b, tempStrength * landInfluence * 0.4);
        } else {
          const coldCol = elevNorm < 0.3 ? coldLand : frozenLand;
          r = THREE.MathUtils.lerp(r, coldCol.r, tempStrength * 0.75);
          g = THREE.MathUtils.lerp(g, coldCol.g, tempStrength * 0.6);
          b = THREE.MathUtils.lerp(b, coldCol.b, tempStrength * 0.85);
        }

        let snowAmount = 0;
        if (elevNorm > snowThreshold) {
          snowAmount = (elevNorm - snowThreshold) / (1 - snowThreshold);
          snowAmount = Math.min(1, snowAmount + polarFactor * 0.6 - tempNorm * 0.2);
        }
        r = THREE.MathUtils.lerp(r, 0.96, snowAmount * 0.8);
        g = THREE.MathUtils.lerp(g, 0.97, snowAmount * 0.8);
        b = THREE.MathUtils.lerp(b, 1.0, snowAmount * 0.9);

        colors.setXYZ(i, r, g, b);
      } else {
        let r = this.oceanColorMap[i * 3];
        let g = this.oceanColorMap[i * 3 + 1];
        let b = this.oceanColorMap[i * 3 + 2];

        if (tempNorm > 0) {
          r = THREE.MathUtils.lerp(r, hotOcean.r, tempNorm * 0.25);
          g = THREE.MathUtils.lerp(g, hotOcean.g, tempNorm * 0.2);
          b = THREE.MathUtils.lerp(b, hotOcean.b, tempNorm * 0.15);
        } else {
          const t = -tempNorm;
          r = THREE.MathUtils.lerp(r, coldOcean.r, t * 0.35);
          g = THREE.MathUtils.lerp(g, coldOcean.g, t * 0.3);
          b = THREE.MathUtils.lerp(b, coldOcean.b, t * 0.2);
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
