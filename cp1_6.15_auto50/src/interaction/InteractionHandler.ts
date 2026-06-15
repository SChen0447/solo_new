import { useGameStore, DragState } from '../store/gameStore';
import { SceneManager } from '../scene/SceneManager';

export class InteractionHandler {
  private sceneManager: SceneManager;
  private canvas: HTMLCanvasElement;
  private isDragging: boolean = false;
  private dragGhost: HTMLDivElement | null = null;

  constructor(canvas: HTMLCanvasElement, sceneManager: SceneManager) {
    this.canvas = canvas;
    this.sceneManager = sceneManager;
    this.attachEvents();
  }

  private attachEvents() {
    this.canvas.addEventListener('mousedown', this.onCanvasMouseDown);
    this.canvas.addEventListener('mousemove', this.onCanvasMouseMove);
    this.canvas.addEventListener('mouseup', this.onCanvasMouseUp);
    window.addEventListener('mousemove', this.onWindowMouseMove);
    window.addEventListener('mouseup', this.onWindowMouseUp);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this.onCanvasMouseDown);
    this.canvas.removeEventListener('mousemove', this.onCanvasMouseMove);
    this.canvas.removeEventListener('mouseup', this.onCanvasMouseUp);
    window.removeEventListener('mousemove', this.onWindowMouseMove);
    window.removeEventListener('mouseup', this.onWindowMouseUp);
  }

  private onCanvasMouseDown = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const hitId = this.sceneManager.hitTest(canvasX, canvasY);
    if (hitId) {
      const state = useGameStore.getState();
      const frag = state.fragments.find(f => f.id === hitId);
      if (frag && !frag.collected) {
        state.collectFragment(hitId, canvasX, canvasY);
      }
    }
  };

  private onCanvasMouseMove = (_e: MouseEvent) => {};

  private onCanvasMouseUp = (_e: MouseEvent) => {};

  startBackpackDrag(e: React.MouseEvent, fragmentId: string) {
    e.preventDefault();
    const state = useGameStore.getState();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    const drag: DragState = {
      fragmentId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      source: 'backpack',
    };

    state.startDrag(drag);
    this.isDragging = true;
    this.createDragGhost(fragmentId, e.clientX, e.clientY);
  }

  startTimelineDrag(e: React.MouseEvent, fragmentId: string, slotIndex: number) {
    e.preventDefault();
    const state = useGameStore.getState();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    const drag: DragState = {
      fragmentId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      source: 'timeline',
      sourceSlotIndex: slotIndex,
    };

    state.startDrag(drag);
    this.isDragging = true;
    this.createDragGhost(fragmentId, e.clientX, e.clientY);
  }

  private createDragGhost(fragmentId: string, x: number, y: number) {
    if (this.dragGhost) this.dragGhost.remove();

    const state = useGameStore.getState();
    const frag = state.fragments.find(f => f.id === fragmentId);
    if (!frag) return;

    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.left = `${x - 25}px`;
    ghost.style.top = `${y - 25}px`;
    ghost.style.width = '50px';
    ghost.style.height = '50px';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '10000';
    ghost.style.display = 'flex';
    ghost.style.alignItems = 'center';
    ghost.style.justifyContent = 'center';
    ghost.style.fontSize = '24px';
    ghost.style.background = 'rgba(30, 25, 50, 0.8)';
    ghost.style.border = `2px solid ${frag.color}`;
    ghost.style.borderRadius = '8px';
    ghost.style.boxShadow = `0 0 15px ${frag.color}40, 0 4px 12px rgba(0,0,0,0.5)`;
    ghost.style.transform = 'scale(1.1)';
    ghost.style.transition = 'none';
    ghost.textContent = frag.icon;

    document.body.appendChild(ghost);
    this.dragGhost = ghost;
  }

  private onWindowMouseMove = (e: MouseEvent) => {
    if (!this.isDragging || !this.dragGhost) return;

    this.dragGhost.style.left = `${e.clientX - 25}px`;
    this.dragGhost.style.top = `${e.clientY - 25}px`;

    useGameStore.getState().updateDrag(e.clientX, e.clientY);
  };

  private onWindowMouseUp = (e: MouseEvent) => {
    if (!this.isDragging) return;
    this.isDragging = false;

    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    const state = useGameStore.getState();
    if (state.dragState) {
      state.endDrag(e.clientX, e.clientY);
    }
  };
}
