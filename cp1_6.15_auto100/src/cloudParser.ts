import * as THREE from 'three';

export interface ParsedCloud {
  vertices: Float32Array;
  indices: Uint32Array;
  originalPoints: THREE.Vector3[];
}

export function generatePoissonDiskSampling(
  width: number = 20,
  height: number = 20,
  depth: number = 20,
  minDist: number = 0.5,
  maxPoints: number = 500,
  seed?: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const gridSize = minDist / Math.sqrt(3);
  const gridX = Math.ceil(width / gridSize);
  const gridY = Math.ceil(height / gridSize);
  const gridZ = Math.ceil(depth / gridSize);
  const grid: (THREE.Vector3 | null)[][] = [];

  for (let x = 0; x < gridX; x++) {
    grid[x] = [];
    for (let y = 0; y < gridY; y++) {
      grid[x][y] = [] as any;
    }
  }

  const rng = seed !== undefined ? mulberry32(seed) : Math.random;

  const center = new THREE.Vector3(
    (rng() - 0.5) * width * 0.8,
    (rng() - 0.5) * height * 0.8,
    (rng() - 0.5) * depth * 0.8
  );
  points.push(center);

  const active: number[] = [0];
  const attempts = 30;

  while (active.length > 0 && points.length < maxPoints) {
    const idx = Math.floor(rng() * active.length);
    const baseIdx = active[idx];
    const base = points[baseIdx];
    let found = false;

    for (let a = 0; a < attempts; a++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const r = minDist * (1 + rng());

      const dx = r * Math.sin(phi) * Math.cos(theta);
      const dy = r * Math.sin(phi) * Math.sin(theta);
      const dz = r * Math.cos(phi);

      const candidate = new THREE.Vector3(
        base.x + dx,
        base.y + dy,
        base.z + dz
      );

      const halfW = width / 2, halfH = height / 2, halfD = depth / 2;
      if (
        candidate.x < -halfW || candidate.x > halfW ||
        candidate.y < -halfH || candidate.y > halfH ||
        candidate.z < -halfD || candidate.z > halfD
      ) continue;

      let valid = true;
      for (const p of points) {
        if (candidate.distanceTo(p) < minDist) {
          valid = false;
          break;
        }
      }

      if (valid) {
        points.push(candidate);
        active.push(points.length - 1);
        found = true;
        break;
      }
    }

    if (!found) {
      active.splice(idx, 1);
    }
  }

  while (points.length < maxPoints * 0.5) {
    const p = new THREE.Vector3(
      (rng() - 0.5) * width * 0.9,
      (rng() - 0.5) * height * 0.9,
      (rng() - 0.5) * depth * 0.9
    );
    let valid = true;
    for (const ep of points) {
      if (ep.distanceTo(p) < minDist * 0.7) { valid = false; break; }
    }
    if (valid) points.push(p);
  }

  return points;
}

export function generatePresetPoints(): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const rng = mulberry32(42);

  const levels = 5;
  const perLevel = 40;

  for (let l = 0; l < levels; l++) {
    const t = l / (levels - 1);
    const height = -8 + t * 16;
    const radius = 8 - Math.abs(t - 0.5) * 6;
    for (let i = 0; i < perLevel; i++) {
      const angle = (i / perLevel) * Math.PI * 2 + rng() * 0.3;
      const r = radius * (0.7 + rng() * 0.5);
      points.push(new THREE.Vector3(
        Math.cos(angle) * r + (rng() - 0.5) * 0.5,
        height + (rng() - 0.5) * 0.8,
        Math.sin(angle) * r + (rng() - 0.5) * 0.5
      ));
    }
  }

  while (points.length < 200) {
    points.push(new THREE.Vector3(
      (rng() - 0.5) * 18,
      (rng() - 0.5) * 18,
      (rng() - 0.5) * 18
    ));
  }

  return points.slice(0, Math.max(200, points.length));
}

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function getPointColor(z: number, zMin: number, zMax: number): THREE.Color {
  const t = zMax === zMin ? 0.5 : (z - zMin) / (zMax - zMin);
  const color = new THREE.Color();
  color.setRGB(
    THREE.MathUtils.lerp(0, 1, t),
    THREE.MathUtils.lerp(0.4, 0.2, t),
    THREE.MathUtils.lerp(1, 0, t)
  );
  return color;
}

