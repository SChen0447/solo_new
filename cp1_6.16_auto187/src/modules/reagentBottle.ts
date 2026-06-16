import * as THREE from 'three';
import { BeakerObject } from './experimentBench';
import { REAGENT_COLORS } from './reactionSimulator';

export interface ParticleFlowConfig {
  particleCount: number;
  flowSpeed: number;
  color: THREE.Color;
}

type PourCompleteCallback = (reagent: string, amount: number) => void;

export class ReagentBottle {
  group: THREE.Group;
  reagentName: string;
  currentVolume: number;
  maxVolume: number;
  private liquidMesh: THREE.Mesh | null = null;
  private liquidMaterial: THREE.MeshPhysicalMaterial | null = null;
  private labelSprite: THREE.Sprite | null = null;
  private particleSystem: THREE.Points | null = null;
  private particleVelocities: Float32Array | null = null;
  private isPouring: boolean = false;
  private pourTarget: BeakerObject | null = null;
  private pourAmount: number = 0;
  private pourProgress: number = 0;
  private pourCompleteCallbacks: PourCompleteCallback[] = [];
  private scene: THREE.Scene;
  private originalPosition: THREE.Vector3;
  private isDragging: boolean = false;
  private color: THREE.Color;

  constructor(scene: THREE.Scene, name: string, position: THREE.Vector3) {
    this.scene = scene;
    this.reagentName = name;
    this.currentVolume = 100;
    this.maxVolume = 100;
    this.originalPosition = position.clone();
    this.color = new THREE.Color(REAGENT_COLORS[name] || '#c0c0c0');
    this.group = this.createBottle(name, this.color);
    this.group.position.copy(position);
    this.scene.add(this.group);
  }

  private createBottle(name: string, color: THREE.Color): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(2.5, 2.8, 12, 16);
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      transmission: 0.9,
      roughness: 0.05,
      metalness: 0.0,
      ior: 1.5,
      side: THREE.DoubleSide,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 6;
    group.add(body);

    const neckGeo = new THREE.CylinderGeometry(1, 2.5, 4, 16);
    const neck = new THREE.Mesh(neckGeo, bodyMat.clone());
    neck.position.y = 14;
    group.add(neck);

    const capGeo = new THREE.CylinderGeometry(1.2, 1.2, 1, 16);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 16.5;
    group.add(cap);

    const liquidGeo = new THREE.CylinderGeometry(2.3, 2.6, 8, 16);
    const liquidMat = new THREE.MeshPhysicalMaterial({
      color: color,
      transparent: true,
      opacity: 0.65,
      transmission: 0.2,
      roughness: 0.1,
      side: THREE.DoubleSide,
    });
    this.liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
    this.liquidMesh.position.y = 4;
    this.liquidMaterial = liquidMat;
    group.add(this.liquidMesh);

    const label = this.createLabel(name);
    label.position.set(0, 7, 2.85);
    label.scale.set(4, 2, 1);
    group.add(label);
    this.labelSprite = label;

    return group;
  }

  private createLabel(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#FFF8F0';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 248, 120);

    ctx.fillStyle = '#2c2c2c';
    ctx.font = 'bold 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    return new THREE.Sprite(mat);
  }

  startPour(target: BeakerObject, amount: number): void {
    if (this.isPouring || this.currentVolume <= 0) return;

    this.isPouring = true;
    this.pourTarget = target;
    this.pourAmount = Math.min(amount, this.currentVolume);
    this.pourProgress = 0;

    this.createParticleFlow(target);
  }

  stopPour(): void {
    if (!this.isPouring) return;

    this.isPouring = false;
    this.removeParticleFlow();

    const poured = this.pourAmount * this.pourProgress;
    this.currentVolume -= poured;
    this.updateLiquidLevel();

    if (this.pourTarget) {
      this.pourCompleteCallbacks.forEach(cb =>
        cb(this.reagentName, poured)
      );
    }

    this.pourTarget = null;
    this.pourProgress = 0;
  }

  private createParticleFlow(target: BeakerObject): void {
    this.removeParticleFlow();

    const config: ParticleFlowConfig = {
      particleCount: 30,
      flowSpeed: 2,
      color: this.color.clone(),
    };

    const positions = new Float32Array(config.particleCount * 3);
    const velocities = new Float32Array(config.particleCount * 3);
    this.particleVelocities = velocities;

    const startPos = new THREE.Vector3();
    this.group.getWorldPosition(startPos);
    startPos.y += 16;

    const endPos = target.group.position.clone();
    endPos.y += 15;

    for (let i = 0; i < config.particleCount; i++) {
      const t = i / config.particleCount;
      positions[i * 3] = startPos.x + (endPos.x - startPos.x) * t + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = startPos.y + (endPos.y - startPos.y) * t + (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 2] = startPos.z + (endPos.z - startPos.z) * t + (Math.random() - 0.5) * 0.5;

      velocities[i * 3] = (endPos.x - startPos.x) / config.particleCount * config.flowSpeed;
      velocities[i * 3 + 1] = (endPos.y - startPos.y) / config.particleCount * config.flowSpeed;
      velocities[i * 3 + 2] = (endPos.z - startPos.z) / config.particleCount * config.flowSpeed;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: config.color,
      size: 0.8,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private removeParticleFlow(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
      this.particleSystem = null;
      this.particleVelocities = null;
    }
  }

  updatePour(delta: number): void {
    if (!this.isPouring || !this.particleSystem || !this.particleVelocities) return;

    this.pourProgress += delta * 0.5;
    if (this.pourProgress >= 1) {
      this.stopPour();
      return;
    }

    const positions = this.particleSystem.geometry.attributes.position;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < arr.length / 3; i++) {
      arr[i * 3] += this.particleVelocities[i * 3] * delta * 0.3;
      arr[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * delta * 0.3;
      arr[i * 3 + 2] += this.particleVelocities[i * 3 + 2] * delta * 0.3;

      arr[i * 3] += (Math.random() - 0.5) * 0.1;
      arr[i * 3 + 2] += (Math.random() - 0.5) * 0.1;
    }
    positions.needsUpdate = true;

    if (this.pourTarget) {
      const pouredSoFar = this.pourAmount * this.pourProgress;
      const newVolume = this.pourTarget.currentVolume + pouredSoFar * delta * 2;
    }
  }

  private updateLiquidLevel(): void {
    if (!this.liquidMesh || !this.liquidMaterial) return;

    const ratio = this.currentVolume / this.maxVolume;
    const height = Math.max(0.1, ratio * 8);
    this.liquidMesh.scale.y = ratio;
    this.liquidMesh.position.y = 2 + height / 2;
  }

  onPourComplete(callback: PourCompleteCallback): void {
    this.pourCompleteCallbacks.push(callback);
  }

  setDragging(isDragging: boolean): void {
    this.isDragging = isDragging;
  }

  getIsDragging(): boolean {
    return this.isDragging;
  }

  getIsPouring(): boolean {
    return this.isPouring;
  }

  resetPosition(): void {
    this.group.position.copy(this.originalPosition);
    this.group.rotation.set(0, 0, 0);
  }

  getColor(): string {
    return '#' + this.color.getHexString();
  }

  dispose(): void {
    this.removeParticleFlow();
    this.scene.remove(this.group);
    this.group.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
  }
}
