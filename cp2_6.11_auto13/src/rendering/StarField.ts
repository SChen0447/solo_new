import * as THREE from 'three';
import { INITIAL_STAR_COUNT, MAX_STAR_COUNT } from '../utils/constants';

const vertexShader = `
  attribute float size;
  attribute vec3 customColor;
  varying vec3 vColor;
  varying float vSize;

  void main() {
    vColor = customColor;
    vSize = size;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vSize;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center) * 2.0;
    
    float alpha = 1.0 - smoothstep(0.0, 1.0, dist);
    alpha = pow(alpha, 1.5);
    
    float glow = 1.0 - smoothstep(0.3, 1.0, dist);
    glow = pow(glow, 2.0) * 0.6;
    
    vec3 finalColor = vColor * (1.0 + glow);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export class StarField {
  private scene: THREE.Scene;
  private stars: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private maxCount: number;
  private currentCount: number;
  private targetPositions: Float32Array | null = null;
  private targetColors: Float32Array | null = null;
  private targetSizes: Float32Array | null = null;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private time: number = 0;

  constructor(scene: THREE.Scene, maxCount: number = MAX_STAR_COUNT) {
    this.scene = scene;
    this.maxCount = maxCount;
    this.currentCount = INITIAL_STAR_COUNT;

    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(maxCount * 3);
    this.colors = new Float32Array(maxCount * 3);
    this.sizes = new Float32Array(maxCount);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('customColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {}
    });

    this.stars = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.stars);

    this.updateDrawRange();
  }

  private updateDrawRange() {
    this.geometry.setDrawRange(0, this.currentCount);
  }

  updateData(positions: Float32Array, colors: Float32Array, sizes: Float32Array, count: number) {
    this.targetPositions = positions;
    this.targetColors = colors;
    this.targetSizes = sizes;
    this.currentCount = count;
    this.updateDrawRange();
  }

  animate(delta: number) {
    this.time += delta;

    if (this.targetPositions && this.targetColors && this.targetSizes) {
      const posAttr = this.geometry.attributes.position as THREE.BufferAttribute;
      const colAttr = this.geometry.attributes.customColor as THREE.BufferAttribute;
      const sizeAttr = this.geometry.attributes.size as THREE.BufferAttribute;

      const lerpFactor = Math.min(1, delta * 8);

      for (let i = 0; i < this.currentCount; i++) {
        const i3 = i * 3;
        this.positions[i3] += (this.targetPositions[i3] - this.positions[i3]) * lerpFactor;
        this.positions[i3 + 1] += (this.targetPositions[i3 + 1] - this.positions[i3 + 1]) * lerpFactor;
        this.positions[i3 + 2] += (this.targetPositions[i3 + 2] - this.positions[i3 + 2]) * lerpFactor;

        this.colors[i3] += (this.targetColors[i3] - this.colors[i3]) * lerpFactor;
        this.colors[i3 + 1] += (this.targetColors[i3 + 1] - this.colors[i3 + 1]) * lerpFactor;
        this.colors[i3 + 2] += (this.targetColors[i3 + 2] - this.colors[i3 + 2]) * lerpFactor;

        this.sizes[i] += (this.targetSizes[i] - this.sizes[i]) * lerpFactor;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
    }

    const twinkle = Math.sin(this.time * 2) * 0.1 + 0.9;
    this.material.opacity = twinkle;
  }

  setCount(count: number) {
    this.currentCount = Math.min(count, this.maxCount);
    this.updateDrawRange();
  }

  dispose() {
    this.scene.remove(this.stars);
    this.geometry.dispose();
    this.material.dispose();
  }

  getStarsObject(): THREE.Points {
    return this.stars;
  }
}
