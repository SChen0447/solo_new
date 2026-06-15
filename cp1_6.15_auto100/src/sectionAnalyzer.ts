import * as THREE from 'three';

export interface SectionData {
  polygon: THREE.Vector2[];
  area: number;
  perimeter: number;
  fillGeometry: THREE.BufferGeometry;
  outlinePoints: THREE.Vector3[];
  cutWorldHeight: number;
}

export function createCutPlaneMesh(
  bounds: { min: THREE.Vector3; max: THREE.Vector3 },
  cutHeight: number
): THREE.Mesh {
  const width = (bounds.max.x - bounds.min.x) * 1.5;
  const depth = (bounds.max.z - bounds.min.z) * 1.5;
  const centerX = (bounds.min.x + bounds.max.x) / 2;
  const centerZ = (bounds.min.z + bounds.max.z) / 2;
  const yRange = bounds.max.y - bounds.min.y;
  const y = bounds.min.y + cutHeight * yRange;

  const geometry = new THREE.PlaneGeometry(width, depth);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(centerX, y, centerZ);

  const material = new THREE.MeshBasicMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  return mesh;
}

export function computeSection(
  mesh: THREE.Mesh,
  cutHeight: number,
  bounds: { min: THREE.Vector3; max: THREE.Vector3 }
): SectionData | null {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const indices = geometry.getIndex();
  if (!indices || !positions) return null;

  const yRange = bounds.max.y - bounds.min.y;
  const cutY = bounds.min.y + cutHeight * yRange;

  if (cutY < bounds.min.y - 0.01 || cutY > bounds.max.y + 0.01) {
    return null;
  }

  const idxArr = indices.array as Uint32Array;
  const posArr = positions.array as Float32Array;

  const edgeIntersections: { start: THREE.Vector3; end: THREE.Vector3 }[] = [];

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();

  for (let f = 0; f < idxArr.length; f += 3) {
    const ia = idxArr[f] * 3;
    const ib = idxArr[f + 1] * 3;
    const ic = idxArr[f + 2] * 3;

    v0.set(posArr[ia], posArr[ia + 1], posArr[ia + 2]);
    v1.set(posArr[ib], posArr[ib + 1], posArr[ib + 2]);
    v2.set(posArr[ic], posArr[ic + 1], posArr[ic + 2]);

    const verts = [v0, v1, v2];
    const edges: [THREE.Vector3, THREE.Vector3][] = [
      [v0, v1], [v1, v2], [v2, v0]
    ];

    for (const [a, b] of edges) {
      const ya = a.y - cutY;
      const yb = b.y - cutY;

      if (ya * yb < 0) {
        const t = Math.abs(ya) / (Math.abs(ya) + Math.abs(yb));
        const pt = new THREE.Vector3().lerpVectors(a, b, t);
        edgeIntersections.push({
          start: a.clone(),
          end: pt.clone()
        });
      }
    }
  }

  if (edgeIntersections.length < 2) return null;

  const points = edgeIntersections.map(e => e.end.clone());
  const orderedPoints = orderPointsClockwise(points);

  if (orderedPoints.length < 3) {
    if (orderedPoints.length >= 2) {
      const poly = orderedPoints.map(p => new THREE.Vector2(p.x, p.z));
      let perim = 0;
      for (let i = 0; i < poly.length; i++) {
        const next = poly[(i + 1) % poly.length];
        perim += poly[i].distanceTo(next);
      }
      return {
        polygon: poly,
        area: 0,
        perimeter: perim,
        fillGeometry: new THREE.BufferGeometry(),
        outlinePoints: orderedPoints,
        cutWorldHeight: cutY
      };
    }
    return null;
  }

  const polygon2D = orderedPoints.map(p => new THREE.Vector2(p.x, p.z));
  const area = calculatePolygonArea(polygon2D);
  const perimeter = calculatePolygonPerimeter(polygon2D);

  const fillGeometry = createFillGeometry(orderedPoints, cutY);

  return {
    polygon: polygon2D,
    area,
    perimeter,
    fillGeometry,
    outlinePoints: orderedPoints,
    cutWorldHeight: cutY
  };
}

