import * as THREE from 'three';

export type MetricType = 'fps' | 'cpu' | 'memory' | 'network' | 'frameTime' | 'gpu';

export interface MetricConfig {
  name: string;
  unit: string;
  min: number;
  max: number;
  inverse: boolean;
}

export const METRIC_CONFIGS: Record<MetricType, MetricConfig> = {
  fps: { name: 'FPS', unit: 'fps', min: 0, max: 60, inverse: true },
  cpu: { name: 'CPU', unit: '%', min: 0, max: 100, inverse: false },
  memory: { name: '内存', unit: '%', min: 0, max: 100, inverse: false },
  network: { name: '网络延迟', unit: 'ms', min: 0, max: 500, inverse: false },
  frameTime: { name: '帧渲染', unit: 'ms', min: 0, max: 50, inverse: false },
  gpu: { name: 'GPU', unit: '%', min: 0, max: 100, inverse: false }
};

export interface CrystalTower {
  mesh: THREE.Group;
  metric: MetricType;
  update: (value: number, isSnapshot?: boolean) => void;
  particles: THREE.Points;
  getCurrentValue: () => number;
  getCurrentColor: () => THREE.Color;
  getHistory: () => number[];
  getConfig: () => MetricConfig;
}

const COLOR_LOW = new THREE.Color('#80cbc4');
const COLOR_MID = new THREE.Color('#ffb74d');
const COLOR_HIGH = new THREE.Color('#e53935');
const BASE_HEIGHT = 0.5;
const MIN_CONE_HEIGHT = 1;
const MAX_CONE_HEIGHT = 8;
const PARTICLE_COUNT = 65;
const PARTICLE_RADIUS = 0.3;

function interpolateColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(color1, color2, Math.max(0, Math.min(1, t)));
}

function getColorByNormalizedValue(normalized: number): THREE.Color {
  const t = Math.max(0, Math.min(1, normalized));
  if (t < 0.5) {
    return interpolateColor(COLOR_LOW, COLOR_MID, t * 2);
  } else {
    return interpolateColor(COLOR_MID, COLOR_HIGH, (t - 0.5) * 2);
  }
}

function createConeGeometry(height: number, radius: number): THREE.BufferGeometry {
  const radialSegments = 8;
  const geometry = new THREE.BufferGeometry();
  const vertices: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  const apexY = height;
  const baseY = 0;

  vertices.push(0, apexY, 0);
  normals.push(0, 1, 0);

  for (let i = 0; i <= radialSegments; i++) {
    const angle = (i / radialSegments) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    vertices.push(x, baseY, z);
    
    const nx = Math.cos(angle + Math.PI / radialSegments);
    const ny = radius / Math.sqrt(radius * radius + height * height);
    const nz = Math.sin(angle + Math.PI / radialSegments);
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    normals.push(nx / len, ny / len, nz / len);
  }

  for (let i = 1; i <= radialSegments; i++) {
    indices.push(0, i, i + 1);
  }

  for (let i = 1; i <= radialSegments; i++) {
    indices.push(i + 1, i, radialSegments + 2);
  }

  vertices.push(0, baseY, 0);
  normals.push(0, -1, 0);

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);

  return geometry;
}

function createParticles(height: number, color: THREE.Color): THREE.Points {
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const t = i / PARTICLE_COUNT;
    const angle = t * Math.PI * 4;
    const y = t * height;
    const x = Math.cos(angle) * PARTICLE_RADIUS;
    const z = Math.sin(angle) * PARTICLE_RADIUS;

    positions[i * 3] = x;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = z;

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.05,
    transparent: true,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    depthWrite: false
  });

  return new THREE.Points(geometry, material);
}

export function createCrystalTower(metric: MetricType, initialValue: number): CrystalTower {
  const config = METRIC_CONFIGS[metric];
  const group = new THREE.Group();
  const history: number[] = [];
  const HISTORY_SIZE = 60;

  let currentValue = initialValue;
  let currentColor = new THREE.Color(COLOR_LOW);
  let particleRotation = 0;
  let targetHeight = MIN_CONE_HEIGHT;
  let currentHeight = MIN_CONE_HEIGHT;

  const baseGeometry = new THREE.CylinderGeometry(0.5, 0.5, BASE_HEIGHT, 8);
  const baseMaterial = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.7,
    roughness: 0.1,
    metalness: 0.2,
    depthWrite: false,
    color: COLOR_LOW
  });
  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.position.y = BASE_HEIGHT / 2;
  group.add(baseMesh);

  const coneGeometry = createConeGeometry(MIN_CONE_HEIGHT, 0.45);
  const coneMaterial = new THREE.MeshPhysicalMaterial({
    transparent: true,
    opacity: 0.8,
    roughness: 0.1,
    metalness: 0.2,
    depthWrite: false,
    color: COLOR_LOW
  });
  const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
  coneMesh.position.y = BASE_HEIGHT;
  group.add(coneMesh);

  const particles = createParticles(MIN_CONE_HEIGHT, COLOR_LOW);
  particles.position.y = BASE_HEIGHT;
  group.add(particles);

  function normalizeValue(value: number): number {
    let normalized = (value - config.min) / (config.max - config.min);
    if (config.inverse) {
      normalized = 1 - normalized;
    }
    return Math.max(0, Math.min(1, normalized));
  }

  function updateParticlePositions(height: number, rotation: number, color: THREE.Color) {
    const positions = particles.geometry.attributes.position.array as Float32Array;
    const colors = particles.geometry.attributes.color.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT;
      const angle = t * Math.PI * 4 + rotation;
      const y = t * height;
      const x = Math.cos(angle) * PARTICLE_RADIUS;
      const z = Math.sin(angle) * PARTICLE_RADIUS;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.geometry.attributes.color.needsUpdate = true;
  }

  function updateConeGeometry(height: number) {
    coneMesh.geometry.dispose();
    coneMesh.geometry = createConeGeometry(height, 0.45);
  }

  function update(value: number, isSnapshot: boolean = false) {
    currentValue = value;

    if (!isSnapshot) {
      history.push(value);
      if (history.length > HISTORY_SIZE) {
        history.shift();
      }
    }

    const normalized = normalizeValue(value);
    currentColor = getColorByNormalizedValue(normalized);

    targetHeight = MIN_CONE_HEIGHT + normalized * (MAX_CONE_HEIGHT - MIN_CONE_HEIGHT);
    currentHeight += (targetHeight - currentHeight) * 0.15;

    if (Math.abs(currentHeight - targetHeight) > 0.01) {
      updateConeGeometry(currentHeight);
    }

    (baseMesh.material as THREE.MeshPhysicalMaterial).color.copy(currentColor);
    (coneMesh.material as THREE.MeshPhysicalMaterial).color.copy(currentColor);

    const speedFactor = 0.5 + normalized * 2;
    particleRotation += 0.02 * speedFactor;

    updateParticlePositions(currentHeight, particleRotation, currentColor);
  }

  function getCurrentValue(): number {
    return currentValue;
  }

  function getCurrentColor(): THREE.Color {
    return currentColor.clone();
  }

  function getHistory(): number[] {
    return [...history];
  }

  function getConfig(): MetricConfig {
    return { ...config };
  }

  update(initialValue, true);

  return {
    mesh: group,
    metric,
    update,
    particles,
    getCurrentValue,
    getCurrentColor,
    getHistory,
    getConfig
  };
}
