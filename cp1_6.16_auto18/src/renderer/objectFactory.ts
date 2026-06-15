import * as THREE from 'three';
import {
  FlowNode,
  FlowConnection,
  DataPacket,
  NODE_RADIUS,
  CONNECTION_TUBE_RADIUS,
  PACKET_RADIUS,
} from '../models/types';

const nodeGeometry = new THREE.SphereGeometry(NODE_RADIUS, 32, 32);
const packetGeometry = new THREE.SphereGeometry(PACKET_RADIUS, 16, 16);

export function createNodeMesh(node: FlowNode): THREE.Mesh {
  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(node.color),
    emissive: new THREE.Color(node.color).multiplyScalar(0.15),
    shininess: 80,
    transparent: true,
    opacity: 1,
  });
  const mesh = new THREE.Mesh(nodeGeometry, material);
  mesh.position.copy(node.position);
  mesh.userData = { nodeId: node.id };
  return mesh;
}

export function createNodeGlow(node: FlowNode): THREE.Mesh {
  const glowGeo = new THREE.SphereGeometry(NODE_RADIUS * 1.25, 32, 32);
  const glowMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(node.color),
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
  });
  const mesh = new THREE.Mesh(glowGeo, glowMat);
  mesh.position.copy(node.position);
  return mesh;
}

export function createNodeLabel(node: FlowNode): THREE.Mesh {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 240, 48, 12);
  ctx.fill();
  ctx.fillStyle = '#e0e0e0';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(node.name, 128, 32);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const labelGeo = new THREE.PlaneGeometry(1.2, 0.3);
  const labelMat = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const label = new THREE.Mesh(labelGeo, labelMat);
  label.position.set(node.position.x, node.position.y - NODE_RADIUS - 0.35, node.position.z);
  return label;
}

export function updateNodeLabel(label: THREE.Mesh, node: FlowNode): void {
  label.position.set(node.position.x, node.position.y - NODE_RADIUS - 0.35, node.position.z);
}

export function createConnectionMesh(
  source: FlowNode,
  target: FlowNode
): { group: THREE.Group; lineMesh: THREE.Mesh; particleGroup: THREE.Group } {
  const group = new THREE.Group();
  const path = new THREE.LineCurve3(source.position.clone(), target.position.clone());
  const tubeGeo = new THREE.TubeGeometry(path, 20, CONNECTION_TUBE_RADIUS, 8, false);
  const tubeMat = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.35,
    emissive: 0x111111,
  });
  const lineMesh = new THREE.Mesh(tubeGeo, tubeMat);
  group.add(lineMesh);
  const particleGroup = new THREE.Group();
  group.add(particleGroup);
  return { group, lineMesh, particleGroup };
}

export function updateConnectionMesh(
  conn: FlowConnection,
  source: FlowNode,
  target: FlowNode
): void {
  if (!conn.mesh) return;
  const path = new THREE.LineCurve3(source.position.clone(), target.position.clone());
  const tubeGeo = new THREE.TubeGeometry(path, 20, CONNECTION_TUBE_RADIUS, 8, false);
  if (conn.lineMesh) {
    conn.lineMesh.geometry.dispose();
    conn.lineMesh.geometry = tubeGeo;
  }
}

export function createPacketMesh(): THREE.Mesh {
  const material = new THREE.MeshPhongMaterial({
    color: 0xff6f00,
    emissive: 0xff6f00,
    emissiveIntensity: 0.5,
    shininess: 100,
  });
  const mesh = new THREE.Mesh(packetGeometry, material);
  return mesh;
}

export function createFlowParticle(): THREE.Mesh {
  const geo = new THREE.SphereGeometry(0.06, 8, 8);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x42a5f5,
    transparent: true,
    opacity: 0.8,
  });
  return new THREE.Mesh(geo, mat);
}

export function createGridHelper(): THREE.Group {
  const group = new THREE.Group();
  const gridMat = new THREE.LineBasicMaterial({
    color: 0x37474f,
    transparent: true,
    opacity: 0.25,
  });
  const size = 20;
  const step = 2;
  for (let axis = 0; axis < 3; axis++) {
    const points: THREE.Vector3[] = [];
    for (let i = -size; i <= size; i += step) {
      if (axis === 0) {
        points.push(new THREE.Vector3(i, 0, -size), new THREE.Vector3(i, 0, size));
        points.push(new THREE.Vector3(-size, 0, i), new THREE.Vector3(size, 0, i));
      } else if (axis === 1) {
        points.push(new THREE.Vector3(i, -size, 0), new THREE.Vector3(i, size, 0));
        points.push(new THREE.Vector3(-size, i, 0), new THREE.Vector3(size, i, 0));
      } else {
        points.push(new THREE.Vector3(0, i, -size), new THREE.Vector3(0, i, size));
        points.push(new THREE.Vector3(0, -size, i), new THREE.Vector3(0, size, i));
      }
    }
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineSegments(geo, gridMat);
    group.add(line);
  }
  return group;
}
