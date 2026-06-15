import * as THREE from 'three';

export interface PointData {
  x: number;
  y: number;
  z: number;
  temperature: number;
  targetTemperature: number;
  transitionProgress: number;
}

export const POINT_COUNT = 8000;
export const TEMP_MIN = -20;
export const TEMP_MAX = 45;
export const COORD_RANGE = 50;

export function temperatureToColor(t: number): THREE.Color {
  const norm = (t - TEMP_MIN) / (TEMP_MAX - TEMP_MIN);
  const clamped = Math.max(0, Math.min(1, norm));
  if (clamped < 0.25) {
    const f = clamped / 0.25;
    return new THREE.Color(0, f, 1);
  } else if (clamped < 0.5) {
    const f = (clamped - 0.25) / 0.25;
    return new THREE.Color(0, 1, 1 - f);
  } else if (clamped < 0.75) {
    const f = (clamped - 0.5) / 0.25;
    return new THREE.Color(f, 1, 0);
  } else {
    const f = (clamped - 0.75) / 0.25;
    return new THREE.Color(1, 1 - f, 0);
  }
}

export function generatePoint(): PointData {
  return {
    x: (Math.random() - 0.5) * 2 * COORD_RANGE,
    y: (Math.random() - 0.5) * 2 * COORD_RANGE,
    z: (Math.random() - 0.5) * 2 * COORD_RANGE,
    temperature: TEMP_MIN + Math.random() * (TEMP_MAX - TEMP_MIN),
    targetTemperature: TEMP_MIN + Math.random() * (TEMP_MAX - TEMP_MIN),
    transitionProgress: 1,
  };
}

export class PointCloudManager {
  points: PointData[] = [];
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  mesh: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private refreshTimer: number = 0;
  private refreshInterval: number = 0.5;
  pointSize: number = 3;
  tempFilterMin: number = TEMP_MIN;
  tempFilterMax: number = TEMP_MAX;

  constructor(scene: THREE.Scene) {
    for (let i = 0; i < POINT_COUNT; i++) {
      this.points.push(generatePoint());
    }

    this.positions = new Float32Array(POINT_COUNT * 3);
    this.colors = new Float32Array(POINT_COUNT * 3);
    this.sizes = new Float32Array(POINT_COUNT);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const vertexShader = `
      attribute float size;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const fragmentShader = `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - vec2(0.5));
        if (d > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.3, 0.5, d);
        gl_FragColor = vec4(vColor, alpha);
      }
    `;

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.updateBuffers();
  }

  private updateBuffers() {
    for (let i = 0; i < POINT_COUNT; i++) {
      const p = this.points[i];
      this.positions[i * 3] = p.x;
      this.positions[i * 3 + 1] = p.y;
      this.positions[i * 3 + 2] = p.z;

      const currentTemp = p.transitionProgress < 1
        ? p.temperature + (p.targetTemperature - p.temperature) * p.transitionProgress
        : p.temperature;
      const c = temperatureToColor(currentTemp);
      this.colors[i * 3] = c.r;
      this.colors[i * 3 + 1] = c.g;
      this.colors[i * 3 + 2] = c.b;

      const inRange = currentTemp >= this.tempFilterMin && currentTemp <= this.tempFilterMax;
      this.sizes[i] = inRange ? this.pointSize : this.pointSize * 0.3;
      if (!inRange) {
        this.colors[i * 3] *= 0.3;
        this.colors[i * 3 + 1] *= 0.3;
        this.colors[i * 3 + 2] *= 0.3;
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  update(dt: number) {
    this.refreshTimer += dt;
    if (this.refreshTimer >= this.refreshInterval) {
      this.refreshTimer = 0;
      const refreshCount = Math.floor(POINT_COUNT * 0.05);
      for (let i = 0; i < refreshCount; i++) {
        const idx = Math.floor(Math.random() * POINT_COUNT);
        this.points[idx].temperature = this.points[idx].transitionProgress < 1
          ? this.points[idx].temperature + (this.points[idx].targetTemperature - this.points[idx].temperature) * this.points[idx].transitionProgress
          : this.points[idx].temperature;
        this.points[idx].targetTemperature = TEMP_MIN + Math.random() * (TEMP_MAX - TEMP_MIN);
        this.points[idx].transitionProgress = 0;
      }
    }

    for (let i = 0; i < POINT_COUNT; i++) {
      if (this.points[i].transitionProgress < 1) {
        this.points[i].transitionProgress += dt / 0.5;
        if (this.points[i].transitionProgress > 1) this.points[i].transitionProgress = 1;
      }
    }

    this.updateBuffers();
  }

  setTempFilter(min: number, max: number) {
    this.tempFilterMin = min;
    this.tempFilterMax = max;
  }

  setPointSize(size: number) {
    this.pointSize = size;
  }

  getPointAt(index: number): PointData {
    return this.points[index];
  }

  findNearestPoint(worldPos: THREE.Vector3, maxDist: number = 5): number {
    let bestIdx = -1;
    let bestDist = maxDist * maxDist;
    const step = Math.max(1, Math.floor(POINT_COUNT / 500));
    for (let i = 0; i < POINT_COUNT; i += step) {
      const p = this.points[i];
      const dx = p.x - worldPos.x;
      const dy = p.y - worldPos.y;
      const dz = p.z - worldPos.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bestDist) {
        bestDist = d2;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const searchRadius = step * 2;
      const start = Math.max(0, bestIdx - searchRadius);
      const end = Math.min(POINT_COUNT, bestIdx + searchRadius);
      for (let i = start; i < end; i++) {
        const p = this.points[i];
        const dx = p.x - worldPos.x;
        const dy = p.y - worldPos.y;
        const dz = p.z - worldPos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < bestDist) {
          bestDist = d2;
          bestIdx = i;
        }
      }
    }
    return bestIdx;
  }
}
