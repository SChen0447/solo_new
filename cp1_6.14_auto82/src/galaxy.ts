import * as THREE from 'three';
import type { GalaxyParams } from './store';

const SPIRAL_ARMS = 4;
const SPIRAL_TWIST = 3.0;
const THICKNESS = 8.0;
const FOCUS_RADIUS = 30.0;
const FOCUS_STRENGTH = 1.5;
const FOCUS_LERP_SPEED = 4.0;

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aFocusFactor;
  varying vec3 vColor;
  varying float vFocus;
  uniform float uPixelRatio;

  void main() {
    vColor = aColor;
    vFocus = aFocusFactor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float s = aSize * uPixelRatio * (1.0 + aFocusFactor * 0.5);
    gl_PointSize = s * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vFocus;

  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    alpha *= 0.8 + vFocus * 0.2;
    vec3 col = vColor * (1.0 + vFocus * 0.3);
    gl_FragColor = vec4(col, alpha);
  }
`;

function hslToRgb(h: number, s: number, l: number): THREE.Color {
  const c = new THREE.Color();
  c.setHSL(h / 360, s, l);
  return c;
}

export class Galaxy {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private material: THREE.ShaderMaterial;
  private positions: Float32Array = new Float32Array(0);
  private colors: Float32Array = new Float32Array(0);
  private sizes: Float32Array = new Float32Array(0);
  private baseSizes: Float32Array = new Float32Array(0);
  private focusFactors: Float32Array = new Float32Array(0);
  private targetFocus: Float32Array = new Float32Array(0);
  private currentParams: GalaxyParams | null = null;
  private rotationAngle = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  createGalaxy(params: GalaxyParams): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points.geometry.dispose();
    }

    this.currentParams = { ...params };
    const count = params.count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.baseSizes = new Float32Array(count);
    this.focusFactors = new Float32Array(count);
    this.targetFocus = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const armIndex = i % SPIRAL_ARMS;
      const armAngle = (armIndex / SPIRAL_ARMS) * Math.PI * 2;

      const radiusRatio = Math.random();
      const r = radiusRatio * params.radius;
      const spiralAngle = armAngle + radiusRatio * SPIRAL_TWIST;

      const spreadX = (Math.random() - 0.5) * 2 * (r * 0.3 + 5);
      const spreadY = (Math.random() - 0.5) * 2 * THICKNESS * (1 - radiusRatio * 0.5);
      const spreadZ = (Math.random() - 0.5) * 2 * (r * 0.3 + 5);

      this.positions[i3] = Math.cos(spiralAngle) * r + spreadX;
      this.positions[i3 + 1] = spreadY;
      this.positions[i3 + 2] = Math.sin(spiralAngle) * r + spreadZ;

      const dist = Math.sqrt(
        this.positions[i3] ** 2 +
        this.positions[i3 + 1] ** 2 +
        this.positions[i3 + 2] ** 2
      );
      const t = Math.min(dist / params.radius, 1.0);

      const hue = params.centerHue + (params.edgeHue - params.centerHue) * t;
      const saturation = 0.7 + 0.3 * (1 - t);
      const lightness = 0.8 - t * 0.4;
      const col = hslToRgb(hue, saturation, lightness);
      this.colors[i3] = col.r;
      this.colors[i3 + 1] = col.g;
      this.colors[i3 + 2] = col.b;

      const size = params.size * (1.0 - t * 0.7) * (0.5 + Math.random() * 0.5);
      this.sizes[i] = size;
      this.baseSizes[i] = size;
      this.focusFactors[i] = 0;
      this.targetFocus[i] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aFocusFactor', new THREE.BufferAttribute(this.focusFactors, 1));

    this.points = new THREE.Points(geometry, this.material);
    this.scene.add(this.points);
  }

  updateParams(params: GalaxyParams): void {
    if (
      !this.currentParams ||
      params.count !== this.currentParams.count ||
      params.radius !== this.currentParams.radius ||
      params.centerHue !== this.currentParams.centerHue ||
      params.edgeHue !== this.currentParams.edgeHue ||
      params.size !== this.currentParams.size
    ) {
      this.createGalaxy(params);
      return;
    }

    this.currentParams = { ...params };
  }

  updateFocus(mouseWorld: THREE.Vector3 | null, dt: number): void {
    if (!this.points) return;
    const count = this.currentParams!.count;
    const posArray = this.positions;
    const focusRadiusSq = FOCUS_RADIUS * FOCUS_RADIUS;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      if (mouseWorld) {
        const dx = posArray[i3] - mouseWorld.x;
        const dy = posArray[i3 + 1] - mouseWorld.y;
        const dz = posArray[i3 + 2] - mouseWorld.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        this.targetFocus[i] = distSq < focusRadiusSq
          ? (1.0 - Math.sqrt(distSq) / FOCUS_RADIUS) * (FOCUS_STRENGTH - 1.0)
          : 0;
      } else {
        this.targetFocus[i] = 0;
      }

      const lerpT = 1.0 - Math.exp(-FOCUS_LERP_SPEED * dt);
      this.focusFactors[i] += (this.targetFocus[i] - this.focusFactors[i]) * lerpT;
      this.sizes[i] = this.baseSizes[i] * (1.0 + this.focusFactors[i]);
    }

    const sizeAttr = this.points.geometry.getAttribute('aSize') as THREE.BufferAttribute;
    const focusAttr = this.points.geometry.getAttribute('aFocusFactor') as THREE.BufferAttribute;
    sizeAttr.needsUpdate = true;
    focusAttr.needsUpdate = true;
  }

  rotate(delta: number, speed: number, paused: boolean): void {
    if (!this.points || paused) return;
    this.rotationAngle += delta * speed * 60;
    this.points.rotation.y = this.rotationAngle;
  }

  getWorldPosition(localPos: THREE.Vector3): THREE.Vector3 {
    if (!this.points) return localPos.clone();
    const v = localPos.clone();
    this.points.localToWorld(v);
    return v;
  }
}