function orderPointsClockwise(points: THREE.Vector3[]): THREE.Vector3[] {
  if (points.length < 3) return points.slice();

  const center = new THREE.Vector3();
  for (const p of points) center.add(p);
  center.multiplyScalar(1 / points.length);

  const withAngle = points.map(p => {
    const angle = Math.atan2(p.z - center.z, p.x - center.x);
    return { p, angle };
  });

  withAngle.sort((a, b) => a.angle - b.angle);

  const ordered = withAngle.map(w => w.p.clone());

  const filtered: THREE.Vector3[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const curr = ordered[i];
    const last = filtered[filtered.length - 1];
    if (!last || curr.distanceTo(last) > 0.01) {
      filtered.push(curr);
    }
  }

  if (filtered.length > 1 && filtered[0].distanceTo(filtered[filtered.length - 1]) < 0.01) {
    filtered.pop();
  }

  return filtered;
}

function calculatePolygonArea(polygon: THREE.Vector2[]): number {
  const n = polygon.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }

  return Math.abs(area) / 2;
}

function calculatePolygonPerimeter(polygon: THREE.Vector2[]): number {
  const n = polygon.length;
  if (n < 2) return 0;

  let perim = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    perim += polygon[i].distanceTo(polygon[j]);
  }

  return perim;
}

function createFillGeometry(points: THREE.Vector3[], y: number): THREE.BufferGeometry {
  const n = points.length;
  if (n < 3) return new THREE.BufferGeometry();

  const vertices: number[] = [];
  const indices: number[] = [];

  const cx = points.reduce((s, p) => s + p.x, 0) / n;
  const cz = points.reduce((s, p) => s + p.z, 0) / n;

  vertices.push(cx, y, cz);
  for (const p of points) {
    vertices.push(p.x, y, p.z);
  }

  for (let i = 1; i <= n; i++) {
    const next = i === n ? 1 : i + 1;
    indices.push(0, i, next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
}

export function createSectionFillMesh(fillGeometry: THREE.BufferGeometry): THREE.Mesh {
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ff88,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(fillGeometry, material);
  return mesh;
}

export function createSectionOutline(points: THREE.Vector3[]): THREE.Line {
  if (points.length < 2) {
    return new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff }));
  }

  const verts: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    verts.push(p.x, p.y, p.z);
  }
  if (points.length > 2) {
    verts.push(points[0].x, points[0].y, points[0].z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));

  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    linewidth: 2
  });

  return new THREE.Line(geometry, material);
}

