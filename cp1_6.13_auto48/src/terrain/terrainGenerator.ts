import * as THREE from 'three';

export interface StratumLayer {
  name: string;
  age: string;
  color: number;
  topY: number;
  bottomY: number;
  mesh: THREE.Mesh;
  highlightMesh: THREE.Mesh;
  labelSprite: THREE.Sprite;
  originalPositions: Float32Array;
}

export interface TerrainConfig {
  width: number;
  depth: number;
  height: number;
  seed: number;
  layers: Array<{
    name: string;
    age: string;
    color: number;
    thicknessRatio: number;
  }>;
}

const DEFAULT_CONFIG: TerrainConfig = {
  width: 10,
  depth: 8,
  height: 8,
  seed: 42,
  layers: [
    { name: '寒武纪灰色页岩', age: '寒武纪', color: 0x5a5a6a, thicknessRatio: 0.18 },
    { name: '奥陶纪浅黄砂岩', age: '奥陶纪', color: 0xd4c48a, thicknessRatio: 0.15 },
    { name: '泥盆纪褐色泥岩', age: '泥盆纪', color: 0x8b5e3c, thicknessRatio: 0.14 },
    { name: '石炭纪深灰石灰岩', age: '石炭纪', color: 0x3d4452, thicknessRatio: 0.17 },
    { name: '二叠纪红色砂岩', age: '二叠纪', color: 0xb04a3a, thicknessRatio: 0.18 },
    { name: '三叠纪紫色泥岩', age: '三叠纪', color: 0x7b4a7a, thicknessRatio: 0.18 }
  ]
};

class SimplexNoise {
  private perm: number[] = [];

  constructor(seed: number) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = Math.floor(this.seededRandom(seed + i) * 256);
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const u = this.fade(xf);
    const v = this.fade(yf);
    const aa = this.perm[this.perm[X] + Y];
    const ab = this.perm[this.perm[X] + Y + 1];
    const ba = this.perm[this.perm[X + 1] + Y];
    const bb = this.perm[this.perm[X + 1] + Y + 1];
    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    return this.lerp(x1, x2, v);
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}

export class Terrain {
  public config: TerrainConfig;
  public layers: StratumLayer[] = [];
  public group: THREE.Group = new THREE.Group();
  public leftGroup: THREE.Group = new THREE.Group();
  public rightGroup: THREE.Group = new THREE.Group();
  private faultSlipMesh: THREE.Mesh | null = null;
  private noise: SimplexNoise;
  private faultOffset: number = 0;
  private targetOffset: number = 0;
  private isAnimatingBack: boolean = false;
  private animationStartTime: number = 0;
  private animationStartOffset: number = 0;
  private baseY: number = 0;

  constructor(config?: Partial<TerrainConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.noise = new SimplexNoise(this.config.seed);
    this.group.add(this.leftGroup);
    this.group.add(this.rightGroup);
    this.generateTerrain();
    this.createFaultSlipSurface();
  }

  private generateTerrain(): void {
    const { width, depth, height, layers: layerConfigs } = this.config;
    let currentY = 0;
    this.baseY = -height / 2;

    const totalRatio = layerConfigs.reduce((sum, l) => sum + l.thicknessRatio, 0);

    for (let i = 0; i < layerConfigs.length; i++) {
      const layerConfig = layerConfigs[i];
      const thickness = (layerConfig.thicknessRatio / totalRatio) * height;
      const bottomY = currentY;
      const topY = currentY + thickness;

      const layer = this.createStratumLayer(
        layerConfig.name,
        layerConfig.age,
        layerConfig.color,
        bottomY,
        topY,
        i
      );

      this.layers.push(layer);
      currentY = topY;
    }
  }

