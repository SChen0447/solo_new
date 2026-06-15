import * as THREE from 'three';
import { eventBus } from './eventBus';
import type { Atom, Bond, MoleculeData } from './dataParser';

const ELEMENT_COLORS: Record<string, number> = {
  C: 0x808080,
  H: 0xffffff,
  O: 0xff0000,
  N: 0x0000ff,
  S: 0xffff00,
  P: 0xffa500,
};

const ELEMENT_RADII: Record<string, number> = {
  C: 1.0,
  O: 0.8,
  N: 0.9,
  H: 0.6,
};

const DEFAULT_RADIUS = 0.7;
const BOND_RADIUS = 0.2;
const BOND_COLOR = 0xc0c0c0;

type DisplayMode = 'ballStick' | 'wireframe';

export class SceneRenderer {
  private scene: THREE.Scene;
  private moleculeGroup: THREE.Group | null = null;
  private starField: THREE.Points | null = null;
  private currentMode: DisplayMode = 'ballStick';
  private atomMeshes: THREE.InstancedMesh[] = [];
  private wireframeMeshes: THREE.InstancedMesh[] = [];
  private bondMeshes: THREE.InstancedMesh[] = [];
  private wireframeBondMeshes: THREE.InstancedMesh[] = [];
  private moleculeData: MoleculeData | null = null;
  private atomMapByElement: Map<string, { atoms: Atom[]; indices: number[] }> = new Map();
  private highlightMesh: THREE.Mesh | null = null;
  private isTransitioning = false;
  private axesHelper: THREE.AxesHelper | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.setupBackground();
    this.setupStarField();
    this.setupAxesHelper();

    eventBus.on('molecule-parsed', (data) => {
      const mol = data as MoleculeData;
      this.moleculeData = mol;
      this.buildMolecule(mol);
    });

    eventBus.on('mode-changed', (data) => {
      const mode = data as DisplayMode;
      this.switchMode(mode);
    });

    eventBus.on('atom-highlight', (data) => {
      const d = data as { index: number };
      this.highlightAtom(d.index);
    });

    eventBus.on('atom-unhighlight', () => {
      this.unhighlightAtom();
    });

    eventBus.on('camera-rotating', (data) => {
      const d = data as { rotating: boolean };
      if (this.axesHelper) {
        this.axesHelper.visible = d.rotating;
      }
    });
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private setupStarField(): void {
    const count = 1500;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    this.starField = new THREE.Points(geometry, material);
    this.scene.add(this.starField);
  }

