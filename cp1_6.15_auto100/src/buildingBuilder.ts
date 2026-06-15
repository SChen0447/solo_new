import * as THREE from 'three';
import type { ParsedCloud } from './cloudParser';
import type { PointData } from './store';

export interface BuildingResult {
  mesh: THREE.Mesh;
  wireframe: THREE.LineSegments;
  controlPoints: PointData[];
  bounds: { min: THREE.Vector3; max: THREE.Vector3 };
}

export function buildBuildingMesh(
  parsedCloud: ParsedCloud,
  heightScale: number = 1.0,
  smoothIterations: number = 2
): BuildingResult {
  const positions = new Float32Array(parsedCloud.vertices);

  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] *= heightScale;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(parsedCloud.indices), 1));

  applyLaplacianSmoothing(geometry, smoothIterations);

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.7,
    roughness: 0.3,
    metalness: 0.1,
    side: THREE.DoubleSide,
    flatShading: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const wireGeo = new THREE.WireframeGeometry(geometry);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x00aaff,
    linewidth: 1,
    transparent: true,
    opacity: 0.9
  });
  const wireframe = new THREE.LineSegments(wireGeo, wireMat);

  const controlPoints = extractControlPoints(geometry);

  const bbox = geometry.boundingBox!;
  const bounds = {
    min: bbox.min.clone(),
    max: bbox.max.clone()
  };

  return { mesh, wireframe, controlPoints, bounds };
}

