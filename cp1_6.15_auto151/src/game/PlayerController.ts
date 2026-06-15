import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';
import { eventBus } from '../systems/EventBus';
import { Pathfinding } from './Pathfinding';
import type { Vec3, PlayerState } from '../types/game';
import {
  MARK_DURATION,
  KEY_FRAGMENTS_REQUIRED,
  SYNTHESIZE_DURATION,
  MAP_SIZE,
} from '../types/game';

const HUNTER_SPEED = 5;
const STALKER_SPEED = 4;
const PLAYER_RADIUS = 0.5;
const MIN_SENSITIVITY = 0.5;
const MAX_SENSITIVITY = 2.0;
const MIN_PITCH = 30;
const MAX_PITCH = 60;
const CAMERA_DISTANCE = 5;
const MARK_DISTANCE = 30;

export class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private pathfinding: Pathfinding;
  private keys: Set<string> = new Set();
  private yaw = 0;
  private pitch = 0;
  private currentPath: Vec3[] = [];
  private pathIndex = 0;
  private isMovingAlongPath = false;
  private markTargetId: string | null = null;
  private markStartTime = 0;
  private synthesizeStartTime = 0;
  private isSynthesizing = false;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private isPointerLocked = false;
  private unsubscribes: (() => void)[] = [];
  private groundPlane: THREE.Plane;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, pathfinding: Pathfinding) {
    this.camera = camera;
    this.domElement = domElement;
    this.pathfinding = pathfinding;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this.setupEventListeners();
    this.setupStoreSubscriptions();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('click', this.handleClick);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private setupStoreSubscriptions(): void {
    const unsub1 = useGameStore.subscribe(
      (state) => state.settings.mouseSensitivity,
      () => {}
    );
    this.unsubscribes.push(unsub1);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    
    const state = useGameStore.getState();
    const player = state.localPlayerId ? state.players[state.localPlayerId] : null;

    if (e.code === 'KeyE' && player?.role === 'stalker') {
      const fragmentCount = player.inventory.filter(p => p.isFragment).length;
      if (fragmentCount >= KEY_FRAGMENTS_REQUIRED && !this.isSynthesizing) {
        this.isSynthesizing = true;
        this.synthesizeStartTime = performance.now();
      }
    }

    if (e.code === 'Space' && player?.role === 'hunter' && !this.isPointerLocked) {
      this.domElement.requestPointerLock();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);

    if (e.code === 'KeyE') {
      this.isSynthesizing = false;
      this.synthesizeStartTime = 0;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isPointerLocked) return;

    const state = useGameStore.getState();
    const sensitivity = Math.max(MIN_SENSITIVITY, Math.min(MAX_SENSITIVITY, state.settings.mouseSensitivity));

    this.yaw -= e.movementX * sensitivity * 0.002;
    this.pitch -= e.movementY * sensitivity * 0.002;
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));
  };

  private handleClick = (e: MouseEvent): void => {
    const state = useGameStore.getState();
    const player = state.localPlayerId ? state.players[state.localPlayerId] : null;

    if (!player || state.phase !== 'playing') return;

    if (player.role === 'hunter') {
      if (!this.isPointerLocked) {
        this.domElement.requestPointerLock();
      }
    } else if (player.role === 'stalker') {
      this.handleStalkerClick(e);
    }
  };

  private handleStalkerClick(e: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    
    const intersectPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint);

    if (intersectPoint) {
      const state = useGameStore.getState();
      const player = state.localPlayerId ? state.players[state.localPlayerId] : null;
      
      if (player) {
        const targetPos: Vec3 = [intersectPoint.x, 0, intersectPoint.z];
        const halfMap = MAP_SIZE / 2;
        targetPos[0] = Math.max(-halfMap + 1, Math.min(halfMap - 1, targetPos[0]));
        targetPos[2] = Math.max(-halfMap + 1, Math.min(halfMap - 1, targetPos[2]));

        const path = this.pathfinding.findPath(player.position, targetPos);
        if (path && path.length > 0) {
          this.currentPath = this.pathfinding.smoothPath(path);
          this.pathIndex = 0;
          this.isMovingAlongPath = true;
        }
      }
    }
  }

  private handlePointerLockChange = (): void => {
    this.isPointerLocked = document.pointerLockElement === this.domElement;
    
    const state = useGameStore.getState();
    if (state.localPlayerId) {
      useGameStore.getState().updatePlayer(state.localPlayerId, {
        isPointerLocked: this.isPointerLocked,
      });
    }
  };

  update(deltaTime: number): void {
    const state = useGameStore.getState();
    const player = state.localPlayerId ? state.players[state.localPlayerId] : null;

    if (!player || state.phase !== 'playing') return;

    if (player.role === 'hunter') {
      this.updateHunter(deltaTime, player);
    } else if (player.role === 'stalker') {
      this.updateStalker(deltaTime, player);
    }

    this.updateCamera(player);
    this.updateSynthesize(deltaTime, player);
  }

  private updateHunter(deltaTime: number, player: PlayerState): void {
    const moveSpeed = HUNTER_SPEED * player.speedMultiplier * (deltaTime / 1000);
    
    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();
    
    if (this.keys.has('KeyW')) moveDir.add(forward);
    if (this.keys.has('KeyS')) moveDir.sub(forward);
    if (this.keys.has('KeyA')) moveDir.sub(right);
    if (this.keys.has('KeyD')) moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      const newPos: Vec3 = [
        player.position[0] + moveDir.x * moveSpeed,
        player.position[1],
        player.position[2] + moveDir.z * moveSpeed,
      ];

      if (!this.pathfinding.checkCollision(newPos, PLAYER_RADIUS)) {
        useGameStore.getState().updatePlayer(player.id, {
          position: newPos,
          rotation: [0, this.yaw, 0],
        });
        eventBus.emit('player_move', { id: player.id, position: newPos });
      } else {
        const testX: Vec3 = [newPos[0], player.position[1], player.position[2]];
        const testZ: Vec3 = [player.position[0], player.position[1], newPos[2]];
        
        let finalPos = { ...player.position };
        
        if (!this.pathfinding.checkCollision(testX, PLAYER_RADIUS)) {
          finalPos[0] = testX[0];
        }
        if (!this.pathfinding.checkCollision(testZ, PLAYER_RADIUS)) {
          finalPos[2] = testZ[2];
        }

        if (finalPos[0] !== player.position[0] || finalPos[2] !== player.position[2]) {
          useGameStore.getState().updatePlayer(player.id, {
            position: [finalPos[0], finalPos[1], finalPos[2]],
            rotation: [0, this.yaw, 0],
          });
          eventBus.emit('player_move', { id: player.id, position: finalPos });
        }
      }
    } else {
      useGameStore.getState().updatePlayer(player.id, {
        rotation: [0, this.yaw, 0],
      });
    }

    this.updateMarking(player);
  }

  private updateStalker(deltaTime: number, player: PlayerState): void {
    if (this.isMovingAlongPath && this.currentPath.length > 0 && this.pathIndex < this.currentPath.length) {
      const target = this.currentPath[this.pathIndex];
      const dx = target[0] - player.position[0];
      const dz = target[2] - player.position[2];
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < 0.3) {
        this.pathIndex++;
        if (this.pathIndex >= this.currentPath.length) {
          this.isMovingAlongPath = false;
          this.currentPath = [];
        }
      } else {
        const moveSpeed = STALKER_SPEED * player.speedMultiplier * (deltaTime / 1000);
        const ratio = Math.min(1, moveSpeed / distance);
        
        const newPos: Vec3 = [
          player.position[0] + dx * ratio,
          player.position[1],
          player.position[2] + dz * ratio,
        ];

        if (!this.pathfinding.checkCollision(newPos, PLAYER_RADIUS)) {
          const rotationY = Math.atan2(dx, dz);
          useGameStore.getState().updatePlayer(player.id, {
            position: newPos,
            rotation: [0, rotationY, 0],
          });
          eventBus.emit('player_move', { id: player.id, position: newPos });
        } else {
          const newPath = this.pathfinding.findPath(player.position, this.currentPath[this.currentPath.length - 1]);
          if (newPath) {
            this.currentPath = this.pathfinding.smoothPath(newPath);
            this.pathIndex = 0;
          } else {
            this.isMovingAlongPath = false;
            this.currentPath = [];
          }
        }
      }
    }
  }

  private updateMarking(hunter: PlayerState): void {
    const state = useGameStore.getState();
    const stalkers = Object.values(state.players).filter(
      (p) => p.role === 'stalker' && !p.isMarked && !p.isInvisible
    );

    let closestStalker: PlayerState | null = null;
    let closestAngle = Math.PI / 6;

    const hunterForward = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );

    for (const stalker of stalkers) {
      const toStalker = new THREE.Vector3(
        stalker.position[0] - hunter.position[0],
        stalker.position[1] - hunter.position[1],
        stalker.position[2] - hunter.position[2]
      );

      const distance = toStalker.length();
      if (distance > MARK_DISTANCE) continue;

      toStalker.normalize();
      const angle = hunterForward.angleTo(toStalker);

      if (angle < closestAngle) {
        closestAngle = angle;
        closestStalker = stalker;
      }
    }

    const now = performance.now();

    if (closestStalker) {
      if (this.markTargetId !== closestStalker.id) {
        this.markTargetId = closestStalker.id;
        this.markStartTime = now;
      }

      const markProgress = Math.min(1, (now - this.markStartTime) / MARK_DURATION);
      useGameStore.getState().updatePlayer(closestStalker.id, {
        markProgress,
      });

      if (markProgress >= 1) {
        useGameStore.getState().updatePlayer(closestStalker.id, {
          isMarked: true,
          markProgress: 0,
        });
        useGameStore.setState((s) => ({
          markedCount: s.markedCount + 1,
          stats: {
            ...s.stats,
            hunter: {
              ...s.stats.hunter,
              marks: s.stats.hunter.marks + 1,
            },
          },
        }));
        eventBus.emit('player_marked', { id: closestStalker.id });
        this.markTargetId = null;
        this.markStartTime = 0;
      }
    } else {
      if (this.markTargetId) {
        useGameStore.getState().updatePlayer(this.markTargetId, {
          markProgress: 0,
        });
      }
      this.markTargetId = null;
      this.markStartTime = 0;
    }
  }

  private updateSynthesize(deltaTime: number, player: PlayerState): void {
    if (player.role !== 'stalker' || !this.isSynthesizing) return;

    const fragmentCount = player.inventory.filter(p => p.isFragment).length;
    if (fragmentCount < KEY_FRAGMENTS_REQUIRED) {
      this.isSynthesizing = false;
      this.synthesizeStartTime = 0;
      return;
    }

    const now = performance.now();
    const progress = Math.min(1, (now - this.synthesizeStartTime) / SYNTHESIZE_DURATION);

    if (progress >= 1) {
      const newInventory = [...player.inventory];
      let removed = 0;
      for (let i = newInventory.length - 1; i >= 0 && removed < KEY_FRAGMENTS_REQUIRED; i--) {
        if (newInventory[i].isFragment) {
          newInventory.splice(i, 1);
          removed++;
        }
      }

      useGameStore.getState().updatePlayer(player.id, {
        inventory: newInventory,
      });
      useGameStore.setState((s) => ({
        keyFragments: s.keyFragments + 1,
        stats: {
          ...s.stats,
          stalker: {
            ...s.stats.stalker,
            fragmentsCollected: s.stats.stalker.fragmentsCollected + KEY_FRAGMENTS_REQUIRED,
          },
        },
      }));
      eventBus.emit('key_synthesized', { playerId: player.id });

      this.isSynthesizing = false;
      this.synthesizeStartTime = 0;
    }
  }

  private updateCamera(player: PlayerState): void {
    const state = useGameStore.getState();
    
    if (player.role === 'hunter') {
      const pitchRad = this.pitch;
      this.camera.position.set(
        player.position[0],
        player.position[1],
        player.position[2]
      );
      this.camera.rotation.order = 'YXZ';
      this.camera.rotation.y = this.yaw;
      this.camera.rotation.x = pitchRad;
    } else {
      const pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, state.settings.cameraPitch));
      const pitchRad = (pitch * Math.PI) / 180;
      
      const cameraOffset = new THREE.Vector3(
        0,
        Math.sin(pitchRad) * CAMERA_DISTANCE,
        Math.cos(pitchRad) * CAMERA_DISTANCE
      );

      const rotationY = player.rotation[1];
      cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationY);

      this.camera.position.set(
        player.position[0] + cameraOffset.x,
        player.position[1] + cameraOffset.y,
        player.position[2] + cameraOffset.z
      );

      this.camera.lookAt(
        player.position[0],
        player.position[1] + 1,
        player.position[2]
      );
    }
  }

  getCameraPosition(): Vec3 {
    return [this.camera.position.x, this.camera.position.y, this.camera.position.z];
  }

  getCurrentPath(): Vec3[] {
    return this.currentPath;
  }

  getSynthesizeProgress(): number {
    if (!this.isSynthesizing) return 0;
    return Math.min(1, (performance.now() - this.synthesizeStartTime) / SYNTHESIZE_DURATION);
  }

  dispose(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    this.unsubscribes.forEach((unsub) => unsub());
    this.unsubscribes = [];

    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }
}
