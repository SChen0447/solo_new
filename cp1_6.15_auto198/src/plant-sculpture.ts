import * as THREE from 'three';
import { lerpColor, mapRange, clamp, PlantDataPoint } from './utils';

const COLOR_LOW_POTENTIAL = '#ff1744';
const COLOR_HIGH_POTENTIAL = '#00e676';
const POTENTIAL_MIN = -120;
const POTENTIAL_MAX = -80;

const MIN_SCALE = 0.5;
const MAX_SCALE = 1.5;

const ROTATION_SPEED = 0.2;

const NUM_SEGMENTS_MIN = 5;
const NUM_SEGMENTS_MAX = 8;
const SEGMENT_HEIGHT_MIN = 0.3;
const SEGMENT_HEIGHT_MAX = 0.8;
const SEGMENT_RADIUS_BOTTOM = 0.4;
const SEGMENT_RADIUS_TOP = 0.1;

const BRANCH_START_SEGMENT = 3;
const BRANCHES_PER_SEGMENT = 3;
const BRANCH_ANGLE_MIN = 30;
const BRANCH_ANGLE_MAX = 60;
const BRANCH_LENGTH = 0.6;

const LEAVES_PER_BRANCH = 3;
const LEAF_WIDTH = 0.15;
const LEAF_LENGTH = 0.25;

export interface PlantPart {
  mesh: THREE.Object3D;
  type: 'segment' | 'branch' | 'leaf';
  id: string;
  segmentIndex?: number;
  branchIndex?: number;
  leafIndex?: number;
  baseColor?: THREE.Color;
}

export class PlantSculpture {
  private scene: THREE.Scene;
  private plantGroup: THREE.Group;
  private segments: THREE.Mesh[] = [];
  private branches: THREE.Mesh[] = [];
  private leaves: THREE.Mesh[] = [];
  private allParts: PlantPart[] = [];
  private currentData: PlantDataPoint | null = null;
  private rotationSpeed: number = ROTATION_SPEED;

  private highlightMesh: THREE.LineSegments | null = null;
  private highlightedPart: PlantPart | null = null;

  private numSegments: number;
  private segmentHeights: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.plantGroup = new THREE.Group();
    this.scene.add(this.plantGroup);

    this.numSegments = Math.floor(
      Math.random() * (NUM_SEGMENTS_MAX - NUM_SEGMENTS_MIN + 1) + NUM_SEGMENTS_MIN
    );

    for (let i = 0; i < this.numSegments; i++) {
      this.segmentHeights.push(
        SEGMENT_HEIGHT_MIN + Math.random() * (SEGMENT_HEIGHT_MAX - SEGMENT_HEIGHT_MIN)
      );
    }