function extractControlPoints(geometry: THREE.BufferGeometry): PointData[] {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const positions = posAttr.array as Float32Array;
  const indices = geometry.getIndex()!.array as Uint32Array;

  const vertexFaceCount: number[] = new Array(positions.length / 3).fill(0);
  for (let i = 0; i < indices.length; i++) {
    vertexFaceCount[indices[i]]++;
  }

  const candidateIdx: number[] = [];
  const vertexToFaces: Map<number, number[]> = new Map();

  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    for (const vidx of [a, b, c]) {
      if (!vertexToFaces.has(vidx)) vertexToFaces.set(vidx, []);
      vertexToFaces.get(vidx)!.push(i / 3);
    }
  }

  const uniqueVertices: Set<number> = new Set();
  const sampleStep = Math.max(1, Math.floor((positions.length / 3) / 16));

  for (let i = 0; i < positions.length; i += 3 * sampleStep) {
    const idx = i / 3;
    uniqueVertices.add(idx);
  }

  const normals = new Float32Array(positions.length);
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();
  const tmpN = new THREE.Vector3();

  for (let f = 0; f < indices.length; f += 3) {
    const ia = indices[f] * 3, ib = indices[f + 1] * 3, ic = indices[f + 2] * 3;
    tmpA.set(positions[ia], positions[ia + 1], positions[ia + 2]);
    tmpB.set(positions[ib], positions[ib + 1], positions[ib + 2]);
    tmpC.set(positions[ic], positions[ic + 1], positions[ic + 2]);
    tmpB.sub(tmpA);
    tmpC.sub(tmpA);
    tmpN.crossVectors(tmpB, tmpC);

    normals[ia] += tmpN.x; normals[ia + 1] += tmpN.y; normals[ia + 2] += tmpN.z;
    normals[ib] += tmpN.x; normals[ib + 1] += tmpN.y; normals[ib + 2] += tmpN.z;
    normals[ic] += tmpN.x; normals[ic + 1] += tmpN.y; normals[ic + 2] += tmpN.z;
  }

  const seen: Set<string> = new Set();
  const result: PointData[] = [];
  let id = 0;

  const vertArr = Array.from(uniqueVertices);
  const targetCount = Math.min(vertArr.length, 18);

  const centroids: { pos: THREE.Vector3; idx: number; dist: number }[] = [];
  const center = new THREE.Vector3();
  for (let i = 0; i < positions.length; i += 3) {
    center.x += positions[i];
    center.y += positions[i + 1];
    center.z += positions[i + 2];
  }
  center.multiplyScalar(3 / positions.length);

  for (const vidx of uniqueVertices) {
    const i3 = vidx * 3;
    const pos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
    centroids.push({ pos, idx: vidx, dist: pos.distanceTo(center) });
  }

  centroids.sort((a, b) => b.dist - a.dist);

  for (const entry of centroids.slice(0, targetCount)) {
    const pos = entry.pos.clone();
    const orig = pos.clone();
    result.push({ id: id++, position: pos, originalPosition: orig });
    seen.add(`${Math.round(pos.x * 10)},${Math.round(pos.y * 10)},${Math.round(pos.z * 10)}`);
  }

  while (result.length < targetCount && centroids.length > result.length) {
    for (const entry of centroids) {
      if (result.length >= targetCount) break;
      const pos = entry.pos.clone();
      const key = `${Math.round(pos.x * 10)},${Math.round(pos.y * 10)},${Math.round(pos.z * 10)}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ id: id++, position: pos, originalPosition: pos.clone() });
      }
    }
  }

  return result;
}

export function applyLaplacianSmoothing(
  geometry: THREE.BufferGeometry,
  iterations: number = 2,
  lambda: number = 0.5
): void {
  if (iterations <= 0) return;

  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const indices = geometry.getIndex();
  if (!indices) return;

  const idxArr = indices.array as Uint32Array;
  const posArr = positions.array as Float32Array;
  const n = posArr.length / 3;

  const adjacency: Set<number>[] = [];
  for (let i = 0; i < n; i++) adjacency.push(new Set());

  for (let i = 0; i < idxArr.length; i += 3) {
    const a = idxArr[i], b = idxArr[i + 1], c = idxArr[i + 2];
    adjacency[a].add(b); adjacency[a].add(c);
    adjacency[b].add(a); adjacency[b].add(c);
    adjacency[c].add(a); adjacency[c].add(b);
  }

  const origPos = new Float32Array(posArr);

  for (let iter = 0; iter < iterations; iter++) {
    const newPos = new Float32Array(posArr);

    for (let v = 0; v < n; v++) {
      const neighbors = adjacency[v];
      if (neighbors.size === 0) continue;

      let sx = 0, sy = 0, sz = 0;
      for (const nv of neighbors) {
        sx += origPos[nv * 3];
        sy += origPos[nv * 3 + 1];
        sz += origPos[nv * 3 + 2];
      }
      const avgX = sx / neighbors.size;
      const avgY = sy / neighbors.size;
      const avgZ = sz / neighbors.size;

      const vi3 = v * 3;
      newPos[vi3] = origPos[vi3] + (avgX - origPos[vi3]) * lambda;
      newPos[vi3 + 1] = origPos[vi3 + 1] + (avgY - origPos[vi3 + 1]) * lambda;
      newPos[vi3 + 2] = origPos[vi3 + 2] + (avgZ - origPos[vi3 + 2]) * lambda;
    }

    origPos.set(newPos);
  }

  posArr.set(origPos);
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
}

export function deformWithControlPoints(
  mesh: THREE.Mesh,
  controlPoints: PointData[],
  movedId: number,
  sigma: number = 2.0
): void {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const posArr = positions.array as Float32Array;

  const moved = controlPoints.find(cp => cp.id === movedId);
  if (!moved) return;

  const delta = new THREE.Vector3().subVectors(moved.position, moved.originalPosition);
  if (delta.lengthSq() < 1e-8) return;

  const sigmaSq = sigma * sigma * 2;
  const tmp = new THREE.Vector3();

  for (let i = 0; i < posArr.length; i += 3) {
    tmp.set(posArr[i], posArr[i + 1], posArr[i + 2]);

    let totalW = 0;
    let totalDx = 0, totalDy = 0, totalDz = 0;

    for (const cp of controlPoints) {
      const cpDelta = new THREE.Vector3().subVectors(cp.position, cp.originalPosition);
      const dist = tmp.distanceTo(cp.originalPosition);
      const w = Math.exp(-(dist * dist) / sigmaSq);

      totalW += w;
      totalDx += cpDelta.x * w;
      totalDy += cpDelta.y * w;
      totalDz += cpDelta.z * w;
    }

    if (totalW > 1e-8) {
      posArr[i] += totalDx / totalW;
      posArr[i + 1] += totalDy / totalW;
      posArr[i + 2] += totalDz / totalW;
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
}

export function chamferSmooth(geometry: THREE.BufferGeometry, iterations: number = 3): void {
  applyLaplacianSmoothing(geometry, iterations, 0.35);
}

export function updateWireframe(mesh: THREE.Mesh): THREE.LineSegments {
  const wireGeo = new THREE.WireframeGeometry(mesh.geometry);
  const wireMat = new THREE.LineBasicMaterial({
    color: 0x00aaff,
    linewidth: 1,
    transparent: true,
    opacity: 0.9
  });
  return new THREE.LineSegments(wireGeo, wireMat);
}

export function getVertexNormal(
  geometry: THREE.BufferGeometry,
  vertexIndex: number
): THREE.Vector3 {
  const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute | undefined;
  if (normalAttr) {
    const i3 = vertexIndex * 3;
    return new THREE.Vector3(
      normalAttr.array[i3],
      normalAttr.array[i3 + 1],
      normalAttr.array[i3 + 2]
    ).normalize();
  }

  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const indices = geometry.getIndex()!.array as Uint32Array;
  const posArr = positions.array as Float32Array;

  const normal = new THREE.Vector3();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3(), fn = new THREE.Vector3();

  for (let f = 0; f < indices.length; f += 3) {
    if (indices[f] === vertexIndex || indices[f + 1] === vertexIndex || indices[f + 2] === vertexIndex) {
      const ia = indices[f] * 3, ib = indices[f + 1] * 3, ic = indices[f + 2] * 3;
      a.set(posArr[ia], posArr[ia + 1], posArr[ia + 2]);
      b.set(posArr[ib], posArr[ib + 1], posArr[ib + 2]);
      c.set(posArr[ic], posArr[ic + 1], posArr[ic + 2]);
      ab.subVectors(b, a);
      ac.subVectors(c, a);
      fn.crossVectors(ab, ac);
      normal.add(fn);
    }
  }

  return normal.normalize();
}

export function findClosestVertex(
  geometry: THREE.BufferGeometry,
  point: THREE.Vector3
): number {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const posArr = positions.array as Float32Array;
  let minDist = Infinity;
  let minIdx = 0;

  for (let i = 0; i < posArr.length; i += 3) {
    const dx = posArr[i] - point.x;
    const dy = posArr[i + 1] - point.y;
    const dz = posArr[i + 2] - point.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < minDist) {
      minDist = d2;
      minIdx = i / 3;
    }
  }
  return minIdx;
}
