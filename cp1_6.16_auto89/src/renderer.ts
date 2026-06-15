import * as THREE from 'three';
import { World } from './world';
import {
  VoxelType,
  BLOCK_DEFS,
  WORLD_SIZE_X,
  WORLD_SIZE_Y,
  WORLD_SIZE_Z,
  BLOCK_ANIM_DURATION,
  WorldEvent,
} from './types';

const FACE_VERTICES = {
  top: [
    [0, 1, 0], [1, 1, 0], [1, 1, 1],
    [0, 1, 0], [1, 1, 1], [0, 1, 1],
  ],
  bottom: [
    [0, 0, 1], [1, 0, 1], [1, 0, 0],
    [0, 0, 1], [1, 0, 0], [0, 0, 0],
  ],
  front: [
    [0, 0, 1], [1, 0, 1], [1, 1, 1],
    [0, 0, 1], [1, 1, 1], [0, 1, 1],
  ],
  back: [
    [1, 0, 0], [0, 0, 0], [0, 1, 0],
    [1, 0, 0], [0, 1, 0], [1, 1, 0],
  ],
  right: [
    [1, 0, 1], [1, 0, 0], [1, 1, 0],
    [1, 0, 1], [1, 1, 0], [1, 1, 1],
  ],
  left: [
    [0, 0, 0], [0, 0, 1], [0, 1, 1],
    [0, 0, 0], [0, 1, 1], [0, 1, 0],
  ],
};

const FACE_NORMALS: Record<string, [number, number, number]> = {
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
};

const FACE_NEIGHBOR: Record<string, [number, number, number]> = {
  top: [0, 1, 0],
  bottom: [0, -1, 0],
  front: [0, 0, 1],
  back: [0, 0, -1],
  right: [1, 0, 0],
  left: [-1, 0, 0],
};

interface AnimatingBlock {
  mesh: THREE.Mesh;
  startTime: number;
  isAdding: boolean;
  targetScale: number;
}

export class VoxelRenderer {
  private scene: THREE.Scene;
  private world: World;
  private meshGroup: THREE.Group;
  private blockMeshes: Map<string, THREE.Mesh> = new Map();
  private materialCache: Map<VoxelType, THREE.Material> = new Map();
  private textureCache: Map<VoxelType, THREE.CanvasTexture> = new Map();
  private animations: AnimatingBlock[] = [];
  private highlightMesh: THREE.LineSegments;
  private visibleCount: number = 0;
  private needsRebuild: boolean = true;