  private createStratumLayer(
    name: string,
    age: string,
    color: number,
    bottomY: number,
    topY: number,
    layerIndex: number
  ): StratumLayer {
    const { width, depth, height } = this.config;
    const segmentsW = 40;
    const segmentsD = 32;
    const segmentsH = 2;

    const geometry = new THREE.BoxGeometry(width, topY - bottomY, depth, segmentsW, segmentsH, segmentsD);
    const positions = geometry.attributes.position;
    const originalPositions = new Float32Array(positions.array);

    const topHeightRatio = 0.6 + (layerIndex / this.config.layers.length) * 0.3;
    const topWidth = width * topHeightRatio;
    const topDepth = depth * topHeightRatio;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      const yNormalized = (y + (topY - bottomY) / 2) / (topY - bottomY);
      const taperFactor = yNormalized;

      const taperedX = x * (1 - taperFactor * (1 - topHeightRatio));
      const taperedZ = z * (1 - taperFactor * (1 - topHeightRatio));

      const noiseScale = 2.5;
      const noiseAmp = 0.15 + layerIndex * 0.03;
      const noiseX = this.noise.noise2D(
        (x + layerIndex * 10) * noiseScale / width,
        (z + layerIndex * 7) * noiseScale / depth
      ) * noiseAmp;
      const noiseY = this.noise.noise2D(
        (x * 1.5 + layerIndex * 3) / width,
        (z * 1.5 + layerIndex * 5) / depth
      ) * noiseAmp * 0.5;

      positions.setX(i, taperedX + noiseX * 0.3);
      positions.setZ(i, taperedZ + noiseX * 0.3);

      if (yNormalized > 0.7) {
        positions.setY(i, y + noiseY * (yNormalized - 0.7) * 3);
      }
    }

    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.85,
      metalness: 0.05,
      flatShading: false
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = this.baseY + bottomY + (topY - bottomY) / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const highlightGeometry = geometry.clone();
    const highlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa33,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide
    });
    const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightMesh.position.copy(mesh.position);
    highlightMesh.visible = false;

    const labelSprite = this.createLabelSprite(name, age);
    labelSprite.position.set(
      0,
      this.baseY + topY - 0.1,
      -depth / 2 - 0.2
    );
    labelSprite.visible = false;

    this.rightGroup.add(mesh);
    this.rightGroup.add(highlightMesh);
    this.rightGroup.add(labelSprite);

    this.splitLayerForFault(mesh, highlightMesh, labelSprite, originalPositions);

    return {
      name,
      age,
      color,
      topY: this.baseY + topY,
      bottomY: this.baseY + bottomY,
      mesh,
      highlightMesh,
      labelSprite,
      originalPositions
    };
  }

  private createLabelSprite(name: string, age: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(20, 20, 25, 0.85)';
    ctx.strokeStyle = '#ff9933';
    ctx.lineWidth = 3;
    const radius = 20;
    const w = canvas.width - 20;
    const h = canvas.height - 20;
    const x = 10;
    const y = 10;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffcc66';
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 18);

    ctx.fillStyle = '#88aacc';
    ctx.font = '20px "Microsoft YaHei", sans-serif';
    ctx.fillText(age, canvas.width / 2, canvas.height / 2 + 22);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(4, 1, 1);

    return sprite;
  }

  private splitLayerForFault(
    mesh: THREE.Mesh,
    highlightMesh: THREE.Mesh,
    labelSprite: THREE.Sprite,
    originalPositions: Float32Array
  ): void {
  }

  private createFaultSlipSurface(): void {
    const { width, depth, height } = this.config;
    const slipGeometry = new THREE.PlaneGeometry(height * 1.1, depth * 1.1, 1, 1);
    const slipMaterial = new THREE.MeshBasicMaterial({
      color: 0x445566,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    });
    this.faultSlipMesh = new THREE.Mesh(slipGeometry, slipMaterial);
    this.faultSlipMesh.rotation.y = -Math.PI / 4;
    this.faultSlipMesh.position.set(0, 0, 0);
    this.faultSlipMesh.visible = false;
    this.group.add(this.faultSlipMesh);
  }

  public setFaultOffset(offset: number): void {
    this.targetOffset = offset;
    if (this.isAnimatingBack) {
      this.isAnimatingBack = false;
    }
    this.applyFaultOffset(offset);
  }

  public releaseFaultSlider(): void {
    if (this.faultOffset === 0) return;
    this.isAnimatingBack = true;
    this.animationStartTime = performance.now();
    this.animationStartOffset = this.faultOffset;
  }

  private applyFaultOffset(offset: number): void {
    this.faultOffset = offset;

    const normalized = Math.abs(offset) / 2;
    if (this.faultSlipMesh) {
      this.faultSlipMesh.visible = offset !== 0;
      (this.faultSlipMesh.material as THREE.MeshBasicMaterial).opacity = 0.15 + normalized * 0.2;
      this.faultSlipMesh.position.x = offset * 0.3;
    }

    this.rightGroup.position.x = offset;
    this.rightGroup.position.y = -offset * 0.15;
  }

  public update(deltaTime: number): void {
    if (this.isAnimatingBack) {
      const elapsed = (performance.now() - this.animationStartTime) / 1000;
      const duration = 1.2;

      if (elapsed >= duration) {
        this.isAnimatingBack = false;
        this.applyFaultOffset(0);
        return;
      }

      const t = elapsed / duration;
      const eased = this.easeOutElastic(t);
      const currentOffset = this.animationStartOffset * (1 - eased);
      this.applyFaultOffset(currentOffset);
    }
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  public highlightLayer(layer: StratumLayer | null): void {
    for (const l of this.layers) {
      if (l === layer) {
        l.highlightMesh.visible = true;
        l.labelSprite.visible = true;
        const mat = l.highlightMesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3;
      } else {
        l.highlightMesh.visible = false;
        l.labelSprite.visible = false;
      }
    }
  }

  public getLayerByMesh(mesh: THREE.Object3D): StratumLayer | null {
    for (const layer of this.layers) {
      if (layer.mesh === mesh || layer.highlightMesh === mesh) {
        return layer;
      }
    }
    return null;
  }

  public getAllPickableMeshes(): THREE.Mesh[] {
    return this.layers.map(l => l.mesh);
  }

  public getSurfaceYAt(x: number, z: number): { y: number; layer: StratumLayer } | null {
    const { width, depth } = this.config;
    if (Math.abs(x) > width / 2 || Math.abs(z) > depth / 2) {
      return null;
    }

    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      const layerMesh = layer.mesh;
      const geometry = layerMesh.geometry;
      const positions = geometry.attributes.position;

      const localX = x - layerMesh.position.x;
      const localZ = z - layerMesh.position.z;
      const halfHeight = (layer.topY - layer.bottomY) / 2;

      const noiseScale = 2.5;
      const noiseAmp = 0.15 + i * 0.03;
      const noiseVal = this.noise.noise2D(
        (x + i * 10) * noiseScale / width,
        (z + i * 7) * noiseScale / depth
      ) * noiseAmp;

      const topYLocal = halfHeight + noiseVal * 0.3;
      const worldY = layerMesh.position.y + topYLocal;

      const topHeightRatio = 0.6 + (i / this.config.layers.length) * 0.3;
      const yRatio = (worldY - layer.bottomY) / (layer.topY - layer.bottomY);
      const effectiveHalfWidth = width / 2 * (topHeightRatio + (1 - topHeightRatio) * (1 - yRatio));

      if (Math.abs(localX) <= effectiveHalfWidth * 0.9) {
        return { y: worldY, layer };
      }
    }

    return null;
  }
}
