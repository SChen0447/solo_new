import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { Fault } from './fault';

export type VeinType = 'gold' | 'iron' | 'copper';
export type VeinShape = 'tube' | 'lens';

export interface VeinParams {
  type?: VeinType;
  shape?: VeinShape;
  position?: THREE.Vector3;
  density?: number;
}

const VEIN_COLORS: Record<VeinType, number> = {
  gold: 0xFFD700,
  iron: 0xA1887F,
  copper: 0xFF7043
};

const VEIN_NAMES: Record<VeinType, string> = {
  gold: '金矿',
  iron: '铁矿',
  copper: '铜矿'
};

interface ParticleData {
  originalPosition: THREE.Vector3;
  currentPosition: THREE.Vector3;
  baseColor: THREE.Color;
  isNearFault: boolean;
}

export class Vein {
  public id: string;
  public group: THREE.Group;
  public points: THREE.Points;
  public type: VeinType;
  public shape: VeinShape;
  public position: THREE.Vector3;
  public density: number;
  public volume: number = 0;

  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private particles: ParticleData[] = [];
  private maxParticles: number = 5000;

  constructor(params: VeinParams = {}) {
    this.id = uuidv4();
    this.type = params.type ?? 'gold';
    this.shape = params.shape ?? (Math.random() > 0.5 ? 'tube' : 'lens');
    this.position = params.position ?? new THREE.Vector3(
      (Math.random() - 0.5) * 30,
      -5 - Math.random() * 10,
      (Math.random() - 0.5) * 30
    );
    this.density = params.density ?? 0.5 + Math.random() * 0.5;

    this.group = new THREE.Group();
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.3,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.userData = { type: 'vein', veinId: this.id, isSelectable: true };
    this.group.add(this.points);
    this.group.position.copy(this.position);

    this.generateParticles();
  }

  private generateParticles(): void {
    this.particles = [];
    const positions: number[] = [];
    const colors: number[] = [];
    const baseColor = new THREE.Color(VEIN_COLORS[this.type]);

    const particleCount = Math.floor(2000 + this.density * 2000);
    const actualCount = Math.min(particleCount, this.maxParticles);

    if (this.shape === 'tube') {
      const radius = 2 + Math.random() * 3;
      const length = 10 + Math.random() * 10;
      const angle = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 0.5;

      const dirX = Math.cos(angle) * Math.cos(tilt);
      const dirY = Math.sin(tilt);
      const dirZ = Math.sin(angle) * Math.cos(tilt);
      const direction = new THREE.Vector3(dirX, dirY, dirZ).normalize();

      for (let i = 0; i < actualCount; i++) {
        const t = (i / actualCount - 0.5) * length;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = radius * Math.pow(Math.random(), 1 / 3);

        const offset = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );

        const tangent = direction.clone();
        const up = Math.abs(tangent.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const right = new THREE.Vector3().crossVectors(tangent, up).normalize();
        const trueUp = new THREE.Vector3().crossVectors(right, tangent).normalize();

        const pos = new THREE.Vector3()
          .addScaledVector(tangent, t)
          .addScaledVector(right, offset.x)
          .addScaledVector(trueUp, offset.y)
          .addScaledVector(tangent, offset.z * 0.3);

        this.addParticle(pos, baseColor, positions, colors);
      }

      this.volume = Math.PI * radius * radius * length;
    } else {
      const majorAxis = 8 + Math.random() * 7;
      const minorAxis1 = 3 + Math.random() * 3;
      const minorAxis2 = 3 + Math.random() * 3;
      const angle = Math.random() * Math.PI * 2;
      const tilt = (Math.random() - 0.5) * 0.5;

      const dirX = Math.cos(angle) * Math.cos(tilt);
      const dirY = Math.sin(tilt);
      const dirZ = Math.sin(angle) * Math.cos(tilt);
      const direction = new THREE.Vector3(dirX, dirY, dirZ).normalize();

      const up = Math.abs(direction.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const right = new THREE.Vector3().crossVectors(direction, up).normalize();
      const trueUp = new THREE.Vector3().crossVectors(right, direction).normalize();

      for (let i = 0; i < actualCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.pow(Math.random(), 1 / 3);

        const localPos = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta) * majorAxis,
          r * Math.sin(phi) * Math.sin(theta) * minorAxis1,
          r * Math.cos(phi) * minorAxis2
        );

        const pos = new THREE.Vector3()
          .addScaledVector(direction, localPos.x)
          .addScaledVector(trueUp, localPos.y)
          .addScaledVector(right, localPos.z);

        this.addParticle(pos, baseColor, positions, colors);
      }

      this.volume = (4 / 3) * Math.PI * majorAxis * minorAxis1 * minorAxis2;
    }

    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private addParticle(
    pos: THREE.Vector3,
    baseColor: THREE.Color,
    positions: number[],
    colors: number[]
  ): void {
    this.particles.push({
      originalPosition: pos.clone(),
      currentPosition: pos.clone(),
      baseColor: baseColor.clone(),
      isNearFault: false
    });
    positions.push(pos.x, pos.y, pos.z);
    colors.push(baseColor.r, baseColor.g, baseColor.b);
  }

