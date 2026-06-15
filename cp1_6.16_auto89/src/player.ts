import * as THREE from 'three';
import { World } from './world';
import {
  PLAYER_SPEED,
  GRAVITY,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_CROUCH_HEIGHT,
  JUMP_HEIGHT,
  MOUSE_SENSITIVITY_X,
  MOUSE_SENSITIVITY_Y,
  MOUSE_Y_MIN,
  MOUSE_Y_MAX,
  VoxelType,
  VoxelCoord,
  BLOCK_DEFS,
} from './types';

export class Player {
  position: THREE.Vector3;
  rotation: { x: number; y: number };
  velocity: THREE.Vector3;
  isOnGround: boolean = false;
  isCrouching: boolean = false;

  private keys: Set<string> = new Set();
  private world: World;
  private jumpVelocity: number;
  private canvas: HTMLCanvasElement;
  private isPointerLocked: boolean = false;

  facingBlock: { coord: VoxelCoord; normal: VoxelCoord; blockType: VoxelType } | null = null;

  onBlockChange?: (action: 'add' | 'remove', coord: VoxelCoord, normal: VoxelCoord) => void;

  constructor(world: World, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
    this.world = world;
    this.canvas = canvas;
    this.position = new THREE.Vector3(WORLD_SIZE_X / 2, 5, WORLD_SIZE_Z / 2);
    this.rotation = { x: 0, y: 0 };
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.jumpVelocity = Math.sqrt(2 * Math.abs(GRAVITY) * JUMP_HEIGHT);

    this.setupInput();
  }

