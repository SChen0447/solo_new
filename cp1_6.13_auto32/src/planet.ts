import * as THREE from 'three';

export type CreatureType = 'grass' | 'tree' | 'rabbit' | 'wolf';

export interface TerrainInfo {
  position: THREE.Vector3;
  normal: THREE.Vector3;
  isLand: boolean;
}

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise3D(seed: number = 42) {
  const rand = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

  function fade(t: number) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  function lerp(a: number, b: number, t: number) {
    return a + t * (b - a);
  }
  function grad(hash: number, x: number, y: number, z: number) {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  return function noise3D(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);
    const A = perm[X] + Y;
    const AA = perm[A] + Z;
    const AB = perm[A + 1] + Z;
    const B = perm[X + 1] + Y;
    const BA = perm[B] + Z;
    const BB = perm[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u),
        lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u),
        v
      ),
      lerp(
        lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  };
}

export class Planet {
  mesh: THREE.Mesh;
  group: THREE.Group;
  haloMesh: THREE.Mesh;
  radius: number = 5;
  private noise3D: (x: number, y: number, z: number) => number;
  private seed: number = 42;
  private basePositionAttr: THREE.BufferAttribute;
  private originalColors: Float32Array;
  private temperature: number = 25;
  public creaturesGroup: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.noise3D = makeNoise3D(this.seed);
    this.creaturesGroup = new THREE.Group();
    this.creaturesGroup.name = 'creaturesGroup';
    this.group = new THREE.Group();
    this.group.name = 'planetGroup';

    const geometry = new THREE.SphereGeometry(this.radius, 128, 128);
    const positions = geometry.attributes.position as THREE.BufferAttribute;
    this.basePositionAttr = positions.clone() as THREE.BufferAttribute;
    const colors = new Float32Array(positions.count * 3);
    this.originalColors = new Float32Array(positions.count * 3);

    const tmp = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      tmp.fromBufferAttribute(positions, i);
      tmp.normalize();
      const n = this.fbm(tmp.x * 1.5, tmp.y * 1.5, tmp.z * 1.5);
      const elevation = n > 0.02 ? n * 0.45 : 0;
      const scale = this.radius + elevation;
      tmp.multiplyScalar(scale);
      positions.setXYZ(i, tmp.x, tmp.y, tmp.z);

      const isLand = n > 0.02;
      let r: number, g: number, b: number;
      if (isLand) {
        const lowness = Math.min(1, n / 0.5);
        r = THREE.MathUtils.lerp(0.18, 0.55, lowness);
        g = THREE.MathUtils.lerp(0.45, 0.40, lowness);
        b = THREE.MathUtils.lerp(0.15, 0.25, lowness);
      } else {
        const depth = Math.min(1, Math.abs(n) * 3);
        r = THREE.MathUtils.lerp(0.12, 0.05, depth);
        g = THREE.MathUtils.lerp(0.35, 0.18, depth);
        b = THREE.MathUtils.lerp(0.65, 0.45, depth);
      }
      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
      this.originalColors[i * 3] = r;
      this.originalColors[i * 3 + 1] = g;
      this.originalColors[i * 3 + 2] = b;
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

    const haloGeo = new THREE.SphereGeometry(this.radius * 1.12, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(0x6688ff) },
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        uniform vec3 uColor;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          gl_FragColor = vec4(uColor, intensity * 0.6);
        }
      `,
    });
    this.haloMesh = new THREE.Mesh(haloGeo, haloMat);
    this.group.add(this.haloMesh);

    scene.add(this.group);
  }

  private fbm(x: number, y: number, z: number): number {
    let amp = 1;
    let freq = 1;
    let sum = 0;
    let norm = 0;
    for (let o = 0; o < 5; o++) {
      sum += amp * this.noise3D(x * freq, y * freq, z * freq);
      norm += amp;
      amp *= 0.5;
      freq *= 2.0;
    }
    return sum / norm;
  }

  getElevationAt(point: THREE.Vector3): number {
    const dir = point.clone().normalize();
    const n = this.fbm(dir.x * 1.5, dir.y * 1.5, dir.z * 1.5);
    return n > 0.02 ? n * 0.45 : 0;
  }

  isLandAt(point: THREE.Vector3): boolean {
    const dir = point.clone().normalize();
    const n = this.fbm(dir.x * 1.5, dir.y * 1.5, dir.z * 1.5);
    return n > 0.02;
  }

  getSurfacePoint(direction: THREE.Vector3): TerrainInfo {
    const dir = direction.clone().normalize();
    const elevation = this.getElevationAt(dir);
    const position = dir.multiplyScalar(this.radius + elevation);
    const isLand = elevation > 0.001;
    return {
      position,
      normal: position.clone().normalize(),
      isLand,
    };
  }

  getRandomLandPoint(): TerrainInfo {
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    let info = this.getSurfacePoint(dir);
    let attempts = 0;
    while (!info.isLand && attempts < 20) {
      const d = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      info = this.getSurfacePoint(d);
      attempts++;
    }
    return info;
  }

  getRandomPoint(): TerrainInfo {
    const dir = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();
    return this.getSurfacePoint(dir);
  }

  setTemperature(temp: number) {
    this.temperature = temp;
    this.updateColorsForTemperature();
  }

  getTemperature(): number {
    return this.temperature;
  }

  private updateColorsForTemperature() {
    const positions = this.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.mesh.geometry.attributes.color as THREE.BufferAttribute;
    const tempDelta = (this.temperature - 25) / 25;

    const tmp = new THREE.Vector3();
    for (let i = 0; i < positions.count; i++) {
      tmp.fromBufferAttribute(this.basePositionAttr, i);
      tmp.normalize();
      const n = this.fbm(tmp.x * 1.5, tmp.y * 1.5, tmp.z * 1.5);
      const isLand = n > 0.02;

      const or = this.originalColors[i * 3];
      const og = this.originalColors[i * 3 + 1];
      const ob = this.originalColors[i * 3 + 2];

      let r = or;
      let g = og;
      let b = ob;

      if (isLand) {
        if (tempDelta > 0) {
          r = THREE.MathUtils.lerp(or, THREE.MathUtils.min(1, or + 0.4), tempDelta);
          g = THREE.MathUtils.lerp(og, THREE.MathUtils.max(0.15, og - 0.2), tempDelta);
          b = THREE.MathUtils.lerp(ob, THREE.MathUtils.max(0.05, ob - 0.15), tempDelta);
        } else {
          const t = -tempDelta;
          r = THREE.MathUtils.lerp(or, THREE.MathUtils.max(0.05, or - 0.1), t);
          g = THREE.MathUtils.lerp(og, THREE.MathUtils.min(1, og + 0.1), t);
          b = THREE.MathUtils.lerp(ob, THREE.MathUtils.min(1, ob + 0.4), t);
        }
      }
      colors.setXYZ(i, r, g, b);
    }
    colors.needsUpdate = true;
  }

  addCreature(mesh: THREE.Object3D) {
    this.creaturesGroup.add(mesh);
  }

  removeCreature(mesh: THREE.Object3D) {
    this.creaturesGroup.remove(mesh);
  }

  update(delta: number) {
    this.group.rotation.y += 0.001;
  }
}
