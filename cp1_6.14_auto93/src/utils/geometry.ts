import * as THREE from 'three';
import { Specimen } from '@/types';

export function createCrystalGeometry(specimen: Specimen): THREE.BufferGeometry {
  const system = specimen.crystalSystem;
  const color = specimen.color;

  let geometry: THREE.BufferGeometry;

  switch (system) {
    case '等轴晶系':
      geometry = new THREE.IcosahedronGeometry(1, 1);
      break;
    case '三方晶系':
      geometry = new THREE.OctahedronGeometry(1, 0);
      break;
    case '四方晶系':
      geometry = new THREE.BoxGeometry(0.8, 1.2, 0.8);
      break;
    case '六方晶系':
      geometry = new THREE.CylinderGeometry(0.6, 0.6, 1.4, 6);
      break;
    case '斜方晶系':
      geometry = new THREE.BoxGeometry(0.6, 1, 1.4);
      break;
    case '单斜晶系':
      geometry = new THREE.BoxGeometry(0.5, 0.8, 1.2);
      break;
    case '三斜晶系':
      geometry = new THREE.TetrahedronGeometry(1, 0);
      break;
    default:
      geometry = new THREE.DodecahedronGeometry(1, 0);
  }

  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);
  const baseColor = new THREE.Color(color);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);

    const noise = Math.sin(x * 2 + y * 3) * 0.1 + Math.cos(z * 2) * 0.05;
    const r = THREE.MathUtils.clamp(baseColor.r + noise, 0, 1);
    const g = THREE.MathUtils.clamp(baseColor.g + noise * 0.5, 0, 1);
    const b = THREE.MathUtils.clamp(baseColor.b + noise * 0.3, 0, 1);

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  return geometry;
}

export function createNodeGeometry(): THREE.BufferGeometry {
  return new THREE.IcosahedronGeometry(1, 1);
}

export function createStarfield(count: number, radius: number): THREE.Points {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * radius;

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const brightness = 0.6 + Math.random() * 0.4;
    colors[i * 3] = brightness;
    colors[i * 3 + 1] = brightness;
    colors[i * 3 + 2] = brightness;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
  });

  return new THREE.Points(geometry, material);
}

export function createOriginSphere(radius: number, color: string): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);

  const wireGeometry = new THREE.SphereGeometry(radius * 1.02, 16, 16);
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: color,
    transparent: true,
    opacity: 0.3,
    wireframe: true,
  });

  const wireframe = new THREE.Mesh(wireGeometry, wireMaterial);
  mesh.add(wireframe);

  return mesh;
}
