import * as THREE from 'three';

export interface StratumLayer {
  name: string;
  age: string;
  color: number;
  topY: number;
  bottomY: number;
  leftMesh: THREE.Mesh;
  rightMesh: THREE.Mesh;
  leftHighlight: THREE.Mesh;
  rightHighlight: THREE.Mesh;
  leftCrossSection: THREE.Mesh;
  rightCrossSection: THREE.Mesh;
  labelSprite: THREE.Sprite;
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
    { name: '寒武纪灰色页岩', age: '寒武纪 (Cambrian)', color: 0x5a5a6a, thicknessRatio: 0.18 },
    { name: '奥陶纪浅黄砂岩', age: '奥陶纪 (Ordovician)', color: 0xd4c48a, thicknessRatio: 0.15 },
    { name: '泥盆纪褐色泥岩', age: '泥盆纪 (Devonian)', color: 0x8b5e3c, thicknessRatio: 0.14 },
    { name: '石炭纪深灰石灰岩', age: '石炭纪 (Carboniferous)', color: 0x3d4452, thicknessRatio: 0.17 },
    { name: '二叠纪红色砂岩', age: '二叠纪 (Permian)', color: 0xb04a3a, thicknessRatio: 0.18 },
    { name: '三叠纪紫色泥岩', age: '三叠纪 (Triassic)', color: 0x7b4a7a, thicknessRatio: 0.18 }
  ]
};

class SimplexNoise {
  private perm: number[] = [];
  private grad3: number[][] = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
  ];

  constructor(seed: number) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(this.seededRandom(seed + i * 131) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    let n0, n1, n2;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;
    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }
    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;
    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * (this.grad3[gi0][0] * x0 + this.grad3[gi0][1] * y0);
    }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * (this.grad3[gi1][0] * x1 + this.grad3[gi1][1] * y1);
    }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * (this.grad3[gi2][0] * x2 + this.grad3[gi2][1] * y2);
    }
    return 70.0 * (n0 + n1 + n2);
  }

  fractalNoise(x: number, y: number, octaves: number = 4, persistence: number = 0.5, lacunarity: number = 2.0): number {
    let total = 0;
    let frequency = 1;
    let amplitude = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    return total / maxValue;
  }
}

