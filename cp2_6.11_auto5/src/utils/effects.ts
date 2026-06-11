import * as THREE from 'three';

export const easeInOutQuad = (t: number): number =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

export const easeInOutCubic = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const easeInOutSine = (t: number): number =>
  -(Math.cos(Math.PI * t) - 1) / 2;

export const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const smoothDamp = (
  current: number,
  target: number,
  velocity: { value: number },
  smoothTime: number,
  maxSpeed: number,
  deltaTime: number
): number => {
  const omega = 2 / smoothTime;
  const x = omega * deltaTime;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  let change = current - target;
  const maxChange = maxSpeed * smoothTime;
  change = clamp(change, -maxChange, maxChange);
  const temp = (velocity.value + omega * change) * deltaTime;
  velocity.value = (velocity.value - omega * temp) * exp;
  return target + (change + temp) * exp;
};

interface GrowthAnimData {
  time: number;
  duration: number;
  targetScale: number;
  startScale: number;
}

export class WaterDropSystem {
  private particles: THREE.Points;
  private velocities: Float32Array;
  private lifetimes: Float32Array;
  private count: number;

  constructor(scene: THREE.Scene, count = 150) {
    this.count = count;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this.velocities = new Float32Array(count * 3);
    this.lifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = Math.random() * 10 + 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
      this.velocities[i * 3] = Math.random() * 0.02 - 0.01;
      this.velocities[i * 3 + 1] = -0.08 - Math.random() * 0.04;
      this.velocities[i * 3 + 2] = Math.random() * 0.02 - 0.01;
      this.lifetimes[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x88ccff,
      size: 0.08,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.visible = false;
    scene.add(this.particles);
  }

  setHumidityLevel(humidity: number): void {
    this.particles.visible = humidity > 40;
    const mat = this.particles.material as THREE.PointsMaterial;
    mat.opacity = 0.3 + (humidity - 40) * 0.0075;
  }

  update(delta: number, humidity: number): void {
    if (!this.particles.visible) return;

    const positions = this.particles.geometry.attributes.position
      .array as Float32Array;
    const speedMult = 0.5 + humidity * 0.01;

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3;
      positions[i3] += this.velocities[i3] * speedMult * delta * 60;
      positions[i3 + 1] += this.velocities[i3 + 1] * speedMult * delta * 60;
      positions[i3 + 2] += this.velocities[i3 + 2] * speedMult * delta * 60;

      this.lifetimes[i] -= delta * 0.3;

      if (positions[i3 + 1] < 0 || this.lifetimes[i] <= 0) {
        positions[i3] = (Math.random() - 0.5) * 16;
        positions[i3 + 1] = 8 + Math.random() * 4;
        positions[i3 + 2] = (Math.random() - 0.5) * 16;
        this.lifetimes[i] = 1;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  dispose(): void {
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
  }
}

export class SunBeamSystem {
  private beams: THREE.Mesh[] = [];
  private scene: THREE.Scene;
  private sunDirection: THREE.Vector3 = new THREE.Vector3(1, 1, 0.5);

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createBeams();
  }

  private createBeams(): void {
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.ConeGeometry(
        0.8 + Math.random() * 0.6,
        14,
        6,
        1,
        true
      );
      const material = new THREE.MeshBasicMaterial({
        color: 0xfff4c4,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(geometry, material);
      beam.position.set(
        (Math.random() - 0.5) * 10,
        7,
        (Math.random() - 0.5) * 10
      );
      this.beams.push(beam);
      this.scene.add(beam);
    }
  }

  update(lightIntensity: number, sunDir: THREE.Vector3): void {
    this.sunDirection.copy(sunDir).normalize();

    const intensityFactor = Math.min(lightIntensity / 100, 1);

    for (const beam of this.beams) {
      const mat = beam.material as THREE.MeshBasicMaterial;
      mat.opacity = intensityFactor * 0.08;

      beam.lookAt(
        beam.position.clone().add(this.sunDirection.clone().multiplyScalar(-10))
      );
      beam.scale.setScalar(
        0.8 + Math.sin(Date.now() * 0.001 + beam.position.x) * 0.3 + 0.7
      );
    }
  }

  dispose(): void {
    for (const beam of this.beams) {
      beam.geometry.dispose();
      (beam.material as THREE.Material).dispose();
    }
  }
}

export class GrowthAnimation {
  private startTime: Map<string, GrowthAnimData>;
  private objectRegistry: Map<string, THREE.Object3D>;

  constructor() {
    this.startTime = new Map();
    this.objectRegistry = new Map();
  }

  registerObject(obj: THREE.Object3D): void {
    this.objectRegistry.set(obj.uuid, obj);
  }

  startGrowth(
    object: THREE.Object3D,
    targetScale: number,
    duration = 1.2
  ): void {
    this.objectRegistry.set(object.uuid, object);
    this.startTime.set(object.uuid, {
      time: performance.now(),
      duration,
      targetScale,
      startScale: object.scale.x,
    });
  }

  update(): void {
    const now = performance.now();
    const toDelete: string[] = [];

    for (const [uuid, data] of this.startTime) {
      const elapsed = (now - data.time) / (data.duration * 1000);
      if (elapsed >= 1) {
        const obj = this.objectRegistry.get(uuid);
        if (obj) {
          obj.scale.setScalar(data.targetScale);
        }
        toDelete.push(uuid);
      } else {
        const obj = this.objectRegistry.get(uuid);
        if (obj) {
          const t = easeOutCubic(elapsed);
          const s = lerp(data.startScale, data.targetScale, t);
          obj.scale.setScalar(s);
        }
      }
    }

    for (const uuid of toDelete) {
      this.startTime.delete(uuid);
    }
  }

  clear(): void {
    this.startTime.clear();
    this.objectRegistry.clear();
  }
}

export const createColorFromGrowthIndex = (index: number): THREE.Color => {
  const clampedIndex = clamp(index, 0, 100);

  if (clampedIndex < 50) {
    const t = clampedIndex / 50;
    const r = lerp(1.0, 1.0, t);
    const g = lerp(0.3, 0.75, t);
    const b = lerp(0.3, 0.3, t);
    return new THREE.Color(r, g, b);
  } else {
    const t = (clampedIndex - 50) / 50;
    const r = lerp(1.0, 0.4, t);
    const g = lerp(0.75, 0.9, t);
    const b = lerp(0.3, 0.4, t);
    return new THREE.Color(r, g, b);
  }
};

export const getCSSColorString = (index: number): string => {
  const clampedIndex = clamp(index, 0, 100);
  const color = createColorFromGrowthIndex(clampedIndex);
  const hex = color.getHexString();
  return `#${hex}`;
};

export const leafWobble = (
  mesh: THREE.Mesh,
  time: number,
  intensity = 1,
  offset = 0
): void => {
  const wobbleX = Math.sin(time * 1.5 + offset) * 0.02 * intensity;
  const wobbleZ = Math.cos(time * 1.2 + offset * 1.3) * 0.018 * intensity;
  mesh.rotation.x = wobbleX;
  mesh.rotation.z = wobbleZ;
};

export const hexToRgb = (
  hex: number
): { r: number; g: number; b: number } => {
  return {
    r: (hex >> 16) & 255,
    g: (hex >> 8) & 255,
    b: hex & 255,
  };
};

export const rgbToCss = (
  r: number,
  g: number,
  b: number,
  a = 1
): string => {
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(
    b * 255
  )}, ${a})`;
};