export function computeConvexHull3D(points: THREE.Vector3[]): ParsedCloud {
  const n = points.length;
  if (n < 4) {
    return buildTetrahedron(points);
  }

  const hull: number[][][] = [];
  const idx = [0, 1, 2, 3];
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      for (let k = j + 1; k < 4; k++) {
        const a = points[idx[i]], b = points[idx[j]], c = points[idx[k]];
        const m = 6 - i - j - k;
        const d = points[idx[m]];
        const norm = new THREE.Vector3()
          .subVectors(b, a)
          .cross(new THREE.Vector3().subVectors(c, a))
          .normalize();
        const sign = norm.dot(new THREE.Vector3().subVectors(d, a));
        if (sign < 0) {
          hull.push([[idx[i], idx[j], idx[k]]]);
        } else {
          hull.push([[idx[k], idx[j], idx[i]]]);
        }
      }
    }
  }

  for (let p = 4; p < n; p++) {
    const visible: Set<string> = new Set();
    for (let f = hull.length - 1; f >= 0; f--) {
      const face = hull[f][0];
      const [a, b, c] = face;
      const va = points[a], vb = points[b], vc = points[c];
      const norm = new THREE.Vector3()
        .subVectors(vb, va)
        .cross(new THREE.Vector3().subVectors(vc, va));
      const dist = norm.dot(new THREE.Vector3().subVectors(points[p], va));
      if (dist > 1e-8) {
        hull.splice(f, 1);
        const edges = [
          [a, b], [b, c], [c, a]
        ];
        for (const e of edges) {
          const key = Math.min(e[0], e[1]) + '-' + Math.max(e[0], e[1]);
          if (visible.has(key)) visible.delete(key);
          else visible.add(key);
        }
      }
    }
    for (const key of visible) {
      const [aStr, bStr] = key.split('-');
      const a = parseInt(aStr), b = parseInt(bStr);
      const va = points[a], vb = points[b], vp = points[p];
      const norm = new THREE.Vector3()
        .subVectors(vb, va)
        .cross(new THREE.Vector3().subVectors(vp, va));
      let inside = false;
      for (let q = 0; q < n; q++) {
        if (q === a || q === b || q === p) continue;
        if (norm.dot(new THREE.Vector3().subVectors(points[q], va)) > 1e-8) {
          inside = true; break;
        }
      }
      if (!inside) {
        hull.push([[a, b, p]]);
      } else {
        hull.push([[b, a, p]]);
      }
    }
  }

  const vertices = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    vertices[i * 3] = points[i].x;
    vertices[i * 3 + 1] = points[i].y;
    vertices[i * 3 + 2] = points[i].z;
  }

  const indices = new Uint32Array(hull.length * 3);
  for (let i = 0; i < hull.length; i++) {
    const face = hull[i][0];
    indices[i * 3] = face[0];
    indices[i * 3 + 1] = face[1];
    indices[i * 3 + 2] = face[2];
  }

  return { vertices, indices, originalPoints: points };
}

function buildTetrahedron(points: THREE.Vector3[]): ParsedCloud {
  const n = Math.min(points.length, 4);
  while (points.length < 4) {
    const r = 2 + Math.random() * 2;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    points.push(new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    ));
  }

  const vertices = new Float32Array(4 * 3);
  for (let i = 0; i < 4; i++) {
    vertices[i * 3] = points[i].x;
    vertices[i * 3 + 1] = points[i].y;
    vertices[i * 3 + 2] = points[i].z;
  }
  const indices = new Uint32Array([
    0, 1, 2,
    0, 3, 1,
    0, 2, 3,
    1, 3, 2
  ]);
  return { vertices, indices, originalPoints: points };
}

export function parsePointCloud(points: THREE.Vector3[]): ParsedCloud {
  return computeConvexHull3D(points);
}