  constructor(scene: THREE.Scene, world: World) {
    this.scene = scene;
    this.world = world;

    this.meshGroup = new THREE.Group();
    this.scene.add(this.meshGroup);

    this.initMaterials();

    const hlGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.005, 1.005, 1.005));
    const hlMat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
    this.highlightMesh = new THREE.LineSegments(hlGeo, hlMat);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);

    this.world.onWorldChange.on((event: WorldEvent) => {
      this.handleWorldEvent(event);
    });
  }

  private initMaterials(): void {
    for (const typeStr of Object.keys(BLOCK_DEFS)) {
      const type = Number(typeStr) as VoxelType;
      if (type === VoxelType.AIR) continue;
      const def = BLOCK_DEFS[type];

      const texture = this.createBlockTexture(type);
      this.textureCache.set(type, texture);

      const mat = new THREE.MeshLambertMaterial({
        map: texture,
        transparent: def.isTransparent,
        opacity: def.opacity,
        side: def.isTransparent ? THREE.DoubleSide : THREE.FrontSide,
      });
      this.materialCache.set(type, mat);
    }
  }

  private createBlockTexture(type: VoxelType): THREE.CanvasTexture {
    const size = 16;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const def = BLOCK_DEFS[type];

    ctx.fillStyle = def.color;
    ctx.fillRect(0, 0, size, size);

    if (type === VoxelType.DIRT) {
      ctx.fillStyle = '#6B4F1D';
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 1, 1);
      }
    } else if (type === VoxelType.STONE) {
      ctx.fillStyle = '#666666';
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 2, 1);
      }
    } else if (type === VoxelType.WOOD) {
      ctx.fillStyle = '#A0822A';
      for (let y = 0; y < size; y += 3) {
        ctx.fillRect(0, y, size, 1);
      }
    } else if (type === VoxelType.GLASS) {
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.strokeRect(2, 2, size - 4, size - 4);
      ctx.beginPath();
      ctx.moveTo(2, 2);
      ctx.lineTo(size - 2, size - 2);
      ctx.stroke();
    } else if (type === VoxelType.DIAMOND) {
      ctx.fillStyle = '#00FFFF';
      for (let i = 0; i < 8; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    return texture;
  }

  private getKey(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  buildWorld(): void {
    while (this.meshGroup.children.length > 0) {
      const child = this.meshGroup.children[0] as THREE.Mesh;
      this.meshGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
    }
    this.blockMeshes.clear();
    this.visibleCount = 0;

    const geometry = new THREE.BoxGeometry(1, 1, 1);

    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let y = 0; y < WORLD_SIZE_Y; y++) {
        for (let z = 0; z < WORLD_SIZE_Z; z++) {
          const voxelType = this.world.getVoxel(x, y, z);
          if (voxelType === VoxelType.AIR) continue;

          if (!this.shouldRenderBlock(x, y, z, voxelType)) continue;

          const mat = this.materialCache.get(voxelType);
          if (!mat) continue;

          const mesh = new THREE.Mesh(geometry, mat);
          mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
          mesh.userData = { voxelType, coord: { x, y, z } };

          this.meshGroup.add(mesh);
          this.blockMeshes.set(this.getKey(x, y, z), mesh);
          this.visibleCount++;
        }
      }
    }

    this.needsRebuild = false;
  }

  private shouldRenderBlock(x: number, y: number, z: number, voxelType: VoxelType): boolean {
    const dirs: [number, number, number][] = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for (const [dx, dy, dz] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      const neighbor = this.world.getVoxel(nx, ny, nz);
      if (neighbor === VoxelType.AIR) return true;
      if (neighbor === VoxelType.GLASS && voxelType !== VoxelType.GLASS) return true;
      if (voxelType === VoxelType.GLASS && neighbor !== VoxelType.GLASS) return true;
    }
    return false;
  }

  private handleWorldEvent(event: WorldEvent): void {
    const { coord, voxelType } = event;
    const key = this.getKey(coord.x, coord.y, coord.z);

    if (event.type === 'voxelAdded') {
      this.addBlockMesh(coord.x, coord.y, coord.z, voxelType);
    } else if (event.type === 'voxelRemoved') {
      this.removeBlockMesh(coord.x, coord.y, coord.z);
    }

    this.updateNeighborVisibility(coord.x, coord.y, coord.z);
  }

  private addBlockMesh(x: number, y: number, z: number, voxelType: VoxelType): void {
    const key = this.getKey(x, y, z);
    if (this.blockMeshes.has(key)) return;

    const mat = this.materialCache.get(voxelType);
    if (!mat) return;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.userData = { voxelType, coord: { x, y, z } };
    mesh.scale.set(0, 0, 0);

    this.meshGroup.add(mesh);
    this.blockMeshes.set(key, mesh);
    this.visibleCount++;

    this.animations.push({
      mesh,
      startTime: performance.now() / 1000,
      isAdding: true,
      targetScale: 1,
    });
  }

  private removeBlockMesh(x: number, y: number, z: number): void {
    const key = this.getKey(x, y, z);
    const mesh = this.blockMeshes.get(key);
    if (!mesh) return;

    this.blockMeshes.delete(key);
    this.visibleCount--;

    this.animations.push({
      mesh,
      startTime: performance.now() / 1000,
      isAdding: false,
      targetScale: 0,
    });
  }

  private updateNeighborVisibility(x: number, y: number, z: number): void {
    const dirs: [number, number, number][] = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for (const [dx, dy, dz] of dirs) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      const nkey = this.getKey(nx, ny, nz);
      const nType = this.world.getVoxel(nx, ny, nz);
      const nMesh = this.blockMeshes.get(nkey);

      if (nType === VoxelType.AIR) continue;

      if (!nMesh && this.shouldRenderBlock(nx, ny, nz, nType)) {
        this.addBlockMesh(nx, ny, nz, nType);
      } else if (nMesh && !this.shouldRenderBlock(nx, ny, nz, nType)) {
        this.blockMeshes.delete(nkey);
        this.meshGroup.remove(nMesh);
        if (nMesh.geometry) nMesh.geometry.dispose();
        this.visibleCount--;
      }
    }
  }

  updateAnimations(): void {
    const now = performance.now() / 1000;
    const completed: number[] = [];

    for (let i = 0; i < this.animations.length; i++) {
      const anim = this.animations[i];
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / BLOCK_ANIM_DURATION, 1);
      const eased = anim.isAdding ? this.easeOutBack(t) : this.easeInBack(t);
      const scale = anim.isAdding ? eased : 1 - eased;

      anim.mesh.scale.set(scale, scale, scale);

      if (t >= 1) {
        if (anim.isAdding) {
          anim.mesh.scale.set(1, 1, 1);
        } else {
          this.meshGroup.remove(anim.mesh);
          if (anim.mesh.geometry) anim.mesh.geometry.dispose();
        }
        completed.push(i);
      }
    }

    for (let i = completed.length - 1; i >= 0; i--) {
      this.animations.splice(completed[i], 1);
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private easeInBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  }

  updateHighlight(facingBlock: { coord: { x: number; y: number; z: number } } | null): void {
    if (facingBlock) {
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(
        facingBlock.coord.x + 0.5,
        facingBlock.coord.y + 0.5,
        facingBlock.coord.z + 0.5
      );
    } else {
      this.highlightMesh.visible = false;
    }
  }

  getVisibleCount(): number {
    return this.visibleCount;
  }

  isNeedsRebuild(): boolean {
    return this.needsRebuild;
  }
}
