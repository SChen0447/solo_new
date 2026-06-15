import * as THREE from 'three';
import { ColorTheme, randomColorInTheme } from '../utils/ColorHelper';

export type ShapeType = 'sphere' | 'spiral' | 'torus';

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  opacities: Float32Array;
  angularSpeeds: Float32Array;
  radialPhases: Float32Array;
  radialPeriods: Float32Array;
  lifetimes: Float32Array;
  ages: Float32Array;
  originalPositions: Float32Array;
}

export class ParticleEmitter {
  private maxCount: number;
  private theme: ColorTheme;
  private shape: ShapeType;

  constructor(maxCount: number, theme: ColorTheme, shape: ShapeType = 'sphere') {
    this.maxCount = maxCount;
    this.theme = theme;
    this.shape = shape;
  }

  setTheme(theme: ColorTheme): void {
    this.theme = theme;
  }

  setShape(shape: ShapeType): void {
    this.shape = shape;
  }

  generatePosition(index: number, count: number): [number, number, number] {
    switch (this.shape) {
      case 'sphere':
        return this.generateSpherePosition();
      case 'spiral':
        return this.generateSpiralPosition(index, count);
      case 'torus':
        return this.generateTorusPosition();
      default:
        return this.generateSpherePosition();
    }
  }

  private generateSpherePosition(): [number, number, number] {
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);

    const rMin = 15;
    const rMax = 25;
    const r = rMin + (rMax - rMin) * Math.pow(Math.random(), 0.6);

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);

    return [x, y, z];
  }

  private generateSpiralPosition(index: number, count: number): [number, number, number] {
    const t = index / count;
    const arms = 3;
    const armIndex = Math.floor(Math.random() * arms);
    const angleOffset = (2 * Math.PI / arms) * armIndex;

    const r = 5 + t * 20;
    const angle = t * Math.PI * 6 + angleOffset;
    const spread = 2 + t * 3;

    const x = r * Math.cos(angle) + (Math.random() - 0.5) * spread;
    const y = (Math.random() - 0.5) * spread * 0.5;
    const z = r * Math.sin(angle) + (Math.random() - 0.5) * spread;

    return [x, y, z];
  }

  private generateTorusPosition(): [number, number, number] {
    const R = 18;
    const tubeR = 4 + Math.random() * 4;

    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 2;

    const x = (R + tubeR * Math.cos(phi)) * Math.cos(theta);
    const y = tubeR * Math.sin(phi);
    const z = (R + tubeR * Math.cos(phi)) * Math.sin(theta);

    return [x, y, z];
  }

  generate(count: number): ParticleData {
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const opacities = new Float32Array(count);
    const angularSpeeds = new Float32Array(count);
    const radialPhases = new Float32Array(count);
    const radialPeriods = new Float32Array(count);
    const lifetimes = new Float32Array(count);
    const ages = new Float32Array(count);
    const originalPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const [x, y, z] = this.generatePosition(i, count);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;

      const color = randomColorInTheme(this.theme);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 0.03 + Math.random() * 0.12;
      opacities[i] = 0.3 + Math.random() * 0.6;
      angularSpeeds[i] = 0.001 + Math.random() * 0.004;
      radialPhases[i] = Math.random() * Math.PI * 2;
      radialPeriods[i] = 2 + Math.random() * 2;
      lifetimes[i] = 5 + Math.random() * 5;
      ages[i] = Math.random() * lifetimes[i];
    }

    return {
      positions,
      colors,
      sizes,
      opacities,
      angularSpeeds,
      radialPhases,
      radialPeriods,
      lifetimes,
      ages,
      originalPositions,
    };
  }

  regeneratePositions(
    count: number,
    existingData: ParticleData
  ): Float32Array {
    const newOriginalPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const [x, y, z] = this.generatePosition(i, count);
      newOriginalPositions[i * 3] = x;
      newOriginalPositions[i * 3 + 1] = y;
      newOriginalPositions[i * 3 + 2] = z;
    }

    return newOriginalPositions;
  }

  regenerateColors(count: number): Float32Array {
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const color = randomColorInTheme(this.theme);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return colors;
  }

  createGeometry(data: ParticleData, count: number): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(data.colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    geometry.setAttribute('aOpacity', new THREE.BufferAttribute(data.opacities, 1));

    geometry.setDrawRange(0, count);

    return geometry;
  }

  static createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aOpacity;

        varying vec3 vColor;
        varying float vOpacity;

        uniform float uPixelRatio;

        void main() {
          vColor = aColor;
          vOpacity = aOpacity;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_PointSize = max(gl_PointSize, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;

        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;

          float alpha = smoothstep(0.5, 0.1, dist) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }
}