  public applyFaultOffsets(faults: Fault[], interpolationProgress: number = 1): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const baseColor = new THREE.Color(VEIN_COLORS[this.type]);

    this.particles.forEach((particle, i) => {
      const worldPos = particle.originalPosition.clone().add(this.position);
      let finalOffset = new THREE.Vector3();
      let nearAnyFault = false;

      faults.forEach(fault => {
        const plane = fault.getPlane();
        const distance = plane.distanceToPoint(worldPos);
        const threshold = 1.5;

        if (Math.abs(distance) < threshold) {
          nearAnyFault = true;
          const throwDir = fault.getThrowDirection();
          const offsetAmount = (fault.throw / 2) * Math.sign(distance);
          finalOffset.add(throwDir.clone().multiplyScalar(offsetAmount));
        }
      });

      particle.isNearFault = nearAnyFault;
      const currentOffset = finalOffset.clone().multiplyScalar(interpolationProgress);
      const newPos = particle.originalPosition.clone().add(currentOffset);
      particle.currentPosition.copy(newPos);

      positions[i * 3] = newPos.x;
      positions[i * 3 + 1] = newPos.y;
      positions[i * 3 + 2] = newPos.z;

      if (nearAnyFault) {
        const enhancedColor = this.enhanceSaturation(baseColor, 0.2);
        colors[i * 3] = enhancedColor.r;
        colors[i * 3 + 1] = enhancedColor.g;
        colors[i * 3 + 2] = enhancedColor.b;
      } else {
        colors[i * 3] = baseColor.r;
        colors[i * 3 + 1] = baseColor.g;
        colors[i * 3 + 2] = baseColor.b;
      }
    });

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  private enhanceSaturation(color: THREE.Color, amount: number): THREE.Color {
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    hsl.s = Math.min(1, hsl.s + amount);
    const result = new THREE.Color();
    result.setHSL(hsl.h, hsl.s, hsl.l);
    return result;
  }

  public getIntersectingFaultCount(faults: Fault[]): number {
    let count = 0;
    const sampleCount = Math.min(50, this.particles.length);

    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.floor((i / sampleCount) * this.particles.length);
      const worldPos = this.particles[idx].originalPosition.clone().add(this.position);

      for (const fault of faults) {
        const plane = fault.getPlane();
        if (Math.abs(plane.distanceToPoint(worldPos)) < 2) {
          count++;
          break;
        }
      }
    }

    return count;
  }

  public getName(): string {
    return VEIN_NAMES[this.type];
  }

  public getColor(): number {
    return VEIN_COLORS[this.type];
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
