import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStore } from './store';
import { TerrainData, COLORS } from './types';

const TERRAIN_WIDTH = 8;
const TERRAIN_DEPTH = 5;
const SEGMENTS_X = 128;
const SEGMENTS_Z = 80;

class SimplePerlin {
  private perm: number[];

  constructor(seed = 1337) {
    const p = new Array(512);
    const permutation = new Array(256);
    let s = seed;
    for (let i = 0; i < 256; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      permutation[i] = i;
    }
    for (let i = 255; i > 0; i--) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const j = s % (i + 1);
      [permutation[i], permutation[j]] = [permutation[j], permutation[i]];
    }
    for (let i = 0; i < 512; i++) p[i] = permutation[i & 255];
    this.perm = p;
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

  public noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    const u = this.fade(x);
    const v = this.fade(y);
    const A = this.perm[X] + Y;
    const B = this.perm[X + 1] + Y;
    return this.lerp(
      this.lerp(this.grad(this.perm[A], x, y), this.grad(this.perm[B], x - 1, y), u),
      this.lerp(this.grad(this.perm[A + 1], x, y - 1), this.grad(this.perm[B + 1], x - 1, y - 1), u),
      v
    );
  }

  public fbm(x: number, y: number, octaves = 4): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;
    for (let i = 0; i < octaves; i++) {
      value += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }
    return value / maxValue;
  }
}

function lerpColor(c1: THREE.Color, c2: THREE.Color, t: number): THREE.Color {
  const c = c1.clone();
  c.lerp(c2, Math.max(0, Math.min(1, t)));
  return c;
}

export default function Terrain() {
  const meshRef = useRef<THREE.Mesh>(null);
  const setTerrain = useStore((s) => s.setTerrain);

  const { geometry, heights, terrainData } = useMemo(() => {
    const perlin = new SimplePerlin(42);
    const geo = new THREE.PlaneGeometry(
      TERRAIN_WIDTH,
      TERRAIN_DEPTH,
      SEGMENTS_X,
      SEGMENTS_Z
    );
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const heightsArr = new Float32Array((SEGMENTS_X + 1) * (SEGMENTS_Z + 1));

    const lowColor = new THREE.Color(COLORS.terrainLow);
    const highColor = new THREE.Color(COLORS.terrainHigh);
    const colors = new Float32Array(arr.length);

    let minH = Infinity;
    let maxH = -Infinity;
    const rawHeights = new Float32Array((SEGMENTS_X + 1) * (SEGMENTS_Z + 1));

    for (let iz = 0; iz <= SEGMENTS_Z; iz++) {
      for (let ix = 0; ix <= SEGMENTS_X; ix++) {
        const idx = iz * (SEGMENTS_X + 1) + ix;
        const vertexIdx = idx * 3;
        const x = arr[vertexIdx];
        const z = arr[vertexIdx + 2];

        const nx = x / TERRAIN_WIDTH + 0.5;
        const nz = z / TERRAIN_DEPTH + 0.5;
        const hRaw = perlin.fbm(nx * 3, nz * 3, 4);
        rawHeights[idx] = hRaw;
        if (hRaw < minH) minH = hRaw;
        if (hRaw > maxH) maxH = hRaw;
      }
    }

    const range = maxH - minH || 1;
    for (let iz = 0; iz <= SEGMENTS_Z; iz++) {
      for (let ix = 0; ix <= SEGMENTS_X; ix++) {
        const idx = iz * (SEGMENTS_X + 1) + ix;
        const vertexIdx = idx * 3;
        const normalized = (rawHeights[idx] - minH) / range;
        const y = normalized * 2 - 1;
        arr[vertexIdx + 1] = y;
        heightsArr[idx] = y;

        const colorT = Math.max(0, Math.min(1, (y + 1) / 2));
        const col = lerpColor(lowColor, highColor, colorT);
        colors[vertexIdx] = col.r;
        colors[vertexIdx + 1] = col.g;
        colors[vertexIdx + 2] = col.b;
      }
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const data: TerrainData = {
      width: TERRAIN_WIDTH,
      depth: TERRAIN_DEPTH,
      segmentsX: SEGMENTS_X,
      segmentsZ: SEGMENTS_Z,
      heights: heightsArr,
      getHeightAt: (x: number, z: number) => {
        const nx = x / TERRAIN_WIDTH + 0.5;
        const nz = z / TERRAIN_DEPTH + 0.5;
        const cx = Math.max(0, Math.min(SEGMENTS_X, nx * SEGMENTS_X));
        const cz = Math.max(0, Math.min(SEGMENTS_Z, nz * SEGMENTS_Z));
        const ix0 = Math.floor(cx);
        const iz0 = Math.floor(cz);
        const ix1 = Math.min(SEGMENTS_X, ix0 + 1);
        const iz1 = Math.min(SEGMENTS_Z, iz0 + 1);
        const tx = cx - ix0;
        const tz = cz - iz0;

        const h00 = heightsArr[iz0 * (SEGMENTS_X + 1) + ix0];
        const h10 = heightsArr[iz0 * (SEGMENTS_X + 1) + ix1];
        const h01 = heightsArr[iz1 * (SEGMENTS_X + 1) + ix0];
        const h11 = heightsArr[iz1 * (SEGMENTS_X + 1) + ix1];

        const h0 = h00 + (h10 - h00) * tx;
        const h1 = h01 + (h11 - h01) * tx;
        return h0 + (h1 - h0) * tz;
      }
    };

    return {
      geometry: geo,
      heights: heightsArr,
      terrainData: data
    };
  }, []);

  useEffect(() => {
    setTerrain(terrainData);
    return () => {
      geometry.dispose();
    };
  }, [terrainData, geometry, setTerrain]);

  return (
    <mesh ref={meshRef} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        vertexColors
        flatShading
        roughness={0.9}
        metalness={0.05}
      />
    </mesh>
  );
}