    this.createPlant();
    this.createGround();
  }

  private createPlant(): void {
    let currentY = 0;

    for (let i = 0; i < this.numSegments; i++) {
      const height = this.segmentHeights[i];
      const radiusBottom = SEGMENT_RADIUS_BOTTOM * (1 - i / this.numSegments * 0.7);
      const radiusTop = SEGMENT_RADIUS_TOP * (1 - i / this.numSegments * 0.5);

      const geometry = new THREE.ConeGeometry(radiusBottom, height, 12);
      geometry.translate(0, height / 2, 0);

      const material = new THREE.MeshStandardMaterial({
        color: 0x2e7d32,
        roughness: 0.8,
        metalness: 0.1,
      });

      const segment = new THREE.Mesh(geometry, material);
      segment.position.y = currentY;
      segment.castShadow = true;
      segment.receiveShadow = true;

      const part: PlantPart = {
        mesh: segment,
        type: 'segment',
        id: `segment-${i}`,
        segmentIndex: i,
      };
      (segment as any).userData.plantPart = part;

      this.plantGroup.add(segment);
      this.segments.push(segment);
      this.allParts.push(part);

      if (i >= BRANCH_START_SEGMENT - 1) {
        this.createBranches(segment, currentY + height / 2, i);
      }

      currentY += height;
    }
  }

  private createBranches(parentSegment: THREE.Mesh, yPos: number, segmentIndex: number): void {
    for (let i = 0; i < BRANCHES_PER_SEGMENT; i++) {
      const angle = (i / BRANCHES_PER_SEGMENT) * Math.PI * 2 + Math.random() * 0.3;
      const branchAngleDeg = BRANCH_ANGLE_MIN + Math.random() * (BRANCH_ANGLE_MAX - BRANCH_ANGLE_MIN);
      const branchAngleRad = (branchAngleDeg * Math.PI) / 180;

      const branchLength = BRANCH_LENGTH * (0.7 + Math.random() * 0.6);
      const branchRadius = 0.04 + Math.random() * 0.02;

      const branchGroup = new THREE.Group();

      const geometry = new THREE.CylinderGeometry(branchRadius, branchRadius * 0.6, branchLength, 6);
      geometry.translate(0, branchLength / 2, 0);

      const material = new THREE.MeshStandardMaterial({
        color: 0x4a7c59,
        roughness: 0.9,
      });

      const branchMesh = new THREE.Mesh(geometry, material);
      branchMesh.castShadow = true;

      branchGroup.add(branchMesh);
      branchGroup.position.y = yPos;
      branchGroup.rotation.z = branchAngleRad;
      branchGroup.rotation.y = angle;

      this.plantGroup.add(branchGroup);
      this.branches.push(branchMesh);

      const branchPart: PlantPart = {
        mesh: branchMesh,
        type: 'branch',
        id: `branch-${segmentIndex}-${i}`,
        segmentIndex,
        branchIndex: i,
      };
      (branchMesh as any).userData.plantPart = branchPart;
      this.allParts.push(branchPart);

      this.createLeaves(branchGroup, branchLength, segmentIndex, i);
    }
  }

  private createLeaves(
    branchGroup: THREE.Group,
    branchLength: number,
    segmentIndex: number,
    branchIndex: number
  ): void {
    for (let i = 0; i < LEAVES_PER_BRANCH; i++) {
      const leafShape = new THREE.Shape();
      const w = LEAF_WIDTH;
      const l = LEAF_LENGTH;

      leafShape.moveTo(0, 0);
      leafShape.quadraticCurveTo(w / 2, l * 0.3, w / 2, l * 0.5);
      leafShape.quadraticCurveTo(w / 2, l * 0.7, 0, l);
      leafShape.quadraticCurveTo(-w / 2, l * 0.7, -w / 2, l * 0.5);
      leafShape.quadraticCurveTo(-w / 2, l * 0.3, 0, 0);

      const extrudeSettings = {
        depth: 0.01,
        bevelEnabled: false,
      };

      const geometry = new THREE.ExtrudeGeometry(leafShape, extrudeSettings);
      geometry.translate(0, 0, -0.005);
      geometry.rotateX(-Math.PI / 2);

      const material = new THREE.MeshStandardMaterial({
        color: 0x66bb6a,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.1,
      });

      const leaf = new THREE.Mesh(geometry, material);

      const leafY = branchLength * (0.5 + i * 0.15);
      const leafAngle = (i - 1) * 0.6;

      leaf.position.set(0, leafY, 0);
      leaf.rotation.y = leafAngle;
      leaf.castShadow = true;

      branchGroup.add(leaf);
      this.leaves.push(leaf);

      const leafPart: PlantPart = {
        mesh: leaf,
        type: 'leaf',
        id: `leaf-${segmentIndex}-${branchIndex}-${i}`,
        segmentIndex,
        branchIndex,
        leafIndex: i,
      };
      (leaf as any).userData.plantPart = leafPart;
      this.allParts.push(leafPart);
    }
  }

  private createGround(): void {
    const groundGeometry = new THREE.CircleGeometry(5, 32);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  public update(data: PlantDataPoint, deltaTime: number): void {
    this.currentData = data;

    this.updateSegmentColors(data.rootPotential);
    this.updateLeafScale(data.stomatalOpening);
    this.plantGroup.rotation.y += this.rotationSpeed * deltaTime;
  }

  private updateSegmentColors(potential: number): void {
    const t = mapRange(potential, POTENTIAL_MIN, POTENTIAL_MAX, 0, 1);
    const clampedT = clamp(t, 0, 1);
    const colorHex = lerpColor(COLOR_LOW_POTENTIAL, COLOR_HIGH_POTENTIAL, clampedT);

    this.segments.forEach((segment, index) => {
      const material = segment.material as THREE.MeshStandardMaterial;
      const segmentT = clamp(clampedT + (index * 0.05), 0, 1);
      const segmentColor = lerpColor(COLOR_LOW_POTENTIAL, COLOR_HIGH_POTENTIAL, segmentT);
      material.color.set(segmentColor);
    });

    this.branches.forEach((branch) => {
      const material = branch.material as THREE.MeshStandardMaterial;
      const branchColor = lerpColor('#4a7c59', colorHex, 0.3);
      material.color.set(branchColor);
    });
  }

  private updateLeafScale(stomatalOpening: number): void {
    const scale = mapRange(stomatalOpening, 0, 100, MIN_SCALE, MAX_SCALE);

    this.leaves.forEach((leaf) => {
      leaf.scale.set(scale, scale, scale);
    });
  }

  public getAllParts(): PlantPart[] {
    return this.allParts;
  }

  public getCurrentData(): PlantDataPoint | null {
    return this.currentData;
  }

  public highlightPart(part: PlantPart | null): void {
    if (this.highlightedPart === part) return;

    this.clearHighlight();

    if (!part) {
      this.highlightedPart = null;
      return;
    }

    this.highlightedPart = part;

    const mesh = part.mesh as THREE.Mesh;
    if (!mesh.geometry) return;

    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      linewidth: 2,
      transparent: true,
      opacity: 0.6,
    });

    const highlight = new THREE.LineSegments(edges, lineMaterial);
    highlight.position.copy(mesh.getWorldPosition(new THREE.Vector3()));
    highlight.quaternion.copy(mesh.getWorldQuaternion(new THREE.Quaternion()));
    highlight.scale.copy(mesh.getWorldScale(new THREE.Vector3()));

    this.plantGroup.worldToLocal(highlight.position);

    this.plantGroup.add(highlight);
    this.highlightMesh = highlight;
  }

  public clearHighlight(): void {
    if (this.highlightMesh) {
      this.plantGroup.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
    this.highlightedPart = null;
  }

  public getHighlightedPart(): PlantPart | null {
    return this.highlightedPart;
  }

  public getPlantGroup(): THREE.Group {
    return this.plantGroup;
  }

  public dispose(): void {
    this.clearHighlight();

    this.segments.forEach((segment) => {
      segment.geometry.dispose();
      (segment.material as THREE.Material).dispose();
    });

    this.branches.forEach((branch) => {
      branch.geometry.dispose();
      (branch.material as THREE.Material).dispose();
    });

    this.leaves.forEach((leaf) => {
      leaf.geometry.dispose();
      (leaf.material as THREE.Material).dispose();
    });

    this.scene.remove(this.plantGroup);
  }
}
