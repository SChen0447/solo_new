import * as THREE from 'three';

const PRESET_COLORS = [
  0x4da6ff,
  0xff6b6b,
  0x4ecdc4,
  0xffe66d,
  0xa855f7
];

export class BuildingSeed {
  position: THREE.Vector3;
  color: THREE.Color;
  mesh: THREE.Group;
  isGrowing: boolean = false;
  isGrown: boolean = false;

  private seedBall: THREE.Mesh;
  private rippleMesh: THREE.Mesh;
  private groundAura: THREE.Mesh;
  private particles: THREE.Points | null = null;
  private animationTime: number = 0;
  private sinkDuration: number = 1.5;
  private growDuration: number = 0.6;
  private isSinking: boolean = true;
  private buildingHeight: number = 0;
  private buildingWidth: number = 2;
  private buildingDepth: number = 2;
  private particleCount: number = 50;

  constructor(position: THREE.Vector3) {
    this.position = position.clone();
    this.color = new THREE.Color(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);

    this.buildingHeight = 5 + Math.random() * 15;

    this.seedBall = this.createSeedBall();
    this.rippleMesh = this.createRipple();
    this.groundAura = this.createGroundAura();

    this.mesh.add(this.seedBall);
    this.mesh.add(this.rippleMesh);
    this.mesh.add(this.groundAura);

    this.startSinkingAnimation();
  }

  private createSeedBall(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);
    const material = new THREE.MeshBasic