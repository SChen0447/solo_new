import * as THREE from 'three';
import { CREATURES, CreatureConfig, CreatureLayer, CompositePart } from './data/bioData';
import { CreatureRef } from './sceneManager';

const MAX_CREATURES_TOTAL = 20;
const WORLD_SIZE = 80;

interface GeometryCache {
  [key: string]: THREE.BufferGeometry;
}

interface MaterialCache {
  [key: string]: THREE.MeshPhongMaterial;
}

interface InstancedEntry {
  mesh: THREE.InstancedMesh;
  config: CreatureConfig;
  count: number;
}

const geometryCache: GeometryCache = {};
const materialCache: MaterialCache = {};
const instancedGroups: Map<string, InstancedEntry> = new Map();

let totalCreatures = 0;
let idCounter = 0;

function createGeometry(shape: string, params: any = {}): THREE.BufferGeometry {
  const cacheKey = `${shape}_${JSON.stringify(params)}`;
  if (geometryCache[cacheKey]) return geometryCache[cacheKey];

  let geometry: THREE.BufferGeometry;
  const { size = 1, segments = 16, radiusTop, radiusBottom, radius, tube, radialSegments, tubularSegments } = params;

  switch (shape) {
    case 'sphere':
      geometry = new THREE.SphereGeometry(size, segments, segments);
      break;
    case 'cone':
      geometry = new THREE.ConeGeometry(size, size * 1.5, segments);
      break;
    case 'cylinder':
      geometry = new THREE.CylinderGeometry(radiusTop ?? size, radiusBottom ?? size, size * 2, segments);
      break;
    case 'torus':
      geometry = new THREE.TorusGeometry(radius ?? size, tube ?? size * 0.2, radialSegments ?? 8, tubularSegments ?? 24);
      break;
    default:
      geometry = new THREE.SphereGeometry(size, segments, segments);
  }

  geometryCache[cacheKey] = geometry;
  return geometry;
}

function createMaterial(color: string, transparent = false, opacity = 1): THREE.MeshPhongMaterial {
  const cacheKey = `${color}_${transparent}_${opacity}`;
  if (materialCache[cacheKey]) return materialCache[cacheKey];

  const threeColor = new THREE.Color(color);
  const material = new THREE.MeshPhongMaterial({
    color: threeColor,
    transparent,
    opacity,
    shininess: transparent ? 30 : 60,
    specular: transparent ? 0x222222 : 0x444444,
    side: THREE.DoubleSide
  });

  materialCache[cacheKey] = material;
  return material;
}

function createCreatureMesh(config: CreatureConfig): THREE.Group {
  const group = new THREE.Group();

  if (config.geometryType === 'composite' && config.params.composite) {
    config.params.composite.forEach((part: CompositePart) => {
      const geometry = createGeometry(part.shape, {
        size: (config.params.size || 1) * 0.8,
        segments: 12
      });

      const color = part.color || config.color;
      const isTransparent = config.id === 'jellyfish' || color.startsWith('rgba');
      const material = createMaterial(color, isTransparent, isTransparent ? 0.75 : 1);

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(part.pos[0], part.pos[1], part.pos[2]);

      if (part.scale) {
        mesh.scale.set(part.scale[0], part.scale[1], part.scale[2]);
      }

      if (part.rotation) {
        mesh.rotation.set(part.rotation[0], part.rotation[1], part.rotation[2]);
      }

      mesh.castShadow = false;
      mesh.receiveShadow = false;
      group.add(mesh);
    });
  } else {
    const geometry = createGeometry(config.geometryType, {
      size: config.params.size || 1,
      segments: 16
    });
    const material = createMaterial(config.color);
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  }

  group.userData.creatureId = config.id;
  group.userData.creatureConfig = config;
  group.userData.isCreature = true;

  return group;
}