  private setupAxesHelper(): void {
    this.axesHelper = new THREE.AxesHelper(15);
    this.axesHelper.visible = false;
    const matX = new THREE.LineBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
    const matY = new THREE.LineBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    const matZ = new THREE.LineBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 });
    if (this.axesHelper.children.length >= 3) {
      (this.axesHelper.children[0] as THREE.Line).material = matX;
      (this.axesHelper.children[1] as THREE.Line).material = matY;
      (this.axesHelper.children[2] as THREE.Line).material = matZ;
    }
    this.scene.add(this.axesHelper);
  }

  private clearMolecule(): void {
    if (this.moleculeGroup) {
      this.scene.remove(this.moleculeGroup);
      this.moleculeGroup.traverse((child) => {
        if (child instanceof THREE.Mesh || child instanceof THREE.InstancedMesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }
    this.moleculeGroup = new THREE.Group();
    this.scene.add(this.moleculeGroup);
    this.atomMeshes = [];
    this.wireframeMeshes = [];
    this.bondMeshes = [];
    this.wireframeBondMeshes = [];
    this.atomMapByElement.clear();

    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
  }

  private buildMolecule(data: MoleculeData): void {
    this.clearMolecule();

    const elementGroups = new Map<string, { atoms: Atom[]; indices: number[] }>();
    data.atoms.forEach((atom, i) => {
      if (!elementGroups.has(atom.element)) {
        elementGroups.set(atom.element, { atoms: [], indices: [] });
      }
      elementGroups.get(atom.element)!.atoms.push(atom);
      elementGroups.get(atom.element)!.indices.push(i);
    });

    this.atomMapByElement = elementGroups;

    elementGroups.forEach((group, element) => {
      this.createAtomInstances(element, group.atoms, data);
    });

    this.createBondInstances(data);

    this.moleculeGroup!.visible = true;
    this.applyModeVisibility();

    this.centerMolecule(data);
  }

  private createAtomInstances(element: string, atoms: Atom[], data: MoleculeData): void {
    const radius = ELEMENT_RADII[element] ?? DEFAULT_RADIUS;
    const color = ELEMENT_COLORS[element] ?? 0x808080;

    const sphereGeo = new THREE.SphereGeometry(radius, 32, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.3,
      metalness: 0.1,
    });
    const instancedMesh = new THREE.InstancedMesh(sphereGeo, sphereMat, atoms.length);
    instancedMesh.userData = { element, atomIndices: atoms.map((a) => a.index) };

    const dummy = new THREE.Object3D();
    atoms.forEach((atom, i) => {
      dummy.position.set(atom.x, atom.y, atom.z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    });
    instancedMesh.instanceMatrix.needsUpdate = true;

    const wireGeo = new THREE.SphereGeometry(radius * 1.02, 16, 12);
    const wireMat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const wireInstanced = new THREE.InstancedMesh(wireGeo, wireMat, atoms.length);
    wireInstanced.userData = { element, atomIndices: atoms.map((a) => a.index) };

    atoms.forEach((atom, i) => {
      dummy.position.set(atom.x, atom.y, atom.z);
      dummy.updateMatrix();
      wireInstanced.setMatrixAt(i, dummy.matrix);
    });
    wireInstanced.instanceMatrix.needsUpdate = true;
    wireInstanced.visible = false;

    this.moleculeGroup!.add(instancedMesh);
    this.moleculeGroup!.add(wireInstanced);
    this.atomMeshes.push(instancedMesh);
    this.wireframeMeshes.push(wireInstanced);
  }

  private createBondInstances(data: MoleculeData): void {
    if (data.bonds.length === 0) return;

    const bondGeo = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, 1, 8);
    const bondMat = new THREE.MeshStandardMaterial({
      color: BOND_COLOR,
      roughness: 0.4,
      metalness: 0.05,
    });
    const instancedBonds = new THREE.InstancedMesh(bondGeo, bondMat, data.bonds.length);

    const wireBondGeo = new THREE.CylinderGeometry(BOND_RADIUS * 0.3, BOND_RADIUS * 0.3, 1, 4);
    const wireBondMat = new THREE.MeshBasicMaterial({
      color: BOND_COLOR,
      transparent: true,
      opacity: 0.5,
    });
    const wireInstancedBonds = new THREE.InstancedMesh(wireBondGeo, wireBondMat, data.bonds.length);
    wireInstancedBonds.visible = false;

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    data.bonds.forEach((bond, i) => {
      const atom1 = data.atoms[bond.atom1Index];
      const atom2 = data.atoms[bond.atom2Index];
      if (!atom1 || !atom2) return;

      const start = new THREE.Vector3(atom1.x, atom1.y, atom1.z);
      const end = new THREE.Vector3(atom2.x, atom2.y, atom2.z);
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
      const direction = new THREE.Vector3().subVectors(end, start);
      const length = direction.length();

      dummy.position.copy(mid);
      dummy.scale.set(1, length, 1);
      const normalized = direction.normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, normalized);
      dummy.quaternion.copy(quaternion);
      dummy.updateMatrix();

      instancedBonds.setMatrixAt(i, dummy.matrix);
      wireInstancedBonds.setMatrixAt(i, dummy.matrix);
    });

    instancedBonds.instanceMatrix.needsUpdate = true;
    wireInstancedBonds.instanceMatrix.needsUpdate = true;

    this.moleculeGroup!.add(instancedBonds);
    this.moleculeGroup!.add(wireInstancedBonds);
    this.bondMeshes.push(instancedBonds);
    this.wireframeBondMeshes.push(wireInstancedBonds);
  }

  private centerMolecule(data: MoleculeData): void {
    if (data.atoms.length === 0) return;
    const center = new THREE.Vector3();
    data.atoms.forEach((a) => center.add(new THREE.Vector3(a.x, a.y, a.z)));
    center.divideScalar(data.atoms.length);

    if (this.moleculeGroup) {
      this.moleculeGroup.position.sub(center);
    }
  }

  private applyModeVisibility(): void {
    const isBallStick = this.currentMode === 'ballStick';
    this.atomMeshes.forEach((m) => (m.visible = isBallStick));
    this.bondMeshes.forEach((m) => (m.visible = isBallStick));
    this.wireframeMeshes.forEach((m) => (m.visible = !isBallStick));
    this.wireframeBondMeshes.forEach((m) => (m.visible = !isBallStick));
  }

  private switchMode(mode: DisplayMode): void {
    if (mode === this.currentMode || this.isTransitioning) return;
    this.isTransitioning = true;

    const fadeOut = this.currentMode === 'ballStick'
      ? [...this.atomMeshes, ...this.bondMeshes]
      : [...this.wireframeMeshes, ...this.wireframeBondMeshes];

    const fadeIn = mode === 'ballStick'
      ? [...this.atomMeshes, ...this.bondMeshes]
      : [...this.wireframeMeshes, ...this.wireframeBondMeshes];

    const duration = 500;
    const startTime = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);

      fadeOut.forEach((mesh) => {
        if (mesh.material instanceof THREE.Material) {
          mesh.material.transparent = true;
          mesh.material.opacity = 1 - progress;
        }
      });

      if (progress > 0.5) {
        fadeIn.forEach((mesh) => {
          mesh.visible = true;
          if (mesh.material instanceof THREE.Material) {
            mesh.material.transparent = true;
            mesh.material.opacity = (progress - 0.5) * 2;
          }
        });
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        fadeOut.forEach((mesh) => {
          mesh.visible = false;
          if (mesh.material instanceof THREE.Material) {
            mesh.material.transparent = false;
            mesh.material.opacity = 1;
          }
        });
        fadeIn.forEach((mesh) => {
          if (mesh.material instanceof THREE.Material) {
            mesh.material.transparent = mesh.material instanceof THREE.MeshBasicMaterial;
            mesh.material.opacity = mesh.material instanceof THREE.MeshBasicMaterial ? 0.7 : 1;
          }
        });
        this.currentMode = mode;
        this.isTransitioning = false;
      }
    };

    requestAnimationFrame(animate);
  }

  private highlightAtom(atomIndex: number): void {
    this.unhighlightAtom();

    if (!this.moleculeData || atomIndex < 0 || atomIndex >= this.moleculeData.atoms.length) return;

    const atom = this.moleculeData.atoms[atomIndex];
    const radius = ELEMENT_RADII[atom.element] ?? DEFAULT_RADIUS;

    const glowGeo = new THREE.SphereGeometry(radius * 1.5, 24, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
    });
    this.highlightMesh = new THREE.Mesh(glowGeo, glowMat);

    if (this.moleculeGroup) {
      this.highlightMesh.position.set(
        atom.x + this.moleculeGroup.position.x,
        atom.y + this.moleculeGroup.position.y,
        atom.z + this.moleculeGroup.position.z,
      );
    } else {
      this.highlightMesh.position.set(atom.x, atom.y, atom.z);
    }

    this.scene.add(this.highlightMesh);

    const startTime = performance.now();
    const animDuration = 200;
    const animateGlow = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / animDuration, 1);
      if (this.highlightMesh) {
        (this.highlightMesh.material as THREE.MeshBasicMaterial).opacity = progress * 0.4;
      }
      if (progress < 1) {
        requestAnimationFrame(animateGlow);
      }
    };
    requestAnimationFrame(animateGlow);
  }

  private unhighlightAtom(): void {
    if (this.highlightMesh) {
      this.scene.remove(this.highlightMesh);
      this.highlightMesh.geometry.dispose();
      (this.highlightMesh.material as THREE.Material).dispose();
      this.highlightMesh = null;
    }
  }

  public getAtomAtIntersection(
    raycaster: THREE.Raycaster,
  ): { atomIndex: number; element: string; x: number; y: number; z: number } | null {
    if (!this.moleculeData) return null;

    const meshes = this.currentMode === 'ballStick' ? this.atomMeshes : this.wireframeMeshes;
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.InstancedMesh;
      const instanceId = hit.instanceId;
      if (instanceId !== undefined && mesh.userData.atomIndices) {
        const atomIndex = mesh.userData.atomIndices[instanceId];
        const atom = this.moleculeData.atoms[atomIndex];
        return { atomIndex, element: atom.element, x: atom.x, y: atom.y, z: atom.z };
      }
    }

    return null;
  }

  public getConnectionCount(atomIndex: number): number {
    if (!this.moleculeData) return 0;
    let count = 0;
    for (const bond of this.moleculeData.bonds) {
      if (bond.atom1Index === atomIndex || bond.atom2Index === atomIndex) {
        count++;
      }
    }
    return count;
  }

  public updateStarField(time: number): void {
    if (this.starField) {
      this.starField.rotation.y = time * 0.00005;
      this.starField.rotation.x = time * 0.00002;
    }
  }

  public resetView(): void {
    if (this.moleculeGroup && this.moleculeData) {
      this.clearMolecule();
      this.buildMolecule(this.moleculeData);
    }
  }
}
