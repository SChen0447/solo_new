import * as THREE from 'three';
import { useGameStore, Fragment, Slot } from '../stores/gameStore';

interface AnimationState {
  type: 'snap' | 'bounce' | null;
  fragmentId: number;
  startTime: number;
  duration: number;
  startPos: { x: number; y: number; z: number };
  endPos: { x: number; y: number; z: number };
  startRot: { x: number; y: number; z: number };
  endRot: { x: number; y: number; z: number };
}

export class InteractionManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private camera: THREE.PerspectiveCamera | null;
  private groundPlane: THREE.Plane;
  private animationStates: Map<number, AnimationState>;
  private pendingFrame: boolean;
  private dragStartTime: number;
  private isDragging: boolean;

  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = null;
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.animationStates = new Map();
    this.pendingFrame = false;
    this.dragStartTime = 0;
    this.isDragging = false;
  }

  setCamera(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  updateMouseFromEvent(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getGroundIntersection(): THREE.Vector3 | null {
    if (!this.camera) return null;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersect = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(this.groundPlane, intersect);
    return result ? intersect : null;
  }

  pickFragment(fragments: Fragment[]): Fragment | null {
    if (!this.camera) return null;
    this.raycaster.setFromCamera(this.mouse, this.camera);

    let closest: Fragment | null = null;
    let closestDist = Infinity;

    for (const frag of fragments) {
      if (frag.matched || frag.isDragging) continue;
      const pos = new THREE.Vector3(frag.position.x, frag.position.y, frag.position.z);
      const rayPoint = new THREE.Vector3();
      this.raycaster.ray.closestPointToPoint(pos, rayPoint);
      const dist = pos.distanceTo(rayPoint);
      if (dist < frag.size * 1.2 && dist < closestDist) {
        closestDist = dist;
        closest = frag;
      }
    }
    return closest;
  }

  checkHover(_canvas: HTMLCanvasElement) {
    const state = useGameStore.getState();
    if (state.selectedFragmentId !== null || this.isDragging) return;

    const hovered = this.pickFragment(state.fragments);
    for (const f of state.fragments) {
      if (f.matched) continue;
      const shouldHover = hovered?.id === f.id;
      if (f.isHovered !== shouldHover) {
        useGameStore.getState().setFragmentHover(f.id, shouldHover);
      }
    }
  }

  onPointerDown(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
    this.updateMouseFromEvent(clientX, clientY, canvas);
    const state = useGameStore.getState();

    const fragment = this.pickFragment(state.fragments);
    if (fragment) {
      this.dragStartTime = performance.now();
      this.isDragging = true;
      useGameStore.getState().setSelectedFragment(fragment.id);
      useGameStore.getState().setFragmentDragging(fragment.id, true);
      useGameStore.getState().setFragmentHover(fragment.id, false);
    }
  }

  onPointerMove(clientX: number, clientY: number, canvas: HTMLCanvasElement) {
    if (this.pendingFrame) return;
    this.pendingFrame = true;

    requestAnimationFrame(() => {
      this.pendingFrame = false;
      this.updateMouseFromEvent(clientX, clientY, canvas);

      if (!this.isDragging) {
        this.checkHover(canvas);
        return;
      }

      const state = useGameStore.getState();
      const selectedId = state.selectedFragmentId;
      if (selectedId === null) return;

      const groundPoint = this.getGroundIntersection();
      if (!groundPoint) return;

      const elapsed = (performance.now() - this.dragStartTime) / 1000;
      const wobble = Math.sin(elapsed * 5) * 0.087;

      useGameStore.getState().updateFragmentPosition(
        selectedId,
        groundPoint.x,
        0.35,
        groundPoint.z
      );

      const frag = state.fragments.find((f) => f.id === selectedId);
      if (frag) {
        useGameStore.getState().updateFragmentRotation(
          selectedId,
          wobble,
          frag.rotation.y,
          -wobble
        );
      }

      this.checkSlotProximity(selectedId, groundPoint);
    });
  }

  private checkSlotProximity(fragmentId: number, point: THREE.Vector3) {
    const state = useGameStore.getState();
    const fragment = state.fragments.find((f) => f.id === fragmentId);
    if (!fragment) return;

    for (const slot of state.slots) {
      if (slot.matched) continue;
      const dx = point.x - slot.position.x;
      const dz = point.z - slot.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const shouldHighlight = dist < 0.6 && slot.fragmentId === fragment.slotId;

      if (slot.isHighlighted !== shouldHighlight) {
        useGameStore.getState().setSlotHighlighted(slot.id, shouldHighlight);
      }
    }
  }

  onPointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;

    const state = useGameStore.getState();
    const selectedId = state.selectedFragmentId;
    if (selectedId === null) return;

    const fragment = state.fragments.find((f) => f.id === selectedId);
    if (!fragment) return;

    for (const slot of state.slots) {
      useGameStore.getState().setSlotHighlighted(slot.id, false);
    }

    let matchedSlot: Slot | null = null;
    for (const slot of state.slots) {
      if (slot.matched) continue;
      const dx = fragment.position.x - slot.position.x;
      const dz = fragment.position.z - slot.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.3 && slot.fragmentId === fragment.slotId) {
        matchedSlot = slot;
        break;
      }
    }

    if (matchedSlot) {
      this.startSnapAnimation(fragment.id, matchedSlot);
    } else {
      this.startBounceAnimation(fragment.id);
    }
  }

  private startSnapAnimation(fragmentId: number, slot: Slot) {
    const state = useGameStore.getState();
    const fragment = state.fragments.find((f) => f.id === fragmentId);
    if (!fragment) return;

    this.animationStates.set(fragmentId, {
      type: 'snap',
      fragmentId,
      startTime: performance.now(),
      duration: 600,
      startPos: { ...fragment.position },
      endPos: { ...slot.position, y: 0.02 },
      startRot: { ...fragment.rotation },
      endRot: { x: 0, y: 0, z: 0 }
    });

    useGameStore.getState().matchFragment(fragmentId, slot.id);
    useGameStore.getState().addRipple({ x: slot.position.x, y: 0.03, z: slot.position.z });
  }

  private startBounceAnimation(fragmentId: number) {
    const state = useGameStore.getState();
    const fragment = state.fragments.find((f) => f.id === fragmentId);
    if (!fragment) return;

    this.animationStates.set(fragmentId, {
      type: 'bounce',
      fragmentId,
      startTime: performance.now(),
      duration: 400,
      startPos: { ...fragment.position },
      endPos: { ...fragment.originalPosition },
      startRot: { ...fragment.rotation },
      endRot: { x: 0, y: fragment.rotation.y, z: 0 }
    });
  }

  updateAnimations() {
    const now = performance.now();
    const toRemove: number[] = [];

    this.animationStates.forEach((anim, id) => {
      const elapsed = now - anim.startTime;
      const t = Math.min(elapsed / anim.duration, 1);
      const eased = this.easeOutCubic(t);

      const newPos = {
        x: anim.startPos.x + (anim.endPos.x - anim.startPos.x) * eased,
        y: anim.startPos.y + (anim.endPos.y - anim.startPos.y) * eased,
        z: anim.startPos.z + (anim.endPos.z - anim.startPos.z) * eased
      };

      const newRot = {
        x: anim.startRot.x + (anim.endRot.x - anim.startRot.x) * eased,
        y: anim.startRot.y + (anim.endRot.y - anim.startRot.y) * eased,
        z: anim.startRot.z + (anim.endRot.z - anim.startRot.z) * eased
      };

      useGameStore.getState().updateFragmentPosition(id, newPos.x, newPos.y, newPos.z);
      useGameStore.getState().updateFragmentRotation(id, newRot.x, newRot.y, newRot.z);

      if (t >= 1) {
        toRemove.push(id);
        if (anim.type === 'bounce') {
          useGameStore.getState().resetFragmentPosition(id);
        }
      }
    });

    toRemove.forEach((id) => this.animationStates.delete(id));
  }

  isAnimating(fragmentId: number): boolean {
    return this.animationStates.has(fragmentId);
  }
}