export class Terrain {
  public config: TerrainConfig;
  public layers: StratumLayer[] = [];
  public group: THREE.Group = new THREE.Group();
  public leftGroup: THREE.Group = new THREE.Group();
  public rightGroup: THREE.Group = new THREE.Group();
  private noise: SimplexNoise;
  private faultOffset: number = 0;
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
  }

  private generateTerrain(): void {
    const { width, depth, height, layers: layerConfigs } = this.config;
    let currentY = 0;
    this.baseY = -height / 2;

    const totalRatio = layerConfigs.reduce((sum, l) => sum + l.thicknessRatio, 0);
    let cumulativeY = 0;

    for (let i = 0; i < layerConfigs.length; i++) {
      const layerConfig = layerConfigs[i];
      const thickness = (layerConfig.thicknessRatio / totalRatio) * height;
      const bottomY = cumulativeY;
      const topY = cumulativeY + thickness;
      cumulativeY = topY;

      const layer = this.createStratumLayer(
        layerConfig.name,
        layerConfig.age,
        layerConfig.color,
        bottomY,
        topY,
        i
      );
      this.layers.push(layer);
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
    const worldBottom = this.baseY + bottomY;
    const worldTop = this.baseY + topY;
    const thickness = topY - bottomY;
    const centerY = worldBottom + thickness / 2;

    const topTaper = 0.6 + (layerIndex / this.config.layers.length) * 0.35;
    const halfW = width / 2;
    const halfD = depth / 2;

    const { leftMesh, rightMesh, leftCrossSection, rightCrossSection } =
      this.createSplitStratumGeometry(width, depth, thickness, bottomY, topY, halfW, halfD, topTaper, layerIndex, color, centerY);

    const leftHighlightGeo = leftMesh.geometry.clone();
    const leftHighlightMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false
    });
    const leftHighlight = new THREE.Mesh(leftHighlightGeo, leftHighlightMat);
    leftHighlight.position.copy(leftMesh.position);
    leftHighlight.visible = false;

    const rightHighlightGeo = rightMesh.geometry.clone();
    const rightHighlightMat = new THREE.MeshBasicMaterial({
      color: 0xffaa33, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false
    });
    const rightHighlight = new THREE.Mesh(rightHighlightGeo, rightHighlightMat);
    rightHighlight.position.copy(rightMesh.position);
    rightHighlight.visible = false;

    const labelSprite = this.createLabelSprite(name, age);
    const labelX = -halfW * 0.1;
    const labelZ = -halfD - 0.3;
    labelSprite.position.set(labelX, worldTop - thickness * 0.15, labelZ);
    labelSprite.visible = false;

    this.leftGroup.add(leftMesh, leftHighlight, leftCrossSection);
    this.rightGroup.add(rightMesh, rightHighlight, rightCrossSection);
    this.rightGroup.add(labelSprite);

    return {
      name, age, color,
      topY: worldTop,
      bottomY: worldBottom,
      leftMesh, rightMesh,
      leftHighlight, rightHighlight,
      leftCrossSection, rightCrossSection,
      labelSprite
    };
  }

  private createSplitStratumGeometry(
    width: number, depth: number, thickness: number,
    bottomY: number, topY: number,
    halfW: number, halfD: number, topTaper: number,
    layerIndex: number, color: number, centerY: number
  ) {
    const faultAngle = -Math.PI / 4;
    const faultNormal = new THREE.Vector3(Math.sin(faultAngle), 0, Math.cos(faultAngle)).normalize();
    const splitSegsW = 60;
    const splitSegsD = 48;
    const splitSegsH = Math.max(2, Math.round(thickness * 4));

    const fullGeo = new THREE.BoxGeometry(width, thickness, depth, splitSegsW, splitSegsH, splitSegsD);
    const pos = fullGeo.attributes.position;

    const localBottom = -thickness / 2;
    const localTop = thickness / 2;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      let y = pos.getY(i);
      const z = pos.getZ(i);

      const yNorm = (y - localBottom) / thickness;
      const yClamped = Math.max(0, Math.min(1, yNorm));

      const taperX = x * (1.0 - yClamped * (1.0 - topTaper));
      const taperZ = z * (1.0 - yClamped * (1.0 - topTaper));

      const nX = taperX / halfW;
      const nZ = taperZ / halfD;
      const edgeDist = Math.max(Math.abs(nX), Math.abs(nZ));
      const edgeMask = Math.max(0, 1 - edgeDist * edgeDist);

      const seedOffset = layerIndex * 3.7;
      const noiseLarge = this.noise.fractalNoise(
        taperX * 0.18 + seedOffset, taperZ * 0.22 - seedOffset * 0.7, 4, 0.55, 2.1
      );
      const noiseMid = this.noise.fractalNoise(
        taperX * 0.55 + seedOffset * 2.3, taperZ * 0.48 + seedOffset * 1.9, 3, 0.5, 2.3
      );
      const noiseSmall = this.noise.fractalNoise(
        taperX * 1.6 - seedOffset * 1.1, taperZ * 1.8 + seedOffset * 3.1, 2, 0.45, 2.0
      );

      const ampLarge = (0.28 + layerIndex * 0.04) * edgeMask;
      const ampMid = (0.12 + layerIndex * 0.015) * edgeMask * yClamped;
      const ampSmall = 0.045 * edgeMask * yClamped;

      const noiseY = noiseLarge * ampLarge + noiseMid * ampMid + noiseSmall * ampSmall;
      const erosionFalloff = Math.pow(yClamped, 2.2);
      const finalNoiseY = noiseY * (0.3 + 0.7 * erosionFalloff);

      const noiseDispX = noiseMid * 0.06 * yClamped;
      const noiseDispZ = noiseSmall * 0.05 * yClamped;

      pos.setX(i, taperX + noiseDispX);
      pos.setZ(i, taperZ + noiseDispZ);
      pos.setY(i, y + finalNoiseY);
    }

    fullGeo.computeVertexNormals();

    const leftPositions: number[] = [];
    const leftIndices: number[] = [];
    const leftNormals: number[] = [];
    const leftUVs: number[] = [];

    const rightPositions: number[] = [];
    const rightIndices: number[] = [];
    const rightNormals: number[] = [];
    const rightUVs: number[] = [];

    const leftVertexMap = new Map<number, number>();
    const rightVertexMap = new Map<number, number>();
    const faultLeftVertices: Array<{ pos: THREE.Vector3; normal: THREE.Vector3; uv: THREE.Vector2 }> = [];
    const faultRightVertices: Array<{ pos: THREE.Vector3; normal: THREE.Vector3; uv: THREE.Vector2 }> = [];

    const vA = new THREE.Vector3();
    const vB = new THREE.Vector3();
    const vC = new THREE.Vector3();
    const nA = new THREE.Vector3();
    const nB = new THREE.Vector3();
    const nC = new THREE.Vector3();

    const indices = fullGeo.index?.array || [];
    const normals = fullGeo.attributes.normal;
    const uvs = fullGeo.attributes.uv;

    const getOrCreateVertex = (
      vi: number, point: THREE.Vector3, storePos: number[], storeNorm: number[], storeUV: number[],
      vMap: Map<number, number>, faultVerts: Array<{ pos: THREE.Vector3; normal: THREE.Vector3; uv: THREE.Vector2 }>,
      isLeft: boolean
    ): number => {
      if (vMap.has(vi)) return vMap.get(vi)!;
      const newIdx = storePos.length / 3;
      vMap.set(vi, newIdx);
      storePos.push(point.x, point.y, point.z);
      const nx = normals.getX(vi), ny = normals.getY(vi), nz = normals.getZ(vi);
      storeNorm.push(nx, ny, nz);
      if (uvs) storeUV.push(uvs.getX(vi), uvs.getY(vi));
      const distToFault = point.x * faultNormal.x + point.z * faultNormal.z;
      if (Math.abs(distToFault) < 0.08) {
        faultVerts.push({
          pos: point.clone(),
          normal: new THREE.Vector3(nx, ny, nz),
          uv: uvs ? new THREE.Vector2(uvs.getX(vi), uvs.getY(vi)) : new THREE.Vector2()
        });
      }
      return newIdx;
    };

    const intersectFault = (p1: THREE.Vector3, p2: THREE.Vector3): THREE.Vector3 | null => {
      const d1 = p1.x * faultNormal.x + p1.z * faultNormal.z;
      const d2 = p2.x * faultNormal.x + p2.z * faultNormal.z;
      if ((d1 >= 0 && d2 >= 0) || (d1 < 0 && d2 < 0)) return null;
      const t = d1 / (d1 - d2);
      return new THREE.Vector3().lerpVectors(p1, p2, t);
    };

    for (let tri = 0; tri < indices.length; tri += 3) {
      const i0 = indices[tri], i1 = indices[tri + 1], i2 = indices[tri + 2];
      vA.set(pos.getX(i0), pos.getY(i0), pos.getZ(i0));
      vB.set(pos.getX(i1), pos.getY(i1), pos.getZ(i1));
      vC.set(pos.getX(i2), pos.getY(i2), pos.getZ(i2));

      const dA = vA.x * faultNormal.x + vA.z * faultNormal.z;
      const dB = vB.x * faultNormal.x + vB.z * faultNormal.z;
      const dC = vC.x * faultNormal.x + vC.z * faultNormal.z;

      const leftMask = [dA < 0, dB < 0, dC < 0];
      const leftCount = leftMask.filter(Boolean).length;

      if (leftCount === 3) {
        const a = getOrCreateVertex(i0, vA, leftPositions, leftNormals, leftUVs, leftVertexMap, faultLeftVertices, true);
        const b = getOrCreateVertex(i1, vB, leftPositions, leftNormals, leftUVs, leftVertexMap, faultLeftVertices, true);
        const c = getOrCreateVertex(i2, vC, leftPositions, leftNormals, leftUVs, leftVertexMap, faultLeftVertices, true);
        leftIndices.push(a, b, c);
      } else if (leftCount === 0) {
        const a = getOrCreateVertex(i0, vA, rightPositions, rightNormals, rightUVs, rightVertexMap, faultRightVertices, false);
        const b = getOrCreateVertex(i1, vB, rightPositions, rightNormals, rightUVs, rightVertexMap, faultRightVertices, false);
        const c = getOrCreateVertex(i2, vC, rightPositions, rightNormals, rightUVs, rightVertexMap, faultRightVertices, false);
        rightIndices.push(a, b, c);
      } else {
        const verts = [
          { v: vA, d: dA, idx: i0, isLeft: leftMask[0] },
          { v: vB, d: dB, idx: i1, isLeft: leftMask[1] },
          { v: vC, d: dC, idx: i2, isLeft: leftMask[2] }
        ];
        const singleSide = verts.find(v => (leftCount === 1 ? v.isLeft : !v.isLeft))!;
        const doubleSides = verts.filter(v => (leftCount === 1 ? !v.isLeft : v.isLeft));
        const pSingle = singleSide.v;
        const pDouble0 = doubleSides[0].v;
        const pDouble1 = doubleSides[1].v;
        const isLeftSingle = singleSide.isLeft;

        const isect0 = intersectFault(pSingle, pDouble0)!;
        const isect1 = intersectFault(pSingle, pDouble1)!;

        const pushFaultSplit = (
          storeP: number[], storeN: number[], storeU: number[], vMap: Map<number, number>,
          faultVerts: Array<{ pos: THREE.Vector3; normal: THREE.Vector3; uv: THREE.Vector2 }>,
          isLeft: boolean
        ) => {
          if (isLeft === isLeftSingle) {
            const orig = getOrCreateVertex(singleSide.idx, pSingle, storeP, storeN, storeU, vMap, faultVerts, isLeft);
            const ni0 = storeP.length / 3;
            storeP.push(isect0.x, isect0.y, isect0.z);
            storeN.push(faultNormal.x, faultNormal.y, faultNormal.z);
            storeU.push(0.5, 0.5);
            faultVerts.push({ pos: isect0.clone(), normal: faultNormal.clone(), uv: new THREE.Vector2(0.5, 0.5) });
            const ni1 = storeP.length / 3;
            storeP.push(isect1.x, isect1.y, isect1.z);
            storeN.push(faultNormal.x, faultNormal.y, faultNormal.z);
            storeU.push(0.5, 0.5);
            faultVerts.push({ pos: isect1.clone(), normal: faultNormal.clone(), uv: new THREE.Vector2(0.5, 0.5) });
            storeIndices.push(orig, ni0, ni1);
          } else {
            const d0 = getOrCreateVertex(doubleSides[0].idx, pDouble0, storeP, storeN, storeU, vMap, faultVerts, isLeft);
            const d1 = getOrCreateVertex(doubleSides[1].idx, pDouble1, storeP, storeN, storeU, vMap, faultVerts, isLeft);
            const ni0 = storeP.length / 3;
            storeP.push(isect0.x, isect0.y, isect0.z);
            storeN.push(faultNormal.x, faultNormal.y, faultNormal.z);
            storeU.push(0.5, 0.5);
            faultVerts.push({ pos: isect0.clone(), normal: faultNormal.clone(), uv: new THREE.Vector2(0.5, 0.5) });
            const ni1 = storeP.length / 3;
            storeP.push(isect1.x, isect1.y, isect1.z);
            storeN.push(faultNormal.x, faultNormal.y, faultNormal.z);
            storeU.push(0.5, 0.5);
            faultVerts.push({ pos: isect1.clone(), normal: faultNormal.clone(), uv: new THREE.Vector2(0.5, 0.5) });
            if (isLeft) {
              storeIndices.push(d0, d1, ni0);
              storeIndices.push(d1, ni1, ni0);
            } else {
              storeIndices.push(d0, ni0, d1);
              storeIndices.push(d1, ni0, ni1);
            }
          }
        };

        let storeIndices: number[] = [];
        storeIndices = leftIndices;
        pushFaultSplit(leftPositions, leftNormals, leftUVs, leftVertexMap, faultLeftVertices, true);
        storeIndices = rightIndices;
        pushFaultSplit(rightPositions, rightNormals, rightUVs, rightVertexMap, faultRightVertices, false);
      }
    }

    const buildCrossSection = (
      faultVerts: Array<{ pos: THREE.Vector3; normal: THREE.Vector3; uv: THREE.Vector2 }>,
      faceForward: boolean
    ): THREE.BufferGeometry => {
      if (faultVerts.length < 3) return new THREE.BufferGeometry();

      const tangent = new THREE.Vector3(faultNormal.z, 0, -faultNormal.x).normalize();
      const bitangent = new THREE.Vector3(0, 1, 0);

      const projected = faultVerts.map(fv => {
        const u = fv.pos.dot(tangent);
        const v = fv.pos.dot(bitangent);
        return { u, v, pos: fv.pos };
      });

      projected.sort((a, b) => {
        if (Math.abs(a.v - b.v) > 0.05) return b.v - a.v;
        return a.u - b.u;
      });

      const rowsMap = new Map<number, typeof projected>();
      for (const p of projected) {
        const key = Math.round(p.v * 20) / 20;
        if (!rowsMap.has(key)) rowsMap.set(key, []);
        rowsMap.get(key)!.push(p);
      }
      const sortedRows = Array.from(rowsMap.entries()).sort((a, b) => b[0] - a[0]);
      for (const [, row] of sortedRows) row.sort((a, b) => a.u - b.u);

      const csPositions: number[] = [];
      const csIndices: number[] = [];
      const csNormals: number[] = [];
      const csUVs: number[] = [];
      const idxMap = new Map<string, number>();

      for (const [, row] of sortedRows) {
        for (const p of row) {
          const key = `${p.v.toFixed(3)}_${p.u.toFixed(3)}`;
          if (!idxMap.has(key)) {
            idxMap.set(key, csPositions.length / 3);
            csPositions.push(p.pos.x, p.pos.y, p.pos.z);
            const n = faceForward ? faultNormal.clone() : faultNormal.clone().negate();
            csNormals.push(n.x, n.y, n.z);
            const uNorm = (p.u + width * 0.8) / (width * 1.6);
            const vNorm = (p.v + height * 0.5) / height;
            csUVs.push(uNorm, vNorm);
          }
        }
      }

      for (let r = 0; r < sortedRows.length - 1; r++) {
        const rowA = sortedRows[r][1];
        const rowB = sortedRows[r + 1][1];
        const len = Math.min(rowA.length, rowB.length);
        for (let c = 0; c < len - 1; c++) {
          const kA0 = `${rowA[c].v.toFixed(3)}_${rowA[c].u.toFixed(3)}`;
          const kA1 = `${rowA[c + 1].v.toFixed(3)}_${rowA[c + 1].u.toFixed(3)}`;
          const kB0 = `${rowB[c].v.toFixed(3)}_${rowB[c].u.toFixed(3)}`;
          const kB1 = `${rowB[c + 1].v.toFixed(3)}_${rowB[c + 1].u.toFixed(3)}`;
          if (idxMap.has(kA0) && idxMap.has(kA1) && idxMap.has(kB0) && idxMap.has(kB1)) {
            const iA0 = idxMap.get(kA0)!;
            const iA1 = idxMap.get(kA1)!;
            const iB0 = idxMap.get(kB0)!;
            const iB1 = idxMap.get(kB1)!;
            if (faceForward) {
              csIndices.push(iA0, iB0, iA1);
              csIndices.push(iA1, iB0, iB1);
            } else {
              csIndices.push(iA0, iA1, iB0);
              csIndices.push(iA1, iB1, iB0);
            }
          }
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(csPositions, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(csNormals, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(csUVs, 2));
      geo.setIndex(csIndices);
      return geo;
    };

    const leftGeo = new THREE.BufferGeometry();
    leftGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftPositions, 3));
    leftGeo.setAttribute('normal', new THREE.Float32BufferAttribute(leftNormals, 3));
    if (leftUVs.length > 0) leftGeo.setAttribute('uv', new THREE.Float32BufferAttribute(leftUVs, 2));
    leftGeo.setIndex(leftIndices);
    leftGeo.computeVertexNormals();

    const rightGeo = new THREE.BufferGeometry();
    rightGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightPositions, 3));
    rightGeo.setAttribute('normal', new THREE.Float32BufferAttribute(rightNormals, 3));
    if (rightUVs.length > 0) rightGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rightUVs, 2));
    rightGeo.setIndex(rightIndices);
    rightGeo.computeVertexNormals();

    const leftCrossGeo = buildCrossSection(faultLeftVertices, true);
    const rightCrossGeo = buildCrossSection(faultRightVertices, false);

    const makeLayerMaterial = (c: number) => new THREE.MeshStandardMaterial({
      color: c,
      roughness: 0.82,
      metalness: 0.06,
      flatShading: false
    });

    const crossSectionCanvas = this.createCrossSectionTexture(color, layerIndex);
    const crossTexture = new THREE.CanvasTexture(crossSectionCanvas);
    crossTexture.wrapS = THREE.RepeatWrapping;
    crossTexture.wrapT = THREE.RepeatWrapping;
    crossTexture.repeat.set(3, 2);
    crossTexture.needsUpdate = true;

    const leftMesh = new THREE.Mesh(leftGeo, makeLayerMaterial(color));
    leftMesh.position.y = centerY - (this.baseY + thickness / 2);
    leftMesh.castShadow = true;
    leftMesh.receiveShadow = true;

    const rightMesh = new THREE.Mesh(rightGeo, makeLayerMaterial(color));
    rightMesh.position.y = centerY - (this.baseY + thickness / 2);
    rightMesh.castShadow = true;
    rightMesh.receiveShadow = true;

    const crossMat = new THREE.MeshStandardMaterial({
      map: crossTexture,
      roughness: 0.75,
      metalness: 0.08,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92
    });
    const leftCrossSection = new THREE.Mesh(leftCrossGeo, crossMat);
    leftCrossSection.position.y = centerY - (this.baseY + thickness / 2);
    leftCrossSection.visible = false;

    const rightCrossSection = new THREE.Mesh(rightCrossGeo, crossMat.clone());
    rightCrossSection.position.y = centerY - (this.baseY + thickness / 2);
    rightCrossSection.visible = false;

    fullGeo.dispose();

    return { leftMesh, rightMesh, leftCrossSection, rightCrossSection };
  }

  private createCrossSectionTexture(baseColor: number, layerIdx: number): HTMLCanvasElement {
    const w = 512, h = 512;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;

    const c = new THREE.Color(baseColor);
    ctx.fillStyle = `rgb(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)})`;
    ctx.fillRect(0, 0, w, h);

    const bandCount = 12 + layerIdx * 3;
    for (let i = 0; i < bandCount; i++) {
      const y = (i / bandCount) * h + (Math.sin(i * 3.1 + layerIdx) * 0.05 + 0.05) * h;
      const hNoise = this.noise.noise2D(i * 0.37 + layerIdx, layerIdx * 7.1) * 40;
      const darken = 0.85 + this.noise.noise2D(i * 0.2, layerIdx * 2.3) * 0.15;
      ctx.strokeStyle = `rgba(${Math.floor(c.r * 255 * darken)}, ${Math.floor(c.g * 255 * darken)}, ${Math.floor(c.b * 255 * darken)}, 0.55)`;
      ctx.lineWidth = 1.5 + Math.abs(this.noise.noise2D(i, layerIdx)) * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 8) {
        const offY = this.noise.fractalNoise(x * 0.012 + i * 0.5, layerIdx + i * 0.3, 3) * hNoise;
        ctx.lineTo(x, y + offY);
      }
      ctx.stroke();
    }

    const grainCount = 3500;
    for (let g = 0; g < grainCount; g++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = 0.5 + Math.random() * 2;
      const shade = 0.7 + Math.random() * 0.6;
      ctx.fillStyle = `rgba(${Math.floor(c.r * 255 * shade)}, ${Math.floor(c.g * 255 * shade)}, ${Math.floor(c.b * 255 * shade)}, ${0.15 + Math.random() * 0.4})`;
      ctx.fillRect(x, y, size, size);
    }

    return canvas;
  }

  private createLabelSprite(name: string, age: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 140;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pad = 10, r = 24;
    const bw = canvas.width - pad * 2;
    const bh = canvas.height - pad * 2;

    const grad = ctx.createLinearGradient(0, pad, 0, pad + bh);
    grad.addColorStop(0, 'rgba(25, 28, 38, 0.92)');
    grad.addColorStop(1, 'rgba(15, 18, 28, 0.96)');
    ctx.fillStyle = grad;
    ctx.strokeStyle = '#ff8c33';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pad + r, pad);
    ctx.lineTo(pad + bw - r, pad);
    ctx.quadraticCurveTo(pad + bw, pad, pad + bw, pad + r);
    ctx.lineTo(pad + bw, pad + bh - r);
    ctx.quadraticCurveTo(pad + bw, pad + bh, pad + bw - r, pad + bh);
    ctx.lineTo(pad + r, pad + bh);
    ctx.quadraticCurveTo(pad, pad + bh, pad, pad + bh - r);
    ctx.lineTo(pad, pad + r);
    ctx.quadraticCurveTo(pad, pad, pad + r, pad);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'rgba(255, 140, 50, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd580';
    ctx.font = 'bold 30px "Microsoft YaHei", "PingFang SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowBlur = 0;
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 - 22);

    ctx.fillStyle = '#8ab6e6';
    ctx.font = '20px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.fillText(age, canvas.width / 2, canvas.height / 2 + 25);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(4.2, 1.15, 1);
    (sprite.renderOrder as number) = 999;
    return sprite;
  }

  public setFaultOffset(sliderValue: number): void {
    const normalized = Math.max(0, Math.min(100, sliderValue)) / 100;
    const maxOffset = 2.0;
    const offset = normalized * maxOffset;
    this.faultOffset = offset;
    this.isAnimatingBack = false;
    this.applyFaultState(offset);
  }

  public releaseFaultSlider(): void {
    if (this.faultOffset === 0) return;
    this.isAnimatingBack = true;
    this.animationStartTime = performance.now();
    this.animationStartOffset = this.faultOffset;
  }

  private applyFaultState(offset: number): void {
    this.faultOffset = offset;
    const showCross = offset > 0.001;
    this.rightGroup.position.x = offset;
    this.rightGroup.position.y = -offset * 0.18;

    for (const layer of this.layers) {
      layer.leftCrossSection.visible = showCross;
      layer.rightCrossSection.visible = showCross;
      if (showCross) {
        const fadeT = Math.min(1, offset / 0.6);
        const op = 0.7 + 0.25 * fadeT;
        (layer.leftCrossSection.material as THREE.MeshStandardMaterial).opacity = op;
        (layer.rightCrossSection.material as THREE.MeshStandardMaterial).opacity = op;
      }
    }
  }

  public update(deltaTime: number): void {
    if (this.isAnimatingBack) {
      const elapsed = (performance.now() - this.animationStartTime) / 1000;
      const duration = 1.2;
      if (elapsed >= duration) {
        this.isAnimatingBack = false;
        this.applyFaultState(0);
        return;
      }
      const t = elapsed / duration;
      const eased = this.easeOutElastic(t);
      this.applyFaultState(this.animationStartOffset * (1 - eased));
    }
  }

  private easeOutElastic(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  public highlightLayer(layer: StratumLayer | null): void {
    for (const l of this.layers) {
      const active = l === layer;
      l.leftHighlight.visible = active;
      l.rightHighlight.visible = active;
      l.labelSprite.visible = active;
      if (active) {
        (l.leftHighlight.material as THREE.MeshBasicMaterial).opacity = 0.28;
        (l.rightHighlight.material as THREE.MeshBasicMaterial).opacity = 0.28;
      }
    }
  }

  public getLayerByMesh(mesh: THREE.Object3D): StratumLayer | null {
    for (const layer of this.layers) {
      if (layer.leftMesh === mesh || layer.rightMesh === mesh) return layer;
    }
    return null;
  }

  public getAllPickableMeshes(): THREE.Mesh[] {
    const result: THREE.Mesh[] = [];
    for (const layer of this.layers) {
      result.push(layer.leftMesh, layer.rightMesh);
    }
    return result;
  }

  public getGroundY(): number {
    return this.baseY;
  }
}