function createOrGetInstancedMesh(config: CreatureConfig, maxCount: number): InstancedEntry {
  let entry = instancedGroups.get(config.id);
  if (entry) return entry;

  const dummyGroup = createCreatureMesh(config);
  const mergedGeometry = mergeGroupGeometries(dummyGroup);
  const materials = getGroupMaterials(dummyGroup);

  const instancedMesh = new THREE.InstancedMesh(
    mergedGeometry,
    materials.length === 1 ? materials[0] : materials,
    maxCount
  );

  instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instancedMesh.userData.creatureId = config.id;
  instancedMesh.userData.isCreature = true;
  instancedMesh.userData.creatureConfig = config;

  entry = {
    mesh: instancedMesh,
    config,
    count: 0
  };

  instancedGroups.set(config.id, entry);
  return entry;
}

function mergeGroupGeometries(group: THREE.Group): THREE.BufferGeometry {
  const geometries: THREE.BufferGeometry[] = [];

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.updateMatrix();
      const clonedGeom = child.geometry.clone();
      clonedGeom.applyMatrix4(child.matrix);
      geometries.push(clonedGeom);
    }
  });

  if (geometries.length === 1) return geometries[0];

  const merged = mergeBufferGeometries(geometries);
  geometries.forEach(g => g.dispose());
  return merged;
}

function mergeBufferGeometries(geometries: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const attributes: { [key: string]: any[] } = {};
  let vertexCount = 0;

  geometries.forEach(geom => {
    vertexCount += geom.attributes.position.count;

    for (const name in geom.attributes) {
      if (!attributes[name]) attributes[name] = [];
      attributes[name].push(geom.attributes[name].array);
    }
  });

  const result = new THREE.BufferGeometry();

  for (const name in attributes) {
    const Type = attributes[name][0].constructor;
    const itemSize = geometries[0].attributes[name].itemSize;
    const merged = new Type(vertexCount * itemSize);

    let offset = 0;
    attributes[name].forEach((arr: any) => {
      merged.set(arr, offset);
      offset += arr.length;
    });

    result.setAttribute(name, new THREE.BufferAttribute(merged, itemSize));
  }

  const indices: number[] = [];
  let indexOffset = 0;

  geometries.forEach(geom => {
    if (geom.index) {
      for (let i = 0; i < geom.index.count; i++) {
        indices.push(geom.index.getX(i) + indexOffset);
      }
    } else {
      const count = geom.attributes.position.count;
      for (let i = 0; i < count; i++) {
        indices.push(i + indexOffset);
      }
    }
    indexOffset += geom.attributes.position.count;
  });

  result.setIndex(indices);
  return result;
}

function getGroupMaterials(group: THREE.Group): THREE.MeshPhongMaterial[] {
  const materials: THREE.MeshPhongMaterial[] = [];
  group.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      if (Array.isArray(child.material)) {
        materials.push(...child.material as THREE.MeshPhongMaterial[]);
      } else {
        materials.push(child.material as THREE.MeshPhongMaterial);
      }
    }
  });
  return materials;
}

function randomPositionInLayer(layer: CreatureLayer, depthRange: [number, number]): THREE.Vector3 {
  const minDepth = Math.max(0, depthRange[0]);
  const maxDepth = Math.min(500, depthRange[1]);

  const depth = minDepth + Math.random() * (maxDepth - minDepth);
  const x = (Math.random() - 0.5) * WORLD_SIZE * 1.5;
  const z = (Math.random() - 0.5) * WORLD_SIZE * 1.5;

  return new THREE.Vector3(x, -depth, z);
}

function randomVelocity(): THREE.Vector3 {
  const speed = 0.5 + Math.random() * 2;
  const angle = Math.random() * Math.PI * 2;
  const vAngle = (Math.random() - 0.5) * 0.5;
  return new THREE.Vector3(
    Math.sin(angle) * Math.cos(vAngle) * speed,
    Math.sin(vAngle) * speed * 0.3,
    Math.cos(angle) * Math.cos(vAngle) * speed
  );
}

