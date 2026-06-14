import * as THREE from 'three';
import type { LineShape, RectShape, CircleShape, Point } from '../store/useSketchStore';

const SCALE = 0.1;
const LINE_WIDTH = 2;
const MAX_ELEVATION = 5;
const DEPRESSION_DEPTH = 0.5;

const colorLow = new THREE.Color(0x22c55e);
const colorHigh = new THREE.Color(0x92400e);

const getHeightColor = (height: number, maxHeight: number): THREE.Color => {
  const t = maxHeight > 0 ? Math.min(height / maxHeight, 1) : 0;
  return colorLow.clone().lerp(colorHigh, t);
};

const map2dTo3d = (x: number, y: number): THREE.Vector3 => {
  return new THREE.Vector3(x * SCALE, 0, -y * SCALE);
};

export const buildLineGeometry = (shape: LineShape): THREE.BufferGeometry => {
  const { points } = shape;
  if (points.length < 2) {
    return new THREE.BufferGeometry();
  }

  const vertices: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const halfWidth = (LINE_WIDTH * shape.strokeWidth === 'thin' ? 1 : shape.strokeWidth === 'medium' ? 2 : 3) * SCALE;

  let vertexIndex = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const elevation = (p.y / 500) * MAX_ELEVATION;

    let dx = 0;
    let dz = 0;

    if (i === 0 && points.length > 1) {
      const next = points[i + 1];
      dx = next.x - p.x;
      dz = next.y - p.y;
    } else if (i === points.length - 1 && points.length > 1) {
      const prev = points[i - 1];
      dx = p.x - prev.x;
      dz = p.y - prev.y;
    } else {
      const prev = points[i - 1];
      const next = points[i + 1];
      dx = next.x - prev.x;
      dz = next.y - prev.y;
    }

    const len = Math.sqrt(dx * dx + dz * dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    const perpX = -dz * halfWidth;
    const perpZ = dx * halfWidth;

    const baseX = p.x * SCALE;
    const baseZ = -p.y * SCALE;

    const color = getHeightColor(elevation, MAX_ELEVATION);

    vertices.push(baseX + perpX, elevation, baseZ + perpZ);
    colors.push(color.r, color.g, color.b);

    vertices.push(baseX - perpX, elevation, baseZ - perpZ);
    colors.push(color.r, color.g, color.b);

    vertices.push(baseX + perpX, 0, baseZ + perpZ);
    colors.push(0.1, 0.6, 0.2);

    vertices.push(baseX - perpX, 0, baseZ - perpZ);
    colors.push(0.1, 0.6, 0.2);

    if (i < points.length - 1) {
      const i0 = vertexIndex * 4;
      const i1 = vertexIndex * 4 + 1;
      const i2 = vertexIndex * 4 + 2;
      const i3 = vertexIndex * 4 + 3;
      const i4 = (vertexIndex + 1) * 4;
      const i5 = (vertexIndex + 1) * 4 + 1;
      const i6 = (vertexIndex + 1) * 4 + 2;
      const i7 = (vertexIndex + 1) * 4 + 3;

      indices.push(i0, i4, i1);
      indices.push(i1, i4, i5);

      indices.push(i2, i3, i6);
      indices.push(i3, i7, i6);

      indices.push(i0, i2, i4);
      indices.push(i2, i6, i4);

      indices.push(i1, i5, i3);
      indices.push(i3, i5, i7);
    }

    vertexIndex++;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  return geometry;
};

export const buildRectGeometry = (shape: RectShape): THREE.BufferGeometry => {
  const { x, y, width, height, height3d } = shape;

  const w = width * SCALE;
  const h = height * SCALE;
  const d = height3d;

  const geometry = new THREE.BoxGeometry(w, d, h);

  const colors: number[] = [];
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const yPos = positions.getY(i);
    const normalizedY = (yPos + d / 2) / d;
    const color = getHeightColor(normalizedY * d, d);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const centerX = (x + width / 2) * SCALE;
  const centerZ = -(y + height / 2) * SCALE;
  geometry.translate(centerX, d / 2, centerZ);

  return geometry;
};

export const buildCircleGeometry = (shape: CircleShape): THREE.BufferGeometry => {
  const { cx, cy, radius } = shape;

  const r = radius * SCALE;
  const depth = DEPRESSION_DEPTH;
  const segments = 32;

  const geometry = new THREE.CylinderGeometry(r, r, depth, segments, 1, true);

  const colors: number[] = [];
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const yPos = positions.getY(i);
    const normalizedY = (yPos + depth / 2) / depth;
    const t = 1 - normalizedY;
    const color = colorLow.clone().lerp(new THREE.Color(0x1e3a5f), t * 0.5);
    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const centerX = cx * SCALE;
  const centerZ = -cy * SCALE;
  geometry.translate(centerX, -depth / 2, centerZ);

  return geometry;
};

export const buildGroundGeometry = (width: number, height: number): THREE.BufferGeometry => {
  const w = width * SCALE;
  const h = height * SCALE;

  const geometry = new THREE.PlaneGeometry(w, h, 50, 50);
  geometry.rotateX(-Math.PI / 2);

  const colors: number[] = [];
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    colors.push(0.15, 0.7, 0.25);
  }

  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.translate(w / 2, 0, -h / 2);

  return geometry;
};

export const geometryToObj = (geometries: { geometry: THREE.BufferGeometry; id: string }[]): string => {
  let obj = '# SketchTerrain Export\n';
  let vertexOffset = 0;

  for (const { geometry, id } of geometries) {
    obj += `\n# Object: ${id}\n`;
    obj += `o ${id}\n`;

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      obj += `v ${x.toFixed(6)} ${y.toFixed(6)} ${z.toFixed(6)}\n`;
    }

    if (geometry.index) {
      const indices = geometry.index;
      for (let i = 0; i < indices.count; i += 3) {
        const a = indices.getX(i) + 1 + vertexOffset;
        const b = indices.getX(i + 1) + 1 + vertexOffset;
        const c = indices.getX(i + 2) + 1 + vertexOffset;
        obj += `f ${a} ${b} ${c}\n`;
      }
    } else {
      for (let i = 0; i < positions.count; i += 3) {
        const a = i + 1 + vertexOffset;
        const b = i + 2 + vertexOffset;
        const c = i + 3 + vertexOffset;
        obj += `f ${a} ${b} ${c}\n`;
      }
    }

    vertexOffset += positions.count;
  }

  return obj;
};

export const getShapeCenter = (shape: LineShape | RectShape | CircleShape): Point => {
  if (shape.type === 'line') {
    const points = shape.points;
    if (points.length === 0) return { x: 0, y: 0 };
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    return { x: sum.x / points.length, y: sum.y / points.length };
  } else if (shape.type === 'rect') {
    return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
  } else {
    return { x: shape.cx, y: shape.cy };
  }
};
