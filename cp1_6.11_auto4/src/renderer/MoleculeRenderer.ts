import * as THREE from 'three';
import { Molecule, getElementData, AtomInstance } from '../models/Molecule';

const ATOM_SPHERE_SEGMENTS = 32;
const BOND_RADIUS = 0.08;
const BOND_RADIAL_SEGMENTS = 12;
const RADIUS_SCALE = 0.45;

export class MoleculeRenderer {
  readonly group: THREE.Group;
  private atomMeshes: THREE.Mesh[] = [];
  private atomDataMap: Map<THREE.Mesh, AtomInstance> = new Map();
  private glowMeshes: Map<THREE.Mesh, THREE.Mesh> = new Map();
  private currentHighlight: THREE.Mesh | null = null;

  constructor() {
    this.group = new THREE.Group();
  }

  build(molecule: Molecule): void {
    this.clear();
    const center = molecule.center();

    for (const atom of molecule.data.atoms) {
      const elem = getElementData(atom.symbol);
      const geometry = new THREE.SphereGeometry(
        Math.max(0.01, elem.radius * RADIUS_SCALE),
        ATOM_SPHERE_SEGMENTS,
        ATOM_SPHERE_SEGMENTS
      );
      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(elem.color),
        roughness: 0.3,
        metalness: 0.1,
        emissive: new THREE.Color(0x000000),
        emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        atom.position[0] - center[0],
        atom.position[1] - center[1],
        atom.position[2] - center[2]
      );
      this.group.add(mesh);
      this.atomMeshes.push(mesh);
      this.atomDataMap.set(mesh, atom);

      const glowGeo = new THREE.SphereGeometry(
        Math.max(0.01, elem.radius * RADIUS_SCALE * 1.3),
        ATOM_SPHERE_SEGMENTS,
        ATOM_SPHERE_SEGMENTS
      );
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0,
        side: THREE.BackSide,
      });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.copy(mesh.position);
      this.group.add(glowMesh);
      this.glowMeshes.set(mesh, glowMesh);
    }

    for (const bond of molecule.data.bonds) {
      const a1 = molecule.getAtomById(bond.atomId1);
      const a2 = molecule.getAtomById(bond.atomId2);
      if (!a1 || !a2) continue;

      const start = new THREE.Vector3(
        a1.position[0] - center[0],
        a1.position[1] - center[1],
        a1.position[2] - center[2]
      );
      const end = new THREE.Vector3(
        a2.position[0] - center[0],
        a2.position[1] - center[1],
        a2.position[2] - center[2]
      );

      const offset = bond.order === 2 ? 0.08 : 0;
      const offsets = bond.order === 2
        ? [-offset, offset]
        : [0];

      for (const off of offsets) {
        const dir = new THREE.Vector3().subVectors(end, start);
        const length = Math.max(0.001, dir.length());
        dir.normalize();

        const up = new THREE.Vector3(0, 1, 0);
        const perpendicular = new THREE.Vector3().crossVectors(dir, up).normalize();
        if (perpendicular.lengthSq() < 0.001) {
          perpendicular.set(1, 0, 0);
        }

        const offsetVec = perpendicular.multiplyScalar(off);

        const geometry = new THREE.CylinderGeometry(
          BOND_RADIUS,
          BOND_RADIUS,
          length,
          BOND_RADIAL_SEGMENTS
        );
        const material = new THREE.MeshStandardMaterial({
          color: 0x888888,
          roughness: 0.5,
          metalness: 0.2,
        });
        const cylinder = new THREE.Mesh(geometry, material);

        const midpoint = new THREE.Vector3()
          .addVectors(start, end)
          .multiplyScalar(0.5)
          .add(offsetVec);
        cylinder.position.copy(midpoint);

        const axis = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, dir);
        cylinder.quaternion.copy(quaternion);

        this.group.add(cylinder);
      }
    }
  }

  highlightAtom(mesh: THREE.Mesh): void {
    if (this.currentHighlight === mesh) return;
    this.unhighlightAtom();
    this.currentHighlight = mesh;

    const mat = mesh.material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0x00ffff);
    mat.emissiveIntensity = 0.6;

    const glow = this.glowMeshes.get(mesh);
    if (glow) {
      const glowMat = glow.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.35;
    }
  }

  unhighlightAtom(): void {
    if (!this.currentHighlight) return;
    const mat = this.currentHighlight.material as THREE.MeshStandardMaterial;
    mat.emissive = new THREE.Color(0x000000);
    mat.emissiveIntensity = 0;

    const glow = this.glowMeshes.get(this.currentHighlight);
    if (glow) {
      const glowMat = glow.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0;
    }

    this.currentHighlight = null;
  }

  getAtomData(mesh: THREE.Mesh): AtomInstance | undefined {
    return this.atomDataMap.get(mesh);
  }

  getAtomMeshes(): THREE.Mesh[] {
    return this.atomMeshes;
  }

  setOpacity(opacity: number): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.Material;
        mat.transparent = true;
        mat.opacity = opacity;
        mat.depthWrite = opacity > 0.99;
      }
    });
  }

  clear(): void {
    this.unhighlightAtom();
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    this.atomMeshes = [];
    this.atomDataMap.clear();
    this.glowMeshes.clear();
    this.currentHighlight = null;
  }

  dispose(): void {
    this.clear();
  }
}
