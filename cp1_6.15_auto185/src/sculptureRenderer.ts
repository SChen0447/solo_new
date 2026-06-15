import * as THREE from 'three';

export type DisplayMode = 'default' | 'low' | 'high';

interface SculptureElement {
  mesh: THREE.Mesh;
  baseAngle: number;
  baseRadius: number;
  baseRotationSpeed: number;
  bandStart: number;
  bandEnd: number;
  baseSize: number;
  freqIndex: number;
}

export class SculptureRenderer {
  private scene: THREE.Scene;
  private elements: SculptureElement[] = [];
  private group: THREE.Group;
  private displayMode: DisplayMode = 'default';
  private baseOrbitSpeed = 0.3;
  private currentOrbitSpeed = 0.3;
  private readonly NUM_ELEMENTS = 12;
  private readonly BANDS_PER_ELEMENT = 10;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.createElements();
  }

  private createElements(): void {
    const geometryTypes: (() => THREE.BufferGeometry)[] = [
      () => new THREE.IcosahedronGeometry(1, 0),
      () => new THREE.TorusKnotGeometry(0.7, 0.25, 64, 16),
      () => new THREE.OctahedronGeometry(1, 0),
      () => new THREE.DodecahedronGeometry(1, 0),
      () => new THREE.TorusGeometry(0.7, 0.25, 16, 48),
      () => new THREE.SphereGeometry(1, 24, 16),
      () => new THREE.IcosahedronGeometry(1, 1),
      () => new THREE.ConeGeometry(0.8, 1.4, 6),
      () => new THREE.TetrahedronGeometry(1, 0),
      () => new THREE.TorusGeometry(0.6, 0.3, 12, 36),
      () => new THREE.OctahedronGeometry(1, 1),
      () => new THREE.SphereGeometry(1, 16, 12),
    ];

    for (let i = 0; i < this.NUM_ELEMENTS; i++) {
      const freqIndex = i / (this.NUM_ELEMENTS - 1);
      const baseRadius = THREE.MathUtils.lerp(3, 12, freqIndex);
      const angle = (i / this.NUM_ELEMENTS) * Math.PI * 2;
      const rotationSpeed = THREE.MathUtils.lerp(0.2, 2.0, freqIndex);
      const bandStart = i * this.BANDS_PER_ELEMENT;
      const bandEnd = Math.min(bandStart + this.BANDS_PER_ELEMENT, 128);

      const geometry = geometryTypes[i % geometryTypes.length]();
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0.3,
        roughness: 0.5,
        transparent: true,
        opacity: 1.0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        baseRadius * Math.cos(angle),
        0,
        baseRadius * Math.sin(angle)
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      this.group.add(mesh);

      this.elements.push({
        mesh,
        baseAngle: angle,
        baseRadius,
        baseRotationSpeed: rotationSpeed,
        bandStart,
        bandEnd,
        baseSize: 1.0,
        freqIndex,
      });
    }
  }

  setDisplayMode(mode: DisplayMode): void {
    this.displayMode = mode;
    this.applyDisplayMode();
  }

  private applyDisplayMode(): void {
    this.elements.forEach((el, i) => {
      const mat = el.mesh.material as THREE.MeshStandardMaterial;
      if (this.displayMode === 'default') {
        mat.opacity = 1.0;
        mat.transparent = false;
      } else if (this.displayMode === 'low') {
        if (i < 4) {
          mat.opacity = 1.0;
          mat.transparent = false;
        } else {
          mat.opacity = 0.2;
          mat.transparent = true;
        }
      } else if (this.displayMode === 'high') {
        if (i >= this.NUM_ELEMENTS - 4) {
          mat.opacity = 1.0;
          mat.transparent = false;
        } else {
          mat.opacity = 0.2;
          mat.transparent = true;
        }
      }
    });
  }

  update(frequencyData: Float32Array, deltaTime: number): void {
    let avgHighFreq = 0;
    let highBandCount = 0;

    this.elements.forEach((el, i) => {
      let sum = 0;
      let count = 0;
      for (let j = el.bandStart; j < el.bandEnd; j++) {
        if (j < frequencyData.length) {
          const dbValue = frequencyData[j];
          const normalized = Math.max(0, (dbValue + 100) / 100);
          sum += normalized;
          count++;
        }
      }
      const amplitude = count > 0 ? sum / count : 0;
      const smoothAmplitude = THREE.MathUtils.smoothstep(amplitude, 0, 1);

      if (i >= this.NUM_ELEMENTS / 2) {
        avgHighFreq += smoothAmplitude;
        highBandCount++;
      }

      const sizeScale = THREE.MathUtils.lerp(0.5, 2.5, smoothAmplitude);
      el.mesh.scale.setScalar(el.baseSize * sizeScale);

      const pushOut = smoothAmplitude * 2;
      const radius = el.baseRadius + pushOut;
      el.mesh.position.x = radius * Math.cos(el.baseAngle);
      el.mesh.position.z = radius * Math.sin(el.baseAngle);

      el.mesh.position.y = smoothAmplitude * 1.5;

      const lowColor = new THREE.Color('#ff6b6b');
      const highColor = new THREE.Color('#48dbfb');
      const baseColor = lowColor.clone().lerp(highColor, el.freqIndex);

      const saturation = THREE.MathUtils.lerp(0.3, 1.0, smoothAmplitude);
      const hsl = { h: 0, s: 0, l: 0 };
      baseColor.getHSL(hsl);
      hsl.s = saturation;
      hsl.l = THREE.MathUtils.lerp(0.3, 0.6, smoothAmplitude);
      const finalColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);

      const mat = el.mesh.material as THREE.MeshStandardMaterial;
      mat.color.copy(finalColor);
      mat.emissive.copy(finalColor);
      mat.emissiveIntensity = smoothAmplitude * 0.5;

      const rotSpeed = el.baseRotationSpeed * (0.5 + smoothAmplitude);
      el.mesh.rotation.x += rotSpeed * deltaTime;
      el.mesh.rotation.y += rotSpeed * 0.7 * deltaTime;
      el.mesh.rotation.z += rotSpeed * 0.5 * deltaTime;

      if (this.displayMode !== 'default') {
        const isLowFocus = this.displayMode === 'low' && i < 4;
        const isHighFocus = this.displayMode === 'high' && i >= this.NUM_ELEMENTS - 4;
        if (isLowFocus || isHighFocus) {
          mat.opacity = 1.0;
          mat.transparent = false;
        } else {
          mat.opacity = 0.2;
          mat.transparent = true;
        }
      }
    });

    const avgHigh = highBandCount > 0 ? avgHighFreq / highBandCount : 0;
    const targetOrbitSpeed = THREE.MathUtils.lerp(0.3, 0.8, avgHigh);
    this.currentOrbitSpeed = THREE.MathUtils.damp(
      this.currentOrbitSpeed,
      targetOrbitSpeed,
      2,
      deltaTime
    );
    this.group.rotation.y += this.currentOrbitSpeed * deltaTime;
  }

  resize(width: number, height: number): void {
  }

  dispose(): void {
    this.elements.forEach((el) => {
      el.mesh.geometry.dispose();
      (el.mesh.material as THREE.Material).dispose();
    });
    this.scene.remove(this.group);
  }
}
