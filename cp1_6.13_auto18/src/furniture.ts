import * as THREE from 'three';

export interface FurnitureDefinition {
  name: string;
  type: string;
  color: number;
  width: number;
  height: number;
  depth: number;
}

export const FURNITURE_CATALOG: Record<string, FurnitureDefinition> = {
  sofa: {
    name: '沙发',
    type: 'sofa',
    color: 0x5c6b73,
    width: 2.0,
    height: 0.8,
    depth: 0.9,
  },
  table: {
    name: '桌子',
    type: 'table',
    color: 0x8b6f47,
    width: 1.4,
    height: 0.75,
    depth: 0.8,
  },
  chair: {
    name: '椅子',
    type: 'chair',
    color: 0x6b5b4f,
    width: 0.5,
    height: 0.9,
    depth: 0.5,
  },
};

const GRID_SNAP = 0.5;

export class FurnitureManager {
  group: THREE.Group;
  furnitureList: Map<string, THREE.Group> = new Map();
  selectedFurniture: THREE.Group | null = null;
  ghostMesh: THREE.Mesh | null = null;
  rotationArc: THREE.Group | null = null;
  private idCounter = 0;
  private bounceAnimations: Map<string, { obj: THREE.Group; startTime: number; targetY: number }> = new Map();

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'furniture';
  }

  createFurniture(type: string, position?: THREE.Vector3): THREE.Group | null {
    const def = FURNITURE_CATALOG[type];
    if (!def) return null;

    const furnitureGroup = new THREE.Group();
    furnitureGroup.name = `furniture-${type}-${this.idCounter++}`;
    furnitureGroup.userData = { type, definition: def };

    this.buildMesh(furnitureGroup, def);

    if (position) {
      furnitureGroup.position.copy(position);
    } else {
      furnitureGroup.position.set(0, def.height / 2, 0);
    }

    this.snapToGrid(furnitureGroup);
    furnitureGroup.castShadow = true;
    this.group.add(furnitureGroup);
    this.furnitureList.set(furnitureGroup.name, furnitureGroup);

    this.addBounceAnimation(furnitureGroup);
    return furnitureGroup;
  }

  private buildMesh(parent: THREE.Group, def: FurnitureDefinition): void {
    const mat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.7,
      metalness: 0.1,
    });

    if (def.type === 'sofa') {
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(def.width, def.height * 0.45, def.depth),
        mat
      );
      base.position.y = def.height * 0.225;
      base.castShadow = true;
      base.receiveShadow = true;
      parent.add(base);

      const backRest = new THREE.Mesh(
        new THREE.BoxGeometry(def.width, def.height * 0.55, def.depth * 0.25),
        mat
      );
      backRest.position.set(0, def.height * 0.45 + def.height * 0.275, -def.depth * 0.375);
      backRest.castShadow = true;
      parent.add(backRest);

      const armL = new THREE.Mesh(
        new THREE.BoxGeometry(def.width * 0.08, def.height * 0.35, def.depth),
        mat
      );
      armL.position.set(-def.width * 0.46, def.height * 0.45 + def.height * 0.175, 0);
      armL.castShadow = true;
      parent.add(armL);

      const armR = armL.clone();
      armR.position.x = def.width * 0.46;
      parent.add(armR);
    } else if (def.type === 'table') {
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(def.width, 0.04, def.depth),
        mat
      );
      top.position.y = def.height - 0.02;
      top.castShadow = true;
      top.receiveShadow = true;
      parent.add(top);

      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, def.height - 0.04, 8);
      const positions = [
        [def.width * 0.4, (def.height - 0.04) / 2, def.depth * 0.35],
        [-def.width * 0.4, (def.height - 0.04) / 2, def.depth * 0.35],
        [def.width * 0.4, (def.height - 0.04) / 2, -def.depth * 0.35],
        [-def.width * 0.4, (def.height - 0.04) / 2, -def.depth * 0.35],
      ];
      positions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, y, z);
        leg.castShadow = true;
        parent.add(leg);
      });
    } else if (def.type === 'chair') {
      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(def.width, 0.04, def.depth),
        mat
      );
      seat.position.y = def.height * 0.55;
      seat.castShadow = true;
      seat.receiveShadow = true;
      parent.add(seat);

      const back = new THREE.Mesh(
        new THREE.BoxGeometry(def.width, def.height * 0.45, 0.04),
        mat
      );
      back.position.set(0, def.height * 0.55 + def.height * 0.225, -def.depth * 0.46);
      back.castShadow = true;
      parent.add(back);

      const legGeo = new THREE.CylinderGeometry(0.02, 0.02, def.height * 0.55, 8);
      const positions = [
        [def.width * 0.38, def.height * 0.275, def.depth * 0.38],
        [-def.width * 0.38, def.height * 0.275, def.depth * 0.38],
        [def.width * 0.38, def.height * 0.275, -def.depth * 0.38],
        [-def.width * 0.38, def.height * 0.275, -def.depth * 0.38],
      ];
      positions.forEach(([x, y, z]) => {
        const leg = new THREE.Mesh(legGeo, mat);
        leg.position.set(x, y, z);
        leg.castShadow = true;
        parent.add(leg);
      });
    }
  }

  snapToGrid(obj: THREE.Object3D): void {
    obj.position.x = Math.round(obj.position.x / GRID_SNAP) * GRID_SNAP;
    obj.position.z = Math.round(obj.position.z / GRID_SNAP) * GRID_SNAP;
  }

  addBounceAnimation(obj: THREE.Group): void {
    this.bounceAnimations.set(obj.name, {
      obj,
      startTime: performance.now(),
      targetY: obj.position.y,
    });
    obj.position.y = obj.position.y + 0.15;
  }

  updateBounceAnimations(): void {
    const now = performance.now();
    const toRemove: string[] = [];

    this.bounceAnimations.forEach((anim, key) => {
      const elapsed = (now - anim.startTime) / 1000;
      const duration = 0.45;

      if (elapsed >= duration) {
        anim.obj.position.y = anim.targetY;
        toRemove.push(key);
        return;
      }

      const t = elapsed / duration;
      const bounceHeight = 0.15 * Math.abs(Math.sin(t * Math.PI * 2.5)) * (1 - t) * (1 - t);
      anim.obj.position.y = anim.targetY + bounceHeight;
    });

    toRemove.forEach(k => this.bounceAnimations.delete(k));
  }

  createGhost(furniture: THREE.Group): void {
    this.removeGhost();
    const def = furniture.userData.definition as FurnitureDefinition;
    const ghostGeo = new THREE.BoxGeometry(def.width, def.height, def.depth);
    const ghostMat = new THREE.MeshBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    });
    this.ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    this.ghostMesh.position.copy(furniture.position);
    this.ghostMesh.position.y = def.height / 2;
    this.ghostMesh.rotation.copy(furniture.rotation);
    this.ghostMesh.name = 'ghost';
    this.group.add(this.ghostMesh);
  }

  updateGhostPosition(x: number, z: number): void {
    if (!this.ghostMesh) return;
    this.ghostMesh.position.x = Math.round(x / GRID_SNAP) * GRID_SNAP;
    this.ghostMesh.position.z = Math.round(z / GRID_SNAP) * GRID_SNAP;
  }

  removeGhost(): void {
    if (this.ghostMesh) {
      this.group.remove(this.ghostMesh);
      this.ghostMesh.geometry.dispose();
      (this.ghostMesh.material as THREE.Material).dispose();
      this.ghostMesh = null;
    }
  }

  selectFurniture(furniture: THREE.Group | null): void {
    this.deselectAll();
    this.selectedFurniture = furniture;
    if (furniture) {
      this.addSelectionGlow(furniture);
    }
  }

  addSelectionGlow(furniture: THREE.Group): void {
    furniture.traverse(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.userData.originalEmissive = child.material.emissive.getHex();
        child.material.emissive.setHex(0x4fc3f7);
        child.material.emissiveIntensity = 0.3;
      }
    });
  }

  removeSelectionGlow(furniture: THREE.Group): void {
    furniture.traverse(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.emissive.setHex(child.userData.originalEmissive ?? 0x000000);
        child.material.emissiveIntensity = 0;
      }
    });
  }

  deselectAll(): void {
    if (this.selectedFurniture) {
      this.removeSelectionGlow(this.selectedFurniture);
    }
    this.selectedFurniture = null;
    this.removeRotationArc();
  }

  deleteFurniture(name: string): void {
    const furniture = this.furnitureList.get(name);
    if (!furniture) return;
    if (this.selectedFurniture === furniture) {
      this.deselectAll();
    }
    this.group.remove(furniture);
    furniture.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    });
    this.furnitureList.delete(name);
  }

  showRotationArc(furniture: THREE.Group): void {
    this.removeRotationArc();
    const def = furniture.userData.definition as FurnitureDefinition;
    const arcGroup = new THREE.Group();
    arcGroup.name = 'rotation-arc';

    const radius = Math.max(def.width, def.depth) * 0.8;
    const segments = 64;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI * (i / segments);
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.02,
        Math.sin(angle) * radius
      ));
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x4fc3f7,
      transparent: true,
      opacity: 0.6,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    arcGroup.add(line);

    const tickAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI];
    tickAngles.forEach(angle => {
      const tickInner = radius * 0.9;
      const tickOuter = radius * 1.1;
      const tickGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(angle) * tickInner, 0.02, Math.sin(angle) * tickInner),
        new THREE.Vector3(Math.cos(angle) * tickOuter, 0.02, Math.sin(angle) * tickOuter),
      ]);
      const tickMat = new THREE.LineBasicMaterial({
        color: 0x4fc3f7,
        transparent: true,
        opacity: 0.8,
      });
      const tick = new THREE.Line(tickGeo, tickMat);
      arcGroup.add(tick);
    });

    arcGroup.position.copy(furniture.position);
    arcGroup.position.y = 0.01;
    this.rotationArc = arcGroup;
    this.group.add(arcGroup);
  }

  updateRotationArc(furniture: THREE.Group): void {
    if (this.rotationArc) {
      this.rotationArc.position.copy(furniture.position);
      this.rotationArc.position.y = 0.01;
    }
  }

  removeRotationArc(): void {
    if (this.rotationArc) {
      this.rotationArc.traverse(child => {
        if (child instanceof THREE.Line) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.group.remove(this.rotationArc);
      this.rotationArc = null;
    }
  }

  snapRotation(obj: THREE.Object3D): void {
    const step = Math.PI / 4;
    const yRotation = obj.rotation.y;
    obj.rotation.y = Math.round(yRotation / step) * step;
  }

  hideHelpers(): void {
    if (this.ghostMesh) this.ghostMesh.visible = false;
    if (this.rotationArc) this.rotationArc.visible = false;
    if (this.selectedFurniture) {
      this.removeSelectionGlow(this.selectedFurniture);
    }
  }

  showHelpers(): void {
    if (this.ghostMesh) this.ghostMesh.visible = true;
    if (this.rotationArc) this.rotationArc.visible = true;
    if (this.selectedFurniture) {
      this.addSelectionGlow(this.selectedFurniture);
    }
  }
}