export function createCreature(config: CreatureConfig): CreatureRef | null {
  if (totalCreatures >= MAX_CREATURES_TOTAL) {
    console.warn(`已达到最大生物数量限制 (${MAX_CREATURES_TOTAL})，无法创建更多`);
    return null;
  }

  const position = randomPositionInLayer(config.layer, config.depthRange);
  const velocity = randomVelocity();
  const mesh = createCreatureMesh(config);
  mesh.position.copy(position);

  const instanceId = `${config.id}_${idCounter++}`;
  totalCreatures++;

  return {
    id: instanceId,
    name: config.name,
    depthRange: config.depthRange,
    intro: config.intro,
    layer: config.layer,
    mesh,
    position: position.clone(),
    velocity,
    baseY: position.y
  };
}

export function createInstancedCreature(config: CreatureConfig): CreatureRef | null {
  if (totalCreatures >= MAX_CREATURES_TOTAL) {
    console.warn(`已达到最大生物数量限制 (${MAX_CREATURES_TOTAL})，无法创建更多`);
    return null;
  }

  const entry = createOrGetInstancedMesh(config, MAX_CREATURES_TOTAL);
  const instanceIndex = entry.count;

  const position = randomPositionInLayer(config.layer, config.depthRange);
  const velocity = randomVelocity();
  const mesh = createCreatureMesh(config);
  mesh.position.copy(position);
  mesh.rotation.y = Math.random() * Math.PI * 2;
  mesh.updateMatrix();

  entry.mesh.setMatrixAt(instanceIndex, mesh.matrix);
  entry.mesh.instanceMatrix.needsUpdate = true;
  entry.count++;

  const instanceId = `${config.id}_${idCounter++}`;
  totalCreatures++;

  return {
    id: instanceId,
    name: config.name,
    depthRange: config.depthRange,
    intro: config.intro,
    layer: config.layer,
    mesh,
    instancedMesh: entry.mesh,
    instanceIndex,
    position: position.clone(),
    velocity,
    baseY: position.y
  };
}

export interface SpawnResult {
  creatures: CreatureRef[];
  interactables: THREE.Object3D[];
}

export function spawnAllCreatures(): SpawnResult {
  const creatures: CreatureRef[] = [];
  const interactables: THREE.Object3D[] = [];
  instancedGroups.clear();
  totalCreatures = 0;
  idCounter = 0;

  let allocated = 0;
  const allocations: { config: CreatureConfig; count: number }[] = [];

  CREATURES.forEach(config => {
    const count = Math.min(config.instanceCount, MAX_CREATURES_TOTAL - allocated);
    if (count > 0) {
      allocations.push({ config, count });
      allocated += count;
    }
  });

  allocations.forEach(({ config, count }) => {
    for (let i = 0; i < count; i++) {
      const creature = createInstancedCreature(config);
      if (creature) {
        creatures.push(creature);
      }
    }
  });

  instancedGroups.forEach(entry => {
    interactables.push(entry.mesh);
  });

  console.log(`生成了 ${creatures.length} 只生物，使用了 ${instancedGroups.size} 个 InstancedMesh`);
  return { creatures, interactables };
}

export function getCreatureConfigByInstancedMesh(mesh: THREE.Object3D): CreatureConfig | null {
  for (const entry of instancedGroups.values()) {
    if (entry.mesh === mesh) {
      return entry.config;
    }
  }
  if (mesh.userData && mesh.userData.creatureConfig) {
    return mesh.userData.creatureConfig;
  }
  return null;
}

export function getCreatureByInstancedIndex(
  instancedMesh: THREE.InstancedMesh,
  instanceId: number
): CreatureRef | null {
  const sceneManagerModule = require('./sceneManager');
  const creatures: CreatureRef[] = sceneManagerModule.getCreatures?.() || [];

  return creatures.find(c =>
    c.instancedMesh === instancedMesh &&
    c.instanceIndex === instanceId
  ) || null;
}

export { MAX_CREATURES_TOTAL };