export function splitMeshByPlane(
  mesh: THREE.Mesh,
  cutHeight: number,
  bounds: { min: THREE.Vector3; max: THREE.Vector3 }
): { upperMesh: THREE.Mesh | null; lowerMesh: THREE.Mesh | null } {
  const geometry = mesh.geometry;
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const indices = geometry.getIndex();
  if (!indices || !positions) return { upperMesh: null, lowerMesh: null };

  const yRange = bounds.max.y - bounds.min.y;
  const cutY = bounds.min.y + cutHeight * yRange;

  const idxArr = indices.array as Uint32Array;
  const posArr = positions.array as Float32Array;

  const upperIndices: number[] = [];
  const lowerIndices: number[] = [];
  const allVerts: { x: number; y: number; z: number }[] = [];
  const vertMap: Map<string, number> = new Map();

  const addOrGetVert = (x: number, y: number, z: number): number => {
    const key = `${Math.round(x * 10000)}_${Math.round(y * 10000)}_${Math.round(z * 10000)}`;
    if (vertMap.has(key)) return vertMap.get(key)!;
    const idx = allVerts.length;
    allVerts.push({ x, y, z });
    vertMap.set(key, idx);
    return idx;
  };

  const tmp = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];

  for (let f = 0; f < idxArr.length; f += 3) {
    for (let vi = 0; vi < 3; vi++) {
      const ia = idxArr[f + vi] * 3;
      tmp[vi].set(posArr[ia], posArr[ia + 1], posArr[ia + 2]);
    }

    const above = tmp.map(v => v.y >= cutY);
    const aboveCount = above.filter(Boolean).length;

    if (aboveCount === 3) {
      const vi = tmp.map(v => addOrGetVert(v.x, v.y, v.z));
      upperIndices.push(vi[0], vi[1], vi[2]);
    } else if (aboveCount === 0) {
      const vi = tmp.map(v => addOrGetVert(v.x, v.y, v.z));
      lowerIndices.push(vi[0], vi[1], vi[2]);
    } else {
      const ordered = [0, 1, 2];
      if (aboveCount === 1) {
        let ai = above.findIndex(Boolean);
        const bi = (ai + 1) % 3;
        const ci = (ai + 2) % 3;

        const va = tmp[ai], vb = tmp[bi], vc = tmp[ci];

        const t1 = Math.abs(va.y - cutY) / (Math.abs(va.y - cutY) + Math.abs(vb.y - cutY));
        const t2 = Math.abs(va.y - cutY) / (Math.abs(va.y - cutY) + Math.abs(vc.y - cutY));

        const p1 = new THREE.Vector3().lerpVectors(va, vb, t1);
        const p2 = new THREE.Vector3().lerpVectors(va, vc, t2);

        const via = addOrGetVert(va.x, va.y, va.z);
        const vip1 = addOrGetVert(p1.x, p1.y, p1.z);
        const vip2 = addOrGetVert(p2.x, p2.y, p2.z);
        upperIndices.push(via, vip1, vip2);

        const vib = addOrGetVert(vb.x, vb.y, vb.z);
        const vic = addOrGetVert(vc.x, vc.y, vc.z);
        lowerIndices.push(vib, vic, vip2);
        lowerIndices.push(vib, vip2, vip1);
      } else {
        let bi = 0;
        for (let i = 0; i < 3; i++) {
          if (!above[i]) { bi = i; break; }
        }
        const ai = (bi + 1) % 3;
        const ci = (bi + 2) % 3;

        const vb = tmp[bi], va = tmp[ai], vc = tmp[ci];

        const t1 = Math.abs(vb.y - cutY) / (Math.abs(vb.y - cutY) + Math.abs(va.y - cutY));
        const t2 = Math.abs(vb.y - cutY) / (Math.abs(vb.y - cutY) + Math.abs(vc.y - cutY));

        const p1 = new THREE.Vector3().lerpVectors(vb, va, t1);
        const p2 = new THREE.Vector3().lerpVectors(vb, vc, t2);

        const vib = addOrGetVert(vb.x, vb.y, vb.z);
        const vip1 = addOrGetVert(p1.x, p1.y, p1.z);
        const vip2 = addOrGetVert(p2.x, p2.y, p2.z);
        lowerIndices.push(vib, vip1, vip2);

        const via = addOrGetVert(va.x, va.y, va.z);
        const vic = addOrGetVert(vc.x, vc.y, vc.z);
        upperIndices.push(via, vic, vip2);
        upperIndices.push(via, vip2, vip1);
      }
    }
  }

  const buildMesh = (inds: number[], mat: THREE.Material): THREE.Mesh | null => {
    if (inds.length < 3) return null;
    const verts: number[] = [];
    for (const v of allVerts) {
      verts.push(v.x, v.y, v.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(inds);
    g.computeVertexNormals();
    return new THREE.Mesh(g, mat);
  };

  const origMat = mesh.material as THREE.MeshStandardMaterial;
  const upperMat = origMat.clone();
  upperMat.opacity = 0.6;
  const lowerMat = origMat.clone();
  lowerMat.opacity = 0.6;

  return {
    upperMesh: buildMesh(upperIndices, upperMat),
    lowerMesh: buildMesh(lowerIndices, lowerMat)
  };
}