  private setupInput(): void {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.isCrouching = true;
      }
      if (e.code === 'Space' && this.isOnGround) {
        this.velocity.y = this.jumpVelocity;
        this.isOnGround = false;
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        this.isCrouching = false;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isPointerLocked) return;
      this.rotation.y -= e.movementX * MOUSE_SENSITIVITY_X * 0.002;
      this.rotation.x -= e.movementY * MOUSE_SENSITIVITY_Y * 0.002;
      this.rotation.x = Math.max(MOUSE_Y_MIN, Math.min(MOUSE_Y_MAX, this.rotation.x));
    });

    this.canvas.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.canvas.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
    });

    document.addEventListener('mousedown', (e) => {
      if (!this.isPointerLocked) return;
      if (e.button === 0) {
        this.removeBlock();
      } else if (e.button === 2) {
        this.placeBlock();
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private getForward(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.rotation.y) * Math.cos(this.rotation.x),
      Math.sin(this.rotation.x),
      -Math.cos(this.rotation.y) * Math.cos(this.rotation.x)
    );
  }

  private getForwardHorizontal(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.rotation.y),
      0,
      -Math.cos(this.rotation.y)
    ).normalize();
  }

  private getRight(): THREE.Vector3 {
    const fwd = this.getForwardHorizontal();
    return new THREE.Vector3(fwd.z, 0, -fwd.x);
  }

  update(delta: number, camera: THREE.PerspectiveCamera): void {
    const moveDir = new THREE.Vector3(0, 0, 0);
    const fwd = this.getForwardHorizontal();
    const right = this.getRight();

    if (this.keys.has('KeyW')) moveDir.add(fwd);
    if (this.keys.has('KeyS')) moveDir.sub(fwd);
    if (this.keys.has('KeyD')) moveDir.add(right);
    if (this.keys.has('KeyA')) moveDir.sub(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(PLAYER_SPEED);
    }

    this.velocity.x = moveDir.x;
    this.velocity.z = moveDir.z;

    this.velocity.y += GRAVITY * delta;

    const newPos = this.position.clone();
    newPos.x += this.velocity.x * delta;
    this.resolveCollisionX(newPos);
    newPos.z += this.velocity.z * delta;
    this.resolveCollisionZ(newPos);
    newPos.y += this.velocity.y * delta;
    this.resolveCollisionY(newPos);

    this.position.copy(newPos);

    if (this.position.y < -10) {
      this.position.set(WORLD_SIZE_X / 2, 5, WORLD_SIZE_Z / 2);
      this.velocity.set(0, 0, 0);
    }

    camera.position.copy(this.position);
    const eyeHeight = this.isCrouching ? PLAYER_CROUCH_HEIGHT * 0.9 : PLAYER_HEIGHT * 0.9;
    camera.position.y = this.position.y + eyeHeight;

    camera.rotation.order = 'YXZ';
    camera.rotation.y = this.rotation.y;
    camera.rotation.x = this.rotation.x;

    this.updateRaycast();
  }

  private getPlayerHeight(): number {
    return this.isCrouching ? PLAYER_CROUCH_HEIGHT : PLAYER_HEIGHT;
  }

  private resolveCollisionX(newPos: THREE.Vector3): void {
    const hw = PLAYER_WIDTH / 2;
    const h = this.getPlayerHeight();
    const minX = newPos.x - hw;
    const maxX = newPos.x + hw;
    const minY = newPos.y;
    const maxY = newPos.y + h;
    const minZ = this.position.z - hw;
    const maxZ = this.position.z + hw;

    for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
      for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
        for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z++) {
          if (this.world.isSolid(x, y, z)) {
            if (this.velocity.x > 0) {
              newPos.x = x - hw - 0.001;
            } else {
              newPos.x = x + 1 + hw + 0.001;
            }
            this.velocity.x = 0;
            return;
          }
        }
      }
    }
  }

  private resolveCollisionZ(newPos: THREE.Vector3): void {
    const hw = PLAYER_WIDTH / 2;
    const h = this.getPlayerHeight();
    const minX = newPos.x - hw;
    const maxX = newPos.x + hw;
    const minY = newPos.y;
    const maxY = newPos.y + h;
    const minZ = newPos.z - hw;
    const maxZ = newPos.z + hw;

    for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
      for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
        for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z++) {
          if (this.world.isSolid(x, y, z)) {
            if (this.velocity.z > 0) {
              newPos.z = z - hw - 0.001;
            } else {
              newPos.z = z + 1 + hw + 0.001;
            }
            this.velocity.z = 0;
            return;
          }
        }
      }
    }
  }

  private resolveCollisionY(newPos: THREE.Vector3): void {
    const hw = PLAYER_WIDTH / 2;
    const h = this.getPlayerHeight();
    const minX = this.position.x - hw;
    const maxX = this.position.x + hw;
    const minY = newPos.y;
    const maxY = newPos.y + h;
    const minZ = this.position.z - hw;
    const maxZ = this.position.z + hw;

    this.isOnGround = false;

    for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
      for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
        for (let z = Math.floor(minZ); z <= Math.floor(maxZ); z++) {
          if (this.world.isSolid(x, y, z)) {
            if (this.velocity.y < 0) {
              newPos.y = y + 1 + 0.001;
              this.isOnGround = true;
            } else {
              newPos.y = y - h - 0.001;
            }
            this.velocity.y = 0;
            return;
          }
        }
      }
    }
  }

  private updateRaycast(): void {
    const eyePos = this.position.clone();
    const eyeHeight = this.isCrouching ? PLAYER_CROUCH_HEIGHT * 0.9 : PLAYER_HEIGHT * 0.9;
    eyePos.y += eyeHeight;

    const dir = this.getForward();
    const hit = this.world.raycast(eyePos.x, eyePos.y, eyePos.z, dir.x, dir.y, dir.z, 8);
    this.facingBlock = hit;
  }

  private removeBlock(): void {
    if (!this.facingBlock) return;
    const { coord, blockType } = this.facingBlock;
    if (blockType === VoxelType.AIR) return;
    this.world.setVoxel(coord.x, coord.y, coord.z, VoxelType.AIR);
  }

  private placeBlock(): void {
    if (!this.facingBlock) return;
    const { coord, normal } = this.facingBlock;
    const px = coord.x + normal.x;
    const py = coord.y + normal.y;
    const pz = coord.z + normal.z;

    if (!this.world.isInBounds(px, py, pz)) return;

    const hw = PLAYER_WIDTH / 2;
    const h = this.getPlayerHeight();
    const playerMinX = this.position.x - hw;
    const playerMaxX = this.position.x + hw;
    const playerMinY = this.position.y;
    const playerMaxY = this.position.y + h;
    const playerMinZ = this.position.z - hw;
    const playerMaxZ = this.position.z + hw;

    if (px + 1 > playerMinX && px < playerMaxX &&
        py + 1 > playerMinY && py < playerMaxY &&
        pz + 1 > playerMinZ && pz < playerMaxZ) {
      return;
    }

    if (this.onBlockChange) {
      this.onBlockChange('add', { x: px, y: py, z: pz }, normal);
    }
  }

  getFacingBlockName(): string {
    if (!this.facingBlock) return '无';
    return BLOCK_DEFS[this.facingBlock.blockType].name;
  }
}

const WORLD_SIZE_X = 32;
const WORLD_SIZE_Z = 32;
